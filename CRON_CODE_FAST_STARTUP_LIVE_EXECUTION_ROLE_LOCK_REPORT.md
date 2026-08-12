# CRON for Code — Fast Startup + Human-Readable Live Execution + Gemma/Executor Role Lock Report

**Executed by:** CC/OpenCode (approved slice; continuation of the same-session approval work)
**Date:** 2026-08-12 (+10:00)
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Classification:** `READY FOR VENESSA RUNTIME TEST`

---

## 1. Final status

`READY FOR VENESSA RUNTIME TEST`

Venessa's runtime verdict is accepted: the same-session OpenCode approval/resume path is
PROTECTED (not redesigned). This slice fixed the surrounding UX/runtime problems:
- Live activity now appears incrementally (root cause found and fixed: events were only
  delivered inside the final result; a real event stream now exists end-to-end).
- Normal execution UI uses plain English; internal IDs are suppressed from the normal
  surface and remain in Review/Evidence.
- The duplicate Details list was removed; a concise final summary was added.
- The main coding surface was flattened into a conversational trail with inline approval.
- Changed Files is scoped: CURRENT TASK CHANGES vs PROJECT CHANGES.
- The Gemma planner / OpenCode executor role model is locked and enforced structurally.
- Startup: normal daily mode no longer pays the Vite cost. Cold start measured
  **16.6s → 7.1s (−57%)**; window appears in ~3s and the shell never waits for AI readiness.
- Entry screen rebalanced into a two-zone composition (maximised / restored / narrow safe).

313 automated tests pass, lint 0 errors, full build passes, `git diff --check` clean.
Nothing staged, committed, or pushed.

## 2. Repository identity

Branch `main`, HEAD `8157b12` (`feat-refine-cron-shell-layout`), remote
`https://github.com/clearline-studio/CRON-for-Code.git`. Working tree was already heavily
dirty before this slice; nothing staged at any point.

## 3. Verification input used

`CRON FOR CODE — FAST STARTUP + HUMAN-READABLE LIVE EXECUTION + GEMMA/EXECUTOR ROLE LOCK`
(36 parts) plus the standing workspace permission model. Venessa's same-session approval
verdict (from the previous slice) was treated as accepted.

## 4. Same-session approval preservation

Unchanged machinery: task → OpenCode session → permission → Approve once → SAME session
resumes → COMPLETED → APPROVED → Changed Files. Regression suites pass unchanged
(data-service runner + server-adapter tests: single execution, reject → cancelled never
completed, follow-up permission stays on the same session/execution).

## 5–8. Agent role model (LOCKED)

**GEMMA = PLANNER / ARCHITECT / READ-ONLY PROJECT COMPANION.**
**CODING MODEL VIA OPENCODE = FILE-MUTATING EXECUTOR.**
**VENESSA = FINAL APPROVAL / ACCEPTANCE AUTHORITY.**

- Gemma may inspect/explain/propose/review via the planner chat; the planner transport has
  no write/patch/delete/shell/Git-mutation API at all — enforcement is structural
  (`PLANNER_ROLE.readOnly`, `isPlannerRoute`, and the only mutation paths living on the
  executor routes).
- The executor (DeepSeek V4 Flash through OpenCode) is the sole file-modifying path and is
  gated by Venessa's approval. V4 Pro stays explicit-escalation-only (blocked unless an
  escalation approval exists).
- Venessa-go semantics: "Go / Do it / Implement it / Proceed / Build that" route the plan
  to the executor (`isGoSignal`); the exact implementation task is visible in the
  conversation as the handoff contract (Goal / Scope / Constraints / Protected areas /
  Acceptance criteria) and can be inspected before/at approval time. Gemma never
  self-approves.

## 9. Live activity architecture (Part 6 root cause)

Events were buffered because `runTask`/`replyToApproval` returned all events inside the
final result — there was no renderer→main event subscription. Now:

```
OpenCode runner emit → onEvent (OpenCodeRunnerOptions) → main.mjs webContents.send('cron:opencode:event')
→ preload ipcRenderer.on → createIpcOpenCodeRunnerClient().onEvent → CronAssistant liveActivity[taskId]
→ HandoffExecutionCard renders each step as it arrives (rail + dot + plain-English label).
```

`awaiting_approval` events carry the structured approval so Approve/Reject render inline
while the task is still running. The backend is NOT slowed; events publish immediately
(no artificial delays added anywhere).

## 10–12. Plain-English surface + no duplicates + final summary

- Statuses and messages are translated by `activity-english.ts` (single mapping point):
  "Checking project", "Working", "Waiting for approval", "Checking", "Done", …
  "Coding session started.", "Verifying the requested change.",
  "Permission answered. Continuing the task." IDs (ses_/per_/exe_/…) never appear.
- The normal card's `<details>Details</details>` duplicate list was removed; technical
  evidence lives in Review (ActivityPanel/executions/audit) only.
- Completion shows: ✓ Completed / Created: files / Checked / Tests / Changed files count.

## 13. Review / Changed Files scoping

Review pane: CURRENT TASK CHANGES (executions of the active coding task) and PROJECT
CHANGES (all time) as separate sections. Real evidence only (permission metadata filepath /
session output); historical files are never silently mixed into the current task result.

## 14–18. Startup

- Root causes measured: decision probes ~4s + Vite boot ~4s + Electron/renderer ~7s = 16.6s.
- Normal mode (default `-Mode normal`): no Vite, Electron loads the built renderer
  (`file://`); dev mode (`-Mode dev`) unchanged with HMR. Restart supervision preserved in
  both modes (dev.mjs intent polling; non-dev uses the existing `app.relaunch()`).
- Runtime marker + renderer diagnostics now run in both modes (they are the launcher's
  readiness handshake) — this was the one gap found when measuring normal mode.
- AFTER: 7.1s cold start; renderer did-finish-load ~2.5s after Electron spawn; already-
  running surface path 3.4s.
- The shell never blocks on OpenCode/LM Studio readiness (both lazy); entry screen renders
  immediately with plain-language role chips.

## 19–20. Entry screen

Two-zone balanced composition: centred content zone (Open Project / Resume / role chips,
max-width 540, readable line lengths) + right art counterbalance (40% shell background,
leftward mask). Safe at maximised/restored/narrow sizes (window min-width 800). No
redesign of the CRON shell; branding/top-nav/chips preserved.

## 21. Tests (Part 30)

New: `activity-english.test.ts` (7), `entry-screen.test.tsx` (2), chat-runtime role-lock
tests (4), runner onEvent streaming + approval-in-event assertions (2), incremental-UI
component test (1), Details-removal assertions. Total 313 tests pass (contracts 24,
data-service 93, core 173, host-adapter 23). Launcher/restart/port/AUMID/security
regressions covered by the existing repo-stabilisation suite (passing).

## 22. Exact files changed

Modified: `packages/data-service/src/opencode-runner.ts`,
`packages/core/src/chat-runtime.ts`, `packages/core/src/opencode-client.ts`,
`packages/core/src/components/CronAssistant.tsx`, `components/Layout.tsx`,
`components/EmptyState.tsx`, `workspace-layout.test.tsx`, `chat-runtime.test.ts`,
`opencode-runner.test.ts`, `apps/standalone/electron/main.mjs`, `preload.cjs`,
`apps/standalone/src/ipc-data-service.ts`, `apps/standalone/scripts/dev.mjs`,
`scripts/run-code-dev-hidden.ps1`, `apps/standalone/dist-renderer/*` (build output).
Created: `packages/core/src/activity-english.ts`, `activity-english.test.ts`,
`entry-screen.test.tsx`.

## 23. Remaining known Code gaps

1. (P2) RUNTIME C–H in the slice require Venessa's live clicks (approval card, entry-screen
   look, live progression) — the UI-side behaviors are covered by automated tests and the
   event wiring is end-to-end, but the final visual verdict is hers.
2. (P3) V4 Pro automatic escalation remains intentionally unimplemented (explicit
   escalation approval required).
3. (P3) The normal-mode renderer is the built bundle; after source edits a `pnpm build` is
   needed before the next normal-mode launch (dev mode always serves fresh source).

## 24. Git safety

Nothing staged/committed/pushed. Read-only Git inspection only. Pre-existing dirty tree
preserved.

## 25. Exact manual checks Venessa must perform

1. `pnpm build` (done here) then launch via `Launch-CRON-for-Code-Dev.bat` — expect the
   window within a few seconds (normal mode, no Vite).
2. Entry screen: maximised and restored — card centred with art counterbalance, Open
   Project / Resume obvious, no clipping.
3. Send: `Create a small test file called runtime-test.txt containing exactly: CRON CODE
   RUNTIME OK` — watch the trail appear live: Checking project → Planning/Working →
   Waiting for approval (inline Approve/Reject) → Checking → Done.
4. Click Approve once — SAME session resumes, green Completed, one execution, Changed
   Files shows runtime-test.txt under Current task.
5. Confirm no `ses_`/`per_`/`exe_` text in the normal conversation; open Review to see the
   technical evidence.
6. Request a harmless second file, click Reject — Cancelled, no file, never Completed.
7. Ask Gemma (planner) to explain something — no file changes occur; then say "Go" to
   hand work to the executor.
8. In-app Restart still converges (overlay → same window back, marker-confirmed).
