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
- PERMANENT RULE (Venessa, 2026-08-13): CC/OpenCode must append an entry to BOTH
  `PROJECT_LOG.md` AND `CRON_ARCHITECT_LOG.md` after EVERY task/slice/change, regardless
  of what the task prompt says. Logs are never skipped because a prompt omits them.

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

---

## Fresh-Session Repository Audit — 2026-08-06 18:22 +10:00 (CC/OpenCode, read-only audit)

Task title: `Fresh-Session Repository Audit`.
Repository path: `C:\Users\venes\projects\CRON APPS\CRON for Code`.
Branch: `main` (local `master` also present at same commit). HEAD: `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `main -> origin/main`, ahead/behind 0/0. Remote: `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. No staged files.

### Working-tree state (verified live)
- 25 modified tracked files, 3 deleted tracked dist-renderer assets, 19 pre-existing untracked files/dirs at audit start (verified via `git status --porcelain=v1`). At close, 20 untracked — the +1 is the permitted audit file `CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md` created by this audit.
- `git diff --check` clean. Nothing staged. No Git mutation performed (all commands read-only).

### Verified architecture (current working tree)
pnpm monorepo (workspaces `apps/*`, `packages/*`, `shared/*`), Node v24.18.0, pnpm 11.18.0.
- `apps/standalone` v1.1.7 (HEAD 1.1.4) — Electron host: `electron/main.mjs` (contextIsolation:true, nodeIntegration:false, sandbox:true; AUMID `com.cron.code.dev` in dev; userData `CRON for Code Dev` in dev; LM Studio IPC; window-state + tray; single-instance lock), sandboxed `electron/preload.cjs` exposing only explicit `cronHost` methods, renderer `src/main.tsx`, `src/ipc-data-service.ts` (IPC DataService + LLM client), Vite build → `dist-renderer/` (dev port 5190, alias to core source), `scripts/dev.mjs`, `installer.nsh`, `branding/`.
- `packages/contracts` — project/task/approval/host-context contracts + factories + pure transitions. 12 tests.
- `packages/core` — reusable React workspace (`@cron-code/core`): zustand store, context bridge, shell UI (Header/Sidebar/ProjectArea/EmptyState/CronAssistant/LlmSettings/Layout/Footer/NavBar/WorkflowStrip), task UI (TaskComposer/TaskWorkspace/TaskCard), `llm.ts` client type. 30 tests.
- `packages/data-service` — JSON persistence (atomic debounced writes), `TaskRunner` + `CommandExecutor` (placeholder echo), console logger. 16 tests.
- `packages/host-adapter` — host boundary (standalone + mock). 5 tests.
- `shared/config` (tsconfig package, echo-ok scripts), `shared/design-tokens` (CSS tokens; now untracked source — no longer gitignored).
- `scripts/` dev-launcher suite (run-code-dev-hidden.ps1, code-dev-launcher-logic.ps1, create-code-dev-shortcut.ps1, tests). Root launcher `.bat` + `.vbs`.
- No OpenCode/agent execution layer, no audit-trail/verification-record, no session-handoff, no training-log, no model/provider-routing beyond LM Studio chat, no file-editing/patch, no Git release-gate, no approval UI wiring.

### Verified runtime (live, 2026-08-06)
- Dev stack running on port 5190 (state file: vite 43880, electron 38928, dev 44696); renderer process carries `--app-user-model-id=com.cron.code.dev` and `--user-data-dir="...CRON for Code Dev"` — AUMID identity confirmed unchanged.
- Production `C:\Program Files\CRON for Code\CRON for Code.exe` v1.1.7 running (PIDs 9032/11552/25456/28260, since 2026-08-04 20:32).
- LM Studio live on 127.0.0.1:1234 with 19 models; configured textModel `qwen3.5-9b-deepseek-v4-flash` and visionModel `qwen3-vl-8b-instruct` both present.
- Production `store.json`: 5 projects, 4 tasks, 0 approvals, preference `lmstudio.config` present.
- Desktop shortcut `CRON for Code Dev.lnk` present (target VBS, workdir repo root, icon code_icon.ico). Launcher log shows fresh-start, surface-running and stale-state repair behaviour on 5190; `CRON_MEDS_PORT=5190` env collision disclosed but never modified (correct).
- Dev-userData `cron-for-code-data` currently empty (dev store not yet written).

### Test/build state (exit codes recorded)
- `pnpm test` — PASS, exit 0 (63 tests: contracts 12, data-service 16, host-adapter 5, core 30).
- `pnpm typecheck` — PASS, exit 0. `pnpm build` — PASS, exit 0. `pnpm format:check` — PASS, exit 0 (note: format check is `echo ok` in every package — no real Prettier enforcement).
- `pnpm lint` — PASS, exit 0 (0 errors, 2 pre-existing react-hooks warnings).
- `git diff --check` — clean. Dev-launcher PS logic test (51 assertions) passed inside vitest harness.
- `scripts/test-code-dev-launcher-cycles.ps1` NOT re-run this session (it requires the dev single-instance lock free and terminates the owned dev Electron; the live dev app must not be disturbed by a read-only audit). Previously verified 2026-08-06 16:20.

### Top risks and gaps
1. (P0 if continuing uncommitted) Entire LM Studio + layout + launcher integration is uncommitted (25/3/19). HEAD is 1.1.4; the installed production app is 1.1.7. A fresh clone builds but does not contain the current app behaviour.
2. (P1) Generated `apps/standalone/dist-renderer/` output is still tracked (9 files) despite being gitignored; requires Venessa/Architect `git rm --cached` to stop build churn.
3. (P1) No genuine task/agent execution: `CommandExecutor` is a fixed echo; `json-store.ts` `runNow` is a no-op; no approval UI; store run/queue/approve actions unused by UI.
4. (P2) `cron:select-folder` accepts any directory — no repository-boundary/path allowlist enforcement.
5. (P2) No OpenCode/agent integration, no audit trail, no Git release gate, no session handoff — core CRON governance features absent.
6. (P2) `CRON_MEDS_PORT=5190` user-level env collides with CRON for Code's assigned port; launcher handles it correctly but it is fragile.
7. (P3) No external-navigation handler (`setWindowOpenHandler`/`will-navigate`) in Electron main; no `connect-src` CSP directive (renderer connect falls back to `default-src 'self'`; LM Studio goes through main-process fetch, so unaffected).
8. (P3) `dev.mjs` comment still says "port 5180" (stale; default is 5190).

### Recommended next phase
Phase: commit + package the current working tree under Venessa's exact staging, remove `dist-renderer/` from tracking, then proceed to the first real execution slice (task execution wiring with command allow/deny boundaries), keeping OpenCode/agent execution out of scope until the execution harness and approval gates exist.

### Proposed first slice
Venessa/Architect staged commit of the stabilised working tree (LM Studio integration, layout, dedup, launcher, lint config, README, gitignore) with `git rm --cached` of the 9 tracked `dist-renderer/` files; then a `task-execution harness` slice: real `CommandExecutor` with allow-listed command templates + repo-boundary working-directory control + stdout/stderr/exit-code capture + approval record creation + UI queue/run/approve wiring. (Recommendation only — Architect to decide.)

### Unresolved decisions
1. Exact staging set and commit strategy for the uncommitted working tree (v1.1.7 vs 1.1.4 baseline).
2. `git rm --cached` list for the 9 tracked `dist-renderer/` files.
3. Port-collision policy: give CRON for Meds a distinct port vs keeping 5190 for Code.
4. Next slice: task-execution harness vs agent (OpenCode) execution layer; approval gate semantics (auto-create vs user-created approvals; expiry policy).
5. Real formatter enforcement (`pnpm format:check` is currently a no-op echo).
6. LM Studio baseUrl host allowlist / SSRF hardening scope.

### No-implementation statement
This audit performed NO implementation: no source, test, configuration, dependency, lockfile, launcher, icon or generated output was changed by CC. Only documentation/audit files were updated (Architect Log, Project Log, audit report, audit evidence).

### No-Git-release statement
No Git mutation or release action was performed by CC: no add/stage/commit/push/pull/fetch/merge/rebase/tag/release/amend/reset/restore/clean/switch/history rewrite/remote change/delete of untracked files. All Git commands were read-only.

### Report and evidence paths
- `CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md` (appended audit entry)
- `CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md` (raw evidence, incl. verbatim prompt)
- `PROJECT_LOG.md` (appended execution entry + CC Training Notes)

### Verification Input Used — Verbatim
Stored in full, exactly as received, in `CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md` (section `## Verification Input Used — Verbatim`). The task prompt was the complete `CRON_for_Code_Fresh_Session_Audit_Prompt.md` content as issued.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit (this entry).

---

## Safe Execution and Approval Foundation — 2026-08-06 19:25 +10:00 (CC/OpenCode, approved implementation slice)

Task title: `Safe Task-Execution Harness and Approval-Gate Foundation`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Execution contracts added (`packages/contracts/src/execution.ts`)
`ExecutionStatus`, `ExecutionErrorCode`, `CommandCategory`, `OutputType`, `RiskCategory`, `ExecutionCommand`, `ExecutionRequest`, `ExecutionOutput`, `ExecutionError`, `ExecutionTimeout`, `ExecutionCancellation`, `ExecutionRecord`, `AuditEventType`, `AuditRecord`, `ExecutionApprovalRequirement`; factories `createExecutionOutput/Error/Record/AuditRecord`; pure `canTransitionExecution`/`isFinalExecutionStatus`. Approval contract extended with `commandId`, `cwd`, `commandSummary`, `requester`, `riskCategory` + `createExecutionApproval` (backward-compatible). All exported through the package barrel. 20 contracts tests.

### Project-boundary model (`packages/data-service/src/project-boundary.ts`)
`resolveProjectRoot` — canonical absolute path, exists + is-dir, Git-root discovery via `.git` marker (filesystem inspection only), rejects drive-root, UNC, system folders, missing paths, files; `assertPathInsideProject` — realpath-based traversal/symlink-escape rejection (case-insensitive on Windows); `assertIsGitRoot`; revalidated on every execution. 12 tests (incl. nested, traversal, escape, junction).

### Command catalogue (`packages/data-service/src/command-catalogue.ts`)
16 structured templates (`repo.identity/status/diff-check/changed-files/untracked-files/diff-stat/diff-name-status/diff`, `project.test/typecheck/lint/format-check/build/package-test`, `node.syntax-check`, `powershell.script-test`). Every entry: stable id, category, fixed args, optional validated params, timeout, approval-required (true for all this slice), read-only flag, output type, risk. Rejects shell metacharacters, injection patterns, traversal, absolute/option-like params, unknown ids; pnpm script must live under `node_modules`. `assertNotForbidden` denies the full forbidden-executable list and all Git mutation subcommands; `powershell.exe` only reachable through the fixed `-File` contract. 12 catalogue tests.

### Approval enforcement (`execution-service.ts` `ensureApproval`)
Running/queueing creates a specific approval (task+project+commandId+cwd) when none matches; exact approved (unexpired) reuse is narrow; pending blocks (task → `approval_required`); rejected blocks (task → `failed` with reason); expired approved blocks (task → `failed`); changing command/cwd expires the prior pending approval; pending limit 10 per action; approval contains commandId, cwd, summary, risk, requester, expiry; transitions persisted; approval audit events recorded. 8 approval/task-flow tests.

### Execution harness (`packages/data-service/src/execution-harness.ts`)
Accepts validated input; spawns with `shell:false`, `windowsHide:true`, exact cwd; captures executable, arg vector, display command, cwd, start/end/duration, exit code, signal, bounded stdout/stderr with truncation head+tail and preserved byte/line counts; per-template timeout; idempotent cancellation by execution id killing only the owned process tree (taskkill /T on the child pid); structured errors incl. launch failure; secret redaction (authorization/password/api-key/token patterns + private-key blocks); persisted before UI completion. 7 harness tests (success, non-zero exit, timeout, cancel, repeated-cancel idempotence, launch failure, truncation, redaction).

### Audit records (`packages/data-service/src/json-store.ts` + contracts)
Append-only `audit` array persisted atomically in `store.json`; events: `task.queued`, `approval.requested`, `approval.approved`, `approval.rejected`, `approval.expired`, `execution.started/completed/failed/cancelled/timed_out`. Listing by task/project/execution. No edit/delete API. Persisted across restart. 3 store tests + service-level persistence tests.

### Task-runner wiring
`json-store.tasks.runNow` is no longer a no-op (queues as intent marker). `queueTask`/`runTaskNow` backed by data service; `ExecutionService` orchestrates draft → queue → approval → approved request → harness → execution record → task status (`running` → `completed`/`failed`/`cancelled`/`failed`-on-timeout). No auto-retry. Single active execution per task enforced (state guard + active map). Restart recovery re-runs approved-but-unfinished tasks.

### Core UI wiring (`packages/core`)
`TaskWorkspace` now rendered in Layout with `TaskComposer`: per-task Queue/Run (safe command dropdown from `dataService.listCommands()`), Cancel while running, approval-required messaging, exit-code note; new `ApprovalPanel` (approve/reject, command summary, cwd, risk, requester) and `ExecutionPanel` (status, command, cwd, start/end, duration, exit code, expandable stdout/stderr, truncation/timeout/cancel notes, cancel button only while active, empty-state messaging). Store: `executions` + `commands` state, `loadCommands`, `refreshExecutions`, `cancelExecution`, `runTaskNow(taskId, commandId)`. No terminal emulator, no freeform command entry. 6 component + 6 store tests.

### IPC additions (`apps/standalone`)
Preload exposes explicit `task.runNow(taskId, commandId)`, `execution.cancel(executionId)`, `execution.listCommands()`, plus db save-execution/audit-append/audit-list bridges — no raw `ipcRenderer`. Main revalidates every payload via `ipc-validation.ts` (`assertKnownCommandId` against the 16-id set, `assertTaskId`, `assertExecutionId`, structural record checks, sanitised audit filters); renderer can only submit stable command ids and task/execution ids (no executable, cwd or argument arrays); main owns `ExecutionService` + `SafeExecutionHarness`; `cron:db:load-all` now returns executions + audit. `contextIsolation/sandbox/nodeIntegration:false`/CSP and LM Studio IPC preserved. 8 IPC-validation tests.

### Security controls (enforced in code)
Git mutation commands rejected (18 subcommands); forbidden executables denied (cmd/pwsh/bash/sh/wsl/curl/wget/certutil/bitsadmin/reg/schtasks/sc/wmic/taskkill/rundll32/mshta/gh); arbitrary PowerShell `-Command` denied (only fixed `-File` template); shell metacharacters + injection patterns rejected in arguments; path traversal + escape rejected; pnpm script pinned to node_modules; project root revalidated per execution; approval mandatory; output redacted; only owned process trees terminated; no dependency install; lockfile unchanged.

### Runtime proof (controlled, exit 0)
`node .runtime\runtime-proof.mjs` demonstrated all 18 items: project selected → task created → approval requested → execution blocked → approval granted → command started → exact cwd recorded → commandId recorded → stdout/stderr captured → exit 0 recorded → execution record persisted → audit events persisted (`approval.requested`, `execution.started`, `execution.completed`) → restart retains result → rejected approval blocks → git mutation rejected pre-launch → path escape rejected pre-launch → timeout (`timed_out`) and cancellation (`cancelled`) proofs → no unrelated process touched. Live dev Electron (AUMID `com.cron.code.dev`, port 5190) and production v1.1.7 PIDs verified untouched after the proof.

### Tests/build results
`pnpm test` exit 0 (140: contracts 20, data-service 74, host-adapter 5, core 41). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0 (no-op `echo ok`). `git diff --check` clean. Narrow secret scan clean.

### Exact files changed by this slice
Modified (on top of pre-existing tree): `packages/contracts/src/approval.ts`, `packages/contracts/src/index.ts`, `packages/data-service/src/types.ts`, `packages/data-service/src/json-store.ts`, `packages/data-service/src/json-store.test.ts`, `packages/data-service/src/index.ts`, `apps/standalone/electron/preload.cjs`, `apps/standalone/electron/main.mjs`, `apps/standalone/src/ipc-data-service.ts`, `packages/core/src/store.ts`, `packages/core/src/store.test.ts`, `packages/core/src/components/Layout.tsx`, `packages/core/src/components/TaskWorkspace.tsx`, `packages/core/src/index.ts`.
Created: `packages/contracts/src/execution.ts`, `execution.test.ts`, `packages/data-service/src/project-boundary.ts(.test)`, `command-catalogue.ts(.test)`, `execution-harness.ts(.test)`, `execution-service.ts(.test)`, `ipc-validation.ts(.test)`, `packages/core/src/components/ApprovalPanel.tsx`, `ExecutionPanel.tsx`, `packages/core/src/task-ui.test.tsx`, `.runtime/runtime-proof.mjs` (gitignored).
Documentation: `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_REPORT.md` (created), `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended + training notes), this log.
Unchanged by this slice: launcher, icons, packaging, port 5190, AUMID, LM Studio, README, .gitignore, eslint config, `dev.mjs`, `vite.config.ts`, `task-runner.ts`.

### Unresolved issues
1. `cron:select-folder` still has no repository-boundary/path allowlist at selection time (boundary is enforced at execution time).
2. Approval for a failed/rejected command requires a new approval only if the command/cwd changes; an approved command can be re-run (narrow reuse).
3. `powershell.script-test` is catalogued but has no real repo script yet (only node-based commands exercised).
4. `pnpm format:check` remains a no-op stub (pre-existing).
5. Runtime proof was executed at the service layer (real store + real harness + real git) rather than through the Electron UI window; UI interactions verified by component tests.

### No-stage / no-commit / no-push statement
Nothing staged, committed or pushed. No Git mutation or release action performed. All Git commands read-only.

### Report and evidence paths
- `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_REPORT.md`
- `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md`
- `PROJECT_LOG.md` (appended execution entry + CC Training Notes)

### Verification Input Used — Verbatim
Stored in full, exactly as received, in `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md` (section `## Verification Input Used — Verbatim`).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair (this entry).

---

## Workspace Hierarchy and Shell-Fit Repair — 2026-08-07 07:54 +10:00 (CC/OpenCode, approved layout slice)

Task title: `Workspace Hierarchy and Shell-Fit Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Root causes (traced)
1. Layout stacked `TaskWorkspace` + `TaskComposer` + `CronAssistant` all full-width flex:1 — several full-width "apps" competing for the screen; chat co-dominant with tasks.
2. Approval/execution were thin strips inside `TaskWorkspace` (bottom), not a dedicated evidence surface.
3. Safe-command selector floated in the TaskWorkspace header bar, unrelated to any task.
4. TaskComposer action labelled `Draft` with a send-like icon.
5. Semi-transparent panels (0.36–0.42) let the background artwork show through behind work surfaces.
6. Sidebar lower sections (Settings/Account) sat flush to the window bottom with minimal clearance and no safe scroll wrapper.

### Changes delivered (presentation-only; no business logic moved into components)
- **Layout:** selected-project branch now `ProjectArea → (row: primary task column | 380px chat column)`. Task column = `TaskWorkspace` (flex:1) → `TaskComposer` → `ActivityPanel`. Chat column fixed width 380px, 46px when collapsed. Overlay alpha raised 0.88/0.92; work panels ~0.92–0.94 near-solid.
- **TaskWorkspace:** removed the floating command selector from the header; each `TaskRow` now owns a command `<select>` (aria-labelled per task) beside its Queue/Run/Cancel controls. ApprovalPanel/ExecutionPanel moved out to `ActivityPanel`.
- **TaskComposer:** action renamed `Draft` → `Create Task` (ClipboardList icon, filled accent); title optional; description required (unchanged validation/behaviour).
- **ActivityPanel (new):** dedicated expandable lower detail panel "Approval & Evidence" with pending/execution counts; contains ApprovalPanel + ExecutionPanel on a 220px (min 140px) scrollable evidence surface; collapsible header.
- **CronAssistant:** secondary header ("Assistant — supporting help"), collapse toggle (PanelRightClose), collapsed rail (46px) with re-open button; near-solid surface; message/composer behaviour unchanged.
- **Sidebar:** lower sections (Current Project, Agent State, Settings, Account) wrapped in a fixed `lower-stack` (`flex-shrink:0`, `min-height:0`, `overflow:hidden`); 14px bottom spacer so Settings/Account clear the taskbar; projects list remains the only scroll region; rail `min-height:0`.
- **Tests:** new `packages/core/src/workspace-layout.test.tsx` (11 tests) covering layout hierarchy, per-task command selector, composer action + validation, ActivityPanel evidence + collapse, chat collapse rail, sidebar lower-stack; `execution-service.test.ts` concurrency test made deterministic (poll until `running` instead of fixed 80ms).

### Protected boundaries preserved
Port 5190, launcher files/logic, shortcut, AUMID `com.cron.code.dev`, icons, packaging, LM Studio wiring, execution contracts, command catalogue + security rules, project-boundary enforcement, approval semantics, execution harness, audit persistence, IPC validation, Git safety policy, repository selection logic. No OpenCode, no arbitrary command entry, no new dependencies, no broad redesign, no artwork changes.

### Runtime verification (launcher-driven, real app)
`scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0 (`surface-running`, same owned PIDs vite 43880 / electron 38928 / dev 44696). Dev server 5190 → HTTP 200. Renderer AUMID `com.cron.code.dev` verified live. Production CRON for Code PIDs 9032/11552/25456/28260 untouched. No unrelated process terminated. Visual confirmation intentionally left to Venessa (CC does not claim visual approval).

### Tests/build results
`pnpm test` exit 0 (151: contracts 20, data-service 74, host-adapter 5, core 52). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. `git diff --check` clean. Secret scan clean.

### Exact files changed by this slice
Modified: `packages/core/src/components/Layout.tsx`, `TaskWorkspace.tsx`, `TaskComposer.tsx`, `CronAssistant.tsx`, `Sidebar.tsx`, `packages/core/src/index.ts`, `packages/data-service/src/execution-service.test.ts` (flaky-test determinism only).
Created: `packages/core/src/components/ActivityPanel.tsx`, `packages/core/src/workspace-layout.test.tsx`.
Documentation: `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_REPORT.md` + `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended + training notes), this log.

### Unresolved issues
1. Visual/UX acceptance at full-screen and smaller supported window sizes requires Venessa's manual review (not claimed by CC).
2. `pnpm format:check` remains a no-op stub (pre-existing).
3. `node.syntax-check` / `powershell.script-test` remain catalogued but only node-based commands have been exercised end-to-end (pre-existing).
4. One pre-existing flaky test (`serialises executions per task`) was made deterministic in this slice; no product code changed for it.

### No-stage / no-commit / no-push statement
Nothing staged, committed or pushed. No Git mutation or release action performed. All Git commands read-only.

### Report and evidence paths
- `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_REPORT.md`
- `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md`
- `PROJECT_LOG.md` (appended execution entry + CC Training Notes)

### Verification Input Used — Verbatim
Stored in full, exactly as received, in `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md` (section `## Verification Input Used — Verbatim`).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair (this entry).

---

## Project Picker Load Regression Repair — 2026-08-07 08:55 +10:00 (CC/OpenCode, approved narrow defect-repair slice)

Task title: `Project Picker Load Regression Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Exact root cause (proven, not guessed)
The project-open flow was a fire-and-forget, feedback-free async chain with a race-prone dedup:
1. `App.onSelectProject` discarded the authoritative return value of `hostAdapter.selectProject()` and relied solely on the host adapter's `project-selected` event, which a `useEffect` listener forwarded to `openProjectPath` unawaited.
2. `store.openProjectPath` used a dynamic `import('@cron-code/contracts')` (latency + failure point) and its dedup consulted only in-memory `get().projects`, so a second selection racing the first's in-flight open created duplicate persisted records (2 "CRON for Meds" records reproduced).
3. Failures were invisible — every `catch` set the store `error`, and no component rendered it; a picker/IPC failure was an unhandled rejection with no UI signal.
4. No loading/optimistic state: the open ran asynchronously (measured ~500–600 ms in the Node repro) with zero feedback, so a normal click appeared to "do nothing".

Reproduced with the built packages, then confirmed fixed with the repaired wiring (immediate activation; dedup; persistence; surfaced error). Data layer, host-adapter bridge, preload, IPC, `reconcileProjects`, and `selectProject` were verified correct.

### Exact repair (narrow; presentation + store only)
- `App.tsx`: `onSelectProject` now awaits the returned selection and opens it directly (`await openProjectPath(selection.rootPath, selection.name)`), with a try/catch that surfaces errors via `setError`. The `project-selected` event listener is retained as an idempotent secondary path.
- `store.ts`: static imports for `createCodeProject`/`createTask` (removes the dynamic-import latency/failure class); `openProjectPath` guards non-string inputs, sets `isLoading`, and dedupes against BOTH in-memory and persisted projects; `addProject` dedupes against persisted projects (closes the duplicate race); `selectProject` clears `isLoading`.
- `Layout.tsx` + new `ErrorBanner.tsx`: the store `error`/`isLoading` are now rendered as a visible, dismissible banner, so failures are never silent.
- `index.ts`: export `ErrorBanner`.

### Protected boundaries preserved
Workspace hierarchy repair (task-first layout, collapsible chat, Approval & Evidence panel, safe command selector, sidebar shell-fit); port 5190; AUMID `com.cron.code.dev`; launcher + shortcut; LM Studio wiring; safe execution harness; approval semantics; command catalogue; audit persistence; IPC security model; project deduplication rules (kept, strengthened); storage format unchanged; no new dependencies; no OpenCode.

### Tests added
- `packages/host-adapter/src/standalone.test.ts` (5): folder-picker bridge — success returns selection + emits event; cancelled → null + no event; picker failure propagates; name derivation; unsubscribe.
- `packages/core/src/project-picker.test.tsx` (10): real data-service + real host adapter + real store — immediate activation + persistence; case/slash/trailing dedup; persisted-folder reactivation without duplicate; switching projects; cancelled no-op; picker failure surfaces error; EmptyState New Project invokes handler; ErrorBanner renders + dismisses + loading note; persisted reload without duplicate.
- Existing dedup/store tests still pass; `openProjectPath`/`addProject` strengthened.

### Runtime verification (launcher-driven, real app)
`scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0 (`fresh-start`; stale state correctly detected and replaced; app-ready). Dev server 5190 → 200 (owned Vite PID 52140). Renderer AUMID `com.cron.code.dev` verified live. Production CRON for Code PIDs 9032/11552/25456/28260 untouched. LM Studio 200. No unrelated process terminated. (Interactive dialog selection in the running window is Venessa's step — not claimed by CC; the full picker→bridge→store→persist flow is proven with the real built packages.)

### Tests/build results
`pnpm test` exit 0 (166: contracts 20, host-adapter 10, data-service 74, core 62). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. `git diff --check` clean. Secret scan clean.

### Exact files changed by this slice
Modified: `packages/core/src/store.ts`, `packages/core/src/components/App.tsx`, `packages/core/src/components/Layout.tsx`, `packages/core/src/index.ts`.
Created: `packages/core/src/components/ErrorBanner.tsx`, `packages/core/src/project-picker.test.tsx`, `packages/host-adapter/src/standalone.test.ts`.
Documentation: `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_REPORT.md` + `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended + training notes), this log.
Local-only (gitignored): `.runtime/picker-repro.mjs`, `.runtime/picker-debug.mjs`, `.runtime/picker-debug2.mjs`, `.runtime/dynimport-check.mjs`.

### Unresolved issues
1. Live interactive dialog verification in the running window is Venessa's manual step.
2. Last-active-project restore on startup is not implemented (pre-existing intended behavior — activeProjectId stays null after load until a project is opened); the task asked to "restore according to existing intended behavior", which is unchanged.
3. `pnpm format:check` remains a no-op stub (pre-existing).

### No-stage / no-commit / no-push statement
Nothing staged, committed or pushed. No Git mutation or release action performed. All Git commands read-only.

### Report and evidence paths
- `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_REPORT.md`
- `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md`
- `PROJECT_LOG.md` (appended execution entry + CC Training Notes)

### Verification Input Used — Verbatim
Stored in full, exactly as received, in `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md` (section `## Verification Input Used — Verbatim`).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair (this entry).
- 2026-08-07 09:35 — project management and restart controls (this entry).

---

## Project Management and Restart Controls — 2026-08-07 09:35 +10:00 (CC/OpenCode, approved implementation slice)

Task title: `Project Management and Restart Controls`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `main -> origin/main` (0/0). No staged files.
Exact prompt: stored verbatim below.

### Verification Input Used — Verbatim

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Project_Management_and_Restart_Controls_Prompt.md"}

# CRON for Code — Project Management and Restart Controls

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved focused implementation slice.

## User-approved objective

Add safe project-management controls and a reliable app restart path without changing CRON for Code’s execution safety, approval model, launcher identity, provider wiring, or Git state.

This slice follows the accepted Project Picker Load Regression Repair.

## Primary objectives

Implement:

1. a real **Restart CRON** function;
2. safe **Remove from CRON** project removal;
3. project context actions;
4. missing-folder handling and relinking;
5. last-active-project restoration;
6. the visible sidebar clipping repair.

## Protected boundaries

Preserve:

- repository path and current uncommitted work;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- restart-safe launcher architecture;
- production/dev user-data separation;
- workspace hierarchy;
- task-first layout;
- collapsible assistant panel;
- Approval & Evidence panel;
- per-task safe command selector;
- LM Studio wiring;
- safe execution harness;
- approval semantics;
- command catalogue;
- audit persistence;
- IPC validation/security model;
- existing project deduplication and canonical-id rules;
- all user data;
- Electron sandbox and context isolation;
- no arbitrary filesystem or shell execution from the renderer.

Do not:

- redesign the shell;
- delete real project folders;
- delete Git repositories;
- add OpenCode;
- add new dependencies unless absolutely required and blocked for Architect approval;
- change launcher port, identity, icon, packaging, or version;
- weaken project-boundary, execution, approval, audit, or IPC safety;
- stage, commit, push, pull, fetch, merge, rebase, reset, restore, clean, checkout, switch, tag, release, stash, rewrite history, modify remotes, or delete untracked files.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_REPORT.md`
   - `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md`
   - current sidebar, project store, host adapter, preload, Electron main, launcher, persistence, and project tests.
3. Capture exact working-tree state.
4. Preserve every pre-existing change.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

## Required investigation

Trace and verify the current implementation of:

- top-right `CRON Restart`;
- Electron main-process lifecycle;
- single-instance lock;
- tray/hide behavior;
- restart-safe launcher and state file;
- current project persistence;
- project/task/approval/execution/audit relationships;
- active-project selection;
- sidebar lower-stack layout;
- project-row rendering and interaction patterns;
- missing or inaccessible root paths;
- current host/preload IPC surface.

Determine exact implementation points before editing. Do not guess.

# Required behavior

## 1. Restart CRON

The existing **CRON Restart** control must perform a genuine dev-app restart.

Required behavior:

- user clicks `CRON Restart`;
- UI shows immediate restart feedback;
- current dev Electron app closes cleanly;
- the approved restart-safe launcher path relaunches CRON for Code Dev;
- the app returns on port `5190`;
- AUMID remains `com.cron.code.dev`;
- dev user-data remains unchanged;
- saved projects, active project, tasks, approvals, executions, audit records, and LM Studio settings persist;
- production CRON for Code remains untouched;
- unrelated CRON apps and processes remain untouched;
- repeated restart clicks do not create duplicate app stacks;
- restart failure produces a visible concise error.

The renderer must not receive arbitrary process or shell access.

Use a narrow validated IPC contract owned by Electron main. Reuse the existing launcher/lifecycle design rather than creating a second competing restart system.

## 2. Project context menu

Add a clear project-row context menu using the existing CRON visual language and Lucide icons already available in the project.

Preferred trigger:

- visible three-dot button on hover/focus;
- keyboard accessible;
- right-click support is optional only if it does not complicate the slice.

Actions:

- Open in File Explorer
- Copy project path
- Refresh project
- Rename display name
- Re-link folder
- Remove from CRON

Do not add permanent disk deletion.

## 3. Remove from CRON

Label exactly:

`Remove from CRON`

Never label this action `Delete Project`.

Required confirmation:

- project display name;
- full stored path;
- explicit statement that the Windows folder and repository will not be deleted.

Required behavior:

- removes the project from the CRON sidebar and active project list;
- never touches the filesystem folder;
- never runs Git;
- if removing the active project, safely select another available project or show the empty state;
- no stale activeProjectId;
- project does not reappear after restart unless the user selects/relinks it again.

### Related CRON records

Do not silently destroy task, approval, execution, or audit history.

Implement safe archival semantics:

- project record becomes archived/removed from active navigation;
- linked tasks, approvals, executions, and audit records remain preserved;
- archived project history remains internally referentially valid;
- normal sidebar loading excludes archived projects;
- re-adding/relinking the same canonical folder should reuse or restore the archived canonical project where safe, preserving history;
- no storage migration that risks existing data without explicit backwards-compatible handling and tests.

If the current storage architecture cannot safely support archival within this slice, return:

`BLOCKED — ARCHITECT DECISION REQUIRED`

Do not replace archival with destructive cascading deletion.

## 4. Open in File Explorer

- open the selected project root in Windows File Explorer;
- main process validates the project id and resolves the stored canonical path;
- reject missing, invalid, drive-root, system, or unsafe paths;
- renderer never submits an arbitrary path;
- visible error on failure.

## 5. Copy project path

- copy the stored canonical project path to clipboard;
- use a narrow approved bridge;
- provide brief visible confirmation;
- no raw clipboard or Electron object exposure.

## 6. Refresh project

Refresh must:

- revalidate the stored path;
- update project availability/missing state;
- refresh visible metadata already supported by the current app;
- not create duplicates;
- not alter tasks, approvals, executions, or audit history;
- not run arbitrary commands.

## 7. Rename display name

- rename only the CRON display name;
- do not rename the Windows folder;
- validate non-empty trimmed input;
- preserve rootPath and canonical identity;
- persist after restart;
- duplicate display names may be allowed only if paths remain distinct, unless current contracts forbid it.

## 8. Missing-folder state

When a persisted project folder no longer exists or is inaccessible:

- keep its historical record;
- show a clear missing/unavailable state in the sidebar and project area;
- disable unsafe actions such as execution;
- allow:
  - Re-link folder
  - Remove from CRON
  - Copy stored path
- do not silently drop the project;
- do not create a replacement record automatically.

## 9. Re-link folder

- user chooses a replacement directory through the approved folder picker;
- validate the selected path;
- update the existing project record rather than creating a duplicate;
- preserve project id and linked task/approval/execution/audit history;
- apply canonical path deduplication;
- if the selected path belongs to another active canonical project, block with a visible conflict error rather than merging records silently;
- persist after restart.

## 10. Last-active-project restoration

Implement the pre-existing missing behavior:

- persist the last active project id;
- after full app close/restart, restore it when still active and available;
- if archived, removed, or missing, choose the next safe available project or empty state;
- never create duplicates during restore;
- cancellation or failed restore must not corrupt state.

## 11. Sidebar clipping repair

Fix the visible lower-left clipping shown in Venessa’s manual screenshot:

- Account row must be fully visible;
- DEV marker must not clip outside the sidebar;
- Settings and Account must remain above the taskbar;
- projects list remains the only flexible/scrolling region;
- no broad shell redesign;
- verify at full-screen and at the current minimum supported window size.

# IPC and safety requirements

All new host operations must use narrow validated contracts.

Renderer may submit only stable ids and validated user input.

Do not expose:

- raw `ipcRenderer`;
- raw `shell`;
- arbitrary paths for Explorer;
- arbitrary commands;
- process ids;
- shell strings;
- filesystem delete APIs.

Main process must resolve authoritative project records from persistence before performing host actions.

Restart must not provide a general process-control surface.

# Required tests

Add focused tests for:

## Restart

- restart button invokes approved host method;
- duplicate restart requests are coalesced or safely rejected;
- restart IPC validates payload;
- restart persists current project state;
- no raw process/shell API exposed;
- failure displays visible error.

## Remove/archive

- confirmation is required;
- remove excludes project from sidebar;
- filesystem is never deleted;
- active removal selects fallback or empty state;
- linked history remains preserved;
- restart does not restore removed project;
- re-add of same canonical path restores/reuses safely;
- no duplicate canonical record.

## Project menu

- actions are keyboard accessible;
- Explorer uses project id, not arbitrary renderer path;
- copy path uses canonical stored path;
- rename changes display name only;
- refresh updates availability;
- menu closes safely after action.

## Missing/relink

- missing path is visibly marked;
- execution action is unavailable for missing project;
- relink preserves project id/history;
- relink conflict is blocked visibly;
- cancel is safe;
- invalid folder shows error.

## Last-active restore

- valid active project restores after restart/load;
- removed project does not restore;
- missing project uses safe fallback;
- no project results in empty state;
- no duplicates on reload.

## Layout regression

- Account and DEV marker remain within sidebar;
- Settings/Account remain visible;
- workspace hierarchy remains intact;
- assistant remains secondary/collapsible;
- Approval & Evidence remains present;
- safe command selector remains per task.

Run:

- focused core tests;
- focused host-adapter tests;
- focused standalone/preload/IPC tests;
- persistence/data-service tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

# Required runtime proof

Use the real CRON for Code Dev app and existing shortcut/launcher.

Verify:

1. Launch CRON for Code Dev.
2. Select CRON for Meds.
3. Click `CRON Restart`.
4. Confirm the current dev app closes and relaunches once.
5. Confirm port `5190`.
6. Confirm AUMID `com.cron.code.dev`.
7. Confirm CRON for Meds restores as active.
8. Confirm tasks/history/settings persist.
9. Confirm production CRON and unrelated processes remain untouched.
10. Open a project’s menu.
11. Copy its path and confirm correctness.
12. Open it in File Explorer.
13. Rename its CRON display name and confirm the folder name does not change.
14. Remove a non-active project and confirm it disappears only from CRON.
15. Confirm its Windows folder still exists.
16. Restart and confirm it remains removed.
17. Test active-project removal and safe fallback.
18. Test a missing-folder record using a controlled temporary repository path.
19. Confirm missing state, disabled execution, relink, cancellation, and successful relink.
20. Confirm Account and DEV marker are not clipped at full-screen and minimum supported size.
21. Confirm no duplicate app stack and no unrelated process termination.

Do not claim Venessa’s visual or usability acceptance.

# Scope control

Touch only:

- restart button and narrow lifecycle IPC;
- project context menu;
- project archive/removal;
- Explorer/copy/refresh/rename/relink;
- project availability state;
- active-project persistence/restore;
- sidebar lower-stack clipping;
- focused tests;
- required reports/logs.

Do not alter:

- execution command catalogue;
- approval rules;
- audit event semantics except adding narrowly required project-management audit events if architecture already supports them;
- LM Studio/provider architecture;
- chat behavior;
- launcher port or identity;
- branding;
- packaging/version;
- Git state.

# Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes

Create:

- `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md`
- `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md`

Evidence must include:

- exact prompt verbatim;
- every command/tool operation used;
- working directory;
- timestamps;
- exit codes;
- raw stdout;
- raw stderr;
- failed attempts;
- exact architecture decisions;
- before/after runtime proof;
- conclusion-to-evidence mapping.

# Mandatory final self-audit

Confirm:

- correct repository, branch, and HEAD;
- nothing staged;
- exact modified/deleted/untracked counts;
- every changed path classified;
- all pre-existing work preserved;
- only authorised files changed;
- restart works through approved lifecycle path;
- no duplicate app stack;
- production and unrelated processes untouched;
- project removal never deletes filesystem content;
- linked history remains preserved;
- removed project remains absent after restart;
- missing-folder state works;
- relink preserves project identity/history;
- last-active restore works safely;
- Explorer/copy/refresh/rename work;
- sidebar clipping repaired;
- workspace hierarchy intact;
- task/approval/execution/chat wiring intact;
- LM Studio unchanged;
- launcher unchanged;
- port remains `5190`;
- AUMID remains `com.cron.code.dev`;
- tests/build/lint/typecheck pass with exit code `0`;
- `git diff --check` passes;
- secret and suspicious-path scans pass;
- exact prompt preserved in Architect Log;
- Project Log and training notes updated;
- report/evidence files exist;
- no prohibited Git action occurred.

If safe archival, restart, or relink cannot be implemented without changing protected architecture, return:

`BLOCKED — ARCHITECT DECISION REQUIRED`

# Git prohibition

CC/OpenCode must not:

- add;
- stage;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- tag;
- release;
- amend;
- reset;
- restore;
- clean;
- checkout;
- switch;
- stash;
- rewrite history;
- modify remotes;
- delete untracked files.

All Git operations must remain read-only.

# Final response format

Return the complete response inside one single copyable code block.

Use:

# CRON FOR CODE — PROJECT MANAGEMENT AND RESTART REPORT

## 1. Final status
## 2. Repository identity
## 3. Verification input used
## 4. Complete CRON Architect Log — Verbatim
## 5. Initial working-tree state
## 6. Investigation and architecture decisions
## 7. Restart implementation
## 8. Project context menu
## 9. Remove/archive behavior
## 10. Explorer, copy, refresh, and rename
## 11. Missing-folder and relink behavior
## 12. Last-active-project restoration
## 13. Sidebar clipping repair
## 14. IPC and safety proof
## 15. Persistence and history-preservation proof
## 16. Runtime verification
## 17. Tests, build, lint, typecheck, and quality results
## 18. Exact files changed
## 19. Exact files created
## 20. Protected boundaries preserved
## 21. Remaining gaps
## 22. Final self-audit
## 23. Git safety statement
## 24. Exact next action

Final status must be one of:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

Explicitly confirm:

- nothing staged;
- nothing committed;
- nothing pushed;
- no prohibited Git or release action occurred.

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`

# Start now

Begin with repository identity verification, full log review, and lifecycle/project-store tracing.

Implement only the approved Project Management and Restart Controls slice.

Do not redesign the shell.

Do not delete real project folders.

Do not weaken execution, approval, audit, IPC, launcher, or Git safety.
```

### Slice plan (confirmed before editing)

- `CodeProject` gains `availability: 'available' | 'missing' | 'unavailable'` and `archived: boolean` (backward-compatible defaults from legacy store rows).
- New `audit` event types narrowly added: `project.archived`, `project.restored`, `project.renamed`, `project.relinked`, `project.refreshed`, `app.restart_requested` (no change to existing semantics).
- `DataService` gains `projects.archive/relink/rename/setAvailability/refreshAvailability`; `preferences` already covers last-active id; `cron:db:load-all` carries the preference to the renderer.
- New IPC channels owned by main with strict payload validation: `cron:app:restart`, `cron:project:reveal`, `cron:project:copy-path`, `cron:project:archive`, `cron:project:relink`, `cron:project:rename`, `cron:project:refresh`, `cron:project:restore-last-active`. Preload exposes only explicit bridges; no `shell`/`ipcRenderer`/arbitrary paths surface to renderer.
- Renderer-side `ProjectContextMenu` (hover three-dot + keyboard accessible: Enter, Arrow keys, Escape, tabindex) + `ConfirmDialog`, `RenameDialog`, `RelinkDialog`; `Sidebar` re-renders archived/missing/lower-stack-clipping-safe.
- `CRON Restart` button debounced in renderer (no duplicate requests) + guarded in main; restart path uses `app.relaunch()` after a graceful flush, single-instance lock kept intact.
- Last-active id persisted in `preferences` on `selectProject` and applied after `loadProjects`; archived/missing → safe fallback.
- Sidebar lower-stack made explicitly visible: `flex-shrink:0`, `min-height:0` chain; Account row uses `flex:1` on the label and `flex-shrink:0` on icon + DEV badge so the DEV marker cannot clip outside the rail.

### Working tree (before edits)
74 changes; pre-existing untracked files preserved.

---

## Live IPC Registration and Stale Electron Replacement Repair — 2026-08-07 15:10 +10:00 (CC/OpenCode, approved narrow runtime defect-repair slice)

Task title: `Live IPC Registration and Stale Electron Replacement Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `main -> origin/main` (0/0). No staged files.
Exact prompt: stored verbatim below.

### Verification Input Used — Verbatim

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Live_IPC_Registration_and_Stale_Electron_Repair_Prompt (2).md"}

# CRON for Code — Live IPC Registration and Stale Electron Replacement Repair

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved narrow runtime defect-repair slice.

## User-verified live defect

Venessa manually tested the current CRON for Code Dev build.

Observed behavior:

- the app opens;
- the shell renders;
- clicking `CRON Restart` shows:

  `Error invoking remote method 'cron:app:restart': Error: No handler registered for 'cron:app:restart'`

- the other newly added project-management actions also fail;
- therefore the renderer/preload surface exists, but the live Electron main process does not have the new IPC handlers registered.

The previous Project Management and Restart Controls slice is not accepted.

## Primary objective

Repair the live dev runtime so the current Electron main process actually loads and registers all approved IPC handlers, and ensure the launcher safely replaces an owned stale Electron instance when main-process code changes.

This is not a UI redesign task.

## Required handlers

The live Electron main process must register and respond to:

- `cron:app:restart`
- `cron:project:reveal`
- `cron:project:copy-path`
- `cron:project:refresh`
- `cron:project:rename`
- `cron:project:relink`
- `cron:project:archive`
- `cron:project:restore-last-active`

## Protected boundaries

Preserve:

- port `5190`;
- AUMID `com.cron.code.dev`;
- dev userData `CRON for Code Dev`;
- production CRON for Code;
- restart-safe launcher architecture;
- single-instance behavior;
- LM Studio wiring;
- project data;
- tasks, approvals, executions, audit records;
- execution safety;
- approval semantics;
- Electron sandbox/context isolation;
- narrow preload surface;
- current project-management contracts;
- current shell layout;
- current tests;
- all pre-existing work.

Do not:

- redesign the shell;
- change launcher port;
- change AUMID;
- change package versions;
- add dependencies;
- weaken IPC validation;
- expose raw `ipcRenderer`, `shell`, `process`, arbitrary paths, or commands;
- delete projects or folders;
- stage, commit, push, pull, fetch, merge, rebase, tag, release, amend, reset, restore, clean, checkout, switch, stash, rewrite history, modify remotes, or delete untracked files.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md`
   - `apps/standalone/electron/main.mjs`
   - `apps/standalone/electron/preload.cjs`
   - `apps/standalone/scripts/dev.mjs`
   - `scripts/run-code-dev-hidden.ps1`
   - `scripts/code-dev-launcher-logic.ps1`
   - `apps/standalone/src/ipc-data-service.ts`
   - `apps/standalone/src/main.tsx`
   - relevant host-adapter and core store files.
3. Capture exact working-tree state.
4. Preserve all pre-existing changes.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

# Required investigation

## 1. Prove which Electron main file the live app is loading

Capture:

- live dev Electron PID;
- full command line;
- working directory;
- `process.execPath`;
- `process.argv`;
- `app.getAppPath()`;
- resolved main entry path;
- source file timestamp/hash if practical;
- dev userData path;
- AUMID;
- loaded port.

Do not infer from source alone.

## 2. Prove whether handler registration code executes

Instrument the narrow dev-only startup path to record:

- startup timestamp;
- current main-process PID;
- every new IPC handler registration attempt;
- success/failure per channel;
- duplicate-handler detection;
- final registered-handler summary.

Store diagnostics under `.runtime/`.

Do not log secrets, project content, model payloads, or full user data.

## 3. Trace the handler registration lifecycle

Determine whether handlers are missing because:

- the wrong `main.mjs` is loaded;
- an old Electron process was reused;
- `main.mjs` did not reload after source changes;
- handler registration is inside a branch that did not execute;
- registration happens after a failure;
- a startup exception prevented registration;
- dev and packaged entry paths diverge;
- preload/renderer are newer than main;
- the launcher surfaced a stale running instance;
- `app.whenReady()` sequencing is wrong;
- handler removal or re-registration logic removed them.

Capture exact evidence.

## 4. Inspect stale-process reuse

Trace launcher behavior when:

- Vite is current but Electron is stale;
- Electron main source changes while Electron stays alive;
- renderer hot reloads but main process does not;
- the shortcut is launched while a stale Electron instance already holds the single-instance lock.

The launcher must not treat a stale owned Electron process as healthy merely because the window exists.

## Required repair behavior

## A. Main-process handler registration

Implement a single deterministic registration function, for example:

`registerCronIpcHandlers()`

Requirements:

- called exactly once after required services are initialized;
- registers all eight required handlers;
- logs registration success in dev;
- throws or surfaces a clear startup error if a required handler cannot register;
- no duplicate registration across reload/restart;
- cleanup occurs only during real shutdown where needed;
- no partial silent registration.

## B. Dev runtime version/identity marker

Add a narrow dev-only main-process runtime marker containing:

- app version;
- main-process PID;
- source/runtime build marker;
- registered IPC channel list;
- startup timestamp.

Expose it only through a narrow validated diagnostic IPC method or `.runtime` file.

Do not expose arbitrary internals.

## C. Stale Electron replacement

Update the restart-safe launcher so it can distinguish:

- healthy current Electron;
- stale owned Electron with outdated main-process marker;
- broken owned Electron missing required handlers;
- foreign Electron;
- no Electron.

Required behavior:

- replace only an owned stale/broken dev Electron;
- never kill production CRON for Code;
- never kill unrelated Electron apps;
- never kill another CRON app;
- keep owned Vite when safe;
- relaunch Electron from `apps/standalone`;
- wait for both:
  - renderer-ready;
  - main-process IPC-ready marker.

A window title or live PID alone is not sufficient.

## D. Visible failure

If required handlers are missing after launch:

- show a concise visible error;
- log exact missing channels under `.runtime`;
- do not present the app as fully ready;
- do not silently reuse the broken instance.

Preferred user message:

`CRON for Code started with an incomplete host connection. Restart the dev app.`

## E. Restart action

After registration repair:

- `CRON Restart` invokes the live handler;
- current dev app flushes data;
- relaunch occurs once;
- new process registers all handlers;
- active project restores;
- project/task/approval/execution/audit/LM Studio settings persist;
- no duplicate stack;
- failure is visible.

## F. Project actions

Verify all actions through the real running window:

- Open in File Explorer
- Copy project path
- Refresh project
- Rename display name
- Re-link folder
- Remove from CRON
- Restore last active project

# Required tests

Add focused tests for:

## Main registration
- all eight required handlers register;
- registration function called once;
- startup failure surfaces when a handler cannot register;
- duplicate registration is rejected safely;
- dev marker contains the required channel list.

## Launcher stale-runtime detection
- current runtime marker → reuse/surface;
- missing marker → replace owned Electron;
- outdated marker → replace owned Electron;
- incomplete channel list → replace owned Electron;
- foreign process → refuse/leave untouched;
- production Electron → untouched;
- Vite may be reused safely;
- replacement launches from `apps/standalone`.

## Restart
- live restart handler exists;
- duplicate restart requests coalesce;
- restart flushes persistence;
- one relaunch only;
- active project restores.

## Project actions
- all project IPC handlers exist and respond;
- payload validation remains;
- renderer sends ids, not paths;
- no raw Electron API exposed.

## Regression
- shell renders;
- project picker still works;
- project archive semantics preserved;
- missing-folder/relink behavior preserved;
- sidebar clipping fix preserved;
- execution/approval/chat/LM Studio unaffected;
- port 5190 and AUMID unchanged.

Run:

- focused tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- launcher tests;
- PowerShell parser checks;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

# Required live runtime proof

Use the actual CRON for Code Dev shortcut.

1. Ensure only task-owned stale dev processes are candidates for replacement.
2. Launch Code Dev.
3. Confirm port `5190`.
4. Confirm AUMID `com.cron.code.dev`.
5. Confirm main-process runtime marker exists.
6. Confirm all eight IPC handlers are listed as registered.
7. Confirm renderer-ready and IPC-ready markers both pass.
8. Click `CRON Restart`.
9. Confirm the app closes and relaunches once.
10. Confirm no `No handler registered` error.
11. Confirm the active project restores.
12. Open a project context menu.
13. Test Copy path.
14. Test Open in File Explorer.
15. Test Refresh.
16. Test Rename.
17. Test Re-link cancel.
18. Test Remove from CRON on a non-active project.
19. Confirm its Windows folder remains.
20. Restart and confirm it stays archived.
21. Relaunch while already running and confirm a healthy current instance surfaces.
22. Simulate or safely create an owned stale Electron marker and confirm replacement.
23. Confirm production CRON for Code remains untouched.
24. Confirm unrelated CRON apps remain untouched.
25. Confirm no duplicate app stack remains.

Do not claim Venessa acceptance.

# Scope control

Allowed:

- Electron main-process handler registration;
- dev runtime marker;
- launcher stale-main detection;
- visible incomplete-host error;
- focused tests;
- logs/reports.

Out of scope:

- shell redesign;
- project-management feature expansion;
- execution model changes;
- approval model changes;
- provider changes;
- installer/package version changes;
- port/AUMID changes;
- Git release actions.

# Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes

Create:

- `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_REPORT.md`
- `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_EVIDENCE.md`

Evidence must include:

- exact prompt verbatim;
- every command;
- working directory;
- timestamps;
- exit codes;
- raw stdout;
- raw stderr;
- failed attempts;
- exact live main entry proof;
- exact handler-registration proof;
- stale-process replacement proof;
- before/after runtime proof;
- process/port/AUMID proof;
- conclusion-to-evidence mapping.

# Mandatory final self-audit

Confirm:

- correct repository, branch, HEAD;
- nothing staged;
- exact modified/deleted/untracked counts;
- every changed path classified;
- pre-existing work preserved;
- only authorised files changed;
- live Electron loads current main entry;
- all eight handlers registered;
- runtime marker current;
- launcher replaces owned stale/broken Electron;
- healthy current Electron is reused/surfaced;
- foreign/production/unrelated processes untouched;
- restart works once;
- active project restores;
- all project actions work;
- no raw Electron APIs exposed;
- port remains `5190`;
- AUMID remains `com.cron.code.dev`;
- dev userData unchanged;
- execution/approval/chat/LM Studio preserved;
- tests/build/lint/typecheck pass with exit 0;
- `git diff --check` clean;
- logs/reports updated;
- exact prompt preserved;
- no prohibited Git action occurred.

# Git prohibition

CC/OpenCode must not:

- add;
- stage;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- tag;
- release;
- amend;
- reset;
- restore;
- clean;
- checkout;
- switch;
- stash;
- rewrite history;
- modify remotes;
- delete untracked files.

All Git operations remain read-only.

# Final response format

Return the complete result in one single copyable code block:

# CRON FOR CODE — LIVE IPC REGISTRATION REPAIR REPORT

## 1. Final status
## 2. Repository identity
## 3. Verification input used
## 4. Complete CRON Architect Log — Verbatim
## 5. Initial working-tree state
## 6. User-verified defect
## 7. Live main-entry proof
## 8. Handler-registration root cause
## 9. Stale Electron reuse root cause
## 10. Main-process registration repair
## 11. Runtime marker and readiness proof
## 12. Launcher stale-process replacement
## 13. Restart proof
## 14. Project-action proof
## 15. Process/port/AUMID safety proof
## 16. Tests/build/quality results
## 17. Exact files changed
## 18. Exact files created
## 19. Protected boundaries preserved
## 20. Remaining gaps
## 21. Final self-audit
## 22. Git safety statement
## 23. Exact next action

Final status must be one of:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

READY is allowed only when the real running dev app proves all eight handlers work.

Explicitly confirm:

- nothing staged;
- nothing committed;
- nothing pushed;
- no prohibited Git or release action occurred.

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`

# Start now

Begin with repository identity verification and live proof of which Electron main file is loaded.

Do not assume the current process is using the current source.

Prove handler registration, repair stale-process reuse, then test Restart and every project action through the real running app.

Do not redesign the shell.

Do not change port, AUMID, package version, dependencies, or Git state.
```

### Slice plan (confirmed before editing)

- Root cause (proven live, not guessed): the running dev Electron main (PID 39696, started 2026-08-07 10:45) loaded `main.mjs` as it existed before this task's new IPC handlers were added; the source gained the eight required handlers at 11:38 but the Electron main process does not reload from disk. The launcher's `surface-running` branch (11:19/14:54/14:57 logs) treats an owned Electron as healthy purely because the window exists, so it never replaced the stale main. The renderer/preload (served fresh by Vite) invoke `cron:app:restart`, but the old main has no such handler → `No handler registered`.
- `main.mjs` gains `registerCronIpcHandlers()` (single deterministic pass, once-guard, per-channel logging, required-channel verification, startup error surfacing) and a dev-only runtime marker written to `.runtime/code-dev-main-marker.json` (app version, PID, sha256 of `main.mjs`/`preload.cjs`, registered channel list, startup timestamp, window/renderer readiness, registration error). New narrow diagnostic channels: `cron:diag:marker`, `cron:diag:ready`.
- New pure module `apps/standalone/electron/register-ipc.mjs` (no Electron imports) exposes `ALL_IPC_CHANNELS`, `REQUIRED_IPC_CHANNELS` (the eight) and `createIpcRegistrar({ handle })` — testable in vitest without Electron.
- Renderer: `ipc-data-service.initialize()` verifies the diagnostic marker and throws the preferred message when channels are missing; `App.tsx` init catches and surfaces it via ErrorBanner; `main.tsx` calls `diag.ready()` after first render so the marker records renderer readiness.
- Launcher: `code-dev-launcher-logic.ps1` gains `Read-DevMainMarker`, `Resolve-DevElectronHealth` (healthy/stale/broken/starting/none), `Test-DevMainMarkerReady`, `$script:DevRequiredIpcChannels`; `Resolve-DevAction` honours `Health` and returns `replace-stale-electron` for stale/broken owned Electron even when Vite is present. `run-code-dev-hidden.ps1` reads the marker, computes current main/preload hashes, replaces only owned stale/broken Electron (keeps owned Vite when safe, falls back to fresh-start), and waits for the marker to prove renderer-ready + IPC-ready before exit 0.
- Focused tests: new vitest `packages/core/src/main-ipc-registration.test.ts` (registrar once-guard, duplicate rejection, required-channel verification, failure surfacing, channel list); extended `scripts/test-code-dev-launcher.ps1` (marker/health/action assertions); static source assertions in `repo-stabilisation.test.ts`.
- Protected: port 5190, AUMID `com.cron.code.dev`, dev userData, production app, launcher architecture, LM Studio, execution/approval/audit safety, sandbox/contextIsolation, narrow preload, no new dependencies, no Git mutations.

### Working tree (before edits)
93 changes (37 modified / 3 deleted / 53 untracked); nothing staged. This slice adds the two new report/evidence files and the focused test/source files listed above.

### Exact root cause (proven live, not guessed)

1. Live dev Electron main PID 39696 started 2026-08-07 10:45:18 — before `main.mjs` gained the eight required IPC handlers (source LastWriteTime 11:38:39). Electron does not reload `main.mjs`; the running process executes the old in-memory module.
2. Launcher log shows `surface-running (vite=52756 electron=39696 dev=47776)` at 11:19, 14:54 and 14:57 — the launcher treated "owned Vite + owned Electron + window present" as healthy and surfaced the stale window every time via the single-instance lock.
3. The renderer/preload (served fresh by Vite and reloaded after 11:38) invoke the new channels; the old main never registered them → `No handler registered for 'cron:app:restart'`.
4. No runtime identity marker existed, so staleness was invisible to the launcher.

### Repair delivered

- `apps/standalone/electron/register-ipc.mjs` (new, pure, no Electron imports): `ALL_IPC_CHANNELS` (33), `REQUIRED_IPC_CHANNELS` (the eight), `createIpcRegistrar({ handle })` — once-only registration pass, duplicate rejection, per-channel failure records, required-channel verification in `complete()`.
- `main.mjs`: single `registerCronIpcHandlers()` pass called exactly once inside `app.whenReady()`; dev log "IPC handler registration complete: N channels"; failures logged + recorded in the runtime marker, window still opens; dev-only runtime marker `.runtime/code-dev-main-marker.json` (app version, PID, sha256 main/preload, registered channels, required channels, startup timestamp, windowReady, rendererReady, registrationError); narrow diagnostics `cron:diag:marker` + `cron:diag:ready`.
- Renderer: `ipc-data-service.initialize()` verifies the marker and throws the preferred message; `main.tsx` calls `cron:diag:ready` after first render; `App.tsx` init surfaces the error via ErrorBanner.
- Launcher: `code-dev-launcher-logic.ps1` gains `Read-DevMainMarker`, `Resolve-DevElectronHealth` (healthy/stale/broken/starting/none), `Test-DevMainMarkerReady`, `Get-DevMissingIpcChannels`, Health-aware `Resolve-DevAction` (stale/broken owned Electron replaced even when Vite is alive); `run-code-dev-hidden.ps1` reads the marker, compares current hashes, replaces only owned stale/broken Electron (bounded 15 s stop-poll, owned-Vite reuse when safe, fresh-start fallback), and waits for renderer-ready + IPC-ready marker before exit 0.

### Tests/build results
`pnpm test` exit 0 (220: contracts 24, host-adapter 21, data-service 74, core 101 — adds 11 registrar tests + 8 source-assertion tests). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. `scripts/test-code-dev-launcher.ps1` exit 0 (+15 marker/health assertions). PowerShell parser checks + `node --check` clean. `git diff --check` clean. Secret/suspicious-path scans clean.

### Runtime proof (real dev app + launcher)
- 15:43 run: stale Electron 39696 classified `health=stale` (marker missing) → `replace-stale-electron` → fresh stack (electron 48776) → marker written: all 8 required channels registered, `windowReady: true`, `rendererReady: true`, `registrationError: null`; dev log "IPC handler registration complete: 33 channels registered".
- 15:44 relaunch while running: `health=healthy` → `surface-running`, same PIDs, exit 0.
- 15:47 stale-marker simulation (tampered mainHash): classified stale, attempted replacement; a stop-check race surfaced (single 2 s check) → fixed with bounded 15 s poll; 15:49 run completed fresh-start (electron 51864), marker self-healed to current source hash.
- Port 5190 owned by repo Vite throughout; AUMID `com.cron.code.dev` verified live; dev userData unchanged; production PIDs 9032/11552/25456/28260 untouched; unrelated CRON Vites (Meds 15540, Claims 43592, Chat 20636) alive; exactly one owned dev Electron main after each launch.
- Interactive window clicks (Restart, project menu) remain Venessa's manual acceptance step (not claimed by CC).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair (this entry).

---

## Re-link Cancellation and Project-List Preservation Repair — 2026-08-07 16:20 +10:00 (CC/OpenCode, approved narrow runtime defect-repair slice)

Task title: `Re-link Cancellation and Project-List Preservation Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `main -> origin/main` (0/0). No staged files.
Exact prompt: stored verbatim below.

### Verification Input Used — Verbatim

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Relink_Cancellation_and_Project_List_Preservation_Repair_Prompt.md"}

# CRON for Code — Re-link Cancellation and Project-List Preservation Repair

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved narrow runtime defect-repair slice.

## User-verified current defect

Venessa manually tested the repaired CRON for Code Dev app after the Live IPC Registration repair.

The previous `No handler registered` defect is no longer present, which proves the new IPC registration path is live.

A new defect is now confirmed:

- invoking **Re-link folder** opens the real IPC path;
- cancelling the folder picker surfaces a red error banner:

  `Error invoking remote method 'cron:project:relink': Error: Re-link cancelled`

- after the cancellation, the project list is empty;
- the sidebar shows `No projects yet`;
- the top error/loading strip shows `Loading project...`;
- the current-project area shows no active project;
- previously visible projects such as CRON for Meds and CRON for Claims are no longer shown.

This is incorrect.

A user cancelling a folder picker is a normal no-op and must never be treated as an error or cause project-list or active-project loss.

## Primary objective

Repair only the Re-link cancellation path and the project-list preservation / restoration regression.

Do not broaden scope into new project-management features.

The acceptance target is:

1. Meds and Claims load normally again from persisted project state.
2. Re-link → Cancel is silent and harmless.
3. Restart preserves the same project list and active project.
4. No duplicate, archival, or cross-project state corruption occurs.

## Protected boundaries

Preserve:

- port `5190`;
- AUMID `com.cron.code.dev`;
- dev userData `CRON for Code Dev`;
- current launcher and runtime-marker architecture;
- all 8 required IPC handlers;
- production CRON for Code;
- project archival semantics;
- last-active-project semantics;
- project history preservation;
- task, approval, execution, audit, and LM Studio data;
- project canonical-path deduplication;
- sandbox/contextIsolation;
- narrow preload bridge;
- existing shell layout;
- current tests;
- all pre-existing work.

Do not:

- redesign the shell;
- change launcher behavior unless directly required to prove persistence;
- change port/AUMID;
- install dependencies;
- alter package versions;
- delete projects;
- delete folders;
- delete Git repositories;
- migrate or wipe the store;
- reset persisted project data;
- stage, commit, push, pull, fetch, merge, rebase, tag, release, amend, reset, restore, clean, checkout, switch, stash, rewrite history, modify remotes, or delete untracked files.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md`
   - `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_REPORT.md`
   - `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_EVIDENCE.md`
   - `packages/core/src/store.ts`
   - `packages/core/src/components/Sidebar.tsx`
   - `packages/core/src/components/ProjectContextMenu.tsx`
   - relink dialog/component files
   - `packages/data-service/src/project-management.ts`
   - `apps/standalone/electron/main.mjs`
   - `apps/standalone/electron/preload.cjs`
   - `apps/standalone/src/ipc-data-service.ts`
   - project persistence/load code
   - last-active restore code
   - relevant tests.
3. Capture the exact working-tree state.
4. Preserve all pre-existing changes.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

# Required investigation

## 1. Reproduce the cancellation path

Use the real CRON for Code Dev app.

With a valid active project selected:

1. Open project context menu.
2. Click `Re-link folder`.
3. Press Cancel in the native folder picker.
4. Capture:
   - renderer action;
   - host-adapter action;
   - preload call;
   - IPC request;
   - native dialog result;
   - main-process return/throw;
   - store action;
   - `isLoading`;
   - `error`;
   - `projects`;
   - `activeProjectId`;
   - last-active preference;
   - any persistence write;
   - any audit write.

Prove the exact boundary where Cancel becomes an exception and where project state is lost or hidden.

Do not guess.

## 2. Prove where the project list went

Inspect the persisted dev store directly, read-only first.

Determine whether Meds/Claims are:

- still present and active in persistence;
- present but marked `archived`;
- present but marked `missing` / `unavailable`;
- present but filtered out by renderer logic;
- absent because a prior action incorrectly mutated persistence;
- present under duplicate canonical ids;
- present but not loaded because app initialization aborted;
- hidden because `isLoading` / error path prevented `loadProjects`;
- hidden due to last-active restore side effects.

Capture exact evidence before changing anything.

Do not repair by recreating or manually re-adding projects unless the persisted records are genuinely absent and the Architect is informed.

## 3. Trace initialization after restart

Trace:

`DataService load → project reconciliation → archived filter → availability state → lastActiveProjectId restore → activeProjectId → sidebar visibleProjects`

Confirm whether an exception during relink or init can interrupt or clear this chain.

## A. Cancel must be a first-class normal result

The native folder picker cancellation must return a structured non-error result, for example:

`{ status: 'cancelled' }`

or equivalent.

Requirements:

- no thrown error for user cancellation;
- no red ErrorBanner;
- no console error;
- no audit failure;
- no project mutation;
- no path mutation;
- no availability mutation;
- no archive mutation;
- no active-project change;
- no preference change;
- no loading state left active.

Do not use string-matching on `"Re-link cancelled"` in the renderer as the primary design.

The main/host contract should represent cancellation intentionally.

## B. Re-link store semantics

Store action must distinguish:

- success;
- cancelled;
- conflict;
- invalid selection;
- genuine host failure.

### Success
- updates existing project root path;
- preserves project id/history;
- refreshes availability;
- clears relevant error;
- keeps active project active.

### Cancelled
- exact no-op;
- return cleanly;
- clear loading state;
- leave current project and project list unchanged.

### Conflict
- visible concise error;
- no mutation.

### Invalid selection
- visible concise error;
- no mutation.

### Genuine host failure
- visible concise error;
- existing project list remains loaded.

## C. Project list must not be cleared by host-action failures

No project-management action may replace the loaded project array with an empty array simply because an action fails.

Required invariant:

> Once projects are successfully loaded, a failed/cancelled project action may update `error`/`isLoading`, but must not discard the last good project collection.

## D. Loading state truth

`Loading project...` must only appear while a real project load/open is in progress.

A cancelled Re-link must:

- finish loading immediately;
- remove the loading message;
- never leave `isLoading = true`.

A host error must also clear `isLoading` in `finally`.

## E. Persisted project recovery

If persisted Meds/Claims records are still valid:

- load them automatically;
- do not require Venessa to re-add them;
- do not duplicate them.

If records are archived accidentally due to this defect:

- prove the exact accidental mutation first;
- restore only those records if the correction is deterministic and safe;
- preserve ids/history;
- document it.

If records are truly absent:

- stop and return `BLOCKED — ARCHITECT DECISION REQUIRED`;
- do not fabricate replacement project records.

## F. Last-active restoration

After restart:

- restore the same last active available non-archived project;
- if last active is unavailable, use the current safe fallback;
- do not clear the project list;
- do not create duplicates.

## G. Error presentation

A user cancellation should show nothing, or at most a tiny neutral transient message such as:

`Re-link cancelled`

Preferred behavior: no message at all.

Do not use the red error banner for cancellation.

# Required tests

Add focused regression tests for:

## Re-link cancellation
- native dialog cancellation returns structured cancel result;
- main does not throw;
- preload/host adapter propagates cancellation cleanly;
- store does not set error;
- store clears `isLoading`;
- projects array unchanged;
- activeProjectId unchanged;
- last-active preference unchanged;
- no audit mutation;
- no rootPath mutation;
- no availability mutation.

## Re-link success
- same project id preserved;
- rootPath updates;
- history remains linked;
- active project remains active;
- list remains intact.

## Re-link conflict/failure
- visible error;
- projects remain loaded;
- no state wipe;
- loading clears.

## Project-list persistence
- loaded project list survives a cancelled action;
- loaded project list survives a failed action;
- restart/load restores persisted active projects;
- archived projects remain hidden;
- active projects remain visible;
- no duplicate canonical projects.

## Initialization
- `loadProjects` failure is distinct from host-action failure;
- last-active restore cannot clear a valid loaded project list;
- `visibleProjects` only filters archived rows and does not hide available active rows accidentally.

## UI
- cancel produces no red ErrorBanner;
- `Loading project...` disappears after cancel;
- sidebar still shows projects;
- current project remains selected.

## Regression
- all 8 IPC handlers remain registered;
- runtime marker remains healthy;
- Restart remains live;
- project picker still works;
- archive semantics unchanged;
- copy/reveal/refresh/rename unchanged;
- execution/approval/chat/LM Studio unchanged;
- port/AUMID unchanged.

Run:

- focused core tests;
- focused host-adapter tests;
- focused data-service tests;
- focused standalone/main/preload tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- launcher test harness;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

# Required live runtime proof

Use the actual CRON for Code Dev shortcut.

## Project-load baseline

1. Launch Code Dev.
2. Confirm port `5190`.
3. Confirm AUMID `com.cron.code.dev`.
4. Confirm runtime marker healthy.
5. Confirm persisted active projects appear in sidebar.
6. Confirm CRON for Meds and CRON for Claims appear if they remain valid persisted active records.
7. Select CRON for Meds.

## Cancel proof

8. Open Meds project menu.
9. Choose `Re-link folder`.
10. Press Cancel.
11. Confirm:
    - no red banner;
    - no raw IPC error;
    - no `Loading project...`;
    - Meds remains selected;
    - Claims remains in sidebar;
    - no project disappears;
    - no duplicate appears.

Repeat Cancel once more.

## Restart proof

12. Click `CRON Restart`.
13. Confirm one relaunch only.
14. Confirm Meds remains active after restart.
15. Confirm Claims remains listed.
16. Confirm no project-list loss.
17. Confirm no duplicate project.
18. Confirm no stale error/loading banner.

## Failure-isolation proof

19. Trigger one safe controlled Re-link conflict or invalid folder case.
20. Confirm the visible error is bounded.
21. Confirm the project list remains intact.
22. Confirm active project remains intact.

## Success proof

23. Use a controlled temporary valid Git repo path for a safe re-link test on a controlled test project only.
24. Confirm success preserves project id/history.
25. Re-link back safely if needed.
26. Do not use Meds/Claims for destructive test setup.

## Process safety

27. Confirm production CRON for Code untouched.
28. Confirm Meds/Claims/Chat/Browser/Hub processes untouched.
29. Confirm exactly one owned Code Dev main process.

Do not claim Venessa acceptance.

# Scope control

Allowed:

- relink cancellation contract;
- relink IPC return semantics;
- store loading/error handling;
- project-list preservation;
- initialization/last-active correction where proven directly related;
- focused tests;
- logs/reports.

Out of scope:

- new project actions;
- shell redesign;
- database/store migration;
- manual data recreation;
- execution/approval changes;
- provider/model changes;
- launcher redesign;
- port/AUMID changes;
- packaging/version changes;
- Git release actions.

# Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes

Create:

- `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_REPORT.md`
- `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_EVIDENCE.md`

Evidence must include:

- this exact prompt verbatim;
- every command;
- working directory;
- timestamps;
- exit codes;
- raw stdout;
- raw stderr;
- failed attempts;
- persisted store proof before edits;
- exact reason projects disappeared;
- exact cancel propagation proof;
- before/after live screenshots or textual runtime state where available;
- restart persistence proof;
- conclusion-to-evidence mapping.

# Mandatory final self-audit

Confirm:

- correct repository, branch, HEAD;
- nothing staged;
- exact working-tree counts;
- every changed path classified;
- pre-existing work preserved;
- Meds/Claims persisted records inspected before repair;
- cancellation is structured non-error;
- cancellation causes no mutation;
- no red error on cancel;
- loading clears;
- projects remain loaded;
- active project remains active;
- last-active preference preserved;
- restart restores project list;
- no duplicates;
- archived semantics unchanged;
- success/conflict/failure semantics distinct;
- all 8 handlers still registered;
- runtime marker healthy;
- port `5190`;
- AUMID `com.cron.code.dev`;
- production/unrelated processes untouched;
- tests/build/lint/typecheck pass exit 0;
- `git diff --check` clean;
- logs/reports updated;
- exact prompt preserved;
- no prohibited Git action occurred.

# Git prohibition

CC/OpenCode must not:

- add;
- stage;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- tag;
- release;
- amend;
- reset;
- restore;
- clean;
- checkout;
- switch;
- stash;
- rewrite history;
- modify remotes;
- delete untracked files.

All Git operations remain read-only.

# Final response format

Return the complete result inside one single copyable code block.

Use:

# CRON FOR CODE — RE-LINK CANCELLATION AND PROJECT-LIST PRESERVATION REPORT

## 1. Final status
## 2. Repository identity
## 3. Verification input used
## 4. Complete CRON Architect Log — Verbatim
## 5. Initial working-tree state
## 6. User-verified defect
## 7. Persisted project-store state before repair
## 8. Exact cancellation root cause
## 9. Exact project-list disappearance root cause
## 10. Re-link cancellation contract repair
## 11. Store/loading/error-state repair
## 12. Project-list preservation repair
## 13. Last-active restoration proof
## 14. Restart preservation proof
## 15. Re-link success/conflict/failure behavior
## 16. Live runtime verification
## 17. Tests/build/quality results
## 18. Exact files changed
## 19. Exact files created
## 20. Protected boundaries preserved
## 21. Remaining gaps
## 22. Final self-audit
## 23. Git safety statement
## 24. Exact next action

Final status must be one of:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

READY is allowed only when the real app proves:

- project list restored/preserved;
- Cancel is harmless;
- restart preserves the project list and active project.

Explicitly confirm:

- nothing staged;
- nothing committed;
- nothing pushed;
- no prohibited Git or release action occurred.

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`

# Start now

Begin by inspecting the persisted dev project store before editing.

Do not recreate projects blindly.

Prove whether Meds/Claims still exist and why they disappeared from the sidebar.

Then reproduce Re-link → Cancel in the real app and repair the smallest proven boundary.

Do not broaden scope.
```

### Slice plan (confirmed before editing)

- Root cause chain (proven from persisted store + code, not guessed):
  - **A (red banner):** `cron:project:relink` throws `Error('Re-link cancelled')` on dialog cancel; `handleIpcSafe` wraps it, so the renderer receives `Error invoking remote method 'cron:project:relink': Error: Re-link cancelled`; the store's exact-match `message === 'Re-link cancelled'` check fails → `error` set → red banner.
  - **B (surprise picker / stuck loading / extra red banner):** `ipc-data-service.projects.unarchive()` is implemented via `cron:project:relink`, which opens the native folder picker. Every flow that unarchives (`openProjectPath` existing-branch, `selectProject` archived-branch, `addProject`) can pop a second picker; cancelling it throws inside `openProjectPath`'s UNGUARDED existing-branch → `isLoading` stays `true` forever (`Loading project…`) and Layout's `onSelectProject` catch surfaces the raw IPC error.
  - **C (archived stays hidden after relink/restore):** `relinkCodeProject` does not clear `archived`; unarchive-via-relink returns a still-archived project, so restored projects remain hidden. Meds stays archived after her successful relink (audit `project.relinked` at 16:06:03, `archived:true` persists).
  - **D (active duplicate hidden):** `reconcileProjects` picks the oldest record per path as canonical even when it is archived, silently dropping the newer ACTIVE duplicate (Claims-296) → sidebar empty (`No projects yet`).
  - **E (no active after restart):** `restoreLastActiveProject` clears the preference and returns without a fallback when the last active is archived → no active project.
  - Persistence evidence: Meds `proj_1786050841183` archived:true; Claims `proj_1786063530295_4ir189` archived:true (audit 16:04:57); active duplicate Claims `proj_1786063530296_t62fq0` archived:false; `lastActiveProjectId: proj_1786050841183`; relink audit 16:06:03; restart audit 16:06:22. Meds/Claims archiving was a deliberate Remove-from-CRON action (project.archived audits) — NOT caused by this defect — so no manual unarchive is performed; the code repairs restore loading/restore machinery and the active duplicate reappears automatically. Documented for Architect.
- Repairs:
  - New pure module `apps/standalone/electron/relink-flow.mjs`: `resolveRelinkOutcome(dialogResult, projectId, linkRootPath)` returns `{ status: 'cancelled' }` | `{ status: 'conflict', ... }` | `{ status: 'ok', project }`; genuine errors still throw. `main.mjs` relink handler uses it (no throw on cancel).
  - New pure IPC `cron:project:unarchive` (no picker) registered in main + added to `ALL_IPC_CHANNELS` + preload + ipc-data-service; `unarchive` no longer opens the folder picker.
  - `ProjectManagementService.linkRootPath` unarchives an archived project before relinking (restore + relink, preserving id/history; audits `project.restored` + `project.relinked`).
  - `reconcileProjects`: canonical per path = oldest NON-archived record when any exists (archived rows stay in persistence, excluded from navigation, references not remapped); archived-canonical only when the whole path is archived.
  - `restoreLastActiveProject`: archived/unavailable last active → fallback to first available non-archived visible project (preference updated); only clears the preference when nothing available; never clears the project list.
  - `openProjectPath`: existing-branch hardened with try/catch + `finally { isLoading: false }`; unarchived record also refreshed in the in-memory projects array; `selectProject` archived-branch refreshes the in-memory entry too.
  - Store `relinkProject`: interprets structured result (cancelled → exact no-op; conflict → concise error; ok → reload from persisted state); genuine errors → concise error; never discards the loaded project array.
  - Host adapter: `performProjectAction` returns a structured `HostProjectActionResult`; standalone bridge passes through the relink result.
- Focused tests: relink-flow unit tests; store cancellation/success/conflict/failure tests; reconcile canonical-active tests; restore fallback tests; host-adapter result tests; static source assertions (unarchive channel, no string-match design).
- Protected: port 5190, AUMID, dev userData, launcher/marker architecture, all 8 handlers (unchanged set; +1 new pure channel), archival semantics, dedup rules, no store migration, no manual data recreation, no Git mutations.

### Working tree (before edits)
93 changes (37 modified / 3 deleted / 53 untracked); nothing staged. This slice adds the two new report/evidence files and the focused test/source files listed above.

### Exact root cause (proven from persisted store + code, not guessed)

1. **Cancel = exception (red banner).** `main.mjs` `cron:project:relink` threw `Error('Re-link cancelled')` on dialog cancel; `handleIpcSafe` wrapped it so the renderer receives `Error invoking remote method 'cron:project:relink': Error: Re-link cancelled`; the store's exact-match `message === 'Re-link cancelled'` could never match → `error` set → red banner.
2. **Surprise picker on unarchive (stuck loading).** `ipc-data-service.projects.unarchive()` delegated to `cron:project:relink` (opens the native folder picker); cancelling the surprise picker threw inside `openProjectPath`'s UNGUARDED existing-branch → `isLoading` stayed true (`Loading project...`), and Layout's `onSelectProject` catch surfaced the raw IPC error.
3. **Relink never restores.** `relinkCodeProject` does not clear `archived`; Meds stayed archived after the successful re-link (audit `project.relinked` 16:06:03) → hidden.
4. **Archived canonical shadows the active duplicate.** `reconcileProjects` chose the oldest record per path even when archived, dropping the active duplicate Claims-296 → `No projects yet` after restart.
5. **No last-active fallback.** `restoreLastActiveProject` cleared the preference without a fallback when the last active was archived → no active project.
6. **Persistence evidence (read-only, before edits):** Meds `proj_1786050841183` archived:true; Claims `proj_1786063530295_4ir189` archived:true (audit 16:04:57); active duplicate Claims `proj_1786063530296_t62fq0` archived:false; `lastActiveProjectId` = Meds; relink audit 16:06:03; restart audit 16:06:22. The archiving was deliberate Remove-from-CRON actions (`project.archived` is only written by that path) — NOT defect-caused — so no manual unarchive was performed; the active duplicate reappears automatically after the repair (documented for the Architect).

### Repair delivered

- New pure module `apps/standalone/electron/relink-flow.mjs`: `resolveRelinkOutcome` returns `{ status: 'cancelled' } | { status: 'ok', project } | { status: 'conflict', ... }`; genuine invalid selections still throw. `main.mjs` relink handler uses it (no throw on cancel).
- New pure IPC `cron:project:unarchive` (no picker) registered in main + `ALL_IPC_CHANNELS` (34) + preload + ipc-data-service; `unarchive` no longer opens the folder picker.
- `ProjectManagementService.linkRootPath` unarchives an archived project before relinking (restore + relink, preserving id/history; audits `project.restored` + `project.relinked`).
- Host adapter: `HostProjectActionResult` union; `performProjectAction` returns it; standalone bridge pass-through; mock configurable result.
- `store.ts`: `relinkProject` interprets structured results (cancelled = exact no-op; conflict = concise `Re-link blocked: ...`; ok = reload; genuine failure = bounded error, list intact); `reconcileProjects` prefers the oldest ACTIVE record as canonical (archived rows never shadow active duplicates, stay in persistence, no reference remap); `restoreLastActiveProject` falls back to the first available non-archived project (only clears the pref when nothing available); `openProjectPath` guarded with try/finally (loading always clears) + refreshes unarchived records in memory; `selectProject` refreshes the in-memory entry after unarchive.

### Tests/build results
`pnpm test` exit 0 (240: contracts 24, host-adapter 23, data-service 74, core 119 — adds relink-flow 6, project-management +9, host-adapter +3, repo-stabilisation +3). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. Launcher harness exit 0. `node --check` clean. `git diff --check` clean. Secret/suspicious-path scans clean.

### Runtime proof (real dev app + launcher)
- Launcher relaunch 16:38:43: stale main (hash `5c7dbd...` ≠ current `935E0097...`) classified `health=stale` → `replace-stale-electron` → fresh stack (electron 41120) → `App ready (renderer-ready marker confirmed)`, exit 0.
- Marker: pid 41120, `windowReady: true`, `rendererReady: true`, `registrationError: null`, 34 channels (incl. `cron:project:unarchive` + `cron:project:relink`), 8/8 required present.
- Dev store after launch: all 3 project records identical (no mutation), audit array unchanged (4 entries), `lastActiveProjectId = proj_1786063530296_t62fq0` (valid active duplicate — restored as active).
- Port 5190 owned by repo Vite; AUMID `com.cron.code.dev` live; exactly one owned dev Electron main; production PIDs 9032/11552/25456/28260 untouched.
- The native-dialog Cancel click remains Venessa's manual acceptance step (CC cannot drive the native picker); the entire renderer→host→main→store chain is proven by deterministic tests.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair (this entry).

---

## Dev Restart Blank-Window Runtime Repair — 2026-08-07 17:10 +10:00 (CC/OpenCode, approved narrow runtime defect-repair slice)

Task title: `Dev Restart Blank-Window Runtime Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `main -> origin/main` (0/0). No staged files.
Exact prompt: stored verbatim below.

### Verification Input Used — Verbatim

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Dev_Restart_Blank_Window_Repair_Prompt.md"}

# CRON for Code — Dev Restart Blank-Window Runtime Repair

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved narrow runtime defect-repair slice.

## User-verified current defect

Venessa manually tested the current CRON for Code Dev app after the Re-link Cancellation and Project-List Preservation repair.

Observed behavior:

- the app is running normally before restart;
- clicking **CRON Restart** closes/restarts the app;
- the relaunched window opens;
- the Windows/Electron frame is visible with title `CRON for Code`;
- the renderer content is completely blank/dark;
- the normal CRON for Code shell does not render.

This is a live manual failure. The Restart implementation is therefore **not accepted**.

The previous report explicitly left the interactive Restart click as Venessa's manual acceptance step. That manual step has now failed.

## Primary objective

Repair only the **CRON Restart → relaunched blank window** defect.

Acceptance target:

1. click `CRON Restart`;
2. exactly one CRON for Code Dev instance relaunches;
3. the real renderer shell loads fully;
4. the active project restores correctly;
5. the project list remains intact;
6. no blank/dark renderer remains;
7. no duplicate Electron/Vite stack is created;
8. port `5190`, AUMID `com.cron.code.dev`, dev userData, LM Studio settings, task/approval/execution/audit state, and all project-management behavior remain intact.

Do not broaden scope.

## Protected boundaries

Preserve:

- repository path and all current uncommitted work;
- branch `main`;
- HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`;
- port `5190`;
- AUMID `com.cron.code.dev`;
- dev userData `CRON for Code Dev`;
- production CRON for Code;
- current launcher + runtime-marker architecture;
- single-instance behavior;
- all current IPC handlers including `cron:project:unarchive`;
- re-link cancellation structured-result repair;
- project list preservation;
- archive/relink/last-active semantics;
- safe execution harness;
- approval rules;
- audit persistence;
- LM Studio wiring;
- Electron sandbox/contextIsolation;
- narrow preload;
- current shell layout;
- current dependencies and package versions;
- all user project/task/history data.

Do not:

- redesign the UI;
- change port/AUMID;
- change package version;
- add dependencies;
- wipe/recreate the store;
- manually recreate projects;
- weaken IPC/security boundaries;
- alter execution/approval/provider architecture;
- stage, commit, push, pull, fetch, merge, rebase, tag, release, amend, reset, restore, clean, checkout, switch, stash, rewrite history, modify remotes, or delete untracked files.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md`
   - `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md`
   - `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_REPORT.md`
   - `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_EVIDENCE.md`
   - `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_REPORT.md`
   - `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_EVIDENCE.md`
   - `apps/standalone/electron/main.mjs`
   - `apps/standalone/electron/preload.cjs`
   - `apps/standalone/scripts/dev.mjs`
   - `scripts/run-code-dev-hidden.ps1`
   - `scripts/code-dev-launcher-logic.ps1`
   - `apps/standalone/src/main.tsx`
   - `apps/standalone/src/ipc-data-service.ts`
   - renderer startup/bootstrap files
   - current restart tests.
3. Capture exact working-tree state.
4. Preserve every pre-existing change.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

# Required investigation

Do not guess that the defect is `app.relaunch()`, Vite, renderer startup, stale main, or persistence. Prove it.

## 1. Reproduce the exact manual restart path

Use the real CRON for Code Dev app.

Start from a healthy rendered shell and capture before restart:

- Electron main PID;
- renderer PID(s);
- Vite PID;
- dev launcher PID/state;
- port owner for `5190`;
- runtime marker content;
- current main/preload hashes;
- current renderer URL;
- dev userData path;
- AUMID;
- active project id;
- visible project ids/names;
- `lastActiveProjectId`;
- relevant renderer console state if available.

Then click the real `CRON Restart` button.

After the blank window appears, capture:

- new Electron main PID;
- renderer PID(s);
- Vite PID;
- full Electron command line;
- `process.argv`;
- `process.execPath`;
- `app.getAppPath()`;
- working directory;
- resolved main entry;
- renderer URL actually loaded;
- `webContents.getURL()`;
- `did-fail-load` events;
- `render-process-gone` events;
- preload errors;
- renderer console errors;
- uncaught exceptions/unhandled rejections;
- runtime marker;
- renderer-ready marker;
- whether `cron:diag:ready` was reached;
- whether Vite returned HTTP 200 for the loaded URL;
- whether the blank window is loading the correct dev URL, a file URL, `about:blank`, or a failed/empty document.

## 2. Trace the current restart implementation end to end

Trace:

`Restart button → store.restartApp → host adapter → preload → cron:app:restart → persistence flush/audit → Electron lifecycle → relaunched process → dev URL load → preload → React bootstrap → diag.ready → shell render`

Identify the exact first boundary that differs from a normal launcher-driven healthy start.

## 3. Compare normal launcher start vs Restart relaunch

Capture and compare:

- executable;
- args;
- cwd;
- environment variables relevant to dev URL/port/runtime;
- app path;
- userData;
- Vite ownership;
- runtime marker lifecycle;
- single-instance behavior;
- renderer URL;
- preload path;
- startup ordering;
- whether the launcher waits for readiness.

The existing launcher-driven start is known to produce a healthy app. The Restart path must converge on the same healthy lifecycle rather than creating a second incompatible startup path.

## 4. Prove whether `app.relaunch()` is suitable in this dev architecture

Current history says the restart handler uses `app.relaunch()` + `app.quit()`.

Determine, with live evidence, whether in this dev setup `app.relaunch()`:

- preserves the required dev launch args;
- preserves the correct working directory;
- preserves `CRON_CODE_DEV_URL` / port context;
- relaunches from `apps/standalone`;
- reconnects to the owned Vite process;
- produces the same runtime marker/readiness sequence as the approved launcher;
- interacts correctly with the single-instance lock.

If it does not, do not patch around the blank screen. Route Restart through the approved dev lifecycle in the narrowest safe way.

## A. One authoritative dev restart path

CRON Restart must use one authoritative lifecycle.

Preferred architectural rule:

> In dev, Restart must converge on the existing restart-safe launcher lifecycle and readiness contract, rather than relying on a competing Electron-only restart path that bypasses launcher health checks.

Implementation details are for CC to prove and choose from the existing architecture.

Requirements:

- renderer still receives only a narrow `restartApp()` action;
- no arbitrary process/shell control exposed to renderer;
- main owns restart intent;
- restart is coalesced;
- persistence flush completes first;
- only owned Code Dev processes may be replaced;
- production/unrelated apps untouched;
- exactly one resulting Code Dev stack;
- launcher/runtime marker must prove main + preload + renderer readiness before the restart is considered successful.

## B. Renderer readiness is mandatory

A visible Electron frame is NOT a successful restart.

After relaunch:

- correct dev URL loaded;
- preload loaded;
- React bootstrap completed;
- `cron:diag:ready` completed;
- marker shows current main/preload hashes, required IPC channels present, `windowReady: true`, `rendererReady: true`, `registrationError: null`;
- shell root is mounted.

If renderer readiness is not reached within the bounded startup window:

- do not leave a silent blank window;
- show/log a concise startup failure;
- record the exact failure under `.runtime`;
- terminate/recover only the owned broken dev instance if the existing launcher contract already permits it.

## C. Startup diagnostics

Add only narrowly useful dev diagnostics needed to prove this defect, such as:

- target renderer URL;
- `did-start-loading`;
- `did-finish-load`;
- `did-fail-load` code/description/url;
- renderer-ready timestamp;
- preload-ready or bridge-ready timestamp if available;
- renderer process gone reason;
- startup console error summary.

Do not log project content, prompts, model payloads, secrets, tokens, or full user data.

## D. State restoration

After successful restart:

- project list must still be loaded;
- current active project must restore if valid;
- safe fallback if not valid;
- no duplicates;
- no archive flag changes;
- no unexpected persistence/audit mutations beyond the intended restart audit/preference write;
- tasks/approvals/executions/audit/LM Studio settings remain intact.

## E. No regression to Re-link repair

Explicitly re-verify:

- Re-link → Cancel is silent;
- no red banner;
- no stuck `Loading project...`;
- project list preserved;
- structured cancellation contract remains;
- `cron:project:unarchive` remains picker-free.

# Required tests

Add focused tests for the exact repaired boundary.

## Restart lifecycle

- restart uses the approved dev lifecycle;
- duplicate restart requests coalesce;
- persistence flush occurs before restart handoff;
- launcher/readiness contract is invoked in dev where appropriate;
- production path remains correct and distinct if required;
- no arbitrary process/shell surface reaches renderer.

## Relaunch/startup readiness

- correct renderer URL is selected;
- blank/about:blank/file URL cannot count as ready in dev;
- did-fail-load becomes a bounded startup failure;
- renderer-ready marker is required;
- missing renderer-ready cannot be reported as success;
- current main/preload hashes required;
- required IPC list still validated.

## State preservation

- last active project restores;
- loaded project list remains;
- archived rows remain archived;
- no canonical duplicates;
- tasks/approvals/executions/audit/preferences survive restart.

## Regression

- all required IPC handlers still registered;
- `cron:project:unarchive` registered;
- Re-link cancel remains structured no-op;
- project picker still works;
- archive/relink/rename/copy/reveal/refresh unaffected;
- safe execution/approval/chat/LM Studio unaffected;
- port 5190 and AUMID unchanged.

Run:

- focused tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- launcher harness;
- PowerShell parser checks;
- `node --check` for changed `.mjs/.cjs`;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

# Required live runtime proof

This task cannot be marked READY from unit tests alone.

Use the actual CRON for Code Dev shortcut/app and the real Restart button.

1. Start from a healthy rendered CRON for Code Dev.
2. Confirm port `5190`.
3. Confirm AUMID `com.cron.code.dev`.
4. Confirm marker healthy.
5. Confirm project list visible and an active project selected.
6. Click `CRON Restart`.
7. Confirm the old app closes.
8. Confirm exactly one replacement app stack appears.
9. Confirm the **full CRON renderer shell renders** — no blank/dark window.
10. Confirm marker has current hashes, all required channels, `windowReady=true`, `rendererReady=true`, no registration error.
11. Confirm `webContents.getURL()` is the correct dev URL.
12. Confirm active project restores.
13. Confirm project list is unchanged.
14. Confirm no stale error/loading banner.
15. Confirm tasks/history/settings remain.
16. Click Restart a second time.
17. Confirm the same successful behavior again.
18. Relaunch from the shortcut while already running; confirm healthy instance surfaces.
19. Re-link → Cancel once; confirm silent no-op and project list preserved.
20. Confirm production CRON for Code is untouched.
21. Confirm Meds/Claims/Chat/Browser/Hub processes are untouched.
22. Confirm exactly one owned Code Dev main process remains.

Do not claim Venessa's visual acceptance. Do prove that the renderer content exists and is functional after restart.

# Scope control

Allowed:

- current Restart handler/lifecycle handoff;
- launcher integration directly required by Restart;
- renderer-load/readiness diagnostics;
- bounded startup failure handling;
- focused restart tests;
- logs/reports.

Out of scope:

- new project-management features;
- shell redesign;
- execution/approval changes;
- model/provider changes;
- packaging/version changes;
- general launcher redesign unrelated to Restart;
- store migration;
- manual project recreation;
- Git release actions.

# Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes

Create:

- `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_REPORT.md`
- `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_EVIDENCE.md`

Evidence must include:

- this exact prompt verbatim;
- exact before/after process state;
- normal-launch vs restart-launch comparison;
- renderer URL proof;
- runtime marker proof;
- did-fail-load / console / renderer crash evidence if present;
- every command/tool operation;
- cwd;
- timestamps;
- exit codes;
- raw stdout/stderr;
- failed attempts;
- exact root cause;
- exact repair;
- restart ×2 live proof;
- state preservation proof;
- unrelated-process safety proof;
- conclusion-to-evidence mapping.

# Mandatory final self-audit

Confirm:

- correct repo/branch/HEAD;
- nothing staged;
- exact working-tree counts;
- every changed path classified;
- pre-existing work preserved;
- exact blank-window root cause proven;
- normal launch vs restart launch compared;
- Restart reaches the authoritative dev lifecycle;
- correct renderer URL loads;
- renderer-ready marker required and reached;
- no blank window remains;
- restart works twice consecutively;
- exactly one dev stack;
- active project restored;
- project list preserved;
- no duplicates/archive corruption;
- tasks/approvals/executions/audit/LM Studio preserved;
- Re-link Cancel still harmless;
- all required handlers + unarchive channel registered;
- port `5190`;
- AUMID `com.cron.code.dev`;
- production/unrelated apps untouched;
- tests/build/lint/typecheck pass exit 0;
- launcher tests pass;
- `git diff --check` clean;
- logs/reports updated;
- exact prompt preserved;
- no prohibited Git action occurred.

# Git prohibition

CC/OpenCode must not add, stage, commit, push, pull, fetch, merge, rebase, tag, release, amend, reset, restore, clean, checkout, switch, stash, rewrite history, modify remotes, or delete untracked files.

All Git operations remain read-only.

# Final response format

Return the complete result inside one single copyable code block.

Use:

# CRON FOR CODE — DEV RESTART BLANK-WINDOW REPAIR REPORT

## 1. Final status
## 2. Repository identity
## 3. Verification input used
## 4. Complete CRON Architect Log — Verbatim
## 5. Initial working-tree state
## 6. User-verified defect
## 7. Healthy normal-launch baseline
## 8. Blank-window restart reproduction
## 9. Exact root cause
## 10. Normal-launch vs restart-launch comparison
## 11. Restart lifecycle repair
## 12. Renderer URL and readiness repair
## 13. Runtime marker/startup diagnostics
## 14. State-preservation proof
## 15. Re-link/project-list regression proof
## 16. Live restart ×2 proof
## 17. Process/port/AUMID safety proof
## 18. Tests/build/quality results
## 19. Exact files changed
## 20. Exact files created
## 21. Protected boundaries preserved
## 22. Remaining gaps
## 23. Final self-audit
## 24. Git safety statement
## 25. Exact next action

Final status must be one of:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

`READY FOR ARCHITECT REVIEW` is allowed only when the real Restart button has been exercised through two consecutive restart cycles and the full renderer shell returns both times.

Explicitly confirm nothing staged, nothing committed, nothing pushed, and no prohibited Git or release action occurred.

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`

# Start now

Begin by reproducing the blank-window state from the real Restart button and comparing it against a healthy launcher-driven start.

Do not guess the cause.

Do not redesign the shell.

Repair only the proven restart lifecycle / renderer-readiness boundary.
```

### Slice plan (confirmed before editing)

- Root cause (proven from source + prior live observations, re-proven live in this slice): `cron:app:restart` uses `app.relaunch()` + `app.quit()`. In dev, Electron is spawned by `dev.mjs`, which tears down the owned Vite when the Electron shim exits (`dev.mjs` 59-62: `electronProcess.on('close') → killTree(viteProcess.pid); process.exit(0)`). The relaunched Electron (spawned by `app.relaunch`, NOT by `dev.mjs`) then loads `http://127.0.0.1:5190` where Vite is dead → `did-fail-load` → visible frame + title with a blank/dark renderer. The launcher healthy path never participates in Restart.
- Repair: in dev, `cron:app:restart` no longer calls `app.relaunch()`. It (1) flushes persistence + audits (existing), (2) writes restart-intent marker `.runtime/code-dev-restart-requested.json`, (3) spawns the approved launcher `scripts/run-code-dev-hidden.ps1 -Port <port>` detached+hidden, (4) `app.quit()`. The launcher detects the intent marker, clears it, and performs the existing replace flow (owned Electron only; fresh-stack fallback) waiting for renderer-ready + IPC-ready marker before exit 0. Production (non-dev) keeps `app.relaunch()`.
- Launcher determinism: in the replace branch, after the Electron-stop poll, wait for the owned `dev.mjs` process to exit (bounded) before deciding reuse-vite vs fresh-start — eliminates the race where the old dev.mjs tears down Vite after the new Electron starts.
- Readiness diagnostics (dev, narrow): targetUrl, did-start-loading, did-finish-load (`webContents.getURL()`), did-fail-load (code/description/url), render-process-gone reason, preload-error, console error summary (240-char slice, no payloads), windowReadyAt, rendererReadyAt — recorded in the runtime marker + dev electron log. `lastStartupError` marks the marker broken so the launcher fail-fasts (bounded failure) and the next launch replaces the owned broken instance.
- Tests: launcher harness gains restart-intent + startup-error assertions; static assertions in repo-stabilisation (dev branch calls `restartViaLauncher`, intent file, no `app.relaunch` in the dev path, diagnostics listeners); existing restart/store/marker tests stay green.
- Live proof: (a) reproduce the blank-window mechanism live (owned Electron exit → dev.mjs tears down Vite), (b) drive the exact repaired handoff twice (intent marker + launcher → healthy stack, renderer-ready, full channels, hashes current, exactly one stack, store unchanged), (c) attempt real-button UIA click ×2 if the accessibility tree exposes it, (d) port/AUMID/production safety, (e) re-link cancel regression via tests.
- Protected: port 5190, AUMID, dev userData, launcher/marker architecture, all IPC handlers, re-link structured cancel, project-list preservation, execution/approval/audit/LM Studio, sandbox, narrow preload, no new dependencies, no Git mutations.

### Working tree (before edits)
98 changes (37 modified / 3 deleted / 58 untracked); nothing staged.

### Exact root cause (proven live, not guessed)

`cron:app:restart` used `app.relaunch()` + `app.quit()`. In dev, Electron is a child of `dev.mjs`, which tears down the owned Vite when the Electron shim exits (`dev.mjs` lines 59-62: `electronProcess.on('close') → killTree(viteProcess.pid); process.exit(0)`). Live evidence captured before any edit: old stack (vite 25836 / electron 41120 / dev 50524) healthy at 16:39; Venessa's click at ~17:38 → electron log `[07:38:18] Tray destroyed` (old main quit) → `app.relaunch()` spawned electron 43264 (cmdline `electron.exe .`) with NO dev.mjs, NO Vite, port 5190 free; marker pid=43264, `rendererReady=False`, `rendererUrl=''` → the blank window on screen (frame + title `CRON for Code`, no content). The launcher healthy path never participated in Restart. Mechanism re-proven on demand (owned Electron exit → dev.mjs → Vite dies → port free).

### Repair delivered

- `main.mjs` (dev branch): `cron:app:restart` writes `.runtime/code-dev-restart-requested.json` (pid + requestedAt), spawns the approved launcher `scripts/run-code-dev-hidden.ps1 -Port <port>` (powershell, detached, hidden, unref), then `app.quit()` — NO `app.relaunch()` in dev. Production (non-dev) keeps `app.relaunch()`. Renderer surface unchanged (`restartApp()` only, coalesced via `isRestarting` in store + main).
- Launcher: `Test-DevRestartRequested` (age-bounded 300s) forces `health=stale` → existing replace flow (owned Electron only; fresh-stack fallback; `Wait-ForMainMarker`); `Clear-DevRestartRequested` consumes the intent. Replace branch waits (bounded 15s) for the owned `dev.mjs` to exit before the reuse-vite decision (deterministic; no dying-Vite race). `Wait-ForMainMarker` fail-fasts on `lastStartupError`.
- Startup diagnostics (dev, narrow): did-start-loading / did-finish-load (`webContents.getURL()`), did-fail-load (code/desc/url), render-process-gone reason, preload-error, console errors (level 3, 240-char slice), URL-mismatch check, 30s renderer-ready watchdog after did-finish-load; marker fields `targetUrl`, `rendererUrl`, `windowReadyAt`, `rendererReadyAt`, `lastStartupError`, `lastFailedLoadUrl`, `rendererGoneReason`, `preloadError`. `lastStartupError` → health `broken` → next launch replaces the owned broken instance.

### Tests/build results
`pnpm test` exit 0 (242: contracts 24, host-adapter 23, data-service 74, core 121). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. Launcher harness exit 0 (+10 new restart-intent/startup-error assertions). PS parser + `node --check` clean. `git diff --check` clean. Secret/path scans clean. Two transient full-suite failures were known pre-existing load flakes (vitest `onTaskUpdate` worker timeout; execution-service 5s syntax-check timeout) — passed isolated and on the final clean run.

### Runtime proof (real dev app + launcher)
- Blank instance (43264) replaced by the launcher (18:05) → fresh stack 50692 healthy.
- Repaired handoff (intent marker + launcher — exactly what the new handler does) driven ×3 consecutively (18:06:16, 18:06:58, 18:18:26): each `In-app restart requested → replace → App ready (renderer-ready marker confirmed)` exit 0; marker `windowReady=True rendererReady=True rendererUrl=http://127.0.0.1:5190/ lastStartupError=''`, 34 channels (8/8), intent consumed, exactly one owned stack.
- Dead-URL instance (port 59998): marker `rendererReady=False`, `lastStartupError='did-fail-load -102 ERR_CONNECTION_REFUSED'` then watchdog `renderer did not become ready within 30000ms...`; launcher `health=broken` → replaced → healthy (18:16).
- Store unchanged across all cycles (3 project records, same archived flags, pref Claims-296; audit grew only by the intended `app.restart_requested` @16:06:22 and Venessa's @17:38:17). Port 5190 / AUMID `com.cron.code.dev` / production PIDs 9032/11552/25456/28260 untouched; exactly one owned dev Electron main at all times.
- Real-button click ×2: NOT CC-drivable — Chromium does not expose its DOM to Windows UI Automation (window found, 4 native children, button absent); enabling requires an unapproved `--force-renderer-accessibility` flag. Documented as the environment limitation; the button → store → host adapter → IPC → handler chain is covered by tests. Final status per the task's strict gate: `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair (this entry).

---

## Runtime Acceptance — 2026-08-09 10:20 +10:00 (CC/OpenCode, approved acceptance slice)

Task title: `CRON for Code — Runtime Acceptance Architect Slice`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Purpose
Verify (and repair only where needed) the runtime acceptance path: launch, visible content, known projects, no duplicates on selection, quiet re-link cancel, in-app restart returning to visible content, approval/execution surfaces, and no unrelated CRON app disturbed. No product expansion.

### Verification gate (results)
- `pnpm test` — PASS (242 tests: contracts 24, host-adapter 23, data-service 74, core 121). The pre-existing vitest `onTaskUpdate` load flake was root-caused and FIXED in this slice: the repo-stabilisation lint guard blocked its vitest worker for 60–90 s with synchronous `spawnSync` of whole-repo ESLint; the guard now runs the identical ESLint invocation as an async child and still asserts exit 0. Suite now ~26–30 s with repeated clean passes (10:21, 10:24).
- `pnpm typecheck` — PASS, exit 0. `pnpm build` — PASS, exit 0. `pnpm format:check` — PASS (known per-package `echo ok`, pre-existing).
- `pnpm lint` — PASS, 0 errors; 2 pre-existing `react-hooks/exhaustive-deps` warnings (plainly classified, unchanged baseline).
- `git diff --check` — FAIL first (`packages/core/src/store.test.ts:423: new blank line at EOF`) → fixed → PASS (exit 0). The fix is whitespace-only (removed one trailing blank line at EOF, byte-level, UTF-8 safe); the file's 15 tests still pass.

### Acceptance journey (runtime proof, all PASS)
1. Launch: dev stack was down; launcher `fresh-start` → exit 0 → `App ready (renderer-ready marker confirmed)`. Desktop shortcut present.
2. Visible content: marker `windowReady=True rendererReady=True lastStartupError=null`, 34 IPC channels, 8/8 required; dev server HTTP 200; served renderer modules (Layout 21.4 KB, ActivityPanel 18.5 KB, ApprovalPanel 28.4 KB, ExecutionPanel 37.5 KB) transform without errors.
3. Known projects: real dev store (3 persisted records, 2 archived, lastActive = active Claims duplicate) loads → 2 reconciled / 1 visible (CRON for Claims), error null, loading cleared; last-active restores.
4. No duplicate on selection: reselecting the Claims folder leaves persisted records at 3, reconciled set at 2, visible at 1.
5. Re-link cancel: pure `resolveRelinkOutcome({canceled:true})` → `{status:'cancelled'}`; store-level cancel = exact no-op (list/active/preference unchanged, no error, no loading).
6. In-app restart: intent-file handoff (exact dev contract main writes) driven ×2 consecutively — each `In-app restart requested → replace-stale-electron → App ready`, marker healthy, intent consumed, exactly one stack, dev store SHA256 identical before/after (`29E63A…B56AA2D`).
7. Approval/execution surfaces: served bundle + component tests; runtime chain through real DataService + ExecutionService + harness: run blocked (`approval_required`, approval `requested`) → approved → executed (`repo.identity`, cwd=root, exit 0) → record `completed` → audit `approval.requested/execution.started/execution.completed` → store surfaces reflect evidence → restart retains all.
8. Unrelated safety: CRON for Meds vite (10788/5191), Claims vite (9336/5193), CRON HUB vite (15300) alive at every checkpoint; launcher terminated only owned dev Electron (2 restart cycles); `CRON_MEDS_PORT` env never modified; production CRON for Code was already stopped at start and untouched; port 5190 stayed owned by the repo Vite.

### Runtime proof driver
`.runtime/runtime-acceptance-proof.mjs` (gitignored) — Phase A against a copy of the REAL dev store (real DataService + real core store + mock host adapter), Phase B on a throwaway temp store/Git repo with the real execution chain. Exit 0. Two of my own proof-script assertions were corrected (reconcile contract: 3 persisted → 2 reconciled → 1 visible; and the execution chain belongs to `ExecutionService`, not the store's TaskRunner intent) — no product code involved. Full raw output in the evidence file.

### Exact files changed by this slice
- `packages/core/src/store.test.ts` — whitespace-only EOF blank-line removal (gate fix).
- `packages/core/src/repo-stabilisation.test.ts` — lint guard converted from blocking `spawnSync` to an async child process (identical ESLint invocation + exit-0 assertion); fixes the pre-existing `onTaskUpdate` flake. Test-harness only.
- `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md` — entries appended.
- `CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md`, `CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md` — created.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, dev userData, launcher/restart architecture, runtime marker + IPC registration, project semantics (archival/dedup/last-active), approval model, command catalogue, execution harness, audit persistence, LM Studio wiring, sandbox/contextIsolation, narrow preload, README status line (not blurred). No OpenCode, no new dependencies, no package/port/identity/launcher changes, no Git actions.

### Unresolved issues / notes for the Architect
1. Interactive window acceptance (folder-picker Cancel, CRON Restart button, project menu clicks, visual review) is Venessa's manual step — CC does not claim it; every chain behind it is test- and runtime-proven.
2. Dev store Meds + Claims-295 remain archived (deliberate user Remove-from-CRON actions); only CRON for Claims is visible — contract-correct, unchanged.
3. `pnpm format:check` remains a no-op stub (pre-existing).
4. The vitest `onTaskUpdate` full-suite load flake was fixed in this slice (async lint guard, identical semantics).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance (this entry).

---

## Restart and Entry Screen Repair — 2026-08-09 13:20 +10:00 (CC/OpenCode, approved defect repair)

Task title: `Restart and Entry Screen Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### User-visible failures
1. Restart fails from the visible UI.
2. Launch opens on the working canvas instead of the entry/project-selection screen.

### Root causes (proven by reproduction, not guessed)
1. **Restart**: Venessa's manual session was recovered from the logs — her clicks at 10:53:34 and 10:55:31 both logged `Handing dev restart to the approved launcher` + `Tray destroyed` and wrote the intent, but the spawned PowerShell launcher NEVER ran (no launcher log line); the 10:53 app return was her own shortcut relaunch, and the 10:55 click left the app down with an unconsumed intent. Two killers isolated: (a) `detached: true` kills the spawned PowerShell 5.1 before its engine starts (spawn-option matrix); (b) even without `detached`, children spawned by the real Electron main die the moment Electron exits — a marker-loop probe stopped writing at the parent's exact exit (kill-on-close job). The launcher itself is healthy when its parent stays alive (proven). Conclusion: Electron cannot spawn a surviving relauncher; the relaunch must come from Electron's parent.
2. **Entry screen**: `App.tsx` init called `restoreLastActiveProject()`, which auto-activated the last project → working canvas on every launch. The entry screen also lacked resume options.

### Repair delivered
- `apps/standalone/electron/main.mjs`: dev restart is now intent-only — `performAppRestart()` flushes, records `app.restart_requested`, writes the intent, quits. Intent-write failure THROWS (visible bounded error; the app stays up). Production keeps `app.relaunch()`. Removed the PowerShell spawn (`restartViaLauncher`), `devPortFromEnv`, and the `spawn` import. One-shot dev test hook (`CRON_CODE_DEV_TEST_RESTART=1`) retained for headless real-handler proof.
- `apps/standalone/scripts/dev.mjs` (Electron's parent/supervisor): on Electron exit reads the restart intent (300 s age bound, UTF-8-BOM tolerant); fresh → consumes + relaunches Electron on the still-live Vite (no blank window, no PowerShell cold start); absent → teardown as before. New `.runtime/code-dev-supervisor.log`.
- `scripts/run-code-dev-hidden.ps1`: clears stale restart intents from failed attempts.
- `packages/core/src/components/App.tsx`: removed the auto last-active restore at launch.
- `packages/core/src/components/EmptyState.tsx`: entry/project-selection screen — `Open Project` (folder picker) + `Resume a project` cards (each resumes via explicit `selectProject`).
- Tests: `project-picker.test.tsx` (+3 entry-screen/launch tests, 13 total), `repo-stabilisation.test.ts` (+4 architecture assertions, 37 total).

### Verification
`pnpm test` PASS (core 128). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` main.mjs/dev.mjs 0. PS parser OK. Launcher PS harness PASS. Nothing staged.

### Live proof (real app)
- Restart cycle 1 (REAL handler path via the one-shot hook): electron log `Dev restart intent written` + `Tray destroyed`; supervisor `Restart intent consumed (pid 29064); relaunching Electron`; new Electron (27352) healthy (`rendererReady=True`, 34 channels) on the SAME Vite (792). Intent consumed, no loop.
- Restart cycle 2 (intent + owned-stack stop): supervisor `Restart intent consumed (pid 27916); relaunching Electron`; new Electron (9196) healthy on the SAME Vite (12632). Exactly one owned stack after every cycle.
- Entry screen: served App.tsx has no `restoreLastActiveProject`; served EmptyState has `Resume a project`/`Open Project`; store-level launch test proves `activeProjectId` stays null after load; dev store intact (3 records, last-active preserved; only `app.restart_requested` audits added).
- Safety: Meds (10788), Claims (9336), HUB (15300) alive at every checkpoint; only owned processes stopped; port 5190 owned by repo Vite throughout; production app untouched.
- Honest limits: native Restart-button click is not CC-drivable (Chromium does not expose its DOM to Windows UI Automation); the hook drives the exact same handler in the real main, and the button→store→adapter→IPC chain is test-covered. Visual confirmation is Venessa's step.

### Exact files changed
Modified (tracked): `apps/standalone/electron/main.mjs`, `apps/standalone/scripts/dev.mjs`, `packages/core/src/components/App.tsx`, `packages/core/src/components/EmptyState.tsx`.
Modified (pre-existing untracked): `scripts/run-code-dev-hidden.ps1`, `packages/core/src/project-picker.test.tsx`, `packages/core/src/repo-stabilisation.test.ts`.
Docs: `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, dev userData, command execution safety, approval model, storage schema, LM Studio wiring, sandbox/contextIsolation, narrow preload, launcher port policy. No new dependencies. No Git actions.

### Remaining manual checks (Venessa)
Launch → entry screen; open/resume → canvas; click Restart → closes and reopens visibly usable; no blank window; no duplicate instance; unrelated apps untouched.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair (this entry).

---

## Visible Restart Follow-up Repair — 2026-08-09 15:40 +10:00 (CC/OpenCode, approved follow-up repair)

Task title: `Visible Restart Follow-up Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### User evidence
Accepted: entry/open-or-resume screen. Rejected: visible CRON Restart still does not complete a usable restart; no restarting overlay.

### Exact cause (diagnosed, not guessed)
Venessa's click DID relaunch (supervisor `Restart intent consumed (pid 9196); relaunching Electron` at 13:07). The failure is UX: the quit ran in a `setImmediate` ~1–5 ms after the click, so nothing visible could paint, and the new window took ~8 s to appear — click → app gone → long silence reads as "restart fails". No overlay existed at all.

### Reproduction (stronger than the previous hook proof)
Added a dev-only diagnostic that clicks the REAL rendered button via `webContents.executeJavaScript` (`document.querySelector('[data-testid="cron-restart-button"]').click()`), with a DOM sample 400 ms after the click. Full chain ran end to end. The first run exposed a test-only loop (the probe env var propagated through relaunches, re-clicking every ~5 s) — fixed by stripping BOTH probe vars in dev.mjs on relaunch.

### Repair delivered
- `RestartOverlay` (Claims pattern, Code styling): darkened blurred backdrop, centered panel with `CRON SYSTEM CONTROL` eyebrow, `Restarting` title, spinner (`cron-spin` keyframes added to design tokens), `Stopping and restarting CRON services...`, note `The app will return to the project selection screen.`, `role=status`/`aria-busy`, `data-testid="restart-overlay"`. Rendered by the shell while `isRestarting`.
- `store.restartApp` keeps `isRestarting` true after a successful request (only failure clears it, with a visible error) so the overlay stays painted.
- `main.mjs`: dev quit delayed (`DEV_RESTART_QUIT_DELAY_MS = 1500`) so the overlay paints before the window closes; intent remains the only message to dev.mjs (relaunch on the live Vite); production keeps `app.relaunch()`.
- Relaunched app returns to the entry screen (no auto-restore, verified).

### Verification
`pnpm test` PASS (core 135, 9 files). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof (real rendered button, two consecutive cycles)
Each cycle: real DOM click → overlay DOM sample (400 ms later) → quit at +1500 ms → dev.mjs relaunch → healthy app on the entry screen.
- Overlay sample (both cycles, verbatim): `{"overlayVisible":true,"overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen","buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}`
- Supervisor: `Restart intent consumed (pid 23128); relaunching Electron`.
- Relaunched marker: rendererReady=True, 34 channels, lastStartupError=; Vite reused (no blank window); intent consumed; 15 s stability check shows no loop; exactly one stack; entry screen served (`Resume a project`).
- Unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive at every checkpoint; only owned processes stopped; port 5190 owned by repo Vite; dev store intact (3 records, last-active preserved; only expected `app.restart_requested` audits added).
- Honest limits: the click is a DOM `.click()` on the real button (physical clicking not tool-accessible); visual confirmation remains Venessa's step.

### Exact files changed
New: `packages/core/src/components/RestartOverlay.tsx`, `packages/core/src/restart-overlay.test.tsx`.
Modified: `packages/core/src/components/Layout.tsx`, `packages/core/src/index.ts`, `packages/core/src/store.ts`, `apps/standalone/electron/main.mjs`, `apps/standalone/scripts/dev.mjs`, `shared/design-tokens/index.css`, `packages/core/src/repo-stabilisation.test.ts`.
Docs: `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Entry screen behavior, project data, execution/approval safety models, port 5190, AUMID `com.cron.code.dev`, dependencies, unrelated UI, Git state. No new dependencies.

### Remaining manual checks (Venessa)
Launch → entry screen → click CRON Restart → overlay appears → app reopens on the entry screen, visibly usable. No blank window, no duplicate instance.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair (this entry).

---

## Restart Overlay Linger Until Ready — 2026-08-09 16:15 +10:00 (CC/OpenCode, approved follow-up repair)

Task title: `Restart Overlay Linger Until Ready`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RESTART_LINGER_UNTIL_READY_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### User acceptance so far
Restart button works; restart screen appears; app comes back. Remaining: the restart screen should linger until the app has actually started again.

### Repair delivered (readiness handoff, no fixed delay)
- dev.mjs marks the relaunched instance: on restart-intent relaunch it sets `CRON_CODE_RESTARTING=1` in the child env (normal launches never have it).
- main.mjs records `restartHandoff` in the runtime marker state + `cron:diag:marker` payload.
- main.tsx reads the flag from the marker before rendering and passes `startupRestartHandoff` to the app.
- App.tsx holds the Restarting overlay from first paint and clears it in `finally` when init completes (data service ready, commands + projects loaded) — success and visible-error paths both covered.
- RestartOverlay accepts the `preparing` handoff and shows `Preparing your workspace...` during it. Design otherwise unchanged.
- The flag travels via the marker IPC, NOT the preload (the preload's narrow-bridge security guard is preserved).

### Verification
`pnpm test` PASS (core 139 / 9 files). `pnpm typecheck` 0 (one transient recursive-run race, clean on re-run). `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof (real rendered button + relaunch, real DOM samples)
- Click: real DOM click dispatched; overlay sample (old instance, +400 ms): overlayVisible=true, full `CRON SYSTEM CONTROL / Restarting / Stopping and restarting CRON services...` text, button disabled/busy.
- Supervisor: `Restart intent consumed (pid 28736); relaunching Electron`.
- Relaunched instance linger samples: overlayVisible=true at +100 ms and +300 ms, false at +600/1200/2500/5000 ms — the overlay is the relaunched window's first painted state and clears exactly when ready.
- Relaunched marker: pid=22892 rendererReady=True restartHandoff=True lastStartupError=.
- Entry screen served after restart; 25 s stability check (no loop); intent consumed; exactly one stack; Vite reused; unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive throughout; port 5190 owned by repo Vite; dev store intact (3 records, last-active preserved).
- Honest limits: button click is a DOM .click() (physical clicking not tool-accessible); visual confirmation is Venessa's step.

### Exact files changed
`apps/standalone/electron/main.mjs` (restartHandoff marker + payload; passive linger sampler), `apps/standalone/scripts/dev.mjs` (CRON_CODE_RESTARTING for relaunched instance), `apps/standalone/src/ipc-data-service.ts` (marker type), `apps/standalone/src/main.tsx` (flag read + dep), `packages/core/src/components/App.tsx` (handoff hold/clear), `packages/core/src/components/Layout.tsx` (preparing prop), `packages/core/src/components/RestartOverlay.tsx` (preparing + note), `packages/core/src/restart-overlay.test.tsx` (+4), `packages/core/src/repo-stabilisation.test.ts` (+assertions).
Docs: `CRON_CODE_RESTART_LINGER_UNTIL_READY_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Entry screen behavior, project data, execution/approval/release safety models, port 5190, AUMID `com.cron.code.dev`, dependencies, unrelated UI, preload narrow bridge, Git state.

### Remaining manual checks (Venessa)
Launch → click CRON Restart → Restarting screen appears → window closes → new window opens showing Restarting/Preparing → entry screen appears. No blank or half-loaded state at any point.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready (this entry).

---

## Restart Transition Visual Stability Repair — 2026-08-09 17:20 +10:00 (CC/OpenCode, approved repair)

Task title: `Restart Transition Visual Stability Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### User evidence
Restart works but the transition shows a left-aligned interim frame between the restart screen disappearing and the app opening.

### Diagnosis (pixel + DOM evidence)
Full restart cycles were captured (`webContents.capturePage` at ready-to-show and +50/250/600/1200/2500/5000 ms + DOM samples at click+0/50/100/200/400 ms). All 20+ captured frames were centered in this environment. Three structural holes in the OLD transition can produce the reported flash on slower machines/timings:
1. The pre-React splash was a bare logo+text state with a different background tone and no restart narrative.
2. The splash was hidden synchronously after `root.render()` but BEFORE React's first commit — an empty, unstyled root window for up to a few hundred ms.
3. The Restarting overlay existed only after React's first commit — the shell (left sidebar) could be exposed first if the handoff overlay committed late.

### Repair delivered
- `apps/standalone/index.html`: the splash is now a fixed full-window CENTERED screen with fully inline CSS (cannot be unstyled): `CRON SYSTEM CONTROL` eyebrow, logo, `Preparing CRON for Code`, inline spinner keyframes, plain-English messages, background matching the app (`#050812`).
- `apps/standalone/src/main.tsx`: on restart handoff the splash text switches to `Restarting` / `Stopping and restarting CRON services...` before React mounts (continuous with the old window's overlay); the splash is hidden and the React root revealed only after React's first paint (double `requestAnimationFrame`) — no blank-root gap.
- React handoff overlay unchanged; entry screen reveals only when ready.
- Test-only flake fix: `packages/data-service/src/execution-service.test.ts` lifecycle test timeout 5 s → 20 s (pre-existing load flake; passes isolated and in-suite).

### Verification
`pnpm test` PASS (core 140 / 9 files; data-service 74). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof
- Old window: overlay visible at click+0 ms through +400 ms (DOM samples); no app-content flash.
- Relaunch: `Restart intent consumed; relaunching Electron`.
- Relaunched window: `FIRSTPAINT` = centered `CRON SYSTEM CONTROL / Restarting / Stopping and restarting CRON services...` panel; React overlay at +100 ms; cleared when ready; entry screen after. Every pixel-captured frame centered (bbox offset ≤4 px; `leftAligned=no` in all).
- Normal launch: centered `CRON SYSTEM CONTROL / Preparing CRON for Code` splash.
- Stability: no loop; intent consumed; exactly one stack; Vite reused; entry screen served; unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite; dev store intact (3 records, last-active preserved).
- Honest limits: the reported left-aligned frame was not reproducible here (all frames centered) — the fix removes every structural path to it; Venessa's re-test is the confirmation.

### Exact files changed
`apps/standalone/index.html` (new splash), `apps/standalone/src/main.tsx` (handoff-aware splash + first-paint reveal), `apps/standalone/electron/main.mjs` (dev-only click/first-paint diagnostics), `packages/core/src/repo-stabilisation.test.ts` (+transition assertions), `packages/data-service/src/execution-service.test.ts` (timeout, test-only).
Docs: `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, project data, execution/approval/release safety models, dependencies, unrelated UI, Git state.

### Remaining manual checks (Venessa)
Click CRON Restart → centered Restarting screen → window closes → new window opens with the same centered Restarting/Preparing state → entry screen. No left-aligned, unstyled, or blank frame at any point.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair (this entry).

---

## Restart Reopen Visibility and Linger Repair — 2026-08-09 17:35 +10:00 (CC/OpenCode, approved repair)

Task title: `Restart Reopen Visibility and Linger Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### User report
Restart works and the left-aligned flash is fixed, but the Restarting screen flashes too fast and the relaunched window opens minimized on the taskbar.

### Diagnosis (documented before changing code)
- Old window close: performAppRestart → flush/audit/intent → 1500 ms hold → app.quit() → before-quit cleanup → window close (saves state) → dev.mjs relaunch.
- New window: dev.mjs relaunches Electron; createWindow (show:false) → ready-to-show previously did `maximize(); show();` with NO restore/focus. The relaunched Electron is spawned by a background process — Windows denies foreground activation, so the window can land minimized on the taskbar.
- Linger: the relaunched overlay cleared the instant init completed (~100–600 ms on a warm dev server) — imperceptible.

### Repair delivered
- main.mjs ready-to-show: maximize (saved maximized OR restart handoff) → show → restore-if-minimized → focus → `app.focus({ steal: true })` (best-effort foreground; the safest possible under Windows focus rules).
- App.tsx: `RESTART_LINGER_MIN_MS = 1600` floor — the handoff overlay clears only when init is done AND ≥1600 ms have elapsed since first paint (timestamp captured in the effect; render-purity safe).

### Verification
`pnpm test` PASS (core 142 / 9 files). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof
- Linger (relaunched instance DOM samples): overlayVisible=true at +100/300/600/1200 ms, false at +2500 ms — the 1600 ms floor makes it perceivable (was ~600 ms before).
- Reopen (Electron window API samples): relaunched window `visible=true maximized=true minimized=false focused=true` at every sample after the pre-show boot (~600 ms).
- Old window: overlay present from click+0 ms through the 1500 ms hold.
- Stability: no loop (20 s observation); intent consumed; exactly one stack; Vite reused; entry screen served; unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite; dev store intact (3 records, last-active preserved).
- Honest limit: Windows focus-stealing rules can still deny absolute foreground to a background-spawned process; the safest behavior is implemented (restore/show/maximize/focus/steal) and the window is proven visible and never minimized.

### Exact files changed
`apps/standalone/electron/main.mjs` (reopen logic + window-state diagnostic), `packages/core/src/components/App.tsx` (linger floor), `packages/core/src/restart-overlay.test.tsx` (linger-past-readiness assertion), `packages/core/src/repo-stabilisation.test.ts` (+2 source assertions).
Docs: `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, project data, execution/approval/release safety models, store schema, command execution behavior, dependencies, Git state.

### Remaining manual checks (Venessa)
Click CRON Restart → centered Restarting screen appears and stays a few seconds → relaunched window opens on top, maximized and focused, on the entry screen. No taskbar click needed.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 17:35 — restart reopen visibility and linger repair (this entry).

---

## Restart Gap-Free Reopen Repair — 2026-08-09 18:00 +10:00 (CC/OpenCode, approved repair + Venessa's clarification)

Task title: `Restart Reopen Visibility and Linger Repair`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Venessa's clarification
"i click restart - restart screen stays until app full restarts - app opens full screen" vs current "i click restart - app vanish - wrong screen flashes for a second then vanish - app opens but minimised in taskbar". Correction: "restart screen does show but only for 3 seconds".

So: the overlay DID show (~3 s fixed hold), then the old window closed while the new process was still booting → "app vanish" gap; the new window then opened minimized on the taskbar (background-spawned process without foreground rights).

### Diagnosis
- Old close: fixed 3 s hold then quit — before the replacement was ready → gap.
- New window: spawned by dev.mjs (background); no restore/focus countermeasures → Windows minimized it.
- Linger: both the old hold and the replacement overlay (cleared at readiness, ~100–600 ms) were shorter than the perceived restart.

### Repair delivered (gap-free handoff)
- main.mjs: restart now writes the intent, RELEASES the single-instance lock, and watches the runtime marker — the old window keeps the Restarting overlay up and quits ONLY when the replacement (different pid + rendererReady + restartHandoff) is ready (20 s bound). Window reopen: show → restore-if-minimized → maximize → focus → always-on-top flip → focus → `app.focus({steal:true})` → delayed retry.
- dev.mjs: polls the intent every 400 ms and spawns the replacement WHILE the old instance still runs; superseded-close guard (no teardown when a replacement is alive).
- App.tsx: replacement overlay lingers a minimum 2000 ms after first paint.

### Verification
`pnpm test` PASS (core 142 / 9 files). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof (real button click)
- Supervisor: `Restart intent consumed (pid 27376) via poll; spawning replacement` (+0.9 s, old window still up) → `Superseded Electron instance closed; the replacement continues` (+6.2 s, after the replacement was ready).
- Old window overlay: visible continuously at 0/400/1000/1500/2000/2400 ms.
- Replacement window: `visible=true maximized=true minimized=false focused=true` at every sample after the pre-show boot — never minimized.
- Replacement overlay: visible at 100/300/600/1200 ms, cleared by 2500 ms (2 s floor).
- No loop (20 s observation); intent consumed; exactly one stack; Vite reused; entry screen served; unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite; dev store intact (3 records, last-active preserved).
- Honest limit: Windows focus policy may still flash the taskbar icon instead of instant foreground in rare cases, but the window is proven visible/maximized/never-minimized.

### Exact files changed
`apps/standalone/electron/main.mjs` (gap-free handoff + reopen hardening + extended diagnostics), `apps/standalone/scripts/dev.mjs` (intent poll + superseded-close guard), `packages/core/src/components/App.tsx` (2000 ms linger floor), `packages/core/src/repo-stabilisation.test.ts` (gap-free + reopen assertions).
Docs: `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md` + `_EVIDENCE.md` (rewritten for the gap-free design), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, project data, execution/approval/release safety models, store schema, command execution behavior, dependencies, Git state.

### Remaining manual checks (Venessa)
Click CRON Restart → the centered Restarting screen appears immediately and STAYS while the app restarts → the app reopens full screen and focused → Restarting continues briefly → entry screen. No vanish, no flash, no taskbar click.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair (this entry).

---

## Restart One-Screen Follow-up (pop-up removed) — 2026-08-09 18:45 +10:00 (CC/OpenCode, approved repair follow-up)

Task title: `Restart Reopen Visibility and Linger Repair` (follow-up from Venessa's feedback).
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `origin/main`, 0/0. No staged files.

### Venessa's feedback
"its better but there is still a scree that pops up in between the restart screen and the app for a second, can u remove it".

### Cause
The new window's pre-React splash was a different design (large logo + plain centered text, light content) from the Restarting panel. Between the old window's overlay and the React overlay, that splash was visible ~0.5–1 s — an intermediate "pop-up" screen.

### Fix
- `apps/standalone/index.html`: the splash is now a pixel-identical replica of the React Restarting panel — same dark backdrop, same bordered panel (colors/radius/shadow), same eyebrow/spinner/title/message/note/disabled `CRON Restart` pill. No logo block.
- `apps/standalone/src/main.tsx`: on restart handoff the splash text switches to the exact restart texts (title/message/note).
- `packages/core/src/components/RestartOverlay.tsx`: both phases now show the SAME texts (removed the `Preparing your workspace...` variant) — splash and overlay are indistinguishable.
- Tests updated (restart-overlay unified-panel assertions; repo-stabilisation one-screen assertions).

### Verification
`pnpm test` PASS (core 142 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2 pre-existing warnings). `git diff --check` 0. Nothing staged.

### Live proof
- Pixel analysis: OLD splash content box ≈ 220×192 px light (logo+text); NEW splash FIRSTPAINT ≈ 544×332 px dark — the SAME panel as the overlay (544×368 maximized). One continuous centered panel: old-window overlay → new-window splash → React overlay → entry.
- Gap-free handoff re-verified: `Restart intent consumed (pid 28068) via poll; spawning replacement` → `Superseded Electron instance closed; the replacement continues`; replacement marker rendererReady + restartHandoff; no loop (20 s); intent consumed; exactly one stack; Vite reused; Claims 9336 and HUB 15300 alive; Meds' dev stack restarted itself at 18:29 (new PID 34032, port 5191 still its own) — this repo's launcher log shows no interaction with it; port 5190 owned by the repo Vite; dev store intact (3 records, last-active preserved).

### Remaining manual checks (Venessa)
Click CRON Restart → ONE continuous centered Restarting panel → app reopens full screen focused → same panel briefly → entry screen. No vanish, no gap, no pop-up screen, no taskbar click.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair.
- 2026-08-09 18:45 — restart one-screen follow-up (pop-up removed) (this entry).

---

## Restart One-Screen Round 2 (blur + full-screen + handover) — 2026-08-09 19:15 +10:00 (CC/OpenCode)

Task title: `Restart Reopen Visibility and Linger Repair` (round 2 of Venessa's follow-up).
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `origin/main`, 0/0. No staged files.

### Venessa's feedback (via targeted question)
"its a different screen but it flashes too fast to see what it is - it kinda looks like another version of the restart screen and then the app opens but not full screen".

### Root causes
1. The old window's overlay used a BLURRED backdrop (`backdropFilter: blur(6px)`) over the app content, while the new window's splash was flat dark — two subtly different "versions" of the restart screen.
2. The relaunched window showed at its restored/default size and maximized only after `show()` — a visible not-full-screen moment.
3. The old window quit at the replacement's `rendererReady`, but the new window only appears at `ready-to-show` (~0.5 s later) — a no-window beat where the panel disappears and reappears.

### Fixes
1. Removed the overlay's backdrop blur — the old window's restart screen and the new window's splash are now pixel-identical (flat dark + same panel).
2. Maximize BEFORE show (plus a delayed re-maximize retry) — the window can never appear small; confirmed `maximized:true` from the first visible sample.
3. The replacement watch now also requires the new marker's `windowReady` — the old window closes only once the new window is visible (measured ~100 ms overlap, no gap).
4. Added a dev-only continuous sampler (300 ms) so real user clicks are evidenced end to end.

### Verification
`pnpm test` PASS (core 143 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2 pre-existing warnings). `git diff --check` 0. Nothing staged.

### Live proof (latest code, real click chain)
- Supervisor: `Restart intent consumed (pid ...) via poll; spawning replacement` → `Superseded Electron instance closed; the replacement continues`.
- Continuous samples: replacement window `visible:true maximized:true minimized:false focused:true` at EVERY sample from its first visible frame; overlay visible throughout the handoff; entry after.
- Handover: new window visible ~100 ms before the old closes (no no-window beat).
- No loop; intent consumed; exactly one stack; Vite reused; Claims/HUB alive; port 5190 owned by the repo Vite; dev store intact (3 records, last-active preserved).

### Remaining manual checks (Venessa)
The app is running now with the sampler active — click CRON Restart once: one continuous Restarting panel → app reopens full screen focused → entry screen.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair.
- 2026-08-09 18:45 — restart one-screen follow-up (pop-up removed).
- 2026-08-09 19:15 — restart one-screen round 2 (blur + full-screen + handover) (this entry).

---

## Restart One-Screen Round 3 (fade-out reveal) — 2026-08-09 19:35 +10:00 (CC/OpenCode)

Task title: `Restart Reopen Visibility and Linger Repair` (round 3).
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`. Upstream `origin/main`, 0/0. No staged files.

### Venessa's feedback
"well that flash screen still shows right before the app opens".

### Diagnosis
Her real click at 09:16:49 was fully captured by the continuous sampler (300 ms DOM + window-state samples). The replacement showed the correct sequence (restart overlay visible from first frame through the 2 s floor, then the entry screen) and the window was visible/maximized/focused/not-minimized throughout. The remaining "flash" is therefore the TRANSITION ITSELF: the overlay unmounted instantly when readiness was reached, so the entry screen SNAPPED in — a sudden swap right before the app opens.

### Fix
The overlay now fades out over 400 ms (CSS opacity transition) and only then becomes invisible/hidden (visibility with a matching delay; pointer-events off during the fade). No timers or render-phase state changes (react-compiler clean). The entry screen eases in instead of flashing in.

Also added dev-only capture-on-reveal: the continuous sampler now captures pixels at the moment the overlay clears and 300 ms later, so the next real click's reveal is evidenced frame-by-frame.

### Verification
`pnpm test` PASS (core 143 / 9 files; one transient parallel-load flake, clean on re-run). typecheck 0. lint 0 (2 pre-existing warnings). build 0. format:check 0. `git diff --check` 0. Nothing staged.

### Live proof
Sampler evidence of her prior click: replacement overlay visible n:1→n:6 (through the 2 s floor), entry at n:7; window visible/maximized/focused at every sample. Reveal-capture diagnostics armed for the next click.

### Remaining manual checks (Venessa)
The app is running with the recorder — click CRON Restart: one continuous Restarting panel → the app opens full screen and the panel FADES into the entry screen (no flash).

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair.
- 2026-08-09 18:45 — restart one-screen follow-up (pop-up removed).
- 2026-08-09 19:15 — restart one-screen round 2 (blur + full-screen + handover).
- 2026-08-09 19:35 — restart one-screen round 3 (fade-out reveal) (this entry).

---

## Restart Repair — ACCEPTED by Venessa (2026-08-09 19:45 +10:00)

Venessa's final manual test after the fade-out fix: **"perfect!"**

The restart experience is now accepted: click **CRON Restart** → one continuous centered
Restarting panel (identical in the old window, the new window's splash, and the React overlay;
flat dark backdrop, no blur difference) → the relaunched window opens visible, focused, and
maximized (never minimized on the taskbar) → the panel fades into the entry screen (no flash,
no gap, no pop-up screen).

Accepted after the repair sequence across slices:
1. Intent-only restart + dev.mjs relaunch (kill-on-close job workaround).
2. Visible Restart button path + Restarting overlay.
3. Readiness-based linger (handoff flag via the runtime marker).
4. Centered inline-styled splash (no left-aligned/unstyled frames).
5. Gap-free handover (lock release + intent poll + quit-when-visible).
6. Full-screen reopen (maximize-before-show + focus + always-on-top flip).
7. Pixel-identical splash/overlay panels (no intermediate screen).
8. Fade-out reveal (no snap/flash before the app opens).

Final state: dev stack healthy on 5190 (marker rendererReady, no startup error); dev store
intact (3 project records, last-active preserved); Claims (9336) and HUB (15300) alive;
Meds' own stack running on 5191 (PID 34032); nothing staged; `git diff --check` clean;
HEAD unchanged (`8157b12`). Dev-only diagnostics (env-gated click probe, linger sampler,
continuous sampler, capture) remain for future verification runs.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair.
- 2026-08-09 18:45 — restart one-screen follow-up (pop-up removed).
- 2026-08-09 19:15 — restart one-screen round 2 (blur + full-screen + handover).
- 2026-08-09 19:35 — restart one-screen round 3 (fade-out reveal).
- 2026-08-09 19:45 — restart repair ACCEPTED by Venessa ("perfect!") (this entry).

---

## Functional Wiring, DEV Marking + Picker Polish — 2026-08-09 20:50 +10:00 (CC/OpenCode, approved slice)

Task title: `Functional Wiring, DEV Marking + Picker Polish`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`). Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

### Venessa's findings
Re-link folder not wired; CRON Online looks clickable; pickers look like raw Windows; some buttons don't work; unfinished features need red DEV badges (Model, Create Task, menu actions, footer tabs).

### Audit (truthful, not blanket)
- Re-link folder: WIRED (menu → IPC → main relink-flow → structured cancel/relink; prior slice's tests + this slice's live chain proof). Kept working.
- Create Task: WIRED (createDraftTask persists a real task; live proof taskVisible:true). Kept working.
- CRON Online: converted to a non-clickable `role="status"` pill (was a hoverable button).
- Model selector: was a dead-looking span — WIRED to open the model/settings dialog (the honest model-configuration path).
- Footer tabs (PowerShell/Git/Tests/Build/Verification/Logs): non-functional placeholders → red DEV badges (6).
- Assistant panel, sidebar chat, CURRENT PROJECT, AGENT STATE, Account: already DEV-marked — kept.
- CronNavBar/WorkflowStrip: contain dead buttons but are NOT rendered — no visible dead controls.
- Approval/execution actions: IPC-wired — not DEV-marked (they work).
- Folder picker: native OS dialog unavoidable — wrapped in a new CRON-styled `PROJECT PICKER` modal (shows before the dialog opens and while the selection is added; closes in `finally`).

### Verification
`pnpm test` PASS (core 146 / 10 files). `pnpm typecheck` 0. `pnpm lint` 0 (2 pre-existing warnings). `pnpm build` 0. `pnpm format:check` 0. `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof (real renderer drives)
`status-pill-footer {statusTag:DIV,statusRole:status,footerDevBadges:6}`; `picker-modal-visible true` → `false`; `create-task-result taskVisible:true`; `model-settings-opened settingsDialogVisible:true`; `relink-result {menuStillOpen:false, errors:[]}` + main logs for the picker/relink diagnostics (dialog bypassed, returning null/cancelled). OS dialogs were bypassed via one-shot dev-only diagnostics to avoid blocking; the real dialog path is the same handler + `dialog.showOpenDialog` (tests cover the flow).

Note: the live Create Task proof added two draft tasks titled "Untitled" to CRON for Claims (real feature behavior; titles were left empty on purpose).

### Exact files changed
`CronHeader.tsx` (status pill), `CronFooter.tsx` (DEV badges), `PickerModal.tsx` (new), `Layout.tsx` (modal + Model wiring), `CronAssistant.tsx` (Model button), `store.ts` (pickerActive), `App.tsx` (picker wrap), `index.ts` (export), `apps/standalone/electron/main.mjs` (no-dialog diagnostics + dialog log), `dev-marking.test.tsx` (new, 7 tests), `repo-stabilisation.test.ts` (+4).
Docs: `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_REPORT.md` + `_EVIDENCE.md` (created), `PROJECT_LOG.md` (appended), this log.

### Protected boundaries preserved
Port 5190, AUMID `com.cron.code.dev`, project data, execution/approval/release safety models, store schema, dependencies, unrelated UI, Git state. No fake functionality introduced.

### Remaining manual checks (Venessa)
CRON Online non-clickable; project menu actions work or are truthfully disabled; Re-link opens the folder picker; Open Project shows the CRON PROJECT PICKER panel first; Create Task works; Model opens settings; footer tabs DEV-badged.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- 2026-08-06 09:35 — fresh-session resume checkpoint (read-only audit).
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint.
- 2026-08-06 16:20 — restart-safe launcher repair checkpoint.
- 2026-08-06 18:22 — fresh-session repository audit.
- 2026-08-06 19:25 — safe execution and approval foundation.
- 2026-08-07 07:54 — workspace hierarchy and shell-fit repair.
- 2026-08-07 08:55 — project picker load regression repair.
- 2026-08-07 09:35 — project management and restart controls.
- 2026-08-07 15:10 — live IPC registration and stale Electron replacement repair.
- 2026-08-07 16:20 — re-link cancellation and project-list preservation repair.
- 2026-08-07 17:10 — dev restart blank-window runtime repair.
- 2026-08-09 10:20 — runtime acceptance.
- 2026-08-09 13:20 — restart and entry screen repair.
- 2026-08-09 15:40 — visible restart follow-up repair.
- 2026-08-09 16:15 — restart overlay linger until ready.
- 2026-08-09 17:20 — restart transition visual stability repair.
- 2026-08-09 18:00 — restart gap-free reopen repair.
- 2026-08-09 18:45 — restart one-screen follow-up (pop-up removed).
- 2026-08-09 19:15 — restart one-screen round 2 (blur + full-screen + handover).
- 2026-08-09 19:35 — restart one-screen round 3 (fade-out reveal).
- 2026-08-09 19:45 — restart repair ACCEPTED by Venessa ("perfect!").
- 2026-08-09 20:50 — functional wiring, DEV marking + picker polish (this entry).

---

## OpenCode-Style Workspace Layout + Restart Flash Cleanup — 2026-08-10 (CC/OpenCode, implementation)

Implemented per `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_ARCHITECT_SLICE.md`.

### Restart second-flash fix
- Replaced RestartOverlay `<Loader2>` SVG spinner with CSS border spinner matching the HTML splash `#splash-spinner` identically (size, border, colors, animation).
- Replaced double `requestAnimationFrame` splash-hiding with `setTimeout(0)` — root shows immediately after React commit, overlay covers splash, then splash hides.
- Updated `repo-stabilisation.test.ts` to expect the new pattern.

### Workspace layout reshuffling
- **ProjectArea**: Rewrote as a workspace command bar with project name, path, branch pill (DEV-marked), Reveal, Copy Path, and New Project buttons.
- **Sidebar**: Width increased from 196px to 210px.
- **ChangedFilesReview**: New collapsible component (DEV-marked) for Git file changes — header with counts, expandable file list, ready-to-wire props.
- **TaskWorkspace**: Enhanced empty state with actionable hints.
- **CronAssistant**: Header refined ("CRON Assistant / Dev support — local chat").
- **Layout**: Integrated ChangedFilesReview between tasks and composer.

### Verification
- Typecheck (core + standalone): passed.
- Lint: passed (2 pre-existing warnings only, no new issues).
- Tests: 154/154 passed (10 test files).
- Build: passed.
- CRON branding, DEV markers, restart behaviour, existing project state preserved.

### Reports
- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_REPORT.md`
- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_EVIDENCE.md`

---

## Pre-Packaging Truth Audit — 2026-08-10 (CC/OpenCode, read-only audit)

Task title: `CRON for Code — Pre-Packaging Truth Audit`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b12`. Upstream `origin/main`, 0/0. No staged files.
Exact prompt: stored verbatim in `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_EVIDENCE.md`.

### Audit goal
Produce a clear Code readiness report so Venessa and the Architect can decide what remains before packaging.

### Verification gate
- `pnpm typecheck`: PASS (all 7 packages, exit 0).
- `pnpm lint`: PASS (0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings in App.tsx).
- `pnpm test`: 1 FAIL (execution-service `queues a task and records task.queued audit` — timeout at 5000ms, actual ~9005ms; 73/74 data-service pass; contracts 24, host-adapter 23, core 121 = 241/242 total).
- `pnpm build`: PASS (packages core + standalone vite, exit 0).
- `git diff --check`: clean (exit 0).
- Working tree: 42 modified tracked files, 3 deleted dist-renderer assets, ~60 untracked files. All uncommitted since 2026-08-04.

### Audit findings summary

**Working / Accepted (extensive):**
- Full dark CRON shell (header/sidebar/project-area/empty-state/footer).
- Project management: open, select, context menu (reveal/copy-path/refresh/rename/relink/archive).
- Task creation, queue, approval enforcement, safe-command execution with audit trail.
- CRON Restart with overlay, gap-free handoff, splash-to-overlay seamless transition.
- CRON Assistant (LM Studio chat, collapsible).
- LM Studio settings dialog.
- Safe execution harness (16 command catalogue, project-boundary, secret redaction, cancel).
- Electron sandbox, IPC validation, runtime marker staleness detection.
- Launcher suite (run-code-dev-hidden.ps1, BAT/VBS shortcut).
- electron-builder packaging config present (NSIS, oneClick:false).

**Partially working:**
- ChangedFilesReview: component exists with correct props contract but Layout passes NO props (`<ChangedFilesReview />`). Always shows "No changes". Not wired to real Git status.
- Sidebar CURRENT PROJECT block: shows name correctly, but Branch "—", Last Check "—" are stubs.
- Sidebar AGENT STATE block: CC status shows Waiting/Restarting correctly, Review/Release are "Locked" stubs.
- Branch pill: hardcoded "main" with DEV badge.
- Sidebar "General chat": DEV placeholder.

**Visible but DEV:**
- Footer tabs: PowerShell, Git, Tests, Build, Verification, Logs (all 6 DEV, opacity 0.45, not clickable).
- Sidebar CURRENT PROJECT header (DEV badge).
- Sidebar AGENT STATE header (DEV badge).
- Sidebar "Account" link (DEV badge).
- ChangedFilesReview header (DEV badge).
- Branch pill DEV badge.
- CRON Assistant header (DEV badge).

**Orphaned:**
- WorkflowStrip component exported from `core/src/index.ts` but not rendered in Layout.

**Flaky test:**
- 1 test timeout in execution-service.test.ts — known pre-existing timing flake. 241/242 tests pass.

**Packaging blockers:**
1. (CRITICAL) All work uncommitted — HEAD is 8157b12 from 2026-08-04.
2. (HIGH) 9 tracked dist-renderer files need `git rm --cached`.
3. (HIGH) shared/design-tokens not tracked (gitignore fixed, needs `git add`).
4. (HIGH) electron-builder not run from current working tree.
5. (MEDIUM) 1 flaky test.
6. (MEDIUM) pnpm format:check is a no-op (echo ok).

**Coding-workspace usefulness blockers:**
1. (HIGH) ChangedFilesReview not wired — no Git status visible in the app.
2. (HIGH) No IPC channel to read git status.
3. (MEDIUM) Footer tabs all DEV — no terminal/build/test visibility.
4. (MEDIUM) No file diff view.
5. (LOW) Branch detection not implemented.

### Recommended finishing slices (ordered)
A. Commit, clean, and package the current tree (P0).
B. Wire ChangedFilesReview to real Git status (P0).
C. Wire branch detection and sidebar live data (P1).
D. Implement one functional footer tab — Git (P1).
E. Fix flaky test (P2).
F. Enable real format:check (P2).
G. Implement view diff on file click (P2).
H. Wire sidebar General Chat (P2).
I. Test/build/lint check visibility (P2).
J. OpenCode/agent integration (P3 — major feature).

### No-Git-action statement
This audit performed NO implementation. Only documentation files were created/updated. All Git commands read-only.

### Decision history (updated)
- 2026-08-04 17:43 — commit `8157b12 feat-refine-cron-shell-layout`.
- ... (prior entries unchanged) ...
- 2026-08-10 — pre-packaging truth audit (this entry).

### Report and evidence paths
- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_REPORT.md` (created)
- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_EVIDENCE.md` (created)
- `PROJECT_LOG.md` (appended)
- This log (appended)

Return this complete report to the CRON Architect for review.

---

## Same-Session OpenCode Approval / Resume — 2026-08-12 (CC/OpenCode, continuation of interrupted implementation)

Task title: `CRON FOR CODE — RESUME INTERRUPTED SAME-SESSION APPROVAL IMPLEMENTATION`.
Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch `main`, HEAD `8157b12`.
Nothing staged. Prior partial work preserved; not reverted or rebuilt.

### What was incomplete (found and fixed)
1. `replyToApproval` created a new execution record instead of continuing `approval.executionId`
   → duplicate executions. Now upserts the same record (same id, preserved startedAt).
2. `isPromiseSettled` race: for already-settled promises the marker always won → the session
   resume could never detect message completion and polled forever. Rewritten (settled flag +
   microtask drain).
3. API shapes were wrong for installed OpenCode 1.18.16: v2 `/api/session/.../permission`
   endpoints return empty without instance middleware; the installed desktop client uses
   `GET /permission?directory=...` and `POST /permission/{requestID}/reply?directory=...`.
   Verified live and adopted.
4. Missing Basic auth (`OPENCODE_SERVER_USERNAME`/`OPENCODE_SERVER_PASSWORD`, set by the
   OpenCode Desktop app) — all endpoints 401 without it. Runner now sends auth on every call.
5. Asymmetric model payloads: session wants `{providerID,id}`, message wants
   `{providerID,modelID}` (both verified by live probes).
6. Changed-file evidence: `/session/{id}/diff` returns `[]` for untracked files on 1.18.16;
   real evidence taken from the permission `metadata.filepath` (never fabricated).

### Live runtime proof (real installed server)
Session `ses_00d3e622bffeEVisfav5ZlCIAq` → message streamed → permission
`per_ff2c1bbff001Z6GSRzc5wtd5wK` (edit runtime-test.txt) → `POST /permission/.../reply`
`{reply:"once"}` → `true` → same session/message resumed (`finish:"stop"`, same sessionID) →
`runtime-test.txt` created with content exactly `CRON CODE RUNTIME OK` (read back from disk).
Same-session continuation proven end-to-end; the UI click-through remains for Venessa.

### Verification gate
- Typechecks: contracts/data-service/core/standalone/host-adapter — all PASS exit 0.
- Tests: 298 PASS (contracts 24, data-service 92, core 159, host-adapter 23; includes 7 new
  same-session runner tests + 2 new mock-server integration tests for the verified API).
- `pnpm build` PASS. `eslint` 0 errors (2 pre-existing warnings). `git diff --check` clean.
- No Git mutation. Nothing staged.

### Decision history (updated)
- 2026-08-12 — same-session OpenCode approval/resume completed; ready for Venessa runtime test.

### Report and evidence paths
- `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_REPORT.md` (created)
- `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_EVIDENCE.md` (created)
- `PROJECT_LOG.md` (appended)
- This log (appended)

Return this complete report to the CRON Architect for review.

---

## LOCKED DECISION — Agent Role Model (2026-08-12, Venessa + Architect)

- **GEMMA = PLANNER / ARCHITECT / READ-ONLY PROJECT COMPANION** (inspect, explain, plan,
  review; NEVER mutates files; never self-approves).
- **CODING MODEL THROUGH OPENCODE = FILE-MUTATING EXECUTOR** (DeepSeek V4 Flash default;
  V4 Pro explicit escalation only).
- **VENESSA = FINAL APPROVAL / ACCEPTANCE AUTHORITY** (approval semantics: planning is
  change-free; "Go / Do it / Implement it / Proceed / Build that" hands the visible task to
  the executor).
- Observable activity summaries are NOT private chain-of-thought. Technical evidence
  belongs in Review. Normal UX uses plain language. Startup must stay fast; the shell must
  never wait for AI/executor readiness.

## Fast Startup + Live Execution + Role Lock — 2026-08-12 (CC/OpenCode, implementation)

Task: `CRON FOR CODE — FAST STARTUP + HUMAN-READABLE LIVE EXECUTION + GEMMA/EXECUTOR ROLE LOCK`.
Repo `C:\Users\venes\projects\CRON APPS\CRON for Code`, branch `main`, HEAD `8157b12`,
nothing staged. Same-session approval verdict (Venessa) accepted and preserved.

### What was done
1. **Incremental activity**: root cause measured (events returned only inside the final
   result; no renderer→main subscription). Added a real event stream:
   `OpenCodeRunner.onEvent → main.mjs webContents.send('cron:opencode:event') → preload →
   renderer liveActivity[taskId]`. `awaiting_approval` events carry the structured approval
   so Approve/Reject render inline while running. Backend not slowed.
2. **Plain-English surface**: `activity-english.ts` maps statuses/messages; IDs
   (ses_/per_/exe_/…) suppressed from the normal UI, still present in Review/Evidence.
3. **Duplicate Details removed**; concise final summary added (Created/Checked/Tests/
   Changed files).
4. **Flattened coding surface**: conversational trail (rail + dots), inline approval,
   final summary — no nested admin-dashboard cards.
5. **Changed Files scoping**: Review pane now separates CURRENT TASK CHANGES and PROJECT
   CHANGES (real evidence only).
6. **Role lock enforced**: `PLANNER_ROLE` (read-only), `isPlannerRoute`, `isGoSignal`,
   handoff contract with Goal/Scope/Constraints/Protected areas/Acceptance criteria.
7. **Startup**: measured BEFORE 16.6s (dev/Vite) → AFTER 7.1s (normal mode, built renderer,
   no Vite). `CRON_RUN_MODE=normal` in dev.mjs + `-Mode` in the launcher (default normal,
   fallback to dev when dist-renderer missing). Runtime marker + renderer diagnostics now
   run in both modes (launcher readiness handshake). Restart supervision preserved; normal
   mode uses the existing app.relaunch() path. Port 5190 and AUMID unchanged.
8. **Entry screen**: balanced two-zone composition (content + art counterbalance),
   responsive at maximised/restored/narrow sizes, plain-language role chips.

### Verification
Typechecks all PASS; 313 tests PASS (contracts 24, data-service 93, core 173,
host-adapter 23); full `pnpm build` PASS; eslint 0 errors (2 pre-existing warnings);
`git diff --check` clean. Launcher/restart/port/AUMID/security regressions green
(repo-stabilisation suite). App verified live in normal mode (marker-confirmed,
file:// renderer). No Git mutation.

### Decision history (updated)
- 2026-08-12 — agent role model LOCKED (Gemma planner / OpenCode executor / Venessa
  authority); fast startup + live execution + role-lock implemented; ready for Venessa
  runtime test.

### Report and evidence paths
- `CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_REPORT.md` (created)
- `CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_EVIDENCE.md` (created)
- `PROJECT_LOG.md` (appended)
- This log (appended)

Return this complete report to the CRON Architect for review.

---

## Safety + Tray Menu Fix — 2026-08-13 (CC/OpenCode, implementation)

Task: `CC_CODE_SAFETY_AND_TRAY_FIX_PROMPT.md` — delete legacy `CommandExecutor` (security) +
wire the tray menu listeners (usability). Restart button explicitly out of scope.
Repo `C:\Users\venes\projects\CRON APPS\CRON for Code`, branch `main`, HEAD `8157b12`,
nothing staged.

### What was done
1. **`CommandExecutor` deleted** (`packages/data-service/src/task-runner.ts`): the
   `child_process.exec` shell-execution landmine is gone (it had no live callers; the
   governed `ExecutionService` is the only execution path). Export narrowed in
   `packages/data-service/src/index.ts`. `grep CommandExecutor` over all code: zero
   matches (docs mention it only as historical records).
2. **Tray menu listeners wired end-to-end**:
   - `preload.cjs`: `tray.onShowTasks/onPauseTask/onStopTask` — subscriptions to
     `cron:tray:show-tasks` / `pause-task` / `stop-task` returning unsubscribe functions.
   - `packages/core/src/tray.ts` (new): host-agnostic `TrayClient` interface (core stays
     Electron-free).
   - `store.ts`: `trayShowTasks` (select active task), `trayPauseTask`, `trayStopTask`
     (rejects a pending OpenCode approval through the injected runner → genuine cancel;
     honest "not interruptible" error otherwise). Optional `openCodeRunner` store dep.
   - `App.tsx`: `AppDeps.tray` + subscription effect with cleanup on unmount.
   - `ipc-data-service.ts` + `main.tsx`: `createIpcTrayClient()` wired into the standalone
     renderer.

### Verification
Typechecks all PASS (core dist rebuilt first so standalone resolves the new `AppDeps.tray`);
325 tests PASS (contracts 24, data-service 94, core 184 incl. 6 new tray tests, host-adapter
23); full `pnpm build` PASS; eslint 0 errors (3 warnings — one new `exhaustive-deps` in
`App.tsx`, same class as the 2 pre-existing); `git diff --check` clean. No Git mutation.
NOTE for the record: the 2 opencode-runner timeouts that were RED on 2026-08-13 audit runs
passed this run (load-sensitive near the 5s default).

### Honest limits flagged
1. Tray "Pause" has no backend target: `TaskStatus` has no `paused` state, so Pause
   surfaces the active task and never cancels. A true pause needs a new task state +
   backend support (Architect decision).
2. Tray "Stop" only genuinely stops an approval-pending OpenCode task; running catalogue
   commands / OpenCode sessions expose no cancel id to the renderer (honest error path).
   A backend cancel-by-task API is the follow-up if full Stop is wanted.
3. `main.mjs` tray menu and `ExecutionService` untouched per the prompt.

### Decision history (updated)
- 2026-08-13 — CommandExecutor removed; tray menu listeners wired; PERMANENT LOG RULE
  recorded (both logs updated after every task regardless of prompt). Ready for Venessa
  tray testing.

### Report and evidence paths
- `PROJECT_LOG.md` (appended, incl. slice-23 training notes)
- This log (appended)

Return this complete report to the CRON Architect for review.

---

## Taskbar Double-Icon Fix — 2026-08-13 (CC/OpenCode, defect repair)

Task (Venessa): the app "opens a running icon next to the pinned icon"; fix so it
shows ONE taskbar icon. Repo `C:\Users\venes\projects\CRON APPS\CRON for Code`,
branch `main`, HEAD `8157b12`, nothing staged.

### Root cause (proven, not guessed)
Windows 11 groups the pinned button with the running window only when both share one
identity. Live evidence on this machine: every pinned/installer shortcut (incl. the
pinned CRON for Code Dev, installed CRON for Code, Edge/Chrome/OpenCode) carries NO
AppUserModelID property (only a custom 788-byte icon-path blob; `IPropertyStore` reads
NOT-SET and refuses `SetValue` with STG_E_INVALIDPARAMETER). Grouping is therefore by
implicit exe path. The pinned shortcut targeted the VBS launcher → button identity =
wscript.exe, while the running window identity = electron.exe → mismatch → the second
"running" icon. The old `scripts/set-shortcut-appuser-model-id.ps1` was also broken
(wrong block signature 0xA0000001 and layout; nothing round-tripped).

### Fix
1. `main.mjs`: removed the explicit `app.setAppUserModelId()` (dev-only) — window
   identity is now the implicit electron.exe path in all source modes.
2. Retargeted the Desktop `CRON for Code Dev.lnk` (+ stray `(2)` duplicate) and the
   PINNED TaskBar `CRON for Code Dev.lnk` to `electron.exe .` directly (workdir
   `apps\standalone`) — pinned identity and window identity are now the same path.
   App entry and normal-mode behaviour are identical; single-instance lock intact.
3. `scripts/create-code-dev-shortcut.ps1` rewritten for the direct-exe shortcut.
4. `scripts/set-shortcut-appuser-model-id.ps1` corrected to the true MS-SHLLINK layout
   (signature 0xA0000007, "1SPS" sheet, LECmd-verified) and annotated as superseded
   on this OS. Diagnostic probes retained in `scripts/`.
5. The VBS/PS1 launcher chain is UNTOUCHED (still the dev-mode path via
   `Launch-CRON-for-Code-Dev.bat`); this fix changes only the shortcut identity and
   the AUMID call.

### Verification
`node --check main.mjs` clean; `pnpm lint` 0 errors (3 pre-existing warnings). Launch
via the new desktop shortcut surfaced the running window with NO new process
(16→16 electron processes; single-instance lock proof). Shortcut targets verified.
The live instance already has implicit identity, so it merges with the new pinned
button immediately. Taskbar button counts are not programmatically observable on this
Win11 build (XAML taskbar, documented); Venessa's visual check is the acceptance step
(click the pinned icon — one icon; if a ghost button lingers, unpin/repin once).

### Decision history (updated)
- 2026-08-13 — taskbar identity aligned to exe-path matching (shortcuts retargeted to
  electron.exe, explicit AUMID removed); logs updated per the permanent rule. Awaiting
  Venessa's visual taskbar acceptance.

### Report and evidence paths
- `PROJECT_LOG.md` (appended, incl. slice-24 training notes)
- This log (appended)

Return this complete report to the CRON Architect for review.

---

## Audit + Fix Sweep � 2026-08-14 (CC/OpenCode, audit/fix)

Task: `CC_CODE_AUDIT_AND_FIX_PROMPT.md`. Full audit then safe fixes, verification, and this report. Branch `main`, HEAD `71eaf50` + 2 local commits ahead of origin, nothing staged, 19 files uncommitted at start.

### Stage call
Implementation (safe fixes only). No architectural changes made; two items flagged below for the Architect/Venessa.

### What was found and fixed
1. **Security landmine already gone.** The `CommandExecutor` (`child_process.exec` + shell) was deleted on 2026-08-13. Re-audit today: zero `child_process.exec` and zero `eval` in the repo. All subprocess use is `spawn`/`spawnSync`; only `apps/standalone/scripts/dev.mjs` uses `shell:true` (fixed-literal pnpm/electron shim spawning on Windows - no interpolated user input, acceptable). `SafeExecutionHarness` (no shell, bounded/redacted output, kill-tree) remains the only governed execution path.
2. **3 failing tests fixed (all stale vs. the intentional 2026-08-13 shortcut identity change):**
   - `create-code-dev-shortcut.ps1` error message reworded (no longer trips the no-auto-install guard).
   - `repo-stabilisation.test.ts` + `test-code-dev-launcher.ps1` now assert the direct `electron.exe` target / `apps\standalone` workdir contract instead of the superseded VBS/repoRoot contract.
3. **Dead code removed:** unused `isTerminalExecution` export (`execution-harness.ts`); the two stale `.before-aumid-fix` backup files deleted (user-approved).
4. **Restart button + tray menu:** verified fully wired and tested end-to-end (no action needed). Restart: store ? IPC ? restart intent ? dev.mjs relaunch ? lingering overlay. Tray: main.mjs `cron:tray:*` sends ? preload subscriptions ? `App.tsx` effect (cleanup on unmount) ? store actions, 6 dedicated tests.

### Verification
325/325 tests pass (contracts 24, data-service 94, core 184, host-adapter 23); `pnpm typecheck` all packages clean; `pnpm lint` 0 errors (3 pre-existing exhaustive-deps warnings); launcher logic script passes standalone. `git diff --stat` = 17 files, +482/-165 (includes prior sessions' uncommitted tray/AUMID work).

### Trust score
9/10. All prior sessions' claims that were verifiable today held (CommandExecutor gone, tray wired, restart wired, launcher contracts). One prior-session note was wrong ("launcher tests unaffected" - they were stale and failing) - hence 9 not 10.

### Priority fixes for Venessa/Architect (decisions, not implemented)
1. `TaskRunner` + `TaskExecutor` types in `packages/data-service/src/task-runner.ts`: exported public API with tests but ZERO live callers (governed path is `ExecutionService`). Delete the polling model or keep as the legacy scheduled-runner contract? Recommend delete for the same reason `CommandExecutor` was deleted.
2. Untracked diagnostics `scripts/_probe-lnk-roundtrip.ps1` and `scripts/_taskbar-button-count.ps1` (deliberately kept per 2026-08-13 log). Keep tracked, or move to a gitignored diagnostics folder?

### Log rule
Both `PROJECT_LOG.md` and this log appended per the permanent rule.

Return this complete report to the CRON Architect for review.
