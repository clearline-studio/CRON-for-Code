# CRON for Code — Dev Restart Blank-Window Runtime Repair Report

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 17:10 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task class:** Approved narrow runtime defect-repair slice.
**Classification:** `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE` (implementation complete and proven at every CC-drivable boundary; the real Restart-button click ×2 gate cannot be exercised by CC because Chromium does not expose its DOM to Windows UI Automation without an unapproved flag — see §22).

---

## 1. Final status
`IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

## 2. Repository identity
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used
Full verbatim task prompt stored in `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`) and in `CRON_ARCHITECT_LOG.md` (Dev Restart Blank-Window Runtime Repair checkpoint, same section).

## 4. Complete CRON Architect Log — Verbatim
See `CRON_ARCHITECT_LOG.md` in full. This slice appends the `Dev Restart Blank-Window Runtime Repair — 2026-08-07 17:10` checkpoint (prompt verbatim, root cause, repairs, tests, live proof, updated decision history). Prior entries remain verbatim and unchanged.

## 5. Initial working-tree state
Pre-slice: 37 modified / 3 deleted / 58 untracked (98 changes). Nothing staged. Post-slice: 37 modified / 3 deleted / 60 untracked (+2 new: report, evidence). Nothing staged, nothing committed, nothing pushed.

## 6. User-verified defect
After the Re-link repair, Venessa clicked `CRON Restart` (~17:38): the app closed, a new window opened with the frame + title `CRON for Code`, but the renderer content was completely blank/dark. The Restart implementation was not accepted.

## 7. Healthy normal-launch baseline
Launcher-driven start (16:38/18:05 runs): dev.mjs → Vite (port 5190) → `pnpm exec electron .` from `apps/standalone` → main.mjs registers 34 channels → marker written → renderer loads `http://127.0.0.1:5190/` → `cron:diag:ready` → marker `windowReady=true`, `rendererReady=true`, `rendererUrl=http://127.0.0.1:5190/`. The launcher waits for the renderer-ready + IPC-ready marker before exit 0.

## 8. Blank-window restart reproduction
Live captured state after Venessa's click (17:38), before any edit:
- Old stack: vite 25836 / electron 41120 / dev 50524 (healthy, marker rendererReady=true at 16:39).
- Electron log: `[07:38:18] Tray destroyed` — the old main's quit sequence.
- New instance: **electron 43264** (started 17:38:18, cmdline `electron.exe .`), NO dev.mjs, NO Vite, port 5190 free.
- Marker: pid=43264, **rendererReady=False, rendererUrl empty**, no startup error field (old main had no diagnostics).
- The window on screen: frame + title `CRON for Code`, blank content — exactly Venessa's report.

## 9. Exact root cause
`cron:app:restart` used `app.relaunch()` + `app.quit()`. In dev, Electron is a child of `dev.mjs`, which tears down the owned Vite when the Electron shim exits (`dev.mjs` 59-62: `electronProcess.on('close') → killTree(viteProcess.pid); process.exit(0)`). Sequence proven live:
1. 17:38:18 — old main quits (`Tray destroyed`); `app.relaunch()` spawns electron 43264.
2. The `pnpm exec electron .` shim exits → dev.mjs kills Vite + exits.
3. Electron 43264 starts with no Vite on 5190 → the dev URL load fails → visible frame + title with a blank renderer; `cron:diag:ready` never reached.
The launcher's healthy path never participated in Restart.

## 10. Normal-launch vs restart-launch comparison
| Aspect | Launcher start (healthy) | Old Restart (`app.relaunch`) |
|---|---|---|
| Electron spawner | launcher / dev.mjs | Electron itself (orphan) |
| Vite lifecycle | started + supervised by dev.mjs | killed by dev.mjs when the old Electron exits |
| Renderer URL | `http://127.0.0.1:5190/` (live Vite) | same URL but dead port → blank |
| Readiness gate | launcher waits for renderer-ready marker | none (blank window left open) |
| Health checks | marker hash/channel/renderer checks | none |
| Single-instance lock | re-acquired after replace | raced the dying instance |

## 11. Restart lifecycle repair
One authoritative dev restart path:
- Dev (`IS_DEV`): `cron:app:restart` now (1) flushes persistence + records `app.restart_requested` (existing), (2) writes `.runtime/code-dev-restart-requested.json` (restart intent: pid + requestedAt), (3) spawns the approved launcher `scripts/run-code-dev-hidden.ps1 -Port <port>` detached + hidden (`spawn('powershell.exe', [...])`, `windowsHide`, `detached`, `unref`), (4) `app.quit()`. No `app.relaunch()` in dev.
- Production (non-dev): `app.relaunch()` + `app.quit()` retained (no dev.mjs teardown exists in packaged mode).
- Launcher: `Test-DevRestartRequested` (fresh within 300s) forces `health=stale` → existing replace flow (owned Electron only, `Stop-Process` of the owned scan result, fresh-stack fallback, `Wait-ForMainMarker`); `Clear-DevRestartRequested` consumes the intent. Determinism: the replace branch now waits (bounded 15s) for the owned `dev.mjs` to exit before deciding reuse-vite vs fresh-start, eliminating the race where the old dev.mjs tears down Vite after the new Electron starts.
- Renderer surface unchanged: `restartApp()` only; coalescing via `isRestarting` in store + main; no arbitrary process/shell exposure.

## 12. Renderer URL and readiness repair
- `attachRendererStartupDiagnostics` (dev-only, narrow): records `targetUrl`, `did-start-loading`, `did-finish-load` with `webContents.getURL()`, `did-fail-load` (code/description/url), `render-process-gone` reason, `preload-error`, console error summary (240-char slice, level 3 only — no payload content).
- Renderer-ready watchdog: 30s after `did-finish-load`, if `cron:diag:ready` was not reached, the marker records `lastStartupError: renderer did not become ready within 30000ms of did-finish-load (url=...)`. A URL mismatch against the expected dev URL also records a startup error. `did-fail-load` records the error directly.
- `lastStartupError` classifies the marker as `broken`: `Wait-ForMainMarker` fail-fasts (bounded failure, exact error logged under `.runtime`), and the next launcher run replaces the owned broken instance.
- Readiness is mandatory: the launcher only reports success after `windowReady + rendererReady + current hashes + all required channels + no startup error`.

## 13. Runtime marker/startup diagnostics
Marker now includes: `targetUrl`, `rendererUrl`, `windowReadyAt`, `rendererReadyAt`, `lastStartupError`, `lastFailedLoadUrl`, `rendererGoneReason`, `preloadError` (plus existing pid/hashes/channels/registrationError). Live proof:
- Healthy: `rendererUrl=http://127.0.0.1:5190/`, `windowReady=True`, `rendererReady=True`, `lastStartupError=''`.
- Dead-URL instance (controlled test, port 59998): marker `rendererReady=False`, `rendererUrl='http://127.0.0.1:59998/'`, `lastStartupError='did-fail-load -102 ERR_CONNECTION_REFUSED'` then the watchdog message; launcher classified `health=broken` → replaced → fresh healthy stack.

## 14. State-preservation proof
Across all live cycles the dev store kept the same 3 project records with identical archived flags (Meds archived, Claims-295 archived, Claims-296 active), `lastActiveProjectId=proj_1786063530296_t62fq0`, tasks/approvals/executions empty as before, LM Studio preferences untouched. The only audit additions during the whole session were the two `app.restart_requested` events (16:06:22 and Venessa's 17:38:17 click — the intended restart audit). No duplicates, no archive corruption.

## 15. Re-link/project-list regression proof
Re-link → Cancel remains a structured no-op: relink-flow tests (6), store tests (cancel exact no-op; no red banner; loading cleared; list/active/pref unchanged), host-adapter result tests, and the static assertions all pass. `cron:project:unarchive` remains registered (34 channels, live marker) and picker-free. Project picker/archive/relink/rename/copy/reveal/refresh tests all green.

## 16. Live restart ×2 proof
The repaired lifecycle was exercised live three times with the final code (18:06:16, 18:06:58, 18:18:26), each via the exact handoff the new `cron:app:restart` handler performs (intent marker + launcher spawn):
- Log: `In-app restart requested (intent marker present). Replacing the owned dev stack.` → replace owned Electron → fresh stack → `App ready (electron PID …, renderer-ready marker confirmed)` → exit 0.
- After each: marker `windowReady=True, rendererReady=True, rendererUrl=http://127.0.0.1:5190/`, 34 channels, 8/8 required, no startup/registration errors; exactly one owned Electron main + one dev.mjs + one Vite; intent file consumed.
- The physical `CRON Restart` button click could NOT be driven by CC: Windows UI Automation finds the window (`Chrome_WidgetWin_1`, "CRON for Code") but Chromium does not expose the DOM accessibility tree to UIA (4 native children only); enabling it requires an unapproved `--force-renderer-accessibility` switch. The button → store → IPC → handler path is covered by tests; the click itself is Venessa's remaining gate.

## 17. Process/port/AUMID safety proof
Port 5190 owned by the repo Vite throughout every cycle (37468 final). AUMID `com.cron.code.dev` verified live on the renderer (`--app-user-model-id=com.cron.code.dev`). Dev userData `CRON for Code Dev` unchanged. Production `CRON for Code.exe` PIDs 9032/11552/25456/28260 untouched across all launches. Unrelated CRON apps untouched. Exactly one owned dev Electron main at all times after each replacement. No `taskkill`; only the owned Electron main PID (from the owned scan) is ever stopped.

## 18. Tests/build/quality results

| Command | Exit | Result |
|---|---|---|
| `pnpm test` | 0 | 242 tests (contracts 24, host-adapter 23, data-service 74, core 121) |
| `pnpm typecheck` | 0 | all packages clean |
| `pnpm lint` | 0 | 0 errors, 2 pre-existing warnings |
| `pnpm build` | 0 | packages + renderer |
| `pnpm format:check` | 0 | no-op `echo ok` |
| launcher harness | 0 | all assertions (incl. new restart-intent + startup-error) |
| PowerShell parser checks + `node --check` | 0 | clean |
| `git diff --check` | 0 | clean |
| Narrow secret scan | 0 | no matches |
| Suspicious/generated-path scan | 0 | clean |

Notes: two transient full-suite failures were the KNOWN pre-existing load-dependent flakes (vitest `onTaskUpdate` worker timeout; `execution-service` syntax-check test 5s timeout) — both passed on isolated re-run and the final full run exited 0.

New focused tests: launcher harness +10 assertions (restart intent fresh/stale/missing/cleared; `lastStartupError` → broken; launcher source contract for intent file, `Test/Clear-DevRestartRequested`, `In-app restart requested`); `repo-stabilisation.test.ts` +2 (dev Restart converges on launcher, no `app.relaunch` in dev path, diagnostics listeners + 240-char slice guard).

## 19. Exact files changed
- `apps/standalone/electron/main.mjs` — restart handler dev/prod split (`restartViaLauncher` vs `app.relaunch`); restart-intent file + launcher spawn (detached/hidden, port from env); `attachRendererStartupDiagnostics` (did-start/finish/fail-load, render-process-gone, preload-error, console errors, URL-mismatch, 30s renderer-ready watchdog); marker fields (`targetUrl`, `rendererUrl`, `windowReadyAt`, `rendererReadyAt`, `lastStartupError`, `lastFailedLoadUrl`, `rendererGoneReason`, `preloadError`).
- `scripts/code-dev-launcher-logic.ps1` — `lastStartupError` in marker read + `broken` health classification; `Test-DevRestartRequested` / `Clear-DevRestartRequested`; intent max-age constant.
- `scripts/run-code-dev-hidden.ps1` — restart-intent handling (force replace + consume); `Wait-ForMainMarker` fail-fast on `lastStartupError`; replace branch waits for the old `dev.mjs` teardown (bounded) before the reuse-vite decision.
- `scripts/test-code-dev-launcher.ps1` — +10 assertions.
- `packages/core/src/repo-stabilisation.test.ts` — +2 static assertions.

## 20. Exact files created
- `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_REPORT.md`
- `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_EVIDENCE.md`

## 21. Protected boundaries preserved
Port `5190`; AUMID `com.cron.code.dev`; dev userData `CRON for Code Dev`; production untouched; launcher + runtime-marker architecture extended (not replaced); single-instance behavior; all IPC handlers including `cron:project:unarchive` (34 channels live); re-link structured cancel; project-list preservation; archive/relink/last-active semantics; execution/approval/audit/LM Studio untouched; sandbox/contextIsolation; narrow preload (renderer still only has `restartApp()`); shell layout unchanged; no new dependencies; no Git mutations.

## 22. Remaining gaps
1. **The real Restart-button click (×2) is the single remaining gate.** CC cannot drive it: Chromium does not expose its DOM to Windows UI Automation (window found; 4 native children; button absent), and enabling it would require an unapproved `--force-renderer-accessibility` flag. Every other hop of the repaired lifecycle is proven live (three consecutive handoff cycles, all renderer-ready) and by tests (button → store → host adapter → IPC → handler). Venessa's two clicks will confirm visual acceptance.
2. `pnpm format:check` remains a no-op stub (pre-existing).
3. Two `.before-aumid-fix` backup files remain (pre-existing, untracked).

## 23. Final self-audit
Correct repo/branch/HEAD; nothing staged; working-tree counts 37/3/60 (was 37/3/58; +2 this slice), every changed path classified; pre-existing work preserved. Blank-window root cause proven live (electron 43264 with no Vite, marker not ready, `Tray destroyed` at 17:38:18). Normal-launch vs restart-launch compared. Restart converges on the authoritative launcher lifecycle. Correct renderer URL loads (`http://127.0.0.1:5190/`, live marker). Renderer-ready marker required and reached. No blank window remains. Restart handoff proven three consecutive times; the literal button click ×2 is CC-undrivable (environment limitation, documented). Exactly one dev stack at all times. Active project restored / fallback per prior slice; project list preserved; no duplicates/archive corruption; tasks/approvals/executions/audit/LM Studio preserved (only the intended restart audits added). Re-link Cancel still harmless. All 34 channels registered incl. `cron:project:unarchive`; marker healthy. Port 5190; AUMID `com.cron.code.dev`; production/unrelated untouched. Tests/build/lint/typecheck exit 0; launcher tests pass; `git diff --check` clean; logs/reports updated; exact prompt preserved; no prohibited Git action occurred.

## 24. Git safety statement
Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred. All Git commands were read-only.

## 25. Exact next action
`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
