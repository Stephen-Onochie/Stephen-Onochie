create table public.fast_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cooldown_days integer not null default 14,
  target_duration_hrs integer not null default 48,
  fast_label text not null default 'Controlled Fast',
  notes_prompt text not null default 'How did this fast go?',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fast_settings enable row level security;

create policy "Users can manage their own fast settings"
  on public.fast_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.fast_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_hrs numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index fast_sessions_user_started on public.fast_sessions (user_id, started_at desc);

alter table public.fast_sessions enable row level security;

create policy "Users can manage their own fast sessions"
  on public.fast_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
