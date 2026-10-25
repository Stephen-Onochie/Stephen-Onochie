-- Internship Tracker — scrape date + auto-expiry for ingested postings.
-- scraped_at: when the ingestion scan found the posting (the routine's run_at).
-- expiry_kept: owner pulled the card back out of Expired, so it never expires.
-- internship_settings.expiry_days: how long a scraped card may sit unapplied.
-- Expiry itself is derived (still wishlist, scraped expiry_days+ days ago), so
-- nothing has to run on a schedule and changing the setting applies instantly.

alter table public.internship_applications
  add column if not exists scraped_at timestamptz,
  add column if not exists expiry_kept boolean not null default false;

alter table public.internship_settings
  add column if not exists expiry_days integer not null default 7
    check (expiry_days between 1 and 365);

-- Existing scan rows count from when they were inserted, so the current
-- wishlist backlog expires right away instead of getting a fresh window.
update public.internship_applications
set scraped_at = created_at
where created_via = 'ingestion' and scraped_at is null;
