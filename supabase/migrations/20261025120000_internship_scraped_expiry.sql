-- Internship Tracker — scrape date + auto-expiry for ingested postings.
-- scraped_at: when the ingestion scan found the posting (the routine's run_at).
-- expiry_kept: owner pulled the card back out of Expired, so it never expires.
-- Expiry itself is derived (ingested, still wishlist, scraped 7+ days ago), so
-- nothing has to run on a schedule and un-expiring is just a flag.

alter table public.internship_applications
  add column if not exists scraped_at timestamptz,
  add column if not exists expiry_kept boolean not null default false;

update public.internship_applications
set scraped_at = created_at
where created_via = 'ingestion' and scraped_at is null;
