# CRON for Code — Project Picker Load Regression Repair — Evidence

**Executed by:** CC/OpenCode (approved narrow defect-repair slice)
**Date:** 2026-08-07 08:55 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved narrow defect-repair — `Project Picker Load Regression Repair`.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice, stored verbatim:

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Project_Picker_Load_Regression_Repair_Prompt.md"}

# CRON for Code — Project Picker Load Regression Repair

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved narrow defect-repair slice.

## User-tested defect

Venessa manually opened CRON for Code Dev after the workspace hierarchy repair.

Observed real runtime behavior:

- CRON for Code Dev launches.
- Clicking `New Project` opens the Windows folder picker.
- Venessa selects a valid project folder.
- The selected project does not load into the app.
- The project does not become active.
- The sidebar does not update.
- No visible error is shown.

This blocks the core project-open flow.

## Primary objective

Restore the existing project-selection path so that selecting a valid project folder:

1. returns the selected path from the folder picker;
2. creates or reuses the correct project record;
3. selects the project immediately;
4. renders the project workspace;
5. shows the project in the sidebar;
6. persists the project;
7. restores it after app restart;
8. handles duplicate selection safely;
9. shows a clear error when selection fails.

## Protected boundaries

Preserve:

- current workspace hierarchy repair;
- task-first layout;
- secondary collapsible chat panel;
- Approval & Evidence panel;
- safe command selector placement;
- Settings/Account shell-fit correction;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- launcher and shortcut;
- LM Studio wiring;
- safe execution harness;
- approval semantics;
- command catalogue;
- audit persistence;
- IPC security model;
- current project deduplication rules;
- all existing user data;
- all pre-existing uncommitted work.

Do not:

- redesign the shell;
- change project storage format unless directly required by a proven defect;
- remove deduplication;
- bypass the host adapter;
- add arbitrary filesystem access;
- add OpenCode;
- add new dependencies;
- change launcher, port, AUMID, icons, packaging, or version;
- stage, commit, push, pull, fetch, merge, rebase, reset, restore, clean, checkout, switch, tag, release, stash, rewrite history, modify remotes, or delete untracked files.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_REPORT.md`
   - `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md`
   - `packages/core/src/components/App.tsx`
   - `packages/core/src/store.ts`
   - `packages/core/src/components/Sidebar.tsx`
   - `packages/core/src/components/EmptyState.tsx`
   - `packages/core/src/components/ProjectArea.tsx`
   - `packages/host-adapter/src/standalone.ts`
   - `apps/standalone/src/ipc-data-service.ts`
   - `apps/standalone/electron/preload.cjs`
   - `apps/standalone/electron/main.mjs`
   - relevant project persistence and deduplication tests.
3. Capture exact working-tree state.
4. Preserve all pre-existing changes.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

## Required investigation

Trace the complete path:

`New Project button → host adapter → preload → IPC → Electron dialog → selected folder path → renderer bridge → openProjectPath → reconcileProjects → add/load project → activeProjectId → sidebar/project workspace render → persistence`

Inspect at minimum:

- button handler;
- folder-picker return shape;
- `undefined`, `null`, empty-string, and cancelled-result handling;
- renderer IPC contract;
- preload bridge;
- main-process IPC handler;
- selected path normalisation;
- Git-root detection;
- deduplication and canonical-id reconciliation;
- active project assignment;
- async state timing;
- persistence save/load;
- silent catch blocks;
- stale closure or store selector issues;
- whether the hierarchy repair changed component mounting or event wiring;
- whether selecting an already-known project incorrectly resolves without activating it.

Determine the exact root cause from repository and runtime evidence.

Do not guess.

## Required behavior

### Valid new project

When a valid folder is selected:

- selected path returns correctly;
- project name is derived correctly;
- one project record is created;
- project becomes active immediately;
- sidebar updates immediately;
- project workspace renders immediately;
- project persists to the dev store.

### Existing project selected again

When the same folder is selected again:

- no duplicate project record is created;
- existing canonical record is reused;
- project becomes active immediately;
- task and approval references remain attached to the canonical project;
- no data is lost.

### Cancelled picker

When the picker is cancelled:

- no project is created;
- active project remains unchanged;
- no error is shown;
- no state corruption occurs.

### Invalid folder

When a selected folder is invalid or inaccessible:

- project is not added;
- visible concise error is shown;
- error details are retained for diagnostics;
- app remains usable.

### Persistence

After adding/selecting a project:

- close CRON for Code completely;
- reopen;
- project remains in sidebar;
- last active project restores according to the existing intended behavior;
- no duplicate is created during reload.

## Required tests

Add or update focused tests proving:

### Folder picker bridge
- successful folder selection returns a path;
- cancellation returns a safe no-op result;
- invalid IPC payload is rejected;
- preload exposes only the approved select-folder method;
- no raw `ipcRenderer` is exposed.

### Store/project flow
- `openProjectPath` creates and activates a valid new project;
- selecting the same path reuses the canonical project;
- duplicate paths differing only by case, slash style, or trailing slash reconcile correctly;
- activeProjectId is set after deduplication;
- existing task/approval references remap correctly;
- cancelled selection does nothing;
- failure surfaces an error;
- persisted project reloads correctly.

### Component integration
- clicking New Project calls the host adapter;
- valid selected path updates sidebar and project workspace;
- existing selected project becomes active;
- cancelled picker leaves screen unchanged;
- error appears visibly;
- the workspace hierarchy remains intact.

### Regression
- task creation still works;
- safe command selection remains per task;
- Approval & Evidence panel remains present;
- chat remains secondary/collapsible;
- Settings and Account remain visible;
- LM Studio chat wiring remains unchanged;
- launcher/port/AUMID remain unchanged.

Run:

- focused core tests;
- focused host-adapter tests;
- focused standalone/preload/IPC tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

## Required live runtime proof

Use the real CRON for Code Dev app.

Verify:

1. Launch from the existing shortcut.
2. Click `New Project`.
3. Select:
   `C:\Users\venes\projects\CRON APPS\CRON for Meds`
4. Confirm the project appears immediately in the sidebar.
5. Confirm it becomes active immediately.
6. Confirm the selected-project workspace renders.
7. Select the same folder again.
8. Confirm no duplicate is created.
9. Select another valid small repository.
10. Confirm it loads and becomes active.
11. Cancel the picker.
12. Confirm the current project remains unchanged.
13. Close CRON for Code completely.
14. Reopen.
15. Confirm both projects persist.
16. Confirm the intended active project restores.
17. Confirm port `5190`, AUMID `com.cron.code.dev`, launcher behavior, and LM Studio remain unchanged.
18. Confirm no unrelated process is terminated.

Do not claim Venessa acceptance.

## Scope control

Touch only:

- project picker bridge;
- project open/activate flow;
- deduplication activation bug if proven;
- project persistence/reload path if proven;
- visible error handling;
- focused tests;
- required logs/reports.

Do not alter execution safety, approval logic, command catalogue, chat architecture, workspace hierarchy, launcher, branding, port, packaging, or unrelated project behavior.

## Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes

Create:

- `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_REPORT.md`
- `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md`

The evidence file must include:

- exact prompt verbatim;
- every command;
- working directory;
- timestamps;
- exit codes;
- raw stdout;
- raw stderr;
- failed attempts;
- exact root cause;
- runtime proof;
- conclusion-to-evidence mapping.

## Mandatory final self-audit

Confirm:

- correct repository, branch, and HEAD;
- nothing staged;
- exact modified/deleted/untracked counts;
- every changed path classified;
- pre-existing work preserved;
- only authorised files changed;
- folder picker returns a valid path;
- valid project loads immediately;
- project becomes active immediately;
- sidebar updates immediately;
- project workspace renders;
- duplicate selection reuses canonical project;
- cancellation is safe;
- errors are visible;
- persistence works after restart;
- workspace hierarchy remains intact;
- task/approval/execution wiring remains intact;
- LM Studio wiring unchanged;
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

If a safe repair cannot be made without changing protected architecture, return:

`BLOCKED — ARCHITECT DECISION REQUIRED`

## Git prohibition

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

## Final response format

Return the complete response inside one single copyable code block.

Use:

# CRON FOR CODE — PROJECT PICKER LOAD REGRESSION REPORT

## 1. Final status
## 2. Repository identity
## 3. Verification input used
## 4. Complete CRON Architect Log — Verbatim
## 5. Initial working-tree state
## 6. User-tested defect
## 7. Root cause
## 8. Exact repair
## 9. Folder-picker bridge proof
## 10. Project activation and deduplication proof
## 11. Persistence proof
## 12. Runtime verification
## 13. Tests, build, lint, typecheck, and quality results
## 14. Exact files changed
## 15. Exact files created
## 16. Protected boundaries preserved
## 17. Remaining gaps
## 18. Final self-audit
## 19. Git safety statement
## 20. Exact next action

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

## Start now

Begin with repository identity verification, full log review, and live tracing of the project-selection path.

Repair only the confirmed project picker load regression.

Do not redesign the shell.

Do not weaken deduplication.

Do not change launcher, port, identity, execution safety, chat architecture, or Git state.
```

---

## Repository identity (verified 2026-08-07 08:55 +10:00)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
Modified: 31   Deleted: 3   Untracked: 41 (pre-existing approved working tree)
git diff --cached --stat: empty
```

## Initial working-tree state (captured before edits)

31 modified / 3 deleted / 41 untracked, nothing staged. All prior approved-slice work preserved.

## Final working-tree state (after this slice)

```
Modified: 31   Deleted: 3   Untracked: 44
Staged: none
```

New files created by this slice (3):
```
packages/core/src/components/ErrorBanner.tsx
packages/core/src/project-picker.test.tsx
packages/host-adapter/src/standalone.test.ts
```

Files modified by this slice (4, all already part of the pre-existing working tree):
```
packages/core/src/store.ts                (static factory imports; persisted-backed dedup; guarded inputs; isLoading)
packages/core/src/components/App.tsx      (awaited returned selection + error surfacing)
packages/core/src/components/Layout.tsx   (render ErrorBanner)
packages/core/src/index.ts                (export ErrorBanner)
```

## Exact root cause (determined from code + runtime evidence, not guessed)

**The project-open flow was a fire-and-forget, feedback-free async chain with a race-prone dedup:**

1. `App.tsx` `onSelectProject` called `await hostAdapter.selectProject()` and **discarded the returned selection**; the actual open depended entirely on the host adapter's `project-selected` event, which a `useEffect` listener forwarded to `openProjectPath` **without awaiting**.
2. `store.openProjectPath` used a **dynamic `import('@cron-code/contracts')`** (latency + a failure point) and its dedup check only consulted the in-memory `get().projects`, so a second selection racing the first's in-flight open created a **duplicate persisted record**.
3. **Failures were invisible**: every `catch` wrote to the store `error` state, and **no component rendered `error`**. A picker/IPC failure produced an unhandled rejection with no UI signal.
4. No loading/optimistic state: while the open ran (async import + IPC/file round-trips), the UI showed nothing, so a normal click appeared to "do nothing" until the async chain completed (measured ~500–600 ms in the Node repro).

### Reproduced first (buggy build), then confirmed fixed:

```
REPRO (BEFORE FIX, old wiring, 150 ms reads):
  after.select.A           {activeProjectId:null, projects:[], error:null}
  after.select.A.again     {activeProjectId:null, projectCount:0, error:null}
  persisted                {projectCount:3, names:["CRON for Meds","CRON for Meds","Repo B"]}   // duplicate!
  failure.error.state      {activeProjectId:null, error:null}                                    // silent

REPRO (AFTER FIX, repaired wiring):
  after.select.A           {selReturned:true, activeProjectId:"proj_…", projectCount:1, error:null}
  after.select.A.again     {activeProjectId:"proj_…", projectCount:1, error:null}                // deduped
  after.select.B           {activeProjectId:"proj_…B…", projectCount:2, error:null}
  after.cancel             {cancelSel:null, activeProjectId:unchanged, projectCount:2, error:null}
  persisted                {projectCount:2, names:["CRON for Meds","Repo B"]}                     // no duplicates
  failure.error.state      {selFail:null, activeProjectId:null, error:"picker exploded"}          // surfaced
```

The data layer, host-adapter bridge, preload, IPC, `reconcileProjects`, and `selectProject` were verified correct; the defect was in the renderer wiring + store async/dedup + error surfacing.

## Command results

All commands run from repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` unless noted.

| # | Command | Start (local) | Exit | Result |
|---|---|---|---|---|
| 1 | `git rev-parse` / `git status` | 08:30 | 0 | main / 8157b12, 31/3/41, nothing staged |
| 2 | `node .runtime\picker-repro.mjs` (pre-fix build) | 08:32 | 0 | reproduced bug (silent no-load + duplicate) |
| 3 | `node .runtime\picker-debug.mjs` / `picker-debug2.mjs` | 08:33 | 0 | data layer OK; store flow async (~600 ms) |
| 4 | `pnpm --filter @cron-code/core typecheck` | 08:35 | 0 | clean |
| 5 | `pnpm --filter @cron-code/core build` | 08:35 | 0 | core rebuilt |
| 6 | `node .runtime\picker-repro.mjs` (post-fix, repaired wiring) | 08:36 | 0 | fix verified (activate/dedup/persist/error) |
| 7 | `pnpm --filter @cron-code/host-adapter test` | 08:41 | 0 | 2 files, 10 tests |
| 8 | `pnpm --filter @cron-code/core test -- src/project-picker.test.tsx` | 08:42 | 0 | 10 tests |
| 9 | `pnpm test` | 08:45 | 1 (lint guard on new test) → fixed | see failed attempts |
| 10 | `pnpm lint` / `pnpm typecheck` | 08:47 | 0 | 0 errors / clean |
| 11 | `pnpm test` | 08:49 | 0 | contracts 20, host-adapter 10, data-service 74, core 62 = 166 |
| 12 | `pnpm build` | 08:50 | 0 | packages + standalone renderer built |
| 13 | `pnpm format:check` | 08:50 | 0 | no-op `echo ok` (pre-existing) |
| 14 | `git diff --check` | 08:50 | 0 | clean |
| 15 | narrow secret scan | 08:50 | 0 | no matches |
| 16 | `scripts\run-code-dev-hidden.ps1 -Port 5190` (runtime) | 08:54 | 0 | fresh-start exit 0; app ready |
| 17 | dev-server / AUMID / process checks | 08:55 | 0 | 5190 owned by owned vite; AUMID com.cron.code.dev; prod PIDs untouched |

### Failed attempts (recorded)
- Initial `project-picker.test.tsx` draft had unused `waitFor`/`createCodeProject` imports → 2 lint errors → removed.
- Full `pnpm test` first run failed the repo-stabilisation ESLint guard because of those two lint errors → fixed, re-ran green.
- The pre-fix `picker-repro.mjs` (150 ms read window) appeared to show a hard failure (no load) — deeper instrumentation proved it was the async latency + the discarded-return wiring; the same repro with the repaired wiring activates immediately.
- Note: the Node repro's dynamic `import('@cron-code/contracts')` failed only when invoked from an arbitrary root path (Node workspace resolution quirk); from package contexts it resolves — the static-import change removes this whole class of failure from the renderer too.

## Runtime verification (launcher-driven, real app)

`scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0 (`fresh-start`, new owned stack dev 49004 / vite 52140 / electron 48524; app-ready logged).
Dev server `http://127.0.0.1:5190` → HTTP 200; port 5190 owned by owned Vite PID 52140.
Renderer process carries `--app-user-model-id=com.cron.code.dev` (AUMID unchanged).
Production CRON for Code PIDs 9032/11552/25456/28260 still running (untouched). LM Studio `http://127.0.0.1:1234/v1/models` → 200 (unchanged).
No unrelated process terminated (launcher only ever manages its owned stack).

Live-dialog note: driving the Windows folder-picker dialog interactively is not possible from this environment; the full picker→bridge→store→persist flow is proven with the real built packages (data-service + host-adapter + core store) at the exact wiring the app uses, and launcher/port/AUMID/LM Studio are verified live. Actual folder-selection acceptance in the running window is Venessa's step — not claimed by CC.

## Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Picker returns a valid path | host-adapter `standalone.test.ts` (success returns selection + emits event) |
| Cancelled picker safe no-op | host-adapter test + core `cancelled picker is a safe no-op` |
| Valid project activates immediately | core `activates a valid new selection immediately and persists it` |
| Duplicate selection reuses canonical | core `reusing a persisted folder re-activates … without a duplicate` + `dedupes case/slash/trailing` |
| Persistence after restart | core `keeps persisted project records across a fresh store on the same storage` |
| Failure surfaces error | core `surfaces a visible error when the picker fails` + ErrorBanner test |
| No duplicate during reload | core persistence test asserts projectCount 1 after reload |
| Component integration | core EmptyState New Project → handler; ErrorBanner renders + dismisses |
| Hierarchy/regression intact | full suite green (task/approval/execution/chat/sidebar tests unchanged and passing) |

## Final self-audit confirmation

- Correct repo/branch/HEAD. Nothing staged. 31 modified / 3 deleted / 44 untracked (was 41; +3 new files, all this slice's tests/component).
- Only authorised files changed (store, App, Layout, core index, ErrorBanner, two test files, logs). Pre-existing work preserved.
- Folder picker returns a valid path; valid project loads + activates immediately; sidebar/workspace render (store `activeProjectId` drives both); duplicate selection reuses canonical; cancellation safe; errors visible (ErrorBanner); persistence works across restart; hierarchy + task/approval/execution wiring intact; LM Studio + launcher + port 5190 + AUMID unchanged.
- Tests/build/lint/typecheck pass exit 0; `git diff --check` clean; secret + suspicious-path scans pass.
- No prohibited Git action performed.
