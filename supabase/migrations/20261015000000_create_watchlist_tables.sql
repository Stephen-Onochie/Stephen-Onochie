-- Watchlist: films/shows/anime/Nollywood to watch, with status, rating and
-- episode progress. `details` caches the TMDB (+ Jikan/AniList for anime)
-- snapshot so the grid renders without hitting external APIs on every load;
-- the app refreshes it when an item older than 7 days is opened.
create table public.watch_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer,
  tmdb_type text check (tmdb_type in ('movie', 'tv')),
  mal_id integer,
  kind text not null default 'movie' check (kind in ('movie', 'tv', 'anime', 'nollywood')),
  title text not null,
  year integer,
  poster_url text,
  backdrop_url text,
  status text not null default 'watchlist'
    check (status in ('watchlist', 'watching', 'paused', 'watched', 'dropped')),
  rating smallint check (rating between 1 and 10),
  notes text,
  current_season integer,
  current_episode integer,
  started_on date,
  finished_on date,
  is_public_current boolean not null default false,
  details jsonb,
  details_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Title-only items (no TMDB match) have null ids, which Postgres treats as
  -- distinct, so they never collide.
  unique (user_id, tmdb_type, tmdb_id)
);

create index watch_items_user_status on public.watch_items (user_id, status, updated_at desc);

-- At most one publicly-featured title per user.
create unique index watch_items_one_public_current
  on public.watch_items (user_id)
  where is_public_current;

alter table public.watch_items enable row level security;

create policy "Users can manage their own watch items"
  on public.watch_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.public_view_settings
  add column show_currently_watching boolean not null default true;
