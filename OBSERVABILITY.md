# Observability

## Metrics

`/api/metrics` exposes Prometheus text metrics:

- `jobs_queued_total`
- `jobs_completed_total`
- `jobs_failed_total`
- `job_duration_seconds`
- `tokens_total`
- `cost_usd_total`

## Logs

Every structured log should include:

- `jobId`
- `recipe`
- `status`
- `attempt`
- `provider`
- `durationMs`
- `promptTokens`
- `completionTokens`
- `costUsd`
- `deliveryTarget`

Thread `jobId` through HTTP intake, workflow execution, provider calls, and delivery.
