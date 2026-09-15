# Turnir Hub

**Status: work in progress (active development)**

Tournament management platform for organizing multi-edition competitions: public browsing, live match updates, admin tooling, and permissions.

This repo is a personal project / portfolio piece. Expect incomplete polish, evolving APIs, and occasional breaking changes.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Django 5, Django REST Framework, SimpleJWT, Channels (WebSockets), PostgreSQL |
| Frontend | React 19, TypeScript, Vite, React Router |
| Infra (local) | Docker Compose for Postgres |

## Monorepo layout

```text
turnir-hub/
├── backend/              # Django REST API + WebSockets
├── frontend/             # Vite React SPA
├── docker-compose.yml    # PostgreSQL
├── start-dev.bat         # Windows helper (optional)
└── start-dev.ps1         # PowerShell helper (optional)
```

## Features (current)

**Public**
- Home with active editions and match highlights
- Tournament / edition pages: standings, schedule, teams, players, stats
- Live match view (REST + WebSocket updates)
- Player profiles and career history charts

**Auth & permissions**
- JWT login (access + refresh)
- User ↔ Person link for account identity
- Permission model + admin role UI (RBAC); route-level guards are partial — backend permission checks are the source of truth

**Admin / manage**
- Catalog (sports, statuses, rule templates, formats, …)
- Persons, teams, tournaments, editions
- Match detail / event editing
- Live match control (clock, events, temporary players)
- Edition preparation: teams, players, phases, finish flow + awards
- Demo generators for sandbox data (fictional names only)

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ (or Docker)

## Quick start

### 1. Database

```bash
docker compose up -d
```

Default local DB (see `backend/.env.example`):

`postgres://turnir:turnir@localhost:5432/turnir_hub`

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements/development.txt
copy .env.example .env          # Windows
# cp .env.example .env          # macOS / Linux

python manage.py migrate
python manage.py seed_all       # statuses, roles, formats, …
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

API: [http://localhost:8000](http://localhost:8000)  
OpenAPI docs: [http://localhost:8000/api/v1/docs/](http://localhost:8000/api/v1/docs/)

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env          # optional; Vite proxy defaults are fine
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Vite proxies `/api` and `/ws` to `http://127.0.0.1:8000` (see `frontend/vite.config.ts`).

### Windows helpers (optional)

`start-dev.bat` or `start-dev.ps1` start Docker Postgres (if available), Django on `:8000`, and Vite on `:3000`.

## Project conventions

1. Backend and frontend stay separated — no shared runtime code
2. Frontend never talks to the database
3. Business logic lives in `services/` (not in views/components)
4. Apps stay focused: `users`, `tournaments`, `matches`, `players`, `core`
5. Prefer explicit structure over clever shortcuts

## Environment & secrets

- Copy only `.env.example` files; real `.env` files are gitignored
- Never commit secrets, dumps, media uploads, or local DB data
- Demo generators use **fictional** person names — do not add real personal data to the repo

## Docs

| File | Purpose |
|------|---------|
| `README.md` | This file — current overview & setup |
| `backend/README.md` | Backend notes |
| `frontend/README.md` | Frontend notes |

## Roadmap / still in progress

- [ ] Complete route-level permission guards to match backend RBAC
- [ ] Production deploy config & CI polish
- [ ] Broader test coverage
- [ ] UX consistency pass across admin / public surfaces
- [ ] i18n / copy cleanup (UI is mixed EN/SL)

## License

Personal portfolio project. No license granted for reuse unless explicitly stated.
