-- Aggregates a metric into one row per day in the DB, so the app never pulls
-- raw rows (avoids the 1000-row PostgREST cap and is fast over years of data).
-- agg: 'sum' | 'avg' | 'last'. since_days null = all history. SECURITY INVOKER
-- (default) so RLS scopes rows to the calling user.
create or replace function public.daily_health_series(
  p_metric_type text,
  p_agg text,
  p_since_days integer default null
)
returns table (day date, value numeric)
language sql
stable
set search_path = public
as $$
  with filtered as (
    select recorded_at, value
    from public.health_metrics
    where metric_type = p_metric_type
      and (p_since_days is null
           or recorded_at >= (now() - make_interval(days => p_since_days)))
  ),
  daily as (
    select
      (recorded_at at time zone 'UTC')::date as day,
      sum(value) as sum_v,
      avg(value) as avg_v,
      (array_agg(value order by recorded_at desc))[1] as last_v
    from filtered
    group by 1
  )
  select
    day,
    round(
      case p_agg
        when 'sum' then sum_v
        when 'last' then last_v
        else avg_v
      end, 2
    ) as value
  from daily
  order by day
$$;
