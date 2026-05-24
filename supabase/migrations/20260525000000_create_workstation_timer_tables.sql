-- Workstation Standing Timer: settings, sessions, intervals, live state

create type public.workstation_mode as enum ('standing', 'sitting', 'break');
create type public.workstation_timer_status as enum ('idle', 'running', 'paused');
create type public.workstation_session_status as enum ('active', 'completed');

create table public.workstation_timer_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  standing_minutes integer not null default 20 check (standing_minutes between 1 and 180),
  sitting_minutes integer not null default 10 check (sitting_minutes between 1 and 180),
  break_minutes integer not null default 5 check (break_minutes between 1 and 60),
  sound_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.workstation_timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.workstation_session_status not null default 'active'
);

create index workstation_timer_sessions_user_id_idx
  on public.workstation_timer_sessions (user_id);
create index workstation_timer_sessions_started_at_idx
  on public.workstation_timer_sessions (started_at desc);

create table public.workstation_timer_intervals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workstation_timer_sessions (id) on delete cascade,
  mode public.workstation_mode not null,
  planned_seconds integer not null check (planned_seconds > 0),
  actual_seconds integer check (actual_seconds >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed boolean not null default false
);

create index workstation_timer_intervals_user_id_idx
  on public.workstation_timer_intervals (user_id);
create index workstation_timer_intervals_session_id_idx
  on public.workstation_timer_intervals (session_id);
create index workstation_timer_intervals_started_at_idx
  on public.workstation_timer_intervals (started_at desc);

create table public.workstation_timer_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id uuid references public.workstation_timer_sessions (id) on delete set null,
  current_mode public.workstation_mode not null default 'standing',
  cycle_index smallint not null default 0 check (cycle_index between 0 and 3),
  remaining_seconds integer not null default 1200 check (remaining_seconds >= 0),
  mode_started_at timestamptz,
  status public.workstation_timer_status not null default 'idle',
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.workstation_timer_settings enable row level security;
alter table public.workstation_timer_sessions enable row level security;
alter table public.workstation_timer_intervals enable row level security;
alter table public.workstation_timer_state enable row level security;

create policy "Users can select own timer settings"
  on public.workstation_timer_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own timer settings"
  on public.workstation_timer_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own timer settings"
  on public.workstation_timer_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can select own timer sessions"
  on public.workstation_timer_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own timer sessions"
  on public.workstation_timer_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own timer sessions"
  on public.workstation_timer_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can select own timer intervals"
  on public.workstation_timer_intervals for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own timer intervals"
  on public.workstation_timer_intervals for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own timer intervals"
  on public.workstation_timer_intervals for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can select own timer state"
  on public.workstation_timer_state for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own timer state"
  on public.workstation_timer_state for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own timer state"
  on public.workstation_timer_state for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.workstation_timer_state;
