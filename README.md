# Turnir Hub

**Status: work in progress (active development)**

Tournament management platform for organizing multi-edition competitions: public browsing, live match updates, admin tooling, and role-based access.

This repo is a personal project / portfolio piece. Expect incomplete polish, evolving APIs, and occasional breaking changes.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Django 5, Django REST Framework, SimpleJWT, Channels (WebSockets), PostgreSQL |
| Frontend | React 19, TypeScript, Vite, React Router |
| Infra (local) | Docker Compose for Postgres |

> Note: older planning docs may still mention Next.js — the current frontend is **Vite + React**.

## Monorepo layout

```text
turnir-hub/
├── backend/              # Django REST API + WebSockets
├── frontend/             # Vite React SPA
├── docker-compose.yml    # PostgreSQL
├── start-dev.bat         # Windows helper (optional)
└── READMEMAIN*.md        # Historical development plans (not setup guides)
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
- Role / permission checks on manage and admin routes (RBAC still evolving)

**Admin / manage**
- Catalog (sports, statuses, rule templates, formats, …)
- Persons, teams, tournaments, editions
- Match detail / event editing
- Live match control (clock, events, temporary players)
- Edition preparation: teams, players, phases, finish flow + awards
- Demo generators for sandbox data (fictional / anonymized names)

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
python manage.py runserver 0.0.0.0:8000
```

API: [http://localhost:8000](http://localhost:8000)  
OpenAPI (if enabled): `/api/schema/swagger-ui/`

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env          # optional; proxy defaults are fine
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Vite proxies `/api` and `/ws` to the backend. If you run Django on another port (e.g. via `start-dev.bat`), adjust `frontend/vite.config.ts` accordingly.

### Windows one-click (optional)

`start-dev.bat` starts Postgres (Docker or a local portable install), Django, and Vite. Prefer Docker for a clean, portable setup.

## Project conventions

1. Backend and frontend stay separated — no shared runtime code
2. Frontend never talks to the database
3. Business logic lives in `services/` (not in views/components)
4. Apps stay focused: `users`, `tournaments`, `matches`, `players`, `core`
5. Prefer explicit structure over clever shortcuts

## Environment & secrets

- Copy only `.env.example` files; real `.env` files are gitignored
- Never commit secrets, dumps, media uploads, or local DB data
- Demo generators use **fictional / anonymized** person names — do not add real personal data to the repo

## Docs

| File | Purpose |
|------|---------|
| `README.md` | This file — current overview & setup |
| `backend/README.md` | Backend notes |
| `frontend/README.md` | Frontend notes |
| `READMEMAIN.md` / `READMEMAIN_FULL.md` | Early phase plans (partially outdated) |

## Roadmap / still in progress

- [ ] Harden and document RBAC end-to-end
- [ ] Production deploy config & CI polish
- [ ] Broader test coverage
- [ ] UX consistency pass across admin / public surfaces
- [ ] i18n / copy cleanup (UI is mixed EN/SL)

## License

Private / personal project unless otherwise stated. Ask before reusing substantial parts.
