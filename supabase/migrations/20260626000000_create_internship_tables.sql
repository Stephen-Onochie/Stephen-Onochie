-- Internship Tracker — applications, contacts/referral pipeline, interviews,
-- activity timeline, documents, tasks, weekly goals. Single-user, RLS via auth.uid().

-- ── applications ────────────────────────────────────────────────────────────
create table public.internship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role_title text not null,
  job_url text,
  location text,
  city_tag text not null default 'other'
    check (city_tag in ('indy', 'chicago', 'austin', 'remote', 'other')),
  lane text not null default 'lane2_portal'
    check (lane in ('lane1_program', 'lane2_portal', 'lane3_startup')),
  role_type text not null default 'swe'
    check (role_type in ('swe', 'embedded', 'backend', 'robotics', 'ml', 'hardware', 'product', 'other')),
  stage text not null default 'wishlist'
    check (stage in ('wishlist', 'applied', 'oa', 'interview', 'offer', 'closed')),
  closed_reason text
    check (closed_reason in ('rejected', 'withdrawn', 'ghosted', 'accepted_other')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  is_paid_confirmed boolean not null default false,
  deadline timestamptz,
  applied_at timestamptz,
  referral_status text not null default 'none'
    check (referral_status in ('none', 'seeking', 'secured')),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index internship_applications_user_stage
  on public.internship_applications (user_id, stage, sort_order);
create index internship_applications_user_deadline
  on public.internship_applications (user_id, deadline);

alter table public.internship_applications enable row level security;

create policy "Users can manage their own internship applications"
  on public.internship_applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── contacts (referral pipeline) ────────────────────────────────────────────
create table public.internship_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  company text,
  role_title text,
  linkedin_url text,
  email text,
  source text not null default 'other'
    check (source in ('purdue', 'nsbe', 'career_fair', 'cold', 'event', 'other')),
  pipeline_state text not null default 'contacted'
    check (pipeline_state in ('contacted', 'replied', 'call_done', 'referred', 'dormant')),
  next_action text,
  next_action_date timestamptz,
  linked_application_id uuid references public.internship_applications (id) on delete set null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index internship_contacts_user_state
  on public.internship_contacts (user_id, pipeline_state, sort_order);
create index internship_contacts_user_next_action
  on public.internship_contacts (user_id, next_action_date);

alter table public.internship_contacts enable row level security;

create policy "Users can manage their own internship contacts"
  on public.internship_contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── interviews ──────────────────────────────────────────────────────────────
create table public.internship_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.internship_applications (id) on delete cascade,
  type text not null default 'phone'
    check (type in ('oa', 'phone', 'technical', 'onsite', 'behavioral')),
  scheduled_at timestamptz not null,
  duration_mins integer not null default 60,
  prep_notes text,
  outcome text
    check (outcome in ('passed', 'failed', 'pending', 'no_show', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index internship_interviews_user_time
  on public.internship_interviews (user_id, scheduled_at);
create index internship_interviews_application
  on public.internship_interviews (application_id);

alter table public.internship_interviews enable row level security;

create policy "Users can manage their own internship interviews"
  on public.internship_interviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── activity events (timeline) ──────────────────────────────────────────────
create table public.internship_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.internship_applications (id) on delete cascade,
  contact_id uuid references public.internship_contacts (id) on delete cascade,
  event_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index internship_activity_application
  on public.internship_activity_events (application_id, created_at desc);
create index internship_activity_contact
  on public.internship_activity_events (contact_id, created_at desc);

alter table public.internship_activity_events enable row level security;

create policy "Users can manage their own internship activity events"
  on public.internship_activity_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── documents ───────────────────────────────────────────────────────────────
create table public.internship_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.internship_applications (id) on delete cascade,
  label text not null,
  file_url text,
  external_url text,
  type text not null default 'other'
    check (type in ('resume', 'cover_letter', 'other')),
  created_at timestamptz not null default now()
);

create index internship_documents_application
  on public.internship_documents (application_id, created_at desc);

alter table public.internship_documents enable row level security;

create policy "Users can manage their own internship documents"
  on public.internship_documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── tasks ───────────────────────────────────────────────────────────────────
create table public.internship_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.internship_applications (id) on delete cascade,
  contact_id uuid references public.internship_contacts (id) on delete cascade,
  title text not null,
  due_date timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index internship_tasks_user_due
  on public.internship_tasks (user_id, done, due_date);

alter table public.internship_tasks enable row level security;

create policy "Users can manage their own internship tasks"
  on public.internship_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── weekly goals ────────────────────────────────────────────────────────────
create table public.internship_weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  target_apps integer not null default 5,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index internship_weekly_goals_user_week
  on public.internship_weekly_goals (user_id, week_start);

alter table public.internship_weekly_goals enable row level security;

create policy "Users can manage their own internship weekly goals"
  on public.internship_weekly_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── settings ────────────────────────────────────────────────────────────────
create table public.internship_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_nudges_enabled boolean not null default false,
  digest_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.internship_settings enable row level security;

create policy "Users can manage their own internship settings"
  on public.internship_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
