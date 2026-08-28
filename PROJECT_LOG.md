
---

## 2026-08-29 (later) - Findings 1-3 fix pass

- #1 (OpenCode not reachable from the UI) — resolved by verification: the live
  Planner (Layout → CronAssistant) already triggers `openCodeRunner.runTask`
  (handoff card + auto-handoff); the audit's finding predates the committed UI
  slice. No code needed.
- #2 (Approve did not resume) — fixed: `store.approveApproval`/`rejectApproval`
  now reply to the OpenCode session (`replyToApproval`) after resolving the DB
  record when the approval is OpenCode-backed (same guard as trayStopTask).
  Chat + tray paths were already correct; the Review panel surface is now live.
- #3 (model payload asymmetry) — fixed: createSession sends `modelID` (was
  `id`); the mock server side now validates the real contract and asserts the
  request body. New tests: adapter 3/3, store 17/17 (2 new resume tests).
- Verification gate green: typecheck ✓ | lint ✓ (0 errors, 3 pre-existing
  warnings) | test ✓ (362+) | build ✓ (valid dist-renderer bundle).

- Audited the real code (data-service/OpenCode engine, core UI, Electron shell)
  and ran the full verification suite on a freshly built workspace:
  - typecheck ✓ | lint ✓ (0 errors, 3 pre-existing `react-hooks/exhaustive-deps`
    warnings in App.tsx) | test ✓ (362 passed: contracts 24, data-service 94,
    host-adapter 23, core 221) | build ✓.
- Unblocked pnpm verification: fixed a literal placeholder in `pnpm-workspace.yaml`
  (`electron-winstaller: set this to true or false` → `true`).
- Verified defect: committed `dist-renderer/index.html` references missing
  build hashes (`index-Cq3PZoEX.js` / `index-DPulWfBg.css`, gitignored) → a
  packaged production app renders a blank window until built. `pnpm build`
  regenerates it correctly.
- Top findings for the build:
  1. OpenCode coding engine is not reachable from the shipped UI (no component
     calls `openCodeRunner.runTask`; `cron:opencode:run-task` is manual-only).
  2. UI "Approve" does not resume an OpenCode session (approve resolves the DB
     record only; only tray Stop sends an OpenCode reply — a reject).
  3. OpenCode model payload asymmetry (`model.id` vs `model.modelID`) + runner
     pinned to `deepseek-v4-flash` (V4 Pro escalation intentionally blocked).
- Working tree after build: `apps/standalone/dist-renderer/index.html` +
  `pnpm-workspace.yaml` modified. dist/ build outputs are gitignored.

Unknown at this point: none blocking.

## 2026-08-28 - Aligned to the project Gem model

- Charter replaced: `AGENTS.md` is now the project Gem charter (clock check, reference pack, autonomy, launcher duty, git boundaries, Friday status).
- `reference/` pack added (soul, nessa, guardrails, workflow).
- Launcher standardised: `launch-cron-for-code-dev.vbs` -> `launch.vbs` (same runner chain `scripts\run-code-dev-hidden.ps1`); taskbar pin updated; `Launch-CRON-for-Code-Dev.bat` retired to `_dump_`.
- 65 legacy slice docs retired to `_dump_` (old MIMO/CC bridge log, session starters, report+evidence pairs). `CRON_CODE_UI_REDESIGN_SPEC.md` + `AUDIT.md` kept as the design truth. PROJECT_LOG remains the single story.
- Pre-edit snapshot of the uncommitted UI-redesign slice (35 files) saved to `backups/pre-alignment-20260828/` - nothing uncommitted was touched.
- HANDOVER created, gitignore updated (`backups/`, `_dump_`, `unrecon_nessa.md`).
# PROJECT LOG â€” CRON for Code

Append-only execution log. Preserved history + fresh-session resume-audit entry.
