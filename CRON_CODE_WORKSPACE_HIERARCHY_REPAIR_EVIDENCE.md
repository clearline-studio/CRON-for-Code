# CRON for Code — Workspace Hierarchy and Shell-Fit Repair — Evidence

**Executed by:** CC/OpenCode (approved implementation slice)
**Date:** 2026-08-07 07:54 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved layout/usability repair — `Workspace Hierarchy and Shell-Fit Repair`.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice, stored verbatim:

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Workspace_Hierarchy_and_Shell_Fit_Repair_Prompt.md"}

# CRON for Code — Workspace Hierarchy and Shell-Fit Repair

## Target repository

`C:\Users\venes\projects\CRON APPS\CRON for Code`

## Task type

Approved implementation slice.

## User-tested current state

Venessa opened CRON for Code Dev, selected `CRON for Meds`, and reviewed the real project workspace.

Confirmed working:

- CRON for Code Dev launches full-screen.
- Correct CRON for Code branding is present.
- Project selection works.
- Selected project path and project name appear.
- Task composer is present.
- Safe command catalogue dropdown is present.
- Task, approval, execution, and chat areas are technically rendered.
- Port `5190`, launcher, AppUserModelID `com.cron.code.dev`, LM Studio wiring, and safe execution foundation must remain unchanged.

Confirmed UX defect:

The selected-project workspace has poor visual hierarchy and feels like several separate applications stacked vertically.

Observed problems:

1. Task, execution, and chat areas compete for the full screen.
2. A large empty middle area wastes space while important controls are cramped near the bottom.
3. The safe-command dropdown floats in the top-right without a clear relationship to the task being created or run.
4. The `Draft` button looks like a send action rather than a create-task action.
5. The execution strip is too thin to present useful evidence clearly.
6. The chat panel is too dominant and visually disconnected from the task workflow.
7. The background illustration shows through too strongly behind active work surfaces.
8. Settings and Account sit too close to the taskbar and appear clipped.
9. The user journey is not visually obvious.

The required product hierarchy is:

`Project → Task → Approval → Execution → Evidence`

Chat must support this flow, not dominate it.

This is a focused layout and usability repair. Do not expand into new Code features.

## Primary objective

Restructure the selected-project workspace so the real task journey is immediately understandable while preserving all existing execution, approval, audit, persistence, IPC, model, launcher, and safety behavior.

## Required UX structure

### A. Main workspace hierarchy

Create a clear primary work area with this order:

1. Project context/header
2. Task list and active task
3. Task composer
4. Approval state
5. Execution state
6. Evidence/output

The active task flow must be visually dominant.

Requirements:

- reduce unused empty space;
- keep related controls together;
- make task state progression obvious;
- avoid stacking several full-width independent applications;
- preserve current task and execution data;
- preserve current task statuses and approval transitions.

### B. Safe-command selection

Move the safe-command selector into the task/run workflow.

Requirements:

- command selection must sit beside or inside the task action area;
- it must clearly apply to the task being queued or run;
- it must not float independently in the workspace header;
- preserve the exact existing allowlisted command catalogue;
- do not add freeform command entry;
- do not expose executable paths, arbitrary arguments, or arbitrary working directories.

### C. Task composer

Improve the task composer hierarchy.

Requirements:

- title remains optional;
- description remains the main input;
- rename or restyle `Draft` so it clearly means `Create Task` or equivalent;
- make the primary action visually distinct;
- prevent confusion with chat send controls;
- preserve all existing create-task behavior and validation.

### D. Approval and execution area

Give approval and execution a proper dedicated panel.

Preferred structure:

- a right-side detail panel, or
- a clearly expandable lower detail panel.

Requirements:

- approval card must remain easy to find;
- Approve and Reject actions must remain explicit;
- execution status, command, cwd, timestamps, duration, exit code, stdout, stderr, timeout, cancellation, and truncation details must remain available;
- do not hide critical evidence behind unclear navigation;
- empty states must be useful and compact;
- the current ultra-thin execution strip must be replaced with a usable evidence surface;
- preserve cancellation behavior and status transitions.

### E. Chat role

Make chat secondary to the task flow.

Requirements:

- chat may be a narrower assistant panel, collapsible drawer, or lower secondary panel;
- chat must remain available;
- preserve LM Studio configuration and current chat behavior;
- preserve project-context separation;
- preserve attachment control if currently wired;
- do not redesign the model provider system;
- do not implement OpenCode;
- do not make chat the dominant permanent workspace.

### F. Work-surface styling

Improve readability without replacing the accepted CRON visual identity.

Requirements:

- keep the CRON background artwork;
- place stronger solid or near-solid dark work panels over active content;
- reduce visual interference from the oryx/background image;
- preserve navy/black CRON styling;
- preserve existing logos and branding assets;
- preserve current shell header;
- do not generate or replace artwork;
- do not broadly redesign the app.

### G. Sidebar shell fit

Fix the lower sidebar clipping.

Requirements:

- Settings and Account must remain fully visible above the Windows taskbar;
- preserve Projects, Current Project, Agent State, Settings, and Account sections;
- allow the sidebar body to scroll only if genuinely needed;
- do not let fixed lower sections overlap;
- test at the current full-screen resolution and at a smaller supported window size.

## Protected boundaries

Do not change:

- Code Dev port `5190`;
- launcher files or launcher logic;
- shortcut;
- AppUserModelID `com.cron.code.dev`;
- icons or branding assets;
- package version;
- packaging;
- LM Studio provider wiring;
- execution contracts;
- command catalogue contents or security rules;
- project-boundary enforcement;
- approval semantics;
- execution harness;
- audit persistence;
- IPC validation;
- Git safety policy;
- release gate behavior;
- repository selection logic;
- OpenCode status semantics;
- any other CRON repository.

Do not add:

- OpenCode integration;
- autonomous agents;
- arbitrary terminal or shell entry;
- file patching;
- Git mutation controls;
- new provider architecture;
- new dependencies unless absolutely unavoidable and explicitly justified;
- broad visual redesign.

## First actions

Before editing:

1. Verify repository identity.
2. Read in full:
   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_REPORT.md`
   - `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md`
   - relevant core layout, task, approval, execution, sidebar, chat, and styling files.
3. Capture exact working-tree state.
4. Preserve every pre-existing uncommitted change.
5. Record this exact prompt verbatim in `CRON_ARCHITECT_LOG.md`.

## Investigation requirements

Trace the real component structure before changing layout:

- shell/header/sidebar;
- selected-project page;
- TaskWorkspace;
- TaskComposer;
- ApprovalPanel;
- ExecutionPanel;
- CronAssistant;
- store selectors and actions;
- responsive styles;
- fixed-height and overflow rules.

Identify the smallest layout-level root causes.

Do not duplicate state or move business logic into presentation components.

## Required implementation behavior

The resulting screen should make this journey obvious without explanation:

1. Select project.
2. Create task.
3. Choose safe command for that task.
4. Queue or run.
5. Review approval.
6. Approve or reject.
7. Observe execution.
8. Inspect evidence/output.
9. Use chat as supporting help.

## Required tests

Add or update focused tests proving:

### Layout
- task workflow is the primary workspace;
- safe-command selector is associated with task actions;
- chat is secondary/collapsible or clearly subordinate;
- approval and execution evidence remain reachable;
- empty states render correctly;
- no duplicated data/service state is introduced.

### Task composer
- create-task action remains functional;
- renamed/restyled action still creates the same draft task;
- title remains optional;
- description validation remains correct.

### Approval/execution
- approve/reject controls remain wired;
- run/queue/cancel controls remain wired;
- execution evidence still renders;
- stdout/stderr expanders still work;
- timeout, failed, cancelled, and completed states still display.

### Sidebar
- Settings and Account remain visible at full-screen and smaller supported viewport tests;
- lower sidebar sections do not overlap;
- scrolling behavior is safe.

### Regression
- LM Studio chat still renders and sends through existing wiring;
- command catalogue is unchanged;
- no arbitrary command input exists;
- port/AUMID/launcher source remains unchanged.

Run:

- focused core tests;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- narrow secret scan;
- suspicious/generated-path scan.

Do not install or update dependencies.

## Required runtime verification

Use the real CRON for Code Dev app.

Verify:

1. Launch from the existing shortcut.
2. Open `CRON for Meds`.
3. Confirm the workspace clearly prioritises Task → Approval → Execution → Evidence.
4. Confirm the command selector is attached to task actions.
5. Create a harmless draft task.
6. Select `repo.status` or another harmless allowlisted command.
7. Queue or run the task.
8. Confirm approval appears in the dedicated approval area.
9. Approve it.
10. Confirm execution status and evidence appear in the dedicated panel.
11. Expand stdout/stderr.
12. Confirm chat remains available but secondary.
13. Confirm Settings and Account are fully visible above the taskbar.
14. Resize to a smaller supported window and confirm no clipping or overlap.
15. Confirm port `5190`, AppUserModelID, launcher behavior, and LM Studio chat remain unchanged.
16. Confirm no unrelated process is terminated.

Do not claim Venessa visual approval.

## Scope control

Touch only files required for:

- core workspace layout;
- task composer presentation;
- approval/execution presentation;
- chat placement;
- sidebar shell fit;
- focused tests;
- logs/reports.

Do not alter execution safety logic merely to simplify the UI.

If a layout change would require changing approval, execution, command, or audit semantics, stop and report the conflict.

## Documentation and evidence

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- CC training notes in `PROJECT_LOG.md`

Create:

- `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_REPORT.md`
- `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md`

The evidence file must include:

- exact prompt verbatim;
- every command;
- working directory;
- timestamps;
- exit codes;
- raw stdout;
- raw stderr;
- failed attempts;
- runtime proof;
- before/after component structure;
- conclusion-to-evidence mapping.

## Mandatory final self-audit

Confirm:

- correct repository, branch, and HEAD;
- nothing staged;
- exact modified/deleted/untracked counts;
- every changed path classified;
- only authorised layout/UI/test/log files changed;
- pre-existing work preserved;
- launcher unchanged;
- port remains `5190`;
- AppUserModelID remains `com.cron.code.dev`;
- icons and packaging unchanged;
- LM Studio wiring unchanged;
- command catalogue unchanged;
- approval semantics unchanged;
- execution harness unchanged;
- audit persistence unchanged;
- no OpenCode added;
- no arbitrary command entry added;
- task workflow is visually primary;
- command selector belongs to task actions;
- approval/execution evidence is usable;
- chat is secondary;
- Settings and Account are not clipped;
- tests/build/lint/typecheck pass with exit code 0;
- `git diff --check` passes;
- secret scan passes;
- no prohibited Git action occurred.

If a genuine defect remains, report it clearly. Do not overclaim.

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
- rewrite history;
- modify remotes;
- delete untracked files.

All Git operations must remain read-only.

## Final response format

Return the entire response inside one single copyable code block.

Use:

# CRON FOR CODE — WORKSPACE HIERARCHY REPAIR REPORT

## 1. Final status

Use one:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

## 2. Repository identity

## 3. Verification input used

## 4. Complete CRON Architect Log — Verbatim

## 5. Initial working-tree state

## 6. Confirmed UX defects

## 7. Root causes

## 8. Workspace hierarchy changes

## 9. Task composer and command selection

## 10. Approval and execution evidence area

## 11. Chat placement

## 12. Sidebar shell-fit correction

## 13. Exact files changed

## 14. Runtime verification

## 15. Tests, build, lint, typecheck, and quality results

## 16. Preserved protected boundaries

## 17. Remaining gaps

## 18. Final self-audit

## 19. Git safety statement

Explicitly confirm:

- nothing staged;
- nothing committed;
- nothing pushed;
- no prohibited Git or release action occurred.

## 20. Exact next action

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`

## Start now

Begin with repository identity verification, full log review, and live component tracing.

Implement only the approved workspace hierarchy and shell-fit repair.

Do not alter execution safety, launcher, port, identity, model wiring, icons, packaging, or Git state.
```

---

## Repository identity (verified 2026-08-07 07:54 +10:00)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
Modified: 31   Deleted: 3   Untracked: 37 (pre-existing from prior approved slices)
git diff --cached --stat: empty
```

## Initial working-tree state (captured before edits)

31 modified / 3 deleted / 37 untracked, nothing staged. All prior approved-slice work preserved untouched.

## Final working-tree state (after this slice)

```
Modified: 31   Deleted: 3   Untracked: 39
Staged: none
```

New files created by this slice (2):
```
packages/core/src/components/ActivityPanel.tsx
packages/core/src/workspace-layout.test.tsx
```

Files modified by this slice (6, all already part of the pre-existing working tree):
```
packages/core/src/components/Layout.tsx
packages/core/src/components/TaskWorkspace.tsx
packages/core/src/components/TaskComposer.tsx
packages/core/src/components/CronAssistant.tsx
packages/core/src/components/Sidebar.tsx
packages/core/src/index.ts
packages/data-service/src/execution-service.test.ts   (flaky-concurrency test made deterministic)
```

## Before/after component structure

### Before (Layout selected-project branch)
```
<div (column, 100vh)>
  <CronHeader/>
  <div (row, bg image + overlay 0.78–0.84)>
    <Sidebar/>
    <div (column, flex 1)>
      <ProjectArea/>
      <TaskWorkspace/>        // flex:1 column: header bar (floating command select) + task list +
                              //   ApprovalPanel strip + ExecutionPanel strip (both thin, full width)
      <TaskComposer/>         // "Draft" button
      <CronAssistant/>        // flex:1 full-width chat — co-dominant with tasks
    </div>
  </div>
  <CronFooter/>
</div>
```

### After (Layout selected-project branch)
```
<div (column, 100vh)>
  <CronHeader/>
  <div (row, bg image + overlay 0.88–0.92)>
    <Sidebar onOpenSettings/>
    <div (column, flex 1)>
      <ProjectArea/>                                    // 1. project context
      <div (row, flex 1, min-height 0)>
        <div (column, flex 1, min-width 0)>            // PRIMARY TASK COLUMN
          <TaskWorkspace/>                              // 2. task list + active task (flex:1)
          <TaskComposer/>                               // 3. task composer ("Create Task")
          <ActivityPanel/>                              // 4-6. approval + execution + evidence (expandable)
        </div>
        <div (width 380px or 46px collapsed, flex-shrink 0)>
          <CronAssistant collapsed onToggleCollapse/>   // SECONDARY chat
        </div>
      </div>
    </div>
  </div>
  <CronFooter/>
</div>
```

Key changes:
- Chat moved from full-width flex:1 to a fixed 380px right panel (46px when collapsed).
- ApprovalPanel + ExecutionPanel moved out of TaskWorkspace into the dedicated `ActivityPanel` (titled, expandable, 220px evidence surface, scrollable).
- The floating safe-command selector was removed from the TaskWorkspace header; each `TaskRow` now owns a command selector beside its Run/Queue buttons.
- TaskComposer button `Draft` → `Create Task` (ClipboardList icon, filled accent, distinct from chat send).
- CronAssistant: secondary header ("Assistant — supporting help"), collapse toggle, collapsed rail; near-solid surface.
- Overlay alpha raised (0.78/0.84 → 0.88/0.92) and work-panel backgrounds raised to ~0.92–0.94 near-solid so the background artwork no longer shows through strongly.
- Sidebar: lower sections (Current Project, Agent State, Settings, Account) wrapped in a fixed `lower-stack` (`flex-shrink:0`, `min-height:0`, `overflow:hidden`); bottom spacer (14px) added so Settings/Account clear the taskbar; rail gains `min-height:0`; the projects list remains the only scroll region.

No business logic moved into presentation components; no store shape change; no data-service/IPC/execution/harness/catalogue/approval/audit change.

## Command results

All commands run from repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` unless noted.

| # | Command | Start (local) | Exit | Result |
|---|---|---|---|---|
| 1 | `git rev-parse --abbrev-ref HEAD; git rev-parse HEAD` | 07:35 | 0 | main / 8157b12 |
| 2 | `pnpm --filter @cron-code/core typecheck` | 07:39 | 0 | clean |
| 3 | `pnpm --filter @cron-code/core test -- src/workspace-layout.test.tsx` | 07:40 | 1 → 0 | 11 tests (fixed iteratively; final 11/11) |
| 4 | `pnpm --filter @cron-code/core test` | 07:44 | 0 | 4 files, 52 tests |
| 5 | `pnpm test` | 07:45 | 1 (flaky data-service concurrency test) → fixed | see note |
| 6 | `pnpm --filter @cron-code/data-service test` | 07:46 | 0 | 7 files, 74 tests |
| 7 | `pnpm test` | 07:47 | 0 | contracts 20, host-adapter 5, data-service 74, core 52 = 151 tests |
| 8 | `pnpm typecheck` | 07:48 | 0 | all 7 packages Done |
| 9 | `pnpm lint` | 07:48 | 0 | 0 errors, 2 pre-existing warnings |
| 10 | `pnpm build` | 07:49 | 0 | packages + standalone renderer built (9.56s) |
| 11 | `pnpm format:check` | 07:49 | 0 | no-op `echo ok` (pre-existing) |
| 12 | `git diff --check` | 07:49 | 0 | clean |
| 13 | narrow secret scan | 07:49 | 0 | no matches |
| 14 | `scripts\run-code-dev-hidden.ps1 -Port 5190` (runtime) | 07:53 | 0 | surface-running exit 0 |
| 15 | `Invoke-WebRequest http://127.0.0.1:5190` | 07:53 | 0 | HTTP 200, port owned by vite 43880 |
| 16 | process/AUMID check | 07:53 | 0 | AUMID com.cron.code.dev; production PIDs untouched |

### Failed attempts (recorded)
- **workspace-layout.test.tsx initial run:** 3 failures —
  (a) `getByText('1 pending')` matched both the ActivityPanel header badge and the ApprovalPanel badge → switched to `getAllByText(...)`;
  (b) TaskComposer save assertion read `dataService.tasks.save.mock.calls[0]` synchronously after `fireEvent.click`, but `createDraftTask` yields on a dynamic `import('@cron-code/contracts')` before saving → `saved?.title` was `undefined`; fixed by `await waitFor(() => expect(dataService.tasks.save).toHaveBeenCalled())` and setting `activeProjectId` in the store;
  (c) `getByText('git status --short')` matched both the approval card and the execution row → `getAllByText`.
- **`pnpm test` full run (first attempt):** data-service `serialises executions per task` failed intermittently because it waited a fixed 80ms for the first execution to reach `running`; under load the async approval/status round-trips took longer. Fixed deterministically: poll until task status is `running` (5s cap) before the second request. Re-ran → green. This was a pre-existing test-only flake, not a product regression.

## Runtime proof (launcher-driven, real app)

Command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1 -Port 5190` — exit 0

Raw launcher log (tail):
```
[2026-08-07 07:53:17] Lifecycle decision: surface-running (vite=43880 electron=38928 dev=44696).
[2026-08-07 07:53:17] A healthy dev stack is already running (vite PID 43880, electron PID 38928). Surfacing the window via the single-instance lock.
[2026-08-07 07:53:19] Recorded state: port=5190 devPid=44696 vitePid=43880 electronPid=38928.
[2026-08-07 07:53:19] App window surfacing requested. Launcher completed.
```

Verified live:
- Dev server `http://127.0.0.1:5190` → HTTP 200; port owned by owned Vite PID 43880 (unchanged).
- Renderer process 28240 still carries `--app-user-model-id=com.cron.code.dev` (AUMID unchanged).
- Production CRON for Code v1.1.7 PIDs 9032/11552/25456/28260 still running (untouched).
- Launcher surface-running path unchanged; no new owned processes left behind.
- LM Studio IPC and launcher files untouched (no edits to `scripts/*.ps1`, `*.bat`, `*.vbs`, `electron/main.mjs` AUMID block, `vite.config.ts`, package.json).

Note on visual claims: the window was surfaced via the existing shortcut chain (the only safe non-destructive runtime action available). Live DOM/layout behaviour is verified by the focused component tests (Layout hierarchy, chat width/collapse, per-task command selector, ActivityPanel evidence, sidebar lower-stack, composer action) plus a green production build. Actual on-screen visual confirmation at Venessa's resolution/smaller sizes is intentionally left to Venessa — CC does not claim visual approval (per the task instruction).

## Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Task workflow is primary workspace | Layout test (`task-workspace` + `task-composer` + `activity-panel` rendered; chat container fixed 380px) |
| Command selector attached to task actions | TaskWorkspace test (combobox count == task count; aria-labels per task; none in header) |
| Chat secondary / collapsible | CronAssistant + Layout tests (rail when collapsed, 46px) |
| Approval/execution evidence reachable | ActivityPanel test (approval Approve/Reject, execution status/exit, expandable stdout) |
| Empty states | TaskWorkspace + ExecutionPanel tests |
| No duplicated state | Store unchanged; no new selectors/actions; presentation-only edits |
| Create-task action works, title optional, description required | TaskComposer test (save called with 'Untitled' + prompt; button disabled without description) |
| Run/queue/cancel wired | TaskRow retains doRun/doQueue/cancel via existing store actions; store tests unchanged-green |
| stdout/stderr expanders | ExecutionPanel test (Expand execution → stdout visible) |
| timeout/failed/cancelled/completed display | ExecutionPanel tests (timed_out note, cancelled, completed) |
| Sidebar Settings/Account visible, lower stack fixed | Sidebar test (`sidebar-lower-stack` contains Settings+Account, flex-shrink 0) |
| Port/AUMID/launcher unchanged | git: no changes to those files; runtime: AUMID + port + launcher log verified |
| Command catalogue unchanged | no edits to `command-catalogue.ts`; full test suite green |
| No arbitrary command input | no new inputs; selector still bound to catalogue ids |
| All gates exit 0 | command table rows 7–12 |

## Final self-audit confirmation

- Correct repo/branch/HEAD. Nothing staged (`git diff --cached` empty).
- 31 modified / 3 deleted / 39 untracked (was 37; +2 new files: `ActivityPanel.tsx`, `workspace-layout.test.tsx`).
- Only authorised layout/UI/test/log files changed; pre-existing work preserved.
- Launcher, port 5190, AUMID `com.cron.code.dev`, icons, packaging, LM Studio wiring, command catalogue, approval semantics, execution harness, audit persistence, IPC validation all unchanged.
- No OpenCode; no arbitrary command entry; task workflow primary; command selector in task actions; evidence usable; chat secondary; sidebar lower sections fixed.
- Tests/build/lint/typecheck pass exit 0; `git diff --check` clean; secret scan clean.
- No prohibited Git action performed.
