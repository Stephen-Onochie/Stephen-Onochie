-- Internship Tracker — keep the source's posting date on scanned rows so the
-- board can filter by "posted in the past 24h / week / month" and postings
-- over a month old expire. Null for manual adds and rows scanned before this;
-- the app falls back to scraped_at for those.

alter table public.internship_applications
  add column if not exists posted_at timestamptz;
