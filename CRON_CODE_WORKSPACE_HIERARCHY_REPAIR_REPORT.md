# CRON for Code — Workspace Hierarchy Repair Report

**Executed by:** CC/OpenCode (approved implementation slice)
**Date:** 2026-08-07 07:54 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task file:** `CRON_for_Code_Workspace_Hierarchy_and_Shell_Fit_Repair_Prompt.md`
**Classification:** `READY FOR ARCHITECT REVIEW`

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The selected-project workspace was restructured so the task journey (`Project → Task → Approval → Execution →
Evidence`) is visually primary and chat is secondary, without touching any execution, approval, audit, catalogue, IPC,
launcher, port, identity, or model wiring. All tests/build/lint/typecheck pass with exit code 0. Visual acceptance at
full-screen and smaller window sizes is intentionally left to Venessa (CC does not claim visual approval).

## 2. Repository identity

Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream
`main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used

Full verbatim task prompt stored in `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

## 4. Complete CRON Architect Log — Verbatim

See section 4 of this report's final response — the file `CRON_ARCHITECT_LOG.md` is included verbatim in the response
body (now 480 lines: 09:35 checkpoint, 13:33 stabilisation, 16:20 restart-safe launcher, 18:22 audit, 19:25 execution
foundation, 07:54 hierarchy repair).

## 5. Initial working-tree state

Pre-slice: 31 modified / 3 deleted / 37 untracked, nothing staged, `git diff --check` clean (all prior approved-slice
work present). Post-slice: 31 modified / 3 deleted / 39 untracked (+2 new files), nothing staged.

## 6. Confirmed UX defects

As reported by Venessa (all reproduced by component tracing): full-width flex:1 stacking of tasks/chat; wasted empty
middle area; floating safe-command dropdown; `Draft` looked like send; ultra-thin execution strip; dominant
disconnected chat; strong background bleed-through; Settings/Account flush to the taskbar; unclear journey.

## 7. Root causes

1. Layout column stacked `TaskWorkspace` + `TaskComposer` + `CronAssistant` all at `flex:1` full width.
2. Approval/execution were thin strips appended inside `TaskWorkspace` (bottom).
3. Command selector lived in the TaskWorkspace header, not attached to a task.
4. Composer button labelled `Draft` with a send-style layout.
5. Panel alphas 0.36–0.42 let the background artwork show through.
6. Sidebar lower sections had no safe scroll/fit wrapper and minimal bottom clearance.

## 8. Workspace hierarchy changes

Selected-project branch is now: `ProjectArea` → a row containing (a) primary task column = `TaskWorkspace` (task list /
active task, flex:1) → `TaskComposer` → `ActivityPanel` (approval + execution + evidence), and (b) a fixed 380px chat
column (46px when collapsed). Overlay raised to 0.88/0.92 and work panels to ~0.92–0.94 near-solid so the oryx/background
artwork no longer interferes. No business logic moved into presentation components; no store change.

## 9. Task composer and command selection

- Safe-command selector removed from the workspace header; each `TaskRow` now shows its own command `<select>`
  (aria-labelled per task) beside Queue/Run/Cancel — clearly the command for that task.
- TaskComposer action renamed `Draft` → `Create Task` (ClipboardList icon, filled accent, distinct from chat send).
  Title stays optional, description stays required; creation behaviour and validation unchanged.

## 10. Approval and execution evidence area

New dedicated `ActivityPanel` ("Approval & Evidence") — a titled, expandable lower detail surface hosting
`ApprovalPanel` (Approve/Reject, command summary, cwd, risk, requester) and `ExecutionPanel` (status, command, cwd,
start/end, duration, exit code, expandable stdout/stderr, truncation/timeout/cancel notes, cancel button while active,
compact empty states). Evidence surface ~220px (min 140px) and scrollable — replaces the ultra-thin strip. Cancellation
and status transitions preserved.

## 11. Chat placement

Chat is a secondary fixed 380px right panel with a collapse toggle (PanelRightClose) and a 46px collapsed rail with a
re-open button. Header now reads "CRON — Assistant — supporting help". LM Studio configuration, chat behaviour,
attachments, and project-context separation unchanged.

## 12. Sidebar shell-fit correction

Lower sections (Current Project, Agent State, Settings, Account) wrapped in a fixed `sidebar-lower-stack`
(`flex-shrink:0`, `min-height:0`, `overflow:hidden`); a 14px bottom spacer keeps Settings/Account clear of the Windows
taskbar; the projects list remains the only scroll region; rail gains `min-height:0`. No fixed section overlaps.

## 13. Exact files changed

Modified: `packages/core/src/components/Layout.tsx`, `TaskWorkspace.tsx`, `TaskComposer.tsx`, `CronAssistant.tsx`,
`Sidebar.tsx`, `packages/core/src/index.ts`, `packages/data-service/src/execution-service.test.ts` (flaky-test
determinism only).
Created: `packages/core/src/components/ActivityPanel.tsx`, `packages/core/src/workspace-layout.test.tsx`.
Documentation: this report + `CRON_CODE_WORKSPACE_HIERARCHY_REPAIR_EVIDENCE.md` (created), `PROJECT_LOG.md`,
`CRON_ARCHITECT_LOG.md`.

## 14. Runtime verification

`scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0 (`surface-running`, same owned PIDs vite 43880 / electron 38928 /
dev 44696). Dev server `http://127.0.0.1:5190` → HTTP 200. Renderer carries AUMID `com.cron.code.dev`. Production CRON
for Code PIDs 9032/11552/25456/28260 untouched. No unrelated process terminated. Launcher/port/identity unchanged.
(Full live visual pass at Venessa's resolutions and a smaller supported window is Venessa's step — not claimed by CC;
DOM-level behaviour is covered by the focused component tests.)

## 15. Tests, build, lint, typecheck, and quality results

| Command | cwd | Exit | Result | Evidence |
|---|---|---|---|---|
| `pnpm test` | repo root | 0 | 151 tests (contracts 20, data-service 74, host-adapter 5, core 52) | evidence §Command results |
| `pnpm typecheck` | repo root | 0 | all 7 packages clean | evidence |
| `pnpm lint` | repo root | 0 | 0 errors, 2 pre-existing warnings | evidence |
| `pnpm build` | repo root | 0 | packages + standalone renderer built | evidence |
| `pnpm format:check` | repo root | 0 | no-op `echo ok` (pre-existing) | evidence |
| `git diff --check` | repo root | 0 | clean | evidence |
| secret scan | repo root | 0 | no matches | evidence |
| launcher runtime check | repo root | 0 | surface-running exit 0; dev server 200; AUMID unchanged | evidence §Runtime proof |

New focused tests (`workspace-layout.test.tsx`, 11): layout hierarchy primary/secondary; per-task command selector;
composer Create-Task action + title-optional/description-required; ActivityPanel evidence + collapse; chat collapsed
rail; sidebar lower-stack. Regression suites (approval/execution/chat/catalogue) remain green.

## 16. Preserved protected boundaries

Port 5190; launcher files/logic; shortcut; AUMID `com.cron.code.dev`; icons/branding; package version; packaging; LM
Studio wiring; execution contracts; command catalogue + security rules; project-boundary enforcement; approval
semantics; execution harness; audit persistence; IPC validation; Git safety policy; release-gate behaviour;
repository selection logic. No OpenCode; no arbitrary command entry; no new dependencies; no broad redesign.

## 17. Remaining gaps

1. Visual/UX acceptance at full-screen and smaller supported window sizes is Venessa's manual step (not claimed).
2. `pnpm format:check` remains a no-op stub (pre-existing).
3. `node.syntax-check`/`powershell.script-test` remain catalogued but only node-based commands have been exercised
   end-to-end (pre-existing).
4. One pre-existing flaky test was made deterministic in this slice (test-only).

## 18. Final self-audit

Correct repo/branch/HEAD. Nothing staged. 31 modified / 3 deleted / 39 untracked (was 37; +2 new files, both this
slice's source/test). Only authorised layout/UI/test/log files changed; pre-existing work preserved. Launcher, port
5190, AUMID `com.cron.code.dev`, icons, packaging, LM Studio wiring, command catalogue, approval semantics, execution
harness, audit persistence, IPC validation unchanged. No OpenCode; no arbitrary command entry. Task workflow primary;
command selector in task actions; approval/execution evidence usable; chat secondary; sidebar lower sections fixed.
Tests/build/lint/typecheck pass exit 0; `git diff --check` clean; secret scan clean.

## 19. Git safety statement

Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred.
All Git commands were read-only.

## 20. Exact next action

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
