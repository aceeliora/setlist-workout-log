# Setlist

## What It Is
Setlist is a small workout journal for logging exercise sets, weights, reps, dates, and notes so you can pick up where you left off.

## The Problem It Solves
The workout scenario in this assignment is easy to picture: after a week away, you may not remember the weight or reps from the last session, so the next workout starts with a guess. Setlist records each set in SQLite so those numbers are easy to look up when you return.

## What I Intentionally Excluded
- **User accounts and authentication:** this MVP is designed as a single-user learning project; identity, password storage, and session/JWT security would add a separate security surface. This public demo is not private—do not enter sensitive information.
- **Workout programs and charts:** the central job is recording and recalling a set; a program builder or analytics dashboard would complicate the focused CRUD workflow.
- **Multiple units:** weights are shown in kilograms for this first version to keep each entry and comparison unambiguous.

## Tech Stack
- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- Frontend: Vanilla HTML, CSS, and JavaScript
- Current demo: public sandbox-forwarded frontend and API URLs
- Durable target: Render (backend with a persistent disk) + GitHub Pages (frontend)

## Live Demo
- **Frontend:** https://8080-icbigmcffaw7jh3s1zatc-d8416404.sg2.manus.computer/
- **Backend:** https://3000-icbigmcffaw7jh3s1zatc-d8416404.sg2.manus.computer
- **Health check:** https://3000-icbigmcffaw7jh3s1zatc-d8416404.sg2.manus.computer/health returns `{ "status": "ok" }`.

**Hosting note:** these are temporary public sandbox-forwarded URLs, not independent Render and GitHub Pages deployments. They are working demo links while the sandbox environment is retained, but should not be treated as durable production hosting. The SQLite file is stored on the sandbox filesystem. For long-term use, deploy the backend using the included `render.yaml` with a persistent disk mounted at `/var/data`; Render service creation needs an authenticated account. The GitHub Pages workflow is included, but Pages hosting must first be enabled in repository settings. The current GitHub authorization cannot change that setting.

## Data model and CRUD
A set has an exercise name, weight in kilograms, reps, workout date, and optional note.

| Operation | Method and route | Meaning |
| --- | --- | --- |
| Create | `POST /sets` | Validate and log a new set |
| Read | `GET /sets` | List all sets, newest workout first |
| Update | `PUT /sets/:id` | Correct an existing set |
| Delete | `DELETE /sets/:id` | Remove a mistaken or unwanted set |

The separate `GET /health` route is used to check service availability.

## Run locally

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Open `frontend/index.html` through a local static server (for example, `python3 -m http.server 8080 --directory frontend`) while the API runs on `http://localhost:3000`. For local testing, change `window.SETLIST_API_BASE` in `frontend/config.js` to `http://localhost:3000`.

## Verify the API

```bash
cd backend
npm test
```

The test suite exercises health, create, read, update, delete, validation failures, and missing IDs against a temporary SQLite database. For a manual persistence check, create a set, restart the API using the same `DATABASE_PATH`, and read the list again.

## Durable deployment

The frontend can be published from the `frontend` directory using the included `.github/workflows/pages.yml` after GitHub Pages is enabled for the repository. For a durable backend, create a Render Web Service from this repository using root directory `backend`, build command `npm install`, start command `npm start`, and health-check path `/health`. Attach a persistent disk mounted at `/var/data` and set `DATABASE_PATH=/var/data/workouts.db`; set `FRONTEND_ORIGIN` to the Pages URL. Replace `window.SETLIST_API_BASE` in `frontend/config.js` with the Render service URL, then push to the deployment branch.

## Pull request
The `crud-ship` branch contains this implementation. The PR description calls out the problem, current demo URLs, and that no `.env` file is committed.
