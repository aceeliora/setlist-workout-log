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
- Frontend hosting: GitHub Pages
- Backend hosting: current public sandbox-forwarded API for the assignment demo; `render.yaml` configures a Render service with a persistent disk for a durable deployment.

## Live Deployment
- **Frontend:** https://aceeliora.github.io/setlist-workout-log/
- **Backend:** https://3000-icbigmcffaw7jh3s1zatc-d8416404.sg2.manus.computer
- **Health check:** https://3000-icbigmcffaw7jh3s1zatc-d8416404.sg2.manus.computer/health returns `{ "status": "ok" }`.

**Hosting note:** the API link above is a temporary public sandbox-forwarded service, not a Render service. It is useful for the live demo while this sandbox environment is retained, but it is not independent durable hosting. The SQLite database is stored on the sandbox filesystem. For long-term use, deploy the backend using the included Render blueprint with a persistent disk mounted at `/var/data`; SQLite on ephemeral storage is lost when a service is redeployed. A Render account/session is needed to create that service.

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

## Deploy

The frontend is deployed from the `frontend` directory by `.github/workflows/pages.yml`. For a durable backend deployment, create a Render Web Service from this repository using root directory `backend`, build command `npm install`, start command `npm start`, and health-check path `/health`. Attach a persistent disk mounted at `/var/data` and set `DATABASE_PATH=/var/data/workouts.db`; set `FRONTEND_ORIGIN` to the GitHub Pages URL. Replace `window.SETLIST_API_BASE` in `frontend/config.js` with the Render service URL, then push to the deployment branch.

## Pull request
The `crud-ship` branch contains this implementation. The PR description calls out the problem, live demo URLs, and that no `.env` file is committed.
