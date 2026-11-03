require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.PORT || 3000);
const databaseFile = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'workouts.db');
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
const db = new Database(databaseFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise TEXT NOT NULL,
  weight REAL NOT NULL CHECK (weight >= 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  performed_on TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '32kb' }));

function validateSet(req, res, next) {
  const { exercise, weight, reps, performed_on, notes = '' } = req.body || {};
  const parsedWeight = Number(weight);
  const parsedReps = Number(reps);
  if (typeof exercise !== 'string' || exercise.trim().length < 2 || exercise.trim().length > 80) {
    return res.status(400).json({ error: 'Exercise must be between 2 and 80 characters.' });
  }
  if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 2000) {
    return res.status(400).json({ error: 'Weight must be a number from 0 to 2,000 kg.' });
  }
  if (!Number.isInteger(parsedReps) || parsedReps < 1 || parsedReps > 1000) {
    return res.status(400).json({ error: 'Reps must be a whole number from 1 to 1,000.' });
  }
  if (typeof performed_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(performed_on) || Number.isNaN(Date.parse(`${performed_on}T00:00:00Z`))) {
    return res.status(400).json({ error: 'Choose a valid workout date.' });
  }
  if (typeof notes !== 'string' || notes.length > 240) {
    return res.status(400).json({ error: 'Notes must be 240 characters or fewer.' });
  }
  req.validSet = { exercise: exercise.trim(), weight: parsedWeight, reps: parsedReps, performed_on, notes: notes.trim() };
  next();
}

// Required health check; kept separate from the four CRUD operations.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// CREATE: log one exercise set.
app.post('/sets', validateSet, (req, res) => {
  const { exercise, weight, reps, performed_on, notes } = req.validSet;
  const result = db.prepare(`INSERT INTO sets (exercise, weight, reps, performed_on, notes)
    VALUES (@exercise, @weight, @reps, @performed_on, @notes)`).run({ exercise, weight, reps, performed_on, notes });
  const created = db.prepare('SELECT * FROM sets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// READ: return all sets, newest workout first.
app.get('/sets', (_req, res) => {
  const rows = db.prepare('SELECT * FROM sets ORDER BY performed_on DESC, id DESC').all();
  res.json(rows);
});

// UPDATE: replace editable values for an existing set.
app.put('/sets/:id', validateSet, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Set ID must be a positive integer.' });
  const { exercise, weight, reps, performed_on, notes } = req.validSet;
  const result = db.prepare(`UPDATE sets SET exercise=@exercise, weight=@weight, reps=@reps,
    performed_on=@performed_on, notes=@notes, updated_at=CURRENT_TIMESTAMP WHERE id=@id`)
    .run({ id, exercise, weight, reps, performed_on, notes });
  if (!result.changes) return res.status(404).json({ error: 'Workout set not found.' });
  res.json(db.prepare('SELECT * FROM sets WHERE id = ?').get(id));
});

// DELETE: remove one set; return 404 when the ID does not exist.
app.delete('/sets/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Set ID must be a positive integer.' });
  const result = db.prepare('DELETE FROM sets WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Workout set not found.' });
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Request body must be valid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const server = app.listen(port, () => console.log(`Weights Log API listening on ${port}; SQLite at ${databaseFile}`));
function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
