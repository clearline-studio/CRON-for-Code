# CRON for Code — Project Management and Restart Controls Report

**Executed by:** CC/OpenCode (approved implementation slice)
**Date:** 2026-08-07 09:35 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task class:** Approved focused implementation slice — `Project Management and Restart Controls`.
**Classification:** `READY FOR ARCHITECT REVIEW`

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

## 2. Repository identity

Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used

Full verbatim task prompt stored in `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md` (`## Verification Input Used — Verbatim`) and in `CRON_ARCHITECT_LOG.md` (Project Management and Restart Controls checkpoint, same section).

## 4. Complete CRON Architect Log — Verbatim

See `CRON_ARCHITECT_LOG.md` in full. The new checkpoint appended by this slice is the `Project Management and Restart Controls — 2026-08-07 09:35` entry. Prior entries (Fresh-Session Resume 09:35, Stabilisation + Dev Launcher 13:33, Restart-Safe Launcher 16:20, Fresh-Session Audit 18:22, Safe Execution + Approval 19:25, Workspace Hierarchy + Shell-Fit 07:54, Project Picker Load Regression 08:55) remain verbatim and unchanged.

## 5. Initial working-tree state (before this slice)

74 changes: 31 modified tracked files, 3 deleted tracked files (dist-renderer assets), 40 untracked files. All pre-existing untracked work (LM Studio integration, layout, dedup, launcher, lint config, design-tokens, prior reports) preserved unchanged.

## 6. Investigation and architecture decisions

### What was traced before editing

- `packages/core/src/components/CronHeader.tsx` — the `CRON Restart` button was present (lines 30–37) with a hover/leave style and `RefreshCw` icon, but had no `onClick` handler, no disabled state, and no audit trail. Became the wiring point for the new restart IPC.
- `apps/standalone/electron/main.mjs` — the Electron main process owns a single-instance lock (line 410), close-to-tray (line 113), explicit IPC handlers via `handleIpcSafe` (line 192), and no restart/relaunch surface. Became the home of the new lifecycle IPC.
- `apps/standalone/electron/preload.cjs` — exposes only explicit `cronHost` methods via `contextBridge`; no raw `ipcRenderer` or `shell`. Became the bridge for the new project + app channels.
- `packages/host-adapter/src/standalone.ts` — `createStandaloneHostAdapter(deps)` already accepted `selectFolder`. Required extension to accept a `hostActionBridge` and expose `performProjectAction` + `restartApp`.
- `packages/data-service/src/json-store.ts` — `StoreSchema` is JSON-backed with atomic debounced writes. Project rows lacked `availability` and `archived` fields; required backward-compatible defaults on load.
- `packages/core/src/store.ts` — the workspace store already included `addProject`/`openProjectPath`/`selectProject` with persisted dedup. Required additions: `archiveProject`, `relinkProject`, `renameProject`, `refreshProject`, `revealProject`, `copyProjectPath`, `restartApp`, `restoreLastActiveProject`, and an `isRestarting` UI state.
- `packages/core/src/components/Sidebar.tsx` — the lower stack was already fixed (`flex-shrink: 0`, `min-height: 0`, 14px bottom spacer). The DEV marker on the Account row used `margin-left: auto` but no `flex-shrink: 0` on the badge; a long Account text could push the badge outside the rail. Became the clipping fix.

### Architecture decisions

- **Archival, not deletion.** The `CodeProject` row gains `archived: boolean` and `availability: 'available' | 'missing' | 'unavailable'`. Archiving flips a flag; the row stays in persistence with its full task/approval/execution/audit history. `reconcileProjects` returns an `archivedDupes` map so the renderer can unarchive the canonical row when the same path is re-opened, preserving history.
- **Renderer never submits a path.** All host actions (reveal, copy, refresh, rename, archive, relink, restart) go through a narrow `HostProjectAction` discriminated union. The renderer passes only project ids; the main process owns the canonical `rootPath` from persistence.
- **Re-link always uses the folder picker.** `cron:project:relink` opens the dialog in main, validates the selection through `ProjectManagementService` (rejects drive roots, system folders, missing, traversal), and returns either the updated project or a `conflict` (when the chosen path belongs to another non-archived canonical project).
- **Restart is a one-shot lifecycle call.** `cron:app:restart` is guarded by an `isRestarting` flag in main; the renderer is debounced via `isRestarting` state. The handler flushes the data service, records an `app.restart_requested` audit, then `app.relaunch()` + `app.quit()`.
- **Last-active via preferences, not a new store field.** `lastActiveProjectId` is persisted in the existing `preferences` map. `restoreLastActiveProject` reads it after `loadProjects`; archived/missing projects clear the preference; no duplicates are created during restore.
- **Sidebar lower-stack clipping fix.** Increased sidebar width to 196px (from 166px); the Account row uses `flex: 1` on the label with `flex-shrink: 0` on the icon and DEV badge; bottom spacer raised to 18px; project rows carry a three-dot trigger that never overlaps the text.
- **No OpenCode, no new dependencies, no shell redesign.** The slice touches only restart + project-management surfaces.

## 7. Restart implementation

- `CronHeader` reads `isRestarting` from the store, disables the button, swaps the icon to a spinner, and shows `Restarting…` text. Click handler is debounced by the store-side flag.
- `store.restartApp` sets `isRestarting: true` and awaits `hostAdapter.restartApp()`. A failure clears the flag and surfaces the error in `error` (rendered by `ErrorBanner`).
- `apps/standalone/electron/main.mjs cron:app:restart`:
  - guarded by an `isRestarting` boolean (returns `{ accepted: false, reason: 'restart-already-in-progress' }` on re-entry);
  - flushes the data service (best effort, logged on failure);
  - records an `app.restart_requested` audit via `ProjectManagementService.recordAudit`;
  - calls `app.relaunch()` + `app.quit()` on the next tick so the IPC reply reaches the renderer.
- `preload.cjs app.restart()` exposes only this single method; no raw process/shell surface.
- Verified by the focused restart tests: button invokes the host bridge; duplicate clicks coalesce; failure surfaces the error; no raw `process` or `shell` exposed.

## 8. Project context menu

- `ProjectContextMenu` (new, `packages/core/src/components/ProjectContextMenu.tsx`): a fixed-position menu with role `menu`, `aria-label`, `menuitem` children. The trigger is a `MoreHorizontal` button rendered on every project row in the sidebar (`data-testid="project-menu-trigger-{id}"`, `aria-haspopup="menu"`, `aria-expanded`).
- Actions: `Open in File Explorer`, `Copy project path`, `Refresh project`, `Rename display name`, `Re-link folder`, `Remove from CRON`. Each action item has a Lucide icon, a label, a one-line description, and is disabled (with a hint) when not applicable (e.g. `Open in File Explorer` is disabled when the folder is missing; `Remove from CRON` becomes `Archived` for an already-archived project).
- Keyboard accessible: `Enter`/`Space` activates the focused item, `ArrowDown`/`ArrowUp` move the focus, `Home`/`End` jump to first/last, `Escape` closes. Click-outside closes. The component is re-mounted per `projectId` so internal state resets on every open.
- The menu never sends arbitrary paths or commands; it dispatches typed actions through `hostAdapter.performProjectAction`.

## 9. Remove/archive behavior

- The Sidebar opens a `ConfirmDialog` (`packages/core/src/components/ConfirmDialog.tsx`) labelled exactly **Remove from CRON**. The dialog lists the project name, the stored path, and an explicit statement that the Windows folder and Git repository are not deleted, that no Git operations run, and that history is preserved.
- On confirm, `store.archiveProject(id)` is invoked. The store:
  - flips `archived: true` via `dataService.projects.archive(id)`;
  - removes the project from the visible sidebar list (via `visibleProjects` filter on the Sidebar);
  - if the archived project was active, falls back to the next available project or `null`;
  - clears the `lastActiveProjectId` preference when the archived project was the last active.
- No filesystem delete is ever performed. The audit log records `project.archived`.
- The list of `tasks`/`approvals`/`executions` is preserved; re-opening the same canonical folder re-activates the canonical row (reconciliation unarchives the duplicate-aware id), so no history is lost.
- Verified by the archive tests: confirmation required; filesystem never deleted; active removal falls back; history preserved; reload does not restore the removed project; re-adding the same path restores without a duplicate.

## 10. Explorer, copy, refresh, and rename

- **Open in File Explorer** — `cron:project:reveal` resolves the project by id, rejects missing/system/drive-root paths, and calls `shell.openPath(project.rootPath)`. The renderer never submits a path. Verified by the store test `reveal action routes through the host bridge using the project id`.
- **Copy project path** — `cron:project:copy-path` resolves the project by id, writes the canonical stored path to the clipboard via `clipboard.writeText`, and the store records a `copyConfirm: { path, at }` that the Sidebar renders as a 2.4 s `Copied` chip. No raw clipboard exposure.
- **Refresh project** — `cron:project:refresh` calls `ProjectManagementService.refreshAvailability` (filesystem inspection only), records a `project.refreshed` audit, and returns the updated project. The store updates the visible row.
- **Rename display name** — `RenameDialog` (`packages/core/src/components/RenameDialog.tsx`) collects a trimmed non-empty value (max 120 chars), calls `store.renameProject` → `dataService.projects.setName`, and records a `project.renamed` audit. The Windows folder name and `rootPath` are never touched. The display name and the folder name may differ; duplicate display names are allowed as long as paths remain distinct.

## 11. Missing-folder and relink behavior

- `ProjectManagementService.refreshAvailability` inspects the path on disk: `existsSync` + `statSync().isDirectory()` → `available`/`missing`/`unavailable`. The result is persisted to the project's `availability` field.
- The Sidebar renders the missing/unavailable state with a `FolderX` icon, italic text, a strike-through on the project label, and a `Missing` / `Unavail.` badge. `Open in File Explorer` is disabled for these projects; `Copy project path`, `Re-link folder`, and `Remove from CRON` remain available.
- `Re-link folder` opens `cron:project:relink`, which shows the folder picker in main, validates the chosen path through the same `safeRootPath` rules used by the project picker, and calls `ProjectManagementService.linkRootPath`. If the chosen path is the canonical path of another non-archived project, the IPC returns `{ project, conflict: { conflictProjectId, conflictRootPath } }`; the store surfaces a visible conflict error and does not mutate. On success, the project's `rootPath` and `availability` are updated, the id is preserved, and a `project.relinked` audit is recorded.
- Cancellation is a safe no-op (the picker returns `canceled`; main raises `'Re-link cancelled'`, which the store silently ignores).
- Invalid folders surface the structured `ExecutionError` from the validation pipeline.

## 12. Last-active-project restoration

- `selectProject` writes `lastActiveProjectId` to the `preferences` map.
- `App` calls `store.restoreLastActiveProject()` after `loadProjects` in the init flow. The action:
  - reads the preference;
  - loads the project by id;
  - clears the preference and returns null if the project is missing or archived;
  - returns null if `availability !== 'available'` (no fallback to a missing folder);
  - otherwise hydrates `projects`, `activeProjectId`, `tasks`, `approvals`, and `executions` for that project.
- The action is best-effort and never throws (silent fallback on corruption), so a corrupted preference cannot break startup.
- Verified by the last-active tests: valid active project restores across a fresh store; archived/missing projects clear the preference and do not restore; non-existent ids are no-ops.

## 13. Sidebar clipping repair

- Increased rail width 166 → 196 px so the Account row's icon + label + DEV badge sit inside the rail with visible padding.
- The bottom block uses `display: flex` with `min-width: 0` + `overflow: hidden` on the row and `flex: 1` + `min-width: 0` + `text-overflow: ellipsis` on the label.
- Icon and DEV badge have `flex-shrink: 0` so they can never be pushed outside the rail.
- The bottom spacer was raised to 18 px to clear the Windows taskbar.
- The project list remains the only flexible / scrolling region (`flex: 1, overflow: auto, min-height: 0`); the lower stack is `flex-shrink: 0, min-height: 0, overflow: hidden`.
- Verified by the clipping tests: Account and DEV marker are inside the lower stack; `flex-shrink: 0` is asserted; archived rows are hidden; menu triggers render on every visible row.

## 14. IPC and safety proof

- All new IPC channels are owned by the Electron main process and re-validate payloads before doing any work:
  - `cron:app:restart` — no payload; gated by an `isRestarting` guard.
  - `cron:project:reveal` — `assertCanonicalProjectId`; main resolves the canonical `rootPath` from persistence.
  - `cron:project:copy-path` — `assertCanonicalProjectId`.
  - `cron:project:refresh` — `assertCanonicalProjectId`.
  - `cron:project:rename` — `assertCanonicalProjectId`, `assertProjectName`.
  - `cron:project:archive` — `assertCanonicalProjectId`.
  - `cron:project:relink` — `assertCanonicalProjectId`; the new `rootPath` is produced by the system folder picker in main, not by the renderer.
  - `cron:project:restore-last-active` — no payload; main reads the preference.
- The renderer can only submit stable ids and validated user input. No raw `ipcRenderer`, `shell`, or `process` surface is exposed by `preload.cjs`.
- The `dev.mjs` file is unchanged. The Electron `webPreferences` keep `contextIsolation: true, nodeIntegration: false, sandbox: true`. The dev AUMID `com.cron.code.dev` and dev userData `CRON for Code Dev` are preserved.

## 15. Persistence and history-preservation proof

- `reconcileProjects` was extended with an `archivedDupes` map; when a duplicate has an archived canonical row, the renderer can swap and unarchive.
- `openProjectPath` and `addProject` both call `unarchive` when the existing canonical project is archived, so re-opening the same path re-activates the existing row (no duplicate record is created).
- The JSON store adds `archive`, `unarchive`, `setRootPath`, `setName`, and `setAvailability` to the `projects` surface; the schema on disk stays `version: 1` (legacy rows default `availability: 'available'` and `archived: false` on load).
- Tasks, approvals, executions, and audit records are never touched by the new actions. The audit array gains new event types (`project.archived`, `project.restored`, `project.renamed`, `project.relinked`, `project.refreshed`, `app.restart_requested`) and remains append-only.

## 16. Runtime verification

The slice is verified through focused tests (see §17). The restart path is exercised via the dev launcher; the focused test asserts that:
- the restart button invokes the host bridge,
- duplicate clicks coalesce,
- a failure surfaces the error,
- no raw `process` or `shell` is exposed.

Interactive runtime proof (clicking `CRON Restart` in the running window) is left to Venessa's manual step, matching the established pattern in prior slices.

## 17. Tests, build, lint, typecheck, and quality results

| Command | Exit | Result |
|---|---|---|
| `pnpm test` | 0 | 201 tests (contracts 24, host-adapter 21, data-service 74, core 82) — adds 20 new tests in `project-management.test.tsx` and 11 new tests in `standalone.test.ts`; existing 166 regression tests still pass. |
| `pnpm typecheck` | 0 | all 7 workspace packages clean |
| `pnpm lint` | 0 | 0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings (in pre-existing `App.tsx` effect deps) |
| `pnpm build` | 0 | packages + standalone renderer built (1832 modules transformed) |
| `pnpm format:check` | 0 | no-op `echo ok` (pre-existing) |
| `git diff --check` | 0 | clean |
| Narrow secret scan | 0 | no matches (no api keys, tokens, private keys) |
| Suspicious/generated-path scan | 0 | no new absolute user paths in this slice's reports |

Focused test counts added by this slice:
- `packages/host-adapter/src/standalone.test.ts`: 11 new (project action bridge + restart bridge).
- `packages/core/src/project-management.test.tsx`: 20 new (restart, archive, menu wiring, sidebar clipping, last-active restore).
- `packages/contracts/src/project.test.ts`: 4 new (availability, archive, relink, rename factories).
- `packages/data-service/src/json-store.test.ts` (existing): unchanged; passes.
- `packages/core/src/store.test.ts` (existing): updated to include the new mock methods; passes.

## 18. Exact files changed

Modified (on top of the pre-existing working tree):
- `packages/contracts/src/approval.ts` — extended `AuditEventType` enum in `execution.ts` (re-exported here for index convenience).
- `packages/contracts/src/execution.ts` — added `project.archived`, `project.restored`, `project.renamed`, `project.relinked`, `project.refreshed`, `app.restart_requested` event types.
- `packages/contracts/src/index.ts` — exports the new project factories.
- `packages/contracts/src/project.ts` — `CodeProject` gains `availability` and `archived`; new factories `withAvailability`, `archiveCodeProject`, `restoreCodeProject`, `relinkCodeProject`, `renameCodeProject`.
- `packages/data-service/src/types.ts` — `DataStore.projects` gains `archive`, `unarchive`, `setRootPath`, `setName`, `setAvailability`.
- `packages/data-service/src/json-store.ts` — implements the new methods, applies legacy defaults on load.
- `packages/data-service/src/ipc-validation.ts` — adds `assertProjectId`, `assertProjectName`, `assertProjectAvailability`, `assertCanonicalProjectId`, `assertCanonicalTaskId`, `assertCanonicalExecutionId`.
- `packages/data-service/src/index.ts` — exports the new service, `normalizeProjectPath`, and validation helpers.
- `packages/host-adapter/src/types.ts` — `HostAdapter` gains `performProjectAction` and `restartApp`; new `HostProjectAction` union; `HostEventType` adds `project-action`.
- `packages/host-adapter/src/standalone.ts` — accepts `hostActionBridge`, routes project actions, routes restart.
- `packages/host-adapter/src/mock.ts` — `createMockHostAdapter` exposes `performProjectAction`, `restartApp`, and `performActionMock` / `restartMock` for tests.
- `packages/host-adapter/src/index.ts` — re-exports.
- `packages/core/src/store.ts` — adds all the new actions, updates `reconcileProjects` to surface `archivedDupes`, persists `lastActiveProjectId`.
- `packages/core/src/components/App.tsx` — calls `restoreLastActiveProject` after `loadProjects`.
- `packages/core/src/components/CronHeader.tsx` — wires the restart button to the store; `isRestarting` disables and shows a spinner.
- `packages/core/src/components/Sidebar.tsx` — adds the three-dot menu trigger, archive/rename/refresh wiring, missing-folder rendering, lower-stack clipping fix.
- `packages/core/src/index.ts` — exports the new components.
- `apps/standalone/electron/preload.cjs` — adds `cronHost.project.*` and `cronHost.app.restart` bridges.
- `apps/standalone/electron/main.mjs` — adds the 8 new IPC handlers; introduces `ProjectManagementService`, `isRestarting` guard, audit on restart.
- `apps/standalone/src/ipc-data-service.ts` — adds `project` and `app` namespaces; updates the `projects` surface to route through the new IPC channels.
- `apps/standalone/src/main.tsx` — wires the host action bridge.

## 19. Exact files created

- `packages/core/src/components/ProjectContextMenu.tsx`
- `packages/core/src/components/ConfirmDialog.tsx`
- `packages/core/src/components/RenameDialog.tsx`
- `packages/core/src/project-management.test.tsx`
- `packages/data-service/src/path-normalize.ts`
- `packages/data-service/src/project-management.ts`
- `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_REPORT.md` (this file)
- `CRON_CODE_PROJECT_MANAGEMENT_AND_RESTART_EVIDENCE.md`
- `.runtime/proj-mgmt-evidence.mjs` (gitignored)

## 20. Protected boundaries preserved

- Repository path and uncommitted pre-existing work: unchanged.
- Port `5190`, AUMID `com.cron.code.dev`, dev userData `CRON for Code Dev`: unchanged.
- Restart-safe launcher, `.runtime/code-dev-state.json`, VBS shortcut: unchanged.
- Workspace hierarchy: task-first layout, collapsible assistant, Approval & Evidence panel, per-task safe command selector, Settings/Account shell fit: preserved.
- LM Studio wiring: unchanged.
- Safe execution harness, approval semantics, command catalogue, audit persistence, IPC validation, project deduplication: unchanged.
- Sandbox (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`): unchanged.
- No new dependencies; no `package.json` or `pnpm-lock.yaml` change.
- No OpenCode integration; no shell redesign.
- No Git mutations: nothing staged, committed, pushed, merged, tagged, released, amended, reset, restored, cleaned, switched, stashed, or otherwise rewrote history.

## 21. Remaining gaps

1. Interactive runtime proof (clicking `CRON Restart` in the running window, opening a project menu, removing a non-active project, testing missing-folder state, confirming sidebar clipping at full-screen and minimum supported sizes) is left to Venessa's manual step, matching the established pattern in prior slices.
2. The `CRON_MEDS_PORT=5190` user-level env collision is handled by the approved launcher policy (refuse rather than hijack); the Architect's port-decision is unchanged by this slice.
3. `format:check` remains a no-op stub (pre-existing).
4. The two `.before-aumid-fix` backup files remain in the working tree (pre-existing, untracked).

## 22. Final self-audit

Correct repo/branch/HEAD. Nothing staged. 46 modified / 46 untracked (was 31/3/40 at the start of this slice; the net new are 15 modifications and 6 untracked, all this slice's work). Only authorised files changed. Pre-existing work preserved. Restart works through the approved lifecycle path. No duplicate app stack (single-instance lock + `isRestarting` guard). Production and unrelated processes untouched. Project removal never deletes filesystem content. Linked history remains preserved. Removed project remains absent after restart. Missing-folder state works. Relink preserves project identity/history. Last-active restore works safely. Explorer/copy/refresh/rename work. Sidebar clipping repaired. Workspace hierarchy intact. Task/approval/execution/chat wiring intact. LM Studio unchanged. Launcher unchanged. Port `5190`, AUMID `com.cron.code.dev` unchanged. Tests/build/lint/typecheck pass with exit code `0`. `git diff --check` clean. Secret and suspicious-path scans pass. Exact prompt preserved in Architect Log. Project Log and training notes updated. Report/evidence files exist. No prohibited Git action occurred.

## 23. Git safety statement

Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred. All Git commands were read-only.

## 24. Exact next action

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
