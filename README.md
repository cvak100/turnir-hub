# turnir-hub

Tournament management platform.

**Stack:** Django (REST API) + Next.js (frontend) + PostgreSQL

## Monorepo layout

```text
turnir-hub/
├── backend/     # Django REST API
├── frontend/    # Next.js app
└── docker-compose.yml
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ (or Docker)

## Quick start

### Database

```bash
docker compose up -d
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements/development.txt
copy .env.example .env
python manage.py runserver
```

API: [http://localhost:8000](http://localhost:8000)

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Project rules

1. Backend never contains frontend code
2. Frontend never talks directly to the database
3. Business logic lives in `services/` (not in views)
4. Keep apps small and focused
5. Prefer explicit structure over clever shortcuts

## Status

**Phase 1 – Project Setup & Structure** complete.  
Next: **Phase 2 – Domain Models Implementation**.
