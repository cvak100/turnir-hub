# turnir-hub frontend

Next.js application for the turnir-hub platform.

## Setup

```bash
npm install
copy .env.local.example .env.local   # Windows
# cp .env.local.example .env.local   # macOS / Linux
```

## Run

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Structure

| Path | Purpose |
|------|---------|
| `src/app` | App Router routes and layouts |
| `src/modules` | Feature modules (tournaments, matches, …) |
| `src/components` | Shared UI and layout components |
| `src/lib` | API client, auth helpers, utilities |
| `src/types` | Shared TypeScript types |
