-- Returns the distinct metric_types the calling user has data for, computed in
-- the DB so it isn't subject to the PostgREST 1000-row response cap. RLS still
-- applies because it's SECURITY INVOKER (default), so each user sees only theirs.
create or replace function public.distinct_health_metric_types()
returns table (metric_type text)
language sql
stable
set search_path = public
as $$
  select distinct metric_type
  from public.health_metrics
  order by metric_type
$$;
