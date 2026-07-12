-- Dorm OS persistence: furniture layout, room state, and AI-generated custom
-- items. All owner-scoped via RLS like the other private apps.

create table if not exists dorm_layout (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  placement jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table dorm_layout enable row level security;

create policy "Users manage their own dorm layout"
  on dorm_layout for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists dorm_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table dorm_state enable row level security;

create policy "Users manage their own dorm state"
  on dorm_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists dorm_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dims jsonb not null,
  spec jsonb not null,
  image_path text,
  created_at timestamptz not null default now()
);

alter table dorm_items enable row level security;

create policy "Users manage their own dorm items"
  on dorm_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Private bucket for the reference photos custom items were generated from.
insert into storage.buckets (id, name, public)
values ('dorm-items', 'dorm-items', false)
on conflict (id) do nothing;

create policy "Users manage their own dorm item images - select"
  on storage.objects for select
  using (
    bucket_id = 'dorm-items'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users manage their own dorm item images - insert"
  on storage.objects for insert
  with check (
    bucket_id = 'dorm-items'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users manage their own dorm item images - delete"
  on storage.objects for delete
  using (
    bucket_id = 'dorm-items'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
