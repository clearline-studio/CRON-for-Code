# CRON for Code — Dev Restart Blank-Window Runtime Repair — Evidence

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 17:10 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved narrow runtime defect-repair slice.

---

## Verification Input Used — Verbatim
The exact task prompt used for this slice is stored verbatim in `CRON_ARCHITECT_LOG.md` (Dev Restart Blank-Window Runtime Repair checkpoint, `### Verification Input Used — Verbatim`). It is the complete content of `CRON_for_Code_Dev_Restart_Blank_Window_Repair_Prompt.md` as issued.

---

## Repository identity (verified 2026-08-07 17:10 +10:00)
```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
```

## Initial working-tree state (captured before edits)
```
Modified: 37   Deleted: 3   Untracked: 58   (98 changes)
Staged: none
```

## 1. Blank-window reproduction (live, before any edit)

Healthy baseline (launcher state at 16:39-17:38): dev 50524 / vite 25836 / electron 41120, marker `rendererReady=true`.

After Venessa clicked `CRON Restart` (~17:38), captured:

```
Launcher log 17:38:05: Lifecycle decision: surface-running (vite=25836 electron=41120 dev=50524 health=healthy)
Electron log   07:38:18Z: [INFO] Tray destroyed            <- old main quit sequence
New instance   17:38:18:  electron.exe "." (PID 43264)     <- app.relaunch spawn
Live state:    NO dev.mjs, NO Vite, port 5190 FREE
Marker:        pid=43264  rendererReady=False  rendererUrl=''  lastStartupError=<field absent, old main>
Window:        frame + title "CRON for Code", blank content (Venessa's report)
```

Root-cause mechanism (dev.mjs, lines 59-62):
```js
electronProcess.on('close', () => {
  killTree(viteProcess.pid);   // Electron shim exit => owned Vite is KILLED
  process.exit(0);
});
```
`app.relaunch()` spawns a NEW Electron outside dev.mjs; dev.mjs sees the OLD shim close and kills Vite; the relaunched Electron loads a dead dev URL → blank window. The launcher healthy path never participated in Restart.

## 2. Command results

All commands from repo root unless noted. Times local (+10:00).

| # | Command | Time | Exit | Result |
|---|---|---|---|---|
| 1 | repo identity + working tree | 17:10 | 0 | main / 8157b12 / 37-3-58 |
| 2 | read dev.mjs / launcher / main.mjs | 17:10-17:20 | 0 | teardown mechanism confirmed |
| 3 | blank-window state capture (above) | 17:40 | 0 | electron 43264, no vite, marker not ready |
| 4 | `node --check main.mjs` + PS parser | 17:55 | 0 | clean |
| 5 | launcher harness (first) | 17:56 | 1 | strict-mode `lastStartupError` on test marker (fixed) |
| 6 | launcher harness (fixed) | 17:57 | 0 | all pass |
| 7 | vitest repo-stabilisation (first) | 17:58 | 1 | regex length + spawn literal (fixed) |
| 8 | vitest repo-stabilisation (fixed) | 18:00 | 0 | 33 tests |
| 9 | `pnpm test` | 18:01 | 0 | 242 tests |
| 10 | `pnpm build` / `format:check` / `git diff --check` | 18:02 | 0 | clean |
| 11 | launcher recovery run (blank instance 43264 replaced) | 18:05 | 0 | fresh stack 50692, marker healthy |
| 12 | restart handoff cycle 1 (intent + launcher) | 18:06 | 0 | healthy stack 44524 |
| 13 | restart handoff cycle 2 (intent + launcher) | 18:07 | 0 | healthy stack 36836 |
| 14 | UIA button search (root + window scope) | 18:09 | 2 | Chromium DOM not exposed (4 native children) |
| 15 | teardown mechanism re-proof (owned electron exit → vite died, port free) | 18:13 | 0 | mechanism reproduced on demand |
| 16 | dead-URL instance test (port 59998) | 18:15 | 0 | `did-fail-load -102 ERR_CONNECTION_REFUSED` + watchdog `renderer did not become ready within 30000ms` |
| 17 | launcher broken-recovery run | 18:16 | 0 | health=broken → replaced → healthy 53908 |
| 18 | restart handoff cycle 3 (final code) | 18:18 | 0 | healthy stack 30524, intent consumed |
| 19 | `pnpm lint` / PS harness / node --check | 18:19 | 0 | clean |
| 20 | vitest repo-stabilisation + registration | 18:20 | 0 | 44 tests |
| 21 | `pnpm test` (final) | 18:22 | 1 | 242 pass; 2 pre-existing load flakes (see below) |
| 22 | data-service isolated re-run | 18:27 | 0 | 74 tests |
| 23 | `pnpm test` (final clean run) | 18:29 | 0 | 242 tests, exit 0 |
| 24 | `pnpm build` / `format:check` / `git diff --check` | 18:30 | 0 | clean |
| 25 | final live-state verification | 18:30 | 0 | see below |

## 3. Failed attempts (recorded)
1. **Launcher harness strict-mode** — `$Marker.lastStartupError` on test markers without the key threw under StrictMode; fixed with `ContainsKey` guard.
2. **Static regex** — `if (IS_DEV)[\s\S]{0,120}restartViaLauncher` exceeded 120 chars (comment); relaxed to 400. `spawn(powershell.exe` literal mismatched the multi-line `spawn(\n 'powershell.exe'`; switched to `toContain('spawn(')` + `toContain("'powershell.exe'")`.
3. **UIA button click** — window found (`Chrome_WidgetWin_1`, "CRON for Code") but Chromium exposes no DOM to UIA (4 raw children; button absent). Requires an unapproved `--force-renderer-accessibility` flag → not driven; documented as the environment limitation.
4. **Dead-port test (59999)** — something responded on 59999 (`did-finish-load` fired); retried on 59998 (verified no listener) and captured `did-fail-load -102 ERR_CONNECTION_REFUSED`.
5. **Two pre-existing load flakes** in one full-suite run (vitest worker `onTaskUpdate` timeout; `execution-service` syntax-check 5s timeout) — unrelated to this slice (no execution-service changes); both passed on isolated re-run and the final full run exited 0.

## 4. Live restart handoff proof (the repaired `cron:app:restart` path)

The new handler performs exactly: flush → audit → write `.runtime/code-dev-restart-requested.json` → spawn `run-code-dev-hidden.ps1 -Port <port>` → `app.quit()`. Each cycle below drives that identical handoff.

```
Cycle 1 (18:06:16): In-app restart requested (intent marker present). Replacing the owned dev stack.
  -> replace-stale-electron (electron=50692) -> fresh stack -> App ready (electron PID 44524, renderer-ready marker confirmed)  [exit 0]
Cycle 2 (18:06:58): In-app restart requested ... -> fresh stack -> App ready (electron PID 36836, ...)  [exit 0]
Cycle 3 (18:18:26, final code incl. watchdog): In-app restart requested ... -> App ready (electron PID 30524, ...)  [exit 0]
```

After every cycle: marker `windowReady=True rendererReady=True rendererUrl=http://127.0.0.1:5190/ lastStartupError=''`, 34 channels (8/8 required), intent file consumed, exactly one owned Electron main + one dev.mjs + one Vite, port 5190 owned by the repo Vite.

## 5. Bounded-failure diagnostics proof (dead-URL instance)

```
marker (12s):  rendererReady=False rendererUrl='http://127.0.0.1:59998/' lastStartupError='did-fail-load -102 ERR_CONNECTION_REFUSED'
marker (+30s): lastStartupError='renderer did not become ready within 30000ms of did-finish-load (url=http://127.0.0.1:59998/)'
launcher:      Broken dev main detected -> replace-stale-electron (electron=33928 health=broken) -> App ready (electron PID 53908)  [exit 0]
```

## 6. State-preservation proof

Dev store across ALL live cycles: 3 project records identical (Meds `archived:true`, Claims-295 `archived:true`, Claims-296 `archived:false`); `lastActiveProjectId=proj_1786063530296_t62fq0`; tasks/approvals/executions unchanged; audit grew only by `app.restart_requested` @16:06:22 and @17:38:17 (Venessa's click — the intended restart audit).

## 7. Final live state (18:30)

```
marker:  pid=30524  windowReady=True  rendererReady=True  rendererUrl=http://127.0.0.1:5190/  lastStartupError=''  channels=34
owned electron mains: 30524 (exactly one)
port 5190: 37468 (repo Vite)
AUMID:    com.cron.code.dev (renderer cmdline)
prod:     9032, 11552, 25456, 28260 (untouched)
store:    3 project records (unchanged)
```

## 8. Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Blank-window root cause proven | electron 43264 (17:38:18) with no Vite, port free, marker not ready; `dev.mjs` teardown lines; re-proven on demand (owned electron exit → vite died) |
| Normal vs restart launch compared | §10 of report + this evidence §1 |
| Restart reaches the authoritative dev lifecycle | cycles 1-3 via intent marker + launcher; `In-app restart requested` in launcher log; all exit 0 |
| Correct renderer URL loads | marker `rendererUrl=http://127.0.0.1:5190/` + electron log `Renderer did-finish-load: http://127.0.0.1:5190/` |
| Renderer-ready marker required + reached | `windowReady/rendererReady=True` in every cycle; launcher only exits 0 after `renderer-ready marker confirmed` |
| No blank window remains | every post-cycle marker fully ready; the pre-repair blank instance (43264) was replaced by the launcher (18:05) |
| Restart ×2 (handoff) | cycles 1-3 consecutive, all healthy |
| Real button click ×2 | NOT CC-drivable: UIA cannot reach Chromium DOM (documented, §3.3 / §22) |
| Exactly one stack | single owned Electron main + single dev.mjs + single Vite after each cycle |
| Active project / list preserved | store unchanged; last-active = Claims-296; no duplicates |
| did-fail-load → bounded failure | dead-URL test: `-102 ERR_CONNECTION_REFUSED` + watchdog; launcher `health=broken` → replaced |
| Unrelated safety | prod PIDs unchanged; only owned Electron ever stopped; no taskkill |
| Regression | full 242-test suite + launcher harness + re-link/store suites green |
| No payload logging | diagnostics record URLs/codes only; console errors sliced to 240 chars |

## Final self-audit confirmation
- Correct repo/branch/HEAD; nothing staged; pre-existing work preserved; every changed path classified.
- Blank-window root cause proven live; normal vs restart compared; Restart converges on the launcher; correct URL loads; renderer-ready required and reached; no blank window remains; handoff proven ×3 consecutively (button click itself CC-undrivable — environment limitation, documented); exactly one stack; active project/list preserved; no duplicates/archive corruption; tasks/approvals/executions/audit/LM Studio preserved; Re-link Cancel harmless; all 34 channels registered; marker healthy; port 5190; AUMID `com.cron.code.dev`; production/unrelated untouched; tests/build/lint/typecheck exit 0; launcher tests pass; `git diff --check` clean; logs/reports updated; exact prompt preserved; no prohibited Git action occurred.
