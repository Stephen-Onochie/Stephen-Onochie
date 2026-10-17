-- StyleMate v2: richer item attributes, AI renders, Gmail sourcing, outfits,
-- stylist threads. Additive only; the legacy archetype column is unused.

alter type public.apparel_category add value if not exists 'jewelry';
alter type public.apparel_category add value if not exists 'bag';

alter table public.wardrobe_items
  add column color_hex text,
  add column colors text[] not null default '{}',
  add column pattern text,
  add column material text,
  add column fit text,
  add column brand text,
  add column size text,
  add column description text,
  add column formality smallint not null default 2 check (formality between 1 and 5),
  add column warmth smallint not null default 2 check (warmth between 1 and 5),
  add column seasons text[] not null default '{}',
  add column occasions text[] not null default '{}',
  add column style_tags text[] not null default '{}',
  add column render_path text,
  add column render_status text not null default 'none'
    check (render_status in ('none', 'pending', 'done', 'failed')),
  add column source text not null default 'scan' check (source in ('scan', 'gmail', 'manual')),
  add column source_ref text,
  add column retailer text,
  add column product_url text,
  add column price numeric(10, 2),
  add column ordered_at timestamptz,
  add column wear_count int not null default 0,
  add column last_worn_on date,
  add column updated_at timestamptz not null default now();

-- Gmail ingestion dedupe: one row per order line.
create unique index wardrobe_items_source_ref_key
  on public.wardrobe_items (user_id, source_ref)
  where source_ref is not null;

create table public.stylemate_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date,
  slot text not null default 'custom'
    check (slot in ('class', 'casual', 'gym', 'going_out', 'custom')),
  origin text not null default 'custom' check (origin in ('weekly', 'daily', 'custom')),
  week_start date,
  title text not null,
  occasion text,
  palette text,
  item_ids uuid[] not null default '{}',
  reasoning text,
  styling_tip text,
  weather jsonb,
  image_path text,
  image_status text not null default 'none'
    check (image_status in ('none', 'pending', 'done', 'failed')),
  saved boolean not null default false,
  worn_on date,
  created_at timestamptz not null default now()
);

create index stylemate_outfits_user_date_idx on public.stylemate_outfits (user_id, plan_date);
create index stylemate_outfits_user_week_idx on public.stylemate_outfits (user_id, week_start);

alter table public.stylemate_outfits enable row level security;

create policy "Users manage own outfits"
  on public.stylemate_outfits
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.stylemate_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stylemate_threads_user_idx on public.stylemate_threads (user_id, updated_at desc);

alter table public.stylemate_threads enable row level security;

create policy "Users manage own stylist threads"
  on public.stylemate_threads
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
