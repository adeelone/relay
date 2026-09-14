-- 001_initial.sql modeled api_key_id as a UUID FK into api_keys, but the app
-- scopes callers by the SHA-256 hash of their bearer token (lib/auth/api-keys.ts)
-- and never inserts rows into api_keys. Store the opaque hash directly instead.
alter table jobs drop constraint if exists jobs_api_key_id_fkey;
alter table jobs alter column api_key_id type text using api_key_id::text;

-- webhook_deliveries only modeled webhook-type deliveries (url not null, no
-- target column), but the app also records in-app and email deliveries,
-- which have no URL. Add target and relax url to nullable.
alter table webhook_deliveries
  add column if not exists target text not null default 'webhook';
alter table webhook_deliveries alter column url drop not null;

create index if not exists jobs_api_key_id_idx on jobs(api_key_id);
