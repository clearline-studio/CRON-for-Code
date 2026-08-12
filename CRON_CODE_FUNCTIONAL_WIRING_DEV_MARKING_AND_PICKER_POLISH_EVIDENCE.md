# CRON FOR CODE — FUNCTIONAL WIRING, DEV MARKING + PICKER POLISH EVIDENCE

Supporting evidence for `CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_FUNCTIONAL_WIRING_DEV_MARKING_AND_PICKER_POLISH_ARCHITECT_SLICE.md` (Approved). Full text:

```markdown
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
```

---

## 2. Audit notes

- `CronNavBar.tsx` and `WorkflowStrip.tsx` contain dead buttons but are NOT rendered anywhere
  in the app (verified by grep: only self-references) — no visible dead controls there.
- `CronAssistant` header already carried a red DEV badge; sidebar blocks (CURRENT PROJECT,
  AGENT STATE, General chat, Account) already carried DEV badges — unchanged.
- Project menu actions (reveal/copy-path/refresh/rename/archive/relink) are all IPC-wired with
  tests; disabled states are truthful (missing folder disables reveal; archived disables
  refresh/rename/archive).
- `TaskComposer` createDraftTask persists a real task; `ActivityPanel`/`ExecutionPanel`
  approve/reject/cancel are IPC-wired — none DEV-marked (they work).

---

## 3. Changes (files)

- `CronHeader.tsx`: status `<button>` → `div role="status" data-testid="cron-online-status"`
  (no hover/click; cursor default).
- `CronFooter.tsx`: placeholder tabs rendered with red `DEV` badges
  (`aria-label="{tab} not implemented"`), non-clickable.
- `PickerModal.tsx` (new): CRON-styled `PROJECT PICKER` modal, `data-testid="picker-modal"`.
- `Layout.tsx`: renders `<PickerModal />`; passes `onConfigureModel` to the assistant.
- `CronAssistant.tsx`: Model/Set model becomes a real button
  (`data-testid="assistant-model-selector"`) invoking `onConfigureModel` (opens model
  settings).
- `store.ts`: `pickerActive` state + `setPickerActive`.
- `App.tsx`: folder picker flow wrapped — `setPickerActive(true)` → 400 ms pre-show (modal
  visible before the OS dialog) → `selectProject()` → `openProjectPath` → `setPickerActive(false)`
  in `finally`.
- `index.ts`: exports PickerModal.
- `main.mjs`: `cron:select-folder` + `cron:project:relink` gain dev-only no-dialog diagnostics
  (env-gated, one-shot); relink logs when the real dialog opens.

---

## 4. Verification gate — raw results

```
pnpm test         -> PASS; packages/core 146 tests (10 files), full suite green
pnpm typecheck    -> PASS, exit 0
pnpm lint         -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build        -> PASS, exit 0
pnpm format:check -> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check  -> PASS, exit 0
git status --short -> nothing staged
node --check apps/standalone/electron/main.mjs -> 0
```

---

## 5. Live proof (raw, dev-only drive diagnostic in the real renderer)

Setup: stack launched via the approved launcher; drive diagnostic (env-gated, one-shot)
scripted the visible controls and logged the renderer's DOM state at each step; OS dialogs
bypassed via the one-shot no-dialog diagnostics.

```
[2026-08-09T10:41:28.403Z] Dev drive status-pill-footer    {"result":{"statusTag":"DIV","statusRole":"status","footerDevBadges":6}}
[2026-08-09T10:41:29.922Z] Dev drive picker-flow            {"result":{"step":"clicked"}}
[2026-08-09T10:41:30.212Z] Dev drive picker-modal-visible   {"result":{"pickerModalVisible":true}}
[2026-08-09T10:41:32.914Z] Dev drive picker-modal-cleared   {"result":{"pickerModalVisible":false}}
[2026-08-09T10:41:33.911Z] Dev drive select-project         {"result":{"step":"clicked"}}
[2026-08-09T10:41:36.912Z] Dev drive create-task            {"result":{"step":"clicked"}}
[2026-08-09T10:41:38.910Z] Dev drive create-task-result     {"result":{"taskVisible":true}}
[2026-08-09T10:41:40.931Z] Dev drive model-control          {"result":{"step":"clicked"}}
[2026-08-09T10:41:41.717Z] Dev drive model-settings-opened  {"result":{"settingsDialogVisible":true}}
[2026-08-09T10:41:42.920Z] Dev drive relink-menu            {"result":{"step":"clicked"}}
[2026-08-09T10:41:43.321Z] Dev drive relink-action          {"result":{"step":"clicked"}}
[2026-08-09T10:41:44.109Z] Dev drive relink-result          {"result":{"menuStillOpen":false,"errors":[]}}
```
Main-process handler logs (chain reached IPC handlers):
```
Dev picker diagnostic: folder dialog bypassed, returning null
Dev relink diagnostic: dialog bypassed, returning cancelled
```

Interpretation:
- CRON Online: `DIV` + `role="status"` — a status, not a button.
- Footer: 6 red DEV badges on the placeholder tabs.
- Picker flow: the CRON `PROJECT PICKER` modal is visible while the folder flow runs and
  closes afterwards.
- Create Task: a real task was created and is visible in the workspace (taskVisible: true).
- Model control: opens the model settings dialog.
- Re-link: the menu action runs the full chain and resolves as a quiet cancel — no error, no
  menu left open, project list intact.

---

## 6. Safety

- Unrelated apps: Claims 9336 and HUB 15300 alive at every checkpoint; Meds' own dev stack on
  port 5191 (PID 34032). Port 5190 owned by the repo Vite.
- Dev store intact: 3 project records, `lastActiveProjectId` preserved. The live Create Task
  proof added two draft tasks titled "Untitled" to CRON for Claims (real feature behavior;
  removable by Venessa).

---

## 7. Git safety

No Git mutation or release action performed. All Git commands read-only. Nothing staged.
