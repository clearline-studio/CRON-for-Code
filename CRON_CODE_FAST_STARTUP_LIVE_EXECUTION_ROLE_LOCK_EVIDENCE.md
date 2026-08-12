# CRON FOR CODE — FAST STARTUP + HUMAN-READABLE LIVE EXECUTION + GEMMA/EXECUTOR ROLE LOCK EVIDENCE

Supporting evidence for `CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` on
2026-08-12 (+10:00) unless stated. Exit codes recorded verbatim.

---

## 1. Repo identity (verified pre-edit)

```
> git rev-parse --short HEAD   -> 8157b12
> git branch --show-current    -> main
> git remote get-url origin    -> https://github.com/clearline-studio/CRON-for-Code.git
> git status --short | Measure -> 143 entries (pre-existing dirty working tree; nothing staged)
```

## 2. Same-session approval runtime verdict (Venessa, prior slice)

Recorded in `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_REPORT.md`:
approve-once → SAME OpenCode session continued → COMPLETED, APPROVED, Changed Files updated.
No duplicate task. This flow was NOT redesigned; the slice only added incremental event
delivery, plain-language rendering, scoped changed-files, and startup/entry-screen repair.

## 3. Event-timing root cause (Part 6) — measured, not guessed

```
BEFORE FIX: OpenCodeRunner.runTask collected events in a private array and returned them
            ONLY inside the final OpenCodeRunResult. IPC 'cron:opencode:run-task' resolved
            once. Renderer setRunnerResults() -> ALL statuses rendered in one bulk dump.
            There was NO event subscription from renderer -> main at all.

AFTER FIX:  - OpenCodeRunnerOptions.onEvent streams every event the instant it is emitted
              (runner publish() -> main.mjs -> webContents.send('cron:opencode:event') ->
              preload ipcRenderer.on -> renderer onEvent subscription).
            - CronAssistant keeps liveActivity[taskId] and re-renders per event.
            - awaiting_approval events now carry the structured approval payload so
              Approve/Reject render inline while the task is still running.
```

Evidence (unit): `opencode-runner.test.ts` — "streams runner events to the onEvent
subscription as they occur" (17 runner tests pass) and "preserves executionId, sessionID,
and permissionID correlation" (asserts the live awaiting event carries the approval).
Component: `workspace-layout.test.tsx` — "publishes live activity incrementally as runner
events arrive (no bulk dump)" pushes a `running` event while `runTask` is still pending and
asserts "Coding session started." appears immediately.

## 4. Plain-English mapping (Parts 5/8/21)

`packages/core/src/activity-english.ts` — single translation point:
- Statuses: validating → "Checking project", running → "Working",
  awaiting_approval → "Waiting for approval", verifying → "Checking",
  completed → "Done", failed → "Failed", cancelled → "Cancelled", blocked → "Needs attention".
- Message translations: "OpenCode server session ses_… created" → "Coding session started.";
  "Verifying OpenCode result after approval" → "Verifying the requested change.";
  "OpenCode permission per_… answered in session ses_…" → "Permission answered. Continuing
  the task."; IDs (ses_/per_/exe_/msg_/task_/appr_/prt_/aud_) are stripped.
- `summarizeActivity` builds the final plain-English summary (Created/Checked/Tests/Changed files).

Tests: `activity-english.test.ts` (7 tests) — status labels, ID suppression, message
translation, final summary truth (cancelled/failed never claim completion).

## 5. Duplicate Details removal (Part 9)

`HandoffExecutionCard` no longer renders the `<details>Details</details>` duplicate event
list. Normal surface = concise trail; technical evidence = Review pane (ActivityPanel +
executions + audit). Asserted in `workspace-layout.test.tsx`:
`expect(screen.queryByText('Details')).toBeNull()`.

## 6. Flattened main coding experience (Parts 10/11/12)

`HandoffExecutionCard` rewritten as a conversational trail: CRON request line, vertical
rail with status dots, inline "Waiting for your approval" block (target + reason +
Approve/Reject), and a "✓ Completed" summary block. User request bubble stays right-aligned
(chat list). Approval remains prominent but inside the flow (inline, not nested cards).

## 7. Changed Files scoping (Part 14)

`Layout.ReviewPane` now shows CURRENT TASK CHANGES (executions of the most recent
opencode.runner execution's task) and PROJECT CHANGES (all time) as distinct sections —
historical/test files are never silently mixed into the current-task result. Evidence is
real (permission metadata filepath / session output), never fabricated.

## 8. Gemma planner / OpenCode executor role lock (Parts 1-4, 23-25)

- `chat-runtime.ts`: `PLANNER_ROLE` constant (readOnly: true, Gemma model);
  `isPlannerRoute`; `isGoSignal` (Go / Do it / Implement it / Proceed / Build that /
  yes please → executor route).
- Planner transport (local-chat / local-vision) is structurally pure conversation: the
  only mutation entry points in CronAssistant are on the `opencode-flash` /
  `pro-escalation` executor routes (`createDraftTask` + `runTask`). Gemma can never
  call them; it has no write/patch/delete/shell API.
- Handoff contract (`buildOpenCodeHandoffPrompt`) now contains EXECUTION TASK / Goal /
  Scope / Constraints / Protected areas / Acceptance criteria — no hidden reasoning.
- Gemma cannot self-approve: Approve/Reject always route to Venessa via
  `cron:opencode:reply-approval`.
- Tests: `chat-runtime.test.ts` (4 new) — planner marked read-only, planner route free of
  mutation capability, go-signals, handoff contract sections.

## 9. Startup BEFORE measurement (Part 31) — dev mode cold start

```
> powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1 -Port 5190 -Mode dev
TOTAL_ELAPSED_SEC=16.6
[11:59:11] launcher starting
[11:59:15] lifecycle decision: fresh-start (state probes ~4s)
[11:59:16] dev command started (vite + electron)
[11:59:20] vite reachable on 5190 (~4s vite boot)
[11:59:27] app ready (electron + renderer-ready marker ~7s)
```

## 10. Startup AFTER measurement — normal mode cold start (built renderer, no Vite)

```
> powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1 -Port 5190   (Mode default: normal)
TOTAL_ELAPSED_SEC=7.1
[12:05:12] launcher starting
[12:05:14] lifecycle decision: fresh-start (~2s)
[12:05:15] dev command started (electron only)
[12:05:17] renderer did-finish-load: file:///.../dist-renderer/index.html   (~2.5s after spawn)
[12:05:18] app ready (renderer-ready marker confirmed)
```

BEFORE 16.6s → AFTER 7.1s = **9.5s faster (−57%)**. Electron spawn → usable window ≈ 3s.
Already-running surface path: 3.4s (12:06:51 → 12:06:54, normal-mode surface override).

## 11. Normal-mode implementation (Part 16)

- `apps/standalone/scripts/dev.mjs`: `CRON_RUN_MODE=normal` skips Vite entirely (and the
  2s warm-up wait), spawns Electron with `CRON_DEV=0` → main loads `dist-renderer`
  (file://). Restart supervision (intent polling) is unchanged; non-dev restart uses the
  existing `app.relaunch()` path.
- `scripts/run-code-dev-hidden.ps1`: `-Mode dev|normal` (default normal); normal mode skips
  the Vite port wait, surfaces a healthy running normal-mode stack, and falls back to dev
  mode with a clear log line when `dist-renderer/index.html` is missing.
- `main.mjs`: runtime marker (`writeDevRuntimeMarker`) is now written in BOTH modes (it is
  the launcher's readiness handshake) and `attachRendererStartupDiagnostics` is attached in
  both modes; `loadFile(RENDERER_ENTRY)` unchanged (production path).
- No production/unrelated CRON apps touched. Port 5190 preserved. AUMID untouched
  (`--app-user-model-id=com.cron.code.dev` unchanged).

## 12. Shell never blocks on AI/executor readiness (Part 18)

OpenCode server + runner are lazily constructed on the first coding task
(`ensureOpenCodeRunner`); LM Studio is lazy too. Project navigation and the entry screen
render immediately; the entry screen labels the roles in plain language
("Planner: Gemma", "Executor: OpenCode", "Release Gate: Locked").

## 13. Entry-screen balance + responsiveness (Parts 19/20)

`EmptyState.tsx` rewritten as a balanced two-zone composition: a left content zone
(centered, max-width 540, readable line lengths) with Open Project / Resume a project /
role chips, and a right art zone (40%, shell background art with a leftward mask) that
counterbalances the card. Window min width is 800px; the composition holds at maximised,
restored, and narrow sizes without clipping or a stranded far-left card.
Tests: `entry-screen.test.tsx` (2 tests).

## 14. Automated verification results

```
contracts:    Test Files 4 passed   Tests 24 passed
data-service: Test Files 9 passed   Tests 93 passed
core:         Test Files 13 passed  Tests 173 passed
host-adapter: Test Files 2 passed   Tests 23 passed
TOTAL 313 tests, 0 failed

> pnpm --filter @cron-code/contracts build  -> PASS
> pnpm --filter @cron-code/data-service build -> PASS
> pnpm --filter @cron-code/host-adapter build -> PASS
> pnpm --filter @cron-code/core build         -> PASS (vite dist)
> pnpm --filter @cron-code/standalone build   -> PASS (dist-renderer, 5.47s)
> npx eslint . --ext .ts,.tsx,.mjs,.cjs       -> 0 errors, 2 pre-existing warnings
> git diff --check                            -> exit 0, clean
```

Same-session approve/reject regression suites (Part 22) pass unchanged:
- `opencode-runner.test.ts` (17): correlation preserved, approve resumes the same
  execution (1 record), reject → cancelled never completed, follow-up permission stays on
  the same session/execution, auto-reject never completed.
- `opencode-server-adapter.test.ts` (2): mock server implementing the verified installed
  OpenCode API — approve + reject against the exact request shapes.

## 15. Final git status (slice close)

```
Working tree: pre-existing dirty state + this slice's modifications:
  Modified: packages/data-service/src/opencode-runner.ts, packages/core/src/chat-runtime.ts,
            packages/core/src/opencode-client.ts, packages/core/src/components/CronAssistant.tsx,
            packages/core/src/components/Layout.tsx, packages/core/src/components/EmptyState.tsx,
            packages/core/src/workspace-layout.test.tsx, packages/core/src/chat-runtime.test.ts,
            packages/data-service/src/opencode-runner.test.ts,
            apps/standalone/electron/main.mjs, apps/standalone/electron/preload.cjs,
            apps/standalone/src/ipc-data-service.ts, apps/standalone/scripts/dev.mjs,
            scripts/run-code-dev-hidden.ps1, apps/standalone/dist-renderer/*
  Created:  packages/core/src/activity-english.ts, packages/core/src/activity-english.test.ts,
            packages/core/src/entry-screen.test.tsx
  Docs:     CRON_CODE_FAST_STARTUP_LIVE_EXECUTION_ROLE_LOCK_REPORT.md (created),
            this evidence file (created), CRON_ARCHITECT_LOG.md (appended),
            PROJECT_LOG.md (appended)
Nothing staged. No Git mutation performed.
```
