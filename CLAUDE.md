# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stephen's personal website at `stephenonochie.com` — deployed on Vercel. Two distinct halves:

- **Public portfolio** (`/app/page.tsx`) — hero, tech stack, GitHub showcase, LinkedIn card, resume CTA. Warm beige/gold theme (`#F5F0E8` / `#C9A84C`), Inter + Playfair Display fonts.
- **Private app suite** (`/app/apps/*`) — gated by Google OAuth via `middleware.ts`, restricted to `stephenconochie@gmail.com`. Apps are built for Stephen's personal use only — they are intentionally not public.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres, Auth, RLS, Realtime, private storage bucket `wardrobe-images`
- **Tailwind 3.4**, Radix UI, shadcn/ui, Lucide
- **Google Gemini Vision API** (`GEMINI_API_KEY`)
- DB migrations in `/supabase/migrations/`

## Private Apps

| App | Purpose |
|-----|---------|
| **StyleMate** | Wardrobe catalog with Gemini Vision photo analysis |
| **Native Clock** | Desk display: weather, stocks, NPR news tickers. Tasks tab shows all incomplete todos (no today filter). |
| **Standing Timer** | Stand/sit/break health cycles + stats |
| **Bubbles** | Ephemeral auto-expiring notes |
| **Todo** | Quick-capture tasks, natural-language due dates (`lib/todo/parse.ts`), Inbox shows all incomplete tasks (not list-scoped), browser reminders. Tables: `todo_lists`, `todos` |
| **Project Waves** | Daily 360 waves brushing routine: 3 timed sessions (morning/afternoon/evening) + weekly Wash Day, streak tracking, hair calendar, upcoming haircut schedule with Google Calendar links. Tables: `waves_settings`, `waves_sessions`, `waves_stroke_log` |
| **FastTrack** | Intermittent fasting tracker: start/end fasts, configurable cooldown and target duration, fasting calendar, guidelines. Tables: `fast_settings`, `fast_sessions` |
| **LG Remote** | Web UI for controlling an LG TV remotely. Requires the `lg-tv-proxy` sidecar server (see below). |
| **Dorm OS** | Interactive 3D diorama of Stephen's Wiley Hall dorm room (`/apps/dorm`). Engine `components/dorm/dorm-room.js` (maintained vanilla ES5 custom element on `window.THREE`): every furniture piece is a self-contained movable group registered in `movables` with a placement (floor: `x/z/rotY`; wall: `wall/u/y`); fixed = shell, closets, door+mirror, window+curtains, radiator, box fans, string lights/LED strip. Edit mode: drag, tap-select + 15° step rotation, wall items slide along / transfer between the north and west walls (red outline while floating off-wall, invalid drops revert), gold EDITING banner, save/discard confirmation on exit. Any item can be moved to Furniture Storage (a tray under the banner; `stored: true` on its placement hides it and excludes it from picking) and placed back later; newly generated items land in storage first; Reset Layout returns stored built-ins. Layout + room toggles persist per user (`dorm_layout`, `dorm_state`; room state auto-saves debounced). View aids in room state: `labelsOn` (projected HTML pill labels over every unstored item), `measurementsOn` (14/16 ft dimension lines along the open slab edges), and `eastWallOn` (raises the normally-cutaway east wall; wall items can hang on `east` and hide with the wall when it's toggled off). Walk mode (desktop-only third Interact option): first-person POV via `setWalkMode` — WASD/arrows move, pointer-lock mouse look, Space jumps (simple gravity), Esc exits (engine emits `walkmode`), crosshair raycast lets clicks trigger the item you're looking at; spawns inside the door at 5.0 ft standing eye height (FOV 65); walking onto the sofa footprint smoothly seats you (~3.65 ft eye, cushion squish, rotation/position aware) and stepping off stands back up. Three plain palette posters (`poster1-3`, cream/camel/gold) are wall movables defaulting to the east wall. AI furniture generator: photo + inch dimensions → OpenRouter vision (`app/api/dorm/generate-item`, model via `DORM_VISION_MODEL` falling back to `OPENROUTER_MODEL`) → primitive-assembly spec (zod schema `lib/dorm/spec.ts`; `normalizeSpecCandidate` coerces model color quirks — names, rgb(), 3-digit hex, RGB arrays — before validation, color optional) rendered by the engine's `addCustomItem`; accepted items live in `dorm_items` + private `dorm-items` bucket. `three` pinned exactly 0.158.0; `DormStage` must only be imported via `next/dynamic` `ssr: false` (custom element defined at module scope). Engine treats unset `_autoRotate` as ON — push `false` on mount. |
| **Health** | Apple Watch health dashboard. Ingests Health Auto Export data (100+ metrics) into Supabase, shows 5 featured recharts charts (steps, RHR, HRV, sleep, active calories) + 4 summary stat cards, a metric search bar with generic auto-charts, and an LLM Q&A panel (OpenRouter). Tables: `health_metrics`, `health_ingest_log`. See "Health Dashboard" below. |
| **Internship Tracker** | Huntr-replacement: Kanban board, referral CRM, interviews, analytics, weekly goals, Sunday Resend digest. Plus an automated ingestion system (see below). One-click email unsubscribe (`email_subscribed` flag, signed-token route `app/api/internship/unsubscribe`); honored by the digest cron + ingestion email, with a toggle in SettingsPanel. Tables: `internship_applications`, `internship_contacts`, `internship_interviews`, `internship_activity_events`, `internship_documents`, `internship_tasks`, `internship_weekly_goals`, `internship_settings`, `internship_targets`. |
| **Public View** | Owner-only settings (`/apps/public-view`) that drive the public portfolio: resume link URL + heading/blurb, show/hide Currently Reading, and GitHub/LinkedIn/Instagram links. The public site reads them via `app/api/public/public-view` (service-role, no-store, scoped to `HEALTH_USER_ID`) through `components/portfolio/PublicSettingsProvider`. Table: `public_view_settings` (column defaults reproduce the old hardcoded values, so the site is unchanged until edited). |

Planned apps: business dashboard (agency/startup stats).

## LG TV Proxy

`lg-tv-proxy/` is a **separate Node.js server** (not part of the Next.js app) that exposes the LG TV's WebSocket API over HTTPS via a Cloudflare tunnel. It must be running independently for the LG Remote app to work.

- Start locally: `./start.sh` (runs on `localhost:3001`)
- Public tunnel: `./tunnel.sh` (Cloudflare, required for remote access from Vercel deploy)
- Config: `lg-tv-proxy/.env` — set `TV_IP`, `API_TOKEN`, `PORT`, `ALLOWED_ORIGINS`
- See `lg-tv-proxy/GUIDE.md` for full setup

## Health Dashboard

`/apps/health` — Apple Watch data via Health Auto Export → Supabase → recharts.

- **Ingest:** `app/api/health-ingest/route.ts` (POST). The iPhone app POSTs with no browser session, so this is the **only** route using the **service-role** Supabase client (`lib/supabase/admin.ts`) — it bypasses RLS. Auth is a shared bearer secret (`HEALTH_INGEST_SECRET`); every row is stamped with `HEALTH_USER_ID`. Idempotent upsert on `(user_id, metric_type, recorded_at)` so re-pushes don't duplicate.
- **Metric registry:** `lib/health/metrics.ts` — `NAME_MAP` translates Health Auto Export names (`step_count`→`steps`, `heart_rate_variability_sdnn`→`hrv`, etc.); unmapped metrics pass through under their own name so all 100+ land. `METRIC_DEFS` carries charting hints (aggregation: sum/avg/last, chart: bar/line). `FEATURED_METRICS` = the 5 hero charts.
- **Parsing:** `lib/health/parse.ts` — `sleep_analysis` arrives as intervals; normalized to hours/night.
- **Aggregation:** `lib/health/aggregate.ts` — daily rollup per metric's aggregation mode + 7-day rolling average. Read API: `app/api/health-data/route.ts` (featured mode, `?metric=` single mode, `?list=1` available-metrics mode) using the user's RLS-scoped server client.
- **LLM Q&A:** `app/api/health-ai/route.ts` — OpenRouter with a `get_metric` tool loop; the model requests the metrics it needs (keeps tokens bounded). Model via `OPENROUTER_MODEL` env (defaults `openai/gpt-4o-mini`). No medical disclaimer by design.
- **Charts:** recharts, themed via `--iven-*` tokens. Because recharts writes concrete colors into SVG, `components/health/useIvenColors.ts` resolves CSS vars off the live DOM (re-reads on theme toggle) — pass resolved colors, not `var(--iven-*)`, into chart fills/strokes.
- **Seed/test:** insert rows directly via the Supabase MCP for the user `8c08ce23-f5d6-4f78-9193-ef9191b2975c`; the page is OAuth-gated so it can't be screenshotted headlessly.

## Internship Ingestion

Automated Summer 2027 internship discovery for the Internship Tracker. Split into two halves: a scheduled **Claude cloud routine** (the intelligence — fetches sources, classifies postings) and a site **ingestion API** (the persistence — dedupes, inserts, holds secrets). All dedupe state lives in the DB so the stateless routine needs no memory.

- **Ingest API:** `app/api/internship/ingest/route.ts` (POST) — bearer auth (`INGEST_SECRET`), service-role admin client, stamps rows with `INTERNSHIP_USER_ID`. Season guard (`INGEST_ACTIVE_SEASON`, default `summer_2027`), URL-first dedupe with `company+role_title+location` fallback (helpers in `lib/internship/ingest.ts`), server-computed priority matrix (lane1/indy→high, chicago/austin/remote→medium, else low — never trust priority sent by the routine), 50-row cap freshest-first. Inserts as `stage='wishlist'`, `created_via='ingestion'`. Returns `{inserted, skipped_duplicates, skipped_season, capped, deadline_alerts}`.
- **Targets API:** `app/api/internship/ingest/targets/route.ts` (GET, same bearer) — serves active ATS targets from `internship_targets` (`ats_platform`/`ats_slug`); adding a row auto-expands the scraper.
- **Source fetcher:** `scripts/ingest-sources.ts` — deterministic fetch/normalize, run by the routine via `npx tsx`. vanshb03 and aprameyak publish `listings.json` (aprameyak uses `role`/`date_added` field names; the normalizer handles both); **sndsh404 has no JSON — it's parsed from its README markdown table**. Plus Greenhouse/Lever/Ashby public boards by slug. Failed sources are reported, not fatal. Community `listings.json` URLs roll over by cycle and need verifying at setup (Simplify currently omitted).
- **Daily proof-of-life email:** the API sends a personal-website-branded email (`lib/internship/ingest-email.ts`) only when the routine posts `first_run=true` (the routine sets this on the 12:00 UTC run only → one email/day). Reuses `RESEND_API_KEY`/`INTERNSHIP_DIGEST_FROM`; best-effort, never fails ingestion.
- **Digest fold-in:** `lib/internship/digest.ts` (the Sunday digest) has a "Newly discovered" section (ingestion rows, last 7 days) + Lane 1 deadline-pounce (≤7 days). The ingest API itself sends no digest.
- **Routine:** twice-daily cloud routine `trig_0179ApZ9ED79xq4yntWe8hkY` (`0 12,22 * * *` UTC = 08:00/18:00 Indiana). Prompt + setup in `scripts/ingest-routine.md`. **Secret coupling:** `INGEST_SECRET` must match in two places — Vercel env AND the routine prompt — or every run 401s.

## Hevy MCP Server

`app/api/mcp/route.ts` exposes a remote MCP (Model Context Protocol) server wrapping the Hevy workout-tracking API (`api.hevyapp.com`), for use as a Custom Connector in claude.ai chat/mobile — not a private app in the IVEN sense, just an API bridge.

- **Client:** `lib/hevy/client.ts` — thin fetch wrapper, reads `HEVY_API_KEY` server-side, never sent to the client. `searchExerciseTemplates` caches the full ~460-template list per warm lambda instance (1hr TTL) since Hevy paginates 10/page with no search endpoint.
- **Tools:** get/create/update routines, get/create routine folders, get workouts (read-only), search exercise templates.
- **Auth:** claude.ai's custom-connector UI only takes a URL, no custom headers, so the shared secret (`MCP_HEVY_SECRET`) is passed as a query param on the connector URL: `https://stephenonochie.com/api/mcp?key=<secret>`. Wrong/missing key → 404 (not 401, to avoid confirming the route exists).
- Register in claude.ai under Settings → Connectors → Add custom connector with that URL.

## Customizable Dashboard

The IVEN home (`/apps`, `components/iven/dashboard/DashboardHome.tsx`) is a **draggable react-grid-layout grid**, not the old hardcoded flexbox.

- **Widget registry:** `components/iven/dashboard/registry.tsx` lists every widget (id, label, component, default grid geometry). Add a widget by adding a registry entry; widgets self-fetch their own data.
- **Persistence:** layout + enabled-widget set saved (debounced) to the `dashboard_layouts` table per user; `lib/dashboard/layout.ts` loads/reconciles (drops removed widgets, slots new ones). `DEFAULT_ENABLED` reproduces the original arrangement so nothing regresses before the user edits.
- **Edit mode:** "Edit Layout" toggle enables drag/resize + an Add-widget picker + per-widget remove. While editing, widget `pointerEvents` are disabled so drags don't trigger clicks.
- **react-grid-layout is v2** (hooks API: `Responsive` + `useContainerWidth`, no `WidthProvider`). The published `@types/react-grid-layout` target v1 and don't match, so the module is typed locally in `types/rgl.d.ts`. Import its CSS (`react-grid-layout/css/styles.css` + `react-resizable/css/styles.css`).

## IVEN

IVEN is the live private app shell — a JARVIS-style personal OS replacing the old card-grid launcher. All apps are now IVEN modules.

- **Shell:** `app/apps/layout.tsx` wraps all private routes in `IvenDarkModeProvider` + `IvenShell` (70px icon sidebar + scrollable main area)
- **Sidebar:** `components/iven/IvenSidebar.tsx` — icon nav with flyout tooltips, settings gear (dark mode toggle + sign out), opens to the right of the sidebar
- **Module chrome:** `components/iven/IvenModule.tsx` — wraps each app page with eyebrow label, Playfair title, horizontal rule
- **Dashboard:** `app/apps/page.tsx` + `components/iven/dashboard/` — live widgets: clock hero, todo, standing timer, waves streak, weather, stocks/markets
- **CSS tokens:** `--iven-bg/surface/border/text/muted/accent/grid` in `globals.css`, toggled by `data-iven-theme="dark"` on the shell root
- **Fonts:** Inter (`font-inter`), Playfair Display (`font-playfair`), JetBrains Mono (`font-mono`) — all mapped in `tailwind.config.ts`. `font-display` is NOT defined; use `font-mono` for large monospaced numerals.
- **Native Clock module** forces dark theme via `data-iven-theme="dark"` on its wrapper div; uses `--nc-*` CSS vars internally
- **Default weather location:** Avon, Indiana — hardcoded fallback in `lib/native-clock/weather.ts` (`getDefaultCoordinates`); overridable via `NATIVE_CLOCK_LAT/LON/LOCATION` env vars
- **Stocks API** returns `{ quotes: [] }` — widgets must read `data.quotes`, not `data.stocks`
- **Weather API** returns `{ temperatureF, humidity, condition, location, weatherCode }` — no `temperature`, `high`, `low`, or `hourly` fields

## Key Conventions

- **Package manager is pnpm.** Vercel deploys with `pnpm install --frozen-lockfile`, which fails the build if `pnpm-lock.yaml` is out of sync with `package.json`. **Always add/remove deps with `pnpm add` / `pnpm remove`** (or run `pnpm install --lockfile-only` after editing `package.json`) and commit the updated `pnpm-lock.yaml`. Do NOT use `npm install` — it only updates `package-lock.json`, leaving the pnpm lockfile stale and breaking the deploy. (Both lockfiles are currently tracked; the pnpm one is the source of truth for CI.)
- Run dev server with `npm run dev`; build with `npm run build`; lint with `npm run lint`. No test suite exists.
- UI components come from shadcn/ui — add via `npx shadcn@latest add <component>`
- Supabase client helpers live in `lib/supabase/`; browser client in `client.ts`, server client in `server.ts`
- App-specific types in `/types/<app-name>.ts`; app-specific Supabase helpers in `lib/<app-name>/supabase.ts`
- **Dates are Eastern.** The whole site treats "today" as `America/New_York` so late-night entries land on the right calendar day. For any date-only `YYYY-MM-DD` string (e.g. `session_date`) use `easternDateStr`/`todayEastern` from `lib/dates.ts` — never `new Date().toISOString().slice(0,10)` (that's UTC and rolls over in the evening). Full timestamps (`started_at`, `ended_at`, `updated_at`, `recorded_at`) stay UTC via `new Date().toISOString()`. Date strings built from local wall-clock parts (calendar cells) use a plain local `YYYY-MM-DD` formatter, not the instant-zoning helper.
- Dialogs/modals that use Radix portals: scope CSS theme variables to the portal root, not just the trigger, to avoid transparent/unstyled overlays
- Supabase MCP is configured in `.mcp.json` — use it for schema inspection and running migrations during development

## What to Avoid

- Don't expose the private apps or suggest making them public — they are intentional personal tools
- Don't add comments explaining what code does; only add them for non-obvious WHY (hidden constraints, workarounds)
- Don't add error handling for scenarios that can't happen; trust framework guarantees
- No trailing summaries after completing a task — just do the work
