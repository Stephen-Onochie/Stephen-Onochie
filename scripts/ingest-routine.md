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

## Routine prompt (paste verbatim, filling in INGEST_SECRET)

The routine was created from the web UI, so agents can't edit it: paste changes at
https://claude.ai/code/routines/trig_0179ApZ9ED79xq4yntWe8hkY.

```
You are the internship ingestion agent for Stephen's tracker. Run autonomously; the session is stateless, so rely only on the steps below and the live APIs. Do not ask questions.

Constants:
  INGEST_SECRET   = <INGEST_SECRET from Vercel>
  INGEST_API_URL  = https://www.stephenonochie.com/api/internship/ingest
  TARGETS_API_URL = https://www.stephenonochie.com/api/internship/ingest/targets

Steps:
1. GET ${TARGETS_API_URL} with header 'Authorization: Bearer ${INGEST_SECRET}' and save the response body to /tmp/targets.json (e.g. curl -s -H 'Authorization: Bearer ${INGEST_SECRET}' ${TARGETS_API_URL} > /tmp/targets.json). It is JSON: { targets: [{ company, ats_platform, ats_slug, focus_area }], linkedin_searches: [{ url, focus_area }], focus_areas: [{ name, description }] }. focus_areas are the fields Stephen is exploring (set in the tracker's Sources tab).
2. Run the fetch/normalize script with that file on stdin (a file, not echo, so quotes in area descriptions can't break the shell):
     npx tsx scripts/ingest-sources.ts < /tmp/targets.json
   (If tsx is unavailable, first run: npm i -D tsx --no-save) This prints { postings: [...], failed_sources: [...] } covering the vanshb03 community JSON feed, the sndsh404 README markdown feed, the LinkedIn searches (built-in plus the focus-area ones from step 1), and each ATS target's public board. Postings found through a focus area carry a focus_area field.
3. From postings, keep only those that are: an internship, for Summer 2027, and classifiable as one of [swe, embedded, backend, robotics, ml, hardware, product]. EXCEPTION: a posting that carries a focus_area, or plainly fits one of the focus_areas from step 1, is kept if it is an engineering, technical or research internship in that field even when none of those role types fits; use role_type 'other' for those. Drop everything else. Do NOT drop by location or pay. LinkedIn postings (source board:linkedin) usually don't name a season: treat them as Summer 2027 unless the title names a different term (Fall, Spring, Winter, 2026, co-op only).
4. For each kept posting set: company, role_title, job_url, location, city_tag (indy/chicago/austin/remote/other), lane (lane1_program/lane2_portal/lane3_startup), role_type, season='summer_2027', is_paid_confirmed (true only if the posting states paid), work_auth_flag (true if it requires US citizenship/clearance), deadline (only if a hard close is stated), source (carry through the source field from the normalized posting), and focus_area (carry it through when the posting has one; otherwise set it to the matching focus_areas name if the posting clearly belongs to one, else omit). Lane rules: lane1_program if it matches an underclassman program (Salesforce Futureforce, Amazon, Microsoft Explore, Google STEP, NVIDIA Ignite, Meta University, Two Sigma, Duolingo, Pinterest Engage, UberSTAR); else ats:* sources -> lane3_startup, community feed:* and job-board board:* sources -> lane2_portal. city_tag: indy includes Indianapolis/Carmel/Fishers/Zionsville/Columbus IN metro; remote = US-remote; any other US -> other.
5. Determine first_run: run `date -u +%H` to get the current UTC hour. If the UTC hour is 12 (this is the day's first scan, 08:00 Indiana), set first_run=true; otherwise set first_run=false. The API sends a daily proof-of-life email only when first_run=true, so it must be true on exactly one run per day (the 12:00 UTC run).
6. POST the batch to ${INGEST_API_URL} with the bearer header and JSON body { run_at: <current ISO timestamp>, first_run: <from step 5>, candidates: [...] }. Do NOT send priority; the API computes it.
7. Read the API JSON response and report: inserted, skipped_duplicates, skipped_season, capped, deadline_alerts, and whether first_run was true (so the proof-of-life email fired). Also list any failed_sources from step 2. Do not commit or push anything.
```

---

## First run & verification
- First run: `first_run = true`. The API backfills current matches capped at 50; every
  later run is new-only (dedupe handles the rest).
- Confirm rows land as `stage = wishlist`, `created_via = ingestion`, priorities match
  the lane/city matrix, and that duplicates + wrong-season candidates are skipped.
- Newly-discovered rows and Lane 1 deadlines (≤7 days) appear in the next Sunday digest
  (`/api/cron/internship-digest`); the ingest API itself sends no email.

## Adding a LinkedIn search
Paste any `linkedin.com/jobs/search…` URL into `LINKEDIN_SEARCHES` in
`scripts/ingest-sources.ts`. Its keywords, location, distance and every `f_*`
filter are forwarded to LinkedIn's logged-out jobs endpoint (10 results/page,
up to 5 pages, 1.5 s between requests). Results land as `source=board:linkedin`
with canonical `linkedin.com/jobs/view/<id>` URLs. A throttled search shows up in
`failed_sources` and the rest of the run continues. This is the logged-out page
LinkedIn shows anyone, but automated access is against LinkedIn's user
agreement — keep the search list small.

## Adding a company or a new field (Sources tab)
Use the **Sources** tab in the tracker. Each focus area holds LinkedIn search terms
(keywords become `"<term> intern"` US-wide searches, or paste a full LinkedIn search URL),
companies, and hand-browse links. Adding a company auto-detects its public
Greenhouse/Lever/Ashby board (`/api/internship/sources/detect`); companies without one are
kept as manual checks. **Suggest Companies** asks OpenRouter (web search) for more.
The routine pulls everything from `/api/internship/ingest/targets` each run, so the scraper
expands automatically — no code change. Area searches are capped at 8 per run
(round-robin across areas, 2 pages each); pausing an area pauses its companies.
Postings found through an area land tagged with its `focus_area_id`.

Raw SQL still works for untagged targets:
```sql
insert into public.internship_targets (user_id, company, ats_platform, ats_slug)
values ('8c08ce23-f5d6-4f78-9193-ef9191b2975c', 'Company', 'greenhouse', 'slug');
```
