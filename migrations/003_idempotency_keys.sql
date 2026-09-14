create table if not exists idempotency_keys (
  key text primary key,
  job_id text not null references jobs(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idempotency_keys_expires_idx on idempotency_keys(expires_at);
