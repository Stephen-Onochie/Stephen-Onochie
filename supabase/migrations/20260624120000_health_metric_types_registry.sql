-- The metric search bar broke after the multi-year backfill: distinct_health_
-- metric_types() did SELECT DISTINCT over ~1.7M rows, which exceeds PostgREST's
-- statement timeout (instant at 3k rows, times out at 1.7M). The route swallowed
-- the error, returned an empty list, and the search dropdown never appeared.
--
-- Fix: maintain a tiny registry table (one row per user+metric_type) via an
-- insert trigger, and point the distinct-types function at it. List lookups now
-- scan ~dozens of rows instead of millions.

create table if not exists public.health_metric_types (
  user_id uuid not null references auth.users (id) on delete cascade,
  metric_type text not null,
  primary key (user_id, metric_type)
);

alter table public.health_metric_types enable row level security;

create policy "Users manage their own metric type registry"
  on public.health_metric_types
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Backfill from existing data (server-side, no PostgREST timeout).
insert into public.health_metric_types (user_id, metric_type)
select distinct user_id, metric_type from public.health_metrics
on conflict do nothing;

-- Register each (user_id, metric_type) on insert; cheap no-op once known.
create or replace function public.register_health_metric_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.health_metric_types (user_id, metric_type)
  values (new.user_id, new.metric_type)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_register_health_metric_type on public.health_metrics;
create trigger trg_register_health_metric_type
  after insert on public.health_metrics
  for each row execute function public.register_health_metric_type();

-- The trigger function only ever runs as a trigger; don't expose it over REST.
revoke execute on function public.register_health_metric_type() from anon, authenticated, public;

-- Point the distinct-types function at the small registry table.
create or replace function public.distinct_health_metric_types()
returns table (metric_type text)
language sql
stable
set search_path = public
as $$
  select metric_type from public.health_metric_types order by metric_type
$$;
