-- Todo → Task OS upgrade (Module 03).
-- Extends the existing todo_lists (= projects) and todos tables in place —
-- no rename, no data migration — and adds tags, task_tags, recurrences,
-- and module_events. All new tables are RLS-scoped to auth.uid() = user_id.

-- --- Shared updated_at trigger ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- recurrences --------------------------------------------------------------
-- RFC 5545 rrule per recurring series. next_occurrence is precomputed for cheap
-- querying (weekly review, upcoming load). Regenerate-on-complete is the only
-- materialization path this cycle (no cron).
create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rrule text not null,
  anchor_date date not null default current_date,
  regenerate_on_complete boolean not null default true,
  next_occurrence timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index recurrences_user_active_idx on public.recurrences (user_id, active);

alter table public.recurrences enable row level security;

create policy "Users can manage their own recurrences"
  on public.recurrences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- todo_lists (= projects) additions ---------------------------------------
alter table public.todo_lists
  add column if not exists icon text,
  add column if not exists module_link text
    check (module_link in ('reading', 'fitness', 'finance'));

-- --- todos additions ----------------------------------------------------------
alter table public.todos
  add column if not exists priority smallint not null default 0
    check (priority between 0 and 3),
  add column if not exists pinned boolean not null default false,
  add column if not exists position double precision,
  add column if not exists parent_task_id uuid
    references public.todos (id) on delete cascade,
  add column if not exists recurrence_id uuid
    references public.recurrences (id) on delete set null,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'quick_add', 'mcp', 'auto')),
  add column if not exists triage_suggestion jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill fractional positions from existing insertion order so drag-reorder
-- has a stable starting point.
update public.todos t
set position = seq.rn
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.todos
) seq
where t.id = seq.id and t.position is null;

create index if not exists todos_user_completed_due_idx
  on public.todos (user_id, completed, due_at);
create index if not exists todos_parent_idx
  on public.todos (parent_task_id);

drop trigger if exists trg_todos_updated_at on public.todos;
create trigger trg_todos_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

-- --- tags ---------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#C9A84C',
  created_at timestamptz not null default now()
);

create unique index tags_user_name_idx on public.tags (user_id, lower(name));

alter table public.tags enable row level security;

create policy "Users can manage their own tags"
  on public.tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- task_tags (join) ---------------------------------------------------------
-- Carries user_id so RLS is a simple owner check rather than a join subquery.
create table public.task_tags (
  task_id uuid not null references public.todos (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

create index task_tags_user_idx on public.task_tags (user_id);
create index task_tags_tag_idx on public.task_tags (tag_id);

alter table public.task_tags enable row level security;

create policy "Users can manage their own task_tags"
  on public.task_tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- module_events ------------------------------------------------------------
-- Loosely-coupled event bus. Completing a task whose project is module-linked
-- emits a row here; target modules (reading, fitness) consume independently.
create table public.module_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_task_id uuid references public.todos (id) on delete set null,
  module text not null check (module in ('reading', 'fitness', 'finance')),
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index module_events_user_module_idx on public.module_events (user_id, module, created_at desc);

alter table public.module_events enable row level security;

create policy "Users can manage their own module_events"
  on public.module_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- Seed default projects ----------------------------------------------------
-- Idempotent: only inserts a project name that the owner doesn't already have.
-- Owner uid matches HEALTH_USER_ID (the site owner).
insert into public.todo_lists (user_id, name, emoji, color, module_link, sort_order)
select v.user_id, v.name, v.emoji, v.color, v.module_link, v.sort_order
from (values
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'SBS Digital', '💼', '#C9A84C', null, 0),
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'School', '🎓', '#6B4F2A', null, 1),
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'Personal', '🏠', '#8C7355', null, 2),
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'Family', '👨‍👩‍👧', '#A8743B', null, 3),
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'Fitness', '💪', '#7C8C5A', 'fitness', 4),
  ('8c08ce23-f5d6-4f78-9193-ef9191b2975c'::uuid, 'Finance', '📊', '#5A7C8C', 'finance', 5)
) as v(user_id, name, emoji, color, module_link, sort_order)
where not exists (
  select 1 from public.todo_lists l
  where l.user_id = v.user_id and lower(l.name) = lower(v.name)
);
