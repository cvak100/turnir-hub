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

# Phase 8 – Design System (Notepad / Scorekeeper Style)


---

## 1. Design goal

The visual identity of the application should feel like:

- a paper notepad
- a handwritten match records book
- a 1990s scorekeeper desk
- analog, human, slightly imperfect

It must **not** feel like a modern clean SaaS dashboard.

The user should feel:
> “This looks like someone is writing results by hand on paper.”

---

## 2. Core atmosphere

### Desired feeling
- paper
- pencil
- notebook
- slight messiness
- warmth
- old tournament table energy

### Not desired
- flat Material Design
- perfect geometric borders
- neon gradients
- glassmorphism
- corporate blue dashboard look
- overly polished startup UI

---

## 3. Color palette

### Background
- Main background: pale warm yellow / notepad paper
  - primary suggestion: `#fff8dc`
  - alternative soft tones: `#fffbe6`, `#f9e79f` for header/footer blocks

### Text
- Main text: near-black / dark gray
  - suggestion: `#333333`

### Accent colors
- Dark blue: interactive states, hover, active links
- Red: warnings, important markers, cards, alerts
- Black: main outlines and sketch lines

### Usage rules
- Blue = interaction
- Red = importance / danger / strong marker
- Black = structure and handwriting lines
- Yellow paper = base surface

---

## 4. Typography

### Primary font direction
Handwritten / sketchy font family.

Preferred direction:
- `Architects Daughter`
- alternatives: `Indie Flower`, `Rock Salt` (use carefully)

### Rules
- body text should remain readable
- do not use extremely wild fonts for long tables
- headings can be more expressive
- font weight mostly normal to medium
- avoid perfect geometric sans-serif as the main identity

---

## 5. Lines, borders and shapes

This is the heart of the design.

### Lines must not be perfectly straight
Borders and underlines should look:
- hand-drawn
- slightly corrected
- double-traced
- imperfect

### Implementation approach
Use SVG stroke paths for:
- box borders
- underlines
- separators
- header/footer dividers

### Motion / posture
Slight rotations are allowed and desired:
- `-0.8deg`
- `-0.5deg`
- `0.4deg` on hover

This creates a paper-like, human feel.

---

## 6. Component guidelines

### 6.1 Buttons
- transparent or paper-like background
- sketchy border
- bold text
- slight rotation
- hover changes border/stroke to blue
- no heavy shadows, no rounded corporate pills

### 6.2 Links
- look underlined by hand
- no default perfect browser underline only
- hover can tilt slightly and turn blue

### 6.3 Inputs
- no heavy boxed modern input style as default
- prefer underline-style inputs with sketchy bottom line
- focus state can change underline to blue

### 6.4 Cards / boxes
- paper surface feeling
- sketchy outer border
- optional subtle alternative border variants
- should feel like clipped notes or paper sections

### 6.5 Tables
- avoid hard perfect grid lines
- use sketchy separators between rows
- header can have stronger hand-drawn bottom line
- hover row may change separator color to blue
- content remains readable and centered where useful

### 6.6 Navigation
- links should feel stamped/hand-marked
- sketchy borders around nav items are welcome
- active/hover state uses blue stroke
- mobile navigation can collapse, but must keep the same analog language

---

## 7. Layout guidelines

### General
- content should breathe
- do not overcrowd
- paper sections should feel intentional
- page can feel like a notebook spread, not an admin CRM

### Header / Footer
- soft yellow paper blocks
- sketchy divider lines on edges
- simple, functional, analog

### Content width
- readable max width for forms and tables
- wide enough for match data
- not full-bleed ultra-wide modern dashboard

---

## 8. Live match screen direction

Even without final visuals yet, live pages should feel like:

- a live score sheet
- handwritten event timeline
- paper table for score and events

Suggestions:
- current score large and clear
- events listed like notes in a match protocol
- temporary/unknown player labels should feel natural in this style
  - e.g. `Neznani #9`

---

## 9. Interaction style

### Hover
- small physical reaction
- slight rotate
- stroke color change to blue

### Active / Focus
- clear but still analog
- blue sketch line preferred over neon outline

### Disabled
- lower contrast
- still paper-like
- never look like modern gray Material disabled buttons

---

## 10. Design tokens (practical starting point)

```text
--color-paper: #fff8dc;
--color-paper-strong: #f9e79f;
--color-ink: #333333;
--color-ink-soft: #555555;
--color-accent-blue: #0000ff; /* or a darker practical blue */
--color-accent-red: #c1121f;
--color-line: #000000;
--radius-none-preferred: 0 to very small
--shadow-minimal: rare, paper-like only
```

Note:
Exact blue/red values can be refined later, but hierarchy stays the same.

---

## 11. Do / Don’t

### Do
- use paper yellow backgrounds
- use handwritten fonts carefully
- use imperfect SVG borders
- use slight rotation
- keep the scorekeeper notebook mood

### Don’t
- introduce clean Bootstrap-looking cards as the main style
- use perfect 1px gray grids everywhere
- use gradient buttons
- use overly modern icon packs that break the analog mood
- make it look like a fintech dashboard

---

## 12. Implementation notes for frontend

1. Create reusable classes/components:
   - `sketchy-box`
   - `sketchy-btn`
   - `sketchy-input`
   - `sketchy-link`
   - `sketchy-table`

2. Keep SVG border variants limited:
   - 2 to 4 stroke variants are enough

3. Accessibility still matters:
   - contrast must remain readable
   - handwritten font must not destroy table readability

4. Mobile:
   - keep sketch style
   - simplify spacing
   - preserve underlines/borders language

---

## 13. Reference direction from existing CSS

The previous design already contains the correct DNA:
- `#fff8dc` paper background
- `Architects Daughter`
- SVG sketch borders
- hover to blue stroke
- slight rotations
- handwritten underlines

Phase 8 should formalize and systematize that style across the whole app.

---

## 14. Definition of Done (Phase 8)

This phase is complete when:

- [ ] color palette is defined and applied
- [ ] handwritten/sketch typography is chosen
- [ ] shared sketchy components exist
- [ ] buttons/links/inputs/tables follow the same language
- [ ] live pages fit the notepad mood
- [ ] the app no longer looks like a generic admin template
- [ ] style remains readable on desktop and mobile

---

## 15. Final design sentence

**Build a digital tournament notebook, not a digital dashboard.**

---

**End of Phase 8 document**

# Phase 6.6 – Generators & Automation Helpers

---

## 1. Goal of this phase

This phase builds practical automation tools that:

- speed up development
- reduce repetitive manual setup
- help organizers prepare tournaments faster
- make testing of live and preparation flows realistic

These tools are not the core domain itself.  
They are **supporting engines** around the domain.

By the end of this phase, a developer or organizer should be able to:

1. generate a full demo tournament in seconds
2. draw teams into groups
3. generate group-stage matches
4. generate knockout structures
5. recalculate scores/stats safely
6. optionally advance qualified teams into the next phase

---

## 2. Why this phase matters

Without generators, development becomes painful:

- create tournament manually
- create edition manually
- create 12 teams manually
- register them manually
- create players manually
- create groups manually
- create 20+ matches manually

That is too slow.

With generators:
- one command prepares a realistic environment
- frontend and live features can be tested immediately
- business rules can be verified on non-trivial data

---

## 3. Design principles

### 3.1 Generators must be explicit
Never silently destroy important data.

Bad:
- delete all matches and recreate without warning

Good:
- require flags like `--force`
- show what will be created
- prefer additive generation

### 3.2 Generators must use services
Do not put generation logic only inside management commands.

Structure:
- `management/commands/...` = CLI entry
- `services/generators/...` = real logic

This allows reuse from admin actions or API later.

### 3.3 Generators must respect domain rules
They must not bypass:
- unique team participation per edition
- unique player assignment per edition
- phase/group consistency
- same-edition constraints for matches

### 3.4 Generators should be deterministic when needed
Support an optional `--seed` value for random operations.

This helps reproducible testing.

### 3.5 Output must be readable
Every command should print a clear summary:

```text
Created:
- Tournament: Poletni turnir Demo
- Edition: 2026
- Teams: 12
- Players: 144
- Groups: 3
- Matches: 18
```

---

## 4. Recommended folder structure

```text
apps/
├── core/
│   └── management/commands/
│       ├── seed_all.py
│       ├── generate_demo_tournament.py
│       └── recalculate_edition.py
├── tournaments/
│   └── services/
│       └── generators/
│           ├── demo.py
│           ├── draw.py
│           ├── fixtures.py
│           ├── knockout.py
│           └── advancement.py
└── matches/
    └── services/
        └── recalculation.py
```

---

## 5. Generator 1 – Demo Tournament Generator

### 5.1 Purpose
Create a complete realistic tournament setup for development and demos.

### 5.2 What it should create

Minimum:
- 1 Tournament
- 1 TournamentEdition
- N teams
- team participations
- players per team
- 1 group stage phase
- groups
- group assignments
- group matches
- optional some live events

### 5.3 Suggested CLI

```bash
python manage.py generate_demo_tournament
python manage.py generate_demo_tournament --teams 12 --players-per-team 12
python manage.py generate_demo_tournament --teams 8 --with-events
python manage.py generate_demo_tournament --name "Demo Cup" --year 2026 --seed 42
```

### 5.4 Suggested arguments

| Argument | Meaning | Default |
|----------|---------|---------|
| `--name` | Tournament name | `Demo Tournament` |
| `--year` | Edition year | current year |
| `--teams` | number of teams | `8` |
| `--players-per-team` | players per team | `11` |
| `--groups` | number of groups | auto |
| `--with-events` | also generate some match events | `False` |
| `--seed` | random seed | none |
| `--force` | allow recreation logic if needed | `False` |

### 5.5 Internal creation order

1. Ensure base seeds exist (statuses, event types)
2. Create Tournament
3. Create TournamentEdition
4. Create Teams
5. Create TeamParticipations
6. Create Persons + Players
7. Assign players to participations
8. Create Group Stage phase
9. Create groups
10. Draw teams into groups
11. Generate group matches
12. Optionally generate events for first few matches

### 5.6 Business rules inside demo generator

- all teams get unique names (`FC Demo 01`...)
- participation names can equal team names
- players get jersey numbers 1..N
- one captain per team
- matches get status `scheduled`
- if `--with-events` is used:
  - set some matches to `finished` or `live`
  - create goals/cards with valid players
  - recalculate scores/stats

### 5.7 Why this is the highest priority
It unblocks almost all later development and manual QA.

---

## 6. Generator 2 – Draw Teams into Groups

### 6.1 Purpose
Automatically assign registered teams into groups for a phase.

### 6.2 Typical situation
Organizer has:
- edition with 12 approved team participations
- phase `Group Stage`
- groups A/B/C created

Now teams need to be drawn into groups.

### 6.3 Suggested CLI / service entry

```bash
python manage.py draw_groups --edition 8 --phase 3
python manage.py draw_groups --edition 8 --phase 3 --seed 42
python manage.py draw_groups --edition 8 --phase 3 --force
```

### 6.4 Inputs
- edition
- phase
- optional list of team participation IDs
- optional random seed
- force flag

### 6.5 Algorithm (simple first version)

1. Load all eligible team participations for edition
2. Load all groups in phase ordered by `order`
3. Validate counts:
   - if group `max_teams` exists, respect it
   - if not enough capacity, fail clearly
4. Shuffle teams deterministically if seed provided
5. Distribute teams round-robin into groups:
   - team1 → group A
   - team2 → group B
   - team3 → group C
   - team4 → group A
   - ...
6. Create `TournamentPhaseGroupTeam` rows

### 6.6 Validation rules

- phase must belong to edition
- phase type should normally be `GROUP_STAGE`
- do not draw same team twice into same phase
- if groups already have teams:
  - either abort
  - or require `--force` to rebuild assignments

### 6.7 Output example

```text
Draw completed for phase: Group Stage
Group A: FC Alfa, FC Delta, FC Omega
Group B: FC Beta, FC Epsilon, FC Sigma
Group C: FC Gama, FC Zeta, FC Nova
```

### 6.8 Future improvement
Support seeded pots:
- Pot 1 strong teams
- Pot 2 medium
- Pot 3 weaker

Not required in first version.

---

## 7. Generator 3 – Group Fixture Generator

### 7.1 Purpose
Generate round-robin matches inside groups.

### 7.2 Typical situation
Groups are filled with teams.  
Now create all scheduled matches.

### 7.3 Suggested CLI

```bash
python manage.py generate_group_fixtures --phase 3
python manage.py generate_group_fixtures --group 11
python manage.py generate_group_fixtures --phase 3 --double-round
python manage.py generate_group_fixtures --phase 3 --force
```

### 7.4 Algorithm for one group

For teams `[T1, T2, T3, T4]`:

Single round-robin pairs:
- T1 vs T2
- T1 vs T3
- T1 vs T4
- T2 vs T3
- T2 vs T4
- T3 vs T4

If `--double-round`:
- also generate reverse fixtures

### 7.5 Match creation rules

Each generated match:
- `tournament_phase` = parent phase
- `tournament_phase_group` = current group
- `home_team_participation` / `away_team_participation` set
- `status` = scheduled
- scores empty
- optional sequential `match_number`

### 7.6 Validation rules

- group must have at least 2 teams
- all teams must belong to same edition
- if matches already exist for group:
  - abort by default
  - recreate only with `--force`

### 7.7 Practical notes

Home/away assignment:
- first version can be arbitrary but stable
- later can balance home/away counts

Date assignment:
- first version can leave `match_date` empty
- later support auto-scheduling by day slots

---

## 8. Generator 4 – Knockout Bracket Generator

### 8.1 Purpose
Create knockout phases and matches from a list of qualified teams.

### 8.2 Supported first version
- pure power-of-two brackets:
  - 2 teams → Final
  - 4 teams → Semi + Final
  - 8 teams → Quarter + Semi + Final
  - 16 teams → Round of 16 + ...

If team count is not power of two:
- fail with clear message in v1
- later support byes

### 8.3 Suggested CLI

```bash
python manage.py generate_knockout --edition 8 --team-ids 1,2,3,4,5,6,7,8
python manage.py generate_knockout --edition 8 --from-phase 3 --advance-per-group 2
python manage.py generate_knockout --edition 8 --include-third-place
```

### 8.4 Creation order

1. Resolve qualified teams
2. Validate count
3. Create phases:
   - Quarterfinals / Semifinals / Final
   - optional Third Place
4. Create matches with empty or prefilled pairs
5. Set order of phases correctly

### 8.5 Pairing strategies

#### A. Simple sequential
1 vs 2, 3 vs 4, ...

#### B. Standard cross pairing from groups
If coming from groups:
- A1 vs B2
- B1 vs A2
- C1 vs D2
- D1 vs C2

First version can support:
1. manual team list pairing
2. basic group-based cross pairing

### 8.6 Placeholder matches
In early bracket generation, later-round matches may have unknown teams.

Options:
1. create only current round matches
2. create full bracket with nullable teams for future rounds

Recommended v1:
- create only the first playable knockout round
- create later rounds when previous round finishes  
or
- create full structure with nullable teams if your Match model allows it

Your current Match model allows nullable teams, so full bracket draft is possible.

---

## 9. Generator 5 – Advancement Helper

### 9.1 Purpose
Take finished group standings and propose/create the next knockout round.

### 9.2 Typical situation
Group stage is finished.  
Top 2 from each group should advance.

### 9.3 Suggested CLI

```bash
python manage.py advance_from_groups --phase 3 --advance-per-group 2
python manage.py advance_from_groups --phase 3 --advance-per-group 2 --create-knockout
```

### 9.4 Logic

1. Load all groups in phase
2. For each group, sort `TournamentPhaseGroupTeam` by:
   - points
   - goal difference
   - goals for
   - (optional) head-to-head later
3. Take top N teams
4. Return qualified list
5. Optionally call knockout generator

### 9.5 Important
Sorting rules must be explicit and documented.  
First version can use:

1. `points` DESC  
2. `goal_difference` DESC  
3. `goals_for` DESC  
4. `goals_against` ASC  
5. team name ASC as final stable tiebreaker

---

## 10. Recalculation Commands

### 10.1 Purpose
Repair derived data after bugs, manual DB edits, or event corrections.

### 10.2 Suggested commands

```bash
python manage.py recalculate_match --match 55
python manage.py recalculate_edition --edition 8
python manage.py recalculate_player_stats --edition 8
python manage.py recalculate_group_standings --phase 3
```

### 10.3 What each does

#### recalculate_match
- reload all MatchEvents for match
- recompute score fields
- optionally recompute related player stats for that match

#### recalculate_group_standings
- recompute played/wins/draws/losses/points/goals for group teams
- based on finished matches in that group

#### recalculate_edition
- run match score recalculation for all matches
- run player stats recalculation
- run group standings recalculation

### 10.4 Why these are mandatory for serious development
Because live systems drift if event edits are frequent.  
Recalculation is your safety net.

---

## 11. Service-level architecture

### Example service interfaces

```python
class DemoTournamentGenerator:
    def generate(self, *, name, year, teams_count, players_per_team, with_events, seed=None):
        ...


class GroupDrawService:
    def draw(self, *, phase, team_participations, seed=None, force=False):
        ...


class GroupFixtureGenerator:
    def generate_for_phase(self, *, phase, double_round=False, force=False):
        ...


class KnockoutGenerator:
    def generate(self, *, edition, teams, include_third_place=False):
        ...


class AdvancementService:
    def get_qualified_teams(self, *, phase, advance_per_group=2):
        ...
```

Commands should stay thin:

```python
def handle(self, *args, **options):
    result = GroupFixtureGenerator().generate_for_phase(...)
    self.stdout.write(self.style.SUCCESS(result.summary()))
```

---

## 12. Safety rules for all generators

Every generator must implement these safeguards:

1. **Scope checks**
   - all objects belong to same edition

2. **Existence checks**
   - required statuses/event types exist
   - fail with message to run seeds if missing

3. **Conflict checks**
   - existing matches/assignments block generation unless `--force`

4. **Transaction safety**
   - whole generation in `transaction.atomic()`

5. **Clear failure messages**
   - no stack-trace-only failures for expected business conflicts

---

## 13. Logging and audit

Generators should log:

- who ran the command (if available)
- edition/phase IDs
- number of created objects
- whether force mode was used

Example:
```text
INFO generate_group_fixtures phase_id=3 created_matches=12 force=False
```

For destructive rebuilds with `--force`, use WARNING level.

---

## 14. Testing strategy for generators

Minimum tests:

### Demo generator
- creates expected counts
- can run twice with different names without crash

### Draw
- distributes all teams
- respects capacity
- is reproducible with same seed

### Fixtures
- correct number of matches for N teams
- no duplicate pairings in single round-robin

### Knockout
- rejects non power-of-two in v1
- creates expected number of phases/matches

### Advancement
- selects top N by ranking rules

### Recalculation
- score after events is correct
- deleting event and recalculating restores correct state

---

## 15. Implementation order

Implement in this order:

1. `recalculate_match` basics  
2. `generate_demo_tournament` without events  
3. `draw_groups`  
4. `generate_group_fixtures`  
5. enhance demo generator to use draw + fixtures  
6. `generate_knockout`  
7. `advance_from_groups`  
8. demo generator with events  
9. edition-wide recalculation  

This order gives value quickly.

---

## 16. Practical development workflow after this phase

A normal development day should look like:

```bash
python manage.py seed_all
python manage.py generate_demo_tournament --teams 12 --with-events --seed 42
python manage.py runserver
```

Then frontend/live testing starts immediately on realistic data.

---

## 17. Definition of Done (Phase 6.6)

This phase is complete when:

- [ ] Demo tournament generator works
- [ ] Teams can be drawn into groups by command/service
- [ ] Group fixtures can be generated automatically
- [ ] Knockout structure can be generated for power-of-two brackets
- [ ] Advancement helper can select top teams from groups
- [ ] Recalculation commands can repair derived data
- [ ] All generators are transactional and safe by default
- [ ] `--force` is required for destructive regeneration
- [ ] Commands print clear summaries
- [ ] Basic tests cover pairing counts and draw reproducibility
- [ ] Demo data is good enough for frontend and live testing

---

## 18. What comes after this phase

After generators are ready, development becomes much faster and the next practical step is real implementation execution:

1. implement backend phases in order
2. use generators daily during development
3. then integrate frontend against realistic data

Optional later upgrades:
- UI buttons that call these generators
- fair draw pots
- bye support in knockout
- calendar-aware match scheduling

---

**End of Phase 6.6 document**

# Final note

This master document is the implementation roadmap.

Always implement phase by phase.  
Do not skip preparation and permissions quality just to reach live features faster.

A strong foundation is more important than early visual progress.

---

**End of master document**
