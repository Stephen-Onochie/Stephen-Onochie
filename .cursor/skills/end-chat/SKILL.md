---
name: end-chat
description: Close a session cleanly — refines CLAUDE.md with anything new learned this session (conventions, components, apps, gotchas), then commits all changes and pushes to main. Use at the end of any working session to keep the project doc accurate and the repo up to date.
---

# End Chat

Wrap up this session: refine CLAUDE.md so it stays accurate and lean, then commit and push everything.

## Step 1 — Read the current CLAUDE.md

Read `CLAUDE.md` from the project root. Hold the full contents in mind.

## Step 2 — Identify what changed this session

Review the conversation to extract anything worth updating in CLAUDE.md:

- New components, files, or directories that were created
- New conventions or patterns that emerged (naming, structure, theming, etc.)
- New apps or features added to the private suite
- Gotchas, constraints, or non-obvious decisions that future-you should know
- Anything in the current CLAUDE.md that is now stale, wrong, or redundant

Do NOT include:
- A summary or log of what you did this session — CLAUDE.md is reference docs, not a changelog
- Ephemeral task details or one-off decisions
- Anything already derivable from the code

## Step 3 — Rewrite CLAUDE.md

Produce a refined version of CLAUDE.md that incorporates the relevant updates. The goal is a document that is **more accurate and no longer** than the original — edit in place, don't append. Specifically:

- Update tables, lists, and sections to reflect new state
- Remove stale entries
- Add new entries only when they carry information not obvious from the code
- Preserve the existing structure and tone
- Keep it tight — future sessions load this every time, so every line should earn its place

Write the updated file.

## Step 4 — Commit all changes

1. Run `git status` to see what's changed (never use `-uall`)
2. Run `git diff` to review staged and unstaged changes
3. Run `git log --oneline -5` to match the repo's commit style
4. Stage all modified and new files by name (avoid `git add -A` — be explicit)
5. Commit with a concise message following the repo's style. End the message with:
   ```
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
6. Push to `main` (`git push origin main`)

## Step 5 — Confirm

Tell the user in one sentence what was updated in CLAUDE.md and that the push succeeded. If there was nothing worth updating in CLAUDE.md, say so briefly rather than making a trivial edit.

## Notes

- If `git push` is rejected (e.g. remote has commits ahead), run `git pull --rebase` first, then push. Do not force-push.
- If there are no uncommitted changes at all, skip the commit/push and just update CLAUDE.md if needed (or confirm nothing to do).
- Never skip pre-commit hooks (`--no-verify`). If a hook fails, fix the issue before committing.
