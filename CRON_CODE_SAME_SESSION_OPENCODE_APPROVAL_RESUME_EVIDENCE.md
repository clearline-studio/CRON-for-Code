# CRON FOR CODE — SAME-SESSION OPENCODE APPROVAL / RESUME EVIDENCE

Supporting evidence for `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` on
2026-08-12 (+10:00) unless stated. Exit codes recorded verbatim.

---

## 1. Repo identity re-verification (pre-edit)

```
> git status (short)          -> branch main, up to date with origin/main; heavy pre-existing dirty tree
> git rev-parse --short HEAD  -> 8157b12
> git branch --show-current   -> main
> git remote get-url origin   -> https://github.com/clearline-studio/CRON-for-Code.git
> git log --oneline -5        -> 8157b12 feat-refine-cron-shell-layout / d432bcb feat: establish working Cron for Code
```

## 2. Build-state recovery (narrowest first)

```
> pnpm --filter @cron-code/contracts build     -> PASS (tsc)
> pnpm --filter @cron-code/data-service typecheck
  1st run: FAIL src/opencode-runner.ts(940,7): 'executionId' does not exist in type 'Approval'
  (stale dist race; contracts build finished first) -> re-run PASS
> pnpm --filter @cron-code/core typecheck
  FAIL: opencode-client.ts imports OpenCodeApprovalReplyInput/Result — data-service dist stale
  -> pnpm --filter @cron-code/data-service build; re-run: PASS (only remaining error:
  workspace-layout.test.tsx mock missing replyToApproval — fixed by adding vi.fn() stub)
> pnpm --filter @cron-code/standalone typecheck -> PASS
```

## 3. Root-cause: isPromiseSettled completion-detection bug

```
OLD:
  async function isPromiseSettled(promise) {
    const marker = Symbol('pending');
    const result = await Promise.race([promise.then(() => true, () => true), Promise.resolve(marker)]);
    return result !== marker;
  }
  Microtask order for an ALREADY-SETTLED promise: promise.then callback queued, then
  Promise.resolve(marker) reaction queued -> marker reaction runs first -> ALWAYS false.
  -> waitForPermissionOrCompletion could never see the resumed message complete.

NEW (verified by standalone + vitest runs):
  async function isPromiseSettled(promise) {
    let settled = false;
    void promise.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    await Promise.resolve();
    return settled;
  }
```

## 4. Installed OpenCode version and auth discovery

```
> opencode --version -> 1.18.16
> Get-ChildItem Env: (filter OPENCODE*) ->
    OPENCODE_SERVER_PASSWORD=<set by OpenCode Desktop>  OPENCODE_SERVER_USERNAME=opencode
    OPENCODE_CLIENT=desktop  OPENCODE_DISABLE_EMBEDDED_WEB_UI=true
> opencode serve -> returns 401 Basic realm="Secure Area" on EVERY endpoint without auth
  (binary string analysis: ServerAuthConfig requires password when OPENCODE_SERVER_PASSWORD non-empty;
   username defaults to 'opencode'; authorized = username match + password match)
```

## 5. Live API-shape probe against the installed server (probe runs)

`C:\Users\venes\AppData\Local\Temp\opencode\cron-api-probe\` (throwaway Git repo).

### 5.1 No-auth probe (401 confirmed)

```
plain GET /global/health          -> 401 Basic realm="Secure Area"
GET /api/health                   -> 401 {"_tag":"UnauthorizedError","message":"Authentication required"}
POST /session                     -> 401
```

### 5.2 With Basic auth — endpoint shapes

```
GET /global/health                -> 200 {"healthy":true,"version":"1.18.16"}
POST /session?directory=<cwd> body {title:'CRON API probe', agent:'build',
     model:{providerID:'deepseek', id:'deepseek-v4-flash'}} -> 200 {"id":"ses_00d56b02fffeJDMhrGHexFxWly",...}
POST /session model:{modelID:...} -> 400 {"_tag":"BadRequest"}        (session wants {id})
POST /session/{id}/message model:{id:...} -> 400 Missing key at ["model"]["modelID"]
     (message wants {modelID})
```

### 5.3 Full same-session flow (probe9) — verbatim key lines

```
SESSION: ses_00d3e622bffeEVisfav5ZlCIAq
POLL#2 [classic list dir]: 200 [{"id":"per_ff2c1bbff001Z6GSRzc5wtd5wK","sessionID":"ses_00d3e622bffeEVisfav5ZlCIAq",
  "permission":"edit","patterns":["runtime-test.txt"],
  "metadata":{"filepath":"C:\\...\\cron-api-probe\\runtime-test.txt","diff":"Index: ... \n+CRON CODE RUNTIME OK"},
  "tool":{"messageID":"ms...","callID":"cl..."},"always":["*"]}]
REPLYING to per_ff2c1bbff001Z6GSRzc5wtd5wK
REPLY OK: true
MESSAGE RESOLVED: {"info":{"parentID":"msg_probe_...","role":"assistant","mode":"build","agent":"build",
  "finish":"stop","id":"msg_ff2c1c278001Fhit1CfJS8STyL","sessionID":"ses_00d3e622bffeEVisfav5ZlCIAq",...},
  "parts":[...,{"type":"text","text":"Created `runtime-test.txt`."},...]}
DIFF: 200 []                          <- /session/{id}/diff empty for untracked file on 1.18.16
FILE EXISTS: true content=[CRON CODE RUNTIME OK]   <- actual write, exact content
```

Server log confirmed same-session continuation:
```
evaluated permission=edit pattern=runtime-test.txt action.permission=edit action.pattern=* action.action=ask
asking id=per_ff2c1bbff001Z6GSRzc5wtd5wK permission=edit patterns=["runtime-test.txt"]
```
(v2 endpoints `/api/session/{id}/permission` and `/api/permission/request` returned
`{"data":[]}` even while a permission was pending — instance middleware; the classic
`/permission` routes are what the installed desktop client uses.)

## 6. Automated tests

### 6.1 opencode-runner.test.ts (16 tests) — new same-session cases

```
✓ preserves executionId, sessionID, and permissionID correlation on the pending approval
✓ approve resumes the same execution and never creates a duplicate record or task
✓ reject resolves the exact session/request, keeps the same execution, and never reports completed
✓ maps session diff evidence back to the correct execution record after approval
✓ a follow-up permission after approval stays on the same session and execution
✓ approving the follow-up finishes the same execution as completed
✓ never marks permission auto-rejection or a rejected CLI permission as completed
Test Files  1 passed (1)   Tests  16 passed (16)
```

### 6.2 opencode-server-adapter.test.ts (2 tests, new) — mock server implementing the verified contract

```
✓ creates the session, streams the message, surfaces the permission, and resumes the same
  session after approval   (asserts POST /session {providerID,id}, POST /message {providerID,modelID},
  GET /permission?directory=, POST /permission/per_mock_1/reply {reply:'once'}, same executionId,
  1 execution completed, 'Changed:' evidence, task completed)
✓ rejects the exact permission request and never completes
  (reply 'reject', same executionId, 1 execution cancelled, APPROVAL_REJECTED, task cancelled,
  approval rejected)
Test Files  1 passed (1)   Tests  2 passed (2)
```

### 6.3 Full suites

```
contracts:    Test Files 4 passed   Tests 24 passed
data-service: Test Files 9 passed   Tests 92 passed
core:         Test Files 11 passed  Tests 159 passed
host-adapter: Test Files 2 passed   Tests 23 passed
TOTAL 298 tests, 0 failed
```

## 7. Full verification gate

```
> pnpm --filter @cron-code/contracts build            -> PASS
> pnpm --filter @cron-code/data-service typecheck     -> PASS
> pnpm --filter @cron-code/data-service build         -> PASS
> pnpm --filter @cron-code/core typecheck             -> PASS
> pnpm --filter @cron-code/standalone typecheck       -> PASS
> pnpm --filter @cron-code/host-adapter typecheck     -> PASS
> pnpm build                                          -> PASS (contracts, data-service, host-adapter,
                                                           core vite + tsc, standalone vite)
> npx eslint . --ext .ts,.tsx,.mjs,.cjs               -> PASS: 0 errors, 2 pre-existing warnings
> git diff --check                                    -> PASS (exit 0, no errors)
```

## 8. Honest failed attempts during the slice

1. `isPromiseSettled` race bug — after the reply the resume loop polled forever
   (`approve` integration test timed out). Reproduced outside vitest with a standalone script
   using the real built packages, root-caused, fixed, re-verified.
2. A test's `finally { await mock.close() }` hung when an assertion failed because
   `server.close()` waits for the held-open message connection — fixed with
   `server.closeAllConnections()` before close. This masked earlier assertion failures as
   "timeouts" (path separator mismatch on the permission `target`).
3. `connection: close` experiment on the reply POST — unnecessary; reverted.
4. Mock message-handler response serialization experiment — unnecessary; reverted to immediate
   replies (matching the real server's observed behavior).

## 9. Files touched by this continuation

- Modified: `packages/data-service/src/opencode-runner.ts`, `packages/data-service/src/index.ts`,
  `packages/data-service/src/opencode-runner.test.ts`, `packages/core/src/workspace-layout.test.tsx`
- Created: `packages/data-service/src/opencode-server-adapter.test.ts`
- Docs: this evidence file, `CRON_CODE_SAME_SESSION_OPENCODE_APPROVAL_RESUME_REPORT.md`,
  `CRON_ARCHITECT_LOG.md` (appended), `PROJECT_LOG.md` (appended)

## 10. Final git status (slice close)

Working tree unchanged in kind from the pre-slice state plus the files above. Nothing staged,
nothing committed, nothing pushed. No Git mutation performed.
