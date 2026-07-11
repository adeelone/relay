# Requirements Audit

Source: `C:\Users\adeem\Downloads\relay-codex-prompt.md`

Test baseline: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm audit --omit=dev`.

## Summary

- PASS: 30
- PARTIAL: 17
- FAIL: 13

This repo is a working local prototype with a real Next.js dashboard, API routes, recipe modules, provider interfaces, migrations, tests, and GitHub/Render scaffolding. It is not yet the full production Render Workflows + Render Postgres product described by the source requirements.

## Phase 1 Findings

- PASS: No TODO/FIXME placeholders or obvious AI-marker comments were found in source files.
- PASS: README tone is now more explicit about prototype boundaries and no longer implies production Render Workflows/Postgres are fully wired.
- PASS: The code has concise function names and no broad section-divider comments.

## Phase 2 Detail

| Requirement                                                                                 | Status  | Evidence                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thin `POST /api/jobs` validates recipe input and returns job URLs without awaiting LLM work | PASS    | `app/api/jobs/route.ts`, `lib/jobs/service.ts` validate with Zod, create a job ID, emit queued event, and schedule `runRecipeJob` with `setTimeout`.                      |
| `POST /api/jobs` writes queued row to Postgres                                              | FAIL    | Local implementation writes to `memoryDb`; SQL schema exists but query adapter is not wired.                                                                              |
| `POST /api/jobs` enqueues Render Workflow task                                              | FAIL    | `workflows/index.ts` exposes a registration boundary, but no Render SDK task enqueue is implemented.                                                                      |
| `GET /api/jobs/:jobId` status snapshot                                                      | PASS    | `app/api/jobs/[jobId]/route.ts` returns job, events, and attempts.                                                                                                        |
| `GET /api/jobs/:jobId/stream` SSE status/chunk stream                                       | PARTIAL | SSE route streams stored and live in-process events; no Postgres `LISTEN/NOTIFY` or Redis backend.                                                                        |
| `GET /api/jobs` paginated/filterable list                                                   | PASS    | `app/api/jobs/route.ts` supports recipe/status/date filters plus page/pageSize and caller scoping.                                                                        |
| Cancel endpoint                                                                             | PASS    | Endpoint marks cancelled and `workflows/runRecipe.ts` checks cancellation before and during recipe execution events.                                                      |
| Retry endpoint                                                                              | PASS    | Failed jobs are re-queued with the same input.                                                                                                                            |
| Rate limiting per API key/IP with `429` and `Retry-After`                                   | PASS    | `lib/rate-limit/token-bucket.ts` and `lib/jobs/service.ts`.                                                                                                               |
| Idempotency key dedupe                                                                      | PASS    | `memoryDb.resolveIdempotency` and `saveIdempotency`.                                                                                                                      |
| Five recipe modules                                                                         | PASS    | `recipes/*/index.ts` and `recipes/registry.ts`.                                                                                                                           |
| Recipe contract with schemas, cost estimate, run, streaming flag                            | PASS    | `recipes/types.ts`; every registered recipe implements it.                                                                                                                |
| New recipe requires one file plus registry entry                                            | PASS    | Registry pattern supports this; documented in `RECIPES.md`.                                                                                                               |
| Task Planner output                                                                         | PASS    | `recipes/task-planner/index.ts`.                                                                                                                                          |
| Meeting Notes output                                                                        | PASS    | `recipes/meeting-notes/index.ts`.                                                                                                                                         |
| Research Digest with search provider abstraction                                            | PARTIAL | `SearchProvider` abstraction and mock provider exist; no free-tier live search provider is implemented.                                                                   |
| Code Review output                                                                          | PASS    | `recipes/code-review/index.ts`.                                                                                                                                           |
| Inbox Triage output                                                                         | PASS    | `recipes/inbox-triage/index.ts`.                                                                                                                                          |
| Render Workflow `task()` per recipe                                                         | FAIL    | No actual `task()` wrapper from Render Workflows is present.                                                                                                              |
| Worker marks processing, records attempts/events, marks complete/failed                     | PASS    | `workflows/runRecipe.ts` and `lib/db/memory.ts`.                                                                                                                          |
| Worker retry policy governed by Render                                                      | FAIL    | Retry is implemented with local `setTimeout`, not Render retry policy.                                                                                                    |
| Per-recipe timeout and hard ceiling                                                         | FAIL    | No timeout budget is enforced.                                                                                                                                            |
| Worker files under `workflows/recipes/`                                                     | FAIL    | Recipes live under `recipes/`; workflow registration is centralized only.                                                                                                 |
| In-app delivery                                                                             | PARTIAL | Dashboard and seed data show in-app delivery status; no persistent unread inbox model.                                                                                    |
| Signed webhook delivery with retries                                                        | PASS    | `lib/delivery/index.ts` records in-app/email delivery state and retries signed webhooks up to three times in the local repository.                                        |
| Email delivery feature flag                                                                 | PARTIAL | Email status is feature-flagged, but no Resend/SES sender is implemented.                                                                                                 |
| Per-job delivery preferences                                                                | PASS    | `delivery` is accepted and stored on jobs.                                                                                                                                |
| Per-key delivery defaults                                                                   | PARTIAL | API key response has a default field; no persisted per-key settings.                                                                                                      |
| Submit dashboard with recipe picker and cost estimate                                       | PARTIAL | Picker and estimate exist; dynamic schema-generated form is represented as JSON sample input, not generated controls.                                                     |
| Live-updating job view                                                                      | PASS    | `components/dashboard-shell.tsx` submits jobs through `/api/jobs`, opens an `EventSource`, and updates timeline/output/status from SSE events.                            |
| Job detail timeline with durations, output, metrics, debug panel, retry/cancel              | PARTIAL | Timeline/output/metrics are shown; debug panel and real retry/cancel actions are not wired in the UI.                                                                     |
| Jobs list sortable/filterable with bulk retry/cancel                                        | PARTIAL | Table and buttons exist; sorting/filtering/bulk actions are not functional.                                                                                               |
| Queue health panel                                                                          | PASS    | Dashboard shows queued/processing/retrying counts, latency sparkline, error rate, and heartbeat.                                                                          |
| API keys dashboard                                                                          | PARTIAL | API key nav/API route exist; full create/revoke UI and usage graph are missing.                                                                                           |
| Settings dashboard                                                                          | FAIL    | Settings nav exists, but settings surface is not implemented.                                                                                                             |
| Persist queued/started/completed/attempts/tokens/cost/caller/redacted payloads              | PARTIAL | Types and in-memory fields exist; Postgres persistence and redaction model are missing.                                                                                   |
| Prometheus `/api/metrics` counters and histograms                                           | PASS    | `app/api/metrics/route.ts` exposes status counters, duration histogram buckets, token total, and cost total from the local repository.                                    |
| Structured JSON logs with `jobId` through layers                                            | PASS    | `lib/logging/logger.ts`, `lib/jobs/service.ts`, and `workflows/runRecipe.ts` emit JSON log lines for queue, attempt, retry, completion, cancellation, and failure events. |
| API-key auth and optional magic link                                                        | PARTIAL | Bearer key parsing/hash helper exists; dashboard magic link is not implemented.                                                                                           |
| Per-key scoping                                                                             | FAIL    | API routes do not scope list/status results by key.                                                                                                                       |
| Input sanitization and sanitized markdown output                                            | FAIL    | Zod validation exists; sanitization/markdown rendering policy is not implemented.                                                                                         |
| HMAC webhook docs/snippets                                                                  | PASS    | `WEBHOOKS.md` and `lib/delivery/webhook.ts`.                                                                                                                              |
| Secrets only in env vars                                                                    | PASS    | Provider secrets are read from env and not returned.                                                                                                                      |
| `POST /api/jobs` p95 under 200ms                                                            | PARTIAL | Code path is non-blocking, but no performance test measures p95.                                                                                                          |
| Realtime scales via Redis or Postgres pub/sub                                               | FAIL    | Local EventEmitter only.                                                                                                                                                  |
| Provider circuit breaker/degraded banner                                                    | FAIL    | Provider selection exists; no circuit breaker or degraded queue banner.                                                                                                   |
| Idempotent worker steps prevent double delivery/charge                                      | PARTIAL | Idempotent submission exists; webhook delivery and cost idempotency are not persisted.                                                                                    |
| Lighthouse targets                                                                          | FAIL    | No Lighthouse config or run is present.                                                                                                                                   |
| Next.js 14 + strict TypeScript                                                              | PASS    | `package.json`, `tsconfig.json`.                                                                                                                                          |
| Postgres migration tables                                                                   | PASS    | `migrations/001_initial.sql`.                                                                                                                                             |
| LLM providers Groq/OpenAI/Anthropic/mock                                                    | PASS    | `lib/llm/*`.                                                                                                                                                              |
| Tailwind/Radix/Framer Motion styling stack                                                  | PARTIAL | Tailwind and Radix/Framer deps are present; Radix/Framer are not meaningfully used.                                                                                       |
| Vitest + RTL + Playwright + MSW                                                             | PARTIAL | Vitest and Playwright exist; RTL setup exists; MSW is installed but not used.                                                                                             |
| `render.yaml` web/worker/db/env vars                                                        | PASS    | `render.yaml`.                                                                                                                                                            |
| Required documentation files                                                                | PASS    | README, architecture, recipes, webhooks, observability, security docs exist.                                                                                              |
| Tooling scripts, ESLint, Prettier, Husky, lint-staged                                       | PASS    | `package.json`, `.eslintrc.json`, `.husky/pre-commit`.                                                                                                                    |
| GitHub Actions and release drafter                                                          | PASS    | `.github/workflows/*`, `.github/release-drafter.yml`; PR #14 has green CI/E2E checks for the fixes.                                                                       |
| GitHub repo private, topics, issues/discussions, release, starter issues                    | PASS    | Verified through GitHub CLI in the previous publish pass.                                                                                                                 |

## Blocking Items Before This Can Be Marked Clean

1. Replace `memoryDb` with a Postgres-backed repository used by API routes, SSE, worker, and delivery.
2. Wire actual Render Workflows task registration/enqueue/retry semantics.
3. Implement production realtime through Postgres `LISTEN/NOTIFY` or Redis.
4. Add per-key auth scoping, dashboard auth, and output sanitization.
5. Finish dashboard controls for filtering, bulk retry/cancel, debug panels, API-key management, and settings.
6. Add Lighthouse and broader integration/E2E coverage.
