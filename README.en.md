# Touhou_「Project」

A small fan-made archive born from a simple idea: a character database should be useful, but it does not have to feel like homework. I wanted to build something around the Touhou Project and the worlds I enjoy, then use it to learn how a full-stack application fits together.

The interface supports Traditional Chinese and English. Choose **繁中** or **EN** in the top navigation; your choice is saved in this browser.

## What you can do

- Browse and search characters by name, abilities, and source work.
- Contribute character profiles, including biography, reference links, and a character theme song with an optional track URL.
- Add a portrait, crop it in the browser, and store new images with Cloudinary.
- Rate six abilities from 0 to 10 and compare them in a radar chart.
- Organize characters with reusable work and attribute tags.
- Save favorites and manage your own contributions from a personal dashboard.
- View community and source-work statistics.
- Explore AI-inferred character relationships. These are suggestions for discovery, not official canon.

## Pages

| Route | Page |
| --- | --- |
| `/` | Character archive and search |
| `/login` | Sign in |
| `/register` | Create an account |
| `/dashboard` | Your contributions and favorites |
| `/statistics` | Community statistics |
| `/relationships` | Interactive relationship map |
| `/characters/new` | Add a character |
| `/characters/:id` | Character profile |
| `/characters/:id/edit` | Edit your character |

The dashboard and contribution forms require an account. Only the creator can edit or delete their character entries.

## Tech stack

- **Frontend:** React, Vite, React Router, Recharts, react-select, react-easy-crop, and react-force-graph-2d
- **Backend:** FastAPI, SQLAlchemy, Pydantic Settings, and Alembic
- **Data:** SQLite for local development; PostgreSQL or MySQL for production
- **Services:** Redis for shared rate limits, Cloudinary for image hosting, and OpenAI or local Ollama for optional relationship analysis
- **Deployment:** Docker Compose, PostgreSQL, Redis, and Nginx

## Run locally

Requirements: Python 3.10+, Node.js 18+, and npm.

### 1. Start the API

In PowerShell:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Set a fresh `JWT_SECRET_KEY` in `backend/.env`. Cloudinary credentials are only required for portrait uploads. Set `OPENAI_API_KEY` only when using the hosted OpenAI provider. Keep secrets out of the frontend and Git.

Start FastAPI:

```powershell
uvicorn main:app --reload --env-file .env
```

The API runs at `http://localhost:8000`; interactive API docs are at `http://localhost:8000/docs`.

### 2. Start the frontend

Open another PowerShell window:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`. Set `VITE_API_URL` before building if the API uses a different address.

## Database and migrations

Development mode creates missing tables for convenience. Production does not create tables automatically: apply Alembic migrations before starting the API.

From `backend/`, with `DATABASE_URL` configured:

```powershell
alembic current
alembic upgrade head
```

For an existing SQLite database created by the earlier `create_all` flow, back it up first. If it contains the initial schema but has no `alembic_version` table, mark that existing schema before applying later migrations:

```powershell
alembic stamp 11c110229789
alembic upgrade head
```

Do not stamp an empty database. To copy local SQLite data to a new PostgreSQL or MySQL database, use `backend/migrate_sqlite_to_database.py`; the script refuses a non-empty target and leaves the source file intact. Back up and verify the destination before switching services.

Production requires a non-SQLite database, a `JWT_SECRET_KEY` of at least 32 characters, and verified database TLS (`sslmode=verify-full` for PostgreSQL, or a CA certificate and certificate verification for MySQL).

## Docker Compose

Install Docker Desktop, then create the root `.env` from the example and fill in the PostgreSQL credentials and JWT secret:

```powershell
Copy-Item .env.docker.example .env
notepad .env
docker compose up --build
```

The stack starts PostgreSQL, Redis, FastAPI, and the React/Nginx frontend. The API waits for healthy dependencies and applies migrations before serving requests. Open `http://localhost:5173` and `http://localhost:8000/docs`.

Stop the stack with `docker compose down`. Avoid `docker compose down -v` unless you intend to delete the database volumes.

## Tests and CI

Install backend development dependencies and run checks from the repository root:

```powershell
cd backend
pip install -r requirements-dev.txt
cd ..
pytest
ruff check backend
```

Tests use isolated temporary SQLite databases and do not require Redis, Cloudinary, or OpenAI. GitHub Actions runs backend lint/tests and the frontend production build on pushes and pull requests.

## Learning resources

- [Traditional Chinese README](README.md)
- [Full-stack learning guide](docs/LEARNING_GUIDE.txt)
- [Learning slides](docs/LEARNING_GUIDE.pptx)

This is a fan-made learning project. Touhou Project characters and source works belong to their respective rights holders. AI-generated relationship suggestions are not official setting material. Follow the license terms of any assets you use.
