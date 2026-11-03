# Setlist

## What It Is
Setlist is a small workout journal for logging exercise sets, weights, reps, dates, and notes so you can pick up where you left off.

## The Problem It Solves
I kept forgetting the weight I used in my last gym session and had to guess where to start the next time. Setlist stores each set in a persistent database, so I can check my history and know what to lift next.

## What I Intentionally Excluded
- **User accounts and authentication:** this MVP is designed as a single-user learning project; identity, password storage, and session/JWT security would add a separate security surface. Do not store sensitive information in this public demo.
- **Workout programs and charts:** the central job is recording and recalling a set; a program builder or analytics dashboard would complicate the focused CRUD workflow.
- **Multiple units:** weights are shown in kilograms for this first version to keep each entry and comparison unambiguous.

## Tech Stack
- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- Frontend: Vanilla HTML, CSS, and JavaScript
- Deployment target: Render (backend with a persistent disk) + GitHub Pages (frontend)

## Live Deployment
- **Frontend:** Pending deployment. The GitHub Pages workflow is configured; add the Render API URL to `frontend/config.js` before publishing.
- **Backend:** Pending Render service creation. The blueprint mounts `/var/data` and stores SQLite at `/var/data/workouts.db`.
- **Health check:** `GET /health` returns `{ "status": "ok" }`.

## Data model and CRUD
A set has an exercise name, weight in kilograms, reps, workout date, and optional note.

| Operation | Method and route | Meaning |
| --- | --- | --- |
| Create | `POST /sets` | Validate and log a new set |
| Read | `GET /sets` | List all sets, newest workout first |
| Update | `PUT /sets/:id` | Correct an existing set |
| Delete | `DELETE /sets/:id` | Remove a mistaken or unwanted set |

The separate `GET /health` route is used by the deployment platform to check service availability.

## Run locally

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Open `frontend/index.html` through a local static server (for example, `python3 -m http.server 8080 --directory frontend`) while the API runs on `http://localhost:3000`. The frontend defaults to that local URL in `frontend/config.js`.

## Verify the API

```bash
cd backend
npm test
```

The test suite exercises health, create, read, update, delete, validation failures, and missing IDs against a temporary SQLite database. For a manual persistence check, create a set, restart the API using the same `DATABASE_PATH`, and read the list again.

## Deploy

1. Create a Render Web Service from this repository using root directory `backend`, build command `npm install`, start command `npm start`, and health-check path `/health`.
2. Attach a persistent disk mounted at `/var/data` and set `DATABASE_PATH=/var/data/workouts.db`. SQLite on an ephemeral filesystem will be lost on redeploy, so the disk is required for persistent production data. Set `FRONTEND_ORIGIN` to the GitHub Pages URL.
3. Replace `window.SETLIST_API_BASE` in `frontend/config.js` with the Render service URL, then push to `main` to deploy the Pages workflow.

## Pull request
The `crud-ship` branch contains this implementation. The PR description calls out the problem, deployment URLs, and that no `.env` file is committed.
