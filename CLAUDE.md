# CLAUDE.md

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
| **Native Clock** | Desk display: weather, stocks, NPR news tickers |
| **Standing Timer** | Stand/sit/break health cycles + stats |
| **Bubbles** | Ephemeral auto-expiring notes |
| **Todo** | Quick-capture tasks, natural-language due dates (`lib/todo/parse.ts`), Today/Inbox smart views, browser reminders. Tables: `todo_lists`, `todos` (Inbox = null `list_id`) |
| **Project Waves** | Daily 360 waves brushing routine: 3 timed sessions (morning/afternoon/evening) + weekly Wash Day, streak tracking, hair calendar, upcoming haircut schedule with Google Calendar links. Tables: `waves_settings`, `waves_sessions` |

Planned apps: business dashboard (agency/startup stats), health dashboard (Apple Health data).

## IVEN

IVEN is the evolution of the private app suite — a JARVIS-style personal OS interface for the backend. Rather than separate app pages, all tools surface as modules within a unified, aesthetically rich dashboard. The name IVEN is the project codename for this interface layer.

- Lives at `/app/apps/iven/` (or replaces the current app launcher)
- All existing apps (StyleMate, Native Clock, Todo, etc.) become IVEN modules
- New tools are built natively as IVEN modules from the start
- Visual direction: dark, futuristic, HUD-like — inspired by Iron Man's JARVIS UI
- Design goals: productivity-first with high visual polish; feels like a personal command center

## Key Conventions

- Run dev server with `npm run dev`
- UI components come from shadcn/ui — add via `npx shadcn@latest add <component>`
- Supabase client helpers live in `lib/supabase/`
- App-specific types in `/types/<app-name>.ts`
- Dialogs/modals that use Radix portals: scope CSS theme variables to the portal root, not just the trigger, to avoid transparent/unstyled overlays

## What to Avoid

- Don't expose the private apps or suggest making them public — they are intentional personal tools
- Don't add comments explaining what code does; only add them for non-obvious WHY (hidden constraints, workarounds)
- Don't add error handling for scenarios that can't happen; trust framework guarantees
- No trailing summaries after completing a task — just do the work
