-- Site analytics for the public portfolio.
--
-- site_click_events: one row per tracked click on the public site. Vercel Web
-- Analytics custom events need the Pro plan, so clicks are recorded here
-- instead. Written only by app/api/public/track-click (service role) and read
-- only by the owner-gated analytics API (service role), so RLS is enabled with
-- no policies: anon/authenticated clients can neither read nor write.
create table public.site_click_events (
  id bigint generated always as identity primary key,
  target text not null,
  path text not null,
  country text,
  created_at timestamptz not null default now()
);

create index site_click_events_created_at_idx on public.site_click_events (created_at desc);

alter table public.site_click_events enable row level security;

-- site_traffic_daily: nightly snapshot of Vercel Web Analytics for each Eastern
-- calendar day, so history survives past Vercel's ~30-day query window.
create table public.site_traffic_daily (
  day date primary key,
  page_views integer not null default 0,
  visitors integer not null default 0,
  top_pages jsonb not null default '[]',
  top_referrers jsonb not null default '[]',
  countries jsonb not null default '[]',
  devices jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.site_traffic_daily enable row level security;

-- Click totals per target since an instant. Aggregated in the database so a
-- long range isn't truncated by PostgREST's 1000-row response cap. Executable
-- only by the service role (the owner-gated analytics API).
create function public.site_click_counts(since timestamptz)
returns table (target text, clicks bigint)
language sql
stable
set search_path = ''
as $$
  select target, count(*) as clicks
  from public.site_click_events
  where created_at >= since
  group by target
  order by clicks desc
$$;

revoke execute on function public.site_click_counts(timestamptz) from public, anon, authenticated;
grant execute on function public.site_click_counts(timestamptz) to service_role;
