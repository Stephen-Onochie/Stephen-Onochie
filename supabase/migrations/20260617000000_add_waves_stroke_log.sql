alter table public.waves_sessions
  add column if not exists stroke_log jsonb;
