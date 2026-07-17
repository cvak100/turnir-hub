# Turnir-Hub – Full Development Plan

**Project:** turnir-hub  
**Stack:** Django + Django REST Framework + Node.js frontend  
**Document type:** Master technical plan  
**Audience:** Developer (including future self)

---

# Overview

This document contains the complete development plan for the tournament management platform.

It includes:

- Phase 1 – Project Setup & Structure
- Phase 2 – Domain Models
- Phase 3 – Serializers, ViewSets & API
- Phase 4 – Advanced Permissions & Roles
- Phase 5 – Preparation API
- Phase 6 – Live Features & Real-time

---

# Phase 1 – Project Setup & Structure

## Goal
Create a clean, scalable foundation for backend and frontend.

## Backend structure
```text
backend/
├── apps/
│   ├── users/
│   ├── tournaments/
│   ├── matches/
│   ├── players/
│   └── core/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── manage.py
└── requirements/
```

## Frontend structure
```text
frontend/
├── src/
│   ├── modules/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── styles/
└── package.json
```

## Key rules
- Backend and frontend are separated
- Environment variables are mandatory
- No business logic in frontend
- Modular structure from day one

## Definition of Done
- Django starts successfully
- Frontend starts successfully
- Folder structure is in place
- Settings are split
- `.env` is used

---

# Phase 2 – Domain Models

## Goal
Implement the full database model in a maintainable way.

## Core design decisions

### Person vs Player
- `Person` = human identity
- `Player` = football-specific extension of Person

### Team vs TeamParticipation
- `Team` = long-lived club identity
- `TeamParticipation` = team appearance inside a specific TournamentEdition

### Tournament vs TournamentEdition
- `Tournament` = long-term competition
- `TournamentEdition` = concrete year/instance

### Status tables
Every status/type table must have:
- `name`
- `code`
- `color`
- `order`
- `is_active`

`code` is used in business logic.

### on_delete strategy
- Status/type FK → `PROTECT`
- Optional human relations → `SET_NULL`
- Strong parent-child → `CASCADE`

## Main model groups
- users: Person, PersonStatus, Role, Permission, UserRole, RolePermission
- tournaments: Tournament, TournamentEdition, Phase, Group, FinalStanding, Prize, Template, Sport, Sponsor
- players: Team, TeamParticipation, Player, TeamParticipationPlayer, Award, PlayerAward
- matches: Match, MatchStatus, EventType, MatchEvent

## Definition of Done
- All models implemented
- Migrations work
- Admin registration exists
- Full preparation flow can be created manually in admin

---

# Phase 3 – Serializers, ViewSets & API

## Goal
Expose models through a clean REST API.

## Principles
- Thin views
- Fat services
- Consistent response format
- JWT authentication
- URL prefix: `/api/v1/`

## Serializer strategy
For each entity:
- ListSerializer
- DetailSerializer
- CreateUpdateSerializer

## Service layer
Business logic belongs in services, not views.

Example:
```python
TournamentEditionService.create_edition(data=..., user=...)
```

## Auth
- JWT access + refresh tokens
- Authorization header: `Bearer <token>`

## Definition of Done
- JWT works
- Tournament + Edition API works
- Services are used
- Responses are consistent

---

# Phase 4 – Advanced Permissions & Roles

## Goal
Build a flexible permission system.

## Core idea
- Permission = single action (`match.result.edit`)
- Role = group of permissions
- UserRole = user + role + optional TournamentEdition scope

## Global vs scoped roles
- Global role → `tournament_edition = null`
- Scoped role → valid only for one edition

## Central service
`PermissionService.user_has_permission(user, permission_code, tournament_edition=None)`

## DRF permission classes
- `HasPermission`
- `HasTournamentPermission` (object-level)

## Definition of Done
- Global and scoped roles work
- 403 is returned when permission is missing
- At least one object-level permission is implemented

---

# Phase 5 – Preparation API

## Goal
Implement full tournament preparation through API.

## Preparation flow
1. Create Tournament
2. Create TournamentEdition
3. Create Teams
4. Register teams (`TeamParticipation`)
5. Create Players
6. Assign players to participations
7. Create Phases
8. Create Groups
9. Assign teams to groups
10. Create Matches

## Critical business rules
- Team cannot be registered twice in same edition
- Player cannot be assigned to two teams in same edition
- Phase order unique within edition
- Group name unique within phase
- Match teams must belong to same edition

## Modules
- tournaments
- editions
- teams
- team-participations
- players
- team-participation-players
- phases
- groups
- group-teams
- matches

## Definition of Done
- Full tournament can be prepared through API only
- Business rules enforced in services
- Permissions connected

---

# Phase 6 – Live Features & Real-time

## 1. Goal

Build a reliable live match system where:

- editors can enter match events during a game
- unknown players can be entered temporarily
- scores and statistics are recalculated from events
- all clients receive live updates in real time

This phase is one of the most important parts of the system.

---

## 2. Core principles

### 2.1 MatchEvent is the source of truth
Match score and statistics must be derived from events.

Do not treat manually typed score fields as primary truth.

### 2.2 Recalculation over fragile increments
Prefer recalculation methods:

- `recalculate_match_score(match)`
- `recalculate_player_stats(...)`
- `recalculate_group_standings(...)`

This makes edit/delete of events safe.

### 2.3 Temporary players are first-class
During a live match it is common that the exact player is not known yet.

The system must support temporary/anonymous player labels and later correction.

### 2.4 Clear match lifecycle
Match statuses:
- `scheduled`
- `live`
- `finished`
- `postponed`
- `cancelled`

Normal event entry is allowed mainly while match is `live`.

---

## 3. Required model change

### MatchEvent additions

Add these fields:

```python
is_temporary_player = models.BooleanField(default=False)
temporary_player_label = models.CharField(max_length=100, blank=True)
```

### Meaning
- `player = null`
- `is_temporary_player = True`
- `temporary_player_label = "Neznani #9"`

Later the event can be updated with the real player.

---

## 4. Live process flow

### 4.1 Start match
1. Match status changes to `live`
2. Frontend opens live view
3. WebSocket subscription starts for this match

### 4.2 Add event
Editor submits event:
- event type
- minute / extra minute
- half
- team
- player or temporary label
- related player if needed

### 4.3 Backend processing order
1. Validate permission
2. Validate match is editable
3. Save `MatchEvent`
4. Recalculate match score
5. Recalculate affected player stats
6. Recalculate group standings if needed
7. Broadcast WebSocket update

### 4.4 Correct temporary player later
1. Open existing event
2. Assign real player
3. Set `is_temporary_player = False`
4. Clear or keep label
5. Recalculate stats
6. Broadcast update

### 4.5 Finish match
1. Status → `finished`
2. Final recalculation
3. Lock normal event editing
4. Broadcast final state

---

## 5. MatchEventService responsibilities

This service is the heart of Phase 6.

Suggested methods:

```python
class MatchEventService:
    create_event(...)
    update_event(...)
    delete_event(...)
    recalculate_match_score(match)
    recalculate_player_stats(...)
    recalculate_group_standings(...)
    finish_match(match)
```

### create_event logic
- validate match status
- validate teams/players belong to match edition
- allow temporary player mode
- save event
- run recalculations
- broadcast

### update_event logic
- allow correction of player, minute, type, etc.
- recalculate everything affected
- broadcast

### delete_event logic
- delete event
- recalculate
- broadcast

---

## 6. Score calculation rules

Score is derived from events of types such as:
- goal
- own_goal
- penalty_scored

Rules:
- normal goal → +1 to event team
- own goal → +1 to opposing team
- penalty scored → +1 to event team
- penalty missed → no goal

Halftime and extra-time scores can also be derived from event half markers if needed.

---

## 7. Statistics calculation rules

### Player stats affected by events
- goal → goals + 1
- assist → assists + 1
- yellow_card → yellow_cards + 1
- red_card / second_yellow → red_cards + 1

### Group standings affected by finished or live match state
Depending on product decision:
- either update continuously during live
- or only when match is finished

Recommended start:
- update score live
- update standings when match is finished

This is simpler and less error-prone.

---

## 8. WebSocket design

### Channel
Each match has a channel:
```text
match.<match_id>
```

### Broadcast payload example
```json
{
  "type": "match.update",
  "match_id": 55,
  "score": {
    "home": 2,
    "away": 1
  },
  "status": "live",
  "event": {
    "id": 901,
    "event_type": "goal",
    "minute": 67,
    "extra_minute": null,
    "team_participation_id": 12,
    "player_id": 44,
    "is_temporary_player": false,
    "temporary_player_label": "",
    "related_player_id": 18
  }
}
```

### Client behavior
- subscribe on entering live page
- unsubscribe on leave
- apply event and score immediately
- optionally refetch full timeline if needed

---

## 9. Permissions for live phase

Recommended codes:
- `match.live.manage`
- `match.event.add`
- `match.event.edit`
- `match.event.delete`
- `match.finish`

Only authorized editors/admins can mutate live data.

Public users can only read/subscribe.

---

## 10. Validation rules

Important validations:
- match must be `live` for normal event entry
- event team must be one of the two match teams
- real player must belong to that team participation in this edition
- temporary player requires label
- cannot add events to finished match without special permission
- minute must be realistic relative to half

---

## 11. Error recovery and consistency

Because events can be edited/deleted:
- always recalculate from all events of the match
- do not depend only on incremental +1 / -1 logic
- keep recalculation functions idempotent

This is critical for long-term reliability.

---

## 12. Recommended implementation order

1. Add temporary player fields to MatchEvent
2. Implement MatchEvent create/update/delete API
3. Implement score recalculation
4. Implement player stats recalculation
5. Implement finish match action
6. Add WebSocket consumer + broadcast
7. Protect endpoints with permissions
8. Test correction of temporary players

---

## 13. Practical scenario

1. Match starts (`live`)
2. Goal in minute 12 by unknown player `#9`
3. System stores temporary event and score becomes 1:0
4. Live viewers see update immediately
5. Later editor assigns real player to that event
6. System recalculates player goals
7. Another event: yellow card in minute 40
8. Near end: second goal
9. Editor finishes match
10. Standings recalculated
11. Match locked

---

## 14. Definition of Done (Phase 6)

Phase 6 is complete when:

- [ ] Temporary/anonymous players are supported
- [ ] MatchEvent create/update/delete works
- [ ] Match score is recalculated from events
- [ ] Player stats are recalculated from events
- [ ] Finished match can be locked
- [ ] WebSocket broadcasts live updates
- [ ] Permissions protect live editing
- [ ] Correcting a temporary player works safely
- [ ] Deleting an event recalculates correctly

---

## 15. What comes after Phase 6

Next natural phases:

- Phase 7 – Frontend (Node.js) integration
- Phase 8 – Public live pages + UX polish
- Phase 9 – Chat / forum
- Phase 10 – Betting (later)

---

# Phase 6.5 – API Hardening, Seeds, Errors & Logging

---

## 1. Goal of this phase

This phase hardens the backend before frontend development.

By the end of this phase the API must be:

- predictable
- secure in access control
- consistent in errors
- properly logged
- seeded with required base data
- documented
- ready for frontend integration

This is not a feature phase.  
This is a quality and stability phase.

---

## 2. Scope

### Included
- Seed data strategy
- Public vs authenticated vs role-protected endpoints
- Media upload setup
- Pagination + filtering standard
- Global exception handling
- Advanced logging standard
- Swagger / OpenAPI setup
- Optional match generator
- Health endpoint
- Definition of Done

### Not included
- Frontend implementation
- Chat
- Betting
- Advanced analytics dashboards

---

## 3. Seed Data Strategy

### 3.1 Why seeds are mandatory

Without seeds the system is unusable in practice because these are required:

- statuses
- event types
- roles
- permissions
- template values

If these are missing, frontend and admin flows break immediately.

### 3.2 What must be seeded

#### A. Status tables
- PersonStatus
- TournamentStatus
- TeamStatus
- PlayerStatus
- MatchStatus

#### B. Event types
- goal
- own_goal
- assist
- yellow_card
- red_card
- second_yellow
- substitution_in
- substitution_out
- penalty_scored
- penalty_missed
- injury
- var
- other

#### C. Roles
- super_admin
- tournament_admin
- editor
- team_manager
- viewer

#### D. Permissions
Minimum useful set:
- tournament.view / create / edit
- edition.view / create / edit / manage
- team.manage
- player.manage
- phase.manage
- match.manage
- match.event.add / edit / delete
- match.finish

#### E. Template values
All enum-like values discussed earlier:
- phase types
- halves
- goal types
- body parts
- prize types
- positions
- dominant foot
- global settings defaults

### 3.3 Seed implementation rules

1. Seeds must be **idempotent**
   - running them twice must not duplicate data
   - use `update_or_create` by `code`

2. Seeds must never wipe existing production data

3. Separate seed commands by domain if needed:
   - `seed_statuses`
   - `seed_event_types`
   - `seed_roles_permissions`
   - `seed_templates`

4. One master command can call all:
   - `python manage.py seed_all`

### 3.4 Example pattern

```python
obj, created = PlayerStatus.objects.update_or_create(
    code="active",
    defaults={
        "name": "Active",
        "color": "#22c55e",
        "order": 1,
        "is_active": True,
    }
)
```

### 3.5 Important
Status records must remain protected by `on_delete=PROTECT`.  
Seeds create them. Business code should almost never delete them.

---

## 4. Public vs Authenticated vs Role-protected endpoints

### 4.1 Access levels

We define 3 access levels:

| Level | Who | Example |
|-------|-----|---------|
| **Public** | Anyone | list public tournaments, view public edition, live score read |
| **Authenticated** | Logged-in user | user profile, private registration data |
| **Role-protected** | User with permission/role | create edition, edit match event, finish match |

### 4.2 Recommended default policy

- Read endpoints for public tournament data → Public or Authenticated depending on product decision
- Write endpoints → Authenticated + permission
- Live mutation endpoints → strict role permission
- Admin-like endpoints → admin / superuser

### 4.3 Suggested public endpoints

Public (or public-read):
- `GET /api/v1/tournaments/`
- `GET /api/v1/tournaments/{id}/`
- `GET /api/v1/editions/`
- `GET /api/v1/editions/{id}/`
- `GET /api/v1/matches/`
- `GET /api/v1/matches/{id}/`
- `GET /api/v1/matches/{id}/events/`

### 4.4 Suggested protected endpoints

Authenticated + permission:
- create/update tournament
- create/update edition
- register team
- assign player
- manage phases/groups
- create matches
- add/edit/delete match events
- finish match

### 4.5 Implementation approach

Do not hardcode this randomly in each view.

Use:
- default DRF permission classes
- custom permission classes from Phase 4
- explicit `get_permissions()` where action-specific control is needed

Example policy mindset:
```text
SAFE_METHODS (GET/HEAD/OPTIONS)
  → AllowAny or IsAuthenticated
WRITE METHODS
  → HasPermission / HasTournamentPermission
```

---

## 5. Media Upload Setup

### 5.1 Fields already existing
- Tournament.logo
- TournamentEdition.cover_image
- Team.logo
- Player.photo
- Sponsor.logo

### 5.2 Development setup

In settings:
```python
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

In development URLs, serve media files.

### 5.3 Rules
- validate file type (images only)
- validate max size
- use structured upload paths:
  - `tournaments/logos/`
  - `tournaments/covers/`
  - `teams/logos/`
  - `players/photos/`
  - `sponsors/`

### 5.4 API behavior
- upload can be part of create/update serializers
- or dedicated upload endpoints later if needed

### 5.5 Production note
Later move to S3-compatible storage.  
Do not couple business logic to local filesystem assumptions.

---

## 6. Pagination + Filtering Standard

### 6.1 Pagination

Use one global standard.

Recommended:
```python
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}
```

Optional custom pagination class allowing:
- `page`
- `page_size` (with max limit, e.g. 100)

Response shape:
```json
{
  "count": 135,
  "next": "http://.../api/v1/matches/?page=3",
  "previous": "http://.../api/v1/matches/?page=1",
  "results": []
}
```

### 6.2 Filtering standard

Use `django-filter` where useful.

Common filters:
- `tournament`
- `tournament_edition`
- `status`
- `team`
- `phase`
- `match_date`
- `is_active`
- `search`

Examples:
```text
GET /api/v1/editions/?tournament=2
GET /api/v1/team-participations/?tournament_edition=8&status=approved
GET /api/v1/matches/?tournament_phase=4&status=live
GET /api/v1/players/?search=novak
```

### 6.3 Ordering
Support consistent ordering params:
```text
?ordering=name
?ordering=-created_at
```

---

## 7. Global Exception Handling (Advanced)

This is critical.

### 7.1 Goal
Every API error should return a **consistent machine-readable structure**.

### 7.2 Standard error response format

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid input.",
    "details": {
      "start_date": ["This field is required."]
    },
    "request_id": "b6f3d2e0-9c3a-4d1e-9b0f-2df0c8a1a9aa"
  }
}
```

### 7.3 Error categories

| Code | Meaning |
|------|---------|
| `validation_error` | Serializer / input validation failed |
| `authentication_failed` | Auth missing/invalid |
| `permission_denied` | Authenticated but not allowed |
| `not_found` | Object does not exist |
| `conflict` | Business conflict (duplicate registration, etc.) |
| `invalid_state` | Action not allowed in current state (e.g. event on finished match) |
| `rate_limited` | Too many requests |
| `server_error` | Unexpected internal error |

### 7.4 Implementation approach

Create a central exception handler:

```python
REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}
```

### 7.5 Custom domain exceptions

Define explicit business exceptions in `core`:

```python
class DomainError(Exception):
    code = "domain_error"
    status_code = 400

    def __init__(self, message, details=None):
        self.message = message
        self.details = details or {}


class InvalidStateError(DomainError):
    code = "invalid_state"
    status_code = 409


class ConflictError(DomainError):
    code = "conflict"
    status_code = 409
```

Example usage in services:
```python
if match.status.code == "finished":
    raise InvalidStateError("Cannot add events to a finished match.")
```

### 7.6 Why this is advanced and useful
- frontend can branch on `error.code`
- logs can store structured codes
- support/debugging becomes much easier
- business errors are no longer random string messages only

### 7.7 Request ID
Every request should get a unique `request_id`.
Return it in error responses and write it into logs.

This makes production debugging realistic.

---

## 8. Logging Standard (Advanced)

You said you like logs. Good. We do this properly.

### 8.1 Goals
- reconstruct what happened
- debug production issues
- audit sensitive actions
- separate technical noise from business events

### 8.2 Log levels

| Level | Use for |
|-------|---------|
| DEBUG | Development details |
| INFO | Normal successful business flow |
| WARNING | Denied access, invalid state attempts, recoverable issues |
| ERROR | Unexpected failures |
| CRITICAL | System-level failure |

### 8.3 What must be logged

#### Always log
- authentication failures
- permission denials
- create/update/delete of critical objects
- match event create/update/delete
- match finish
- unhandled exceptions

#### Useful structured fields
- `request_id`
- `user_id`
- `path`
- `method`
- `status_code`
- `permission_code` (if relevant)
- `tournament_edition_id` (if relevant)
- `match_id` (if relevant)
- `duration_ms`

### 8.4 Suggested logger hierarchy

```text
turnir.api
turnir.auth
turnir.permissions
turnir.matches.live
turnir.services
turnir.security
```

### 8.5 Example log messages

INFO:
```text
match_event_created request_id=... user_id=12 match_id=55 event_type=goal minute=23
```

WARNING:
```text
permission_denied request_id=... user_id=12 permission=match.event.add match_id=55
```

ERROR:
```text
unhandled_exception request_id=... path=/api/v1/matches/55/events/ exception=ValueError(...)
```

### 8.6 Logging configuration principles

1. Use JSON logs in production if possible
2. Console logs in development
3. Never log secrets (tokens, passwords)
4. Be careful with personal data in logs
5. Correlate all logs with `request_id`

### 8.7 Middleware recommendation

Create middleware that:
- generates `request_id`
- attaches it to request
- logs request start/end
- measures duration

### 8.8 Audit-style logging for live operations

For live match operations keep explicit audit logs:
- who added event
- what changed
- old player vs new player on correction
- who finished match

This is extremely valuable later.

---

## 9. Swagger / OpenAPI Setup

### 9.1 Why
Frontend development becomes much faster if API is browsable and documented.

### 9.2 Recommended tool
`drf-spectacular`

### 9.3 What to expose
- all public and authenticated endpoints
- auth token endpoints
- schema with clear names and tags

### 9.4 Organization by tags
- Auth
- Tournaments
- Editions
- Teams
- Players
- Matches
- Live
- Admin/System

### 9.5 Rule
If an endpoint is not clear in Swagger, it is not finished.

---

## 10. Optional Match Generator

### 10.1 Purpose
Help organizers generate fixtures faster.

### 10.2 Scope for now
Keep this optional and simple.

Possible support:
- round-robin generation inside a group
- basic knockout pair generation later

### 10.3 Rules
- only for teams already assigned to a group/phase
- do not overwrite existing matches unless explicitly forced
- generated matches start as `scheduled`

### 10.4 Recommendation
Implement after core hardening is stable.  
Do not block Phase 6.5 on this.

---

## 11. Health Endpoint

Simple endpoint:

```text
GET /api/v1/health/
```

Response:
```json
{
  "status": "ok",
  "database": "ok",
  "timestamp": "2026-07-17T16:30:00Z"
}
```

Use for:
- uptime checks
- deployment verification
- monitoring

No auth required.

---

## 12. Recommended implementation order

1. Request ID middleware
2. Global exception handler + domain exceptions
3. Logging configuration
4. Seed commands
5. Public/protected endpoint review
6. Pagination + filtering standardization
7. Media setup
8. Swagger
9. Health endpoint
10. Optional match generator

---

## 13. Definition of Done (Phase 6.5)

This phase is complete when:

- [ ] All critical seed data can be loaded idempotently
- [ ] Status/EventType/Role/Permission seeds exist
- [ ] Public vs protected endpoint policy is explicit
- [ ] Media upload works in development
- [ ] Pagination and filtering are consistent
- [ ] All API errors use one global format
- [ ] Domain exceptions are used in services
- [ ] Request IDs exist in responses and logs
- [ ] Permission denials and critical actions are logged
- [ ] Live-sensitive actions have audit-style logs
- [ ] Swagger is available and usable
- [ ] Health endpoint works
- [ ] Backend is ready for serious frontend integration

---

## 14. What comes next

After Phase 6.5:

**Phase 7 – Frontend (Node.js) integration**

At that point the backend should already be stable enough that frontend work is not blocked by missing base infrastructure.

---

**End of Phase 6.5 document**

# Phase 7 – Frontend (Node.js) Integration

---

## 1. Goal of this phase

This phase connects the frontend to the already designed backend.

By the end of this phase we must have:

- a clean Node.js frontend project structure
- authentication flow with JWT
- API communication layer
- main application modules
- preparation screens connected to real API
- live match screen connected to REST + WebSocket
- clear separation between UI, state, and API logic

**Important:**  
Visual design system is intentionally out of scope in this phase.  
We focus on structure, data flow, and integration quality.

---

## 2. Frontend technology decision

Because the project requirement is **Node.js**, the frontend should stay in the Node ecosystem.

### Recommended practical setup
- **Node.js**
- **React** (with Vite)
- **React Router**
- **API client layer** (fetch or axios)
- **WebSocket client** for live matches

Why this setup:
- still pure Node.js ecosystem
- easier learning path than jumping into too many frameworks at once
- good long-term structure
- works cleanly with Django JWT + Channels

If later needed, the same architecture can be moved toward Next.js.  
For now, keep it straightforward.

---

## 3. Frontend project structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layout/
│   ├── modules/
│   │   ├── auth/
│   │   ├── tournaments/
│   │   ├── editions/
│   │   ├── teams/
│   │   ├── players/
│   │   ├── matches/
│   │   ├── live/
│   │   └── dashboard/
│   ├── shared/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   ├── styles/
│   ├── main.tsx
│   └── env.ts
├── public/
├── package.json
└── .env.example
```

### Why this structure
- `modules/` = business domains
- `shared/` = reusable infrastructure
- each module owns its pages, hooks, services, and local components
- avoids a messy `components/` dumping ground

---

## 4. Core frontend principles

### 4.1 UI does not talk to backend directly from random components
All backend communication goes through a dedicated API layer.

Bad:
```ts
// inside random component
fetch("http://localhost:8000/api/v1/editions/")
```

Good:
```ts
// component
const editions = await editionService.list()
```

### 4.2 Module services encapsulate endpoints
Each domain has its own service file.

Examples:
- `tournamentService`
- `editionService`
- `teamService`
- `matchService`
- `liveService`

### 4.3 Auth state is global
Login state, access token, refresh token, and current user permissions must live in one central auth layer.

### 4.4 Live state is special
Live match pages should not rely only on repeated REST polling.  
They must support WebSocket updates.

---

## 5. Environment and configuration

### `.env.example`
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
```

### Rules
- never hardcode API URLs in components
- all environment access goes through one config helper
- frontend never knows database details

---

## 6. Authentication flow

### 6.1 Login situation

1. User enters username + password
2. Frontend calls:
   ```text
   POST /api/v1/auth/token/
   ```
3. Backend returns:
   - `access`
   - `refresh`
4. Frontend stores tokens securely enough for web app context
5. Frontend fetches current user + roles/permissions
6. User is redirected into the app

### 6.2 Authenticated request situation

Every protected request sends:
```text
Authorization: Bearer <access_token>
```

### 6.3 Token expired situation

1. API returns 401
2. Frontend tries refresh:
   ```text
   POST /api/v1/auth/token/refresh/
   ```
3. If refresh succeeds:
   - store new access token
   - retry original request
4. If refresh fails:
   - logout
   - redirect to login

### 6.4 Permission-aware UI situation

After login, frontend should know:
- who the user is
- which roles they have
- which permissions they have
- whether roles are global or edition-scoped

This allows UI to:
- hide buttons the user cannot use
- prevent entering protected pages
- show editor tools only when allowed

Important:
Frontend permission checks are only UX.  
Backend remains the real security layer.

---

## 7. API client layer

### 7.1 Responsibilities
- attach auth header
- handle JSON
- normalize errors
- support refresh-token retry
- expose clean methods to services

### 7.2 Error handling on frontend

Backend will return structured errors from Phase 6.5:

```json
{
  "success": false,
  "error": {
    "code": "permission_denied",
    "message": "You do not have permission to perform this action.",
    "details": {}
  }
}
```

Frontend should map these into usable app errors:
- form validation errors
- toast/notification messages
- page-level access denied states

### 7.3 Suggested shared API helpers
- `api.get`
- `api.post`
- `api.patch`
- `api.put`
- `api.delete`

All module services use these helpers.

---

## 8. Application modules

## 8.1 Auth module

### Pages
- Login page
- Logout action
- Optional unauthorized page

### Responsibilities
- login form
- token storage
- current user loading
- auth guard for protected routes

### Situations
- invalid credentials
- expired session
- user opens protected page while logged out
- user logs out while working

---

## 8.2 Tournaments module

### Pages
- Tournament list
- Tournament detail
- Create/edit tournament

### Data
- public tournament info
- linked editions
- sport
- status/activity

### Situations
- browse all tournaments
- open one tournament and see its editions
- create a new long-lived tournament
- deactivate tournament instead of deleting it

---

## 8.3 Editions module

### Pages
- Edition detail
- Create/edit edition
- Edition preparation dashboard

### Why this module is important
Most real work happens on `TournamentEdition`, not on `Tournament`.

### Preparation dashboard should show
- basic edition info
- registered teams count
- phases created or not
- matches created or not
- current status

### Situations
- organizer opens edition and continues preparation
- edition is in registration phase
- edition is ready for live
- edition is finished and becomes read-only

---

## 8.4 Teams module

### Pages
- Team list
- Team detail
- Create/edit team
- Register team into edition

### Situations
- create a long-lived team once
- register same team into multiple editions over years
- change participation name only for one edition
- mark payment status for participation

### Important distinction in UI
Always make it clear whether user is editing:
- the base `Team`
- or the edition-specific `TeamParticipation`

This prevents organizer confusion.

---

## 8.5 Players module

### Pages
- Player list
- Player detail
- Create/edit player
- Assign player to team participation

### Situations
- create player linked to person data
- assign player to one team in a specific edition
- prevent assigning same player to two teams in same edition
- set jersey number and captain flag
- later show player stats from participation

---

## 8.6 Matches module

### Pages
- Match list by edition/phase/group
- Match detail
- Create/edit scheduled match

### Situations
- create group matches
- schedule date/time
- assign home/away teams
- open match detail before live starts
- transition match into live mode

---

## 8.7 Live module

This is the most important frontend module after preparation.

### Pages
- Live match view
- Optional live match list

### Live match view must support two modes

#### A. Viewer mode
- see score
- see event timeline
- see basic match info
- receive live updates

#### B. Editor mode
- all viewer capabilities
- add event
- edit event
- correct temporary player
- finish match

Editor tools appear only if user has permission.

---

## 9. Live frontend flow in detail

### 9.1 Entering live page

1. Frontend loads match detail via REST
2. Frontend loads existing events via REST
3. Frontend opens WebSocket for `match.<id>`
4. Page renders current score + timeline
5. From now on, updates come mostly through WebSocket

### 9.2 Receiving live update

When WebSocket message arrives:
1. validate payload
2. update local score state
3. append or update event in timeline
4. if needed, refresh minimal derived data

Do not fully reload the page.

### 9.3 Adding an event as editor

1. Editor fills event form
2. Frontend sends REST request to create event
3. Backend validates, saves, recalculates, broadcasts
4. All connected clients receive WebSocket update
5. Editor UI should also trust the broadcast/confirmed response

### 9.4 Temporary player situation

Editor does not know the scorer yet:
- selects team
- marks temporary player
- enters label such as `Neznani #9`
- saves event

Later:
- opens event edit
- assigns real player
- saves correction
- timeline and stats update after backend recalculation

### 9.5 Connection lost situation

Frontend should handle:
- WebSocket disconnect
- automatic reconnect
- optional REST resync after reconnect

This is important for real tournament usage.

---

## 10. Routing structure

Suggested route groups:

```text
/login

/tournaments
/tournaments/:id

/editions/:id
/editions/:id/teams
/editions/:id/players
/editions/:id/phases
/editions/:id/matches

/matches/:id
/live/matches/:id

/dashboard
```

### Route protection
- public routes: tournament browsing, maybe live viewer
- protected routes: preparation management, editor tools
- role-aware routes: only users with correct permission can open management screens

---

## 11. State management approach

Keep this simple at the beginning.

### Recommended
- local component state for small forms
- module-level hooks for data fetching
- global auth context/store
- local live page state for score + timeline

Do not introduce heavy global state management too early.

Useful later if needed:
- Zustand / Redux Toolkit / React Query

A strong first choice:
- React Query for REST data
- local state for live websocket page

---

## 12. UX situations that must be handled

Even without final visual design, these situations need clear behavior:

1. **Loading state**
   - list loading
   - detail loading
   - live connecting

2. **Empty state**
   - no teams registered yet
   - no matches created yet
   - no events yet

3. **Error state**
   - permission denied
   - validation error
   - network failure

4. **Read-only state**
   - finished edition
   - finished match

5. **Conflict state**
   - team already registered
   - player already assigned

Frontend should display backend error codes meaningfully.

---

## 13. Suggested implementation order

1. Project setup + routing + layout shell
2. Auth module
3. API client + error handling
4. Tournaments list/detail
5. Edition detail + preparation dashboard
6. Teams + team participation
7. Players + assignment
8. Phases/groups/matches read views
9. Match detail
10. Live viewer mode
11. Live editor mode
12. Temporary player correction flow
13. Reconnect/resync behavior

Do not start with live editor.  
First make preparation and read flows stable.

---

## 14. Definition of Done (Phase 7)

This phase is complete when:

- [ ] Frontend project structure is clean and modular
- [ ] Login/logout works with JWT
- [ ] Token refresh works
- [ ] API client is centralized
- [ ] Tournament and edition pages work on real API
- [ ] Teams can be registered into an edition through UI
- [ ] Players can be assigned through UI
- [ ] Matches can be listed and opened
- [ ] Live match viewer receives WebSocket updates
- [ ] Live editor can create events
- [ ] Temporary player flow works from UI
- [ ] Permission-based UI controls are visible
- [ ] Error states are handled consistently
- [ ] No business logic depends on final visual design

---

## 15. What intentionally comes later

- final visual design
- handwritten / notepad aesthetic
- advanced animations
- chat
- betting
- deep mobile optimization

Those are separate phases.

---

## 16. What comes after Phase 7

Possible next phases:

- Phase 8 – UI Design System + notepad aesthetic
- Phase 9 – Public live pages polish
- Phase 10 – Chat / mini-forum
- Phase 11 – Betting

---

**End of Phase 7 document**


# Final note

This master document is the implementation roadmap.

Always implement phase by phase.  
Do not skip preparation and permissions quality just to reach live features faster.

A strong foundation is more important than early visual progress.

---

**End of master document**
