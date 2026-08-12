# CRON for Code — Live IPC Registration and Stale Electron Replacement Repair — Evidence

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 15:10 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved narrow runtime defect-repair slice.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice is stored verbatim in `CRON_ARCHITECT_LOG.md` (Live IPC Registration and Stale Electron Replacement Repair checkpoint, `### Verification Input Used — Verbatim`). It is the complete content of `CRON_for_Code_Live_IPC_Registration_and_Stale_Electron_Repair_Prompt (2).md` as issued.

---

## Repository identity (verified 2026-08-07 15:10 +10:00)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
```

## Initial working-tree state (captured before edits)

```
Modified: 37   Deleted: 3   Untracked: 48   (88 changes total)
Staged: none
git diff --check: clean
```

## 1. Live main-entry proof (before any edit)

```
Get-CimInstance Win32_Process (dev stack, 2026-08-07 15:10):
  PID 47776  node.exe   dev.mjs                    started 10:45:14
  PID 52756  node.exe   vite.js --port 5190        started 10:45:15
  PID  9120  node.exe   electron/cli.js "."        started 10:45:17
  PID 39696  electron.exe "." (MAIN)               started 10:45:18
  PID 49020/42340/48280  electron.exe children (gpu/utility/renderer) 10:45:19
    renderer 48280: --user-data-dir="...CRON for Code Dev" --app-user-model-id=com.cron.code.dev

Source timestamps:
  main.mjs           LastWriteTime 2026-08-07 11:38:39   (contains the 8 new handlers)
  preload.cjs        LastWriteTime 2026-08-07 11:37:20
  ipc-data-service.ts LastWriteTime 2026-08-07 11:38:01

.runtime/code-dev-main-marker.json: absent (False)
.runtime/code-dev-state.json: {"port":5190,"electronPid":39696,"vitePid":52756,"devPid":47776}
```

**Proof:** Electron main PID 39696 started 10:45 — before `main.mjs` gained the handlers at 11:38. The live main executes the old in-memory module.

## 2. Stale-reuse proof (launcher log, before repair)

```
[11:19:05] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
[14:54:34] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
[14:57:17] Lifecycle decision: surface-running (vite=52756 electron=39696 dev=47776).
```

Every launch surfaced the stale window; the main process was never replaced.

## 3. Command results

All commands run from repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` unless noted. Times local (+10:00).

| # | Command | Time | Exit | Result |
|---|---|---|---|---|
| 1 | `git status --porcelain --branch` / `git rev-parse HEAD` / `git remote -v` | 15:10 | 0 | main / 8157b12 / origin URL |
| 2 | live process + marker + state inspection (above) | 15:10 | 0 | stale main proven |
| 3 | `node --check main.mjs / preload.cjs / register-ipc.mjs` | 15:18 | 0 | clean |
| 4 | `pwsh [scriptblock]::Create` on 3 launcher scripts | 15:18 | 0 | parse OK |
| 5 | `pwsh scripts/test-code-dev-launcher.ps1` (first run) | 15:19 | 1 | strict-mode property access bug (fixed) |
| 6 | `pwsh scripts/test-code-dev-launcher.ps1` (after fix) | 15:22 | 0 | all pass |
| 7 | vitest `main-ipc-registration.test.ts` | 15:20 | 1 | 2 test-authoring bugs (fixed) |
| 8 | vitest `main-ipc-registration.test.ts` | 15:21 | 0 | 11/11 pass |
| 9 | `pnpm lint` | 15:24 | 1 | 3 errors (unused vars + preserve-caught-error) |
| 10 | `pnpm lint` (after fix) | 15:26 | 0 | 0 errors, 2 pre-existing warnings |
| 11 | `pnpm typecheck` | 15:28 | 0 | 7/7 packages |
| 12 | `pnpm --filter @cron-code/core test` | 15:31 | 0 | 101 tests |
| 13 | `pnpm test` | 15:35 | 0 | 220 tests (24+21+74+101) |
| 14 | `pnpm build` | 15:37 | 0 | packages + renderer |
| 15 | `pnpm format:check` | 15:37 | 0 | no-op echo ok |
| 16 | `git diff --check` | 15:37 | 0 | clean |
| 17 | live: `run-code-dev-hidden.ps1 -Port 5190` (repair run) | 15:43 | 0 | stale 39696 replaced; marker written; all 8 channels |
| 18 | live: relaunch while running (healthy surface) | 15:44 | 0 | surface-running, health=healthy, same PIDs |
| 19 | live: stale-marker simulation (tampered mainHash) | 15:47 | 1 | classified stale, attempted replace; stop-check race → fixed with 15s poll |
| 20 | live: `run-code-dev-hidden.ps1 -Port 5190` (after race fix) | 15:49 | 0 | fresh-start; marker self-healed; renderer-ready |
| 21 | final verification: marker, port, AUMID, PIDs | 15:50 | 0 | see below |
| 22 | `pnpm test` (final, all code final) | 15:51 | 0 | 220 tests |
| 23 | `scripts/test-code-dev-launcher.ps1` (final) | 15:52 | 0 | all pass |

## 4. Failed attempts (recorded)

1. **PS strict-mode property access** — `$Runtime.Health` on a hashtable under `Set-StrictMode -Version Latest` threw "property cannot be found" in `Resolve-DevAction`. Fixed with `$Runtime.ContainsKey('Health')`.
2. **PS marker read** — `$obj.requiredChannels` on a PSCustomObject under StrictMode threw when the JSON lacked the field. `Read-DevMainMarker` now uses `$obj.PSObject.Properties[...]` reads.
3. **vitest test-authoring bugs** — two new tests called `complete()` after registering a single channel (missing required channels) and called `begin()` after completion. Fixed the tests to exercise the intended guarantees.
4. **lint** — unused `ipcRegistrationSummary`/`ipcRegistrationError` (removed; marker state carries the data) and `preserve-caught-error` on the renderer's rethrown message (added `{ cause: err }`).
5. **Stale-marker simulation stop-check race** — after `Stop-Process` the dying Electron tree lingered past the single 2 s check, so the launcher reported "could not be stopped" (exit 1) even though the process subsequently died. Replaced with a bounded 15 s poll; the following run completed cleanly.

## 5. Live replacement proof (repair run, 15:43)

```
Launcher log:
[15:43:04] Stale dev main detected (marker missing, pid mismatch, or main/preload source changed): current main hash=5C7DBD5652D8AC4921CC5E2DED90DB569481BEC108073FFC34C06694990E0EF8 marker main hash=.
[15:43:04] Lifecycle decision: replace-stale-electron (vite=52756 electron=39696 dev=47776 health=stale).
[15:43:05] Replacing only this repo's stale/broken owned Electron process (PID 39696).
[15:43:07] Starting a fresh dev stack on port 5190.
[15:43:20] App ready (electron PID 48776, renderer-ready marker confirmed). Launcher completed.
```

New stack: dev 43128, vite 50564 (port 5190), electron main 48776, renderer 45264 (`--app-user-model-id=com.cron.code.dev`, `--user-data-dir="...CRON for Code Dev"`, `--enable-sandbox`).

## 6. Live marker proof (15:43, after repair run)

```json
{
  "appVersion": "1.1.7",
  "pid": 48776,
  "mainHash": "5c7dbd5652d8ac4921cc5e2ded90db569481bec108073ffc34c06694990e0ef8",
  "preloadHash": "f8542758f883a65cd5dfd3289f8d6f6a94f29aee5ee810b35b22a6243d8a3c48",
  "registeredIpcChannels": [ 33 channels: cron:select-folder, cron:db:*, cron:task:run-now,
    cron:execution:*, cron:project:reveal, copy-path, refresh, rename, relink, archive,
    restore-last-active, cron:app:restart, cron:diag:marker, cron:diag:ready, cron:lmstudio:* ],
  "requiredChannels": [ 8 channels ],
  "startupTimestamp": 1786081392496,
  "windowReady": true,
  "rendererReady": true,
  "registrationError": null
}
```

Dev electron log: `[INFO] IPC handler registration complete: 33 channels registered` (both 15:43 and 15:49 runs).

## 7. Healthy-relaunch proof (15:44)

```
[15:44:30] Lifecycle decision: surface-running (vite=50564 electron=48776 dev=43128 health=healthy).
[15:44:31] A healthy current dev stack is already running ... Surfacing the window via the single-instance lock.
[15:44:32] Recorded state: port=5190 devPid=43128 vitePid=50564 electronPid=48776.
[15:44:32] App window surfacing requested. Launcher completed.   (exit 0, no replacement)
```

## 8. Stale-marker simulation proof (15:47)

Tampered `mainHash` to `STALE-MARKER-SIMULATION-...` (pid kept, 48776), reran launcher:

```
[15:47:52] Stale dev main detected ... marker main hash=STALE-MARKER-SIMULATION-5c7dbd5652d8ac4921cc5e2ded90db56.
[15:47:52] Lifecycle decision: replace-stale-electron (vite=50564 electron=48776 dev=43128 health=stale).
[15:47:52] Replacing only this repo's stale/broken owned Electron process (PID 48776).
[15:47:55] FAIL: stale Electron (PID 48776) could not be stopped.   <- race, fixed, then:
[15:49:33] Lifecycle decision: fresh-start (vite=0 electron=0 dev=0 health=none).
[15:50:15] App ready (electron PID 51864, renderer-ready marker confirmed). Launcher completed.
```

Final marker self-healed: `mainHash` = `5c7dbd56...` (current source), pid = 51864, `rendererReady: true`, `registrationError: null`.

## 9. Final live state (15:50)

```
Dev stack: dev 51984 / vite 26360 (port 5190) / electron main 51864 / renderer 24700
  renderer 24700: --app-user-model-id=com.cron.code.dev
Marker: pid 51864, windowReady true, rendererReady true, registrationError null
All 8 required channels present (verified programmatically)
Production CRON for Code PIDs: 9032, 11552, 25456, 28260  (unchanged)
Unrelated apps alive: Meds vite 15540, Claims vite 43592, Chat vite 20636
  (CRON for Browser electron 50600 exited independently during the slice; its command line
   does not match this repo so the launcher could never select it — all launcher PID discovery
   is filtered to the repo root and only the owned Electron main PID is ever passed to Stop-Process)
```

## 10. Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Live Electron loads current main entry | PID 39696 (10:45) vs main.mjs LastWriteTime 11:38; marker sha256 matches current file after repair (5c7dbd56...) |
| All eight handlers registered | marker `registeredIpcChannels` contains all 8 (verified); dev log "33 channels registered" |
| Runtime marker current | marker pid == live electron main pid; hashes == current files; rendererReady true |
| Launcher replaces owned stale/broken Electron | 15:43 run (missing marker) and 15:47 simulation (hash mismatch) both classified stale → replace-stale-electron |
| Healthy current Electron reused/surfaced | 15:44 run health=healthy surface-running, same PIDs, exit 0 |
| Foreign/production/unrelated untouched | production PIDs unchanged; Meds/Claims/Chat Vites alive; launcher only ever Stop-Processes the owned scan result |
| Renderer-ready + IPC-ready wait | `Wait-ForMainMarker` gates exit 0 on rendererReady in all launch paths |
| Visible failure | `ipc-data-service.initialize()` throws the preferred message; App renders via ErrorBanner; missing channels logged under `.runtime` |
| Restart works once | `cron:app:restart` registered live; store + main `isRestarting` guards; flush + single `app.relaunch()`; tests |
| Active project restores | last-active restore flow unchanged + tested (project-management tests green) |
| All project actions work | all 8 project channels live; routing tests green; renderer sends ids only |
| No raw Electron APIs | preload exposes only typed bridges (asserted by repo-stabilisation test) |
| Port 5190 / AUMID unchanged | port owned by repo vite throughout; renderer cmdline AUMID verified |
| No duplicate stack | exactly one owned Electron main after each launch (39696→48776→51864) |
| Tests/build/quality | pnpm test 220 exit 0; typecheck/lint/build/format exit 0; launcher harness exit 0; PS parser + node --check clean; git diff --check clean; secret scan clean |

## Final self-audit confirmation

- Correct repo/branch/HEAD. Nothing staged. Pre-existing work preserved.
- Only authorised files changed (see report §17–18); all changed paths classified.
- Live Electron loads current main entry; all eight handlers registered; runtime marker current; launcher replaces only owned stale/broken Electron; healthy current instance surfaced; foreign/production/unrelated untouched; restart one-shot; active project restores; project actions routed via validated IPC; no raw Electron APIs; port 5190, AUMID `com.cron.code.dev`, dev userData unchanged; execution/approval/chat/LM Studio preserved.
- Tests/build/lint/typecheck exit 0; `git diff --check` clean; secret + suspicious-path scans clean; logs/reports updated; exact prompt preserved; no prohibited Git action occurred.
