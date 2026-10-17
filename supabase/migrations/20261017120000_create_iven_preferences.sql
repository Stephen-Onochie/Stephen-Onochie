-- IVEN shell preferences: the user's custom sidebar app order. Stored as an
-- ordered list of nav ids from components/iven/nav-registry.ts; ids that no
-- longer exist are dropped and new apps are appended when the order is loaded.
create table public.iven_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sidebar_order text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.iven_preferences enable row level security;

create policy "Users can manage their own IVEN preferences"
  on public.iven_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
