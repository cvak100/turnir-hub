# turnir-hub backend

Django REST API for the turnir-hub platform.

**Status:** work in progress.

## Setup

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements/development.txt
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux
```

## Run

```bash
python manage.py migrate
python manage.py seed_all
python manage.py createsuperuser
python manage.py runserver
```

## Settings

| Module | Purpose |
|--------|---------|
| `config.settings.base` | Shared settings |
| `config.settings.development` | Local development |
| `config.settings.production` | Production |

Set `DJANGO_ENV` to `development` (default) or `production`.

## Apps

- `apps.users` — auth, persons, roles/permissions
- `apps.tournaments` — tournaments, editions, phases, standings, finish
- `apps.matches` — matches, events, live WebSocket
- `apps.players` — teams, participations, players, awards
- `apps.core` — catalog, seeds, demo generators
