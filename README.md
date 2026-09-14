# Relay

Relay is an async AI task agent platform prototype that keeps HTTP intake, background execution, and result delivery separate. The web layer validates a request, records a queued job, schedules worker code, and returns a job ID immediately; provider calls, retries, event logging, and delivery live outside the request handler.

## Why This Shape

Long-running LLM work should not block a request handler. Relay uses three layers: a thin Next.js API, a job/event store, and worker code behind a workflow boundary. The dashboard exists to make that architecture visible: queue position, status events, attempts, cost, provider usage, and delivery state are first-class data.

## Stack

- Next.js 16 App Router (React 19) with TypeScript strict for API routes and dashboard UI.
- Render blueprint with a real, independent worker: `npm run worker` polls Postgres for
  queued/retrying jobs (`SELECT ... FOR UPDATE SKIP LOCKED`) when `DATABASE_URL` is set and
  reachable. Without a reachable Postgres instance, the web process executes jobs inline
  instead, since a separate process can't see another process's in-memory store.
- Postgres schema in `migrations/*.sql`, applied in order and tracked in `schema_migrations`.
  Falls back to an in-memory repository automatically if `DATABASE_URL` is unset or the
  database is unreachable — the app never hard-fails on a missing database.
- Server-Sent Events backed by Redis pub/sub when `REDIS_URL` is set and reachable, falling
  back to a local in-process event bus otherwise (same resilient pattern as the database).
- Groq is the default LLM provider. OpenAI, Anthropic, and mock providers share the same interface.
- Zod validates every recipe input and output.

## Quickstart

```bash
npm install
npm run dev
npm run worker
```

Open `http://localhost:3000`. Without `DATABASE_URL` configured, the web process executes
jobs inline and `npm run worker` is a no-op (nothing to poll). With a reachable Postgres
instance, the worker is a real, separate process — job execution genuinely happens outside
the request handler, matching the architecture this project describes.

## Environment

Copy `.env.example` to `.env.local` and set:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `WEBHOOK_SIGNING_SECRET`
- optional `REDIS_URL`
- optional `OPENAI_API_KEY`
- optional `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
  `ANTHROPIC_INPUT_COST_PER_MILLION`, and
  `ANTHROPIC_OUTPUT_COST_PER_MILLION`
- optional `SEARCH_API_KEY`
- optional `EMAIL_PROVIDER_KEY`

## Assumptions

- Local development may use the mock LLM/search providers when API keys are unset.
- Postgres and Redis are both optional at runtime: unset or unreachable, the app falls back
  to in-memory storage and a local event bus respectively, logging a warning either way.
- Render preview environments can provision separate web, worker, and database services when enabled in Render.
- Email delivery is feature-flagged until a provider key is present.
- `POST /api/keys` issues a real key persisted (hashed) to the `api_keys` table; a recognized
  bearer token resolves to its issued id and role via `getCallerFromRequest`. An unrecognized
  bearer token still works exactly as before — scoped by the hash of whatever was sent — so
  existing callers aren't broken by this; they just don't get a role or a stable issued-key id.

## Scripts

- `npm run dev`: Next.js dashboard and API.
- `npm run worker`: independent job worker — polls Postgres when reachable, otherwise a no-op
  (the web process runs jobs inline in that case).
- `npm run test`: Vitest unit and integration tests (Node environment; no component tests exist).
- `npm run test:e2e`: Playwright dashboard path.
- `npm run build`: production build.
- `npm run migrate`: apply all `migrations/*.sql` files in order, tracked in `schema_migrations`.

## Next Steps

- Dashboard UI for API key management (issue/list/revoke) — the API and persistence exist;
  the "API Keys" nav item is still a placeholder.
- Add chained recipes.
- Add scheduled recurring jobs.
- Add a CLI client.
- Add a Slack app front-end.
- Add per-tenant billing exports.
