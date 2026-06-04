create table public.waves_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wash_day integer not null default 0,
  last_haircut_date date not null default '2026-05-30',
  haircut_interval_weeks integer not null default 2,
  morning_duration_mins integer not null default 15,
  afternoon_duration_mins integer not null default 20,
  evening_duration_mins integer not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waves_settings enable row level security;

create policy "Users can manage their own waves settings"
  on public.waves_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.waves_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_type text not null check (session_type in ('morning', 'afternoon', 'evening', 'wash')),
  brushing_seconds integer not null default 0,
  session_date date not null default current_date,
  completed_at timestamptz not null default now()
);

create index waves_sessions_user_date on public.waves_sessions (user_id, session_date desc);

alter table public.waves_sessions enable row level security;

create policy "Users can manage their own waves sessions"
  on public.waves_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
