-- Todo: lightweight task lists per authenticated user.
-- A todo with list_id = null lives in the built-in "Inbox".

create table public.todo_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '🗂️',
  color text not null default '#C9A84C',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid references public.todo_lists (id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index todo_lists_user_id_idx on public.todo_lists (user_id);
create index todo_lists_sort_idx on public.todo_lists (user_id, sort_order);
create index todos_user_id_idx on public.todos (user_id);
create index todos_list_id_idx on public.todos (list_id);
create index todos_due_at_idx on public.todos (user_id, due_at);

alter table public.todo_lists enable row level security;
alter table public.todos enable row level security;

-- todo_lists policies
create policy "Users can select own todo_lists"
  on public.todo_lists for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own todo_lists"
  on public.todo_lists for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own todo_lists"
  on public.todo_lists for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own todo_lists"
  on public.todo_lists for delete to authenticated
  using (auth.uid() = user_id);

-- todos policies
create policy "Users can select own todos"
  on public.todos for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own todos"
  on public.todos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own todos"
  on public.todos for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own todos"
  on public.todos for delete to authenticated
  using (auth.uid() = user_id);
