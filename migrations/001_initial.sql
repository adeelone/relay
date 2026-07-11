create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  role text not null default 'user',
  rate_limit_per_minute integer not null default 30,
  delivery_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists jobs (
  id text primary key,
  recipe text not null,
  input jsonb not null,
  output jsonb,
  status text not null,
  delivery jsonb not null default '{"inApp": true}'::jsonb,
  api_key_id uuid references api_keys(id),
  idempotency_key text,
  cost_usd numeric(12, 6) not null default 0,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  attempts integer not null default 0,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  error text
);

create table if not exists job_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references jobs(id) on delete cascade,
  attempt integer not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  error text
);

create table if not exists job_events (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references jobs(id) on delete cascade,
  status text,
  message text not null,
  chunk text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references jobs(id) on delete cascade,
  url text not null,
  status text not null,
  attempt integer not null default 1,
  response_status integer,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists jobs_recipe_status_idx on jobs(recipe, status);
create index if not exists jobs_created_idx on jobs(queued_at desc);
create index if not exists job_events_job_created_idx on job_events(job_id, created_at);
