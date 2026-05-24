-- StyleMate: wardrobe catalog per authenticated user
create type public.apparel_category as enum ('top', 'bottom', 'outerwear', 'footwear', 'accessory');
create type public.laundry_status as enum ('clean', 'dirty', 'laundry_cycle');

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(255) not null,
  category public.apparel_category not null,
  sub_type varchar(100),
  color varchar(50) not null,
  min_temp_threshold int not null default 0,
  max_temp_threshold int not null default 110,
  archetype varchar(100) not null default 'casual_weekend',
  status public.laundry_status not null default 'clean',
  is_incoming boolean not null default false,
  image_url text,
  created_at timestamptz not null default now()
);

create index wardrobe_items_user_id_idx on public.wardrobe_items (user_id);
create index wardrobe_items_category_idx on public.wardrobe_items (category);
create index wardrobe_items_status_idx on public.wardrobe_items (status);
create index wardrobe_items_created_at_idx on public.wardrobe_items (created_at desc);

alter table public.wardrobe_items enable row level security;

create policy "Users can select own wardrobe items"
  on public.wardrobe_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own wardrobe items"
  on public.wardrobe_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own wardrobe items"
  on public.wardrobe_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own wardrobe items"
  on public.wardrobe_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Private storage bucket for wardrobe photos
insert into storage.buckets (id, name, public)
values ('wardrobe-images', 'wardrobe-images', false)
on conflict (id) do nothing;

create policy "Users can upload own wardrobe images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wardrobe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own wardrobe images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own wardrobe images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own wardrobe images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
