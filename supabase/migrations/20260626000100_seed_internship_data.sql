-- Seed data for the Internship Tracker (Summer 2027 cycle, Jul 2026 – Mar 2027).
-- Idempotent: weekly goals key on (user_id, week_start); Lane 1 programs guarded
-- by a not-exists check on (user_id, company) so re-running won't duplicate.

do $$
declare
  uid uuid := '8c08ce23-f5d6-4f78-9193-ef9191b2975c';
  wk date;
  tgt integer;
  prog record;
begin
  -- Weekly goal cadence. Target = upper bound of each month's range in the guide.
  -- Generate one row per ISO week (Monday) from the first Monday of Jul 2026
  -- through the last week touching Mar 2027.
  for wk in
    select d::date
    from generate_series(date '2026-06-29', date '2027-03-29', interval '1 week') as d
  loop
    tgt := case extract(month from wk)::int
      when 7 then 10   -- July
      when 8 then 10   -- August
      when 9 then 5    -- September
      when 10 then 5   -- October
      when 11 then 7   -- November
      when 12 then 7   -- December
      when 1 then 7    -- January
      when 2 then 5    -- February
      when 3 then 5    -- March
      else 5
    end;

    insert into public.internship_weekly_goals (user_id, week_start, target_apps)
    values (uid, wk, tgt)
    on conflict (user_id, week_start) do nothing;
  end loop;

  -- Lane 1 flagship programs, seeded as wishlist cards.
  for prog in
    select * from (values
      ('Salesforce', 'Futureforce Tech Launchpad Intern'),
      ('Amazon', 'SDE Intern'),
      ('Microsoft', 'Explore Intern'),
      ('Google', 'STEP Intern'),
      ('NVIDIA', 'Ignite Intern'),
      ('Meta', 'University Engineering Intern'),
      ('Two Sigma', 'Software Engineering Intern'),
      ('Duolingo', 'Software Engineering Intern'),
      ('Pinterest', 'Engage Intern')
    ) as p(company, role_title)
  loop
    if not exists (
      select 1 from public.internship_applications a
      where a.user_id = uid and a.company = prog.company and a.lane = 'lane1_program'
    ) then
      insert into public.internship_applications
        (user_id, company, role_title, lane, role_type, stage, priority, referral_status)
      values
        (uid, prog.company, prog.role_title, 'lane1_program', 'swe', 'wishlist', 'high', 'none');
    end if;
  end loop;

  -- Default settings row.
  insert into public.internship_settings (user_id, digest_email)
  values (uid, 'stephenconochie@gmail.com')
  on conflict (user_id) do nothing;
end $$;
