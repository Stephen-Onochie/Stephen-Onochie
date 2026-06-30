-- One flag governs both internship emails (Sunday digest + daily ingestion
-- proof-of-life). The one-click unsubscribe link flips this to false; the
-- send paths and the settings panel both honor it.
alter table public.internship_settings
  add column if not exists email_subscribed boolean not null default true;
