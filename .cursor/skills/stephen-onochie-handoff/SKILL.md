---
name: stephen-onochie-handoff
description: >-
  Loads full Stephen-Onochie personal website context from docs/HANDOFF.md.
  Use when the user runs /handoff, invokes @stephen-onochie-handoff, or asks
  to load project handoff context for this repo.
disable-model-invocation: true
---

# Stephen-Onochie Handoff

Read the project handoff document and use its contents to answer questions or inform the current task. Do not summarize it into a shorter blurb — load the full content so you have accurate, complete information.

## Step 1: Read the handoff file

Read this file from the project root:

- `docs/HANDOFF.md` — Project identity, stack, directory map, routes, auth, private apps, Supabase, env vars, conventions, and roadmap.

## Step 2: Confirm context is loaded

After reading the file, briefly tell the user what you loaded (one sentence is enough, e.g. "Loaded handoff from docs/HANDOFF.md.") then proceed with the task.

## Notes

- If the file is missing, say so (the `docs/` folder is gitignored and may not exist on a fresh clone) and continue with whatever information is available from the codebase.
- The doc describes the intended state of the system. If you find discrepancies with actual code, trust the code and flag the doc as potentially stale.
