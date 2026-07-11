# Relay

Relay is an async AI task agent platform that keeps HTTP intake, background execution, and result delivery decoupled. The web layer validates a request, writes a queued job, enqueues a workflow, and returns a job ID immediately; all provider calls, retries, logging, and delivery run in replaceable worker code.

## Why This Shape

Long-running LLM work should not block a request handler. Relay uses three layers: a thin Next.js API, a durable job store, and Render Workflows tasks. The dashboard exists to make that architecture visible: queue position, status events, attempts, cost, provider usage, and delivery state are all first-class data.

## Stack

- Next.js 14 App Router with TypeScript strict for API routes and dashboard UI.
- Render Workflows for production task execution; a fake in-process worker runs locally.
- Render Postgres schema in `migrations/001_initial.sql`.
- Server-Sent Events backed locally by an event bus, with Postgres `LISTEN/NOTIFY` or Redis intended for production scaling.
- Groq is the default LLM provider. OpenAI, Anthropic, and mock providers share the same interface.
- Zod validates every recipe input and output.

## Quickstart

```bash
npm install
npm run dev
npm run worker
```

Open `http://localhost:3000`. Local API submissions enqueue work in process so the fake worker can stand in for Render Workflows without cloud infrastructure.

## Environment

Copy `.env.example` to `.env.local` and set:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `WEBHOOK_SIGNING_SECRET`
- optional `REDIS_URL`
- optional `OPENAI_API_KEY`
- optional `ANTHROPIC_API_KEY`
- optional `SEARCH_API_KEY`
- optional `EMAIL_PROVIDER_KEY`

## Assumptions

- Local development may use the mock LLM/search providers when API keys are unset.
- The Postgres schema is complete, but this first implementation uses the in-memory repository for local demos and tests.
- Render preview environments can provision separate web, worker, and database services when enabled in Render.
- Email delivery is feature-flagged until a provider key is present.

## Scripts

- `npm run dev`: Next.js dashboard and API.
- `npm run worker`: local fake worker registration.
- `npm run test`: Vitest unit and integration tests.
- `npm run test:e2e`: Playwright dashboard path.
- `npm run build`: production build.
- `npm run migrate`: apply SQL migrations to `DATABASE_URL`.

## Next Steps

- Replace the in-memory repository with the Postgres query adapter for production.
- Add chained recipes.
- Add scheduled recurring jobs.
- Add a CLI client.
- Add a Slack app front-end.
- Add per-tenant billing exports.
