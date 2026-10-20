-- Internship Tracker — weekly application tracking fix + Sources (focus areas).
--
-- 1) Backfill applied_at. Until now only a board drag to "Applied" stamped it;
--    changing the stage from the detail panel (how most cards moved) and jumps
--    straight to OA/Interview left it null, so those apps never showed up in
--    the weekly count. Best available proxy: the first logged stage change,
--    else the row's last update. Closed cards are left alone (can't tell a
--    rejected application from a dismissed wishlist card).
-- 2) internship_focus_areas: fields being explored (Biotech, Neurotech…).
--    Search terms become LinkedIn searches for the ingestion routine; targets
--    and applications can be tagged with an area.

-- ── 1) applied_at backfill ──────────────────────────────────────────────────
update public.internship_applications a
set applied_at = coalesce(
  (select min(e.created_at)
     from public.internship_activity_events e
    where e.application_id = a.id and e.event_type = 'stage_change'),
  a.updated_at
)
where a.applied_at is null
  and a.stage in ('applied', 'oa', 'interview', 'offer');

-- ── 2) focus areas ──────────────────────────────────────────────────────────
create table if not exists public.internship_focus_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  search_terms text[] not null default '{}',   -- keyword or a pasted LinkedIn search URL
  links jsonb not null default '[]'::jsonb,     -- [{ label, url }] boards to browse by hand
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.internship_focus_areas enable row level security;

create policy "Users can manage their own focus areas"
  on public.internship_focus_areas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.internship_targets
  add column if not exists focus_area_id uuid
    references public.internship_focus_areas (id) on delete set null,
  add column if not exists notes text;

alter table public.internship_applications
  add column if not exists focus_area_id uuid
    references public.internship_focus_areas (id) on delete set null;

create index if not exists internship_applications_focus_area
  on public.internship_applications (focus_area_id) where focus_area_id is not null;

-- ── seed: the two areas Stephen is starting to explore ──────────────────────
-- ATS slugs below were verified live (public board returned jobs) on
-- 2026-10-20. Companies without a public Greenhouse/Lever/Ashby board are
-- seeded inactive with a careers URL to check by hand.
do $$
declare
  uid uuid := '8c08ce23-f5d6-4f78-9193-ef9191b2975c';
  neuro uuid;
  bio uuid;
  t record;
begin
  if not exists (select 1 from auth.users where id = uid) then
    return;
  end if;

  insert into public.internship_focus_areas (user_id, name, description, search_terms, sort_order)
  values (
    uid,
    'Neurotech & Brain Signal Processing',
    'BCI, neural recording and biosignal processing (EEG/ECoG). Sparked by IEEE SMC.',
    array['neurotechnology', 'brain computer interface', 'biomedical signal processing', 'EEG'],
    0
  )
  on conflict (user_id, name) do nothing;

  insert into public.internship_focus_areas (user_id, name, description, search_terms, sort_order)
  values (
    uid,
    'Biotech',
    'Lab automation, bioinformatics and software/hardware for life sciences.',
    array['biotech', 'bioinformatics', 'computational biology'],
    1
  )
  on conflict (user_id, name) do nothing;

  select id into neuro from public.internship_focus_areas where user_id = uid and name = 'Neurotech & Brain Signal Processing';
  select id into bio from public.internship_focus_areas where user_id = uid and name = 'Biotech';

  for t in
    select * from (values
      ('Neuralink',            'greenhouse', 'neuralink',                null,                                      true,  'neuro'),
      ('Kernel',               'ashby',      'kernel',                   null,                                      true,  'neuro'),
      ('NeuroPace',            'greenhouse', 'neuropace',                null,                                      true,  'neuro'),
      ('Motif Neurotech',      'greenhouse', 'motifneurotech',           null,                                      true,  'neuro'),
      ('Synchron',             null,         null,                       'https://synchron.com/careers',            false, 'neuro'),
      ('Precision Neuroscience', null,       null,                       'https://precisionneuro.io/careers',       false, 'neuro'),
      ('Paradromics',          null,         null,                       'https://www.paradromics.com/careers',     false, 'neuro'),
      ('Ginkgo Bioworks',      'greenhouse', 'ginkgobioworks',           null,                                      true,  'bio'),
      ('Recursion',            'greenhouse', 'recursionpharmaceuticals', null,                                      true,  'bio'),
      ('insitro',              'ashby',      'insitro',                  null,                                      true,  'bio'),
      ('Benchling',            'ashby',      'benchling',                null,                                      true,  'bio'),
      ('Twist Bioscience',     'greenhouse', 'twistbioscience',          null,                                      true,  'bio'),
      ('Eli Lilly',            null,         null,                       'https://careers.lilly.com',               false, 'bio'),
      ('Roche Diagnostics (Indianapolis)', null, null,                   'https://careers.roche.com',               false, 'bio')
    ) as p(company, ats_platform, ats_slug, careers_url, active, area)
  loop
    insert into public.internship_targets
      (user_id, company, ats_platform, ats_slug, careers_url, active, focus_area_id)
    values
      (uid, t.company, t.ats_platform, t.ats_slug, t.careers_url, t.active,
       case t.area when 'neuro' then neuro else bio end)
    on conflict (user_id, company) do nothing;
  end loop;
end $$;
