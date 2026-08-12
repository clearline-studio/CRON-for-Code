# CRON for Code — Safe Execution and Approval Foundation — Evidence

**Executed by:** CC/OpenCode (approved implementation slice)
**Date:** 2026-08-06 19:25 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved implementation slice — `Safe Task-Execution Harness and Approval-Gate Foundation`.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice, stored verbatim:

```markdown
Called the Read tool with the following input: {"filePath":"S:\\Backup\\CRON BOX\\CRON_for_Code_Safe_Execution_and_Approval_Foundation_Prompt (1).md"}

You are CC/OpenCode working inside the CRON for Code repository.

PROJECT
CRON for Code

EXPECTED REPOSITORY
C:\Users\venes\projects\CRON APPS\CRON for Code

TASK TYPE
Approved implementation slice.

SLICE TITLE
Safe Task-Execution Harness and Approval-Gate Foundation

PRIMARY OBJECTIVE
Implement the first real execution foundation for CRON for Code without adding OpenCode/agent autonomy yet.

This slice must:

1. add explicit execution-domain contracts;
2. enforce selected-project repository boundaries;
3. add a safe allowlisted PowerShell execution harness;
4. add timeout and cancellation;
5. capture exact command, working directory, timestamps, exit code, stdout and stderr;
6. persist append-only execution and audit records;
7. wire the existing task and approval flow into the UI;
8. require approval before any executable task runs;
9. display execution state and evidence;
10. preserve the accepted shell, LM Studio chat, launcher, port and Windows identity;
11. return a fully verified `READY FOR ARCHITECT REVIEW` report without staging, committing or pushing.

This is not an OpenCode integration task.

==================================================
1. AUTHORITY AND WORKFLOW
==================================================

The approved workflow is:

Architect → Venessa approval → CC/OpenCode implementation → Architect review → Venessa

- Venessa is the final authority.
- The Architect controls architecture, scope, sequencing, review and acceptance.
- CC/OpenCode may implement only the scope explicitly authorised by this prompt.
- Do not independently expand scope.
- Verify the live repository before relying on old reports.

CC/OpenCode must never:

- run `git add`;
- stage files;
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
- switch branches;
- rewrite history;
- modify remotes;
- delete untracked files;
- overwrite approved work;
- perform any Git publication or release action.

All Git operations must be read-only.

Use PowerShell-compatible syntax.

Do not use Bash-only `&&` or `||`.

Do not request more than 10 approvals or permissions at one time.

==================================================
2. FIRST ACTION — VERIFY REPOSITORY AND READ LOGS
==================================================

Before changing anything:

1. Change to:

   C:\Users\venes\projects\CRON APPS\CRON for Code

2. Verify and record:

   - current working directory;
   - repository root;
   - repository name;
   - branch;
   - HEAD SHA and subject;
   - upstream;
   - ahead/behind state;
   - staged paths;
   - modified paths;
   - deleted paths;
   - renamed paths;
   - untracked paths;
   - exact counts.

3. Confirm the repository is genuinely CRON for Code.

4. Read in full:

   - `CRON_ARCHITECT_LOG.md`
   - `PROJECT_LOG.md`
   - `CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`
   - `CRON_CODE_FRESH_SESSION_AUDIT_EVIDENCE.md`
   - `README.md`
   - root and package manifests
   - contracts
   - core store and task UI
   - data-service
   - task runner
   - command executor
   - Electron main/preload
   - IPC data service
   - host adapter
   - launcher reports
   - relevant tests

5. Preserve all pre-existing working-tree changes.

If repository identity is wrong, stop without modifying anything.

==================================================
3. LOCKED ARCHITECT DECISIONS
==================================================

The following decisions are fixed for this slice.

A. No OpenCode yet

Do not add:

- OpenCode integration;
- autonomous agent loops;
- model-driven shell commands;
- file patching;
- arbitrary repository edits;
- Git release operations;
- autonomous verification;
- autonomous retries beyond the narrow execution harness.

This slice builds the safety and approval foundation that OpenCode will later use.

B. Port and identity

Preserve:

- Code Dev port `5190`;
- AppUserModelID `com.cron.code.dev`;
- existing launcher;
- existing shortcut;
- existing icons;
- existing packaged app behaviour;
- local-first LM Studio chat.

Do not change launcher, packaging, port, icon or taskbar identity.

C. Approval rule

No executable task may run without an approval record in an approved state.

Approval is mandatory even for allowlisted commands during this slice.

D. Git prohibition

The execution harness must explicitly reject Git mutation and release commands.

At minimum reject:

- `git add`
- `git commit`
- `git push`
- `git pull`
- `git fetch`
- `git merge`
- `git rebase`
- `git tag`
- `git reset`
- `git restore`
- `git clean`
- `git checkout`
- `git switch`
- `git stash`
- `git cherry-pick`
- `git revert`
- `git remote`
- `git branch -D`
- `gh`
- release/package publication commands

Read-only Git inspection may be allowed only through explicit allowlisted command templates.

E. No arbitrary shell

User-entered free text must never be concatenated into a shell command.

The harness must execute approved command templates with structured arguments.

==================================================
4. IMPLEMENTATION SCOPE A — EXECUTION CONTRACTS
==================================================

Add or extend contracts for:

- `ExecutionRequest`
- `ExecutionCommand`
- `ExecutionResult`
- `ExecutionStatus`
- `ExecutionError`
- `ExecutionOutput`
- `ExecutionApprovalRequirement`
- `ExecutionRecord`
- `ExecutionCancellation`
- `ExecutionTimeout`
- `AuditRecord`
- command category/type
- allowed command identifier
- working-directory reference
- task association
- project association
- approval association
- timestamps
- exit code
- stdout
- stderr
- redaction state
- retryable flag

Requirements:

1. Use stable explicit types.

2. Add runtime validation where the contracts package already uses validation patterns.

3. Export contracts through package barrels.

4. Avoid duplicating Task or Approval concepts.

5. Keep contracts host-neutral.

6. Add tests for validation, nullability, status transitions and exports.

==================================================
5. IMPLEMENTATION SCOPE B — PROJECT BOUNDARY ENFORCEMENT
==================================================

Implement one project-boundary service.

Requirements:

1. Resolve the selected project path to an absolute canonical Windows path.

2. Verify the path exists.

3. Verify it is a directory.

4. Verify it contains a Git repository root or explicitly classify it as unsupported.

5. Resolve the actual Git root with a read-only command or filesystem inspection.

6. Reject any working directory outside the selected project’s verified Git root.

7. Reject:

   - path traversal;
   - UNC/network paths unless explicitly supported by existing project policy;
   - root-drive execution;
   - system folders;
   - temp folders outside the project;
   - symlink/junction escape where detectable;
   - missing folders;
   - files instead of directories.

8. Store the verified canonical root with the project record or execution context.

9. Revalidate before every execution.

10. Add tests for case-insensitive Windows paths, trailing separators, traversal, nested valid paths and escape attempts.

Do not silently broaden the approved root.

==================================================
6. IMPLEMENTATION SCOPE C — SAFE COMMAND CATALOGUE
==================================================

Create an explicit command catalogue.

The first version must contain only safe development and verification commands already relevant to CRON projects.

Suggested command identifiers:

- `repo.identity`
- `repo.status`
- `repo.diff-check`
- `repo.changed-files`
- `repo.untracked-files`
- `repo.diff-stat`
- `repo.diff-name-status`
- `repo.diff`
- `project.test`
- `project.typecheck`
- `project.lint`
- `project.format-check`
- `project.build`
- `project.package-test`
- `node.syntax-check`
- `powershell.script-test`

Requirements:

1. Each command must be represented as a structured template.

2. Each template must define:

   - stable identifier;
   - category;
   - executable;
   - fixed arguments;
   - allowed variable arguments;
   - timeout;
   - whether approval is required;
   - whether it is read-only;
   - expected output type;
   - allowed working-directory scope.

3. Do not expose a generic `"command": string` API to the renderer.

4. Do not allow shell metacharacters in structured arguments.

5. Reject:

   - `;`
   - `|`
   - `&`
   - backticks
   - redirection
   - command substitution
   - newline injection
   - nested PowerShell
   - `cmd /c`
   - `powershell -Command` with arbitrary text
   - `Invoke-Expression`
   - dynamic executable paths

6. Prefer `spawn`/`execFile`-style process execution over shell interpolation.

7. Use PowerShell only where a fixed script or fixed argument contract is needed.

8. Add exhaustive allow/deny tests.

==================================================
7. IMPLEMENTATION SCOPE D — EXECUTION HARNESS
==================================================

Replace or extend the current placeholder executor with a safe harness.

Requirements:

1. Accept only a validated `ExecutionRequest`.

2. Resolve an approved command from the command catalogue.

3. Revalidate project boundary immediately before launch.

4. Launch without a shell where possible.

5. Set exact working directory.

6. Capture:

   - exact executable;
   - exact argument vector;
   - display command;
   - working directory;
   - start timestamp;
   - end timestamp;
   - duration;
   - exit code;
   - signal;
   - stdout;
   - stderr;
   - timeout state;
   - cancellation state;
   - approval id;
   - task id;
   - project id.

7. Support bounded output capture.

8. If output exceeds the limit:

   - retain the beginning and end;
   - mark truncation;
   - preserve byte/line counts.

9. Apply timeout per command template.

10. Support cancellation by execution id.

11. Kill only the process tree owned by that execution.

12. Never kill unrelated processes.

13. Make repeated cancellation idempotent.

14. Preserve process errors as structured errors.

15. Redact likely secret values without hiding command identity or file paths unnecessarily.

16. Persist the final result before reporting completion to the UI.

17. Add focused tests for success, non-zero exit, timeout, cancellation, output truncation and launch failure.

==================================================
8. IMPLEMENTATION SCOPE E — APPROVAL CREATION AND ENFORCEMENT
==================================================

Use the existing Approval model and state machine.

Requirements:

1. Queueing or running an executable task must create an approval request if one does not already exist.

2. Approval record must contain:

   - task id;
   - project id;
   - requested command id;
   - command summary;
   - working directory;
   - reason;
   - requested timestamp;
   - status;
   - risk category;
   - expiry where supported;
   - requester identity/source.

3. Execution must stop unless approval status is `approved`.

4. Rejected approval must block execution.

5. Expired approval must block execution.

6. Approval must be specific to the exact task, project, command id and working directory.

7. Changing the command or project invalidates prior approval.

8. Approval reuse must be explicit and narrow.

9. Do not allow more than 10 pending approvals to be created in one action.

10. Persist approval transitions.

11. Add tests for requested, approved, rejected, expired, mismatched and reused approvals.

==================================================
9. IMPLEMENTATION SCOPE F — TASK-RUNNER WIRING
==================================================

Wire the existing task flow.

Required path:

Draft task
→ queue
→ approval requested
→ user approve/reject
→ approved execution request
→ safe command harness
→ execution record
→ task status/result update

Requirements:

1. `runNow` must no longer be a no-op.

2. `queueDraftTask` and `runTaskNow` must be backed by the data service.

3. Task status transitions must be valid and deterministic.

4. A failed command must produce a failed task with structured error.

5. A cancelled command must produce cancelled/interrupted state according to the domain model.

6. A timed-out command must produce an explicit timeout result.

7. Restarting the app must not lose completed execution records.

8. Do not auto-retry failed commands in this slice.

9. Do not execute multiple commands concurrently for the same task.

10. Add tests covering the full task-to-execution path.

==================================================
10. IMPLEMENTATION SCOPE G — APPEND-ONLY AUDIT RECORD
==================================================

Add durable audit records.

Each execution-related audit record must include:

- audit id;
- event type;
- task id;
- project id;
- approval id;
- execution id;
- command id;
- working directory;
- timestamp;
- actor/source;
- status transition;
- exit code where applicable;
- output-reference or bounded output;
- redaction indicator;
- error code;
- evidence linkage.

Required event types include:

- `task.created`
- `task.queued`
- `approval.requested`
- `approval.approved`
- `approval.rejected`
- `execution.started`
- `execution.completed`
- `execution.failed`
- `execution.cancelled`
- `execution.timed_out`

Requirements:

1. Records are append-only.

2. Existing records cannot be edited through normal APIs.

3. Persist records atomically with existing JSON-store safety patterns.

4. Add repository/service methods to list by task, project and execution.

5. Add tests for append order, persistence, restart reload and immutability.

==================================================
11. IMPLEMENTATION SCOPE H — CORE UI WIRING
==================================================

Wire the existing UI without redesigning the shell.

At minimum add:

1. Task queue/run control.

2. Approval panel or approval card.

3. Approve and reject actions.

4. Execution-status display.

5. Command summary.

6. Working-directory display.

7. Start/end time.

8. Exit code.

9. Expandable stdout.

10. Expandable stderr.

11. Timeout/cancel state.

12. Cancel button only while execution is active.

13. Clear blocked-state messaging when approval is missing, rejected or expired.

14. Empty-state messaging when no execution exists.

Requirements:

- preserve current visual identity;
- do not redesign the main shell;
- do not introduce a terminal emulator;
- do not allow freeform shell command entry;
- do not expose raw filesystem or IPC primitives;
- keep core host-neutral;
- use injected data-service/host-adapter interfaces;
- add focused component/store tests.

==================================================
12. IMPLEMENTATION SCOPE I — ELECTRON AND IPC
==================================================

Add narrow IPC endpoints only where required.

Requirements:

1. Preload exposes explicit execution methods only.

2. No raw `ipcRenderer`.

3. Main validates all input again.

4. Main process owns execution.

5. Renderer cannot choose executable path.

6. Renderer cannot choose arbitrary cwd.

7. Renderer cannot pass arbitrary argument arrays.

8. Renderer can only submit stable command ids and validated narrow options.

9. Add trusted-window checks where the current architecture supports them.

10. Preserve:

   - contextIsolation;
   - sandbox;
   - nodeIntegration false;
   - current CSP;
   - LM Studio IPC;
   - existing project and persistence IPC.

11. Add IPC tests for valid and malicious payloads.

==================================================
13. SECURITY REQUIREMENTS
==================================================

The following must be enforced in code, not merely documented.

Reject all commands or payloads that attempt:

- Git mutation;
- package publication;
- registry modification;
- environment mutation;
- PowerShell profile modification;
- Windows service control;
- scheduled task creation;
- registry writes;
- process-wide kill;
- arbitrary file deletion;
- filesystem cleanup;
- credential access;
- network download;
- shell escape;
- path escape;
- executable substitution.

Specific forbidden executables include at least:

- `cmd.exe`
- arbitrary `powershell.exe` command strings
- `pwsh.exe` arbitrary command strings
- `bash`
- `sh`
- `wsl`
- `curl`
- `wget`
- `certutil`
- `bitsadmin`
- `reg`
- `schtasks`
- `sc`
- `wmic`
- `taskkill`
- `rundll32`
- `mshta`

A fixed PowerShell script may be permitted only if:

- its repository path is fixed;
- its arguments are validated;
- it belongs to an approved command template;
- it cannot invoke arbitrary nested commands.

==================================================
14. EXPLICITLY EXCLUDED SCOPE
==================================================

Do not implement:

- OpenCode;
- Claude Code;
- autonomous coding agents;
- file editing;
- patch application;
- code generation into repositories;
- arbitrary command entry;
- terminal emulator;
- Git staging;
- Git commits;
- Git push;
- release gate;
- merge/tag/release;
- cloud providers;
- new LM Studio provider architecture;
- streaming model output;
- package/version bump;
- packaging;
- launcher changes;
- icon changes;
- port changes;
- AppUserModelID changes;
- visual shell redesign.

==================================================
15. WORKING-TREE CONTROL
==================================================

The repository already has a large approved uncommitted working tree.

Before implementation, capture:

- exact modified count;
- exact deleted count;
- exact untracked count;
- every path;
- which paths predate this slice.

During implementation:

- touch only the narrow contracts, data-service, core, standalone IPC, tests and documentation files required by this slice;
- do not alter launcher files;
- do not alter icons;
- do not alter packaging;
- do not alter generated `dist-renderer` tracking;
- do not run broad formatting across the repo;
- do not perform Git mutation.

After implementation classify:

- pre-existing paths;
- files changed by this slice;
- files created by this slice;
- generated outputs;
- local-only backup artifacts;
- unexpected paths.

==================================================
16. TESTS AND ACCEPTANCE
==================================================

Add focused tests for:

- execution contracts;
- command catalogue allow/deny rules;
- project-boundary enforcement;
- valid nested cwd;
- traversal rejection;
- shell metacharacter rejection;
- forbidden Git commands;
- forbidden executables;
- approval creation;
- approval enforcement;
- approval mismatch;
- approval rejection;
- approval expiry;
- task queue/run;
- success exit 0;
- non-zero exit;
- stdout capture;
- stderr capture;
- timeout;
- cancellation;
- repeated cancellation;
- output truncation;
- append-only audit records;
- persistence across restart;
- IPC validation;
- core UI status and approval actions;
- no arbitrary command entry.

Run existing repository checks.

At minimum:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm format:check`
- focused contracts tests
- focused data-service tests
- focused core tests
- focused standalone/IPC tests
- `git diff --check`
- narrow secret scan
- suspicious/generated-path scan

Changed files must be formatted.

Do not install or update dependencies.

Do not change the lockfile unless an existing approved dependency genuinely changes it. If the lockfile changes unexpectedly, stop and report.

For every command record:

- exact command;
- working directory;
- start timestamp;
- end timestamp;
- exit code;
- raw stdout;
- raw stderr;
- accepted/failed/skipped/environment-blocked status.

A command passes only when exit code is `0`.

==================================================
17. REQUIRED RUNTIME PROOF
==================================================

Where safe, perform one controlled runtime proof.

Use a harmless allowlisted command such as:

- repository identity;
- `git status --short`;
- `git diff --check`;
- project test script against a controlled project.

The proof must show:

1. project selected;

2. task created;

3. approval requested;

4. execution blocked before approval;

5. approval granted;

6. command starts;

7. exact cwd recorded;

8. exact command id recorded;

9. stdout/stderr captured;

10. exit code recorded;

11. execution record persisted;

12. audit events persisted;

13. app close/reopen retains result;

14. rejected approval blocks execution;

15. forbidden Git mutation command is rejected before process launch;

16. path escape is rejected before process launch;

17. cancellation or timeout proof using a controlled safe test command;

18. no unrelated process is terminated.

Do not use a real destructive command even to prove rejection.

==================================================
18. REQUIRED LOG AND REPORT UPDATES
==================================================

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`
- existing CC training log, or add `### CC Training Notes` to `PROJECT_LOG.md`

Create:

- `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_REPORT.md`
- `CRON_CODE_SAFE_EXECUTION_AND_APPROVAL_EVIDENCE.md`

Preserve all existing history and chronology.

In `CRON_ARCHITECT_LOG.md`, append:

- date and local timestamp;
- task title;
- repository identity;
- branch and HEAD;
- exact prompt used;
- execution contracts added;
- project-boundary model;
- command catalogue;
- approval enforcement;
- execution harness;
- audit records;
- UI wiring;
- IPC additions;
- security controls;
- runtime proof;
- tests/build results;
- exact files changed/created;
- unresolved issues;
- no-stage/no-commit/no-push statement;
- report/evidence paths.

Include the complete exact prompt under:

`### Verification Input Used — Verbatim`

The full prompt must also appear in the evidence file.

The final CC response must include the complete current contents of `CRON_ARCHITECT_LOG.md` verbatim.

==================================================
19. MANDATORY FINAL SELF-AUDIT
==================================================

Perform one final independent read-only verification.

Confirm:

- correct repository;
- branch and HEAD;
- no staged files;
- exact modified count;
- exact deleted count;
- exact untracked count;
- every untracked path listed;
- only authorised files changed by this slice;
- pre-existing unrelated work untouched;
- launcher unchanged;
- port remains `5190`;
- AppUserModelID remains `com.cron.code.dev`;
- LM Studio chat unchanged;
- no OpenCode integration added;
- no arbitrary command API exists;
- command catalogue is explicit;
- project root revalidated before execution;
- traversal blocked;
- shell metacharacters blocked;
- Git mutation commands blocked;
- approval required before execution;
- rejected/expired/mismatched approvals block execution;
- stdout/stderr/exit code captured;
- timeout works;
- cancellation works;
- only owned process tree terminated;
- execution results persisted;
- audit records append-only;
- runtime proof passes;
- tests/build/lint/typecheck pass with exit code `0`;
- changed files formatted;
- `git diff --check` passes;
- Architect Log contains exact prompt;
- Project Log updated;
- training notes updated;
- report/evidence files exist;
- no prohibited Git action occurred.

If an unauthorised file changed:

- do not restore/reset/delete it;
- stop;
- report the exact path and diff;
- wait for Architect guidance.

Do not repeat verification endlessly once the agreed checks pass.

==================================================
20. FINAL RESPONSE FORMAT
==================================================

Return the complete final response inside one copyable code block.

Use:

# CRON FOR CODE — SAFE EXECUTION AND APPROVAL REPORT

## 1. Final status

Use one:

- `READY FOR ARCHITECT REVIEW`
- `BLOCKED — ARCHITECT DECISION REQUIRED`
- `IMPLEMENTATION INCOMPLETE — ENVIRONMENT FAILURE`

## 2. Repository identity

## 3. Verification input used

## 4. Complete CRON Architect Log — Verbatim

## 5. Initial working-tree state

## 6. Execution contracts

## 7. Project-boundary enforcement

## 8. Command catalogue

## 9. Safe execution harness

## 10. Approval creation and enforcement

## 11. Task-runner wiring

## 12. Append-only audit records

## 13. Core UI wiring

## 14. Electron and IPC wiring

## 15. Security controls

## 16. Runtime proof

## 17. Tests, build and quality results

For every command include:

- command;
- working directory;
- exit code;
- concise result;
- evidence-file path.

## 18. Exact files changed by this slice

## 19. Exact files created by this slice

## 20. Pre-existing files left untouched

## 21. Confirmed defects

## 22. Remaining risks

## 23. Explicit excluded scope

## 24. Final self-audit

## 25. Git safety statement

Explicitly confirm:

- nothing staged;
- nothing committed;
- nothing pushed;
- no prohibited Git or release action performed.

## 26. Exact next action

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect’s next CC prompt.`

==================================================
21. START NOW
==================================================

Begin with repository identity verification and full Architect Log review.

Implement only the approved safe execution, project-boundary, approval, audit-record, task-runner, UI and IPC foundation.

Do not add OpenCode.

Do not add arbitrary command entry.

Do not change launcher, port, icon, packaging or AppUserModelID.

Do not stage, commit or push.

Complete the implementation, run the full checks and runtime proof, update all required logs, preserve the exact prompt, perform the final self-audit, and return the complete result in one copyable code block.
```

---

## Initial working-tree state (captured before implementation)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
Modified: 25   Deleted: 3   Untracked: 20 (19 pre-existing + 1 permitted audit evidence file)
git diff --cached --stat: empty
```

## Final working-tree state (after implementation)

```
Modified: 31   Deleted: 3   Untracked: 35
Staged: none
```

New files created by this slice (15):
```
packages/contracts/src/execution.ts
packages/contracts/src/execution.test.ts
packages/data-service/src/project-boundary.ts
packages/data-service/src/project-boundary.test.ts
packages/data-service/src/command-catalogue.ts
packages/data-service/src/command-catalogue.test.ts
packages/data-service/src/execution-harness.ts
packages/data-service/src/execution-harness.test.ts
packages/data-service/src/execution-service.ts
packages/data-service/src/execution-service.test.ts
packages/data-service/src/ipc-validation.ts
packages/data-service/src/ipc-validation.test.ts
packages/core/src/components/ApprovalPanel.tsx
packages/core/src/components/ExecutionPanel.tsx
packages/core/src/task-ui.test.tsx
```

Files modified by this slice (on top of the pre-existing working tree):
```
packages/contracts/src/approval.ts        (execution-approval fields + createExecutionApproval)
packages/contracts/src/index.ts           (execution + audit exports)
packages/data-service/src/types.ts        (executions/audit/listCommands on DataService)
packages/data-service/src/json-store.ts   (executions + audit persistence; runNow no longer a no-op)
packages/data-service/src/json-store.test.ts
packages/data-service/src/index.ts        (new exports)
apps/standalone/electron/preload.cjs      (execution + audit + listCommands bridges)
apps/standalone/electron/main.mjs         (ExecutionService + harness + validated IPC)
apps/standalone/src/ipc-data-service.ts   (executions/audit/listCommands DataService impl)
packages/core/src/store.ts                (executions/commands state; runNow(commandId); cancelExecution)
packages/core/src/store.test.ts           (mock + new store tests)
packages/core/src/components/Layout.tsx   (wire TaskWorkspace + TaskComposer)
packages/core/src/components/TaskWorkspace.tsx (queue/run/cancel + approval + execution panels)
packages/core/src/index.ts                (export ApprovalPanel/ExecutionPanel)
```

Local-only artifact (gitignored, not in git status): `.runtime/runtime-proof.mjs` (runtime proof script).

Files NOT touched by this slice: `.gitignore`, `README.md`, `apps/standalone/dist-renderer/*`, `apps/standalone/package.json`, `apps/standalone/scripts/dev.mjs`, `apps/standalone/vite.config.ts`, `eslint.config.mjs`, launcher files (`scripts/*.ps1`, `*.bat`, `*.vbs`), icons, `packages/data-service/src/task-runner.ts`, `packages/core/src/llm.ts`, `LlmSettings.tsx`, `CronAssistant.tsx`, etc.

## Command results (raw)

### `pnpm test` — exit 0
```
packages/contracts   Test Files 4 passed | Tests 20 passed
packages/host-adapter Test Files 1 passed | Tests 5 passed
packages/data-service Test Files 7 passed | Tests 74 passed
packages/core        Test Files 3 passed | Tests 41 passed
apps/standalone      echo ok
TOTAL 140 tests, all passing.
```

### `pnpm typecheck` — exit 0
All 7 workspace packages (`shared/design-tokens`, `shared/config`, `contracts`, `host-adapter`, `data-service`, `core`, `standalone`) → Done.

### `pnpm lint` — exit 0
```
✖ 2 problems (0 errors, 2 warnings)   [pre-existing react-hooks exhaustive-deps warnings in App.tsx]
```

### `pnpm build` — exit 0
Packages tsc/vite + standalone vite build → dist-renderer (built in 4.65s).

### `pnpm format:check` — exit 0
All packages `echo ok` (no real formatter enforcement — pre-existing).

### `git diff --check` — exit 0 (clean)

### Narrow secret scan
`git grep -i -E "api[_-]?key=|password[:=]|BEGIN (RSA|OPENSSH|PRIVATE)|secret[:=]|token=[A-Za-z0-9]{16,}"` → no matches.

## Runtime proof (raw output)

Command: `node .runtime\runtime-proof.mjs` (cwd = repo root) — exit 0

```
PROOF: project.selected {"projectId":"proj_rt","rootPath":"C:\\Users\\venes\\AppData\\Local\\Temp\\cron-runtime-proof-lCcLgy\\repo"}
PROOF: task.created {"taskId":"task_rt"}
PROOF: approval.requested.blocked {"executed":false,"blockedReason":"Approval is pending","approvalId":"appr_1786008248431_0fpt2b","approvalStatus":"requested","taskStatus":"approval_required"}
PROOF: forbidden.git.mutation.rejected {"gitMutationRejected":true}
PROOF: path.escape.rejected {"pathEscapeRejected":true}
PROOF: approval.granted {"approvalId":"appr_1786008248431_0fpt2b"}
PROOF: execution.completed {"executed":true,"status":"completed","commandId":"repo.identity","cwd":"C:\\Users\\venes\\AppData\\Local\\Temp\\cron-runtime-proof-lCcLgy\\repo","exitCode":0,"stdout":"C:/Users/venes/AppData/Local/Temp/cron-runtime-proof-lCcLgy/repo\n","stderr":"","displayCommand":"git rev-parse --show-toplevel","startedAt":1786008250361,"endedAt":1786008250694}
PROOF: persisted {"executionCount":1,"auditEventTypes":["approval.requested","execution.started","execution.completed"]}
PROOF: restart.retains {"executionCount":1,"executionStatus":"completed","auditCount":3,"taskStatusAfterRestart":"completed"}
PROOF: rejected.blocks {"executed":false,"blockedReason":"Approval rejected","taskStatus":"failed"}
PROOF: timeout.proof {"status":"timed_out","exceeded":true,"error":"TIMEOUT"}
PROOF: cancellation.proof {"status":"cancelled","requested":true}
PROOF: proof.complete {"ok":true}
```

## No unrelated processes terminated

Verified live after the proof (unchanged from before implementation):
```
Dev Electron (CRON for Code repo): PIDs 27540, 28240, 38928, 44632 (still running; renderer 28240 carries AUMID com.cron.code.dev)
Production CRON for Code v1.1.7:   PIDs 9032, 11552, 25456, 28260 (still running)
CRON for Claims Electron:          untouched
Dev port: 5190 (unchanged). AppUserModelID: com.cron.code.dev (unchanged). LM Studio IPC: untouched.
```

## Final self-audit confirmation

- Correct repo/branch/HEAD. Nothing staged (`git diff --cached` empty).
- Modified 31 / Deleted 3 / Untracked 35. Every untracked path classified; all 15 new files are this slice's source/test files.
- Pre-existing unrelated work untouched (launcher, icons, packaging, port, AUMID, LM Studio, README, .gitignore, eslint config, dev.mjs, vite.config all unchanged).
- `git diff --check` clean. Secret scan clean. Exit codes recorded for every command.
- No prohibited Git action performed (no add/stage/commit/push/pull/fetch/merge/rebase/tag/release/amend/reset/restore/clean/switch/history rewrite/remote change/delete).
