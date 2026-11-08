-- Auto Import Queue: mass video-URL import for the owner dashboard (/pemilik → Impor).
-- Jobs persist here so the queue survives a server restart; the in-process worker
-- (src/lib/import-queue/worker.ts) claims pending rows and processes them one by one.

create table if not exists import_batches (
  id text primary key,
  status text not null default 'queued', -- queued | running | paused | cancelled | done
  category text,
  require_review boolean not null default false,
  total_urls integer not null default 0,
  valid_urls integer not null default 0,
  invalid_urls integer not null default 0,
  duplicate_urls integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  note text
);

create table if not exists import_jobs (
  id text primary key,
  batch_id text not null references import_batches (id) on delete cascade,
  position integer not null default 0,
  url text not null,
  dedupe_key text,
  parsed jsonb,
  status text not null default 'pending', -- pending | processing | done | failed | duplicate | review | cancelled
  stage text,
  progress integer not null default 0,
  title text,
  video_id text,
  error text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists import_jobs_batch_idx on import_jobs (batch_id, position);
create index if not exists import_jobs_status_idx on import_jobs (status, next_attempt_at);
create index if not exists import_batches_created_idx on import_batches (created_at desc);
