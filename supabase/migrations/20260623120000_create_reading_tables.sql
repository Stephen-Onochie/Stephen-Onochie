create table public.reading_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_goal_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reading_settings enable row level security;

create policy "Users can manage their own reading settings"
  on public.reading_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.reading_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  total_pages integer,
  current_page integer not null default 0,
  shelf text not null default 'want' check (shelf in ('reading', 'want', 'finished')),
  is_public_current boolean not null default false,
  started_at date,
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reading_books_user_shelf on public.reading_books (user_id, shelf);

-- At most one publicly-featured book per user.
create unique index reading_books_one_public_current
  on public.reading_books (user_id)
  where is_public_current;

alter table public.reading_books enable row level security;

create policy "Users can manage their own reading books"
  on public.reading_books
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.reading_books (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  minutes integer,
  start_page integer,
  end_page integer,
  notes text,
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index reading_sessions_user_date on public.reading_sessions (user_id, session_date desc);
create index reading_sessions_book on public.reading_sessions (book_id, started_at desc);

alter table public.reading_sessions enable row level security;

create policy "Users can manage their own reading sessions"
  on public.reading_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
