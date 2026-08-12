# CRON FOR CODE — RUNTIME ACCEPTANCE EVIDENCE

Supporting evidence for `CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated. Exit codes recorded verbatim.

---

## 1. Verification Input Used — Verbatim

The complete `CRON_CODE_RUNTIME_ACCEPTANCE_ARCHITECT_SLICE.md` (Approved Architect slice,
Status: Approved Architect slice, Owner: Venessa Olivier, Lane: Code — runtime safety lane,
Date: 2026-08-09). Full text:

```markdown
# CRON for Code — Runtime Acceptance Architect Slice

Status: Approved Architect slice
Owner: Venessa Olivier
Lane: Code — runtime safety lane
Date: 2026-08-09

---

## Plain-English Goal

Prove CRON for Code can reliably open, restart, remember projects, and show its approval/execution surfaces without blank windows, missing controls, or scary silent failures.

This slice is about trust. Do not expand the app into broader agent execution until the runtime foundation is accepted.

---

## Approved Scope

CC may verify and repair only the current runtime acceptance path:

- Dev app launch from the approved shortcut/launcher.
- In-app restart returning to visible content.
- Project list preservation and last-active project restoration.
- Folder picker cancellation behaving like a quiet cancel, not an error.
- Approval and execution surfaces visible enough to prove the foundation exists.
- Runtime health markers and IPC registration working as designed.
- Plain error messages if something genuinely fails.
- Focused tests/evidence for the acceptance path.
- Update `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`, and report/evidence files.

---

## Out of Scope

Not approved:

- No OpenCode integration.
- No broad autonomous agent execution.
- No arbitrary command entry.
- No Git release gate.
- No dependency changes.
- No package-manager changes.
- No port, icon, AppUserModelID, launcher identity, or packaging changes unless a defect in this exact acceptance path makes it unavoidable and Architect re-approves.
- No staging, commit, push, release, reset, or cleanup.

---

## Acceptance Journey

This slice is accepted only when:

1. CRON for Code launches from the dev shortcut.
2. The main window renders visible content.
3. Known projects appear.
4. Selecting a project does not duplicate it.
5. Re-link cancel is quiet and does not clear the project list.
6. In-app restart closes and reopens to visible content.
7. Approval/execution surfaces are visible and safe.
8. No unrelated CRON app is stopped or hijacked.

---

## Verification Gate

Before completion is claimed:

- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm lint` passes or any remaining warnings are plainly classified.
- `pnpm build` passes.
- `git diff --check` passes.
- Current git status is reported.
- Runtime proof is recorded in evidence.
- No Git action is performed.

If a check fails, CC fixes it inside the slice and explains the issue plainly. Venessa is not expected to debug it.

---

## Architect Notes

The current README says real task/agent execution, approval UI gates, Git release gate, and OpenCode integration are not yet implemented. Do not blur that line.

The priority is reliability before power.
```

---

## 2. Pre-slice state capture

### 2.1 git status (verbatim, abbreviated to classification)

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   .gitignore
	modified:   README.md
	deleted:    apps/standalone/dist-renderer/assets/index-BKHl0T_0.js
	deleted:    apps/standalone/dist-renderer/assets/index-DKjNfHep-ByRAIpR-.js
	deleted:    apps/standalone/dist-renderer/assets/index-DwH0u0NX.css
	modified:   apps/standalone/dist-renderer/index.html
	modified:   apps/standalone/electron/main.mjs
	modified:   apps/standalone/electron/preload.cjs
	modified:   apps/standalone/package.json
	modified:   apps/standalone/scripts/dev.mjs
	modified:   apps/standalone/src/ipc-data-service.ts
	modified:   apps/standalone/src/main.tsx
	modified:   apps/standalone/vite.config.ts
	modified:   eslint.config.mjs
	modified:   packages/contracts/src/approval.ts
	modified:   packages/contracts/src/index.ts
	modified:   packages/contracts/src/project.test.ts
	modified:   packages/contracts/src/project.ts
	modified:   packages/core/src/components/App.tsx
	modified:   packages/core/src/components/CronAssistant.tsx
	modified:   packages/core/src/components/CronHeader.tsx
	modified:   packages/core/src/components/EmptyState.tsx
	modified:   packages/core/src/components/Layout.tsx
	modified:   packages/core/src/components/ProjectArea.tsx
	modified:   packages/core/src/components/Sidebar.tsx
	modified:   packages/core/src/components/TaskComposer.tsx
	modified:   packages/core/src/components/TaskWorkspace.tsx
	modified:   packages/core/src/components/WorkflowStrip.tsx
	modified:   packages/core/src/index.ts
	modified:   packages/core/src/store.test.ts
	modified:   packages/core/src/store.ts
	modified:   packages/data-service/src/index.ts
	modified:   packages/data-service/src/json-store.test.ts
	modified:   packages/data-service/src/json-store.ts
	modified:   packages/data-service/src/task-runner.test.ts
	modified:   packages/data-service/src/types.ts
	modified:   packages/host-adapter/src/index.ts
	modified:   packages/host-adapter/src/mock.ts
	modified:   packages/host-adapter/src/standalone.ts
	modified:   packages/host-adapter/src/types.ts

Untracked files: (51 pre-existing, incl. scripts/, shared/design-tokens/, all report/evidence/log files,
apps/standalone/electron/{register-ipc.mjs,relink-flow.mjs}, packages/*/src/*.test.ts, etc.)
```

`git log --oneline -10` → `8157b12 feat-refine-cron-shell-layout`, `d432bcb feat: establish working Cron for Code`.

### 2.2 Live process/port state (pre-launch)

```
PID 30524: NOT RUNNING        (state file: electronPid)
PID 37468: NOT RUNNING        (state file: vitePid)
PID 50928: NOT RUNNING        (state file: devPid)
----PORT 5190----
(no listener)

PRODUCTION CRON for Code: NOT RUNNING
LM Studio HTTP 200, 19 models

node PID 10788: ...CRON for Meds...\vite\bin\vite.js --port 5191 --strictPort
node PID 9336:  ...CRON for Claims\client...\vite\bin\vite.js --host 127.0.0.1 --port 5193 --strictPort
node PID 15300: ...CRON HUB...\vite\bin\vite.js --host 0.0.0.0
node PID 6996:  ...CRON for Chat...\vitest\vitest.mjs run   (one-shot test run; completed on its own)
```

### 2.3 Persisted dev store (read-only, real path)

`%APPDATA%\CRON for Code Dev\cron-for-code-data\store.json`:
3 project records — `proj_1786050841183` CRON for Meds (archived), `proj_1786063530295_4ir189`
CRON for Claims (archived), `proj_1786063530296_t62fq0` CRON for Claims (active canonical).
`preferences.lastActiveProjectId = "proj_1786063530296_t62fq0"`. Audit events: 2×
`project.archived`, 1× `project.relinked`, 2× `app.restart_requested`.
Store SHA256: `29E63A59E92114648972EE5543A1C07A8B741F43FD9C91BC64E244122B56AA2D`.

---

## 3. Verification gate — raw results

### 3.1 `pnpm test` — first run

`packages/core test: ... Tests 121 passed (121) ... 1 error` — the failure was
`[vitest-worker]: Timeout calling "onTaskUpdate"` (known pre-existing full-suite load flake,
previously documented in the Dev Restart Blank-Window repair slice; all 121 core tests green).
Exit status 1 for the recursive run.

### 3.2 `pnpm test` — flake root-caused and fixed

First runs:
```
packages/core test:  Test Files  8 passed (8)
packages/core test:       Tests  121 passed (121)
packages/core test:     Errors  1 error   <- [vitest-worker]: Timeout calling "onTaskUpdate"
```
All tests green on every run; the recursive run failed intermittently on the vitest RPC timeout.

Root cause: `packages/core/src/repo-stabilisation.test.ts`'s lint guard ran the whole-repo ESLint
with a synchronous `spawnSync` inside the vitest worker. ESLint takes ~60–90 s under suite load,
blocking the worker's RPC handling past vitest's internal `onTaskUpdate` timeout.

Fix (identical guard semantics): the guard now spawns the same
`node eslint . --ext .ts,.tsx,.mjs,.cjs` as an async child (100 s kill timer preserved) and still
asserts exit 0. Evidence:

```
> pnpm --filter @cron-code/core exec vitest run src/repo-stabilisation.test.ts
✓ repository stabilisation > lint passes with no errors  18175ms
✓ dev launcher restart safety > ... 1324ms
Test Files  1 passed (1)      Tests  33 passed (33)

> pnpm test
packages/core test:  Test Files  8 passed (8)
packages/core test:       Tests  121 passed (121)
packages/core test:   Done        <- no unhandled errors
packages/core test:   Duration 26.60s
```

Final suite counts on the gate re-runs: contracts 24, host-adapter 23, data-service 74,
core 121 = **242 tests**. Two consecutive clean full-suite runs at 10:21 and 10:24.

### 3.3 `pnpm typecheck`

```
packages/contracts typecheck: Done
packages/host-adapter typecheck: Done
packages/data-service typecheck: Done
packages/core typecheck: Done
apps/standalone typecheck: Done
```
PASS, exit 0.

### 3.4 `pnpm lint`

```
packages/core/src/components/App.tsx
  57:6  warning  React Hook useEffect has missing dependencies ... react-hooks/exhaustive-deps
  67:6  warning  React Hook useEffect has a missing dependency ... react-hooks/exhaustive-deps
✖ 2 problems (0 errors, 2 warnings)
```
PASS, exit 0 — 0 errors; the 2 warnings are the pre-existing `react-hooks/exhaustive-deps`
baseline (unchanged since the Stabilisation slice; plainly classified, not introduced here).

### 3.5 `pnpm build`

```
packages/core build: ✓ built in 526ms
vite v6.4.3 building for production...
✓ 1832 modules transformed.
dist-renderer/index.html                                1.27 kB
dist-renderer/assets/code_logo_transparent-TEhRPKA6.png 1,089.61 kB
dist-renderer/assets/cron_shell_background-j_Mb-hGJ.png 2,003.09 kB
dist-renderer/assets/index-CnLAifk6.css                 2.05 kB
dist-renderer/assets/index-CY9hvXtW.js                  281.80 kB
✓ built in 4.08s
BUILD_EXIT=0
```

### 3.6 `pnpm format:check` — PASS, exit 0 (per-package `echo ok`, pre-existing no-op)

### 3.7 `git diff --check` — FAIL first, then fixed

```
packages/core/src/store.test.ts:423: new blank line at EOF.
DIFFCHECK_EXIT=2
```

Root cause: `packages/core/src/store.test.ts` ended with `});<CRLF><CRLF>` — a trailing blank
line at EOF. (This file is a pre-existing modified file; the defect predates this slice.)
Fix: removed the trailing blank line at byte level (no re-encoding; the file contains non-ASCII
text, so PowerShell text round-trips were avoided). File tail before/after:

```
BEFORE:  });<CR><LF>});<CR><LF><LF>
TRAILING LF REMOVED
LAST 8 BYTES: 3B 0D 0A 7D 29 3B 0D 0A
```

Re-check:
```
DIFFCHECK_EXIT=0
```
Confirmation the repair did not break the file (isolated run):
```
src/store.test.ts (15 tests) ... Tests 15 passed (15)
```

---

## 4. Runtime proof — launch and identity

### 4.1 Fresh launch via the approved launcher

```
> powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1 -Port 5190
LAUNCHER_EXIT=0 (elapsed 00:00:19.6)
```

Launcher log (verbatim tail):
```
[2026-08-09 09:57:17] === CRON for Code dev launcher starting ===
[2026-08-09 09:57:20] Lifecycle decision: fresh-start (vite=0 electron=0 dev=0 health=none).
[2026-08-09 09:57:20] No dev stack running. Starting a fresh dev stack on port 5190.
[2026-08-09 09:57:21] Dev command started (PID 19764).
[2026-08-09 09:57:24] Dev service reachable at http://127.0.0.1:5190.
[2026-08-09 09:57:35] Recorded state: port=5190 devPid=19764 vitePid=10880 electronPid=22884.
[2026-08-09 09:57:35] App ready (electron PID 22884, renderer-ready marker confirmed). Launcher completed.
```

### 4.2 Live identity checks (post-launch)

```
----PORT 5190----   127.0.0.1:5190  OwningProcess 10880   (matches state vitePid)
----STATE----       {"port":5190,"electronPid":22884,"vitePid":10880,"devPid":19764}
----RENDERER AUMID----  ProcessId 26700  electron.exe   (command line carries --app-user-model-id=com.cron.code.dev)
----MARKER----      pid=22884 channels=34 required=8/8 rendererReady=True windowReady=True
                    lastStartupError= mainHash=73f71ebb1afd
```

### 4.3 Served renderer content (dev server module graph, transformed without errors)

```
http://127.0.0.1:5190/                          HTTP 200
@fs/.../packages/core/src/main.tsx (standalone src/main.tsx)  HTTP 200, 11,235 B
@fs/.../packages/core/src/components/Layout.tsx           HTTP 200, 21,452 B
@fs/.../packages/core/src/components/ActivityPanel.tsx    HTTP 200, 18,451 B
@fs/.../packages/core/src/components/ApprovalPanel.tsx    HTTP 200, 28,384 B
@fs/.../packages/core/src/components/ExecutionPanel.tsx   HTTP 200, 37,471 B

Layout.tsx references 'ActivityPanel': True
Layout.tsx references 'TaskComposer': True
Layout.tsx references 'Sidebar': True
Layout.tsx references 'TaskWorkspace': True
Layout.tsx references 'CronAssistant': True
```

---

## 5. Runtime proof — acceptance journey (controlled driver)

Command:
```
> $env:CRON_DEV_STORE_PATH = "$env:APPDATA\CRON for Code Dev\cron-for-code-data\store.json"
> node .runtime\runtime-acceptance-proof.mjs
PROOF_EXIT=0
```

Raw output (verbatim):

```
PROOF: phase.start {"realStorePath":"C:\\Users\\venes\\AppData\\Roaming\\CRON for Code Dev\\cron-for-code-data\\store.json"}
PROOF: a0.real.dev.store {"projectRecords":3,"archived":2,"lastActiveProjectId":"proj_1786063530296_t62fq0"}
PROOF: a1.projects.loaded {"rawPersistedRecords":3,"reconciledInMemory":["CRON for Meds(archived)","CRON for Claims"],"visible":["CRON for Claims"],"activeAfterLoad":null,"isLoading":false,"error":null}
PROOF: a2.last.active.restored {"activeProjectId":"proj_1786063530296_t62fq0","name":"CRON for Claims"}
PROOF: a3.no.duplicate.on.reselect {"rawPersistedAfter":3,"reconciledInMemoryAfter":2,"visibleAfter":["CRON for Claims"],"activeAfter":"proj_1786063530296_t62fq0","isLoading":false,"error":null}
PROOF: a4a.relink.flow.pure.cancel {"outcome":{"status":"cancelled"}}
PROOF: a4b.relink.cancel.store.noop {"projectsUnchanged":true,"activeUnchanged":true,"errorAfter":null,"isLoadingAfter":false}
PROOF: a4c.relink.cancel.preference {"lastActiveProjectId":"proj_1786063530296_t62fq0"}
PROOF: phaseA.pass {"ok":true}
PROOF: b1.command.catalogue.loaded {"commandCount":16}
PROOF: b2.run.blocked.approval.required {"executed":false,"blockedReason":"Approval is pending","approvalCreated":true,"approvalStatus":"requested","taskStatus":"approval_required"}
PROOF: b3.execution.surface.chain {"executed":true,"executionStatus":"completed","commandId":"repo.identity","cwdRecorded":true,"exitCode":0,"auditEvents":["approval.requested","execution.started","execution.completed"]}
PROOF: b3b.store.surfaces.reflect.evidence {"approvalsInStore":1,"executionsInStore":1,"executionStatusInStore":"completed"}
PROOF: b4.restart.retains.evidence {"executionCount":1,"executionStatus":"completed","auditCount":3,"taskStatus":"completed"}
PROOF: phaseB.pass {"ok":true}
PROOF: runtime.acceptance.proof.complete {"ok":true}
```

Design decisions in the proof:
- Phase A loads a **copy** of the real dev store (never mutates the real one — confirmed by
  identical SHA256 before/after the whole slice, §6.3).
- Phase B uses a throwaway temp store + throwaway Git repo with the real DataService,
  ExecutionService, SafeExecutionHarness, and command catalogue — the same objects Electron
  main wires, so the approval/execution evidence chain is exactly what the surfaces render.
- Cancellation is exercised through the pure `relink-flow.mjs` contract (the exact module main
  uses) and through the store with the host adapter returning `{ status: 'cancelled' }`.

### Failed attempts (recorded honestly)

1. `pnpm test` full-suite runs — vitest `onTaskUpdate` worker timeout (pre-existing load flake);
   all tests green. Root-caused: the repo-stabilisation lint guard blocked its worker with
   synchronous `spawnSync` of whole-repo ESLint. Fixed in
   `packages/core/src/repo-stabilisation.test.ts` (async child, identical ESLint invocation +
   exit-0 assertion); full suite now ~26–30 s with repeated clean passes.
2. `git diff --check` — trailing blank line at EOF in `store.test.ts`; fixed; PASS.
3. Proof script Phase A first run — my assertion expected 3 in-memory records; the real
   (correct) behaviour reconciles the duplicate Claims pair into its canonical active record
   (3 persisted → 2 reconciled → 1 visible). The proof's assertions were corrected to the
   designed contract; no product code was involved.
4. Proof script Phase B first run — I invoked the store's `runTaskNow` (TaskRunner intent
   queue); the real execution chain is `ExecutionService` in Electron main. Phase B now drives
   `ExecutionService` exactly as main does, plus store-surface reflection checks.
5. TypeScript rejected the first async-guard implementation (`spawn` overload union reduced to
   `never`); the guard was re-typed with an explicit `ChildProcess` + Buffer chunks — `tsc` 0.

---

## 6. Runtime proof — in-app restart handoff (×2 consecutive)

### 6.1 Cycle 1 (10:12–10:13)

Intent written exactly as `cron:app:restart` does in dev:
```
{"requestedAt":1786234350994,"pid":22884}   -> .runtime\code-dev-restart-requested.json
```
```
> powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-code-dev-hidden.ps1 -Port 5190
LAUNCHER_EXIT=0 (elapsed 00:00:38.0)
```
Launcher log (verbatim tail):
```
[2026-08-09 10:12:49] === CRON for Code dev launcher starting ===
[2026-08-09 10:12:57] In-app restart requested (intent marker present). Replacing the owned dev stack.
[2026-08-09 10:12:57] Lifecycle decision: replace-stale-electron (vite=10880 electron=22884 dev=19764 health=stale).
[2026-08-09 10:12:57] Replacing only this repo's stale/broken owned Electron process (PID 22884).
[2026-08-09 10:12:59] Stale Electron stopped. Proceeding with replacement.
[2026-08-09 10:13:01] Starting a fresh dev stack on port 5190.
[2026-08-09 10:13:02] Dev command started (PID 28080).
[2026-08-09 10:13:07] Dev service reachable at http://127.0.0.1:5190.
[2026-08-09 10:13:24] Recorded state: port=5190 devPid=28080 vitePid=23892 electronPid=22268.
[2026-08-09 10:13:24] App ready (electron PID 22268, renderer-ready marker confirmed). Launcher completed.
```
Post-check: marker `pid=22268 rendererReady=True windowReady=True channels=34 required=8/8
lastStartupError=`. Intent file consumed. Exactly one dev stack. Store SHA256 unchanged.

### 6.2 Cycle 2 (10:13–10:14)

Intent `{"pid":22268,...}` → launcher:
```
[2026-08-09 10:13:52] Dev command started (PID 9196).
[2026-08-09 10:14:08] Recorded state: port=5190 devPid=9196 vitePid=27836 electronPid=28004.
[2026-08-09 10:14:09] App ready (electron PID 28004, renderer-ready marker confirmed). Launcher completed.
```
Post-check: marker `pid=28004 rendererReady=True channels=34 required=8/8`; dev server HTTP 200;
ActivityPanel served (18,451 B); intent consumed; store SHA256 unchanged.

### 6.3 Data preservation across restarts

```
STORE_SHA_BEFORE_RESTART=29E63A59E92114648972EE5543A1C07A8B741F43FD9C91BC64E244122B56AA2D
STORE HASH AFTER RESTART   =29E63A59E92114648972EE5543A1C07A8B741F43FD9C91BC64E244122B56AA2D  (both cycles)
```

### 6.4 Unrelated-process safety (checked at every stage)

```
----UNRELATED STILL ALIVE----  (pre-launch, post-launch, post-restart ×2)
PID 10788 (CRON for Meds vite, port 5191): alive
PID 9336  (CRON for Claims vite, port 5193): alive
PID 15300 (CRON HUB vite): alive
PRODUCTION "CRON for Code": not running at slice start; never started/touched by this slice.
```
The only process the launcher ever terminated was the owned dev Electron inside each restart
cycle (`Replacing only this repo's stale/broken owned Electron process (PID ...)`).
`CRON_MEDS_PORT=5190` env collision disclosed, never modified. Port 5190 remained owned by the
repo Vite throughout; no port was hijacked.

---

## 7. Conclusion-to-evidence mapping

| Acceptance item | Evidence |
| --- | --- |
| 1. Launch from dev shortcut/launcher | §4.1 (`fresh-start`, exit 0, app-ready) + shortcut on disk |
| 2. Window renders visible content | §4.2 marker (`rendererReady`, `windowReady`) + §4.3 served modules transform + HTTP 200 |
| 3. Known projects appear | §5 `a0/a1/a2` (3 persisted → 1 visible; last-active restores) |
| 4. Selecting a project does not duplicate | §5 `a3` (raw persisted still 3 after reselect) |
| 5. Re-link cancel quiet, list intact | §5 `a4a/a4b/a4c` (pure `cancelled` outcome; store no-op; preference unchanged) |
| 6. In-app restart → visible content | §6 (intent handoff ×2, healthy marker, store hash identical, intent consumed) |
| 7. Approval/execution surfaces visible & safe | §4.3 served surfaces + §5 `b1–b4` (blocked → approved → executed exit 0 → audited → retained) |
| 8. No unrelated app stopped/hijacked | §6.4 (Meds/Claims/HUB alive throughout; owned-only termination in launcher log) |

## 8. Final git status (slice close)

```
NEW: CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md, CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md
UPDATED: CRON_ARCHITECT_LOG.md, PROJECT_LOG.md
SOURCE CHANGES (gate fixes only):
  packages/core/src/store.test.ts                (whitespace-only EOF blank-line removal)
  packages/core/src/repo-stabilisation.test.ts   (lint guard async; identical semantics)
GITIGNORED (local): .runtime/runtime-acceptance-proof.mjs
Nothing staged. No Git mutation performed.
```
