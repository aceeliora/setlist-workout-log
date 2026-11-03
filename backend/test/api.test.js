const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let server;
let baseUrl;
let tempDir;
async function freePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = listener.address().port;
      listener.close(() => resolve(port));
    });
  });
}
async function waitForHealth() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Test API failed to start.');
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setlist-api-test-'));
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DATABASE_PATH: path.join(tempDir, 'test.db'), FRONTEND_ORIGIN: '*' },
    stdio: 'ignore'
  });
  await waitForHealth();
});
after(() => {
  if (server) server.kill('SIGTERM');
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

async function json(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  return { response, body: response.status === 204 ? null : await response.json() };
}
const validSet = { exercise: 'Barbell squat', weight: 60, reps: 8, performed_on: '2026-11-03', notes: 'Felt strong' };

test('health check responds with ok', async () => {
  const { response, body } = await json('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok' });
});
test('GET starts with an empty persisted list', async () => {
  const { response, body } = await json('/sets');
  assert.equal(response.status, 200);
  assert.deepEqual(body, []);
});
test('POST creates a workout set and GET returns it', async () => {
  const created = await json('/sets', { method: 'POST', body: JSON.stringify(validSet) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.exercise, validSet.exercise);
  assert.equal(created.body.weight, validSet.weight);
  assert.equal(created.body.reps, validSet.reps);
  assert.ok(created.body.id);
  const listed = await json('/sets');
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].id, created.body.id);
});
test('invalid form data is rejected with a useful 400', async () => {
  const { response, body } = await json('/sets', { method: 'POST', body: JSON.stringify({ ...validSet, weight: -3 }) });
  assert.equal(response.status, 400);
  assert.match(body.error, /Weight/);
});
test('PUT updates an existing record and missing IDs return 404', async () => {
  const rows = (await json('/sets')).body;
  const updatedPayload = { ...validSet, weight: 62.5, reps: 7, notes: 'Added 2.5 kg' };
  const updated = await json(`/sets/${rows[0].id}`, { method: 'PUT', body: JSON.stringify(updatedPayload) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.weight, 62.5);
  assert.equal(updated.body.reps, 7);
  const missing = await json('/sets/999999', { method: 'PUT', body: JSON.stringify(validSet) });
  assert.equal(missing.response.status, 404);
});
test('DELETE removes a record and deleting it again returns 404', async () => {
  const id = (await json('/sets')).body[0].id;
  const removed = await json(`/sets/${id}`, { method: 'DELETE' });
  assert.equal(removed.response.status, 204);
  const missing = await json(`/sets/${id}`, { method: 'DELETE' });
  assert.equal(missing.response.status, 404);
  assert.deepEqual((await json('/sets')).body, []);
});
