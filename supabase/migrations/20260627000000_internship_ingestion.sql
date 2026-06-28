-- Internship Tracker — automated ingestion support.
-- 1) Extra classification/provenance columns on applications written by the
--    ingestion API. 2) internship_targets table: the seeded ATS companies the
--    ingestion routine polls (Greenhouse/Lever/Ashby public boards by slug).

-- ── applications: ingestion fields ──────────────────────────────────────────
alter table public.internship_applications
  add column if not exists season text,
  add column if not exists work_auth_flag boolean not null default false,
  add column if not exists created_via text not null default 'manual'
    check (created_via in ('manual', 'ingestion')),
  add column if not exists source text;

create index if not exists internship_applications_user_created_via
  on public.internship_applications (user_id, created_via, created_at desc);

-- ── targets (ATS boards the routine polls) ──────────────────────────────────
create table if not exists public.internship_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  ats_platform text
    check (ats_platform in ('greenhouse', 'lever', 'ashby')),
  ats_slug text,
  careers_url text,                       -- fallback to resolve platform/slug later
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, company)
);

create index if not exists internship_targets_user_active
  on public.internship_targets (user_id, active);

alter table public.internship_targets enable row level security;

create policy "Users can manage their own internship targets"
  on public.internship_targets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── seed targets ────────────────────────────────────────────────────────────
-- Targets with a known public ATS slug are active and polled. Ones whose
-- platform/slug still need resolving are seeded inactive with a careers_url so
-- the setup task can fill them in without re-deriving the company list.
do $$
declare
  uid uuid := '8c08ce23-f5d6-4f78-9193-ef9191b2975c';
  t record;
begin
  for t in
    select * from (values
      -- company,      platform,     slug,                careers_url,                              active
      ('Apptronik',   'greenhouse', 'apptronik',         null,                                      true),
      ('Saronic',     'ashby',      'saronic',           null,                                      true),
      ('Anduril',     'greenhouse', 'andurilindustries', null,                                      true),
      ('Firefly Aerospace', null,   null,                'https://firefly.com/careers/',            false),
      ('Skydio',      'ashby',      'skydio',            null,                                      true),
      ('Zipline',     null,         null,                'https://www.flyzipline.com/careers',      false),
      ('Figure',      'ashby',      'figure',            null,                                      true),
      ('Cobalt Robotics', null,     null,                'https://www.cobaltrobotics.com/careers',  false)
    ) as p(company, ats_platform, ats_slug, careers_url, active)
  loop
    insert into public.internship_targets
      (user_id, company, ats_platform, ats_slug, careers_url, active)
    values
      (uid, t.company, t.ats_platform, t.ats_slug, t.careers_url, t.active)
    on conflict (user_id, company) do nothing;
  end loop;
end $$;
