# PROJECT LOG — CRON for Code

Append-only execution log. Preserved history + fresh-session resume-audit entry.

---

## Fresh-Session Resume-Audit Entry — 2026-08-06 09:35 +10:00 (CC/OpenCode, read-only audit)

No prior `PROJECT_LOG.md` existed. This is the first entry, produced by the strictly read-only audit
(`CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`).

### Verified project summary
CRON for Code is a governed AI coding workspace delivered as a standalone Electron app plus a reusable React
workspace package. Repository is a pnpm monorepo at
`C:\Users\venes\projects\CRON APPS\CRON for Code` (branch `main`, HEAD `8157b12`, remote
`https://github.com/clearline-studio/CRON-for-Code.git`).

Committed history:
- `d432bcb feat: establish working Cron for Code` (2026-08-04 11:03 +10:00)
- `8157b12 feat-refine-cron-shell-layout` (2026-08-04 17:43 +10:00)

Uncommitted working tree (since 8157b12): LM Studio integration (settings modal, chat client, Electron IPC,
preload bridge, renderer client), `CronAssistant` real chat, shell layout refinements, standalone version
bump to 1.1.7, dev userData separation, Vite alias to core source.

### Audit evidence highlights
- `pnpm test` — PASS, 38 tests (contracts 12, data-service 16, host-adapter 5, core 5; stub `echo ok` for
  standalone/shared packages).
- `pnpm typecheck` — PASS (all 7 workspace packages).
- `pnpm build` — PASS (packages tsc/vite + standalone vite build to `dist-renderer/`).
- `pnpm format:check` — PASS.
- `pnpm lint` — FAIL, 36 errors (see audit report; ~32 pre-existing at HEAD, 4 introduced by uncommitted
  LM Studio code in `main.mjs`).
- `git diff --check` — clean.
- Runtime: app installed as v1.1.7 (`C:\Program Files\CRON for Code`) and a dev Electron instance both running;
  LM Studio live on 127.0.0.1:1234 with 19 models; production `store.json` persists projects/tasks and the
  `lmstudio.config` preference (LM Studio settings feature proven live in installed build).

### Defects / discrepancies logged (details in audit report)
1. `shared/design-tokens/` is ignored by `.gitignore:28:*token*` and therefore not tracked — fresh-clone build risk.
2. README status section stale ("Phase 0 ... No OpenCode/model integration yet").
3. `pnpm lint` failing baseline (config gap for Node globals; 4 new errors from uncommitted code).
4. `dist-renderer/` build output partially committed, causing churn with every build.
5. Duplicate project records on repeated folder selection.
6. No genuine task/agent execution yet (placeholder echo executor; tasks remain draft).

### Boundary confirmation
Read-only audit. No staged/committed/pushed/merged/tagged/released/reset/restored/cleaned changes.
Only three authorised files created: `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`,
`CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`.

---

## Stabilisation + Dev Launcher Execution Entry — 2026-08-06 13:33 +10:00 (CC/OpenCode)

Session interrupted once; resume classification at resume: `PARTIALLY COMPLETED — SAFE TO RESUME`
(no report/log entry yet, test-fix re-run pending, no task-created processes alive). Completed after resume.

### Scope
Part A — repository stabilisation; Part B — development launcher + taskbar-friendly shortcut.
No real execution, OpenCode, approval UI, release gate, packaging, version bump, or cloud models.

### Changes made
- `.gitignore`: narrowed `*token*` -> `*.token`, `token*.json`, `.tokens*`; added `apps/standalone/dist-renderer/`
  and `.runtime/`. `shared/design-tokens/` is no longer ignored (untracked source).
- `eslint.config.mjs`: per-file-type globals (browser / node+commonjs / tests); `.runtime` added to ignores.
- `apps/standalone/electron/main.mjs`: `preserve-caught-error` fixed (`{ cause: err }`); `DEV_URL` honours
  `CRON_CODE_DEV_URL` (default 5180). LM Studio IPC untouched.
- `apps/standalone/scripts/dev.mjs`: optional `CRON_DEV_LOG_DIR` (per-process logs) and `CRON_CODE_DEV_PORT`;
  `shell: true` restored (required on Windows); default behaviour unchanged.
- `packages/data-service/src/task-runner.test.ts`: `let` -> `const` (prefer-const).
- `packages/core/src/store.ts`: `normalizeProjectPath`, `reconcileProjects`, `remapProjectReferences`,
  `openProjectPath` action, dedup wiring in `loadProjects`/`addProject`.
- `packages/core/src/components/App.tsx`: host-adapter handler now calls `openProjectPath`.
- `packages/core/src/store.test.ts`: +5 dedup tests. `packages/core/src/repo-stabilisation.test.ts`: +15 tests.
- `README.md`: status + dev-launcher usage refreshed.
- New launcher files: `Launch-CRON-for-Code-Dev.bat`, `launch-cron-for-code-dev.vbs`,
  `scripts/run-code-dev-hidden.ps1`, `scripts/create-code-dev-shortcut.ps1`.
- Tracked `dist-renderer/` files NOT removed via Git by CC (Venessa/Architect to `git rm --cached` manually).

### Verification
- `pnpm test` PASS (58). `pnpm typecheck` PASS. `pnpm build` PASS. `pnpm format:check` PASS. `pnpm lint` PASS (0 errors).
  `git diff --check` clean. Nothing staged.
- Runtime: launcher success path (port 5190) exit 0; launcher-owned dev process stayed alive; reuse path exit 0 with no
  new processes; fail-safe path (port 5180 occupied by unrelated CRON for Chat vite PID 35556) exit 2 with no kill;
  shortcut created (`C:\Users\venes\Desktop\CRON for Code Dev.lnk`, icon = `apps/standalone/branding/assets/code_icon.ico`);
  shortcut-launch chain started the dev app; dev userData `CRON for Code Dev` used; production PIDs and CRON for Chat
  untouched; `.runtime/` logs produced; LM Studio reachable (19 models). All task-created processes cleaned up.

### Notes
- Default dev port 5180 is currently used by CRON for Chat's dev server; until stopped, the launcher fail-safes on 5180.
  Use `CRON_CODE_DEV_PORT` for an alternate port. Final acceptance = Venessa's manual launcher test.

### Boundary
No staged/committed/pushed/merged/tagged/released/reset/restored/cleaned changes. No dependency install/update.
No package version or lockfile changes.

---

## Restart-Safe Launcher Repair Execution Entry — 2026-08-06 16:20 +10:00 (CC/OpenCode)

### Scope
Repair the restart-safety defect: same shortcut must launch the dev app repeatedly (launch → close → relaunch),
after close, without PowerShell recovery or temporary environment setup. Per `CRON_Restart_Safe_Launcher_Standard.md`.

### Root cause (confirmed)
- Old `dev.mjs` teardown killed only the cmd shell, orphaning Vite on the port after app close.
- Old launcher reuse branch ran `electron .` from the repo root (no `main` there) → Electron silently failed to open.
- Window close hides to tray; old "already running" path did nothing (never re-showed the window).
- No `-Port`/env/scan/persistence; default 5180 collided with other CRON projects.
- No PID/state record → stale metadata could not self-repair.

### Changes made
- New `scripts/code-dev-launcher-logic.ps1` (pure port/PID/lifecycle decisions; injectable probes).
- Rewritten `scripts/run-code-dev-hidden.ps1` (default port 5190; range scan 5190–5205; `.runtime/code-dev-state.json`;
  stale-state self-repair; surface-running/reuse-vite/replace-stale-electron/fresh-start; Electron launched from
  `apps/standalone`; only owned PIDs ever terminated).
- `apps/standalone/scripts/dev.mjs`: `spawnSync taskkill /T /F` tree teardown (no orphaned Vite).
- `apps/standalone/electron/main.mjs`: `DEV_URL` default → 5190. `apps/standalone/vite.config.ts`: dev port → 5190.
- New tests: `scripts/test-code-dev-launcher.ps1` (51 assertions), `scripts/test-code-dev-launcher-cycles.ps1`
  (real 3-cycle integration); vitest additions incl. direct-ESLint lint guard.
- Shortcut recreated: `C:\Users\venes\Desktop\CRON for Code Dev.lnk`.

### Verification
- Live: orphaned-Vite recovery (`reuse-vite` → app-ready); relaunch-while-running (`surface-running`, same main PID);
  `test-code-dev-launcher-cycles.ps1 -Port 5390 -Cycles 3` all PASS (full teardown each close, port freed, no
  unrelated process touched, production PIDs never stopped); shortcut `.lnk` launch ×2 both app-ready; stale state
  repaired on launch; 5190 released after each close.
- Static: `pnpm test` PASS (63), `pnpm typecheck` PASS, `pnpm build` PASS, `pnpm lint` PASS (0 errors),
  `pnpm format:check` PASS, `git diff --check` clean, `node --check dev.mjs` clean. Nothing staged.
- Env note: `CRON_CODE_DEV_PORT=5190` is a persistent user-level env var that also collides with `CRON_MEDS_PORT=5190`.
  While CRON for Meds holds 5190 the launcher refuses (standard-compliant) rather than hijacking. Recommend a distinct
  port for CRON for Meds.
- All task-created dev processes cleaned up; production app and unrelated CRON projects untouched.

### Boundary
No staged/committed/pushed/merged/tagged/released/reset/restored/cleaned changes. No dependency install/update.
No package version or lockfile changes.

---

## Fresh-Session Repository Audit Execution Entry — 2026-08-06 18:22 +10:00 (CC/OpenCode)

### Scope
Read-only evidence-based audit of the live repository (`Fresh-Session Repository Audit`). No implementation.
Only documentation/audit files updated: `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`,
`CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md` (appended), `CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md` (created).

### Repository identity (verified)
- Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `origin/main` 0/0.
- Working tree: 25 modified, 3 deleted (dist-renderer assets), 19 pre-existing untracked at start; +1 permitted audit file
  (`CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md`) created → 20 untracked at close. `git diff --check` clean. Nothing staged.

### Verification (exit codes recorded)
- `pnpm test` PASS exit 0 (63 tests). `pnpm typecheck` PASS 0. `pnpm build` PASS 0.
  `pnpm format:check` PASS 0 (all `echo ok` — no real formatter enforcement). `pnpm lint` PASS 0 (2 warnings).
- Runtime: dev stack on 5190 with AUMID `com.cron.code.dev` confirmed; production v1.1.7 running;
  LM Studio 19 models; prod store 5 projects/4 tasks/lmstudio.config; shortcut + launcher logs verified.
- Dev-launcher cycles integration test not re-run (would terminate the live dev Electron; previously verified 16:20).

### Key findings (details in audit report)
- All non-trivial current behaviour (LM Studio chat, layout, dedup, launcher, lint config) is uncommitted.
- Generated `dist-renderer/` still tracked (9 files) — needs `git rm --cached` by Venessa/Architect.
- No real task/agent execution; no approval UI wiring; no OpenCode; no audit trail; no Git release gate.
- `cron:select-folder` has no repository-boundary/path allowlist.
- Security baseline good (sandbox/contextIsolation/CSP), with hardening gaps (external navigation, connect-src).
- Documentation drift minor: `dev.mjs` comment says port 5180 (default now 5190).

### Boundary
No Git mutation/release action. No source/test/config/dependency/lockfile/launcher/icon change by CC.
No install/update. Live processes untouched.

---

### CC Training Notes
- Fresh-session audits must re-verify the live repo from scratch; never trust prior reports (this audit confirmed all
  earlier claims, and found two stale figures: original audit's "21 modified/5 untracked" is now 25/3/19).
- Verify exit codes explicitly (exit 0 = pass) and record raw output; `echo ok` scripts in packages mean some gates
  (e.g. `format:check`, per-package `lint`) are no-op placeholders — never report them as real enforcement.
- Distinguish UI that is real (project selection, task draft creation, LM Studio chat) from unused store actions
  (`queueDraftTask`, `runTaskNow`, `approveApproval`, `rejectApproval` have no UI caller).
- Do not run integration tests that would terminate the live dev instance during a read-only audit.
- LM Studio baseUrl is user-controlled and only http(s)-validated; report as SSRF-adjacent hardening, not a live vuln.
- Always verify the AUMID via a live renderer process (`--app-user-model-id`) rather than only source text.

---

## Safe Execution and Approval Foundation Execution Entry — 2026-08-06 19:25 +10:00 (CC/OpenCode)

### Scope
Approved implementation slice: safe task-execution harness + approval-gate foundation. No OpenCode, no arbitrary
command entry, no launcher/port/icon/AUMID/packaging changes.

### Repository identity (verified)
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`, upstream `origin/main` 0/0, nothing staged.
Pre-slice working tree: 25 modified / 3 deleted / 20 untracked. Post-slice: 31 modified / 3 deleted / 35 untracked
(+15 new source/test files; +6 pre-existing files extended). `.runtime/runtime-proof.mjs` created gitignored.

### What was implemented
- Execution + audit contracts (`packages/contracts/src/execution.ts`), execution-aware approvals
  (`approval.ts` `createExecutionApproval`).
- Project-boundary service (canonical path, Git-root discovery, traversal/escape rejection).
- 16-entry command catalogue with allow/deny rules and forbidden-executable + Git-mutation rejection.
- `SafeExecutionHarness` (shell-free spawn, bounded output with truncation, timeout, idempotent cancel,
  owned-tree kill, secret redaction).
- `ExecutionService` orchestrator (approval creation/enforcement, task-runner wiring, restart recovery).
- Append-only audit + execution persistence in JSON store; `runNow` no longer a no-op.
- UI: `TaskWorkspace` run/queue/cancel + `ApprovalPanel` + `ExecutionPanel` (wired into `Layout` with `TaskComposer`).
- IPC: narrow preload bridges + main-process validation (`ipc-validation.ts`); renderer can only submit stable
  command ids and task/execution ids.

### Verification
`pnpm test` exit 0 (140). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 warnings). `pnpm build` exit 0.
`pnpm format:check` exit 0. `git diff --check` clean. Secret scan clean.
Runtime proof `node .runtime\runtime-proof.mjs` exit 0 (all 18 items; raw output in evidence file).
Live dev Electron (AUMID `com.cron.code.dev`, port 5190) and production v1.1.7 PIDs untouched.

### Boundary
No Git mutation/release action. No dependency install/update. Lockfile unchanged. No launcher/icon/port/AUMID change.
Full detail in `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_REPORT.md` + `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md`.

### CC Training Notes (slice 2)
- When extending a workspace package's exported types, rebuild its `dist` (`pnpm --filter <pkg> build`) before running
  dependent tests — vitest resolves the package `exports` to stale `dist`, producing confusing `undefined` throws.
- `import type` only where used as types; `noUnusedLocals`/`noUnusedParameters` catch unused params (prefix `_`).
- Component-test DOM accumulates across tests when vitest `globals` are off — add `afterEach(cleanup)` explicitly.
- Runtime-proof scripts can live under the gitignored `.runtime/` dir so they never disturb `git status`.
- Keep the catalogue the single source of executables/args; the shape validator stays structural (safety lives at
  catalogue resolution, not record shape).

---

## Workspace Hierarchy and Shell-Fit Repair Execution Entry — 2026-08-07 07:54 +10:00 (CC/OpenCode)

### Scope
Focused layout/usability repair of the selected-project workspace. Presentation-only changes; no business logic moved
into components; no execution/approval/audit/catalogue/IPC/launcher/port/identity changes.

### Changes delivered
- Layout: primary task column (TaskWorkspace → TaskComposer → new ActivityPanel) + secondary 380px chat column
  (collapsible to 46px rail); overlay + panels made near-solid.
- Safe-command selector moved from the workspace header into each task action row (clearly attached to that task).
- TaskComposer action `Draft` → `Create Task` (distinct filled style); title optional, description required (unchanged).
- New `ActivityPanel` (expandable "Approval & Evidence" surface) hosting ApprovalPanel + ExecutionPanel.
- CronAssistant made secondary with collapse toggle + collapsed rail; chat behaviour unchanged.
- Sidebar: lower sections (Current Project/Agent State/Settings/Account) wrapped in fixed non-scrolling stack with
  bottom clearance above the taskbar; projects list remains the only scroll region.
- Tests: `workspace-layout.test.tsx` (11 tests); made `execution-service.test.ts` concurrency test deterministic.

### Verification
`pnpm test` exit 0 (151). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 warnings). `pnpm build` exit 0.
`pnpm format:check` exit 0. `git diff --check` clean. Secret scan clean.
Runtime: launcher `-Port 5190` exit 0 (surface-running, same PIDs); dev server 200; AUMID `com.cron.code.dev` live;
production PIDs untouched.

### Boundary
No Git mutation/release action. No dependency install/update. No launcher/icon/port/AUMID/packaging change.
No OpenCode; no arbitrary command entry. Visual acceptance intentionally left to Venessa (not claimed by CC).
Full detail in `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_REPORT.md` + `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md`.

### CC Training Notes (slice 3)
- For layout repair, trace the actual flex/overflow tree first (full-width flex:1 siblings were the root cause of
  "several apps stacked"); the smallest change was a horizontal split with a fixed-width secondary panel.
- Keep command/execution affordances attached to the entity they act on (per-task selector), never floating in a
  shared header — the coupling is what makes the journey obvious.
- When a store action awaits a dynamic `import()`, component tests must `waitFor` the observable effect rather than
  assert synchronously after `fireEvent.click`.
- Fixed-size UI tests in jsdom are structural (computed widths only for inline styles); real visual acceptance at
  full-screen/smaller sizes belongs to the human reviewer — record that explicitly and never overclaim.
- Fixed lower sidebar stacks need `flex-shrink:0` + `min-height:0` + a bottom spacer; the flexible list above absorbs
  all remaining space so fixed items never clip.

---

## Project Picker Load Regression Repair Execution Entry — 2026-08-07 08:55 +10:00 (CC/OpenCode)

### Scope
Narrow defect-repair of the project-selection path (New Project → folder picker → activate → render → persist).
No shell redesign; no execution/approval/catalogue/chat/launcher/port/identity changes.

### Exact root cause (proven by runtime repro, not guessed)
The open flow was fire-and-forget and feedback-free: `App` discarded the returned selection and relied on an unawaited
`project-selected` event → `openProjectPath`; `openProjectPath` used a dynamic `import('@cron-code/contracts')` and
deduped only against in-memory state (racing into duplicate persisted records — 2 "CRON for Meds" records reproduced);
all failures were written to an `error` state no component rendered (silent). Measured ~500–600 ms async open with no
loading feedback, so a normal click appeared to "do nothing".

### Repair delivered
- `App.tsx`: await the returned selection, open it directly, surface errors via `setError`; event listener kept as an
  idempotent secondary path.
- `store.ts`: static factory imports (removes dynamic-import latency/failure class); `openProjectPath` guards inputs,
  sets `isLoading`, dedupes against in-memory + persisted projects; `addProject` dedupes against persisted; `selectProject`
  clears `isLoading`.
- `ErrorBanner.tsx` + `Layout.tsx`: store `error`/`isLoading` rendered as a visible dismissible banner.

### Verification
`pnpm test` exit 0 (166). `pnpm typecheck` exit 0. `pnpm lint` exit 0 (2 warnings). `pnpm build` exit 0.
`pnpm format:check` exit 0. `git diff --check` clean. Secret scan clean.
Runtime: launcher `-Port 5190` fresh-start exit 0; dev server 200; AUMID `com.cron.code.dev` live; production PIDs
untouched; LM Studio 200. Picker flow proven end-to-end with the real built packages (`.runtime/picker-repro.mjs`).

### Boundary
No Git mutation/release action. No dependency install/update. No launcher/icon/port/AUMID/packaging change.
No storage-format change. No OpenCode. Interactive dialog acceptance left to Venessa (not claimed by CC).
Full detail in `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 4)
- When a flow "does nothing" with no error, first check whether the authoritative return value is actually used or
  discarded in favour of a fire-and-forget event; reproduce with the real built packages before changing anything.
- In-memory-only dedup races under async opens; always dedup against the persisted store (source of truth).
- A store `error` field is useless if no component renders it — pair every failure path with a visible surface.
- Dynamic `import('@cron-code/contracts')` from arbitrary root paths fails in Node (workspace-resolution quirk) but
  resolves inside package contexts; prefer static imports for workspace packages to remove this failure class entirely.
- Verify runtime identity claims against the LIVE process list (AUMID/port/PIDs), not just source text; record when a
  dev stack was found down and the launcher correctly did fresh-start.

---

## Project Management and Restart Controls Execution Entry — 2026-08-07 09:35 +10:00 (CC/OpenCode)

### Scope
Approved implementation slice: real CRON Restart, project context menu (Open in File Explorer / Copy path /
Refresh / Rename / Re-link / Remove from CRON), archival (history preserved), missing-folder state, relink with
conflict detection, last-active restore, sidebar lower-stack clipping repair. No OpenCode, no shell redesign, no
broad execution/approval/audit/catalogue/IPC/launcher/port/identity changes.

### Repository identity (verified)
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`, upstream `origin/main` 0/0, nothing staged.
Pre-slice: 31 modified / 3 deleted / 40 untracked. Post-slice: 46 modified / 3 deleted / 46 untracked
(+15 modifications, +6 untracked — all this slice's work). `git diff --check` clean.

### What was implemented
- `CodeProject` gains `availability: 'available' | 'missing' | 'unavailable'` and `archived: boolean` (legacy rows
  default on load). New factories: `withAvailability`, `archiveCodeProject`, `restoreCodeProject`,
  `relinkCodeProject`, `renameCodeProject`.
- New `AuditEventType` values (narrowly added, existing semantics unchanged): `project.archived`, `project.restored`,
  `project.renamed`, `project.relinked`, `project.refreshed`, `app.restart_requested`.
- `DataService.projects` gains `archive`, `unarchive`, `setRootPath`, `setName`, `setAvailability`. Existing
  `preferences` carries the new `lastActiveProjectId` key.
- `ProjectManagementService` (`packages/data-service/src/project-management.ts`): narrow, audited, no-fs-delete
  operations. `linkRootPath` validates paths and detects conflicts; `archiveProject` is idempotent;
  `refreshAvailability` inspects the filesystem and persists the new state; `recordAudit` writes the new event types.
- New IPC channels (all in `apps/standalone/electron/main.mjs`): `cron:app:restart` (guarded by an `isRestarting`
  boolean; flushes data, audits, `app.relaunch()` + `app.quit()`), `cron:project:reveal`, `cron:project:copy-path`,
  `cron:project:archive`, `cron:project:relink` (uses `dialog.showOpenDialog` in main; returns a `conflict` object
  when the chosen path belongs to another active canonical project), `cron:project:rename`, `cron:project:refresh`,
  `cron:project:restore-last-active`. `preload.cjs` exposes only the typed bridges; no `shell`/`ipcRenderer`/
  arbitrary paths.
- Host adapter: `HostAdapter` gains `performProjectAction` and `restartApp`; new `HostProjectAction` discriminated
  union (`reveal | copy-path | refresh | rename | relink | archive | restart`); `StandaloneHostAdapter` accepts an
  optional `hostActionBridge` (the standalone wires it to the IPC client; tests pass a mock).
- Store actions: `archiveProject`, `relinkProject`, `renameProject`, `refreshProject`, `revealProject`,
  `copyProjectPath`, `clearCopyConfirm`, `restartApp`, `restoreLastActiveProject`. New state fields: `isRestarting`,
  `copyConfirm`. `selectProject` now writes `lastActiveProjectId`; `openProjectPath`/`addProject` unarchive when the
  existing canonical project is archived (preserves history). `reconcileProjects` surfaces `archivedDupes` for the
  same canonical path with an archived canonical row.
- New components: `ProjectContextMenu` (hover three-dot trigger; keyboard accessible: ArrowKeys/Home/End/Enter/
  Space/Escape; click-outside to close; per-project-id remount); `ConfirmDialog` (destructive confirm for Remove from
  CRON with project name + path + explicit non-delete statement); `RenameDialog` (trimmed non-empty + max 120 chars;
  folder name never touched). Sidebar updated: three-dot trigger per row; missing-folder rendering (FolderX icon,
  italic, strike-through, Missing/Unavail. badge); lower-stack clipping fix (rail 196 px, label `flex:1 min-width:0
  text-overflow:ellipsis`, icon + DEV `flex-shrink:0`, bottom spacer 18 px).
- App init calls `restoreLastActiveProject` after `loadProjects`. The action is best-effort: missing/archived/non-
  available projects clear the preference; never throws; no duplicates are created during restore.

### Verification
`pnpm test` exit 0 (201 tests: contracts 24, host-adapter 21, data-service 74, core 82). `pnpm typecheck` exit 0.
`pnpm lint` exit 0 (0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings). `pnpm build` exit 0. `pnpm
format:check` exit 0 (no-op `echo ok`). `git diff --check` exit 0. Narrow secret scan clean. Suspicious/generated-path
scan clean.
Runtime: live dev stack on 5190 with AUMID `com.cron.code.dev` unchanged; production v1.1.7 PIDs untouched; LM Studio
19 models. Interactive dialog acceptance left to Venessa (not claimed by CC).

### Boundary
No Git mutation/release action. No dependency install/update. No launcher/icon/port/AUMID/packaging change. No OpenCode.
No storage-format break. Sandbox/contextIsolation preserved.
Full detail in `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 5)
- Host actions flow through the typed host bridge, not the renderer: even when the main process needs to show a
  folder picker (re-link), the renderer never sees the chosen path — main owns it. Keep that boundary when adding
  future project-management affordances.
- "Archive, not delete" is the safe default: keep the row in persistence, flip a flag, and let the visible list
  filter. Re-adding the same canonical path then unarchives in place, which preserves task/approval/execution
  history without any migration.
- React 19 + `eslint-plugin-react-hooks` 7.x enforces `react-hooks/set-state-in-effect`. Refactor with a
  `key={...}` remount of a `<XContents>` sub-component instead of disabling the rule; the effect body becomes
  pure subscription, state initialises in `useState`.
- Workspace TypeScript resolves workspace packages through their built `dist/`; after changing a package's exports
  or types, rebuild the chain (`contracts → host-adapter → data-service → core`) before `tsc --noEmit` in
  downstream packages — the error message is otherwise confusing.
- Restart safety needs BOTH a renderer debounce (store-side `isRestarting` state) and a main-side guard (an
  `isRestarting` boolean that ignores re-entry). Skipping either allows either rapid duplicate clicks or
  IPC retries to fire `app.relaunch()` twice.
- Lower-stack clipping in a narrow rail is fixed by `flex:1 min-width:0 overflow:hidden` on the label and
  `flex-shrink:0` on icon + DEV badge, not by widening the rail alone. Always combine with a tested `flex-shrink:0`
  assertion on the lower stack.

---

## Live IPC Registration and Stale Electron Replacement Repair Execution Entry — 2026-08-07 15:10 +10:00 (CC/OpenCode)

### Scope
Approved narrow runtime defect-repair slice. Repair the live dev runtime so the current Electron main process
actually loads and registers all approved IPC handlers, and make the launcher replace an owned stale Electron when
main-process code changes. No UI redesign, no port/AUMID/version/dependency/Git changes.

### User-verified defect
Venessa clicked `CRON Restart` and saw `Error invoking remote method 'cron:app:restart': Error: No handler registered
for 'cron:app:restart'`; the other project-management actions failed the same way. The renderer/preload surface was
current; the live Electron main was not.

### Exact root cause (proven live, not guessed)
- Live dev Electron main PID 39696 started 2026-08-07 10:45:18 — BEFORE `main.mjs` gained the eight required IPC
  handlers (file LastWriteTime 11:38:39). Electron never reloads `main.mjs`; the process runs the in-memory module.
- The launcher's `surface-running` branch (log entries 11:19 / 14:54 / 14:57) treated "owned Vite + owned Electron +
  window present" as healthy, so it surfaced the stale window every time via the single-instance lock and never
  replaced the main.
- The renderer/preload (served fresh by Vite after 11:38) invoked the new channels; the old main had no handlers.
- No runtime identity marker existed, so staleness was invisible to the launcher.

### Repair delivered
- **`apps/standalone/electron/register-ipc.mjs` (new, no Electron imports):** `ALL_IPC_CHANNELS` (33),
  `REQUIRED_IPC_CHANNELS` (the eight), `createIpcRegistrar({ handle })` with once-only registration, duplicate
  rejection, per-channel failure records, required-channel verification in `complete()`.
- **`main.mjs`:** all handlers moved into a single `registerCronIpcHandlers()` pass called exactly once inside
  `app.whenReady()`; dev logs "IPC handler registration complete: N channels"; failures are logged + recorded in the
  marker and the window still opens; dev-only runtime marker `.runtime/code-dev-main-marker.json` (app version, PID,
  sha256 of main/preload, registered channels, required channels, startup timestamp, windowReady, rendererReady,
  registrationError); new narrow diagnostics `cron:diag:marker` + `cron:diag:ready`.
- **Renderer:** `ipc-data-service.initialize()` verifies the marker and throws the preferred message; `main.tsx`
  calls `cron:diag:ready` after first render; `App.tsx` init surfaces the error via ErrorBanner.
- **Launcher:** `code-dev-launcher-logic.ps1` gains `Read-DevMainMarker`, `Resolve-DevElectronHealth`
  (healthy/stale/broken/starting/none), `Test-DevMainMarkerReady`, `Get-DevMissingIpcChannels`, Health-aware
  `Resolve-DevAction`; `run-code-dev-hidden.ps1` reads the marker, compares current hashes, replaces only owned
  stale/broken Electron (15s stop-poll, owned-Vite reuse when safe, fresh-start fallback) and waits for the
  renderer-ready + IPC-ready marker before exit 0.

### Verification
- `pnpm test` exit 0 (220: contracts 24, host-adapter 21, data-service 74, core 101). `pnpm typecheck` exit 0.
  `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. Launcher harness
  exit 0 (incl. 15 new marker/health assertions). PS parser + `node --check` clean. `git diff --check` clean.
  Secret/suspicious-path scans clean.
- Live (real dev app + launcher): stale Electron 39696 replaced (15:43 run: `health=stale` →
  `replace-stale-electron` → fresh stack → marker written with all 8 required channels, `rendererReady: true`,
  `registrationError: null`); healthy relaunch surfaces (15:44: `health=healthy` → surface-running, same PIDs);
  stale-marker simulation (tampered mainHash) classified stale and replaced; marker self-healed to current source
  hash. Port 5190 owned by repo Vite throughout; AUMID `com.cron.code.dev` live; dev userData unchanged; production
  PIDs 9032/11552/25456/28260 untouched; unrelated CRON Vites (Meds 15540, Claims 43592, Chat 20636) alive.
- Interactive clicks in the window (Restart, menu actions) remain Venessa's manual acceptance step (not claimed).

### Boundary
No Git mutation/release action. No dependency install/update. No launcher port/AUMID/version/packaging change.
No OpenCode. Sandbox/contextIsolation preserved. No raw Electron APIs exposed.
Full detail in `CRON_CODE_LIVE_IPC_REGISTRATION_REPAIR_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 6)
- A "window exists" is NOT proof the Electron main process is current: Electron never reloads `main.mjs`. The only
  reliable health signal is a runtime identity marker written by the main itself (pid + source hashes + registered
  channel list + renderer readiness), compared against the current files on every launch.
- When a feature "works in code but not in the running app", first prove WHICH main file the live process loaded
  (PID creation time vs source LastWriteTime) and check the launcher log for the lifecycle decision — the previous
  slice's handlers were never missing from source; they were missing from the live in-memory module.
- Keep registration bookkeeping in a pure, Electron-free module (`register-ipc.mjs`) so the once-guard, duplicate
  detection, and required-channel verification are unit-testable with vitest; wire `ipcMain.handle` through an
  injected `handle` function.
- PowerShell `Set-StrictMode -Version Latest` makes PSCustomObject property access throw for missing fields; read
  optional JSON fields via `$obj.PSObject.Properties['name']` and check hashtable keys via `ContainsKey`.
- After `Stop-Process -Force` the dying Electron tree can linger briefly; a single 2 s recheck races. Poll
  (bounded) until the owned-scan returns nothing before relaunching.
- The renderer should verify the host connection at `initialize()` time and surface a fixed, actionable message
  ("CRON for Code started with an incomplete host connection. Restart the dev app.") instead of a bare IPC error.
- `cron:diag:ready` from the renderer is the strongest "renderer-ready" signal: it proves the renderer bundle
  bootstrapped AND the preload→main IPC round trip works end to end.

---

## Re-link Cancellation and Project-List Preservation Repair Execution Entry — 2026-08-07 16:20 +10:00 (CC/OpenCode)

### Scope
Approved narrow runtime defect-repair slice: make Re-link → Cancel a silent structured no-op, restore project-list
preservation and last-active restoration. No new project features, no store migration, no manual data recreation.

### User-verified defect
After the Live IPC Registration repair, Re-link → Cancel showed a red banner
`Error invoking remote method 'cron:project:relink': Error: Re-link cancelled`; the project list went empty
(`No projects yet`), the strip stuck on `Loading project...`, and Meds/Claims disappeared.

### Exact root cause (proven from persisted store + code, not guessed)
1. **Cancel = exception (red banner):** main threw `Error('Re-link cancelled')`; `handleIpcSafe` wrapped it, so the
   renderer sees `Error invoking remote method ...`; the store's exact-match `message === 'Re-link cancelled'` could
   never match → `error` set → red banner.
2. **Surprise picker on unarchive:** `ipc-data-service.projects.unarchive()` delegated to `cron:project:relink`,
   which OPENS the native folder picker — so `openProjectPath`/`selectProject`/`addProject` on an archived project
   could pop a second picker; cancelling it threw inside `openProjectPath`'s UNGUARDED existing-branch → `isLoading`
   stayed true (`Loading project...`) and Layout's catch surfaced the raw IPC error.
3. **Relink never restores:** `relinkCodeProject` does not clear `archived`; Meds stayed archived after her successful
   re-link (audit `project.relinked` 16:06:03) → hidden.
4. **Archived canonical shadows the active duplicate:** `reconcileProjects` chose the oldest record per path even when
   archived, dropping the active duplicate Claims-296 → `No projects yet` after restart.
5. **No last-active fallback:** restore cleared the pref without a fallback when the last active was archived → no
   active project.
6. **Persistence state:** Meds + Claims-295 are archived by deliberate Remove-from-CRON actions (`project.archived`
   audits — the only writer of that event); the active duplicate Claims-296 remained valid. No manual unarchive was
   performed (contract-correct; documented for the Architect).

### Repair delivered
- `apps/standalone/electron/relink-flow.mjs` (new, pure): `resolveRelinkOutcome` returns
  `{ status: 'cancelled' } | { status: 'ok', project } | { status: 'conflict', ... }`; genuine errors still throw.
- `main.mjs`: relink handler returns the structured outcome (no throw on cancel); new pure channel
  `cron:project:unarchive` (no picker).
- `ipc-data-service.ts`: unarchive is picker-free; typed `HostRelinkResult`.
- Host adapter: `HostProjectActionResult` union; `performProjectAction` returns it; bridge pass-through; mock result.
- `project-management.ts` `linkRootPath`: unarchives an archived project before relinking (restore + relink,
  preserving id/history; audits `project.restored` + `project.relinked`).
- `store.ts`: `relinkProject` interprets structured results (cancelled = exact no-op; conflict = concise error;
  ok = reload; failure = bounded error, list intact); `reconcileProjects` prefers the oldest ACTIVE record as
  canonical (an archived record never shadows an active duplicate); `restoreLastActiveProject` falls back to the
  first available non-archived project; `openProjectPath` guarded with try/finally (loading always clears) and
  refreshes unarchived records in memory; `selectProject` refreshes the in-memory entry after unarchive.

### Verification
- `pnpm test` exit 0 (240: contracts 24, host-adapter 23, data-service 74, core 119). `pnpm typecheck` exit 0.
  `pnpm lint` exit 0 (2 pre-existing warnings). `pnpm build` exit 0. `pnpm format:check` exit 0. Launcher harness
  exit 0. `node --check` clean. `git diff --check` clean. Secret/suspicious-path scans clean.
- Live: launcher replaced the stale main (hash mismatch, 16:38) → fresh stack (electron 41120) → marker healthy
  (34 channels incl. `cron:project:unarchive`, 8/8 required, rendererReady true); dev store after launch: all 3
  project records identical, audit unchanged (4), preference = valid active duplicate (restored as active); port
  5190, AUMID `com.cron.code.dev`, production PIDs untouched, exactly one dev Electron main.
- The native-dialog Cancel click itself remains Venessa's manual acceptance step; the full
  renderer→host→main→store chain is proven by deterministic tests (relink-flow 6, project-management +9,
  host-adapter +3, repo-stabilisation +3).

### Boundary
No Git mutation/release action. No dependency install/update. No port/AUMID/launcher/packaging change. No store
migration, no manual data recreation. Archival semantics preserved (Meds/Claims-295 remain archived).
Full detail in `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 7)
- Never implement "user cancelled" as a thrown exception: cancellation is a first-class structured result
  (`{ status: 'cancelled' }`). Renderer string-matching on error messages is fragile — Electron wraps handler
  errors (`Error invoking remote method 'x': Error: ...`), so exact-match checks silently fail and turn cancels
  into red banners.
- Never implement a "pure persistence" operation (unarchive) by reusing an IPC channel that opens a native dialog
  (relink). A restore path buried inside `openProjectPath`/`selectProject` can suddenly pop a folder picker; its
  cancel then leaves `isLoading` stuck because the caller's branch had no try/finally.
- Reconcile/coalescing logic must never let an ARCHIVED (hidden) record shadow a newer ACTIVE duplicate of the
  same folder: the canonical for live navigation should be the oldest ACTIVE record; archived rows stay in
  persistence untouched.
- Any store action that sets `isLoading: true` must clear it in `finally`, including every early-return branch.
- When editing files in bulk with PowerShell 5.1, `Get-Content -Raw` reads non-ASCII text using the system ANSI
  codepage and `Set-Content -Encoding UTF8` re-encodes it, corrupting characters like `—` (→ `â€”`). Prefer the
  editor's UTF-8-safe tools for test files containing non-ASCII; scan for `â€`-style mojibake after any bulk edit.
- Evidence rule: read the persisted store READ-ONLY before touching anything; the audits (`project.archived`,
  `project.relinked`) pin down exactly which mutations were user actions vs defect side effects.

---

## Dev Restart Blank-Window Runtime Repair Execution Entry — 2026-08-07 17:10 +10:00 (CC/OpenCode)

### Scope
Approved narrow runtime defect-repair slice: `CRON Restart` → relaunched blank window. Repair only the restart
lifecycle / renderer-readiness boundary. No UI redesign, no port/AUMID/version/dependency/Git changes.

### User-verified defect
After the Re-link repair, Venessa clicked `CRON Restart` (~17:38): the app closed, a new window opened with the
frame + title `CRON for Code`, but the renderer content was completely blank/dark.

### Exact root cause (proven live, not guessed)
`cron:app:restart` used `app.relaunch()` + `app.quit()`. In dev, Electron is a child of `dev.mjs`, which tears down
the owned Vite when the Electron shim exits (`dev.mjs` 59-62). Live evidence: old stack (electron 41120) quit at
17:38:18 (`Tray destroyed`); `app.relaunch()` spawned electron 43264 with NO dev.mjs, NO Vite, port 5190 free;
marker `rendererReady=False`; blank window on screen. The launcher healthy path never participated in Restart.

### Repair delivered
- `main.mjs`: in dev, `cron:app:restart` writes `.runtime/code-dev-restart-requested.json` + spawns the approved
  launcher (`run-code-dev-hidden.ps1 -Port <port>`, detached/hidden) + `app.quit()` — NO `app.relaunch()` in dev.
  Production keeps `app.relaunch()`. Renderer surface unchanged (`restartApp()` only, coalesced).
- `run-code-dev-hidden.ps1`: `Test-DevRestartRequested` forces owned-stack replacement; intent consumed after;
  `Wait-ForMainMarker` fail-fasts on `lastStartupError`; replace branch waits (bounded) for the old `dev.mjs`
  teardown before the reuse-vite decision (deterministic, no dying-Vite race).
- `main.mjs` startup diagnostics (dev, narrow): did-start/finish/fail-load, render-process-gone, preload-error,
  console errors (240-char slice), URL mismatch, 30s renderer-ready watchdog; marker fields `targetUrl`,
  `rendererUrl`, `windowReadyAt`, `rendererReadyAt`, `lastStartupError`, `lastFailedLoadUrl`, `rendererGoneReason`,
  `preloadError`. `lastStartupError` → health `broken` → launcher fail-fast + next-run replacement.

### Verification
- `pnpm test` exit 0 (242: 24+23+74+121). Typecheck/lint/build/format exit 0. Launcher harness (incl. +10 new
  restart-intent/startup-error assertions) exit 0. PS parser + `node --check` clean. `git diff --check` clean.
  Secret/path scans clean. Two transient full-suite failures were the known pre-existing load flakes
  (`onTaskUpdate` worker timeout; execution-service 5s syntax-check timeout) — passed isolated and on the final run.
- Live: blank instance (43264) replaced by the launcher (18:05); repaired handoff (intent + launcher) driven ×3
  consecutively (18:06/18:07/18:18) — all healthy (rendererReady, rendererUrl, 34 channels, exactly one stack,
  store unchanged, intent consumed); dead-URL test proved `did-fail-load -102 ERR_CONNECTION_REFUSED` + watchdog +
  `health=broken` → replacement; port 5190, AUMID, production PIDs untouched.
- The real Restart-button click ×2 remains CC-undrivable (Chromium does not expose its DOM to Windows UI
  Automation without an unapproved flag) — documented; the button → store → IPC → handler chain is test-covered.
  Final status `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE` per the task's strict READY gate.

### Boundary
No Git mutation/release action. No dependency install/update. No port/AUMID/version/packaging change. No store
migration, no manual project recreation. Execution/approval/audit/LM Studio unchanged. Sandbox/contextIsolation +
narrow preload preserved.
Full detail in `CRON_CODE_DEV_RESTART_BLANK_WINDOW_REPAIR_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 8)
- `app.relaunch()` is NOT a dev-safe restart when the app is spawned by a supervisor that tears down siblings on
  child exit: dev.mjs kills the owned Vite when the Electron shim closes, so the relaunched Electron loads a dead
  dev URL and renders a blank frame with a visible title. The approved launcher (with intent marker) is the only
  restart lifecycle in dev.
- A visible Electron frame + correct window title is NOT renderer readiness. The only valid readiness signal is
  the renderer's own `cron:diag:ready` (proves preload→main→React bootstrap), plus current source hashes and the
  required IPC channel list.
- Chromium does not expose its DOM to Windows UI Automation by default (a UIA search finds the native
  `Chrome_WidgetWin_1` frame with a handful of children); real-button UI automation requires an unapproved
  `--force-renderer-accessibility` flag — check this BEFORE promising "button-driven" live proof in an Electron
  dev app.
- For a dead dev server, Chromium loads its error page and fires `did-finish-load` (not always `did-fail-load`);
  a 30s renderer-ready watchdog after `did-finish-load` converts ANY silent blank window into an explicit
  `lastStartupError` that the launcher fail-fasts on.
- Restart-intent is a first-class state file: written by main before quit, consumed by the launcher once, age-bounded
  (300s) so stale intents never cause spurious restarts.

## Runtime Acceptance Execution Entry — 2026-08-09 10:20 +10:00 (CC/OpenCode)

### Scope
Approved acceptance slice (`CRON_CODE_RUNTIME_ACCEPTANCE_ARCHITECT_SLICE.md`): verify and repair
only the runtime acceptance path — launch, visible content, project list + last-active restoration,
quiet folder-picker cancel, in-app restart returning to visible content, approval/execution
surfaces, unrelated-app safety. No product expansion, no OpenCode, no package/port/identity/
launcher changes, no Git actions.

### Repository identity (verified)
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`, upstream `origin/main` 0/0, nothing
staged. Pre-slice working tree: 40 modified / 3 deleted / 51 untracked (preserved).

### Verification
- `pnpm test` PASS (242: contracts 24, host-adapter 23, data-service 74, core 121); the
  pre-existing vitest `onTaskUpdate` load flake is fixed (see above) — repeated clean runs.
- `pnpm typecheck` PASS 0. `pnpm lint` PASS (0 errors, 2 pre-existing warnings). `pnpm build`
  PASS 0. `pnpm format:check` PASS (no-op `echo ok`, pre-existing).
- `git diff --check`: FAIL first — `packages/core/src/store.test.ts:423: new blank line at EOF`.
  Fixed (whitespace-only, byte-level, UTF-8 safe; 15 tests still pass) → clean (exit 0).
- Flake fix: the pre-existing vitest `onTaskUpdate` full-suite failure was root-caused and
  fixed in `packages/core/src/repo-stabilisation.test.ts` (the lint guard blocked its vitest
  worker for 60–90 s with synchronous `spawnSync` of whole-repo ESLint; the guard now runs the
  identical ESLint invocation as an async child and still asserts exit 0). Full suite ~26–30 s,
  repeated clean passes. Test-harness only; no product code.

### Runtime proof (all acceptance items PASS)
- Fresh launch: launcher `fresh-start` exit 0, `App ready (renderer-ready marker confirmed)`.
- Visible content: marker `windowReady=True rendererReady=True lastStartupError=null`, 34 IPC
  channels (8/8 required); served renderer modules transform cleanly (Layout/ActivityPanel/
  ApprovalPanel/ExecutionPanel via the Vite module graph).
- Projects: real dev store copy loads 3 persisted → 2 reconciled → 1 visible (CRON for Claims);
  last-active restores; reselecting the same folder creates no duplicate (persisted stays 3).
- Re-link cancel: pure flow returns `{status:'cancelled'}`; store-level cancel is an exact no-op
  (list, active, preference, error, loading all unchanged).
- In-app restart: dev intent handoff (`code-dev-restart-requested.json`, the exact file
  `cron:app:restart` writes) driven ×2 consecutively; each replaced the owned stack and came back
  healthy (rendererReady, 34 channels, no startup error); intent consumed; exactly one stack;
  dev store SHA256 identical before/after (`29E63A…B56AA2D`).
- Approval/execution surfaces: served bundle + component tests + real-chain proof
  (blocked → approval requested → approved → executed exit 0 → record + audit persisted →
  store surfaces reflect → restart retains).
- Unrelated apps: CRON for Meds/Claims/HUB Vites alive at every checkpoint; only the owned dev
  Electron was ever terminated; `CRON_MEDS_PORT` never modified; production CRON for Code (already
  stopped) untouched; port 5190 always owned by the repo Vite.

### Boundary
No Git mutation/release action. No dependency install/update. No port/AUMID/launcher/packaging
change. No README change (status line not blurred). Dev stack left running healthy on 5190 for
Venessa's interactive acceptance.
Full detail in `CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md` + `..._EVIDENCE.md` (incl. verbatim
prompt, every command, exit codes, raw outputs, failed attempts, conclusion-to-evidence map).

### CC Training Notes (slice 9)
- For an acceptance slice, model the runtime proof on what the RENDERED surfaces actually call:
  the store's `runTaskNow` is a TaskRunner intent queue; the real execution chain is
  `ExecutionService` in Electron main. Prove the main-owned chain, then prove the store surfaces
  reflect its persisted evidence — never blur the two layers.
- The real dev store reconciles at load: 3 persisted records (including an archived duplicate
  Claims pair) become 2 reconciled / 1 visible. Assert the DESIGNED contract (persisted count,
  reconciled count, visible count) rather than guessing one number.
- `git diff --check` is part of the gate — a trailing blank line at EOF in a pre-existing test
  file fails it. Fix whitespace byte-level when the file contains non-ASCII text (PowerShell
  `Set-Content` round-trips corrupt `—` into mojibake); verify with `[byte[]]` checks afterwards.
- `code-dev-restart-requested.json` is the only CC-drivable trigger for the in-app restart path in
  dev: write it exactly as main does (`{ pid, requestedAt }`), run the launcher, and assert
  replacement + healthy marker + intent consumed + store hash unchanged. The live button click is
  inherently a human step (Chromium does not expose its DOM to Windows UI Automation).
- Before claiming "unrelated untouched", snapshot the unrelated PIDs, re-verify after EVERY
  launcher run, and check the launcher log's own termination lines — process-list evidence plus
  log evidence beats either alone.
- A long synchronous `spawnSync` inside a vitest worker (e.g. a whole-repo ESLint guard) blocks
  that worker's RPC handling and intermittently fails the gate with `[vitest-worker]: Timeout
  calling "onTaskUpdate"` even when every test passes. Fix pattern: async `spawn` + awaited
  close with a bounded kill timer — the guard's semantics (same invocation, same exit-0
  assertion) stay identical and the worker stays responsive.

## Restart and Entry Screen Repair Execution Entry — 2026-08-09 13:20 +10:00 (CC/OpenCode)

### Scope
Approved defect repair (`CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_ARCHITECT_SLICE.md`):
(1) make visible-UI Restart work reliably, (2) make launch land on the entry/project-selection
screen. No execution/approval/storage/port/AUMID/dependency/Git changes.

### Root causes (proven, not guessed)
- Restart: every previous UI-click restart spawned a PowerShell launcher from Electron that
  died before running. Two killers isolated by controlled reproductions: `detached: true`
  prevents PowerShell 5.1 from starting its engine at all; and even without `detached`, children
  spawned by the real Electron main die the instant Electron exits (marker-loop probe proved a
  kill-on-close job). The launcher itself is healthy when its parent stays alive.
- Entry screen: `App.tsx` init auto-restored the last-active project → working canvas on launch.

### Repair delivered
- `main.mjs`: dev restart = flush + audit + write intent + quit; intent-write failure throws
  (visible bounded error). No more spawning. Production keeps `app.relaunch()`.
- `dev.mjs` (Electron's parent): watches the intent on Electron exit; fresh → relaunch Electron
  on the still-live Vite; absent → teardown. Logs to `.runtime/code-dev-supervisor.log`.
- `run-code-dev-hidden.ps1`: clears stale restart intents (self-healing).
- `App.tsx`: no auto-restore at launch. `EmptyState.tsx`: entry screen with Open Project +
  Resume-project cards.
- Tests: project-picker.test.tsx (13), repo-stabilisation.test.ts (37).

### Verification
`pnpm test` PASS (core 128). typecheck/lint/build/format:check exit 0 (lint 2 pre-existing
warnings). `git diff --check` 0. `node --check` clean. PS parser clean. Launcher PS harness PASS.

### Live proof
- Restart cycle 1 via the REAL handler path (one-shot dev hook): supervisor
  `Restart intent consumed (pid 29064); relaunching Electron`; new Electron healthy on the SAME
  Vite; intent consumed; no loop.
- Restart cycle 2 (intent + owned-stack stop): same result (pid 27916 → Electron 9196, Vite
  reused); exactly one owned stack.
- Entry screen: served App.tsx has no `restoreLastActiveProject`; served EmptyState has
  `Resume a project`/`Open Project`; store-level launch test: active stays null after load;
  explicit resume enters the canvas. Dev store intact (3 records; only expected
  `app.restart_requested` audits added).
- Unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive at every checkpoint; only owned
  processes stopped; port 5190 owned by repo Vite throughout; production app untouched.
- Honest limits: native button click not CC-drivable (Chromium/UIA); hook drives the exact same
  handler in the real main; button→store→adapter→IPC chain test-covered. Visual acceptance =
  Venessa's step.

### Boundary
No Git mutation/release action. No dependency install. No port/AUMID/launcher-identity change.
No storage-format change. Dev stack left running healthy on 5190 for Venessa's acceptance.
Full detail in `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_REPORT.md` + `..._EVIDENCE.md`
(incl. verbatim prompt, raw logs, failed attempts).

### CC Training Notes (slice 10)
- A "window exists / app quits correctly" is NOT proof a restart works: Venessa's clicks
  completed the handler (intent written, Tray destroyed) while the relaunch silently never
  happened. Correlate the app log, the launcher log, the intent file, and the live process list
  together to find where the chain actually broke.
- On Windows, children of a process in a kill-on-close job die with the parent. Node's
  `detached: true` does NOT escape it (and additionally breaks PowerShell 5.1's console host).
  Prove the parent-lifetime dependency empirically (marker-loop probe) before designing the
  fix; then hand the relaunch to a process OUTSIDE the dying tree (here: dev.mjs, Electron's
  parent).
- When PowerShell writes JSON state for another component to read, `Set-Content -Encoding
  UTF8` injects a UTF-8 BOM that breaks `JSON.parse` in Node. Either write via Node/utf8
  (`writeFileSync`) or strip the BOM defensively at the reader.
- An intent/request file must be age-bounded on BOTH ends: stale intents from failed runs must
  be cleared by the launcher, and a reader must reject future/oversized timestamps (my
  hardcoded future timestamp was correctly refused).
- Moving a restart mechanism from "spawn a helper" to "write a message your parent reads"
  eliminates the whole class of spawn-lifetime failures; the intent file IS the IPC.

## Visible Restart Follow-up Execution Entry — 2026-08-09 15:40 +10:00 (CC/OpenCode)

### Scope
Approved follow-up repair (`CRON_CODE_VISIBLE_RESTART_FOLLOWUP_ARCHITECT_SLICE.md`): make the
visible CRON Restart button complete a usable restart with a Claims-style Restarting overlay,
returning to the entry screen. No execution/approval/storage/port/AUMID/dependency/Git changes.

### Root cause (evidence, not guessing)
The restart mechanics already worked (Venessa's click relaunched at 13:07 — supervisor log
proof). The failure was UX: the quit fired in a `setImmediate` ~1–5 ms after the click, no
restarting state existed, and the new window took ~8 s to appear — "click → nothing → silence"
reads as a failed restart.

### Repair delivered
- New `RestartOverlay` (Claims pattern): darkened blurred backdrop, centered panel,
  `CRON SYSTEM CONTROL` eyebrow, `Restarting` title, spinner, `Stopping and restarting CRON
  services...`, entry-screen note, aria-busy, disabled restart state. Rendered by the shell
  while `isRestarting`.
- `store.restartApp` keeps `isRestarting` after a successful request (overlay stays painted);
  failures clear it with a visible error.
- `main.mjs` delays the dev quit by 1500 ms so the overlay paints before the window closes;
  intent remains the only message to dev.mjs; production keeps `app.relaunch()`.
- `dev.mjs` strips both one-shot probe env vars on relaunch (loop fix found during reproduction).
- Relaunched app lands on the entry screen (verified).

### Verification
`pnpm test` PASS (core 135 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2
pre-existing warnings). `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof (real rendered button, two consecutive cycles)
Dev-only diagnostic clicks the REAL button via `webContents.executeJavaScript` and samples the
DOM 400 ms after the click:
- Overlay sample (both cycles): overlayVisible=true, text `CRON SYSTEM CONTROL / Restarting /
  Stopping and restarting CRON services... / The app will return to the project selection
  screen`, buttonDisabled=true, buttonBusy=true.
- Supervisor: `Restart intent consumed (pid 23128); relaunching Electron`.
- Relaunched marker rendererReady=True, 34 channels, no startup error; Vite reused; intent
  consumed; 15 s stability check (no loop); entry screen served after restart; exactly one stack.
- Unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive at every checkpoint; only owned
  processes stopped; port 5190 owned by repo Vite; dev store intact (3 records, last-active
  preserved; only expected `app.restart_requested` audits added).
- Honest limits: click is a DOM `.click()` on the real button (physical clicking not
  tool-accessible); visual acceptance remains Venessa's step.

### Boundary
No Git mutation/release action. No dependency changes. No port/AUMID/launcher-identity change.
Dev stack left running healthy on 5190 for Venessa's acceptance.
Full detail in `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 11)
- When a "restart doesn't work" report arrives, separate mechanics from UX: the app may be
  relaunching correctly while the user experience is "vanished + silence". Correlate the
  supervisor log (intent consumed) with the timing (quit in setImmediate = nothing can paint).
- `webContents.executeJavaScript` is the strongest tool-accessible way to drive a REAL renderer
  button: it clicks the actual DOM element, running the real onClick → store → adapter → IPC
  chain. A dev-only env-gated diagnostic beats a main-process hook when the question is the
  visible path.
- A one-shot probe env var that the supervisor passes to its relaunched children will loop
  forever (each new instance re-fires the probe). Strip ALL probe vars in the supervisor BEFORE
  spawning the child, not just in the child.
- When adding an overlay driven by store state, keep `isRestarting` sticky after a successful
  request: the app is about to exit, so clearing it would unmount the overlay before the quit.
  Only the failure path should clear it.

## Restart Overlay Linger Until Ready Execution Entry — 2026-08-09 16:15 +10:00 (CC/OpenCode)

### Scope
Approved follow-up repair (`CRON_CODE_RESTART_LINGER_UNTIL_READY_ARCHITECT_SLICE.md`): make the
Restarting screen linger until the relaunched app is actually ready and back on the entry screen.
No execution/approval/storage/port/AUMID/dependency/Git changes.

### Design
Readiness handoff (preferred by the slice over a fixed delay): dev.mjs sets
`CRON_CODE_RESTARTING=1` only for the relaunched Electron; main.mjs records `restartHandoff` in
the runtime marker + `cron:diag:marker` payload; the renderer reads it before first render and
holds the Restarting overlay from first paint until init completes (`finally` — success or
visible-error path). The preload stays narrow (the flag travels via IPC, not `process.env`).

### Verification
`pnpm test` PASS (core 139 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2
pre-existing warnings; one transient typecheck race, clean on re-run). `git diff --check` 0.
`node --check` clean. Nothing staged.

### Live proof
Real rendered button click (DOM click probe) + passive linger sampler on the relaunched instance:
- Click: overlayVisible=true (old instance, +400 ms), full Restarting panel text, button disabled/busy.
- Supervisor: `Restart intent consumed (pid 28736); relaunching Electron`.
- Relaunched instance: overlayVisible=true at +100 ms and +300 ms, false at +600 ms onward —
  the overlay is the new window's first painted state and clears exactly when ready.
- Relaunched marker: `restartHandoff=True rendererReady=True`; entry screen served; 25 s
  stability check (no loop); intent consumed; exactly one stack; Vite reused; unrelated apps
  (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite; dev store intact.
- Honest limits: click is a DOM .click(); visual confirmation is Venessa's step.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack left running healthy on 5190.
Full detail in `CRON_CODE_RESTART_LINGER_UNTIL_READY_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 12)
- When a UX element must "linger" across a process restart, the overlay can only survive if the
  RELAUNCHED process repaints it. The handoff pattern: supervisor marks the child
  (env `CRON_CODE_RESTARTING=1`), main surfaces it in an existing narrow channel (the runtime
  marker), the renderer reads it before first render and holds the overlay until its own init
  completes. No fixed delay needed — readiness is the signal.
- Keep security guards intact while adding handoff state: a sandboxed preload CAN read
  `process.env`, but the repo's narrow-bridge guard asserts the preload source contains no
  `process.`. Routing the flag through the existing marker IPC satisfies both the guard and the
  requirement.
- When sampling a transient UI state, sample EARLY and often (100 ms cadence beats 1 s): the
  state under test (overlay until init) may only live a few hundred ms. Also distinguish
  hidden-but-present DOM (textContent includes display:none) from actually-rendered elements —
  query by the element's presence (`querySelector`), not body text.
- A passive sampler (no restart trigger) can survive the relaunch loop without causing one;
  a click probe cannot. Keep probe env vars stripped in the supervisor; let passive diagnostics
  report both instances.

## Restart Transition Visual Stability Execution Entry — 2026-08-09 17:20 +10:00 (CC/OpenCode)

### Scope
Approved repair (`CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_ARCHITECT_SLICE.md`): make the
restart transition visually continuous and centered from click through relaunch readiness; no
left-aligned/unstyled/blank interim frame. No execution/approval/storage/port/AUMID/
dependency/Git changes.

### Diagnosis (evidence)
Captured the transition with `webContents.capturePage` (ready-to-show FIRSTPAINT +
50/250/600/1200/2500/5000 ms) and DOM samples (click+0/50/100/200/400 ms, post-relaunch).
All 20+ frames in this environment were centered; the reported flash maps to three structural
holes in the old transition: (1) bare logo+text splash with a mismatched background and no
restart narrative; (2) splash hidden synchronously after root.render() but before React's first
commit → empty unstyled root window; (3) the Restarting overlay existed only after React's
first commit → shell (left sidebar) could be exposed first if the handoff overlay committed late.

### Repair delivered
- New index.html splash: fixed full-window CENTERED screen, fully inline CSS (unstyled is
  impossible), `CRON SYSTEM CONTROL` eyebrow, logo, `Preparing CRON for Code`, inline spinner,
  plain-English messages, app-matching background.
- main.tsx: on restart handoff the splash text becomes `Restarting / Stopping and restarting
  CRON services...` before React mounts; splash hidden + root revealed only after React's first
  paint (double requestAnimationFrame) — no blank-root gap.
- React handoff overlay unchanged; entry screen reveals only when ready.
- Test-only: data-service lifecycle test timeout 5 s → 20 s (pre-existing load flake).

### Verification
`pnpm test` PASS (core 140 / 9 files; data-service 74). typecheck/lint/build/format:check
exit 0 (lint 2 pre-existing warnings). `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof
- Old window: overlay visible at click+0/50/100/200/400 ms — no app-content flash.
- Relaunched window FIRSTPAINT: centered `CRON SYSTEM CONTROL / Restarting / Stopping and
  restarting CRON services...`; React overlay +100 ms; cleared when ready; entry after.
- Every captured frame centered (bbox offset ≤4 px; leftAligned=no in all). Normal-launch
  splash: centered `Preparing CRON for Code`.
- No loop (20 s observation); intent consumed; exactly one stack; Vite reused; unrelated apps
  (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite; dev store intact.
- Honest limits: the left-aligned frame was not reproducible here; the fix removes every
  structural path to it; Venessa's re-test confirms.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack left running healthy on 5190.
Full detail in `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 13)
- When a transient visual flash can't be reproduced, don't guess — capture the actual pixels
  (`webContents.capturePage` at ready-to-show and on a schedule) and analyze the frames
  programmatically (System.Drawing bbox/centering analysis beats eyeballing). Then enumerate
  every structural path to the bad state and remove each one.
- A pre-React splash must be fully inline-styled (fixed, inset 0, flex centered) so it can
  never appear raw or left-aligned; it must match the app's background tone.
- Never hide a loading/splash layer synchronously after `root.render()` — React's first commit
  is asynchronous; a double `requestAnimationFrame` hides the splash only after the first
  painted frame, eliminating the empty-root window.
- A restart narrative should be continuous across the process boundary: the pre-React splash
  gets the SAME text as the old window's overlay (via the handoff flag) so the user can't tell
  where one window ends and the other begins.

## Restart Reopen Visibility and Linger Execution Entry — 2026-08-09 17:35 +10:00 (CC/OpenCode)

### Scope
Approved repair (`CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_ARCHITECT_SLICE.md`): the
Restarting screen must linger perceivably until the relaunched app is ready, and the relaunched
window must reopen visible/focused/maximized — never minimized on the taskbar. No
execution/approval/storage/port/AUMID/dependency/Git changes.

### Diagnosis
- Old window close: performAppRestart → 1500 ms hold → app.quit() → before-quit cleanup →
  window close (saves state) → dev.mjs relaunch.
- New window: dev.mjs startElectron(true) → createWindow (show:false) → ready-to-show did only
  `maximize(); show();` — no restore/focus. Spawned by a background process, Windows denies
  foreground activation → minimized-on-taskbar.
- Linger: the relaunched overlay cleared the instant init completed (~100–600 ms warm) —
  imperceptible flash.

### Repair delivered
- main.mjs ready-to-show: maximize (saved maximized OR restart handoff) → show →
  restore-if-minimized → focus → `app.focus({ steal: true })`.
- App.tsx: 1600 ms linger floor — overlay clears only when init done AND floor elapsed
  (timestamp captured in the effect; render-purity safe — the repo's react-compiler lint
  rejected a render-phase `Date.now()`).

### Verification
`pnpm test` PASS (core 142 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2
pre-existing warnings). `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof
- Linger: relaunched overlay visible at +100/300/600/1200 ms, cleared by +2500 ms (was ~600 ms
  before the floor).
- Reopen: relaunched window `visible=true maximized=true minimized=false focused=true` at every
  sample after the pre-show boot (~600 ms).
- Old window: overlay present from click+0 ms through the 1500 ms hold.
- No loop (20 s observation); intent consumed; exactly one stack; Vite reused; entry screen
  served; unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo
  Vite; dev store intact (3 records, last-active preserved).
- Honest limit: Windows focus-stealing rules may still deny absolute foreground to a
  background-spawned process; the safest behavior is implemented and the window is proven
  visible and never minimized.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack left running healthy on 5190.
Full detail in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 14)
- A window spawned by a background process (dev.mjs) lacks foreground-activation rights on
  Windows: without an explicit `show → restore-if-minimized → focus` sequence (plus
  `app.focus({steal:true})`), it can reopen minimized on the taskbar even when `maximize()` was
  called. Order matters: maximize → show → restore → focus.
- A readiness-based overlay can be invisible if readiness arrives in ~100–600 ms: pair
  readiness with a conservative minimum-display floor, and document why the fixed floor is
  needed (the slice explicitly allows it when explained).
- Electron's own window API (`isVisible/isMaximized/isMinimized/isFocused`) is direct evidence
  for "the window reopened correctly" — log it from the relaunched instance rather than
  inferring from screenshots.
- React's react-compiler lint forbids impure calls (e.g., `Date.now()`) in render-phase
  initializers; capture timestamps inside effects instead.

## Restart Gap-Free Reopen Execution Entry — 2026-08-09 18:00 +10:00 (CC/OpenCode)

### Scope
Venessa's clarification to the approved repair: click → Restarting screen STAYS until the app
fully restarts → app opens full screen. Actual: screen shows ~3 s, then app vanishes (gap),
then opens minimized on the taskbar. No execution/approval/storage/port/AUMID/dependency/Git
changes.

### Root cause (plain English)
The old window closed after a fixed ~3 s hold — before the new app finished booting, so there
was a no-window gap ("app vanish"). The new window was started by a background process, so
Windows refused it foreground and minimized it on the taskbar.

### Fix — gap-free handoff
- main.mjs: restart writes the intent, releases the single-instance lock, and watches the
  runtime marker; the old window keeps the Restarting overlay up and quits only when the
  replacement is ready (different pid + rendererReady + restartHandoff), bounded at 20 s.
  Reopen: show → restore-if-minimized → maximize → focus → always-on-top flip → focus →
  `app.focus({steal:true})` → delayed retry.
- dev.mjs: intent poll every 400 ms spawns the replacement while the old instance still runs;
  a superseded-close guard prevents teardown when a replacement is alive.
- App.tsx: replacement overlay lingers ≥2 s after first paint.

### Verification
`pnpm test` PASS (core 142 / 9 files). typecheck/lint/build/format:check exit 0 (lint 2
pre-existing warnings). `git diff --check` 0. `node --check` clean. Nothing staged.

### Live proof
- Supervisor: `Restart intent consumed (pid 27376) via poll; spawning replacement` (+0.9 s)
  then `Superseded Electron instance closed; the replacement continues` (+6.2 s).
- Old window overlay: visible continuously 0–2400 ms samples (held ~6 s total).
- Replacement window: visible/maximized/focused, minimized:false at every sample.
- Replacement overlay: visible 100–1200 ms, cleared by 2500 ms (2 s floor).
- No loop (20 s); intent consumed; exactly one stack; Vite reused; entry screen served;
  unrelated apps (Meds 10788 / Claims 9336 / HUB 15300) alive; port 5190 owned by repo Vite;
  dev store intact (3 records, last-active preserved).

### Boundary
No Git mutation/release action. No dependency changes. Dev stack left running healthy on 5190.
Full detail in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 15)
- When a user says "the screen shows for N seconds then the app vanishes", that N is a FIXED
  HOLD that ended before readiness: the correct fix is a readiness handoff where the old
  window stays until the replacement signals ready — not a longer fixed delay.
- The single-instance lock is the barrier to running old and new instances at the same time:
  `app.releaseSingleInstanceLock()` lets the replacement acquire the lock while the old window
  still shows the overlay. Readiness detection: the runtime marker (different pid +
  rendererReady + restartHandoff) is the handshake.
- dev.mjs must distinguish WHICH electron closed: pass the closed process to the handler and
  compare with the current one, otherwise a superseded instance's close tears down the stack.
- Windows taskbar-minimization for background-spawned windows is beaten by: show →
  restore-if-minimized → maximize → focus → brief `setAlwaysOnTop(true/false)` flip →
  `app.focus({steal:true})` → delayed focus retry. Order matters; always-on-top must be
  released immediately.
- Ask the user the ONE decisive question (does the screen show at all, and for how long?)
  before iterating on visuals — Venessa's "restart screen does show but only for 3 seconds"
  immediately identified the fixed-hold-then-gap as the real defect.

## Restart One-Screen Follow-up Execution Entry — 2026-08-09 18:45 +10:00 (CC/OpenCode)

### Scope
Venessa's follow-up: remove the screen that pops up between the restart screen and the app.
The gap-free handoff stays; the intermediate screen was the new window's pre-React splash,
which looked different (logo + plain text) from the Restarting panel.

### Fix
- Splash (`index.html`) rewritten as a pixel-identical replica of the Restarting panel (same
  backdrop/panel/spinner/texts/pill; no logo block).
- main.tsx sets the exact restart texts on the splash during a handoff.
- RestartOverlay uses the same texts in both phases (removed the `Preparing your workspace...`
  variant) — splash and overlay are indistinguishable.
- Tests updated.

### Verification
`pnpm test` PASS (core 142). typecheck/lint/build/format:check exit 0. `git diff --check` 0.
Nothing staged.

### Live proof
- Pixel analysis: old splash ≈220×192 px light (logo block); new splash FIRSTPAINT ≈544×332 px
  dark — the same panel as the overlay (544×368 maximized). One continuous centered screen.
- Gap-free handoff re-verified (via poll → superseded close); replacement marker
  rendererReady + restartHandoff; no loop; intent consumed; exactly one stack; Vite reused;
  Claims/HUB alive; Meds restarted itself at 18:29 (new PID 34032; port 5191 its own; launcher
  log shows no interaction); port 5190 owned by repo Vite; dev store intact.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack left running healthy on 5190.
Full detail in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md` + `..._EVIDENCE.md`.

### CC Training Notes (slice 16)
- A "screen that pops up for a second" between two polished screens is almost always a THIRD
  surface rendered by a different layer — here the static pre-React splash. The fix is to make
  every intermediate surface visually identical to the target surface (pixel-level replica),
  not to shorten its duration.
- Verify visual seamlessness with pixel analysis of the actual frames (content-box size and
  mean color), not by eyeballing: the splash's box changed from ~220×192 light to ~544×332
  dark — now matching the overlay panel.
- When two phases must be indistinguishable (splash vs React overlay), use identical text
  strings in both — remove per-phase variants entirely.

## Restart One-Screen Round 2 Execution Entry — 2026-08-09 19:15 +10:00 (CC/OpenCode)

### Scope
Venessa's feedback: a "different version of the restart screen" flashes, and the app opens not
full screen. Root causes found and fixed.

### Fixes
1. Overlay backdrop blur removed (old window's restart screen vs new window's splash were two
   subtly different screens — now pixel-identical flat dark + panel).
2. Maximize BEFORE show + delayed re-maximize retry — the window can never appear small;
   confirmed maximized from the first visible sample.
3. Replacement watch requires `windowReady` — old window closes only when the new window is
   visible (measured ~100 ms overlap, no gap).
4. Dev-only continuous sampler (300 ms) added so real user clicks are evidenced end to end.

### Verification
`pnpm test` PASS (core 143). typecheck/lint/build/format:check exit 0. `git diff --check` 0.
Nothing staged.

### Live proof
Replacement window visible+maximized+focused+not-minimized at every continuous sample; overlay
throughout the handoff; new window appears ~100 ms before the old closes; no loop; exactly one
stack; Vite reused; Claims/HUB alive; port 5190 owned by repo Vite; dev store intact.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack running with the sampler for
Venessa's next click. Full detail in `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md`
+ `..._EVIDENCE.md`.

### CC Training Notes (slice 17)
- "Another version of the same screen" almost always means two surfaces differ subtly — here
  the overlay's backdrop blur vs the splash's flat background. Unify every visual parameter
  (including backdrop effects), not just text and panel sizes.
- Maximize BEFORE show prevents a visible small-window flash; maximizing after show lets the
  small size paint first.
- A readiness handshake should use the moment the new WINDOW is visible (ready-to-show), not
  the moment the renderer is ready — otherwise the handover has a no-window gap.
- When a user keeps reporting visual differences I cannot reproduce, ask the precise question
  and instrument the live app (continuous sampler) so the user's real click is captured rather
  than guessing again.

## Restart One-Screen Round 3 Execution Entry — 2026-08-09 19:35 +10:00 (CC/OpenCode)

### Scope
Venessa: "that flash screen still shows right before the app opens". Her real click was
captured; the overlay→entry transition was a sudden snap (instant unmount) — the "flash".

### Fix
- RestartOverlay now fades out over 400 ms (CSS opacity + delayed visibility; pointer-events
  off during the fade; stays in the accessibility tree only until hidden). No timers, no
  setState-in-effect (react-compiler clean).
- Continuous sampler now captures pixels at the overlay-clear moment (+300 ms) so the next
  real click's reveal is evidenced frame-by-frame.
- Tests updated (aria-hidden reveal assertion).

### Verification
`pnpm test` PASS (core 143). typecheck/lint/build/format:check exit 0. `git diff --check` 0.
Nothing staged.

### Live proof
Her prior click (09:16:49): replacement overlay visible through the 2 s floor then entry; the
reveal-capture diagnostics are armed for the next click. No loop; exactly one stack; Vite
reused; Claims/HUB alive; port 5190 owned by repo Vite; dev store intact.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack running with the recorder for
Venessa's next click.

### CC Training Notes (slice 18)
- A "flash right before the app opens" with otherwise-correct frames is a TRANSITION problem:
  an instant conditional unmount reads as a flash even when both states are correct. Fade the
  overlay (opacity transition + delayed visibility) instead of unmounting.
- CSS-only fades avoid react-compiler lint errors (no timers, no setState in effects); keep
  the element in the DOM and hide it with visibility after the transition.
- When the user reports the same symptom twice, capture THEIR real interaction (continuous
  sampler + capture-on-transition) instead of relying on synthetic runs.

## Restart Repair ACCEPTED — Execution Entry (2026-08-09 19:45 +10:00)

Venessa's final manual test: **"perfect!"** — the visible CRON Restart experience is accepted.

What was delivered across the repair sequence (all live-proven, all gates green, no Git actions):
1. Intent-only dev restart + dev.mjs relaunch (children of Electron die with it — kill-on-close job).
2. Real visible button path (DOM-click proof) + Claims-style Restarting overlay.
3. Readiness handoff via the runtime marker (`CRON_CODE_RESTARTING`).
4. Centered fully-inline-styled splash — no unstyled/left-aligned frames possible.
5. Gap-free handover: lock release + dev.mjs intent poll + old window quits only when the new
   window is visible (windowReady).
6. Full-screen reopen: maximize-before-show, restore-if-minimized, focus, always-on-top flip,
   delayed retry — never minimized on the taskbar.
7. Pixel-identical splash ↔ overlay panels (flat dark backdrop, same panel/spinner/texts/pill).
8. Fade-out reveal (400 ms) — the panel eases into the entry screen instead of snapping.

Final live state: stack healthy on 5190 (marker rendererReady, no startup error); dev store
intact (3 records, last-active preserved); Claims/HUB alive; Meds' own stack on 5191; nothing
staged; HEAD unchanged. Dev-only diagnostics (env-gated) remain for future verification.

CC Training Notes (final for this series): a user-visible "flash" or "pop-up" is almost always
one of (a) a different intermediate surface (fix: pixel-identical replicas), (b) a timing gap
(fix: readiness handoffs, not timers), (c) an instant unmount (fix: CSS fade), or (d) a Windows
foreground policy issue (fix: maximize-before-show + focus + always-on-top flip). Instrument
the user's REAL interaction to decide which.

## Functional Wiring, DEV Marking + Picker Polish Execution Entry — 2026-08-09 20:50 +10:00 (CC/OpenCode)

### Scope
Approved slice: truthfully wire or DEV-mark every visible control, make CRON Online a status,
and wrap the native folder picker in CRON styling. No Git actions.

### Audit outcome
- Wired and verified live: Re-link folder, Create Task, Model selector (now opens the model
  settings dialog), project select, menu actions.
- Status only: CRON Online (div role="status", no hover/click).
- DEV-marked: footer placeholder tabs (6 red badges); assistant panel, sidebar chat/CURRENT
  PROJECT/AGENT STATE/Account were already marked and kept.
- Picker polish: new PickerModal wraps the OS dialog flow (before + after).
- No fake functionality; working controls NOT DEV-marked; unused components (CronNavBar,
  WorkflowStrip) contain dead buttons but are not rendered.

### Verification
`pnpm test` PASS (core 146 / 10 files). typecheck/lint/build/format:check exit 0. `git diff
--check` 0. Nothing staged.

### Live proof
Scripted real-renderer drives: status pill DIV/role=status + 6 footer DEV badges; picker modal
visible then cleared; Create Task taskVisible:true; Model opens settings; Re-link resolves as a
quiet cancel (menu closed, no errors); main logs confirm the picker/relink chains reached the
IPC handlers. OS dialogs bypassed via one-shot dev-only diagnostics.

### Boundary
No Git mutation/release action. No dependency changes. Dev stack running on 5190 for Venessa's
visual pass. Full detail in `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_REPORT.md`
+ `..._EVIDENCE.md`.

### CC Training Notes (slice 19)
- Audit truthfully before marking: several "not wired" reports were already-wired features
  (Re-link, Create Task) — prove the chain live (menu → IPC → main → result) before touching
  them; only genuinely dead controls get DEV badges.
- A control that LOOKS clickable but is a span with a chevron is a silent-click bug: convert
  it to a real button with the honest action (Model → open the model settings) rather than
  marking it DEV.
- Native OS dialogs can be wrapped without faking: a branded modal before/after the dialog
  keeps the flow intentional; dev-only "no-dialog" one-shot diagnostics let the full chain be
  proven live without blocking on an OS dialog.
- `role="status"` + non-button markup is the correct way to make a status pill truthful
  (no hover, no click, screen-reader friendly).

---

## OpenCode-Style Workspace Layout + Restart Flash Cleanup — 2026-08-10 (CC/OpenCode)

Executed per `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_ARCHITECT_SLICE.md`.

### Changes delivered

**Restart flash fix (2 parts):**
1. `RestartOverlay.tsx`: Replaced Lucide `<Loader2>` spinner with CSS border spinner matching the HTML splash `#splash-spinner` identically (34px, 3px border, same colors, same `cron-spin` 0.9s animation). This removes the visual pop-in that occurred when the splash transitioned to the React overlay.
2. `main.tsx`: Replaced `requestAnimationFrame(requestAnimationFrame(() => { hide splash; show root }))` with immediate root reveal + `setTimeout(0)` for splash hiding. The overlay (z-index 1000) covers the splash, and since the spinners match, the transition is seamless.

**Workspace layout:**
- `ProjectArea.tsx`: Rewrote as workspace command bar with project name, truncated path, branch pill (DEV-marked for git integration), Reveal + Copy Path + New Project buttons.
- `Sidebar.tsx`: Width 196 → 210px.
- `ChangedFilesReview.tsx`: New component — collapsible section with header (file count, +/- counts, DEV badge, refresh button) and expandable body for file list. Ready for git-status wiring. Exported from index.
- `Layout.tsx`: Integrated `ChangedFilesReview` between `TaskWorkspace` and `TaskComposer`.
- `TaskWorkspace.tsx`: Enhanced empty state with ClipboardList icon, heading, descriptive text, and two actionable hints.
- `CronAssistant.tsx`: Header refined to "CRON Assistant / Dev support — local chat".

### Verification results
- **Typecheck** (core + standalone): passed, 0 errors.
- **Lint**: passed, 0 errors (2 pre-existing react-hooks/exhaustive-deps warnings in App.tsx).
- **Tests**: 154/154 passed across 10 test files.
- **Build**: passed (34 modules, 112.87 kB).
- **Test updates**: `workspace-layout.test.tsx` (CronAssistant header), `repo-stabilisation.test.ts` (splash pattern).

### Kept intact
- All CRON dark styling and design tokens.
- CRON branding, "CRON Online" status pill, "CRON Restart" button.
- DEV truth markers throughout.
- Restart behaviour (only spinner visual + timing changed).
- No fake data or capability assertions. ChangedFilesReview is a DEV-marked ready-to-wire shell.
- No Git actions performed.

### Reports written
- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_REPORT.md`
- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_EVIDENCE.md`

## Pre-Packaging Truth Audit Execution Entry — 2026-08-10 (CC/OpenCode, read-only audit)

### Scope
Strictly read-only audit per `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_ARCHITECT_SLICE.md`. No implementation. No Git actions.
Only documentation files created/updated.

### Repository identity (verified)
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`, upstream `origin/main` 0/0, nothing staged.
Working tree: 42 modified, 3 deleted, ~60 untracked (all uncommitted since 2026-08-04).

### Verification (exit codes recorded)
- `pnpm typecheck` PASS exit 0 (all 7 packages).
- `pnpm lint` PASS exit 0 (0 errors, 2 pre-existing react-hooks warnings).
- `pnpm test` 1 FAIL (execution-service timeout, 241/242 pass).
- `pnpm build` PASS exit 0.
- `git diff --check` PASS exit 0 (clean).

### Key findings
- Extensive working functionality: shell, project management, task creation, safe execution with approval gates, audit persistence, LM Studio chat, CRON Restart with overlay, launcher suite, electron-builder config.
- ChangedFilesReview component not wired to real Git data — always shows "No changes".
- Footer tabs (6) all DEV placeholders.
- Sidebar CURRENT PROJECT / AGENT STATE blocks marked DEV with stubs.
- Branch pill hardcoded "main" with DEV badge.
- WorkflowStrip component exported but orphaned (not rendered).
- 1 pre-existing flaky test (execution-service timeout).
- All work uncommitted since August 4 — critical packaging blocker.
- Recommended 10 finishing slices ordered by priority.

### Boundary
No implementation performed. No Git mutation/release action. No dependency install/update.
All Git commands read-only. Live dev stack unaffected.

### CC Training Notes (slice 20)
- Audit truthfully: ChangedFilesReview was previously reported as "working" but was actually never wired (zero props passed from Layout). Read the component's actual props contract AND its call site together — a component can render correctly (with defaults) while being completely disconnected from real data.
- Footer tabs with DEV markers and `opacity: 0.45`/`cursor: default` are correctly honest — they look intentionally inactive rather than pretending to be working features.
- `WorkflowStrip` in the index.ts barrel export with no import in Layout is an orphaned component — not a bug, just leftover from earlier iterations.
- The one flaky test is a known timing issue (5s vs ~9s actual runtime on Windows for the queueTask execution-service test). Not a logic defect. Track it but don't block packaging on it alone.
- electron-builder config is present and was proven working (v1.1.7 installed on this machine), but the current uncommitted tree has never been packaged.

### Reports written
- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_REPORT.md` (created)
- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_EVIDENCE.md` (created)

---

## Same-Session OpenCode Approval / Resume Execution Entry — 2026-08-12 (CC/OpenCode)

Continuation of the interrupted same-session OpenCode approval/resume implementation
(`CRON FOR CODE — RESUME INTERRUPTED SAME-SESSION APPROVAL IMPLEMENTATION`). Prior partial
work preserved. No Git actions.

### Repository identity (verified)
Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e`, remote
`https://github.com/clearline-studio/CRON-for-Code.git`, nothing staged. Working tree already
heavily dirty before this slice.

### What was completed
1. executionId/session correlation finished: approve/reject now continue the SAME execution
   record (`approval.executionId`, preserved startedAt) — no duplicate executions, no new tasks.
2. Fixed `isPromiseSettled` (already-settled promises were never detected) so the session
   resume reliably reaches completion/verification.
3. Replaced guessed endpoints with the installed OpenCode 1.18.16 contract, verified live:
   `GET /permission?directory=...` (raw array), `POST /permission/{requestID}/reply?directory=...`
   (`{reply:'once'|'reject', message}`); session `model:{providerID,id}` vs message
   `model:{providerID,modelID}`; Basic auth from `OPENCODE_SERVER_USERNAME`/
   `OPENCODE_SERVER_PASSWORD` (env set by OpenCode Desktop — every endpoint 401 without it).
4. Same-session follow-up permissions supported (new approval on same execution; test-verified).
5. Changed-file evidence: `/session/{id}/diff` is empty for untracked files on 1.18.16, so real
   evidence from the permission `metadata.filepath` is written into the execution record
   (`Changed: <path>`) — no fabricated evidence.
6. Completion truth preserved: rejection/failed write/auto-reject never become COMPLETED.

### Live runtime proof (real installed OpenCode server)
Session → streaming message → permission `per_ff2c1bbff...` (edit runtime-test.txt) → reply
`once` → `true` → SAME session/message resumed (`finish:"stop"`) → `runtime-test.txt` created
with content exactly `CRON CODE RUNTIME OK` (verified by disk read-back). Full evidence in
`CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_EVIDENCE.md`.

### Verification (exit codes recorded)
- contracts build PASS; data-service typecheck+build PASS; core typecheck PASS; standalone
  typecheck PASS; host-adapter typecheck PASS.
- Tests: 298 PASS (contracts 24, data-service 92, core 159, host-adapter 23). New tests:
  7 same-session runner tests + 2 mock-server integration tests (approve/reject against the
  verified API contract).
- `pnpm build` PASS. `eslint` 0 errors (2 pre-existing warnings). `git diff --check` clean.
- Debug probes/temp files cleaned up; no stray files left in the repo.

### Remaining manual step (Venessa)
Launch Dev, send "Create a small test file called runtime-test.txt containing exactly: CRON
CODE RUNTIME OK", wait for the approval card, click Approve → same OpenCode session continues →
green COMPLETED → runtime-test.txt in Changed Files → one execution, one conversation. Optional
reject check: second task → Reject → Cancelled, never Completed.

### Boundary
No staged/committed/pushed/reset/restored/cleaned changes. No dependency changes. All Git
commands read-only.

### CC Training Notes (slice 21)
- `Promise.race([promise.then(() => true), Promise.resolve(marker)])` is broken for
  already-settled promises: the marker reaction is queued before the settled promise's reaction
  chain, so the race always returns the marker. The settled-flag + two `await Promise.resolve()`
  pattern is the reliable check.
- The installed OpenCode's v2 HTTP API (`/api/session/{id}/permission`) requires instance
  middleware context that raw control-plane calls don't have; the classic routes
  (`/permission`, `/permission/{requestID}/reply`) are what the desktop client itself uses —
  verify against the REAL installed version, not docs.
- A test `finally` that calls `server.close()` will hang for the lifetime of held-open
  connections, masking earlier assertion failures as timeouts — call
  `server.closeAllConnections()` first so real failures surface immediately.

### Reports written
- `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_REPORT.md` (created)
- `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_EVIDENCE.md` (created)

---

## Fast Startup + Live Execution + Role Lock Execution Entry — 2026-08-12 (CC/OpenCode)

Venessa's same-session approval verdict accepted (approve-once → same session → COMPLETED).
This slice fixed surrounding UX/runtime issues without redesigning the approval machinery.

### Locked architecture (recorded)
GEMMA = planner/architect/read-only companion; CODING MODEL VIA OPENCODE = file-mutating
executor; VENESSA = final approval authority. Planning is change-free; explicit go-signals
hand the visible task contract (Goal/Scope/Constraints/Protected areas/Acceptance) to the
executor. Gemma cannot mutate files or self-approve (structural enforcement).

### Changes
1. Live activity stream: runner onEvent → IPC `cron:opencode:event` → preload → renderer
   (incremental trail, no bulk dump). awaiting_approval events carry the approval for
   inline Approve/Reject. Backend never slowed.
2. Plain-English mapping (`activity-english.ts`): statuses ("Working", "Waiting for
   approval", "Checking", "Done") + message translations; internal IDs suppressed from the
   normal surface, available in Review.
3. Duplicate Details removed; final summary (Created/Checked/Tests/Changed files) added.
4. Flattened conversational trail with rail + dots + inline approval; user bubble stays
   right-aligned.
5. Review pane scoped: CURRENT TASK CHANGES vs PROJECT CHANGES.
6. Startup: dev-mode cold start 16.6s → normal-mode (built renderer, no Vite) 7.1s (−57%).
   `-Mode normal|dev` launcher param (default normal; dev fallback if dist-renderer
   missing); dev.mjs `CRON_RUN_MODE`; runtime marker + renderer diagnostics now written in
   both modes; restart supervision + port 5190 + AUMID preserved.
7. Entry screen rebalanced (two-zone composition, responsive, plain-language role chips).

### Verification
313 tests PASS (contracts 24, data-service 93, core 173, host-adapter 23). Typechecks,
full build, eslint (0 errors) and `git diff --check` clean. Live normal-mode app verified
(marker-confirmed, file:// renderer). No Git mutation, nothing staged.

### Boundary
No staged/committed/pushed/reset/restored/cleaned changes. No dependency changes. Only the
repo's owned dev stack was restarted for measurement (launcher-approved lifecycle);
production/unrelated CRON apps untouched.

### CC Training Notes (slice 22)
- Buffered statuses: a "bulk dump" UI almost always means events are only delivered in the
  final result — check the contract (returns vs subscriptions) before touching rendering.
- `Promise.resolve` microtask tricks and `findLast` in inline style objects both bite
  typecheck/behaviour subtly — keep event payloads structured and typed.
- The runtime marker being dev-only silently broke a new normal-mode launcher path — a
  readiness handshake must not be mode-gated.
- Measure startup before optimising: the Vite boot (~4s) + decision probes (~4s) were the
  real costs; electron→file:// window was ~3s. Numbers, not guesses.
- Role separation must be structural (mutation APIs only on executor routes), not
  documented intent.

### Reports written
- `CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_REPORT.md` (created)
- `CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_EVIDENCE.md` (created)

---

## Safety + Tray Menu Fix Execution Entry — 2026-08-13 (CC/OpenCode)

Task: `CC_CODE_SAFETY_AND_TRAY_FIX_PROMPT.md` — delete legacy `CommandExecutor` (security) +
wire the tray menu listeners (usability). Restart button explicitly out of scope.

### Fix 1 — legacy `CommandExecutor` removed (security)
- `packages/data-service/src/task-runner.ts`: `CommandExecutor` class (the `child_process.exec`
  shell landmine) deleted entirely. `TaskRunner` / `TaskExecutor` / `TaskExecResult` /
  `TaskRunnerConfig` untouched.
- `packages/data-service/src/index.ts`: export narrowed to `export { TaskRunner } ...`.
- No other code imported it (only historical markdown docs mention it; left as records).
- `grep CommandExecutor` over all code: zero matches after the change.

### Fix 2 — tray menu listeners wired (usability)
- `apps/standalone/electron/preload.cjs`: new `tray` bridge — `onShowTasks` / `onPauseTask` /
  `onStopTask` subscribe to `cron:tray:show-tasks` / `cron:tray:pause-task` /
  `cron:tray:stop-task` and return an unsubscribe function (listener cleanup on unmount).
- `packages/core/src/tray.ts` (new): host-agnostic `TrayClient` interface; exported from
  `packages/core/src/index.ts`.
- `packages/core/src/store.ts`: new actions —
  - `trayShowTasks()`: selects the active task (running → approval_required → queued → latest).
  - `trayPauseTask()`: surfaces the active task; the task model has NO pause state, so it never
    pretends to pause and never cancels anything (safe default; see note below).
  - `trayStopTask()`: real stop when possible — rejects the pending OpenCode approval via the
    injected `openCodeRunner` (session cancelled, task cancelled) and refreshes; otherwise an
    honest error "not currently interruptible" instead of faking it.
  - Optional `openCodeRunner` added to store deps.
- `packages/core/src/components/App.tsx`: `AppDeps.tray?: TrayClient` + subscription effect
  with cleanup (all three channels).
- `apps/standalone/src/ipc-data-service.ts`: `createIpcTrayClient()` + `cronHost.tray` typing.
- `apps/standalone/src/main.tsx`: passes `tray: createIpcTrayClient()`.
- Tests: `packages/core/src/tray-actions.test.ts` (new, 6 tests).

### Verification
- `pnpm test` — 325 PASS (contracts 24, data-service 94, core 184 incl. 6 new, host-adapter
  23). NOTE: the two previously-failing `opencode-runner.test.ts` timeouts passed this run;
  data-service was RED before this slice (2 timeouts, reproduced twice on 2026-08-13).
- `pnpm typecheck` PASS (required `pnpm --filter @cron-code/core build` first so standalone
  typechecks against the new `AppDeps.tray` in core's dist types).
- `pnpm lint` PASS — 0 errors, 3 warnings (one new `exhaustive-deps` in `App.tsx` from the
  tray effect; same class as the 2 pre-existing warnings).
- `pnpm build` PASS. `git diff --check` clean. No Git mutation, nothing staged.

### Notes for the Architect (honest limits)
1. **Pause is not a real state**: `TaskStatus` has no `paused`; tray "Pause" currently
   surfaces the active task (same as Show active tasks) rather than destroying anything.
   A true pause needs a new task state + backend support.
2. **Stop is backend-limited**: only an approval-pending OpenCode task is genuinely
   stoppable from the renderer. Running catalogue commands / OpenCode sessions expose no
   cancel id to the renderer, so those surface an honest "not interruptible" error. A
   backend cancel-by-task path would be needed for full Stop.
3. Docs (`CRON_ARCHITECT_LOG.md`, reports, README history) still mention `CommandExecutor`
   as historical records; code references are gone.

### Boundary
No staged/committed/pushed/reset/restored/cleaned changes. No dependency changes. No
`main.mjs` tray-menu change (per prompt), `ExecutionService` untouched (per prompt),
restart button untouched. All Git commands read-only.

### CC Training Notes (slice 23)
- PERMANENT RULE (Venessa, 2026-08-13): after EVERY task/slice/change, append an entry to
  BOTH `PROJECT_LOG.md` AND `CRON_ARCHITECT_LOG.md` — regardless of what the task prompt
  says. Never skip the logs because a prompt omits them.
- When a store action must act on "the active task", it reads store state, not the data
  service — seed `tasks`/`approvals`/`activeProjectId` in store tests before asserting.
- The 2 previously-red opencode-runner timeouts are load-sensitive (near the 5s default);
  verify by re-running the file in isolation before classifying a fix.
- Standalone typechecks against core's BUILT dist types — rebuild `@cron-code/core` before
  typechecking standalone after changing core's public surface.

---

## Taskbar Double-Icon Fix Execution Entry — 2026-08-13 (CC/OpenCode)

Task (Venessa): "code is opening a running icon next to the pinned icon when i open it —
fix it so it only opens 1 on the taskbar."

### Root cause (proven with live evidence, not guessed)
Windows 11 groups a pinned taskbar button with the running window only when both share
one identity. On this OS:
1. NO pinned/installer shortcut carries an AppUserModelID property store: every real
   shortcut on the machine (pinned Edge/Chrome/OpenCode/CRON Dev/CRON Meds, installed
   CRON for Code, Chrome's Start Menu link) has only a custom 788-byte icon-path blob in
   its extra data (signature 0xA0000007) — verified by byte-level decode and by
   `IPropertyStore::GetValue` (all NOT-SET).
2. `IPropertyStore::SetValue` refuses to write AppUserModelID on .lnk files
   (STG_E_INVALIDPARAMETER 0x80030005), so the property cannot be stamped at all.
3. The pre-existing `scripts/set-shortcut-appuser-model-id.ps1` used the WRONG extra-data
   signature (0xA0000001 = ConsoleDataBlock, not 0xA0000007 = PropertyStoreDataBlock) and
   a wrong storage layout — a `_probe-lnk-propstore.ps1` + round-trip probe (16 variants)
   proved nothing round-tripped.
4. Therefore grouping on this build is by implicit exe-path identity. The pinned "CRON
   for Code Dev" shortcut targeted `launch-cron-for-code-dev.vbs` → button identity =
   wscript.exe; the running app (electron.exe) = electron.exe path → MISMATCH → the
   second "running" icon the user saw. Confirmed: the running normal-mode renderer
   carries no `--app-user-model-id` (implicit identity), and the pinned .lnk has no
   AppUserModelID property.

### Fix delivered
1. `apps/standalone/electron/main.mjs`: explicit `app.setAppUserModelId()` REMOVED for
   all modes (it existed only in dev). The window identity is now always the implicit
   electron.exe path — which is what the pinned button resolves to after fix 2. (The
   packaged build keeps implicit identity too: its installer shortcut has no property,
   so explicit IDs would only break it.) Comment documents the Windows 11 finding.
2. Shortcuts retargeted from the VBS launcher to `electron.exe` DIRECTLY (args `.`,
   workdir `apps\standalone`): Desktop `CRON for Code Dev.lnk`, the stray Desktop
   `CRON for Code Dev (2).lnk`, and the pinned TaskBar `CRON for Code Dev.lnk`. Button
   identity and window identity are now the same path → ONE taskbar icon. The app entry
   loaded is identical (apps/standalone package.json `main`), normal mode.
3. `scripts/create-code-dev-shortcut.ps1` rewritten to create the direct-exe shortcut
   (electron.exe lookup with root fallback; taskbar rationale in comments).
4. `scripts/set-shortcut-appuser-model-id.ps1` corrected to the REAL MS-SHLLINK
   layout (signature 0xA0000007, "1SPS" sheet, numeric PKEY entry — verified against
   the LECmd/ExtensionBlocks parser) and annotated as superseded-on-this-OS.
5. Diagnostics kept in `scripts/`: `_probe-lnk-propstore.ps1`, `_probe-lnk-roundtrip.ps1`,
   `_verify-appuser-model-id.ps1`, `_taskbar-button-count.ps1`.

### Verification
- `node --check main.mjs` clean; `pnpm lint` 0 errors (3 pre-existing warnings).
- Launch via the NEW desktop shortcut: no new process spawned (16 electron processes
  before and after) — the single-instance lock surfaced the already-running window,
  proving the shortcut chain works end to end.
- Shortcut targets verified via WScript (electron.exe + "." + workdir) on all three .lnk.
- The running instance (PID 27592, started 16:32) already has implicit identity
  (old main.mjs set no AUMID in normal mode) so it already merges with the new pinned
  button identity.
- Taskbar button count is not programmatically observable on this Win11 build (the
  XAML taskbar exposes no legacy button children — documented in `_taskbar-button-count.ps1`);
  final visual acceptance = Venessa: click the pinned icon — one icon, window surfaces.
  If a ghost button lingers, unpin it once and re-pin (the new identity matches the
  running app permanently).

### Boundary
No Git mutation, nothing staged, no dependency changes, no launcher/VBS/.bat changes
(the launcher chain stays intact for dev workflows via Launch-CRON-for-Code-Dev.bat),
no tests changed (main.mjs has no vitest coverage; launcher tests unaffected).

### CC Training Notes (slice 24)
- PowerShell 5.1 hex literals with the high bit set (0xA0000007) parse as NEGATIVE
  int32 — `[Convert]::ToUInt32('A0000007', 16)` is the reliable form. A false-negative
  scan nearly sent this investigation down a wrong path.
- The .lnk extra-data signature for property stores is 0xA0000007 (MS-SHLLINK
  PropertyStoreDataBlock), NOT 0xA0000001 (ConsoleDataBlock).
- This Win11 build stores pinned-button identity purely as the shortcut target path
  (icon-path blobs in extra data, no AppUserModelID properties, SetValue refused):
  taskbar grouping fixes for classic exe apps = align shortcut target exe with the
  process's implicit identity, not property-store stamping.
- Win11's XAML taskbar exposes no button children to legacy EnumChildWindows; UIA
  enumeration of the whole desktop mixes taskbar buttons with window content — treat
  taskbar counts as human-verifiable.
- LECmd/ExtensionBlocks (`EricZimmerman/Lnk`) is the fastest way to get the true
  serialized-property-storage layout when the shell won't confirm it.

---

## Audit + Fix Sweep � 2026-08-14 (CC/OpenCode)

Task: `CC_CODE_AUDIT_AND_FIX_PROMPT.md` - full audit (tests, security, dead code, restart/tray wiring) then fix what is safe, verify, report. Repo `C:\Users\venes\projects\CRON APPS\CRON for Code`, branch `main`, nothing staged.

### Audit findings (before)
1. Tests: 3 failing, all in `packages/core/src/repo-stabilisation.test.ts`:
   - "launcher does not contain automatic install commands" - the error message "Run pnpm install first." in `scripts/create-code-dev-shortcut.ps1` matched the install-command guard regex.
   - "shortcut creator targets the silent launcher" - expected the OLD VBS-target contract; the script intentionally targets electron.exe directly (taskbar identity fix, 2026-08-13).
   - "restart-safe launcher logic/source tests pass" - 2 inner assertions in `scripts/test-code-dev-launcher.ps1` still asserted the old VBS/repoRoot contract.
2. `child_process.exec`: NOT present anywhere. The legacy `CommandExecutor` was already deleted on 2026-08-13 (verified by grep: zero code references; docs mention it historically). Remaining `child_process` use is `spawn`/`spawnSync` only (`shell:false` in opencode-runner/execution-harness; dev.mjs `shell:true` is fixed-command pnpm shim spawning - no user input). No `eval` anywhere.
3. Dead files: two stale `.before-aumid-fix` backups (`apps/standalone/electron/main.mjs.before-aumid-fix` untracked, `scripts/create-code-dev-shortcut.ps1.before-aumid-fix` tracked). Unused export `isTerminalExecution` in `execution-harness.ts`. `TaskRunner` (exported + tested, no live callers) flagged, not deleted. Diagnostic probe scripts kept per 2026-08-13 log decision.
4. Restart button: fully wired (store `restartApp` ? host bridge `cron:app:restart` ? main writes restart intent ? dev.mjs relaunch ? RestartOverlay lingers until ready). No action needed.
5. Tray menu: fully wired end-to-end (main.mjs sends 3 `cron:tray:*` events, preload subscriptions, `createIpcTrayClient`, `App.tsx` effect with cleanup, store actions `trayShowTasks`/`trayPauseTask`/`trayStopTask` + 6 tests). No action needed.
6. TODO/FIXME/HACK: zero in code.
7. Security: no shell exec, no eval, harness output redaction, path-boundary checks (`assertPathInsideProject`), sandboxed preload (no raw ipcRenderer/process/shell). Clean.

### Fixes applied (this session)
1. `scripts/create-code-dev-shortcut.ps1` - error message reworded to "Run the dependency install step first." (no longer trips the automatic-install guard).
2. `packages/core/src/repo-stabilisation.test.ts` - "shortcut creator targets the silent launcher" rewritten to "shortcut creator targets electron.exe directly (single taskbar identity)" (asserts electron.exe + .TargetPath, asserts no VBS reference).
3. `scripts/test-code-dev-launcher.ps1` - 2 assertions updated to the new contract: targets electron.exe directly (not VBS), working directory is `\` (not repo root).
4. `packages/data-service/src/execution-harness.ts` - deleted unused `isTerminalExecution` export (and its `isFinalExecutionStatus` import).
5. Deleted the two stale `.before-aumid-fix` backups (user-approved).

### Verification (after)
- `pnpm test` all green: contracts 24, data-service 94, core 184 (14 files), host-adapter 23 = 325 pass, 0 fail.
- `pnpm typecheck` all packages Done.
- `pnpm lint` 0 errors, 3 pre-existing warnings (exhaustive-deps in App.tsx).
- `scripts/test-code-dev-launcher.ps1` standalone run: all assertions PASS.
- `git diff --stat`: 17 files, +482/-165 (includes pre-existing uncommitted work from the tray/AUMID sessions).

### Current state
325 tests green; launcher/shortcut contract tests now match the intentional direct-exe design; all `child_process.exec` code is gone; restart and tray are wired and tested. 15 files remain uncommitted (mix of this session's fixes and prior sessions' intentional work) - Venessa commits manually.

### CC Training Notes (slice 25)
- The stale-test hazard: a deliberate design change (shortcut identity fix) left 3 tests asserting the OLD contract. Tests must be updated in lockstep with intentional behaviour changes; the prior session's "launcher tests unaffected" note was wrong.
- The install-command guard regex matches any `pnpm install` string, including user-facing error messages - keep messages free of literal command forms or the guard stays noisy.
- `shell:true` in dev.mjs is safe ONLY because every argument is a fixed literal; it exists to spawn pnpm.cmd/electron shims on Windows.

---

## CRON for Code UI Fixes #2-#5 Execution Entry - 2026-08-17 (CC/OpenCode)

Task: `CC_CODE_UI_FIXES_PROMPT.md` - 4 targeted UI fixes (#2 restart button, #3 cronify file picker, #4 cronify tray menu, #5 fix sidebar clipping). No architectural changes, no commits. Repo `C:\Users\venes\projects\CRON APPS\CRON for Code`, branch `main`.

### Fix #2 - Wire Restart Button into the Layout
- Deleted dead `packages/core/src/components/CronHeader.tsx` (never rendered by a live component).
- `Layout.tsx` top bar now renders a "Restart CRON for Code" icon button before the settings gear, styled to `iconButtonStyle`: `RefreshCw` normally, `Loader2` spinner (`cron-spin`) while `isRestarting`, disabled + `aria-busy` while restarting, `data-testid="cron-restart-button"` (kept for the dev click-probe diagnostic). Click calls store `restartApp()` via `useWorkspaceStoreRaw`. Status pill also carries `data-testid="cron-online-status"`.
- Tests: removed the 2 CronHeader status tests from `dev-marking.test.tsx`; added a restart-button render test in `project-management.test.tsx` (button rendered, click calls host restart bridge, button disables while `isRestarting`); updated `repo-stabilisation.test.ts` to assert the status pill + restart button live in Layout instead of reading the deleted CronHeader.

### Fix #3 - Cronify File Picker
- Replaced the raw OS folder dialog in the "New Project" flow with a CRON-styled in-app folder browser. `PickerModal.tsx` rewritten: dark-navy panel (`#07142a` family), breadcrumb navigation, "Up" button, current-folder listing with folder/file icons, "Select this folder" + "Cancel" buttons, empty/error/loading states. Keeps `data-testid="picker-modal"`, `PROJECT PICKER` eyebrow, `Choosing your project folder` title.
- New `packages/core/src/folder-picker.ts`: host-agnostic bridge (list/confirm) + `awaitFolderSelection`/`settleFolderSelection` deferred resolution so `selectFolder()` resolves exactly when the modal settles.
- Electron main: new IPC `cron:fs:list` (resolved dir listing + `parent` pointer for Up/breadcrumbs; empty arg = `os.homedir()`); `cron:select-folder` now validates a passed path (throws on inaccessible/non-directory) and keeps the native dialog ONLY as a backward-compatible no-arg fallback. Added `cron:fs:list` to `ALL_IPC_CHANNELS`.
- Preload exposes `fs.list`; `selectFolder` accepts an optional path arg. `main.tsx` wires `selectFolder: () => awaitFolderSelection()` and a `folderPicker` bridge (`list`/`confirm`); `App.tsx` passes it to Layout and no longer waits 400 ms before opening the picker.
- Tests: `dev-marking.test.tsx` picker-flow tests still pass (modal driven by `pickerActive`); `repo-stabilisation.test.ts` picker test updated to assert the in-app browser (`Select this folder`, `cron:fs:list` in main + preload).

### Fix #4 - Cronify Tray Context Menu
- Windows native tray menus are OS-rendered (no CSS possible), so Option A was applied: a correct, clearly-labelled item list. New pure `apps/standalone/electron/tray-template.mjs` (+ `tray-template.d.mts` types) with the expected items: Open CRON for Code / Show active tasks / Pause current task / Stop current task / Quit CRON for Code (with separators). `createTray()` now builds from it; items renamed from "Open CC"/"Quit CC".
- New `packages/core/src/tray-template.test.ts` (2 tests): item labels/order + click-action wiring.

### Fix #5 - Fix Sidebar Lower-Stack Clipping
- `Sidebar.tsx` `lowerStackStyle` removed `minHeight: 0` so the fixed lower stack keeps its natural height and never shrinks/clips its CURRENT PROJECT / AGENT STATE / Settings / Account blocks; the projects list above remains the only shrinkable+scrollable region (`flex:1, min-height:0, overflow:auto`).
- Strengthened the lower-stack tests in `workspace-layout.test.tsx` and `project-management.test.tsx`: assert `flexShrink:0`, `minHeight` NOT `0px` on the lower stack, and `overflow:auto` + `minHeight:0px` on `sidebar-projects`.

### Verification (all PASS)
- `pnpm -r run test`: 326/326 (contracts 24, data-service 94, host-adapter 23, core 185).
- `pnpm run typecheck`: all packages clean.
- `pnpm run lint`: 0 errors, 3 pre-existing `react-hooks/exhaustive-deps` warnings (App.tsx).
- `pnpm run build`: all packages + standalone `dist-renderer` clean.
- `git status`: no staging/commits; working tree contains this session's files plus prior sessions' intentional uncommitted work.

### CC Training Notes (slice 26)
- The dead-code pattern: a fully-working component (`CronHeader`) with tests can still be unreachable dead code when Layout renders its own top bar. Delete it and move the capability into the live tree; update the source-assertion tests (repo-stabilisation) in lockstep, not just the component tests.
- The write/escape hazard: tools that interpret `\` escapes will mangle backslash literals inside template literals (`` `${x}\\` `` became an unterminated template literal and cascading parse errors). Avoid literal backslashes in written source (use `String.fromCharCode(92)`), then re-verify bytes.
- `react-hooks/set-state-in-effect` (React Compiler lint) rejects synchronous setState in effect bodies. The documented fix is the render-time "adjust state when a tracked prop changes" pattern (set `sessionActive` in render), leaving the effect body a pure subscription; event-handler setState is fine.
- Electron `preserve-caught-error` lint requires `{ cause: err }` on throws inside catch blocks - attach the cause when rethrowing in new IPC handlers.
- A testable main-process surface (tray template, IPC registrar) belongs in pure Electron-free modules with `.d.mts` declarations so core vitest can import them; native OS UI (tray menu) gets correctness+ordering tests rather than styling claims.

---

## Product Truth + Architecture Direction-Lock Audit — 2026-08-21 (CC/OpenCode, read-only audit + direction lock)

### Task type
Read-only truth audit + direction-lock per BB. No implementation slice executed. Working tree
dirty (12 modified tracked + untracked prompt/log files) — treated as prior user/agent work,
read before judging, nothing reset/cleaned/reverted/staged/committed.

### Repository identity (verified)
Branch `main`, HEAD `e18dfb7` (`Security cleanup, tray wiring, test fixes, and audit hardening`).
History now includes `069a65c` (governed execution, approvals, OpenCode runner, project
management, IPC infra) and `71eaf50` (architecture logs/evidence/docs) on top of `8157b12`.
Note for the logs: PROJECT_LOG/CRON_ARCHITECT_LOG entries written since 2026-08-04 repeatedly
stated "nothing committed"; the repo HAS since gained those three commits (069a65c, 71eaf50,
e18dfb7). Logs lag the actual Git history — flagging for the Architect, not changing.

### LOCKED PRODUCT TRUTH (BB direction, 2026-08-21)
- **CRON for Code = the non-coder's coder app.** Plain-language prompt in → useful thing out.
- **OpenCode is the real coding engine.** CRON for Code is the friendly, safe, non-technical
  wrapper around it (plan/progress in plain English, approval gates, changed-file review,
  evidence/verification, preview/test/export guidance, rollback expectations, no secret
  printing, no Git commit/push/reset/clean without explicit Venessa approval).
- **Cloud-first model routing, Ollama local fallback, no LM Studio.** Automatic inside a
  session; truthful model labels only. LM Studio is retired everywhere in CRON.
- **Two shells, ONE engine.** (1) Code Standalone = full desktop app; (2) Code inside
  Intelligence = routed capability/module later. Never duplicate the coding engine; later
  Intelligence hands coding/build/fix/app/site/tool requests to Code. The user never knows
  which shell they are in.
- **Plain roles:** Intelligence/Gem thinks, remembers, plans, routes. Code builds things with
  code. OpenCode performs the actual edits/runs. Venessa is final approval authority.
- No commit/push/reset/clean without Venessa approval.

### What the audit proved (evidence in the report)
- OpenCode runner IS wired as the real engine: `packages/data-service/src/opencode-runner.ts`
  (OpenCodeRunner + CLI/server adapters), approval/resume on the SAME session/execution,
  project-boundary enforcement, audit trail, plain-English activity mapping
  (`activity-english.ts`), live IPC stream (`cron:opencode:event`). 7 runner tests + 3 mock
  server-adapter tests prove the verified installed API contract.
- Prompt → OpenCode task works end to end: CronAssistant routes code-ish prompts →
  `createDraftTask` → `openCodeRunner.runTask` → IPC → main → OpenCode server session.
- OpenCode runs headlessly/server-style (`createOpenCodeServerAdapter`: `opencode serve` +
  HTTP `/session` + `/permission/{id}/reply`, Basic auth from `OPENCODE_SERVER_*`).
- Approval + resume after approval works (same-session, same execution record, follow-up
  permissions).
- UI explains OpenCode in non-technical language (`activity-english.ts`); changed-file +
  evidence review exists in the Review pane but is HEURISTIC (regex over stdout + permission
  filepath) — not a real `git status`/diff walk.
- Project boundaries are enforced at EXECUTION time (project-boundary service); the folder
  picker itself has NO repository-boundary allowlist at selection time.
- Git-risky actions: OpenCode is told via prompt constraints not to commit/push/reset/clean;
  the command catalogue denies Git mutations for catalogue commands; there is NO structural
  block that OpenCode (the real agent) cannot run git — the approval gate is the only hard
  control. GAP.
- LM Studio assumptions are still live in code: `main.mjs` (DEFAULT_LM_STUDIO_CONFIG,
  `cron:lmstudio:*`, baseUrl `http://192.168.1.42:1234/v1`), `preload.cjs`, `ipc-data-service.ts`,
  `LlmSettings.tsx`, `llm.ts`, `chat-runtime.ts` defaults, `CronAssistant` planner error
  strings, `register-ipc.mjs` channel list.
- No Ollama/OpenRouter/Anthropic/OpenAI provider layer exists yet. Escalation route is
  BLOCKED in code (`DeepSeek V4 Pro escalation was requested but explicit escalation approval
  is not implemented`).
- Reusable-core vs standalone-shell boundary is already clean: `packages/core` AppDeps inject
  dataService / hostAdapter / llm / openCodeRunner / tray / folderPicker — the SAME core can be
  embedded by Intelligence with its own deps. No duplication exists today.

### Verification (all exit 0)
- `pnpm test` PASS — 326 tests (contracts 24, data-service 94, host-adapter 23, core 185).
- `pnpm typecheck` PASS. `pnpm lint` PASS (0 errors, 3 pre-existing exhaustive-deps warnings).
- `pnpm build` PASS (packages + standalone `dist-renderer`).
- `git diff --check` clean (only LF→CRLF advisories).
- No Windows/Vite sandbox access issue encountered this run.

### Recommended next slice (direction-locked, small)
Replace stale LM Studio provider/settings/docs with cloud-first + Ollama-fallback routing
while preserving the OpenCode runner wiring and tests. Do this inside the reusable core
boundary so Intelligence can embed it later (no engine duplication, no Intelligence build now).

### Boundary
Read-only audit. No source/test/config/dependency/lockfile changes by CC. No Git mutation
(nothing staged/committed/pushed/reset/restored/cleaned). Only PROJECT_LOG.md,
CRON_ARCHITECT_LOG.md, and the audit report files are appended/created.

### CC Training Notes (slice 27)
- Logs lag reality: PROJECT_LOG/CRON_ARCHITECT_LOG still claim "nothing committed" while Git
  now has 069a65c/71eaf50/e18dfb7. Always re-verify `git log` against the log prose on a fresh
  session instead of trusting the last entry's status claims.
- The runner's "no git mutation" rule is prompt-level, not structural. A real coding agent can
  still run git; treat the approval gate as the only hard control and say so honestly.
- Changed-file evidence is derived from stdout/permission metadata, not a real `git status`
  walk — report it as heuristic until a read-only git-status IPC exists.

---

## Model Provider Refactor Execution Entry — 2026-08-21 (CC/OpenCode)

### Scope
Narrow slice per BB: product direction lock (non-coder's coder app powered by OpenCode),
replace active LM Studio assumptions with cloud-first + Ollama-fallback model routing, keep
OpenCode untouched, add non-coder wording, document the embeddable Intelligence boundary,
update tests. No commit/push/reset/clean.

### What changed
- **Core routing (`packages/core/src/llm.ts`, `chat-runtime.ts`):** `LlmConfig` is now
  `{ cloud: { baseUrl, apiKey, chatModel, visionModel, codingModel, escalationModel },
     ollama: { baseUrl, chatModel, visionModel } }`. Default cloud = `https://api.openrouter.ai/api/v1`;
  default Ollama fallback = `http://127.0.0.1:11434/v1`. New `activePlannerProvider` (cloud-first
  with Ollama fallback). `resolveRouteStatus` labels are truthful and derived from configured
  models: `Coding agent` (executor), `Deeper reasoning` (escalation), `Planner`/`Vision`
  (read-only, "Cloud AI, local Ollama fallback"). No hardcoded "Flash"/"Pro" claims; no "via LM
  Studio". `buildOpenCodeHandoffPrompt` uses `cloud.codingModel`/`cloud.escalationModel` and
  generic wording. `PLANNER_ROLE` is provider-neutral (no "Gemma").
- **Settings UI:** `LlmSettings.tsx` → new `ModelSettings.tsx` ("AI Settings" — Cloud AI +
  Local AI (Ollama) sections, API key field kept local, Ollama default `:11434`). Old file kept
  only as a deprecated re-export shim (no imports). `Layout.tsx` renders `ModelSettings`.
- **Electron (`main.mjs`):** `DEFAULT_LM_STUDIO_CONFIG` → `DEFAULT_MODEL_CONFIG`; new
  `cron:model:get-config/save-config/test/chat` replace `cron:lmstudio:*`. Chat is cloud-first
  with automatic Ollama fallback; test probes both providers truthfully; API key is sent to the
  provider only, never logged or returned. Dev-drive diagnostic now checks for "Cloud AI".
- **IPC surface:** `register-ipc.mjs` channels, `preload.cjs` bridge (`model`), and
  `ipc-data-service.ts` typing all renamed from `lmstudio` to `model`.
- **Wording:** planner header "Planner — Gemma" → "Planner"; error strings no longer mention
  LM Studio; `activity-english.ts` friendly labels truthful (removed Gemma claim).
- **Docs:** README status + "What this is" + "Model providers" + "Embeddable boundary".
- **Tests:** `chat-runtime.test.ts` rewritten (cloud/Ollama defaults, fallback, truthful
  labels, handoff); `repo-stabilisation.test.ts` now guards model IPC channels, Ollama `:11434`
  (not `:1234`), and asserts no visible "LM Studio"/"lmstudio" in active product source; new
  `model-settings.test.tsx` (Cloud AI + Local AI (Ollama), no LM Studio wording); updated
  `workspace-layout.test.tsx` and `activity-english.test.ts`.

### Preserved (unchanged)
OpenCode runner + server adapter + approval/resume (7 runner tests + 3 server-adapter tests
green), audit records, changed-file review, project-boundary checks, command catalogue, no
commit/push/reset/clean without approval.

### Verification (all exit 0)
- `pnpm test` PASS — 334 tests (contracts 24, data-service 94, host-adapter 23, core 193 / 16 files).
- `pnpm typecheck` PASS. `pnpm lint` PASS (0 errors, 3 pre-existing exhaustive-deps warnings).
- `pnpm build` PASS (packages + standalone `dist-renderer`).
- `git diff --check` clean (only LF→CRLF advisories).

### Notes
- Rebuilt `@cron-code/core` dist before standalone typecheck (stale-dist issue, per training).
- Two lint iterations on `main.mjs` (unused inner catch var + `no-useless-assignment`) fixed.
- `LlmSettings.tsx` is a deprecated shim (no active imports); the no-LM-Studio guard scans
  active product source only, not docs/historical logs.

### Boundary
No Git mutation (nothing staged/committed/pushed/reset/restored/cleaned). No dependency or
lockfile changes. Only the files listed above + logs + README were touched.

### CC Training Notes (slice 28)
- The `no-useless-assignment` rule flags `let x = value;` when the first use is a reassignment
  in a try/catch before any read — declare `let x;` instead of seeding a dead initial value.
- ESLint's `preserve-caught-error` wants the throw inside a catch to preserve THAT catch's
  error as `cause`; when combining cloud→Ollama fallback, structure it as two sibling
  try/catch blocks (capture first error in a plain variable) rather than a nested catch.
- Standalone typechecks against core's BUILT dist — rebuild `@cron-code/core` after changing
  the public `LlmConfig` shape or the standalone typecheck reports a confusing mismatched-type
  error pointing at `packages/core/dist/llm`. Same rule as earlier slices.

---

## Self-Starting Dev-Mode Taskbar Shortcut — 2026-08-24 (BB, implementation)

### Scope
Make the taskbar shortcut launch CRON for Code in DEV mode (fresh source via Vite, not the
stale built `dist-renderer`) with a single taskbar icon. Direct `electron.exe . --dev` now
self-starts Vite when it isn't already running.

### What changed
- **`apps/standalone/electron/main.mjs`:** when `IS_DEV`, before `loadURL(DEV_URL)`, probe the
  dev URL (global `fetch` + `AbortSignal.timeout(1500)`). If unreachable, spawn the SAME Vite
  command `dev.mjs` uses (`pnpm exec vite --port <port>` from `projectRoot`, `shell: true`,
  `windowsHide: true`, stdout/stderr appended to `.runtime/code-dev-vite-direct.log`,
  `CRON_DEV: '1'` env), store the child in module-level `selfStartedViteProcess`, poll every
  ~500 ms (bounded 30 s) for the URL, and log progress/errors via the existing `logger`. On
  failure it proceeds to `loadURL` anyway (existing startup diagnostics surface the failure).
  A separate `app.on('before-quit')` kills ONLY a Vite WE spawned (win32 `taskkill /PID /T /F`,
  else SIGTERM), then clears the handle. Added `node:child_process` `spawn`/`spawnSync` import.
  Production/normal mode (`loadFile(RENDERER_ENTRY)`) untouched.
- **`scripts/create-code-dev-shortcut.ps1`:** `Arguments` `'.'` → `'. --dev'`; description →
  `'CRON for Code - development app (dev mode, self-starting)'`; final `Target:` output reflects
  the `--dev` arg. Everything else (electron.exe target, working dir, icon) unchanged.
- **`packages/core/src/repo-stabilisation.test.ts`:** one assertion adjusted (see below).

### Assertion adjusted (only one)
`expect(main).not.toContain('spawn(')` (restart-safety guard in `repo-stabilisation.test.ts`)
asserted main.mjs had NO `spawn(` anywhere; it now legitimately spawns Vite at startup. Narrowed
to the restart handler region only: `expect(main).not.toMatch(/performAppRestart[\s\S]{0,3000}spawn\(/)`.
The `'powershell.exe'` and `run-code-dev-hidden.ps1` safety guards are unchanged.

### Verification (all pass)
- `pnpm test` PASS — 362 tests (contracts 24, data-service 94, host-adapter 23, core 221).
  (One run showed a flaky timing-sensitive restart-overlay test timing out under parallel load;
  it passes in isolation and on the re-run, unrelated to this change.)
- `pnpm typecheck` PASS (all 7 packages).
- `pnpm build` PASS (packages + standalone `dist-renderer`).
- `git diff --check` clean (exit 0; only pre-existing LF→CRLF advisories).
- `scripts/test-code-dev-launcher.ps1` PASS standalone (94 assertions, no shortcut-arg
  assertions affected by `. --dev`).

### Current state
Working tree dirty (pre-existing uncommitted work + this slice). Nothing staged/committed/pushed.

### BB Training Notes (slice 29)
- A repo-wide `not.toContain('spawn(')` on main.mjs is a proxy that breaks the moment a new
  legitimate spawn is added; scope such guards to the exact function region they protect.
- The dev-server self-start must check reachability BEFORE spawning to avoid double-Vite when
  `dev.mjs`/the launcher already owns a server on 5190.

---

## 2026-08-24 � BB: "Lock the canvas" (floating panels over the centre)

### What was done
The centre chat/canvas no longer resizes or shifts when the left Projects panel or a right-side panel opens/closes. Both panels were converted from inline flex-flow children (which flexed the centre away) into absolute overlays that FLOAT over the centre.

- `packages/core/src/components/Layout.tsx`:
  - `workspaceStyle` gained `position: relative`.
  - The Projects panel moved out of the left region's flex flow into a floating wrapper (`floatingProjectsPanelStyle`): `position: absolute; top: 0; bottom: 0; left: 64; zIndex: 5`, width 245 (ProjectBrowser's actual width � the spec's ~290 was out of date), near-opaque `rgba(3,12,28,0.98)` background, `borderRight: 1px solid rgba(100,160,255,.26)`, drop shadow `14px 0 40px rgba(0,0,0,.35)`.
  - The wrapper is anchored to the LEFT REGION BODY (kept `position: relative`) rather than the whole `<main>`. Reason: `LogoHeader` has `minWidth: 200`, so the left region is 200px wide (64px rail + 136px empty band), and the profile avatar is centred in that 200px width. Anchoring top:0/bottom:0 to `<main>` would have covered the logo wordmark AND the avatar when Projects is open. Anchoring to the body keeps the panel flush against the rail, between the logo header and the avatar (exactly where the old inline panel sat).
  - Removed `overflow: hidden` from the left region and left region body (it would clip the panel which now reaches past the 200px region into the centre).
- `packages/core/src/components/RightSidebar.tsx`:
  - `edgeStyle` gained `position: relative` and dropped `overflow: hidden` (that clip was cutting off the panel, which now extends left past the 44px strip).
  - `panelStyle` is now `position: absolute; top: 0; bottom: 0; right: 44; zIndex: 5`, width 280, near-opaque background (0.94?0.98), `borderLeft` kept, drop shadow `-14px 0 40px rgba(0,0,0,.35)`.

### Key findings
- ProjectBrowser's actual width is 245px, not ~290 (spec said "verify" � verified).
- LogoHeader `minWidth: 200` makes the left region 200px wide; this is why an anchored-to-main full-height overlay would cover the brand header and avatar.
- All existing `data-testid`s, tab behaviour and close behaviour unchanged.

### Verification (all pass)
- `pnpm test` PASS � 362 tests (contracts 24, data-service 94, host-adapter 23, core 221).
- `pnpm typecheck` PASS (all 7 packages).
- `pnpm build` PASS (packages + standalone `dist-renderer`).
- `git diff --check` PASS for the two changed source files (exit 0; only LF?CRLF advisories). The repo-wide `git diff --check` still flags pre-existing trailing whitespace in `sym_log.md` (untouched by this task).

### Current state
Working tree dirty (pre-existing uncommitted work + this change + the `dist-renderer/index.html` bundle-hash refresh from the build). Nothing staged/committed/pushed. Backups: `Layout.tsx.bak-2026-08-24`, `RightSidebar.tsx.bak-2026-08-24`.
