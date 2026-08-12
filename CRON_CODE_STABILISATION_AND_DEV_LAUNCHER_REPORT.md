# CRON for Code — Repository Stabilisation + Dev Launcher and Taskbar Shortcut Report

**Executed by:** CC/OpenCode (approved task)
**Date:** 2026-08-06 13:33 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task file:** `CRON_for_Code_Stabilisation_and_Dev_Launcher.md`
**Classification:** `READY FOR VENESSA DEV LAUNCHER TEST`

Session continuity disclosure (per CRON Permission-Batching and Interrupted-Session Recovery Rule):
this session was **interrupted once** and resumed. Resume classification: **PARTIALLY COMPLETED — SAFE TO RESUME**.
Permission batches were kept at **10 or fewer** requests each and are disclosed in §23a. No action was repeated except
the required re-verification of the test file after a path-join fix (details in §23b). No process or file was left by
the interrupted session. No forbidden Git/release action occurred.

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
- 2026-08-06 13:33 — stabilisation + dev launcher checkpoint (this entry).
```

---

## 2. Objective completed

Both parts completed:

- **Part A — Repository stabilisation:** design-tokens ignore bug fixed; generated `dist-renderer/` churn stopped
  (ignore policy; tracked files left for manual `git rm --cached` by Venessa/Architect); lint baseline corrected
  (`pnpm lint` passes with 0 errors); project records deduplicated at creation and reconciled deterministically on load
  (with tests); README status refreshed; v1.1.7 behaviour preserved (no version/lockfile changes, LM Studio integration
  untouched, no task-execution broadening).
- **Part B — Dev launcher and taskbar icon:** four launcher files created, `.runtime/` logging added, hidden launch,
  dynamic paths, no auto-install, port reuse/fail-safe, dev/production userData separation preserved, shortcut creator
  producing a taskbar-friendly `CRON for Code Dev.lnk` with the CRON icon.
- All 15 required focused tests added; all verification commands pass; runtime evidence collected (§14–§16).

## 3. Design-tokens ignore — root cause and correction

- **Root cause:** `.gitignore` contained a broad credentials pattern `*token*` (intended to exclude token files). The
  glob matches any path segment containing "token", so the directory `shared/design-tokens/` (and its two files) were
  ignored even though they are workspace source consumed by the build (`import '@cron-code/design-tokens'`).
  Verified before the fix with `git check-ignore -q shared/design-tokens/index.css` → exit 0 (ignored).
- **Correction:** replaced `*token*` with `*.token`, `token*.json`, `.tokens*`; kept `*.pem`, `*.key`, `credentials*`,
  `secret*`. None of the new patterns match `design-tokens`.
- **Verified after:** `git check-ignore` on `shared/design-tokens/index.css` and `package.json` → exit 1 (not ignored);
  `secret-test.pem`, `auth.token`, `token-secret.json`, `credentials-backup.txt`, `private.key` → exit 0 (still ignored).
  `git status` now shows `?? shared/design-tokens/` (normal untracked source, ready for exact staging).

## 4. Generated output policy

- `.gitignore` now has `apps/standalone/dist-renderer/` (whole generated renderer output directory) and `.runtime/`
  (launcher logs). New build output no longer appears as untracked (verified: the fresh hashes produced by `pnpm build`
  during this task, e.g. `assets/index-XgJQ2jjF.js`, are ignored).
- CC did **not** delete or untrack any file through Git. The following already-tracked generated files remain tracked
  and must be removed from tracking manually by Venessa + Architect (`git rm --cached <path>` per file, then a commit):
  - `apps/standalone/dist-renderer/index.html`
  - `apps/standalone/dist-renderer/code_logo.png`
  - `apps/standalone/dist-renderer/code_logo_transparent.png`
  - `apps/standalone/dist-renderer/cron_shell_background.png`
  - `apps/standalone/dist-renderer/assets/code_logo_transparent-TEhRPKA6.png`
  - `apps/standalone/dist-renderer/assets/cron_shell_background-j_Mb-hGJ.png`
  - `apps/standalone/dist-renderer/assets/index-BKHl0T_0.js` (already deleted on disk — shows `D`)
  - `apps/standalone/dist-renderer/assets/index-DKjNfHep-ByRAIpR-.js` (already deleted on disk — shows `D`)
  - `apps/standalone/dist-renderer/assets/index-DwH0u0NX.css` (already deleted on disk — shows `D`)

## 5. Lint — root cause and correction

- **Root cause:** `eslint.config.mjs` used `js.configs.recommended` + `tseslint.configs.recommended` without
  `languageOptions.globals`, so Node/CommonJS/browser globals were undeclared for `.mjs`/`.cjs` (and no explicit set
  for `.ts`/`.tsx`). This produced 36 `no-undef` errors (`process`, `require`, `URL`, `fetch`, `console`, `Buffer`,
  `setTimeout`), plus two genuine defects: `main.mjs` `preserve-caught-error` and `task-runner.test.ts` `prefer-const`.
- **Correction:** added explicit per-file-type globals in the config (browser for `.ts`/`.tsx`; node+commonjs for
  `.mjs`/`.cjs`; browser+node for tests) with no new dependency. Fixed the two genuine defects
  (`throw new Error(message, { cause: err })`; `let taskStore` → `const taskStore`). Added `**/.runtime/**` to ignores.
- **Result:** `pnpm lint` exits 0 with **0 errors** (2 pre-existing `react-hooks/exhaustive-deps` warnings remain in
  `App.tsx`; these are warnings, not errors, and were intentionally left to avoid runtime-behaviour changes).

## 6. Project deduplication behaviour

- `normalizeProjectPath(path)` normalises separators, trailing slashes and case (case-insensitive, appropriate for the
  Windows-targeted host) so equal folders compare equal.
- `addProject(project)` and new `openProjectPath(rootPath, name)` first look up an existing project by normalised path;
  if present they select it and never save a duplicate. `App.tsx`'s host-adapter handler now calls `openProjectPath`.
- `reconcileProjects(projects, activeId)` collapses duplicates deterministically on load: canonical per folder is the
  earliest `createdAt` (tie-break by id) — preserving the original stored project id; a `moves` map records
  duplicate→canonical; the active id is remapped if it was a duplicate. No project records are deleted.
- `remapProjectReferences` migrates any tasks/approvals referencing a duplicate project id onto the canonical id
  (preserving user data; deterministic and idempotent).
- Tests added: normalisation, deterministic canonical selection, order-stability, no-duplicate-on-reopen, and
  load-time reconciliation with task remapping (all in `store.test.ts`).

## 7. README update

`README.md` status section now states the real current state: Electron shell with tray and window-state persistence;
LM Studio local-model chat (settings, connection test, chat completion) via IPC; JSON-backed persistence; reusable
`@cron-code/core` workspace with host adapters; project-selection deduplication; packaging to Desktop via
electron-builder. It explicitly lists not-yet-implemented items (real task/agent execution, approval UI gates, Git
release gate, OpenCode). Dev-launcher usage (`scripts\create-code-dev-shortcut.ps1` → pin to taskbar) documented.

## 8. Launcher architecture

The hidden dev launcher reuses the repository's approved dev architecture (`apps/standalone/scripts/dev.mjs`, which
starts Vite on `127.0.0.1:5180` strictPort and Electron pointing at `http://127.0.0.1:5180`). The launcher:

1. resolves the repo root dynamically (from its own location — no hardcoded username);
2. verifies `node_modules` exists and **never runs an installer**;
3. checks the dev port: if occupied by this repo's Vite it reuses it (and reuses a running dev Electron, otherwise
   launches Electron against it); if occupied by an unrelated process it **fails safely (exit 2) and never kills it**;
4. otherwise starts `node apps/standalone/scripts/dev.mjs` hidden, with per-process logs via `CRON_DEV_LOG_DIR`;
5. waits up to 60 s for the dev service to become reachable and reports failure with a log pointer otherwise;
6. writes all messages to `.runtime/code-dev-launcher.log` and child output to `.runtime/code-dev-vite.log` /
   `.runtime/code-dev-electron.log`;
7. supports `CRON_CODE_DEV_PORT` (alternate dev port, forwarded to Vite and Electron) to coexist with any project
   already using 5180;
8. never terminates unrelated processes and never touches the installed production app; dev/production userData
   separation is preserved (`CRON_DEV=1` → `CRON for Code Dev`).

## 9. Exact launcher files

- `Launch-CRON-for-Code-Dev.bat` — repo root; double-click entry; resolves `%~dp0`; delegates to the VBS via `wscript`.
- `launch-cron-for-code-dev.vbs` — repo root; resolves repo root from `WScript.ScriptFullName`; runs the PS1 hidden
  (`powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File …`, window style 0); is the shortcut target.
- `scripts/run-code-dev-hidden.ps1` — core launcher (behaviour in §8).
- `scripts/create-code-dev-shortcut.ps1` — creates the Desktop shortcut (see §11).
- Supporting change: `apps/standalone/scripts/dev.mjs` (optional `CRON_DEV_LOG_DIR` + `CRON_CODE_DEV_PORT`, `shell: true`
  preserved); `apps/standalone/electron/main.mjs` (`DEV_URL` honours `CRON_CODE_DEV_URL`, default unchanged).

## 10. Exact icon path used

`C:\Users\venes\projects\CRON APPS\CRON for Code\apps\standalone\branding\assets\code_icon.ico`
(existing branded `.ico`, tracked; also used by the packaged app). The shortcut creator sets
`IconLocation = <icon>,0`. No new icon was generated because a usable branded `.ico` already exists.

## 11. Shortcut creation and taskbar pinning steps (for Venessa)

1. Open PowerShell in the repo and run:
   `scripts\create-code-dev-shortcut.ps1`
2. Confirm `CRON for Code Dev.lnk` appears on the Desktop (`C:\Users\venes\Desktop\CRON for Code Dev.lnk`).
3. Right-click the shortcut.
4. Choose **Pin to taskbar**.
5. Use that pinned icon to launch the development app.

Notes: CC created the shortcut but did **not** perform taskbar pinning (that is a manual, user-only action). If the
default port 5180 is occupied by another project's dev server (currently CRON for Chat), the launcher fails safely;
launch the shortcut normally once the other dev server is stopped, or start it with `CRON_CODE_DEV_PORT` set to a free
port in the calling environment.

## 12. Exact files changed

Modified tracked files (this task only; pre-existing LM Studio/layout modifications are unchanged and listed separately):
- `.gitignore`
- `README.md`
- `eslint.config.mjs`
- `apps/standalone/electron/main.mjs` (2 lines: `{ cause: err }`; `DEV_URL` env override)
- `apps/standalone/scripts/dev.mjs` (log-dir + port override, backward compatible)
- `packages/data-service/src/task-runner.test.ts` (`let` → `const`)
- `packages/core/src/store.ts` (dedup functions + `openProjectPath` + `loadProjects`/`addProject` wiring)
- `packages/core/src/store.test.ts` (+5 dedup tests)
- `packages/core/src/components/App.tsx` (handler → `openProjectPath`; removed unused `createCodeProject` import)

Created files:
- `Launch-CRON-for-Code-Dev.bat`
- `launch-cron-for-code-dev.vbs`
- `scripts/run-code-dev-hidden.ps1`
- `scripts/create-code-dev-shortcut.ps1`
- `packages/core/src/repo-stabilisation.test.ts` (+15 tests)
- `CRON_ARCHITECT_LOG.md` (updated), `PROJECT_LOG.md` (updated), `CRON_CODE_STABILISATION_AND_DEV_LAUNCHER_REPORT.md` (this file)

Unchanged by design: package versions, lockfile, LM Studio contracts/logic, task-runner execution behaviour, approval
contracts, installed production files, userData files. Pre-existing uncommitted working-tree changes (LM Studio
integration + layout) are untouched. No tracked `dist-renderer/` files were removed via Git.

## 13. Tests / lint / typecheck / build

All run from repo root on 2026-08-06 (see §18–§21 for commands/raw output):

- `pnpm test` — **PASS**, exit 0. 58 tests: contracts 12, data-service 16, host-adapter 5, core 25
  (core includes the 5 new dedup tests + 15 new stabilisation/launcher tests).
- `pnpm typecheck` — **PASS**, exit 0 (all 7 package scripts).
- `pnpm build` — **PASS**, exit 0 (contracts/data-service/host-adapter `tsc`; core `vite build` + `tsc --emitDeclarationOnly`;
  standalone `vite build` → `dist-renderer/`).
- `pnpm format:check` — **PASS**, exit 0 (all stub `echo ok`).
- `pnpm lint` — **PASS**, exit 0 (0 errors, 2 pre-existing warnings).
- `git diff --check` — clean (CRLF warnings only).

Required focused tests (15), and where they live:
1. `shared/design-tokens` no longer ignored — `repo-stabilisation.test.ts`.
2. secret/token patterns remain ignored — `repo-stabilisation.test.ts`.
3. generated `dist-renderer` output ignored — `repo-stabilisation.test.ts`.
4. lint passes — `repo-stabilisation.test.ts` (runs `pnpm lint`).
5. duplicate project paths do not create duplicate records — `store.test.ts`.
6. existing duplicates reconcile deterministically — `store.test.ts`.
7. LM Studio config intact — `repo-stabilisation.test.ts` (IPC handler names + `LlmConfig` shape).
8. launcher files exist — `repo-stabilisation.test.ts`.
9. launcher paths dynamic — `repo-stabilisation.test.ts`.
10. no automatic install commands — `repo-stabilisation.test.ts`.
11. launcher targets existing dev command — `repo-stabilisation.test.ts`.
12. logs target `.runtime/` — `repo-stabilisation.test.ts`.
13. shortcut creator targets silent launcher — `repo-stabilisation.test.ts`.
14. shortcut uses CRON icon — `repo-stabilisation.test.ts`.
15. dev/production userData remain separated — `repo-stabilisation.test.ts` (source) + live evidence (§16).

Existing tests were not weakened (all prior tests still pass).

## 14. Runtime launch evidence

- **Fail-safe path (port 5180 occupied by unrelated process):** `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1` (no override) → **exit 2**. Log: `Port 5180 is listening (PID 35556)` → `FAIL: port 5180 is occupied by a process that does not belong to this repo (PID 35556). Refusing to start or touch it.` Owner identified as `node ... CRON for Chat\packages\standalone\...\vite\bin\vite.js`. PID 35556 verified alive afterwards.
- **Success path (override port 5190):** `CRON_CODE_DEV_PORT=5190; powershell … run-code-dev-hidden.ps1` → **exit 0**. Log: `Starting: node …\apps\standalone\scripts\dev.mjs`; `Dev command started (PID 38776)`; `Dev service reachable at http://127.0.0.1:5190`; `Launcher completed.` Verified after launcher exit: port 5190 listening (PID 39520 = our Vite), dev.mjs (38776) alive, dev Electron main (22948) + children alive. **Launcher-owned dev process remained alive** after the launcher exited.
- **Reuse path:** re-running the launcher with the stack up → **exit 0**, `Port 5190 belongs to this repo's Vite dev server. Reusing it.` / `A CRON for Code dev Electron instance is already running (PID 22948). Nothing to start.` Process set before/after identical (no duplicate instances).
- **First dev.mjs attempt (pre-fix) failed** with exit 1 because the launcher passed the dev-script path to `Start-Process -ArgumentList` unquoted (repo path contains spaces) and because `shell: true` was dropped in the initial `dev.mjs` rewrite. Both were fixed (quoted argument; `shell: true` restored). This is the only repeated action (§23b).

## 15. Shortcut creation evidence

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create-code-dev-shortcut.ps1` → exit 0, output:
```
Created shortcut: C:\Users\venes\Desktop\CRON for Code Dev.lnk
Target: C:\Users\venes\projects\CRON APPS\CRON for Code\launch-cron-for-code-dev.vbs
Working directory: C:\Users\venes\projects\CRON APPS\CRON for Code
Icon: C:\Users\venes\projects\CRON APPS\CRON for Code\apps\standalone\branding\assets\code_icon.ico
```
Re-read via `WScript.Shell.CreateShortcut`: TargetPath = the VBS, WorkingDirectory = repo root,
IconLocation = `…\code_icon.ico,0`. File exists on Desktop.
**Shortcut-launch test:** after stopping the dev stack, `Start-Process` on the `.lnk` (with `CRON_CODE_DEV_PORT=5190`
inherited through the lnk→VBS→PS1 chain) started a fresh dev stack: dev.mjs PID 32924, Vite PID 5796 on port 5190,
Electron main PID 42740 + children — i.e., the shortcut chain launches the dev app.

## 16. Process isolation evidence

- Production app (`C:\Program Files\CRON for Code\CRON for Code.exe` v1.1.7): PIDs **9032, 11552, 25456, 28260**
  unchanged before, during and after all launcher tests (verified at each step).
- CRON for Chat dev Vite (PID 35556) on port 5180: **alive and untouched** throughout (never killed; fail-safe exit 2).
- Dev instance used userData `C:\Users\venes\AppData\Roaming\CRON for Code Dev` (fresh activity 13:07 during launch)
  while production userData `@cron-code\standalone` showed no new activity — separation confirmed live.
- Port 5190 (our Vite) cleaned up at the end; port 5180 remains owned by CRON for Chat (PID 35556) — untouched.
- All task-created processes (dev.mjs, Vite, dev Electron and children) were stopped by CC at the end via
  `Stop-Process` on the exact task-created PIDs (38776, 39520, 29160, 22948, 33804, 36084, 38020, then the second
  stack 32924, 5796, 16576, 42740, 14424, 42772, 42096). No unrelated process was terminated.

## 17. Exact verification input

- Authorised task brief: `CRON_for_Code_Stabilisation_and_Dev_Launcher.md` (Part A + Part B; protected boundaries;
  allowed files; 15 required tests; verification commands; final report structure).
- Permanent rule: `CRON_CC_Permission_Batching_and_Recovery_Rule.md` (≤10 permissions per batch; resume check;
  classification; final-report disclosures).
- Repository evidence: git state, source/config files, launcher files, tests, `.runtime` logs, live processes, ports,
  Desktop shortcut, LM Studio `/models`.

## 18–21. Every command, working directory, exit code, and raw stdout/stderr

Working directory for all commands: `C:\Users\venes\projects\CRON APPS\CRON for Code` (repo root). Timestamps 13:00–13:33 +10:00.

**Batch 1 — resume check (all exit 0 unless noted):**
```
git rev-parse --show-toplevel            -> C:/Users/venes/projects/CRON APPS/CRON for Code
git branch --show-current                -> main
git rev-parse HEAD                       -> 8157b127f5739f02fcfe04fec745666392c67f5e
git diff --cached --name-only            -> (empty; nothing staged)
git status --short --branch              -> ## main...origin/main + M/D/?? inventory (see §12/§22)
Test-Path CRON_CODE_STABILISATION_AND_DEV_LAUNCHER_REPORT.md -> False
Get-NetTCPConnection -LocalPort 5180     -> 35556  (CRON for Chat vite, unrelated)
Get-Process electron/CRON                -> 9032,11552,25456,28260 (production only)
```

**Batch 2 — test re-run after fix (exit 0):** `pnpm --filter @cron-code/core test`
```
Test Files  2 passed (2)      Tests  25 passed (25)
```
(Includes the `pnpm lint` guard test ~18–30 s.)

**Batch 3 — full verification (all exit 0):**
- `pnpm test` → contracts 12 passed; host-adapter 5 passed; data-service 16 passed (1 expected WARN from
  `survives invalid stored data` test); core 25 passed; standalone/shared `echo ok`. `TEST_EXIT:0`.
- `pnpm lint` → `✖ 2 problems (0 errors, 2 warnings)` (warnings: `react-hooks/exhaustive-deps` in `App.tsx` 38:6, 48:6).
  `LINT_EXIT:0`.
- `pnpm format:check` → all packages `echo ok`. `FORMAT_EXIT:0`.
- `git diff --check` → clean (LF→CRLF warnings only). `DIFFCHECK_EXIT:0`.
- `pnpm typecheck` → all 7 package scripts done. `TYPECHECK_EXIT:0`.
- `pnpm build` → packages `tsc`/`vite build`; standalone `vite build` → `dist-renderer/` (index.html, 2 pngs,
  `index-CnLAifk6.css`, `index-XgJQ2jjF.js`, `index-B4ijvTvI.js`). `BUILD_EXIT:0`.

**Batch 4 — runtime pre-checks:**
```
Get-NetTCPConnection 5180 -> 35556 (CRON for Chat vite)
Invoke-RestMethod http://127.0.0.1:1234/v1/models -> 19 models
Test-Path .runtime -> False
production procs -> 9032,11552,25456,28260
Get-CimInstance PID 35556 -> node, CRON for Chat vite
```

**Batch 5 — fail-safe path:** `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1`
`LAUNCHER_EXIT:2`. Launcher log:
```
[2026-08-06 13:03:35] === CRON for Code dev launcher starting ===
[2026-08-06 13:03:35] Repo root: C:\Users\venes\projects\CRON APPS\CRON for Code
[2026-08-06 13:03:35] Dev port: 5180
[2026-08-06 13:03:37] Port 5180 is listening (PID 35556).
[2026-08-06 13:03:38] FAIL: port 5180 is occupied by a process that does not belong to this repo (PID 35556). Refusing to start or touch it.
[2026-08-06 13:03:38] Owner command line: node   "C:\Users\venes\projects\CRON APPS\CRON for Chat\packages\standalone\node_modules\.bin\\..\vite\bin\vite.js"
```
PID 35556 verified alive after. `Get-Content .runtime\code-dev-launcher.log` created `.runtime/` automatically.

**Batch 6 — success path (port 5190):** `$env:CRON_CODE_DEV_PORT='5190'; powershell …; $env:CRON_CODE_DEV_PORT=$null`
- Attempt 1 → `LAUNCHER_EXIT:1`, `FAIL: dev command exited immediately (code 1)`; `.runtime/code-dev-vite.log` and
  `code-dev-electron.log` both empty. Root cause identified: `dev.mjs` dropped `shell: true` (Windows `spawn('pnpm')`
  needs it) — fixed; and the launcher passed the dev-script path unquoted to `Start-Process -ArgumentList` (path has
  spaces) — fixed.
- Foreground confirmation: `$env:CRON_DEV_LOG_DIR=<root>\.runtime; $env:CRON_CODE_DEV_PORT='5190'; node apps/standalone/scripts/dev.mjs`
  ran (vite+electron started; Node 24 `DEP0190` warning about shell-args concatenation is informational). Command
  timed out at 45 s as expected (long-running); its process tree was cleaned by the tool timeout; verified no strays.
- Attempt 2 → `LAUNCHER_EXIT:0`. Log tail:
```
[2026-08-06 13:07:10] Dev port: 5190
[2026-08-06 13:07:11] Starting: node C:\Users\venes\projects\CRON APPS\CRON for Code\apps\standalone\scripts\dev.mjs (logs: code-dev-vite.log, code-dev-electron.log)
[2026-08-06 13:07:12] Dev command started (PID 38776).
[2026-08-06 13:07:14] Dev service reachable at http://127.0.0.1:5190.
[2026-08-06 13:07:14] Launcher completed. Logs: …\.runtime\code-dev-launcher.log, .runtime/code-dev-vite.log, .runtime/code-dev-electron.log
```
Post-launch verification (exit 0): port 5190 → PID 39520; our-repo processes 38776 (dev.mjs), 39520 (Vite), 29160
(node/electron shim), 22948 (Electron main), 33804/36084/38020 (children); production procs unchanged; PID 35556 alive;
`.runtime` logs: launcher 2202 B, vite 160 B, electron 56 B.

**Batch 7 — reuse path:** `$env:CRON_CODE_DEV_PORT='5190'; powershell …; $env:CRON_CODE_DEV_PORT=$null`
`LAUNCHER_EXIT:0`; `PROC_SET_UNCHANGED:True`. Log tail:
```
[2026-08-06 13:07:44] Port 5190 is listening (PID 39520).
[2026-08-06 13:07:52] Port 5190 belongs to this repo's Vite dev server. Reusing it.
[2026-08-06 13:07:53] A CRON for Code dev Electron instance is already running (PID 22948). Nothing to start.
```

**Batch 8 — userData separation + shortcut creation:**
- Dev userData `%APPDATA%\CRON for Code Dev` recent writes: `Preferences` 13:07:26, `Session Storage` 13:07:25,
  `blob_storage` 13:07:21. Production `%APPDATA%\@cron-code\standalone`: latest write 2026-08-05 08:08 (unchanged).
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create-code-dev-shortcut.ps1` → exit 0; output as in §15.
  `Test-Path C:\Users\venes\Desktop\CRON for Code Dev.lnk` → True; COM re-read confirmed Target/WorkDir/Icon.

**Batch 9 — cleanup + shortcut-launch:**
- Cleanup of first stack: `Stop-Process` on 38776,39520,29160,22948,33804,36084,38020 → remaining: NONE; 5190 free;
  prod procs unchanged; PID 35556 alive.
- Shortcut launch: `Start-Process <lnk>` with `CRON_CODE_DEV_PORT=5190` inherited; after 14 s → port 5190 = PID 5796;
  our-repo procs 32924 (dev.mjs), 5796 (Vite), 16576 (shim), 42740 (Electron main), 14424/42772/42096 (children);
  launcher log tail `Dev command started (PID 32924)` … `Dev service reachable at http://127.0.0.1:5190`.
- Final cleanup: `Stop-Process` on 32924,5796,16576,42740,14424,42772,42096 → remaining: NONE; then force-stopped the
  residual 42740/42772/42096; final state: task procs NONE; prod procs 9032,11552,25456,28260; PID 35556 alive;
  5180 owned by 35556, 5190 free; LM Studio 19 models; `.runtime` logs 4957 B / 479 B / 168 B.

**Batch 10 — final inventory (exit 0):**
`git status --short` (full inventory in §22); `git diff --cached --name-only` → empty (nothing staged);
`git check-ignore -v` → `.gitignore:36:.runtime/` for `.runtime/code-dev-launcher.log`; `.gitignore:9:apps/standalone/dist-renderer/`
for `assets/index-XgJQ2jjF.js` (tracked `dist-renderer/index.html` still tracked, as expected).

## 22. Self-audit mapped to evidence

- Resume classification recorded (§ opening) with evidence (report absent, no log entry, test fix pending, no task
  processes alive). ✓
- Each required correction mapped to a verifiable outcome: design-tokens (§3, check-ignore evidence); renderer policy
  (§4, ignore + churn gone); lint (§5, exit 0); dedup (§6, 5 unit tests + runtime wiring); README (§7). ✓
- Required tests 1–15 all present and passing (§13). Existing tests not weakened (58 total pass). ✓
- Runtime claims backed by recorded PIDs, ports, logs, and process sets (§14–§16, §18–21). No visual claims made. ✓
- Launcher safety: no install commands (test 10), dynamic paths (test 9), reuse/fail-safe observed live, unrelated
  processes never killed (PID 35556 and production PIDs verified at every step). ✓
- Write boundary respected: only allowed files touched (§12); no version/lockfile/LM-Studio/task-runner/approval
  changes; no tracked file removed via Git; nothing staged. ✓

## 23. Session continuity & permission-batching disclosure

### 23a. Permission batches (each ≤ 10 requests)
1. Batch 1 — resume-check inspection commands (8). Completed before next batch.
2. Batch 2 — core test re-run (1). Completed.
3. Batch 3 — full verification: test, lint, format, diff-check, typecheck, build (6). Completed.
4. Batch 4 — runtime pre-checks (5). Completed.
5. Batch 5 — fail-safe launch + log inspection (2). Completed.
6. Batch 6 — success-path launch attempts + fix + re-run (4). Completed.
7. Batch 7 — reuse-path launch (1). Completed.
8. Batch 8 — userData separation + shortcut creation (2). Completed.
9. Batch 9 — cleanup + shortcut-launch (2). Completed.
10. Batch 10 — final inventory (1). Completed.
No batch exceeded 10 permission requests. No permission was re-requested for an already-completed action.

### 23b. Interrupted-session disclosure
- Session was interrupted once (after the audit task completed, during this stabilisation task). At resume the task was
  classified `PARTIALLY COMPLETED — SAFE TO RESUME`.
- Actions repeated because verification proved them necessary, and only these: the core test suite was re-run after a
  path-join fix in the new test file (`join(REPO_ROOT, …)`), and the success-path launch was retried after fixing two
  launcher defects (dropped `shell: true` in `dev.mjs`; unquoted script path in `Start-Process -ArgumentList`). No other
  work was repeated; no completed work was redone.
- No process or file was left by the interrupted session (verified: no task-created processes alive at resume; all
  cleanup verified complete at the end of this task).
- No forbidden Git/release action occurred in either session segment (§23c).

## 23c. Confirmation that nothing was staged, committed, pushed, merged, tagged, released, reset, restored, or cleaned

Confirmed. `git diff --cached --name-only` is empty (nothing staged). No commit/push/merge/tag/release/reset/restore/
clean/checkout/switch/rewrite was executed. No dependency install/update/repair. No package version or lockfile change.
All `Stop-Process` calls targeted only task-created processes; no unrelated or production process was terminated.

---

## 24. Final classification

`READY FOR VENESSA DEV LAUNCHER TEST`
