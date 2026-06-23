-- Health Dashboard: device-agnostic metric time series, ingest debug log,
-- and the customizable IVEN dashboard layout.

-- 1. health_metrics --------------------------------------------------------
-- One row per metric data point. metric_type/unit are normalized but open —
-- any of Health Auto Export's 100+ metrics lands here, mapped or passthrough.
create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  metric_type text not null,
  value numeric not null,
  unit text,
  source_device text,
  source_app text,
  raw_payload jsonb,
  -- Idempotent re-push: Health Auto Export may resend overlapping windows.
  unique (user_id, metric_type, recorded_at)
);

create index health_metrics_user_type_time
  on public.health_metrics (user_id, metric_type, recorded_at desc);
create index health_metrics_user_time
  on public.health_metrics (user_id, recorded_at desc);

alter table public.health_metrics enable row level security;

create policy "Users can manage their own health metrics"
  on public.health_metrics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. health_ingest_log -----------------------------------------------------
create table public.health_ingest_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  received_at timestamptz not null default now(),
  source text,
  record_count integer,
  status text,
  error text,
  raw_payload jsonb
);

create index health_ingest_log_user_received
  on public.health_ingest_log (user_id, received_at desc);

alter table public.health_ingest_log enable row level security;

create policy "Users can manage their own health ingest log"
  on public.health_ingest_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. dashboard_layouts -----------------------------------------------------
-- Persists the react-grid-layout config + enabled-widget set for the IVEN home.
create table public.dashboard_layouts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_layouts enable row level security;

create policy "Users can manage their own dashboard layout"
  on public.dashboard_layouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
