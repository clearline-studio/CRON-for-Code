# CC Audit + Fix Prompt — CRON for Code

**Date:** 14 August 2026
**App:** CRON for Code
**Path:** `C:\Users\venes\projects\CRON APPS\CRON for Code`

---

## Rules

- Follow `AGENTS.md` if it exists
- **Do NOT ask for permission inside the project.** Just do the work.
- **When asking outside the project, max 10 lines so the approval button isn't clipped.**
- **After your work, update these log files with today's entry:**
  1. `PROJECT_LOG.md` — date, what was done, key findings, current state
  2. `CRON_ARCHITECT_LOG.md` — date, summary, stage call, trust score, priority fixes
- Do NOT commit or push. Venessa commits manually.
- **CRITICAL: There is legacy code that uses `child_process.exec` with shell — this is a security landmine. Find it and delete it if nothing references it.**

---

## Step 1 — Audit

Run these first:
- `npm test` or whatever the test command is — how many pass? Which fail?
- `git status` — what's uncommitted?

Then read the codebase and report:
1. Every failing test (file, test name, why it fails)
2. Every use of `child_process.exec` or `eval` — file, line, what it does, is it used?
3. Every dead/unused file or component
4. The restart button — where is it? Is it wired?
5. The tray menu — where is it? Are listeners wired?
6. Every TODO/FIXME/HACK
7. Any security concerns (shell commands, eval, unsanitized input)

## Step 2 — Fix

After the audit, fix everything safe to fix:
1. **Delete the legacy CommandExecutor** if nothing references it (the `child_process.exec` security landmine)
2. Fix failing tests if the fix is obvious
3. Delete dead code (unused files, unused exports, stale backups)
4. Wire the restart button if it's simple
5. Wire the tray menu listeners if simple
6. Clean up any other issues found

**Do NOT fix things that require architectural decisions** — flag those for Venessa.

## Step 3 — Verify

After fixing:
- Run the test suite — must pass (or no regressions from what was passing)
- `git diff --stat` — show what changed

## Step 4 — Report

Write `CC_CODE_AUDIT_AND_FIX_REPORT.md` with:
- Before state (failing tests, security issues, dead files)
- What you fixed (every file, every change)
- After state (test results, remaining issues)
- Security verdict (is the child_process.exec gone?)
- What's left that Venessa should decide on

---

**19 files are uncommitted. The child_process.exec is a security risk. This work must be clean before we commit.**
