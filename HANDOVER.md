# HANDOVER — CRON for Code

## Current verified state

- Repo: `C:\Users\clear\projects\CRON APPS\CRON for Code` — pnpm monorepo
  (packages: contracts, core, data-service, host-adapter + apps/standalone +
  shared). Branch `main`, up to date with origin/main.
- Product: governed AI coding workspace (OpenCode engine wrapper). Design truth:
  `CRON_CODE_UI_REDESIGN_SPEC.md` + `CRON_CODE_UI_REDESIGN_AUDIT.md`.
- Working tree after 29 Aug verification: `apps/standalone/dist-renderer/index.html`
  and `pnpm-workspace.yaml` modified. All `dist/` build outputs are gitignored.
  (The previously-claimed uncommitted 35-file UI slice is already committed —
  that HANDOVER note was stale.)

## Verified baseline (2026-08-29)

- typecheck ✓ | lint ✓ (0 errors, 3 pre-existing hook warnings in App.tsx)
- test ✓ (362 passed: contracts 24, data-service 94, host-adapter 23, core 221)
- build ✓ (regenerates a valid `dist-renderer` bundle)

## Completed

- Governed coding workspace: plain-english planning + safe catalogue command
  execution with approval gates, persistence, audit trail, changed-file evidence.
- Electron shell: single instance + gap-free restart handoff, tray, window-state
  persistence, isolated/sandboxed renderer, validated IPC pass, CRON-styled
  folder picker.
- UI: brand shell (header, left icon rail, centre screens, right Review panel),
  Planner chat, project browser, model settings, templates, my-apps, learn.
- Launcher: `launch.vbs` → `scripts\run-code-dev-hidden.ps1`, taskbar-pinnable.

## Genuine defects / unresolved (ranked)

- DONE 29 Aug:
  1. **OpenCode engine reachable from the UI** — verified: the live Planner
     (Layout → CronAssistant) triggers `runTask`; finding was pre-slice stale.
  2. **UI "Approve"/"Reject" resume the OpenCode session** — store now calls
     `replyToApproval` after resolving the record (Review panel was the dead
     surface; chat + tray paths were already correct).
  3. **Model payload asymmetry fixed** — `createSession` now sends `modelID`
     (was `id`); adapter tests assert the real contract.
- Remaining:
  4. **Packaging blank-window bug** — committed `dist-renderer/index.html` references
     missing/ignored build hashes. The `package` script does NOT build renderer or
     workspace packages first, and output goes to `${USERPROFILE}/Desktop`.
  5. **Dead code / orphaned surfaces** — `TaskRunner` (prod), and components
     Sidebar, LeftNav, WorkflowStrip, CronNavBar, CronFooter, TaskWorkspace,
     TaskComposer, EmptyState, ConfirmDialog, RenameDialog, LlmSettings shim.
     Project management (archive/rename/relink/refresh/reveal/copy-path) is
     implemented in the store but unreachable in the live UI.
  6. `powershell.script-test` catalogue entry is dead (forbidden executable).
  7. Placeholder/demo surfaces: AccountArea ("Alex Smith", hardcoded credits),
     Deployments (disabled publish), 4 of 5 right-sidebar tabs ("coming next"),
     "Speak to CRON" (disabled).

## Timeline estimate (living — 8-hour build days)

- **Critical path — the core coding promise, end to end** (wire the OpenCode
  trigger, make Approve resume the session, fix model routing + verify live):
  ~3–4 days.
- **Full app (README not-yet work + product surfaces):** preview/test/export/deploy
  guidance, live rollback/checkpoint restore, Intelligence handoff, reachable
  project management, real model settings/escalation, fill-or-remove right tabs.
  ~7–11 days.
- **Hardening & cleanup (packaging fix, dead-code retire, CSP, port default):**
  ~2–3 days.
- **TOTAL: ~15–20 working days full-time (~3–4 weeks).** Scope leaks if real auth
  or voice is included — those are open questions, not assumed.

## Single next step

- Packaging pass (defect 4): make `package` build the renderer + workspace
  packages first and output to a repo-local folder. Then dead-code retire (5).

## Evidence

- PROJECT_LOG.md (newest-first), README.md (status/not-yet lists), reference pack,
  launcher chain, renames verified. Baseline verification re-run 2026-08-29.
