# CRON for Code — OpenCode-Style Workspace Layout

## Architect instruction for CC/OpenCode

Venessa wants the CRON for Code workspace screen reshuffled to feel more like OpenCode's layout.

This slice is approved for layout/UX reshaping only. Do not do Git actions.

## Required CC workflow for this session

ChatGPT/Codex is the Architect. CC/OpenCode implements only the approved prompt file.

Rules:

- Read this prompt file first.
- Confirm you have read it before changing anything.
- Implement only this slice.
- Do not start unrelated fixes.
- Do not begin another Code task after this one.
- When done, write the required report/evidence files.
- Tell Venessa completion status plainly.
- Do not claim done without verification.
- Do not do Git actions unless Venessa explicitly approves them later.
- If something is already done, verify it and say so instead of rebuilding it.
- If a visible feature does not work yet, mark it red `DEV` rather than pretending.
- Return the complete report to the CRON Architect for review.

## Goal

Make CRON for Code feel like a practical coding workspace, closer to OpenCode:

- clear top app/project navigation,
- left project/file/task context,
- central work/diff/task area,
- right assistant/chat panel,
- obvious changed-files/review area,
- less empty space,
- stronger working layout rhythm.

Keep CRON branding and the existing dark style. Do not copy OpenCode exactly, but borrow the useful layout pattern.

## Restart flash issue

Venessa reports that the restart screen is working now, but just before the app opens there is a second flash screen/pop-in.

Required:

- Keep the accepted restart screen.
- Remove the second flash/intermediate screen.
- The restart flow should feel like one continuous transition:
  - restart screen appears,
  - stays visible while restarting,
  - then the normal Code app opens cleanly.
- Do not allow a left-aligned/unstyled/intermediate shell to flash for a moment.
- Do not reopen minimized.

## What Venessa is comparing against

OpenCode shows:

- a top tab/workspace bar,
- a left pane with current task/report and changed file list,
- a central/right diff or file viewer,
- compact tool controls,
- clear changed-files count,
- less empty unused space.

Current CRON for Code feels too spread out:

- big empty central task area,
- right assistant panel detached from the work,
- project/actions are not arranged like a coding workspace,
- changed files/review state is not prominent enough,
- the layout does not yet feel like the command centre for coding work.

## Required layout direction

### 1. Top workspace strip

- Add or refine a compact top workspace/project strip.
- Current project should be clear.
- If multi-app/project tabs exist, make them feel intentional and compact.
- Keep `CRON Online` as a non-clickable status.
- Keep `CRON Restart` in the header, slim and aligned.

### 2. Left pane

Left pane should prioritise:

- projects,
- current selected project,
- project status,
- DEV-marked unfinished areas,
- optional changed-files/task summary if it fits.

Avoid wasting vertical space.

### 3. Main workspace

Central area should feel active even when there are no tasks.

Show useful empty-state options:

- create a task,
- inspect changed files,
- open project,
- review evidence/logs,
- run checks if supported/DEV-marked.

Avoid a large blank area with only `No tasks yet`.

### 4. Changed files / review area

If the repo has changed files, show a prominent changed-files/review section like OpenCode.

Required:

- changed file count,
- file list,
- additions/deletions if already available,
- click/select behaviour if wired,
- DEV markers if not fully wired.

Do not fake Git data.

### 5. Right assistant panel

Keep the CRON assistant/chat panel, but integrate it better:

- clear title,
- DEV marker if supporting help is not fully functional,
- composer aligned and usable,
- no huge empty detached feeling.

### 6. Task composer

The task title/description/Create Task area should feel like part of the workspace, not floating awkwardly.

If Create Task works, keep it active.
If it is not fully working, mark it red `DEV`.

## Keep intact

- Existing CRON dark styling.
- Current project state.
- DEV truth markers.
- Restart behaviour.
- No fake Git/check/test status.
- No fake model/assistant capability.

## Verification required before claiming done

Run the configured Code checks:

- typecheck
- lint
- tests
- build
- git diff check

Also do a live visual proof:

- launch Code,
- compare the layout against the OpenCode reference,
- confirm the screen has less empty space,
- confirm changed-files/review area is prominent when changes exist,
- confirm assistant panel still works or is truthfully DEV-marked,
- confirm Create Task behaviour still works or is truthfully DEV-marked,
- confirm restart still works,
- confirm no second flash screen appears before the app opens.

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`

Create:

- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_REPORT.md`
- `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_EVIDENCE.md`

## Boundaries

- No Git commit, push, merge, PR, tag, release, rebase, reset, restore, clean, or destructive history action.
- Do not copy OpenCode branding or exact UI.
- Do not add dependencies.
- Do not fake changed files, checks, assistant capability, or task execution.
- Keep this slice focused on workspace layout and visual hierarchy.
