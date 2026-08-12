# CRON for Code — Restart and Entry Screen Repair Architect Slice

## Status

Approved defect repair.

## User evidence

Venessa manually tested the current CRON for Code runtime acceptance state on 2026-08-09.

Observed failures:

1. Restart fails.
2. The app opens on the working canvas instead of the entry screen with the card/actions to open or resume projects.

This fails manual acceptance.

## Goal

Repair only these two acceptance failures:

1. Restart must work from the visible app UI.
2. On normal launch/relaunch, CRON for Code must open to the entry/project-selection screen with clear cards/actions to open or resume projects, not directly into the working canvas.

## Acceptance

Venessa must be able to verify:

- Launch CRON for Code.
- The first visible screen is the entry/project-selection screen.
- It shows clear options/cards for opening or resuming projects.
- Selecting/resuming a project enters the working canvas.
- Pressing Restart from the visible UI closes/restarts and returns to a usable visible app.
- Restart does not blank the window.
- Restart does not open a duplicate broken instance.
- Restart does not touch Meds, Claims, Chat, Browser, or unrelated ports/processes.

## Boundary

Stay narrow.

Allowed:

- startup route/state selection;
- last-active project restoration behavior;
- restart button path from UI → store → host adapter → Electron/main/launcher;
- focused tests for startup screen and restart path;
- runtime diagnostics if needed;
- report/evidence/log updates.

Do not change:

- command execution safety model;
- approval model;
- project storage schema unless unavoidable and explicitly justified;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- package dependencies;
- unrelated UI redesign;
- Git state.

## Required diagnosis

Do not rely only on automated marker proof. Reproduce the user-visible failures.

Find and document:

1. Why the UI restart fails when Venessa clicks it.
2. Why startup restores directly into the working canvas.
3. Whether the current "last active project" behavior conflicts with the desired entry screen.
4. Whether dev restart handoff is only working through scripted intent files but not the visible UI button.

## Required repair

1. Make visible UI Restart work reliably.
2. Make normal launch land on the entry/project-selection screen.
3. Keep project data preserved; do not delete projects just to force a clean screen.
4. Keep the working canvas available after the user explicitly selects/resumes a project.
5. Show a visible bounded error if restart cannot complete.

## Verification

Run:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
git diff --check
git status --short
```

Also perform live runtime proof:

- launch from the real CRON for Code Dev shortcut/launcher;
- confirm entry/project-selection screen appears first;
- open/resume a project;
- click the visible Restart button;
- confirm app returns visible and usable;
- confirm no blank window and no duplicate broken instance;
- confirm unrelated CRON apps/processes are not touched.

If CC cannot click the native UI button directly, document that limitation and still provide the strongest possible runtime proof. Do not claim manual acceptance until Venessa confirms it.

## Report back

Create:

- `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_REPORT.md`
- `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

Report:

- root cause;
- exact files changed;
- verification results;
- live proof;
- remaining manual checks;
- no Git actions performed.

Do not claim full acceptance. Claim only ready for Architect review.
