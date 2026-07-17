# Phase 1 – Project Setup & Structure

**Project:** turnir-hub  
**Stack:** Django (backend) + Next.js (frontend)  
**Document type:** Technical setup guide  
**Audience:** Developer  

---

## 1. Goal of this phase

By the end of this phase you should have:

- A clean, scalable monorepo structure
- Working Django backend with proper settings split
- Working Next.js frontend with modular architecture
- Environment variables properly configured
- Basic project ready for implementing the domain model

This phase is **only about foundation**.  
No business logic, no models, no API endpoints yet.

---

## 2. Prerequisites

Make sure you have installed:

| Tool              | Version     | Notes                          |
|-------------------|-------------|--------------------------------|
| Python            | 3.12+       | Recommended                    |
| Node.js           | 20+         | LTS version                    |
| PostgreSQL        | 15+         | Local or Docker                |
| Git               | Latest      | -                              |
| Docker (optional) | Latest      | Recommended for later          |

---

## 3. Final Project Structure

```text
turnir-hub/
├── backend/
│   ├── apps/
│   │   ├── users/
│   │   │   ├── models/
│   │   │   ├── serializers/
│   │   │   ├── views/
│   │   │   ├── permissions/
│   │   │   ├── services/
│   │   │   ├── urls.py
│   │   │   ├── admin.py
│   │   │   └── apps.py
│   │   ├── tournaments/
│   │   │   ├── models/
│   │   │   ├── serializers/
│   │   │   ├── views/
│   │   │   ├── services/
│   │   │   ├── urls.py
│   │   │   └── apps.py
│   │   ├── matches/
│   │   ├── players/
│   │   └── core/
│   │       ├── permissions/
│   │       ├── exceptions/
│   │       ├── pagination/
│   │       ├── utils/
│   │       └── mixins/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   └── production.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── modules/
│   │   │   ├── tournaments/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── matches/
│   │   │   ├── players/
│   │   │   ├── auth/
│   │   │   └── live/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── utils/
│   │   ├── types/
│   │   ├── styles/
│   │   └── middleware.ts
│   ├── public/
│   ├── package.json
│   ├── .env.local.example
│   └── README.md
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 4. Backend Setup (Django)

### 4.1 Create project and virtual environment

```bash
mkdir turnir-hub
cd turnir-hub
mkdir backend
cd backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
```

### 4.2 Install base packages

```bash
pip install django djangorestframework psycopg2-binary python-dotenv django-cors-headers djangorestframework-simplejwt
```

### 4.3 Create Django project

```bash
django-admin startproject config .
```

### 4.4 Create apps structure

```bash
mkdir -p apps/users apps/tournaments apps/matches apps/players apps/core
```

Then create the apps:

```bash
python manage.py startapp users apps/users
python manage.py startapp tournaments apps/tournaments
python manage.py startapp matches apps/matches
python manage.py startapp players apps/players
python manage.py startapp core apps/core
```

### 4.5 Create advanced folder structure inside apps

For each main app (`users`, `tournaments`, `matches`, `players`) create:

```bash
mkdir -p apps/users/models apps/users/serializers apps/users/views apps/users/permissions apps/users/services
```

Repeat the same pattern for other apps.

Inside `core`:

```bash
mkdir -p apps/core/permissions apps/core/exceptions apps/core/pagination apps/core/utils apps/core/mixins
```

### 4.6 Split settings

Create this structure:

```bash
mkdir -p config/settings
touch config/settings/__init__.py
touch config/settings/base.py
touch config/settings/development.py
touch config/settings/production.py
```

Move the original `settings.py` content into `base.py` and clean it up.

**Recommended approach:**

- `base.py` → common settings
- `development.py` → DEBUG = True, local database, etc.
- `production.py` → secure settings, production database

In `config/settings/__init__.py` you can load the correct settings based on environment variable.

### 4.7 Requirements structure

```bash
mkdir requirements
```

Create three files:

- `requirements/base.txt`
- `requirements/development.txt`
- `requirements/production.txt`

Example `base.txt`:

```text
Django>=5.0
djangorestframework
psycopg2-binary
python-dotenv
django-cors-headers
djangorestframework-simplejwt
```

### 4.8 Environment variables

Create `.env.example`:

```env
DEBUG=True
SECRET_KEY=change-me
DATABASE_URL=postgres://user:password@localhost:5432/turnir_hub
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Never commit real `.env` file.

---

## 5. Frontend Setup (Next.js)

### 5.1 Create Next.js application

From the root of the project:

```bash
cd ..
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 5.2 Create modular structure

```bash
cd frontend/src
mkdir -p modules/tournaments modules/matches modules/players modules/auth modules/live
mkdir -p components/ui components/layout
mkdir -p lib/api lib/auth lib/utils
mkdir -p types styles
```

Inside each module create:

```bash
mkdir -p modules/tournaments/components
mkdir -p modules/tournaments/hooks
mkdir -p modules/tournaments/services
mkdir -p modules/tournaments/types
touch modules/tournaments/index.ts
```

Repeat for other modules.

### 5.3 Environment variables

Create `.env.local.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 6. Root files

### 6.1 .gitignore

Minimum recommended content:

```gitignore
# Python
__pycache__/
*.py[cod]
venv/
.env
*.sqlite3

# Node
node_modules/
.next/
.env.local
dist/

# OS / IDE
.DS_Store
.idea/
.vscode/
```

### 6.2 docker-compose.yml (optional for now)

You can leave a basic version for PostgreSQL:

```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: turnir_hub
      POSTGRES_USER: turnir
      POSTGRES_PASSWORD: turnir
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 7. Definition of Done (Phase 1)

This phase is finished when:

- [ ] Repository structure matches the defined architecture
- [ ] Django starts without errors (`python manage.py runserver`)
- [ ] Next.js starts without errors (`npm run dev`)
- [ ] Settings are split into base / development / production
- [ ] Environment variables are used (no hardcoded secrets)
- [ ] Apps are created and registered in `INSTALLED_APPS`
- [ ] Frontend has modular folder structure (`modules/`, `lib/`, `components/`)
- [ ] Basic README exists in root, backend and frontend

---

## 8. Important rules for this project

1. **Backend never contains frontend code**
2. **Frontend never talks directly to the database**
3. All business logic should live in `services/` (not in views)
4. Keep apps small and focused
5. Prefer explicit structure over clever shortcuts
6. Everything related to security (auth, permissions) must be deliberate

---

# Phase 2 – Domain Models Implementation


---

## 1. Purpose of this document

This document explains **how and why** we implement the database models for the tournament management system.

The goal is not only to create working models, but to create a structure that remains understandable and maintainable even after 12+ months.

Every major decision is explained.

---

## 2. Core Design Principles

Before writing any model, these principles must be respected:

### 2.1 Separation by Domain (Apps)

We do **not** put all models into one app.  
Instead we split them by business domain:

| App | Responsibility |
|-----|----------------|
| `users` | Authentication, authorization, Person |
| `tournaments` | Tournament structure, editions, phases, groups, prizes, templates |
| `players` | Teams, players, participation, awards |
| `matches` | Matches, events, live data |
| `core` | Shared abstract models, mixins, common utilities |

This makes the codebase easier to navigate and reduces cognitive load.

### 2.2 Prefer explicit over clever

- Avoid overly generic models when a clear domain concept exists.
- Prefer readable field names.
- Prefer clear relationships over deeply nested JSON when the data is queried often.

### 2.3 Status tables use `code`

All status-like tables contain a `code` field.

**Why?**
- `name` can change (translations, better wording)
- `code` stays stable and is used in business logic
- Example: `if match.status.code == "live":`

This is a deliberate design decision for long-term stability.

### 2.4 Historical data must survive changes

A team can change its name.  
A player can change teams.  
A person can change contact details.

Because of this we use:

- `Team` → long-term identity of a team
- `TeamParticipation` → how that team appears in a specific tournament edition
- `Person` → long-term identity of a human
- `Player` → football-specific extension of a Person

This separation is critical.

---

## 3. Recommended Implementation Order

Models must be created in a specific order because of foreign key dependencies.

### Step-by-step order:

1. **core** (abstract base models if needed)
2. **users**
   - PersonStatus
   - Person
   - User (custom if needed)
   - Role
   - Permission
   - UserRole
   - RolePermission
3. **tournaments** (basic)
   - Sport
   - Sponsor
   - TournamentStatus
   - GlobalRuleTemplate
   - Template
   - Tournament
   - TournamentEdition
4. **players**
   - TeamStatus
   - Team
   - PlayerStatus
   - Player
   - TeamParticipation
   - TeamParticipationPlayer
   - Award
   - PlayerAward
5. **tournaments** (structure)
   - TournamentPhase
   - TournamentPhaseGroup
   - TournamentPhaseGroupTeam
6. **matches**
   - MatchStatus
   - Match
   - EventType
   - MatchEvent
7. **Closing**
   - TournamentFinalStanding
   - TournamentPrize

---

## 4. Detailed Model Explanations

### 4.1 Person vs Player

**Person** represents a human being in the system.  
This can later be a player, coach, referee, contact person, etc.

**Player** is a football-specific extension of Person.

**Why not put everything in Player?**
Because the same person might appear in different roles over time (player → coach, or contact person for a team).

This design keeps the door open for future roles without polluting the Player model.

### 4.2 Team vs TeamParticipation

This is one of the most important design decisions in the whole system.

- `Team` = the real-world club / team identity (long-lived)
- `TeamParticipation` = the appearance of that team in a specific `TournamentEdition`

**Why?**
- A team can play under a slightly different name in different years
- A team can have different contact persons per tournament
- A team can have different sponsors per edition
- Statistics belong to a participation, not always to the eternal team

Never store tournament-specific data directly on `Team`.

### 4.3 Tournament vs TournamentEdition

- `Tournament` = the long-term competition (e.g. "Poletni turnir Maribor")
- `TournamentEdition` = a specific year/instance (e.g. "Poletni turnir Maribor 2026")

This allows historical data to remain clean and comparable across years.

### 4.4 Phases and Groups

Tournament structure is dynamic.  
We support:

- League (single group)
- Group stage + Knockout
- Pure knockout
- Custom formats

This is why we have:

- `TournamentPhase` → defines a stage (Group Stage, Quarterfinals, Final...)
- `TournamentPhaseGroup` → concrete groups inside a phase (Group A, Group B...)
- `TournamentPhaseGroupTeam` → which teams are in which group + their standing stats

Matches are then linked either to a phase or to a specific group.

### 4.5 MatchEvent is the source of truth for live data

Individual statistics (goals, cards, assists...) should primarily come from `MatchEvent`.

`TeamParticipationPlayer` contains aggregated counters (`goals`, `yellow_cards`...) for performance reasons, but the detailed truth lives in `MatchEvent`.

This allows:
- Full match timeline
- Easy recalculation
- Better live experience

### 4.6 Template table

The `Template` table is a global configuration store.

It is used for:

- Status codes
- Event type codes
- Common enums (position, dominant foot, prize type...)
- Global default settings

It is **not** a tournament structure template in the classical sense.  
It is a flexible key-value + metadata store for system-wide constants and display helpers.

---

## 5. Model Implementation Guidelines

### 5.1 File organization inside an app

Example for `tournaments` app:

```text
tournaments/
├── models/
│   ├── __init__.py
│   ├── tournament.py
│   ├── edition.py
│   ├── phase.py
│   ├── group.py
│   └── prize.py
├── serializers/
├── views/
├── services/
├── admin.py
└── apps.py
```

In `models/__init__.py` import all models so Django detects them.

### 5.2 Common patterns to use

**Timestamps**
Almost every model should have:

```python
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
```

**Soft status**
Prefer `is_active` boolean + status FK instead of deleting records.

**JSONField usage**
Use JSONField only for:
- Truly flexible configuration
- Social links
- Rules that vary heavily between tournaments

Do not abuse JSONField for data that should be queryable.

### 5.3 Naming conventions

- Model names: singular, PascalCase (`TeamParticipation`)
- Table names: Django default is fine
- Field names: snake_case
- Foreign keys: use clear names (`tournament_edition`, not just `edition`)

---

## 6. Concrete Implementation Notes per Area

### Users & Permissions

- Start with a custom User model early (even if you extend AbstractUser).
- Roles can be global or scoped to a `TournamentEdition` (via `UserRole.tournament_edition`).
- Permissions should be code-based (`tournament.edit`, `match.result.add`...).

### Tournaments

- `TournamentEdition.configuration` can store temporary/flexible settings.
- `GlobalRuleTemplate` stores reusable match rules (duration, substitutions, fouls...).
- Phases should be ordered with an integer `order` field.

### Players & Teams

- A player is never forced to belong to only one team forever.
- `TeamParticipationPlayer` is the place where jersey number and captain status for a specific tournament live.

### Matches & Live

- `MatchEvent` must be as rich as possible (minute, extra minute, half, related player, VAR flags...).
- Keep `Match` relatively clean. Heavy detail goes into events.

### Closing

- `TournamentFinalStanding` is a snapshot created when the tournament is finished.
- `TournamentPrize` handles both trophies and real-world prizes (money, vouchers, dinners) and can be linked to sponsors.

---

## 7. What you should do now (practical steps)

1. Create empty model files inside each app according to the structure.
2. Implement models in the order defined in section 3.
3. After each small group of models, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

4. Register models in `admin.py` early (even with basic `list_display`) so you can inspect data.
5. Do not write serializers or views yet. Focus only on correct model design.

---

## 8. Definition of Done (Phase 2)

This phase is complete when:

- [ ] All models from the domain model are implemented
- [ ] Models are placed in the correct apps
- [ ] Foreign keys and relationships are correct
- [ ] `code` fields exist on all status / type tables
- [ ] Migrations run without errors
- [ ] Basic admin registration exists for main models
- [ ] You can create a Tournament → Edition → Teams → Phases → Matches flow in Django admin

---

## 9. Important warnings

- Do not start optimizing for performance too early.
- Do not merge `Person` and `Player`.
- Do not store tournament-specific team data on the `Team` model.
- Do not skip the `code` field on status tables.
- Do not put business logic into models beyond simple helpers. Prefer `services/`.

---





# Phase 2.2 + 2.3 – Concrete Models, Migrations & Admin

---

## 0. What is included in this document

This document covers:

- **2.2** Concrete Django models (all fields)
- **2.3** Migrations + basic Admin setup

After this document there is **no more step inside Phase 2**.  
Next major phase will be **Phase 3 – Serializers & API**.

---

## 1. Important rules before writing models

### 1.1 on_delete strategy (critical)

This is the solution to your previous problem (statuses being deleted).

| Relation type                        | Recommended on_delete | Why |
|--------------------------------------|-----------------------|-----|
| Status / lookup tables (PersonStatus, TeamStatus, MatchStatus...) | `PROTECT` | Prevents accidental deletion of used values |
| Main business objects (Tournament → Edition) | `CASCADE` or `PROTECT` | Depends on desired behaviour |
| Optional relations (contact_person, referee...) | `SET_NULL` | Safe when the related object is deleted |
| User created content                 | `SET_NULL` or `PROTECT` | Usually SET_NULL |

**Rule we follow in this project:**

- Every ForeignKey to a **Status** or **Type** table → `on_delete=models.PROTECT`
- Optional human relations (contact person, referee) → `on_delete=models.SET_NULL`
- Strong parent-child (Tournament → TournamentEdition) → `on_delete=models.CASCADE`

### 1.2 Code field on every status/type table

All status and type tables must have:

```python
code = models.CharField(max_length=50, unique=True)
```

This value is used in code.  
Never rely only on the `name` field.

### 1.3 File organization

Example for `tournaments` app:

```text
tournaments/
├── models/
│   ├── __init__.py
│   ├── sport.py
│   ├── sponsor.py
│   ├── tournament.py
│   ├── edition.py
│   ├── phase.py
│   ├── group.py
│   ├── standing.py
│   ├── prize.py
│   └── template.py
```

In `models/__init__.py` you must import all models.

---

## 2. Phase 2.2 – Concrete Models

Models are listed by app and in the recommended creation order.

---

### APP: `users`

#### PersonStatus

```python
class PersonStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Person statuses"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name
```

#### Person

```python
class Person(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    status = models.ForeignKey(
        PersonStatus,
        on_delete=models.PROTECT,
        related_name="persons"
    )
    show_as_anonymous = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
```

#### Role

```python
class Role(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### Permission

```python
class Permission(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code
```

#### UserRole

```python
class UserRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_roles"
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="user_roles"
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_roles"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "role", "tournament_edition")
```

#### RolePermission

```python
class RolePermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions"
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("role", "permission")
```

---

### APP: `tournaments`

#### Sport

```python
class Sport(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### Sponsor

```python
class Sponsor(models.Model):
    name = models.CharField(max_length=150)
    logo = models.ImageField(upload_to="sponsors/", blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### TournamentStatus

```python
class TournamentStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Tournament statuses"
        ordering = ["order"]

    def __str__(self):
        return self.name
```

#### GlobalRuleTemplate

```python
class GlobalRuleTemplate(models.Model):
    name = models.CharField(max_length=150)
    match_duration = models.PositiveIntegerField(null=True, blank=True)
    half_time_duration = models.PositiveIntegerField(null=True, blank=True)
    max_substitutions = models.PositiveIntegerField(null=True, blank=True)
    allow_extra_time = models.BooleanField(default=True)
    allow_penalties = models.BooleanField(default=True)
    max_team_fouls = models.PositiveIntegerField(null=True, blank=True)
    yellow_card_rules = models.TextField(blank=True)
    red_card_rules = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### Template

```python
class Template(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, unique=True)
    template_type = models.CharField(max_length=50)
    value = models.JSONField(null=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, blank=True)
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["template_type", "order", "name"]

    def __str__(self):
        return f"{self.template_type}: {self.name}"
```

#### Tournament

```python
class Tournament(models.Model):
    name = models.CharField(max_length=200)
    sport = models.ForeignKey(
        Sport,
        on_delete=models.PROTECT,
        related_name="tournaments"
    )
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="tournaments/logos/", blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_tournaments"
    )
    sponsors = models.ManyToManyField(Sponsor, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### TournamentEdition

```python
class TournamentEdition(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="editions"
    )
    name = models.CharField(max_length=200)
    year = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    max_teams = models.PositiveIntegerField(null=True, blank=True)
    max_players_per_team = models.PositiveIntegerField(null=True, blank=True)
    status = models.ForeignKey(
        TournamentStatus,
        on_delete=models.PROTECT,
        related_name="editions"
    )
    public_rules = models.TextField(blank=True)
    configuration = models.JSONField(null=True, blank=True)
    global_rule_template = models.ForeignKey(
        GlobalRuleTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="editions"
    )
    location = models.CharField(max_length=200, blank=True)
    cover_image = models.ImageField(upload_to="tournaments/covers/", blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_editions"
    )
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    social_links = models.JSONField(null=True, blank=True)
    sponsors = models.ManyToManyField(Sponsor, blank=True)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_editions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "name"]

    def __str__(self):
        return f"{self.name} ({self.year})"
```

#### TournamentPhase

```python
class TournamentPhase(models.Model):
    class PhaseType(models.TextChoices):
        GROUP_STAGE = "GROUP_STAGE", "Group Stage"
        KNOCKOUT = "KNOCKOUT", "Knockout"
        FINAL = "FINAL", "Final"
        THIRD_PLACE = "THIRD_PLACE", "Third Place"
        CUSTOM = "CUSTOM", "Custom"

    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="phases"
    )
    name = models.CharField(max_length=150)
    phase_type = models.CharField(max_length=20, choices=PhaseType.choices)
    order = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default="not_started")
    rules = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.tournament_edition} - {self.name}"
```

#### TournamentPhaseGroup

```python
class TournamentPhaseGroup(models.Model):
    tournament_phase = models.ForeignKey(
        TournamentPhase,
        on_delete=models.CASCADE,
        related_name="groups"
    )
    name = models.CharField(max_length=50)
    order = models.PositiveIntegerField()
    max_teams = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.tournament_phase.name} - {self.name}"
```

#### TournamentPhaseGroupTeam

```python
class TournamentPhaseGroupTeam(models.Model):
    tournament_phase_group = models.ForeignKey(
        TournamentPhaseGroup,
        on_delete=models.CASCADE,
        related_name="group_teams"
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="group_memberships"
    )
    order = models.PositiveIntegerField(null=True, blank=True)
    played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    points = models.IntegerField(default=0)
    goals_for = models.PositiveIntegerField(default=0)
    goals_against = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tournament_phase_group", "team_participation")
```

#### TournamentFinalStanding

```python
class TournamentFinalStanding(models.Model):
    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="final_standings"
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="final_standings"
    )
    position = models.PositiveIntegerField()
    matches_played = models.PositiveIntegerField(null=True, blank=True)
    wins = models.PositiveIntegerField(null=True, blank=True)
    draws = models.PositiveIntegerField(null=True, blank=True)
    losses = models.PositiveIntegerField(null=True, blank=True)
    points = models.IntegerField(null=True, blank=True)
    goals_for = models.PositiveIntegerField(null=True, blank=True)
    goals_against = models.PositiveIntegerField(null=True, blank=True)
    goal_difference = models.IntegerField(null=True, blank=True)
    qualification = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position"]
        unique_together = ("tournament_edition", "team_participation")
```

#### TournamentPrize

```python
class TournamentPrize(models.Model):
    class PrizeType(models.TextChoices):
        MONEY = "money", "Money"
        VOUCHER = "voucher", "Voucher"
        DINNER = "dinner", "Dinner"
        PHYSICAL_GIFT = "physical_gift", "Physical Gift"
        TROPHY = "trophy", "Trophy"
        OTHER = "other", "Other"

    class RecipientType(models.TextChoices):
        PLAYER = "player", "Player"
        TEAM = "team", "Team"
        COACH = "coach", "Coach"
        ALL_PARTICIPANTS = "all_participants", "All Participants"
        OTHER = "other", "Other"

    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="prizes"
    )
    player_award = models.ForeignKey(
        "players.PlayerAward",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes"
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes"
    )
    sponsor = models.ForeignKey(
        Sponsor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes"
    )
    prize_type = models.CharField(max_length=30, choices=PrizeType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    recipient_type = models.CharField(max_length=30, choices=RecipientType.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

### APP: `players`

#### TeamStatus

```python
class TeamStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Team statuses"
        ordering = ["order"]

    def __str__(self):
        return self.name
```

#### Team

```python
class Team(models.Model):
    name = models.CharField(max_length=150)
    short_name = models.CharField(max_length=50, blank=True)
    logo = models.ImageField(upload_to="teams/logos/", blank=True)
    city = models.CharField(max_length=100, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    shirt_top = models.CharField(max_length=50, blank=True)
    shirt_bottom = models.CharField(max_length=50, blank=True)
    social_links = models.JSONField(null=True, blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_teams"
    )
    sponsors = models.ManyToManyField("tournaments.Sponsor", blank=True)
    notes = models.TextField(blank=True)
    status = models.ForeignKey(
        TeamStatus,
        on_delete=models.PROTECT,
        related_name="teams"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### TeamParticipation

```python
class TeamParticipation(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="participations"
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        related_name="team_participations"
    )
    participation_name = models.CharField(max_length=150)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_participations"
    )
    sponsors = models.ManyToManyField("tournaments.Sponsor", blank=True)
    payment_status = models.BooleanField(default=False)
    status = models.ForeignKey(
        TeamStatus,
        on_delete=models.PROTECT,
        related_name="participations"
    )
    registered_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("team", "tournament_edition")

    def __str__(self):
        return self.participation_name
```

#### PlayerStatus

```python
class PlayerStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Player statuses"
        ordering = ["order"]

    def __str__(self):
        return self.name
```

#### Player

```python
class Player(models.Model):
    person = models.OneToOneField(
        "users.Person",
        on_delete=models.CASCADE,
        related_name="player"
    )
    position = models.CharField(max_length=10, blank=True)
    preferred_jersey_number = models.PositiveIntegerField(null=True, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.PositiveIntegerField(null=True, blank=True)
    dominant_foot = models.CharField(max_length=10, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(upload_to="players/photos/", blank=True)
    biography = models.TextField(blank=True)
    social_links = models.JSONField(null=True, blank=True)
    status = models.ForeignKey(
        PlayerStatus,
        on_delete=models.PROTECT,
        related_name="players"
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.person)
```

#### TeamParticipationPlayer

```python
class TeamParticipationPlayer(models.Model):
    team_participation = models.ForeignKey(
        TeamParticipation,
        on_delete=models.CASCADE,
        related_name="players"
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="participations"
    )
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    position = models.CharField(max_length=10, blank=True)
    is_captain = models.BooleanField(default=False)
    is_vice_captain = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    status = models.ForeignKey(
        PlayerStatus,
        on_delete=models.PROTECT,
        related_name="participation_players"
    )
    goals = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)
    yellow_cards = models.PositiveIntegerField(default=0)
    red_cards = models.PositiveIntegerField(default=0)
    minutes_played = models.PositiveIntegerField(default=0)
    matches_played = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("team_participation", "player")
```

#### Award

```python
class Award(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

#### PlayerAward

```python
class PlayerAward(models.Model):
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="awards"
    )
    award = models.ForeignKey(
        Award,
        on_delete=models.PROTECT,
        related_name="player_awards"
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        related_name="player_awards"
    )
    team_participation = models.ForeignKey(
        TeamParticipation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="player_awards"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

### APP: `matches`

#### MatchStatus

```python
class MatchStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Match statuses"
        ordering = ["order"]

    def __str__(self):
        return self.name
```

#### Match

```python
class Match(models.Model):
    tournament_phase = models.ForeignKey(
        "tournaments.TournamentPhase",
        on_delete=models.CASCADE,
        related_name="matches"
    )
    tournament_phase_group = models.ForeignKey(
        "tournaments.TournamentPhaseGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches"
    )
    home_team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_matches"
    )
    away_team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="away_matches"
    )
    match_number = models.PositiveIntegerField(null=True, blank=True)
    match_date = models.DateTimeField(null=True, blank=True)
    status = models.ForeignKey(
        MatchStatus,
        on_delete=models.PROTECT,
        related_name="matches"
    )
    home_score = models.PositiveIntegerField(null=True, blank=True)
    away_score = models.PositiveIntegerField(null=True, blank=True)
    halftime_home_score = models.PositiveIntegerField(null=True, blank=True)
    halftime_away_score = models.PositiveIntegerField(null=True, blank=True)
    extra_time_home_score = models.PositiveIntegerField(null=True, blank=True)
    extra_time_away_score = models.PositiveIntegerField(null=True, blank=True)
    home_score_penalties = models.PositiveIntegerField(null=True, blank=True)
    away_score_penalties = models.PositiveIntegerField(null=True, blank=True)
    is_extra_time = models.BooleanField(default=False)
    is_penalties = models.BooleanField(default=False)
    is_walkover = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    attendance = models.PositiveIntegerField(null=True, blank=True)
    referee = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refereed_matches"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### EventType

```python
class EventType(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name
```

#### MatchEvent

```python
class MatchEvent(models.Model):
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="events"
    )
    event_type = models.ForeignKey(
        EventType,
        on_delete=models.PROTECT,
        related_name="events"
    )
    minute = models.PositiveIntegerField()
    extra_minute = models.PositiveIntegerField(null=True, blank=True)
    half = models.CharField(max_length=20)
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="events"
    )
    player = models.ForeignKey(
        "players.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events"
    )
    related_player = models.ForeignKey(
        "players.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_events"
    )
    goal_type = models.CharField(max_length=30, blank=True)
    body_part = models.CharField(max_length=20, blank=True)
    is_penalty = models.BooleanField(default=False)
    is_own_goal = models.BooleanField(default=False)
    is_var_decision = models.BooleanField(default=False)
    var_result = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    score_home_at_event = models.PositiveIntegerField(null=True, blank=True)
    score_away_at_event = models.PositiveIntegerField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_events"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["minute", "extra_minute", "id"]
```

---

## 3. Phase 2.3 – Migrations & Admin

### 3.1 Migrations

After models are written:

```bash
python manage.py makemigrations
python manage.py migrate
```

Do this **incrementally** if possible (after each app or logical group).  
Do not write all models and migrate only at the very end if you can avoid it.

### 3.2 Basic Admin registration

Register every important model in `admin.py`.

Minimum useful admin:

```python
from django.contrib import admin
from .models import Team, TeamParticipation

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "status", "is_active")
    list_filter = ("status",)
    search_fields = ("name", "short_name", "city")


@admin.register(TeamParticipation)
class TeamParticipationAdmin(admin.ModelAdmin):
    list_display = ("participation_name", "tournament_edition", "status", "payment_status")
    list_filter = ("status", "payment_status", "tournament_edition")
    search_fields = ("participation_name",)
```

Do the same style for the other main models.

### 3.3 Protecting status data

In admin for status models you can additionally:

- Disable delete permission for normal staff
- Or override `has_delete_permission`

Example:

```python
def has_delete_permission(self, request, obj=None):
    return request.user.is_superuser
```

---

## 4. Definition of Done (Phase 2 complete)

Phase 2 is finished when:

- [ ] All models from this document are implemented
- [ ] Correct `on_delete` is used (especially `PROTECT` on statuses)
- [ ] All status/type tables have `code` field
- [ ] Migrations run without errors
- [ ] Main models are registered in Django admin
- [ ] You can manually create the full flow in admin:
  Tournament → Edition → Teams → Participations → Phases → Groups → Matches

---

## 5. What comes next

After this phase is done, we move to:

**Phase 3 – Serializers, ViewSets and API structure**

---

**End of document**


