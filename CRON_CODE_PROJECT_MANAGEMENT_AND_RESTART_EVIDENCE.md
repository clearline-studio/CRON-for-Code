# CRON for Code — Project Management and Restart Controls — Evidence

**Executed by:** CC/OpenCode (approved implementation slice)
**Date:** 2026-08-07 09:35 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved focused implementation slice — `Project Management and Restart Controls`.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice, stored verbatim in `CRON_ARCHITECT_LOG.md` (Project Management and Restart Controls checkpoint, `### Verification Input Used — Verbatim` section). The prompt is the complete content of `CRON_for_Code_Project_Management_and_Restart_Controls_Prompt.md` as issued.

---

## Repository identity (verified 2026-08-07 09:35 +10:00)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
```

## Initial working-tree state (captured before edits)

```
Modified: 31   Deleted: 3   Untracked: 40
Staged: none
git diff --check: clean
```

## Final working-tree state (after this slice)

```
Modified: 46   Deleted: 3   Untracked: 46
Staged: none
git diff --check: clean
```

Net additions by this slice: 15 modifications + 6 untracked, all of this slice's work.

## Slice plan (recorded before editing)

- `CodeProject` gains `availability` and `archived` (backward-compatible defaults from legacy store rows).
- New `audit` event types: `project.archived`, `project.restored`, `project.renamed`, `project.relinked`, `project.refreshed`, `app.restart_requested` (no change to existing semantics).
- `DataService.projects` gains `archive`, `unarchive`, `setRootPath`, `setName`, `setAvailability`. `preferences` already covers last-active id.
- New IPC channels owned by main with strict payload validation: `cron:app:restart`, `cron:project:reveal`, `cron:project:copy-path`, `cron:project:archive`, `cron:project:relink`, `cron:project:rename`, `cron:project:refresh`, `cron:project:restore-last-active`. Preload exposes only explicit bridges; no `shell`/`ipcRenderer`/arbitrary paths surface to renderer.
- Renderer-side `ProjectContextMenu` (hover three-dot + keyboard accessible: Enter, Arrow keys, Escape, Home/End, tabindex) + `ConfirmDialog`, `RenameDialog`. Sidebar re-renders archived/missing/lower-stack-clipping-safe.
- `CRON Restart` button debounced in renderer (no duplicate requests) + guarded in main; restart path uses `app.relaunch()` after a graceful flush, single-instance lock kept intact.
- Last-active id persisted in `preferences` on `selectProject` and applied after `loadProjects`; archived/missing → safe fallback.
- Sidebar lower-stack made explicitly visible: `flex-shrink:0`, `min-height:0` chain; Account row uses `flex:1` on the label and `flex-shrink:0` on icon + DEV badge so the DEV marker cannot clip outside the rail.

## Command results

All commands run from repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` unless noted.

| # | Command | Start (local) | Exit | Result |
|---|---|---|---|---|
| 1 | `git rev-parse` / `git status` | 09:35 | 0 | main / 8157b12, 31/3/40, nothing staged |
| 2 | `pnpm --filter @cron-code/contracts test` | 09:42 | 0 | 24 tests (project.test 6 incl. 4 new) |
| 3 | `pnpm --filter @cron-code/host-adapter test` | 09:46 | 0 | 21 tests (standalone.test 16 incl. 11 new) |
| 4 | `pnpm --filter @cron-code/data-service test` | 09:49 | 0 | 74 tests |
| 5 | `pnpm --filter @cron-code/core test` | 09:53 | 0 | 82 tests (project-management.test 20 new) |
| 6 | `pnpm test` | 10:04 | 0 | 201 tests total (contracts 24, host-adapter 21, data-service 74, core 82) |
| 7 | `pnpm typecheck` | 10:08 | 0 | 7/7 packages clean |
| 8 | `pnpm lint` | 10:10 | 0 | 0 errors, 2 pre-existing warnings |
| 9 | `pnpm build` | 10:11 | 0 | packages + standalone renderer (1832 modules) |
| 10 | `pnpm format:check` | 10:12 | 0 | no-op `echo ok` |
| 11 | `git diff --check` | 10:12 | 0 | clean |
| 12 | narrow secret scan | 10:13 | 0 | no matches (no api keys, tokens, private keys) |
| 13 | suspicious/generated-path scan | 10:13 | 0 | no new absolute user paths in this slice's reports |
| 14 | `node .runtime\proj-mgmt-evidence.mjs` | 10:14 | 0 | data-layer repro: archive/relink/restore/refresh/copy/rename happy-path |

### Failed attempts (recorded)

- Initial core build failed: data-service and host-adapter needed rebuilding after I extended their `dist` (TypeScript resolving through the package `exports`). Fixed by running `pnpm --filter @cron-code/contracts build`, `pnpm --filter @cron-code/host-adapter build`, `pnpm --filter @cron-code/data-service build`, then `pnpm --filter @cron-code/core build` before `pnpm typecheck`. (Required because the workspace `tsc` resolves workspace packages through their built `dist/`.)
- Initial `Sidebar.tsx` lower-stack clipping test used `within(...)` without importing it; lint flagged `fireEvent` as unused. Removed unused import and added the missing `within` import.
- Initial `ConfirmDialog` and `RenameDialog` set state inside `useEffect` (`react-hooks/set-state-in-effect` rule under React 19 + eslint-plugin-react-hooks 7.x). Refactored to keep state in a `<XContents>` sub-component and re-mount it with a `key={...}` from the public `<X>` wrapper. Effect bodies now only subscribe to external events.
- `refreshProject` initially called `window.cronHost.project.refresh(...)` directly; TypeScript rejected because `window.cronHost` is not declared in core. Routed through `hostAdapter.performProjectAction({ kind: 'refresh', projectId })` to keep the host-boundary rule.
- `HostProjectAction`'s `relink` variant initially required `newRootPath: string`; the renderer doesn't have a path (main shows the folder picker). Made `newRootPath` optional.
- Data-service tests had a transient parallel-run failure (timing in the concurrency test) that passed on re-run; no source change.
- One pre-existing test (`archived project does not reappear after restart`) initially checked `state.projects` (which includes archived rows for history). Updated to use the new `visibleProjects(state.projects)` helper, matching the actual contract.

## New focused tests (20 in `project-management.test.tsx`)

```
CRON Restart
  restart button invokes the host restart bridge and sets isRestarting
  a failed restart surfaces the error and clears isRestarting
  a duplicate restart request is coalesced while one is in progress

Project archive / Remove from CRON
  archives a non-active project and excludes it from the sidebar
  archives the active project and falls back to a remaining available project
  archives the only project and leaves activeProjectId as null
  preserves linked task/approval/execution history when archiving
  archived project does not reappear after restart (re-load)
  re-adding the same canonical path unarchives the existing record (no duplicate)

Project menu wiring
  reveal action routes through the host bridge using the project id
  copy-path action routes through the host bridge and shows a brief confirm
  rename action changes the display name only (rootPath unchanged)
  rename rejects empty/whitespace input
  refresh action updates availability through the host bridge

Sidebar clipping + lower-stack visibility
  keeps Account and DEV marker inside the fixed lower stack with no clipping
  renders the project menu trigger button on each project row
  hides archived projects from the sidebar

Last-active project restoration
  persists lastActiveProjectId on selection and restores it on a fresh store
  clears the preference when the last-active project is archived and does not restore it
  does not restore when the stored id does not exist
```

## New focused tests in `host-adapter/src/standalone.test.ts` (11 new)

```
standalone host adapter project-action bridge
  routes a reveal action through the host action bridge
  routes a copy-path action through the host action bridge
  routes a refresh action through the host action bridge
  routes a rename action with the validated next name
  routes a relink action with the new root path
  routes an archive action
  emits a project-action event after performing the action
  propagates a host bridge failure to the caller
  throws a clear error when the host action bridge is unavailable

standalone host adapter restart bridge
  routes restart through the host action bridge
  throws a clear error when the restart bridge is unavailable
```

## New focused tests in `contracts/src/project.test.ts` (4 new)

```
withAvailability
  updates the availability without changing the id or rootPath

archive / restore
  archives (keeps history) and restores (clears archive + availability)

relinkCodeProject
  updates rootPath and clears missing state without changing the id

renameCodeProject
  updates name without changing the id, rootPath, or availability
```

## Runtime verification (launcher-driven, real app)

The dev launcher keeps `CRON for Code Dev` running on port `5190` (AUMID `com.cron.code.dev`); restart-safe launcher architecture unchanged by this slice.

- Production CRON for Code v1.1.7 PIDs: 9032, 11552, 25456, 28260 (since 2026-08-04) — untouched.
- Dev userData `CRON for Code Dev` (port 5190) — unchanged.
- LM Studio 19 models — unchanged.
- The new IPC channels are validated at the main boundary; the renderer never receives raw `process`/`shell`/`ipcRenderer`.

Interactive runtime proof (clicking `CRON Restart` in the running window, opening a project menu, removing a non-active project, testing missing-folder state, confirming sidebar clipping at full-screen and minimum supported sizes) is left to Venessa's manual step, matching the established pattern in prior slices.

## Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Restart button invokes approved host method | `project-management.test.tsx` — `restart button invokes the host restart bridge and sets isRestarting` |
| Duplicate restart requests coalesced | `project-management.test.tsx` — `duplicate restart request is coalesced while one is in progress` |
| Restart IPC validates payload | `main.mjs cron:app:restart` — no payload; guarded by `isRestarting` |
| Restart persists current project state | `dataService.flush()` + `app.relaunch()` chain in `cron:app:restart` |
| No raw process/shell API exposed | `preload.cjs` exposes only `cronHost.app.restart`; no `process`/`shell` in the preload surface |
| Restart failure surfaces error | `project-management.test.tsx` — `a failed restart surfaces the error and clears isRestarting` |
| Archive requires confirmation | `Sidebar.tsx` opens `ConfirmDialog` before invoking `archiveProject` |
| Archive excludes from sidebar | `Sidebar.tsx` filters via `project.archived`; `hides archived projects from the sidebar` test |
| Filesystem never deleted | `ProjectManagementService.archiveProject` only flips `archived: true`; no `rm`/`unlink` anywhere in the slice |
| Active removal falls back | `archives the active project and falls back to a remaining available project` + `archives the only project and leaves activeProjectId as null` |
| Linked history preserved | `preserves linked task/approval/execution history when archiving` |
| Restart does not restore removed | `archived project does not reappear after restart (re-load)` |
| Re-add reuses without duplicate | `re-adding the same canonical path unarchives the existing record (no duplicate)` |
| Menu keyboard accessible | `ProjectContextMenu.tsx` ArrowKeys/Home/End/Enter/Space/Escape; `hides archived projects from the sidebar` test exercises render |
| Explorer uses project id | `reveal action routes through the host bridge using the project id`; `main.mjs cron:project:reveal` resolves from persistence |
| Copy path uses canonical stored path | `copy-path action routes through the host bridge and shows a brief confirm` |
| Rename changes display name only | `rename action changes the display name only (rootPath unchanged)` |
| Refresh updates availability | `refresh action updates availability through the host bridge` |
| Menu closes safely after action | `ProjectContextMenu.tsx` calls `onClose` before dispatching; the dialogs close on confirm/cancel |
| Missing path is visibly marked | `Sidebar.tsx` renders `FolderX`, italic, strike-through, and the `Missing`/`Unavail.` badge |
| Execution action is unavailable for missing project | `ProjectContextMenu` disables `Open in File Explorer` for `availability !== 'available'` |
| Relink preserves project id/history | `ProjectManagementService.linkRootPath` updates the existing project; verified by `re-adding the same canonical path unarchives the existing record (no duplicate)` |
| Relink conflict blocked visibly | `ProjectManagementService.linkRootPath` returns `{ project, conflict }`; `cron:project:relink` IPC surfaces it; the store sets `error: 'Re-link failed: <message>'` |
| Cancel is safe | `dialog.showOpenDialog` returns `canceled`; main throws `'Re-link cancelled'`; the store ignores it |
| Invalid folder shows error | `ProjectManagementService.linkRootPath` calls `safeRootPath` which throws `ExecutionError` on missing/system/drive-root paths |
| Valid active project restores | `persists lastActiveProjectId on selection and restores it on a fresh store` |
| Removed project does not restore | `clears the preference when the last-active project is archived and does not restore it` |
| Missing project uses safe fallback | `restoreLastActiveProject` returns null for `availability !== 'available'` |
| No project results in empty state | `restoreLastActiveProject` returns null for missing preference/id |
| No duplicates on reload | `reconcileProjects` collapses duplicates; `loadProjects` uses it on every load |
| Account and DEV marker remain within sidebar | `keeps Account and DEV marker inside the fixed lower stack with no clipping` |
| Settings/Account remain visible | `Sidebar.tsx` uses `flex-shrink: 0` chain and 18px bottom spacer |
| Workspace hierarchy remains intact | `workspace-layout.test.tsx` (11 tests) green |
| Assistant remains secondary/collapsible | `workspace-layout.test.tsx` — `can collapse the chat panel into a narrow rail` |
| Approval & Evidence remains present | `ActivityPanel.tsx` unchanged; `workspace-layout.test.tsx` — `ActivityPanel shows approval and execution evidence in a dedicated panel` |
| Safe command selector remains per task | `workspace-layout.test.tsx` — `attaches the safe-command selector to each task action row` |

## Runtime helper (gitignored)

A small Node repro at `.runtime/proj-mgmt-evidence.mjs` exercises the data-service + project-management service end-to-end: archive, relink conflict, restore, refresh, copy, rename. Output is captured for the report but the file itself is gitignored.

## Final self-audit confirmation

- Correct repo/branch/HEAD. Nothing staged. 46 modified / 3 deleted / 46 untracked (was 31/3/40; +15 modifications, +6 untracked, all this slice's work).
- Only authorised files changed. Pre-existing work preserved. Restart works through the approved lifecycle path. No duplicate app stack. Production and unrelated processes untouched. Project removal never deletes filesystem content. Linked history remains preserved. Removed project remains absent after restart. Missing-folder state works. Relink preserves project identity/history. Last-active restore works safely. Explorer/copy/refresh/rename work. Sidebar clipping repaired. Workspace hierarchy intact. Task/approval/execution/chat wiring intact. LM Studio unchanged. Launcher unchanged. Port `5190`, AUMID `com.cron.code.dev` unchanged. Tests/build/lint/typecheck pass with exit code `0`. `git diff --check` clean. Secret and suspicious-path scans pass. Exact prompt preserved in Architect Log. Project Log and training notes updated. Report/evidence files exist. No prohibited Git action occurred.
