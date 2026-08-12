# CRON for Code — Functional Wiring, DEV Marking + Picker Polish

## Architect instruction for CC/OpenCode

Venessa live-tested CRON for Code and found several product-truthfulness and UX issues.

This slice is approved to repair only the listed Code behaviours. Do not do Git actions.

## What Venessa saw

- `Re-link folder` in the project menu is not wired.
- `CRON Online` is green and appears clickable, but it should be a non-clickable status indicator.
- Folder/file picker dialogs still look like raw Windows dialogs; all pickers should be CRONified where the app controls the picker UX.
- Some buttons do not work yet.
- Anything that does not work yet should be visibly marked with a red `DEV` badge.
- The right-side `Model` selector/button does not appear to work and should be marked `DEV` if not functional.
- `Create Task` and project menu actions need to be either wired or clearly marked.

## Required behaviour

### 1. Re-link folder

- `Re-link folder` must either work end-to-end or be visibly marked `DEV`.
- If implemented, it should let the user choose a new project folder and preserve history/display metadata safely.
- If not implemented in this slice, disable it and show a red `DEV` badge/label so the user knows it is not active yet.

### 2. CRON Online status

- `CRON Online` should be a status pill, not a clickable button.
- It should not have hover/click behaviour that suggests an action.
- It should remain truthful.

### 3. CRONified pickers

- Any picker UI controlled by the app should use CRON styling.
- If the app must use a native Windows folder picker for OS access, wrap the flow in a CRON-styled modal/screen before/after the native picker so the user does not feel dropped into raw Windows without context.
- Native dialogs are acceptable only where unavoidable, but the surrounding app flow must feel intentional and branded.

### 4. DEV marking for unfinished features

- Every visible unfinished/non-working feature must be marked with a red `DEV` badge.
- Examples to audit:
  - project row menu actions,
  - right-side `Model` selector,
  - assistant panel controls,
  - `Create Task`,
  - approval/evidence actions,
  - footer tabs such as PowerShell/Git/Tests/Build/Verification/Logs,
  - settings/account if not wired.
- Do not mark working features DEV.
- Do not hide unfinished items unless they should not be visible yet; if visible and not functional, mark them.

### 5. Button behaviour

- Buttons that look active must either work or be clearly disabled/DEV.
- No silent clicks.
- No dead controls that appear production-ready.

## Verification required before claiming done

Run the configured Code checks:

- typecheck
- lint
- tests
- build
- git diff check

Also do a live proof:

- click `CRON Online` and confirm it behaves as a status only,
- open project row menu and verify each action works or is red DEV marked,
- test `Re-link folder`,
- test `Create Task`,
- test the right-side Model control,
- check picker flow/presentation,
- verify unfinished controls are red DEV marked,
- verify working controls are not incorrectly DEV marked.

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`

Create:

- `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_REPORT.md`
- `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_EVIDENCE.md`

## Boundaries

- No Git commit, push, merge, PR, tag, release, rebase, reset, restore, clean, or destructive history action.
- Do not fake working functionality.
- Do not mark everything DEV blindly; audit and mark truthfully.
- Do not implement risky filesystem mutations without safeguards.
- Keep this slice focused on wiring/DEV truthfulness and picker UX polish.
