# Internship Ingestion Routine — setup & prompt

The automated discovery half of the Internship Tracker runs as a **Claude Code
Routine** (cloud, scheduled) that fetches public internship sources, classifies
them to Stephen's profile, and POSTs them to the ingestion API on the site. All
dedupe state lives in Supabase, so each stateless run holds no memory.

This file is version-controlled so the prompt and setup steps don't drift. The
routine itself is created manually at **claude.ai/code/routines** (it cannot be
created from the repo).

---

## Site-side pieces (already built)

| Piece | Path |
|---|---|
| Ingest endpoint | `app/api/internship/ingest/route.ts` (`POST`) |
| Targets endpoint | `app/api/internship/ingest/targets/route.ts` (`GET`) |
| Fetch/normalize script | `scripts/ingest-sources.ts` |
| Targets table + columns | `supabase/migrations/20260627000000_internship_ingestion.sql` |
| Digest fold-in | `lib/internship/digest.ts` (Newly discovered + Lane 1 pounce) |

### Server env vars (set in Vercel + `.env.local`)
- `INGEST_SECRET` — bearer for both ingest routes.
- `INTERNSHIP_USER_ID` — `8c08ce23-f5d6-4f78-9193-ef9191b2975c` (rows are stamped with this).
- `INGEST_ACTIVE_SEASON` — `summer_2027` (candidates with a different season are rejected).

---

## The routine (already created)

Created via the `/schedule` skill as a remote cloud routine:

- **Routine ID:** `trig_0179ApZ9ED79xq4yntWe8hkY`
  (manage: https://claude.ai/code/routines/trig_0179ApZ9ED79xq4yntWe8hkY)
- **Repo:** `Stephen-Onochie`
- **Cron:** `0 12,22 * * *` (UTC) = **08:00 / 18:00 EDT** (07:00 / 17:00 once Indiana
  switches to EST — fixed-offset UTC cron).
- **Model:** `claude-sonnet-4-6`.
- The API URLs and `INGEST_SECRET` are baked into the prompt (cloud routines have no
  separate secret store — the prompt carries them). Network access is open by default;
  no allowlist needed.

> ⚠ **Secret coupling:** if you rotate `INGEST_SECRET` on Vercel, you MUST update the
> routine prompt to match (via the /schedule skill's update action or the web UI), or
> every run will 401.

### Daily proof-of-life email
The ingest API sends a personal-website-branded email (to `internship_settings.digest_email`)
whenever the routine posts with `first_run=true`. The routine sets `first_run=true` only on
the day's first scan (12:00 UTC / 08:00 Indiana), so exactly one email arrives per day showing
the run's counts. Reuses `RESEND_API_KEY` + `INTERNSHIP_DIGEST_FROM` (already in prod). Builder:
`lib/internship/ingest-email.ts`. The send is best-effort and never fails ingestion.

### ⚠ Verify before first run
The three community `listings.json` raw URLs in `scripts/ingest-sources.ts` roll
over by cycle and rename. Confirm each still serves the **current Summer 2027**
main list (not off-season / new-grad), and update the constants if needed.
(vanshb03 was still serving Summer 2026 data as of mid-2026.)

---

## Routine prompt (paste verbatim)

```
You are the internship ingestion agent for Stephen's tracker. Run autonomously; the
session is stateless, so rely only on the steps below and the live APIs.

1. GET ${TARGETS_API_URL} with header "Authorization: Bearer ${INGEST_SECRET}" to get
   the ATS target companies and their platform+slug.
2. Run scripts/ingest-sources.ts to fetch and normalize all sources, piping the targets
   JSON from step 1 into its stdin:
     echo '<targets json>' | npx tsx scripts/ingest-sources.ts
   This returns { postings: [...], failed_sources: [...] } covering the three community
   Summer 2027 listings.json feeds plus each ATS target's public board.
3. From postings, keep only those that are: an internship, for Summer 2027, and
   classifiable as one of [swe, embedded, backend, robotics, ml, hardware, product].
   Drop everything else. Do NOT drop by location or pay.
4. For each kept posting set: company, role_title, job_url, location, city_tag
   (indy/chicago/austin/remote/other), lane (lane1_program/lane2_portal/lane3_startup),
   role_type, season="summer_2027", is_paid_confirmed (true only if the posting states
   paid), work_auth_flag (true if it requires US citizenship/clearance), deadline (only
   if a hard close is stated), and source (carry through the source from the normalized
   posting). Lane rules: lane1_program if it matches an underclassman program (Salesforce
   Futureforce, Amazon, Microsoft Explore, Google STEP, NVIDIA Ignite, Meta University,
   Two Sigma, Duolingo, Pinterest Engage, UberSTAR); else ats:* sources -> lane3_startup,
   community feed:* sources -> lane2_portal. city_tag indy includes Indianapolis/Carmel/
   Fishers/Zionsville/Columbus IN metro; remote = US-remote; any other US -> other.
5. POST the batch to ${INGEST_API_URL} with the bearer header and body
   { run_at, first_run, candidates: [...] }. Set first_run=true ONLY on the very first
   run; false thereafter. (Priority is computed server-side — don't send it.)
6. Read the API response and report: inserted, skipped_duplicates, skipped_season,
   whether the run was capped, and deadline_alerts. If any source failed to fetch
   (failed_sources from step 2), list which ones.
```

---

## First run & verification
- First run: `first_run = true`. The API backfills current matches capped at 50; every
  later run is new-only (dedupe handles the rest).
- Confirm rows land as `stage = wishlist`, `created_via = ingestion`, priorities match
  the lane/city matrix, and that duplicates + wrong-season candidates are skipped.
- Newly-discovered rows and Lane 1 deadlines (≤7 days) appear in the next Sunday digest
  (`/api/cron/internship-digest`); the ingest API itself sends no email.

## Adding a company later
Insert a row into `internship_targets` (company + ats_platform + ats_slug, `active=true`).
The routine pulls the list from `/api/internship/ingest/targets` each run, so the scraper
expands automatically — no code change.
```sql
insert into public.internship_targets (user_id, company, ats_platform, ats_slug)
values ('8c08ce23-f5d6-4f78-9193-ef9191b2975c', 'Company', 'greenhouse', 'slug');
```
