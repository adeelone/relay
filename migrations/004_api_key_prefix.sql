-- api_keys.key_hash is a one-way SHA-256 hash (not human-checkable at a
-- glance), and the app never had a display-safe fragment to show issued keys
-- back to a user (e.g. "rly_AbCd..."). Store a short, non-secret prefix
-- captured at issuance time, alongside it.
alter table api_keys add column if not exists key_prefix text;
