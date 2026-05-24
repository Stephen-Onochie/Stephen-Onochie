-- Bubbles: ephemeral notes per authenticated user
create type public.bubble_type as enum ('idea', 'purchase', 'goal', 'question');

create table public.bubbles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  type public.bubble_type not null default 'idea',
  expires_at timestamptz not null,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create index bubbles_user_id_idx on public.bubbles (user_id);
create index bubbles_created_at_idx on public.bubbles (created_at desc);

alter table public.bubbles enable row level security;

create policy "Users can select own bubbles"
  on public.bubbles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own bubbles"
  on public.bubbles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own bubbles"
  on public.bubbles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bubbles"
  on public.bubbles
  for delete
  to authenticated
  using (auth.uid() = user_id);
