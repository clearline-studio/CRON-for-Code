# CRON for Code — Restart-Safe Launcher Repair Report

**Executed by:** CC/OpenCode (approved task)
**Date:** 2026-08-06 16:20 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task file:** `CRON_for_Code_Restart_Safe_Launcher_Repair.md` + `CRON_Restart_Safe_Launcher_Standard.md`
**Classification:** `READY FOR VENESSA REPEATED LAUNCH TEST`

---

## 1. Exact full verbatim contents of `CRON_ARCHITECT_LOG.md`

```markdown
# CRON ARCHITECT LOG

Governance truth log for the CRON for Code repository.
Owner: Venessa (final authority). Architecture/scope/sequencing/review: Architect. Inspection/implementation: CC/OpenCode only when authorised.

---

## Fresh-Session Resume Checkpoint — 2026-08-06 09:35 +10:00 (CC/OpenCode, read-only audit)

This is the first recorded entry in this log. No prior `CRON_ARCHITECT_LOG.md` existed in the repository before this audit.
This entry is a fresh-session resume checkpoint produced by a strictly read-only audit (see `CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`).

### Governance
- Venessa is owner and final authority.
- The Architect controls architecture, scope, sequencing, and review.
- CC/OpenCode performs inspection, testing, evidence collection, and implementation only when explicitly authorised.
- CC must never stage, commit, push, merge, tag, release, reset, restore, clean, rewrite history, or otherwise alter Git history.
- Nothing may be staged.

### Repository identity (verified 2026-08-06)
- Path: `C:\Users\venes\projects\CRON APPS\CRON for Code`
- Root: `C:/Users/venes/projects/CRON APPS/CRON for Code`
- Branch: `main` (also local branch `master`, both at same commit)
- HEAD: `8157b12` (`feat-refine-cron-shell-layout`)
- Upstream: `main -> origin/main`
- Ahead/behind: 0/0
- Remotes: `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`
- Staged files: none
- Commit history: `8157b12 feat-refine-cron-shell-layout`; `d432bcb feat: establish working Cron for Code`
- Node `v24.18.0`, pnpm `11.18.0` (matches root engines + `packageManager` pnpm@11.18.0)

### Verified architecture (current working tree, not HEAD)
Monorepo (pnpm workspaces: `apps/*`, `packages/*`, `shared/*`).
- `apps/standalone` — Electron desktop host (`@cron-code/standalone`, v1.1.7 uncommitted; 1.1.4 at HEAD). Electron main (`electron/main.mjs`), sandboxed preload (`electron/preload.cjs`), renderer entry (`src/main.tsx`), renderer-side IPC data service + LLM client (`src/ipc-data-service.ts`), Vite build to `dist-renderer/`, launcher `scripts/dev.mjs`, NSIS installer + icon generation scripts.
- `packages/contracts` — typed domain contracts (project, task, approval, host context) + factories. Unit tested (12 tests).
- `packages/core` — reusable React workspace (`@cron-code/core`): zustand store, host-adapter bridge, shell UI (Header/Sidebar/ProjectArea/EmptyState/CronAssistant/LlmSettings/Layout/Footer), task UI (TaskComposer/TaskWorkspace/TaskCard). Unit tested (5 tests).
- `packages/data-service` — JSON-backed persistence (`json-store.ts`, atomic debounced writes), `TaskRunner` + `CommandExecutor`, console logger. Unit tested (16 tests).
- `packages/host-adapter` — host boundary (`standalone.ts`, `mock.ts`). Unit tested (5 tests).
- `shared/config` — shared tsconfig package (echo-ok scripts).
- `shared/design-tokens` — CSS design tokens package (`@cron-code/design-tokens`, index.css). Present on disk. NOT tracked by git (gitignored via `.gitignore:28:*token*` — accidental). Consumed by standalone renderer (`import '@cron-code/design-tokens'`).
- `assets/branding` — root brand PNGs (tracked).
- No OpenCode/coding-agent execution layer exists. No audit-trail/verification-record, session-handoff, training-log, model/provider-routing (beyond LM Studio chat), file-editing/patch-application, or Git release-gate modules exist.

### Verified current functional status (working tree)
- Electron host launches and persists (two live instances observed on 2026-08-06: a dev `electron.exe` from `node_modules`, and installed production `C:\Program Files\CRON for Code\CRON for Code.exe` v1.1.7, running since 08:32 PM 2026-08-04).
- LM Studio (local, 127.0.0.1:1234) is live with 19 models, including configured `textModel=qwen3.5-9b-deepseek-v4-flash` and `visionModel=qwen3-vl-8b-instruct`.
- Packaged v1.1.7 `store.json` (userData `@cron-code/standalone`) contains persisted projects (5) and draft tasks (4) and `lmstudio.config` preference — proving the uncommitted LM Studio integration shipped in the installed build and is live.
- `pnpm test`: PASS (38 tests). `pnpm typecheck`: PASS. `pnpm build`: PASS. `pnpm format:check`: PASS. `pnpm lint`: FAIL (36 errors — ~32 pre-existing at HEAD, 4 new from uncommitted LM Studio IPC in `main.mjs`; root cause: eslint config lacks Node globals for `.mjs`/`.cjs`).

### Verified completed work (working tree, uncommitted)
- LM Studio integration: settings modal (`LlmSettings.tsx`), chat client (`llm.ts`), IPC handlers in `main.mjs`, preload bridge, renderer LLM client, `CronAssistant` real chat replacing mock messages, version bump 1.1.4 → 1.1.7, dev userData separation, `@cron-code/core` source alias in standalone Vite config.
- Layout refinements across shell components.
- Packaged installer 1.1.7 produced and installed on this machine (2026-08-04 08:21 PM).

### Verified pending work / gaps
- Uncommitted working tree (21 modified tracked files, 3 deleted dist assets, 5 untracked files) not committed.
- `shared/design-tokens/` not tracked (gitignore `*token*` bug) — a fresh clone would fail to build/run.
- No genuine task execution: `CommandExecutor` in production runs a trivial echo command; tasks in store remain `draft`; `runNow` in `json-store.ts` is a no-op.
- No OpenCode/agent execution, no approval UI wiring, no Git release gate, no audit trail module.
- `pnpm lint` failing baseline.
- README status section is stale (claims "Phase 0 ... No OpenCode/model integration yet").
- Duplicate project records created when the same folder is selected repeatedly (deduplicated only for display in Sidebar).
- `cron:select-folder` IPC returns any directory; no repository-boundary/path allowlist enforcement.

### Risks / blockers
- Tracking gap for `shared/design-tokens` is a repo-integrity blocker for any fresh checkout.
- Uncommitted integration work must be reviewed/committed before building further.
- No safety enforcement in the app beyond Electron sandbox/contextIsolation; task/command execution is placeholder-only (currently safe by being inert).

### Protected boundaries
- Host-neutral reusable core boundary: `packages/core` depends on `contracts`/`data-service`/`host-adapter` interfaces only (deps injected via `AppDeps`).
- Electron preload is sandboxed; `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; only explicit `cronHost` methods exposed.
- LM Studio config validated to `http(s)://` only; no API keys stored.
- Git/release actions remain forbidden to CC; nothing staged or altered in this audit.

### Latest checkpoint
- 2026-08-04 17:43 (+10:00) — commit `8157b12 feat-refine-cron-shell-layout`.
- After that: uncommitted LM Studio integration + layout work (working tree), packaged and installed as v1.1.7.

### Pending decisions (for Architect)
1. Commit/package strategy for the uncommitted LM Studio integration (working tree currently 1.1.7, HEAD 1.1.4).
2. Fix `.gitignore` so `shared/design-tokens` is tracked.
3. Lint baseline fix (Node globals / env config for `.mjs`/`.cjs`).
4. Next slice scope (recommended: task execution wiring vs agent execution layer) — see audit report recommendation (recommendation only).

### Decision history
- None prior to this checkpoint (log created fresh during read-only audit).

---

## Stabilisation + Dev Launcher Checkpoint — 2026-08-06 13:33 +10:00 (CC/OpenCode, approved task)

Session note: this session was interrupted once and resumed. Resume classification at resume: `PARTIALLY COMPLETED — SAFE TO RESUME`.
Evidence: task report absent, no log entry, launcher files present, test file path-join fix applied but tests not re-run,
no task-created processes alive. No work was repeated beyond the required re-verification after the fix.

### Repository-integrity defects carried over from the fresh-session audit (all now addressed)
1. `shared/design-tokens/` was ignored by `.gitignore:28 *token*` (credentials pattern too broad) — fresh-clone build risk.
2. Generated `dist-renderer/` output was partly tracked, causing churn on every build.
3. `pnpm lint` baseline failed (36 errors; Node/CommonJS/browser globals missing for `.mjs`/`.cjs`, plus two genuine defects).
4. Duplicate project records created when the same folder was selected repeatedly.
5. README status stale ("Phase 0 ... No OpenCode/model integration yet").

### Corrections delivered
- **Design-tokens ignore correction:** `.gitignore` credentials block narrowed. `*token*` removed; replaced with
  `*.token`, `token*.json`, `.tokens*` (plus existing `*.pem`, `*.key`, `credentials*`, `secret*`). `shared/design-tokens/`
  now appears as normal untracked source, ready for Venessa's later exact staging. Verified via `git check-ignore`.
- **Generated renderer-output policy:** `.gitignore` now ignores `apps/standalone/dist-renderer/` (whole dir). No tracked
  files were deleted via Git by CC. The following tracked generated files still require Venessa + Architect to remove
  from tracking manually (`git rm --cached` — not performed by CC):
  - `apps/standalone/dist-renderer/index.html`
  - `apps/standalone/dist-renderer/code_logo.png`
  - `apps/standalone/dist-renderer/code_logo_transparent.png`
  - `apps/standalone/dist-renderer/cron_shell_background.png`
  - `apps/standalone/dist-renderer/assets/code_logo_transparent-TEhRPKA6.png`
  - `apps/standalone/dist-renderer/assets/cron_shell_background-j_Mb-hGJ.png`
  - `apps/standalone/dist-renderer/assets/index-BKHl0T_0.js` (already deleted on disk)
  - `apps/standalone/dist-renderer/assets/index-DKjNfHep-ByRAIpR-.js` (already deleted on disk)
  - `apps/standalone/dist-renderer/assets/index-DwH0u0NX.css` (already deleted on disk)
- **Lint baseline correction:** `eslint.config.mjs` now sets explicit per-file-type globals (browser for `.ts`/`.tsx`,
  node+commonjs for `.mjs`/`.cjs`, browser+node for tests) without adding a dependency. Genuine defects fixed:
  `main.mjs` `preserve-caught-error` (attached `{ cause: err }`) and `task-runner.test.ts` `prefer-const`
  (`let` → `const`). `pnpm lint` passes with 0 errors (2 pre-existing react-hooks warnings remain).
- **Project deduplication:** `normalizeProjectPath` (case-insensitive, separator/trailing-slash normalisation),
  `reconcileProjects` (deterministic canonical = earliest createdAt, tie-break by id; duplicate -> canonical moves map;
  no records deleted), `remapProjectReferences` (migrates tasks/approvals referencing duplicate ids), new store action
  `openProjectPath`, `loadProjects`/`addProject` dedup wiring, `App.tsx` host-adapter handler uses `openProjectPath`.
- **README refresh:** status now reflects Electron shell, LM Studio chat, JSON persistence, reusable core, dedup, and
  explicitly lists "not yet implemented" (real agent execution, approval gates, release gate, OpenCode). Dev-launcher
  usage documented.

### Development launcher and taskbar-friendly shortcut (added)
- `Launch-CRON-for-Code-Dev.bat` (repo root, double-click entry).
- `launch-cron-for-code-dev.vbs` (repo root, silent hidden launcher; shortcut target).
- `scripts/run-code-dev-hidden.ps1` (core launcher; dynamic repo root; verifies `node_modules`; never installs; port
  check with reuse/fail-safe; starts the approved `apps/standalone/scripts/dev.mjs`; waits for the dev service; logs to
  `.runtime/`; never kills unrelated processes).
- `scripts/create-code-dev-shortcut.ps1` (creates `CRON for Code Dev.lnk` on the Desktop; targets the VBS; icon =
  `apps/standalone/branding/assets/code_icon.ico`; does not auto-pin; no registry changes).
- `apps/standalone/scripts/dev.mjs` gained optional, backward-compatible support: `CRON_DEV_LOG_DIR` (per-process logs)
  and `CRON_CODE_DEV_PORT` (alternate dev port, forwarded to Electron). Default behaviour unchanged.
- `apps/standalone/electron/main.mjs` `DEV_URL` now honours `CRON_CODE_DEV_URL` (defaults to `http://127.0.0.1:5180`).
- `.runtime/` added to `.gitignore`. Logs: `.runtime/code-dev-launcher.log`, `.runtime/code-dev-vite.log`,
  `.runtime/code-dev-electron.log`.

### Verified status (after stabilisation)
- `pnpm test` PASS (58 tests: contracts 12, data-service 16, host-adapter 5, core 25).
- `pnpm typecheck` PASS. `pnpm build` PASS. `pnpm format:check` PASS. `pnpm lint` PASS (0 errors). `git diff --check` clean.
- Runtime (live, 2026-08-06): dev launcher started the dev app (success path) and exited 0; launcher-owned dev process
  stayed alive; dev Electron used `CRON for Code Dev` userData (separate from production `@cron-code/standalone`);
  production app PIDs untouched; CRON for Chat dev server (unrelated) untouched and its port never killed. Fail-safe
  path verified: when port 5180 was occupied by an unrelated process (CRON for Chat vite, PID 35556), the launcher
  exited 2 without touching it. Shortcut created at `C:\Users\venes\Desktop\CRON for Code Dev.lnk` and its launch chain
  (lnk -> VBS -> PS1) started the dev app on an alternate port. LM Studio reachable (19 models). `.runtime/` logs produced.
- Port note: default dev port 5180 is currently occupied by the CRON for Chat project's dev server. Until that is
  stopped, the launcher fails safely on 5180; use `CRON_CODE_DEV_PORT=5190` (or a free port) to launch, or stop the
  CRON for Chat dev server. Venessa's manual launcher test is still required for final acceptance.

### No real execution / release-gate work authorised
This slice intentionally did NOT implement: real task/agent (OpenCode) execution, arbitrary command execution, approval
UI, Git release gate, file patching, terminal execution surface, new provider architecture, packaging/release, version
bump, or cloud models.

### Protected boundaries (unchanged)
- Reusable core stays host-neutral; Electron sandbox/contextIsolation preserved; LM Studio config unchanged
  (http(s)-only validation); dev/production userData separation intact; no staging/commit/push/etc. by CC.

### Final acceptance
Requires Venessa's manual launcher test (run `scripts\create-code-dev-shortcut.ps1`, pin `CRON for Code Dev.lnk` to the
taskbar, launch, confirm the dev app opens). CC did not perform or claim taskbar pinning.

### Pending decisions (for Architect)
1. Exact staging set for this stabilisation slice + the still-uncommitted LM Studio/layout work (design-tokens to be
   added to tracking; dist-renderer tracked files to be removed from tracking via `git rm --cached` by Venessa/Architect).
2. Whether to also stop tracking `apps/standalone/dist-renderer/index.html` (it is regenerated by every build).
3. Port-conflict policy between CRON for Code (5180) and CRON for Chat (5180) — recommend a per-repo override or a
   distinct default port.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint (this entry).

---

## Restart-Safe Launcher Repair Checkpoint — 2026-08-06 16:20 +10:00 (CC/OpenCode, approved task)

### Root cause (confirmed by live reproduction and code evidence)
1. **Broken reuse branch (primary):** after the app closed, the old `dev.mjs` teardown used `viteProcess.kill()`
   on the spawned **cmd shell** (spawned with `shell: true`), which left the grandchild `node vite.js` **orphaned on the
   port**. On the next launch the old launcher detected "port belongs to this repo's Vite" and ran
   `cmd /c pnpm exec electron .` with working directory **repo root** — but `electron .` requires the app package
   directory (`apps/standalone`, which has `"main": "electron/main.mjs"`; the root `package.json` has no `main`).
   Result: Electron silently failed to open, the launcher logged "Electron launch requested" and exited 0 —
   "shortcut does not reliably launch again". Confirmed live: after closing, orphaned Vite remained on the port and
   the reuse branch could not open the app.
2. **Hide-to-tray close:** closing the window hides the app to the tray (`main.mjs` `close` → `hide()`); the old
   launcher's "already running" path exited 0 with "Nothing to start" without re-showing the window — a relaunch
   appeared to do nothing.
3. **Port policy gaps:** default was 5180 (colliding with CRON for Chat), no `-Port` parameter, no range scan, no
   persisted port, and `CRON_CODE_DEV_PORT=5190` is a **persistent user-level** environment variable that also collides
   with `CRON_MEDS_PORT=5190` — when CRON for Meds holds 5190, the Code launcher must refuse (never silently use
   another project's port).
4. **No PID/state record:** nothing persisted between runs, so stale metadata could not self-repair and process
   ownership was re-derived ad hoc each launch.

### Fix delivered (per CRON_Restart_Safe_Launcher_Standard)
- `scripts/code-dev-launcher-logic.ps1` (new): pure, testable decisions — `Get-DevPortStatus` (free/owned/unrelated),
  `Select-DevPort` (`-Port` > env > persisted/default > scanned range; refuses unrelated-occupied explicit/env ports),
  `Resolve-DevAction` (surface-running / reuse-vite / replace-stale-electron / fresh-start),
  `Resolve-DevState` (stale PID/lock recovery), `Read/Write-DevState`.
- `scripts/run-code-dev-hidden.ps1` (rewritten): dot-sources the logic module; real probes; state file
  `.runtime/code-dev-state.json`; stale-state self-repair on launch; lifecycle branches including launching Electron
  from `apps/standalone` (correct `main`), surfacing a running window via the Electron single-instance lock, and
  replacing only an owned stale Electron via `Stop-Process` on the owned main.
- `apps/standalone/scripts/dev.mjs`: teardown now uses synchronous `spawnSync('taskkill', /PID /T /F)` so the child
  process tree (Vite) is actually killed before `dev.mjs` exits — no more orphaned Vite.
- `apps/standalone/electron/main.mjs`: `DEV_URL` default 5180 → 5190 (env override retained).
- `apps/standalone/vite.config.ts`: dev server port 5180 → 5190 (consistent default).
- Default dev port is now **5190**; approved scan range 5190–5205.
- `scripts/create-code-dev-shortcut.ps1` unchanged in contract; shortcut recreated at
  `C:\Users\venes\Desktop\CRON for Code Dev.lnk` (target = silent VBS, working dir = repo root, icon =
  `apps\standalone\branding\assets\code_icon.ico`).
- Tests: `scripts/test-code-dev-launcher.ps1` (51 assertions, deterministic, fake probes), 
  `scripts/test-code-dev-launcher-cycles.ps1` (real 3-cycle launch/close/relaunch integration), vitest additions in
  `packages/core/src/repo-stabilisation.test.ts` (default port, no env dependency, no unrelated termination,
  app-dir reuse branch, PS logic-harness runner, direct-ESLint lint guard).

### Repeated close/relaunch proof (live, 2026-08-06)
- Recovered an orphaned-Vite half-state: launcher detected owned Vite + no Electron → `reuse-vite` → relaunched
  Electron from `apps/standalone` → app-ready. (This is the exact reported failure, now auto-recovered.)
- Relaunch while running (e.g., hidden in tray) → `surface-running` via single-instance lock, same main PID, exit 0.
- `scripts/test-code-dev-launcher-cycles.ps1 -Port 5390 -Cycles 3` → **all 3 cycles passed**: launch exit 0,
  app-ready, close (terminate owned Electron), **full teardown** (Electron and Vite both down, port freed),
  relaunch; no unrelated process touched; production CRON for Code app PIDs (9032,11552,25456,28260) never stopped.
- Shortcut `.lnk` launch ×2 (with close + teardown in between) both app-ready.
- Port 5190 released after every close; state file persisted and stale entries repaired on next launch
  ("Repaired stale launcher state" observed live).
- Env note: `CRON_CODE_DEV_PORT=5190` is a persistent user-level variable; while CRON for Meds holds 5190 the Code
  launcher correctly refuses rather than hijacking the port. Recommended: give CRON for Meds a distinct port.
- Baseline: `pnpm test` PASS (63 tests), `pnpm typecheck` PASS, `pnpm build` PASS, `pnpm lint` PASS (0 errors),
  `pnpm format:check` PASS, `git diff --check` clean. Nothing staged. All task-created dev processes cleaned up.

### Final acceptance
Requires Venessa's manual repeated-launch test (open/close/relaunch from the pinned shortcut). CC did not perform or
claim taskbar pinning. No real execution/OpenCode work authorised in this slice.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
```

---

## 2. Completion status

**COMPLETE.** Root cause identified by live reproduction and fixed; the launcher now satisfies the restart-safety
contract (port precedence, range scan, port persistence, PID/state file with stale recovery, process ownership,
surface-running on relaunch, correct Electron working directory, tree teardown on close, no unrelated termination,
`.runtime` logging). Live proof: 3× launch→close→relaunch passed with full teardown; shortcut relaunch passed twice.

## 3. Root cause (exact, verified)

The defect was a **launcher lifecycle composition of four failures**:

1. **Broken reuse branch (primary).** `dev.mjs` spawned with `shell: true`; on app close its handler ran
   `viteProcess.kill()` — a signal to the **cmd shim**, not the real `node vite.js`, which became **orphaned on the
   port**. The old launcher then took its "port belongs to this repo's Vite" reuse path and ran
   `cmd /c pnpm exec electron .` with `-WorkingDirectory $repoRoot`. Evidence: root `package.json` has **no `main`**;
   only `apps/standalone/package.json` has `"main": "electron/main.mjs"`. So `electron .` had no app entry → Electron
   silently failed, the launcher logged "Electron launch requested" and exited 0 → "shortcut does not reliably launch
   again." Confirmed live: after closing the app, orphaned Vite remained listening and the reuse branch could not open
   the app.
2. **Hide-to-tray close.** `main.mjs` `close` → `preventDefault` + `hide()` (tray app). The old launcher's "already
   running" branch exited 0 with "Nothing to start" without re-showing the window → relaunch appeared to do nothing.
3. **Port policy gaps.** Default 5180 collided with CRON for Chat; there was no `-Port` parameter, no approved-range
   scan, no persisted port, and a **persistent user-level** `CRON_CODE_DEV_PORT=5190` (alongside `CRON_MEDS_PORT=5190`)
   means CRON for Meds and Code share 5190.
4. **No PID/state record.** Nothing persisted between runs; stale metadata could not self-repair.

## 4. Fix delivered

- **`scripts/code-dev-launcher-logic.ps1` (new, dot-sourced, injectable probes):**
  `Get-DevPortStatus` (free/owned/unrelated), `Select-DevPort` (`-Port` > `CRON_CODE_DEV_PORT` env > persisted/default >
  scanned range 5190–5205; refuses explicit/env ports owned by another app), `Resolve-DevAction`
  (surface-running/reuse-vite/replace-stale-electron/fresh-start), `Resolve-DevState` (drops dead/non-owned PIDs),
  `Read/Write-DevState`.
- **`scripts/run-code-dev-hidden.ps1` (rewritten):** default port **5190**; state file `.runtime/code-dev-state.json`;
  stale-state self-repair before decisions; lifecycle branches — surface a running window via the Electron single-
  instance lock; reuse an owned Vite and relaunch Electron **from `apps/standalone`**; replace only an owned stale
  Electron (`Stop-Process` on the owned main); fresh start otherwise; waits for port + owned Electron (app-ready);
  logs every decision under `.runtime/`; never touches unrelated processes.
- **`apps/standalone/scripts/dev.mjs`:** teardown uses synchronous `spawnSync('taskkill', ['/PID',pid,'/T','/F'])` so
  the whole child tree (Vite) is gone before `dev.mjs` exits — no orphaned Vite.
- **`apps/standalone/electron/main.mjs`:** `DEV_URL` default → `http://127.0.0.1:5190` (env override retained).
- **`apps/standalone/vite.config.ts`:** dev `server.port` 5180 → 5190 (consistent default).
- Shortcut recreated (target = silent VBS, working dir = repo root, icon = `apps\standalone\branding\assets\code_icon.ico`).

## 5. Required lifecycle behaviour — proof (live)

1. **Launch from `CRON for Code Dev.lnk`** — PASS (twice, see §7).
2. **App opens** — PASS: owned Electron main appeared; launcher logged "App ready (electron PID …)".
3. **Close the app normally** — simulated by terminating the owned Electron main (equivalent to a full quit at the OS
   level; window-close itself hides to tray, which the launcher now re-surfaces on relaunch).
4. **Wait for lifecycle cleanup** — PASS: after close, **all** owned processes gone and the port freed (full teardown).
5. **Launch again from the same shortcut** — PASS.
6. **At least three cycles** — PASS: `test-code-dev-launcher-cycles.ps1 -Port 5390 -Cycles 3` all passed.
7. **No PowerShell command required between cycles** — PASS: the cycle test drives the launcher as a subprocess; the
   user never types a PowerShell command (the shortcut path uses the VBS → PS1 chain).
8. **No unrelated CRON process stopped** — PASS: production `CRON for Code.exe` PIDs (9032,11552,25456,28260) verified
   alive before/after every cycle; CRON for Chat / CRON for Meds processes were never referenced or killed by the
   launcher (their own stacks flap independently and were observed, untouched).
9. **Stale runtime metadata self-repairs** — PASS: `.runtime/code-dev-state.json` persisted; on relaunch the launcher
   logged "Repaired stale launcher state (recorded pids no longer live/owned)."
10. **Selected port remains truthful** — PASS: port persisted in state (`{"port":5190,…}`), reused as the port source on
   relaunch, and released on close.

## 6. Shortcut

Recreated at `C:\Users\venes\Desktop\CRON for Code Dev.lnk`:
- Target: `C:\Users\venes\projects\CRON APPS\CRON for Code\launch-cron-for-code-dev.vbs` (silent VBS wrapper).
- Working directory: repo root.
- Icon: `C:\Users\venes\projects\CRON APPS\CRON for Code\apps\standalone\branding\assets\code_icon.ico` (index 0).
- Verified to launch the dev app after close (launch → close → relaunch ×2). No visible terminal (VBS runs the PS1
  with `-WindowStyle Hidden`). Remains manually pinnable; CC did not pin it. Explorer-restart behaviour: the shortcut
  is a plain `.lnk` to a file path with a static working directory and no per-session environment dependency, so it
  survives Explorer restarts; Venessa confirms visually.

## 7. Required tests

- **`scripts/test-code-dev-launcher.ps1`** (51 assertions, exit 0): explicit-port precedence; env precedence;
  default-port (5190); persisted-port reuse; unrelated-port refusal (explicit + env); range scan; no-free-port;
  free/owned/unrelated classification; lifecycle decisions (surface-running, reuse-vite, replace-stale-electron,
  fresh-start); stale PID drop; live PID kept; state round-trip; launcher sources (default 5190, state file, electron
  from `apps/standalone`, no `taskkill`/unrelated termination, only owned `Stop-Process`); VBS/BAT dynamic paths; no
  temporary-env dependency; shortcut target/workdir/icon; no auto-pin; no registry writes.
- **`scripts/test-code-dev-launcher-cycles.ps1`** (real integration, exit 0): 3 consecutive launch/close/relaunch
  cycles; app-ready each cycle; full teardown each close; no unrelated process terminated by the launcher; production
  app never stopped.
- **Vitest additions** in `packages/core/src/repo-stabilisation.test.ts` (30 core tests pass): dynamic paths, no
  terminal-env dependency, default port 5190, no unrelated termination, reuse-branch runs Electron from
  `apps/standalone`, PS logic-harness runner, and a direct-ESLint lint guard (invokes `node node_modules/eslint/bin/eslint.js`
  directly — this also removed a flaky nested-`pnpm` artifact in the full `pnpm -r run test`).

## 8. Documentation

- `CRON_ARCHITECT_LOG.md` — appended the Restart-Safe Launcher Repair checkpoint (root cause + fix + repeated
  close/relaunch proof). Prior history preserved.
- `PROJECT_LOG.md` — appended the matching execution entry. Prior history preserved.

## 9. Verification commands, working directories, exit codes, and key raw output

Working directory for all commands: repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`.

- `git rev-parse --show-toplevel` → `C:/Users/venes/projects/CRON APPS/CRON for Code` (exit 0).
- `git branch --show-current` → `main`; `git rev-parse HEAD` → `8157b127f5739f02fcfe04fec745666392c67f5e` (exit 0).
- `git diff --cached --name-only` → empty (nothing staged).
- `node --check apps/standalone/scripts/dev.mjs` → exit 0.
- `pnpm lint` → `✖ 2 problems (0 errors, 2 warnings)` (pre-existing react-hooks warnings), exit 0.
- `pnpm typecheck` → all packages Done, exit 0.
- `pnpm build` → packages + `dist-renderer/` built, exit 0.
- `pnpm format:check` → exit 0. `git diff --check` → clean (CRLF warnings only).
- `pnpm test` → **63 tests pass** (contracts 12, data-service 16, host-adapter 5, core 30), exit 0.
- `powershell -File scripts/test-code-dev-launcher.ps1` → "All dev-launcher logic/source tests passed." exit 0.
- Live repro/verification (exit codes as shown):
  - Close of a running dev app left **orphaned Vite** (PID 7684 on 5190) and `dev.mjs` exited — reproduced the half-state.
  - New launcher vs orphaned Vite → log: `Selected dev port: 5190 (source: default)` → `Lifecycle decision: reuse-vite`
    → `Reusing the owned dev server and relaunching Electron from apps/standalone` → `App ready (electron PID 43208)`.
    exit 0.
  - Relaunch while running → `source: persisted` → `Lifecycle decision: surface-running` → same main PID (SAME_MAIN:True),
    exit 0.
  - `powershell -File scripts/test-code-dev-launcher-cycles.ps1 -Port 5390 -Cycles 3` → all assertions PASS, exit 0.
  - Shortcut launch #1 (`Start-Process <Desktop>\CRON for Code Dev.lnk`) → app-ready (electron 42108), state recorded,
    exit 0; close → full teardown (our-repo procs NONE, 5190 free); Shortcut launch #2 → app-ready (electron 7172),
    exit 0; close → teardown NONE, 5190 free.
  - Production PIDs `9032,11552,25456,28260` verified unchanged at every step; LM Studio reachable (19 models).
  - Environment check: `CRON_CODE_DEV_PORT` = `[5190]` at User level, empty at Machine level; `CRON_MEDS_PORT=5190` also
    present — a port collision between CRON for Code and CRON for Meds.

## 10. Self-audit mapped to evidence

- Root cause: each of the four findings is evidenced (package.json `main` inspection; live orphaned-Vite reproduction;
  old-reuse-branch code read; launcher log lines; env-var scope query). ✓
- Required behaviour 1–10: each mapped to a live PASS with recorded PIDs/ports/logs (§5). ✓
- Required tests: all listed scenarios covered by the deterministic harness, the real 3-cycle script, and vitest (§7). ✓
- No unrelated termination: launcher contains no `taskkill` and its only `Stop-Process` targets `$action.ElectronMainPid`
  (owned scan); live cycles verified production PIDs and launcher-log non-involvement of unrelated PIDs. ✓
- Write boundary: only launcher/test/config/log/report files changed; package versions and lockfiles untouched;
  nothing staged; no tracked file removed via Git. ✓

## 11. Permission-batching and session-continuity disclosure

- No batch exceeded **10 permission requests** (batches of 1–8 across inspection, build, runtime, cleanup, and
  reporting phases).
- This session segment was a continuation (the previous task ended with a final report). No interrupted-session resume
  was required within this segment; the task ran to completion in one pass.
- No forbidden Git/release action occurred: nothing staged, committed, pushed, merged, tagged, released, reset,
  restored, or cleaned. No dependency install/update/repair. All task-created dev processes were cleaned up at the end.

## 12. Final classification

`READY FOR VENESSA REPEATED LAUNCH TEST`
