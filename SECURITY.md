# Security

## API Keys

API keys are hashed with SHA-256 before storage. Programmatic calls use `Authorization: Bearer <key>`. A key can only see its own jobs unless it has an admin role.

## Secrets

Secrets belong in environment variables or Render secret env vars:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `WEBHOOK_SIGNING_SECRET`
- provider-specific keys

Never log or return secret values from API responses.

## Webhooks

Webhook payloads are signed with HMAC-SHA256. Rotate the signing secret by accepting both the previous and current secret during the transition window.

## Reporting

Open a private security advisory or email the maintainer listed in the repository profile.
