# turnir-hub frontend

Vite + React + TypeScript client for the turnir-hub API.

**Status:** work in progress.

## Prerequisites

- Node.js 20+ recommended
- Backend running (default API: `http://localhost:8000/api/v1`, WebSocket: `ws://localhost:8000/ws`)

## Setup

```bash
cd frontend
npm install
copy .env.example .env   # Windows (optional)
# cp .env.example .env   # macOS / Linux
```

## Run

```bash
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Vite proxies `/api` and `/ws` to the backend (see `vite.config.ts`).

## Build

```bash
npm run build
npm run preview
```

## Notes

- All HTTP calls go through `src/shared/api` and module services — UI never calls `fetch` directly.
- Auth tokens are stored in `localStorage` as `th_access` / `th_refresh`.
- Live match page uses REST for initial load and WebSocket for updates.
