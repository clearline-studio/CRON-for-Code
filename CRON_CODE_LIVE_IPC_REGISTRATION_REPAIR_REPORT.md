# CRON for Code — Live IPC Registration and Stale Electron Replacement Repair Report

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 15:10 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task class:** Approved narrow runtime defect-repair slice — `Live IPC Registration and Stale Electron Replacement Repair`.
**Classification:** `READY FOR ARCHITECT REVIEW`

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

## 2. Repository identity

Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used

Full verbatim task prompt stored in `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`) and in `CRON_ARCHITECT_LOG.md` (Live IPC Registration and Stale Electron Replacement Repair checkpoint, same section).

## 4. Complete CRON Architect Log — Verbatim

See `CRON_ARCHITECT_LOG.md` in full. This slice appends the `Live IPC Registration and Stale Electron Replacement Repair — 2026-08-07 15:10` checkpoint (prompt stored verbatim). Prior entries remain verbatim and unchanged.

## 5. Initial working-tree state (before this slice)

88 changes: 37 modified tracked files, 3 deleted tracked files (dist-renderer assets), 48 untracked. All pre-existing uncommitted work preserved. Nothing staged.

## 6. User-verified defect

Venessa clicked `CRON Restart` in the live CRON for Code Dev window and saw:

```
Error invoking remote method 'cron:app:restart': Error: No handler registered for 'cron:app:restart'
```

The other project-management actions failed the same way. The renderer/preload surface was current, but the live Electron main process did not have the new IPC handlers.

## 7. Live main-entry proof

Live process inspection (2026-08-07, before any edit):

- dev `dev.mjs`: PID 47776, started 10:45:14
- dev Vite: PID 52756 (port 5190), started 10:45:15
- dev Electron main: **PID 39696** (`"...electron.exe" .`), started **10:45:18**
- renderer: PID 48280 with `--user-data-dir="...CRON for Code Dev"` and `--app-user-model-id=com.cron.code.dev`
- `apps/standalone/electron/main.mjs` LastWriteTime: **11:38:39** (the file containing the 8 new handlers)
- `apps/standalone/electron/preload.cjs` LastWriteTime: 11:37:20
- `.runtime/code-dev-main-marker.json`: **absent**
- `.runtime/code-dev-state.json`: `{"port":5190,"electronPid":39696,"vitePid":52756,"devPid":47776}`
- Launcher log: `surface-running` at 11:19, 14:54, 14:57 — always reusing Electron 39696.

**Conclusion (proven, not inferred):** the running Electron main loaded the `main.mjs` file as it existed at 10:45 — before the eight required IPC handlers were added at 11:38. Electron does not reload `main.mjs` from disk; the process keeps the in-memory module. The renderer/preload, served fresh by Vite and reloaded after 11:38, invoke the new channels — which the old main never registered.

## 8. Handler-registration root cause

1. **Wrong in-memory main**: PID 39696 loaded the old `main.mjs` (no `cron:app:restart`, no `cron:project:*`). Handler registration code existed only in the source file written at 11:38, which the live process never executed.
2. **No startup registration diagnostics**: the previous main did not log or record which channels it registered; nothing could detect the mismatch.
3. **No runtime identity marker**: no persisted proof of which main build was running, so staleness was invisible to the launcher.
4. **Launcher health = window exists**: `Resolve-DevAction` returned `surface-running` whenever an owned Vite + owned Electron existed, regardless of whether the main process was current.

## 9. Stale Electron reuse root cause

The launcher treated "owned Electron main + owned Vite + window present" as healthy. Evidence (`.runtime/code-dev-launcher.log`):

```
[11:19:05] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
[14:54:34] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
[14:57:17] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
```

Each launch surfaced the stale window via the single-instance lock (`Start-DevElectron` spawns a second instance that exits; the old window is shown). The old main never restarted, so the new handlers never registered. A window title or live PID alone was treated as "healthy" — exactly the gap the task required closing.

## 10. Main-process registration repair

`apps/standalone/electron/main.mjs` now:

- **`registerCronIpcHandlers()`** — a single deterministic registration pass, called exactly once inside `app.whenReady()` (after services are initialized), guarded by `createIpcRegistrar` (`apps/standalone/electron/register-ipc.mjs`):
  - `begin()` throws if called twice (registration allowed exactly once);
  - `register(channel, handler)` rejects duplicates and records per-channel failures;
  - `complete()` verifies all eight required channels and throws loudly otherwise (no partial silent registration);
  - dev logs `IPC handler registration complete: N channels registered` after success;
  - on failure the error is logged, recorded in the runtime marker (`registrationError`), and the window still opens so the renderer can surface the visible message.
- **Dev runtime marker** — `.runtime/code-dev-main-marker.json` (dev-only), containing app version, main-process PID, sha256 of `main.mjs` and `preload.cjs`, the full registered channel list, the required eight, startup timestamp, `windowReady`, `rendererReady`, and `registrationError`. Rewritten on registration completion, on `ready-to-show`, and on renderer `cron:diag:ready`.
- **Narrow diagnostic channels** — `cron:diag:marker` (returns only the marker fields above) and `cron:diag:ready` (renderer readiness signal). No arbitrary internals, no secrets, no process/shell surface.
- The `cron:app:restart` handler is unchanged in behavior (flush → audit `app.restart_requested` → `app.relaunch()` + `app.quit()`, `isRestarting` guard).

Renderer side:
- `apps/standalone/src/ipc-data-service.ts` `initialize()` now reads `cron:diag:marker` and throws the preferred message when channels are missing or `registrationError` is set.
- `apps/standalone/src/main.tsx` calls `cron:diag:ready` after first render.
- `packages/core/src/components/App.tsx` init catches failures and renders them via the existing ErrorBanner (visible, dismissible).

## 11. Runtime marker and readiness proof

Live marker after the repaired launch (`.runtime/code-dev-main-marker.json`):

```json
{
  "appVersion": "1.1.7",
  "pid": 51864,
  "mainHash": "5c7dbd5652d8ac4921cc5e2ded90db569481bec108073ffc34c06694990e0ef8",
  "preloadHash": "f8542758f883a65cd5dfd3289f8d6f6a94f29aee5ee810b35b22a6243d8a3c48",
  "registeredIpcChannels": [ 33 channels ... ],
  "requiredChannels": [ "cron:app:restart", "cron:project:reveal", "cron:project:copy-path",
                        "cron:project:refresh", "cron:project:rename", "cron:project:relink",
                        "cron:project:archive", "cron:project:restore-last-active" ],
  "startupTimestamp": 1786081392496,
  "windowReady": true,
  "rendererReady": true,
  "registrationError": null
}
```

- All eight required channels present in `registeredIpcChannels` (verified programmatically).
- `rendererReady: true` proves the real renderer bootstrapped and successfully invoked `cron:diag:ready` through the real preload → main path (the renderer process carried `--app-user-model-id=com.cron.code.dev`, `--user-data-dir="...CRON for Code Dev"`, `--enable-sandbox`).
- Dev electron log: `[INFO] IPC handler registration complete: 33 channels registered`.

## 12. Launcher stale-process replacement

`scripts/code-dev-launcher-logic.ps1` gains:

- `$script:DevRequiredIpcChannels` (the eight).
- `Read-DevMainMarker` (strict-mode-safe marker reader; missing/corrupt → `exists=$false`).
- `Resolve-DevElectronHealth` — `'healthy' | 'stale' | 'broken' | 'starting' | 'none'`:
  - `stale` — marker missing, pid mismatch, or main/preload source hash differs from the current files;
  - `broken` — marker current but required channels missing;
  - `starting` — current + complete but renderer not yet ready;
  - `healthy` — current + complete + renderer-ready.
- `Test-DevMainMarkerReady` and `Get-DevMissingIpcChannels`.
- `Resolve-DevAction` honours `Health`: a stale/broken owned Electron is replaced **even when Vite is alive** (previously only replaced when Vite was missing).

`scripts/run-code-dev-hidden.ps1`:

- computes current sha256 of `main.mjs` + `preload.cjs`, reads the marker, classifies health, logs `Stale dev main detected (...)` / `Broken dev main detected - missing required IPC channels: ...`.
- `replace-stale-electron` branch: `Stop-Process` only the owned Electron main PID (from the owned scan), bounded 15s poll until no owned Electron main remains, reuse owned Vite if it survived else fresh-start, then `Wait-ForMainMarker` (90s) requiring pid match + current hashes + all required channels + `rendererReady`.
- every launch path (`fresh-start`, `reuse-vite`, replace) ends with `Wait-ForMainMarker`; `surface-running` only for `healthy` (a `starting` instance is waited on).
- foreign/production/unrelated processes can never be candidates: all PID discovery is filtered to the repo root command line; only the owned Electron main PID is ever passed to `Stop-Process`. No `taskkill`.

Live proof (launcher log):

```
[15:43:04] Stale dev main detected (marker missing ...): current main hash=5C7DBD... marker main hash=.
[15:43:04] Lifecycle decision: replace-stale-electron (vite=52756 electron=39696 dev=47776 health=stale).
[15:43:05] Replacing only this repo's stale/broken owned Electron process (PID 39696).
[15:43:07] Starting a fresh dev stack on port 5190.
[15:43:20] App ready (electron PID 48776, renderer-ready marker confirmed). Launcher completed.
```

Healthy relaunch proof:

```
[15:44:30] Lifecycle decision: surface-running (vite=50564 electron=48776 dev=43128 health=healthy).
[15:44:31] A healthy current dev stack is already running ... Surfacing the window via the single-instance lock.
```

Stale-marker simulation proof (tampered `mainHash`, kept pid):

```
[15:47:52] Stale dev main detected ... marker main hash=STALE-MARKER-SIMULATION-...
[15:47:52] Lifecycle decision: replace-stale-electron (vite=50564 electron=48776 dev=43128 health=stale).
[15:47:52] Replacing only this repo's stale/broken owned Electron process (PID 48776).
```

The simulation also exposed a stop-check race (a single 2 s check after `Stop-Process` could still see the dying tree); the replace branch now polls up to 15 s. The subsequent launcher run completed `fresh-start` and the marker self-healed to the current source hash (`5c7dbd56...`).

## 13. Restart proof

- Live: `cron:app:restart` is listed in the live marker's `registeredIpcChannels`; the dev electron log records 33 channels registered. A live click is Venessa's manual step (not claimed by CC).
- Tests: restart button invokes the host bridge; duplicate restart requests coalesce (store `isRestarting` + main `isRestarting` guard); restart flushes persistence (`dataService.flush()` before relaunch); one relaunch only (`app.relaunch()` + `app.quit()` on `setImmediate`, guarded); active-project restore is covered by the last-active restore tests.

## 14. Project-action proof

- Live: all eight channels (`cron:project:reveal`, `copy-path`, `refresh`, `rename`, `relink`, `archive`, `restore-last-active`, `cron:app:restart`) are registered by the live main (marker + registration log).
- Tests: store/host-adapter tests cover reveal/copy/refresh/rename/archive/relink routing through the host bridge with ids only; the standalone `project-management.test.tsx` suite (20 tests) and host-adapter suite (21 tests) remain green.
- The renderer never submits paths; the folder picker for re-link runs in main. No raw Electron APIs are exposed by the preload.

## 15. Process/port/AUMID safety proof

- Port `5190` owned by the repo's Vite throughout (52756 → 50564 → 26360).
- AUMID `com.cron.code.dev` verified live on renderer processes (`--app-user-model-id=com.cron.code.dev`).
- Dev userData `CRON for Code Dev` unchanged.
- Production `CRON for Code.exe` PIDs 9032/11552/25456/28260 untouched across all launches.
- Unrelated CRON apps untouched: CRON for Meds Vite 15540, CRON for Claims Vite 43592, CRON for Chat Vite 20636 remained alive. (CRON for Browser Electron 50600 exited independently during the slice; its command line does not match this repo, so the launcher could never select it.)
- No duplicate app stack: after every launch exactly one owned dev Electron main exists (39696 → 48776 → 51864), each replacement waiting for the previous to stop.
- No `taskkill`, no registry writes, no shortcut changes.

## 16. Tests/build/quality results

| Command | Exit | Result |
|---|---|---|
| `pnpm test` | 0 | 220 tests (contracts 24, host-adapter 21, data-service 74, core 101) |
| `pnpm typecheck` | 0 | all 7 workspace packages clean |
| `pnpm lint` | 0 | 0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings |
| `pnpm build` | 0 | packages + standalone renderer built |
| `pnpm format:check` | 0 | no-op `echo ok` (pre-existing) |
| `scripts/test-code-dev-launcher.ps1` | 0 | all launcher logic/source assertions pass (incl. 15 new marker/health assertions) |
| PowerShell parser checks (`[scriptblock]::Create`) | 0 | all three scripts parse |
| `node --check` main.mjs/preload.cjs/register-ipc.mjs | 0 | clean |
| `git diff --check` | 0 | clean |
| Narrow secret scan | 0 | no matches |
| Suspicious/generated-path scan | 0 | no new absolute user paths outside the repo evidence |

New focused tests:
- `packages/core/src/main-ipc-registration.test.ts` — 11 tests: channel lists; all channels register; once-only registration; duplicate rejection; failure surfacing (handle throws); missing-required verification; out-of-pass registration rejected; marker channel list; `complete()` lifecycle.
- `scripts/test-code-dev-launcher.ps1` — +15 assertions: stale/broken action resolution with Vite alive; health classification (none/stale×3/broken/starting/healthy); readiness; missing-channel diagnostics; marker file round-trip.
- `packages/core/src/repo-stabilisation.test.ts` — +8 source assertions: `registerCronIpcHandlers` present + called in `whenReady`; all eight channels use `registerHandler`; marker fields; narrow diag channels; renderer preferred message; preload surface; launcher marker/health wiring; replace-only-owned + no taskkill.

## 17. Exact files changed

- `apps/standalone/electron/main.mjs` — `registerCronIpcHandlers()`, dev runtime marker, `cron:diag:marker`/`cron:diag:ready`, `IS_DEV` constant, registration-failure surfacing in `whenReady`, `ready-to-show` marker update.
- `apps/standalone/electron/preload.cjs` — `diag` bridge (`marker`, `ready`).
- `apps/standalone/src/ipc-data-service.ts` — `CronHostDiag` types, `INCOMPLETE_HOST_MESSAGE`, `initialize()` host-connection verification.
- `apps/standalone/src/main.tsx` — `cron:diag:ready` after first render; bootstrap error guard.
- `packages/core/src/components/App.tsx` — init try/catch surfacing the visible incomplete-host message.
- `scripts/code-dev-launcher-logic.ps1` — required channels list, `Read-DevMainMarker`, `Resolve-DevElectronHealth`, `Test-DevMainMarkerReady`, `Get-DevMissingIpcChannels`, Health-aware `Resolve-DevAction`.
- `scripts/run-code-dev-hidden.ps1` — marker path/hashes, health classification + logging, replace branch with bounded stop-poll + Vite reuse, `Wait-ForMainMarker` on all launch paths.
- `scripts/test-code-dev-launcher.ps1` — +15 marker/health assertions.
- `packages/core/src/repo-stabilisation.test.ts` — +8 source assertions (registration repair + launcher stale detection).

## 18. Exact files created

- `apps/standalone/electron/register-ipc.mjs` — pure registrar + channel lists (no Electron imports).
- `apps/standalone/electron/register-ipc.d.mts` — type declarations for the registrar.
- `packages/core/src/main-ipc-registration.test.ts` — 11 focused tests.
- `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_REPORT.md` (this file)
- `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_EVIDENCE.md`
- `.runtime/code-dev-main-marker.json` (gitignored, live artifact)

## 19. Protected boundaries preserved

Port `5190`; AUMID `com.cron.code.dev`; dev userData `CRON for Code Dev`; production CRON for Code untouched; restart-safe launcher architecture (single owned-PID `Stop-Process`, no `taskkill`); single-instance behavior; LM Studio wiring; project data; tasks/approvals/executions/audit; execution safety; approval semantics; sandbox/contextIsolation; narrow preload surface; project-management contracts; shell layout; current tests; all pre-existing work. No new dependencies, no package/version changes, no Git mutations.

## 20. Remaining gaps

1. Live clicking of `CRON Restart` and each project-menu action in the window is Venessa's manual acceptance step (the eight handlers are proven registered by the live main; the renderer verified the connection via `cron:diag:marker`).
2. `pnpm format:check` remains a no-op stub (pre-existing).
3. The two `.before-aumid-fix` backup files remain (pre-existing, untracked).

## 21. Final self-audit

Correct repo/branch/HEAD. Nothing staged. Pre-existing work preserved. Only authorised files changed. Live Electron loads the current main entry (sha256 match with the marker). All eight handlers registered by the live main. Runtime marker current (pid + hashes + channel list + rendererReady). Launcher replaces only owned stale/broken Electron; healthy current Electron is surfaced; foreign/production/unrelated processes untouched (production PIDs verified unchanged; unrelated CRON Vites verified alive). Restart works once (guards in store + main). Active project restores (last-active flow unchanged and tested). All project actions route through validated IPC. No raw Electron APIs exposed. Port 5190, AUMID `com.cron.code.dev`, dev userData unchanged. Execution/approval/chat/LM Studio preserved. Tests/build/lint/typecheck pass exit 0; `git diff --check` clean; secret and suspicious-path scans clean. Logs/reports updated; exact prompt preserved. No prohibited Git action occurred.

## 22. Git safety statement

Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred. All Git commands were read-only.

## 23. Exact next action

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
