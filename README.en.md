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

## Free frontend hosting: GitHub Pages + local API

GitHub Pages serves the frontend files. FastAPI and SQLite stay on your computer, so there is no paid backend host. There are two important limits: the API must be running for data features to work, and `localhost` always means the computer of the person viewing the page. Do not expose port 8000 to the public internet with router port forwarding.

### 1. Create a GitHub repository

Create a **public** repository such as `touhou-project` on GitHub (GitHub Free Pages requires a public repository). Its source code will be visible to everyone. Leave the options to add a README and `.gitignore` unchecked because this project already contains them. In PowerShell:

```powershell
Set-Location -LiteralPath "C:\Users\YOUR_NAME\Downloads\P4\Touhou_[Project]"
git init -b main
git add .
git status --short
```

Before committing, confirm `.env`, `backend/characters.db`, `.venv`, and `node_modules` are not staged. Then commit and push:

```powershell
git commit -m "Prepare GitHub Pages deployment"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/touhou-project.git
git push -u origin main
```

If Git asks you to sign in, use GitHub Desktop or VS Code's **Publish to GitHub** flow. Never put a password or token in a command or source file.

### 2. Enable GitHub Pages

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The `Deploy GitHub Pages` workflow builds and publishes the frontend whenever `main` is updated. Check **Actions** for its result. The site URL will look like `https://YOUR_GITHUB_USERNAME.github.io/touhou-project/`. The workflow handles the repository base path and SPA fallback; do not upload `dist/` manually.

### 3. Run your local API when you need the data features

Keep `APP_ENV=development` and the SQLite `DATABASE_URL` in `backend/.env`. Set a stable `JWT_SECRET_KEY`, then configure your Pages **origin** (without the repository path):

```dotenv
FRONTEND_ORIGIN=https://YOUR_GITHUB_USERNAME.github.io
API_ORIGIN=http://localhost:8000
SESSION_COOKIE_SAMESITE=none
SESSION_COOKIE_SECURE=true
```

To create the local settings file:

```powershell
Set-Location -LiteralPath "C:\Users\YOUR_NAME\Downloads\P4\Touhou_[Project]\backend"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Start the API in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000 --reload --env-file .env
```

Keep that terminal open while using data and sign-in features; press `Ctrl+C` when you are done. The Pages site calls `http://localhost:8000` on the visitor's own computer. Your browser may ask permission to access the local network, and its third-party-cookie privacy settings may block sign-in cookies. Only allow your own Pages site. If cross-site cookies are blocked, use the local Vite frontend for full sign-in support; it can keep the default `SameSite=Strict` cookie setting.

Other visitors do not connect to your computer: their `localhost` points to their own device. Your SQLite database stays private and is excluded from Git. When the local API is off, the static page remains available but cannot load or change data.

For local development, the Vite origin `http://localhost:5173` and API origin `http://localhost:8000` are same-site. Use `FRONTEND_ORIGIN=http://localhost:5173`, `SESSION_COOKIE_SAMESITE=strict`, and `SESSION_COOKIE_SECURE=false`, then run `npm run dev` and Uvicorn.

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
