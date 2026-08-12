# CRON for Code — Same-Session OpenCode Approval / Resume Report

**Executed by:** CC/OpenCode (continuation of an interrupted implementation slice)
**Date:** 2026-08-12 (+10:00)
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Classification:** `READY FOR VENESSA RUNTIME TEST`

---

## 1. Final status

`READY FOR VENESSA RUNTIME TEST`

The interrupted same-session OpenCode approval/resume implementation was completed, restored to
internal consistency, and verified against the real installed OpenCode server (v1.18.16). The
exact OpenCode approval API was probed live: session creation, streaming message, pending
permission listing, permission reply, same-session continuation, and the requested file write
(`runtime-test.txt` containing exactly `CRON CODE RUNTIME OK`) were all proven against the
installed server. The only remaining step is Venessa's manual click-through of Approve/Reject in
the CRON UI.

All checks pass: typechecks (contracts/data-service/core/standalone/host-adapter), 298 tests
(contracts 24, data-service 92, core 159, host-adapter 23), full build, lint (0 errors), and
`git diff --check`. Nothing staged, committed, or pushed.

## 2. Repository identity (re-verified before any edit)

- Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`)
- Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`
- Working tree was already heavily dirty before this slice; nothing staged before or after.

## 3. Verification input used

The interrupted continuation prompt `CRON FOR CODE — RESUME INTERRUPTED SAME-SESSION APPROVAL
IMPLEMENTATION` (execution-ID/session correlation completion, same-session approve/reject,
completion truth, changed-file evidence, live-session behavior). The prior partial work was
preserved, not reverted or rebuilt.

## 4. What was incomplete when this session resumed

1. **Execution-ID correlation:** `OpenCodeRunner.replyToApproval` created a **new** execution
   record (`newId('exe')`) after approval instead of continuing the same `approval.executionId`
   — every approve/reject produced a duplicate execution.
2. **Completion detection bug:** `isPromiseSettled` used
   `Promise.race([promise.then(...), Promise.resolve(marker)])`; for an already-settled promise
   the microtask ordering guaranteed the `marker` won, so the runner could **never** detect
   message completion after a permission reply — the session resume loop polled forever.
3. **Wrong API shapes for the installed version:** the runner used
   `GET /api/session/{sessionID}/permission?location[directory]=...` (returns `{"data":[]}`
   without instance middleware) and posted replies to
   `/api/session/{sessionID}/permission/{requestID}/reply`. The installed OpenCode 1.18.16
   desktop client uses `GET /permission?directory=...` (raw array) and
   `POST /permission/{requestID}/reply?directory=...`.
4. **Missing server auth:** this environment has `OPENCODE_SERVER_USERNAME` /
   `OPENCODE_SERVER_PASSWORD` set (by the OpenCode Desktop app); every endpoint requires Basic
   auth, so the runner's server would 401 on health and never start a session.
5. **Model payload mismatch between endpoints:** `POST /session` requires
   `model:{providerID,id}`, `POST /session/{id}/message` requires
   `model:{providerID,modelID}` (verified by 400 responses for the wrong key).
6. **Changed-file evidence:** `GET /session/{id}/diff` returns `[]` on this version for
   untracked files, so evidence is sourced from the permission request's `metadata.filepath`
   (real, verified data) rather than fabricated.

## 5. How executionId/session correlation was completed

- The pending CRON approval stores `executionId`, `openCodeSessionId`, `openCodePermissionId`,
  `openCodeMessageId`, `openCodeCallId` (`requestOpenCodeApproval`).
- `replyToApproval` now resolves the continuation execution from `approval.executionId`,
  preserves the original record's `startedAt`, and upserts the **same** execution record to
  `completed` / `cancelled` / `failed` / `blocked` — exactly one execution per task.
- Follow-up permissions after approval stay on the same session and same executionId, creating
  a new CRON approval tied to the same execution (approved by dedicated tests).
- `waitForPermissionOrCompletion` skips the just-replied permission id and is bounded
  (10 minutes), returning a follow-up pending permission if the resumed session asks again.
- `isPromiseSettled` rewritten (settled-flag + microtask drain) so message completion is
  reliably detected after the reply.

## 6. Exact OpenCode approval API used (verified against installed 1.18.16)

| Step | Request |
| --- | --- |
| Health | `GET /global/health` (Basic auth) → `{"healthy":true,"version":"1.18.16"}` |
| Create session | `POST /session?directory=<cwd>` body `{title, agent:'build', model:{providerID, id}}` → `{"id":"ses_..."}` |
| Send message | `POST /session/{sessionID}/message?directory=<cwd>` body `{messageID, model:{providerID, modelID}, agent:'build', parts:[{type:'text',text}]}` (stays open while the session works) |
| List pending permission | `GET /permission?directory=<cwd>` → raw array `[{id, sessionID, permission, patterns, tool:{messageID,callID}, metadata:{filepath,diff}}]` |
| Reply to permission | `POST /permission/{requestID}/reply?directory=<cwd>` body `{reply:'once'|'reject', message}` → `true` |
| Session diff (best-effort) | `GET /session/{sessionID}/diff?directory=<cwd>` → `[]` for untracked files on this version; permission `metadata.filepath` used as real evidence |

Basic auth header: `Authorization: Basic base64(OPENCODE_SERVER_USERNAME:OPENCODE_SERVER_PASSWORD)`
(applied to every request; skipped when the env password is unset).

## 7. Approve behavior

1. Venessa clicks Approve → `cron:opencode:reply-approval` IPC → `OpenCodeRunner.replyToApproval`.
2. Resolves the exact pending CRON approval (id + taskId + status `requested` checked).
3. Reads the exact `openCodeSessionId` + `openCodePermissionId`.
4. POSTs `{reply:'once', message}` to `/permission/{requestID}/reply?directory=<cwd>`.
5. The **same OpenCode session continues** (no new session, no resend of the task, no duplicate
   execution).
6. On completion: the same execution record is updated to `completed`, task to `completed`,
   session diff/permission metadata written as `Changed: <path>` evidence into the record.
7. Approval marked `approved`, audit events written.

## 8. Reject behavior

1. Same resolution path, same permission-reply endpoint with `{reply:'reject', message}`.
2. The same execution record is updated to `cancelled` with error `APPROVAL_REJECTED`.
3. Task → `cancelled`; approval → `rejected`. Never `COMPLETED`.
4. No file write is performed by CRON; no second task is created.

## 9. Same-session proof

- Live probe against the installed server (see evidence §6): session `ses_00d3e622bffeEVisfav5ZlCIAq`
  → message streamed → permission `per_ff2c1bbff001Z6GSRzc5wtd5wK` asked → reply `once` →
  `true` → **the same message/session resumed** (`finish:"stop"`, same sessionID, parts include
  `Created runtime-test.txt.`) → file content read back as exactly `CRON CODE RUNTIME OK`.
- Automated mock-server integration tests assert the exact request/response shapes, that the
  same session/message continues, that no duplicate execution/task is created, and that
  reject resolves the exact request and never completes.

## 10. Changed Files / diff behavior

- `GET /session/{sessionID}/diff?directory=<cwd>` is consulted after message completion.
- On OpenCode 1.18.16 it returns `[]` for untracked files, so the runner falls back to the
  pending permission's real `metadata.filepath` (verified against the server) and writes
  `Changed: <path>` into the same execution record's output.
- `Layout.deriveChangedFiles` renders those lines into Changed Files. No fabricated evidence.

## 11. Completion truth

`COMPLETED` is only reached when the resumed OpenCode session finishes with a clean result and
verification succeeds. Permission rejection (CRON-side or OpenCode auto-reject without a
resumable session), failed writes, and cancellations all end in `failed`/`blocked`/`cancelled`
— never `COMPLETED`. Tests cover each case.

## 12. Verification gate — raw results

| Command | Result |
| --- | --- |
| `pnpm --filter @cron-code/contracts build` | PASS exit 0 |
| `pnpm --filter @cron-code/contracts test` | PASS — 24 tests |
| `pnpm --filter @cron-code/data-service typecheck` | PASS exit 0 |
| `pnpm --filter @cron-code/data-service test` | PASS — 92 tests |
| `pnpm --filter @cron-code/core typecheck` | PASS exit 0 |
| `pnpm --filter @cron-code/core test` | PASS — 159 tests |
| `pnpm --filter @cron-code/standalone typecheck` | PASS exit 0 |
| `pnpm --filter @cron-code/host-adapter typecheck/test` | PASS — 23 tests |
| `pnpm build` (full) | PASS exit 0 |
| `npx eslint .` | PASS — 0 errors (2 pre-existing warnings) |
| `git diff --check` | PASS exit 0 (clean) |

## 13. Exact files changed by this continuation

- `packages/data-service/src/opencode-runner.ts` — correlation completion, verified API,
  auth, isPromiseSettled fix, diff evidence, follow-up permission support
- `packages/data-service/src/index.ts` — exports `createOpenCodeServerAdapter` +
  `OpenCodeServerAdapterOptions`
- `packages/data-service/src/opencode-server-adapter.test.ts` — **new** mock-server
  integration tests (approve + reject against the verified installed API contract)
- `packages/data-service/src/opencode-runner.test.ts` — **extended** (7 new same-session tests)
- `packages/core/src/workspace-layout.test.tsx` — mock `replyToApproval` added to the
  runner client stub

(The rest of the slice's changed-file list — contracts approval fields, CronAssistant/Layout
wiring, preload/main.mjs/ipc-data-service `cron:opencode:reply-approval` — was completed by the
interrupted slice and verified intact.)

## 14. Remaining risks

1. (P2) The final click-through must be performed by Venessa in the running app (Step 3 of the
   slice: task → approval card → Approve → same session → `runtime-test.txt` → green COMPLETED).
2. (P2) `/session/{sessionID}/diff` is empty for untracked files on OpenCode 1.18.16; evidence
   falls back to permission `metadata.filepath`. Tracked-file diffs may behave differently and
   are covered by the same code path.
3. (P3) DeepSeek V4 Pro escalation remains intentionally blocked (explicit escalation approval
   not implemented — out of this slice's scope).

## 15. Git safety statement

Nothing staged, committed, pushed, reset, restored, cleaned, or reverted. All Git commands were
read-only. Pre-existing dirty working tree left exactly as it was, plus this slice's files.

## 16. Exact next action

Venessa runs the runtime test (Section 14, item 1) using the Dev launcher, then accepts/rejects
this report. If accepted, the Architect may approve the next CC prompt.
