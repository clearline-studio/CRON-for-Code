# CRON FOR CODE — RUNTIME ACCEPTANCE REPORT

Slice: `CRON_CODE_RUNTIME_ACCEPTANCE_ARCHITECT_SLICE.md` (Approved Architect slice, 2026-08-09)
Owner: Venessa Olivier · Lane: Code — runtime safety lane
Executed by: CC/OpenCode — verify-and-repair only, within the approved acceptance path.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The runtime acceptance path is verified end to end against the live dev app. Two gate defects
were found and repaired inside the slice, both test/whitespace-only — no product behaviour changed:

1. `git diff --check` — a whitespace-only trailing blank line at EOF in `packages/core/src/store.test.ts`.
2. `pnpm test` — the pre-existing vitest `onTaskUpdate` worker-timeout flake (the repository-stabilisation
   lint guard blocked its vitest worker synchronously for 60–90 s with `spawnSync` of whole-repo ESLint;
   made async — the identical full-repo ESLint still runs and asserts exit 0, the worker stays responsive,
   and the suite now completes in ~30 s instead of intermittently failing the gate).

Interactive window clicks (folder picker Cancel in the real window, CRON Restart button click,
project menu clicks) remain Venessa's manual acceptance steps — CC does not claim them. Every
automated acceptance item and the full verification gate pass.

---

## 2. Repository identity (verified live)

- Path: `C:\Users\venes\projects\CRON APPS\CRON for Code`
- Branch: `main` (local `master` also present, same commit). HEAD: `8157b12 feat-refine-cron-shell-layout`.
- Upstream `main -> origin/main`, ahead/behind 0/0. Remote: `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`.
- Staged files: none. `git diff --check` clean (after repair).
- Node `v24.18.0`, pnpm `11.18.0`.

Working-tree state at slice start (read-only): 40 modified / 3 deleted / 61 untracked (pre-existing
uncommitted work preserved). Nothing staged. No Git mutation performed at any point.

---

## 3. Verification input used

`CRON_CODE_RUNTIME_ACCEPTANCE_ARCHITECT_SLICE.md`, stored verbatim in
`CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

---

## 4. Acceptance journey — evidence per item

### 4.1 Launches from the dev shortcut/launcher — PASS

- Dev stack was down at start (no listener on 5190, no owned PIDs). Launcher run
  `scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0, log line `Lifecycle decision: fresh-start`
  → `App ready (electron PID 22884, renderer-ready marker confirmed). Launcher completed.`
- Desktop shortcut `C:\Users\venes\Desktop\CRON for Code Dev.lnk` present (verified on disk).

### 4.2 Main window renders visible content — PASS

- Dev server HTTP 200 on 5190. Runtime marker (`code-dev-main-marker.json`):
  `windowReady=true`, `rendererReady=true`, `lastStartupError=null`, 34 IPC channels registered,
  8/8 required channels. `rendererReady` is the renderer's own `cron:diag:ready` round trip
  (proves preload→main→React bootstrap).
- The served renderer bundle transforms without errors: `Layout.tsx` (21,452 B), `ActivityPanel.tsx`
  (18,451 B), `ApprovalPanel.tsx` (28,384 B), `ExecutionPanel.tsx` (37,471 B) all HTTP 200 via the
  Vite module graph; `Layout` references ActivityPanel/TaskComposer/Sidebar/TaskWorkspace/CronAssistant.

### 4.3 Known projects appear — PASS

- Real dev store (`%APPDATA%\CRON for Code Dev\cron-for-code-data\store.json`): 3 persisted
  project records (CRON for Meds — archived, CRON for Claims — archived, CRON for Claims — active
  canonical). Controlled proof loaded a read-only copy through the real DataService + real store:
  reconcile → 2 in-memory records (Meds archived + Claims active), 1 visible (CRON for Claims),
  `error=null`, `isLoading=false`.
- Last-active restoration: `lastActiveProjectId=proj_1786063530296_t62fq0` restores the active
  CRON for Claims record. (Meds/Claims-295 remain hidden because they are archived by deliberate
  user Remove-from-CRON actions — contract-correct, unchanged by this slice.)

### 4.4 Selecting a project does not duplicate it — PASS

- Controlled proof: `openProjectPath` on the same Claims folder again → persisted records still 3
  (no duplicate), reconciled set still 2, visible still 1, active unchanged, loading cleared.

### 4.5 Re-link cancel is quiet and does not clear the project list — PASS

- Pure main-process flow: `resolveRelinkOutcome({ canceled: true, filePaths: [] }, …)` →
  `{ status: 'cancelled' }` (a first-class structured result, never a thrown exception).
- Store level with the host adapter returning `{ status: 'cancelled' }`: no error, no loading,
  project list unchanged, active project unchanged, `lastActiveProjectId` preference unchanged.

### 4.6 In-app restart closes and reopens to visible content — PASS (×2 consecutive)

- Driven via the exact dev restart handoff main writes (`code-dev-restart-requested.json`
  `{ pid, requestedAt }`, the file `cron:app:restart` creates in dev):
  1. Cycle 1 (10:12): log `In-app restart requested (intent marker present). Replacing the owned
     dev stack.` → old Electron 22884 stopped → fresh stack (dev 28080 / vite 23892 / electron 22268)
     → `App ready`, marker `rendererReady=true`, 34 channels, 8/8 required, no startup error.
  2. Cycle 2 (10:13): same outcome (dev 9196 / vite 27836 / electron 28004, healthy marker).
- Intent file consumed after each cycle. Dev store SHA256 identical before and after both restarts
  (`29E63A…B56AA2D`) — projects/preferences fully preserved. Exactly one dev stack after each.
- The renderer button → store → IPC → handler chain is covered by tests; the live button click is
  Venessa's manual step.

### 4.7 Approval/execution surfaces visible and safe — PASS

- Surfaces ship in the rendered bundle (ApprovalPanel, ExecutionPanel, ActivityPanel — see 4.2) and
  render per component tests (`ApprovalPanel`/`ExecutionPanel`/`ActivityPanel` tests, 121 core tests).
- Runtime chain through the real DataService + ExecutionService + SafeExecutionHarness + real
  command catalogue (exactly what Electron main owns): run → blocked (`Approval is pending`, task
  `approval_required`, approval `requested`) → approved → executed (`repo.identity`, cwd=project
  root, exit 0) → execution record `completed` → audit events `approval.requested`,
  `execution.started`, `execution.completed` persisted → store surfaces reflect the evidence
  (1 approval, 1 execution) → restart retains all of it.

### 4.8 No unrelated CRON app stopped or hijacked — PASS

- Before/during/after all runs: CRON for Meds vite PID 10788 (port 5191) alive, CRON for Claims
  vite PID 9336 (port 5193) alive, CRON HUB vite PID 15300 alive. Production `CRON for Code` was
  already not running at slice start and remained untouched (its userData directory unchanged).
- Launcher log shows the only process terminated was the owned dev Electron in each restart cycle
  (`Replacing only this repo's stale/broken owned Electron process (PID …)`). `CRON_MEDS_PORT=5190`
  env collision was disclosed by the launcher and never modified. No port was hijacked (5190 stayed
  owned by the repo Vite throughout).

---

## 5. Verification gate

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — and the pre-existing `onTaskUpdate` load flake is fixed (see §5.1). Final counts: contracts 24, host-adapter 23, data-service 74, core 121 = 242. |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings (plainly classified, unchanged baseline) |
| `pnpm build` | PASS, exit 0 (packages + `dist-renderer/`) |
| `pnpm format:check` | PASS (known no-op `echo ok` per package, pre-existing) |
| `git diff --check` | FAIL first → fixed → PASS |
| Current git status | Reported in §6. Nothing staged. |
| Runtime proof | Recorded in `CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md` |
| Git actions | None (read-only only) |

### 5.1 Gate defect found and fixed 1 — whitespace at EOF

`git diff --check` reported `packages/core/src/store.test.ts:423: new blank line at EOF`.
Repaired by removing the trailing blank line (byte-level, UTF-8 safe; file contains non-ASCII text).
Re-checked: `git diff --check` exit 0. The file's 15 tests pass (isolated run).

### 5.2 Gate defect found and fixed 2 — the `onTaskUpdate` test flake (root-caused, not worked around)

Symptom: `pnpm test` intermittently failed with `[vitest-worker]: Timeout calling "onTaskUpdate"`
while every test passed (seen 2 of 3 full-suite runs this slice; previously documented as
"pre-existing load flake" in the Dev Restart Blank-Window repair slice).

Root cause (proven by trace, not guessed): `packages/core/src/repo-stabilisation.test.ts` ran the
whole-repo ESLint guard with a synchronous `spawnSync(...)` inside the vitest worker. ESLint over
the repo takes ~60–90 s under suite load, blocking that worker's event loop and RPC handling past
vitest's internal `onTaskUpdate` timeout.

Fix (guard semantics identical): the lint-guard test now spawns the exact same
`node eslint . --ext .ts,.tsx,.mjs,.cjs` as an async child process (bounded by the same 100 s
kill timer) and still asserts exit 0. The worker stays responsive while ESLint runs.

Evidence: isolated guard run 18.2 s exit 0 (33/33 tests); full suite now ~26–30 s, clean, repeated
passes (10:21, 10:24). No product code touched — `packages/core/src/repo-stabilisation.test.ts` only.

---

## 6. Working-tree state (slice close)

- 40 modified / 3 deleted / 63 untracked (+2 new: this report and its evidence file) — pre-existing
  uncommitted work preserved untouched.
- New local-only (gitignored) files: `.runtime/runtime-acceptance-proof.mjs` (proof driver).
- New documentation files: `CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md`,
  `CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md`, plus updates to `CRON_ARCHITECT_LOG.md` and
  `PROJECT_LOG.md` (per slice scope).

## 7. Exact files changed by this slice

- `packages/core/src/store.test.ts` — removed one trailing blank line at EOF (whitespace-only gate fix).
- `packages/core/src/repo-stabilisation.test.ts` — lint-guard test converted from blocking
  `spawnSync` to an async child process (identical ESLint invocation and exit-0 assertion); fixes
  the pre-existing `onTaskUpdate` full-suite flake. Test-harness only; no product code.
- `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md` — checkpoint/execution entries appended.
- `CRON_CODE_RUNTIME_ACCEPTANCE_REPORT.md`, `CRON_CODE_RUNTIME_ACCEPTANCE_EVIDENCE.md` — created.

## 8. Protected boundaries preserved

Port 5190, AUMID `com.cron.code.dev`, dev userData, launcher/restart architecture, runtime marker,
IPC registration, project semantics (archival, dedup, last-active), approval model, command
catalogue, execution harness, audit persistence, LM Studio wiring, sandbox/contextIsolation,
narrow preload, README status line (not blurred — the "not yet implemented" list stands).

## 9. Out-of-scope respected

No OpenCode integration, no broad agent execution, no arbitrary command entry, no Git release gate,
no dependency/package-manager changes, no port/icon/AUMID/launcher/packaging changes, no staging/
commit/push/release/reset/cleanup. No unrelated CRON app was stopped or hijacked.

## 10. Remaining gaps / notes for the Architect

1. Interactive acceptance (folder-picker Cancel in the real window, CRON Restart button click,
   project menu clicks, visual review) is Venessa's step — automated proofs cover the chains.
2. The dev store's Meds + Claims-295 records remain archived by deliberate user actions; only
   CRON for Claims is visible. Expected behaviour, unchanged.
3. `pnpm format:check` remains a no-op `echo ok` (pre-existing).
4. The vitest `onTaskUpdate` full-suite flake is fixed (async lint guard, §5.2) — previously
   documented as pre-existing in the Dev Restart Blank-Window repair slice.

## 11. Final self-audit

- Correct repository, branch, HEAD; upstream 0/0.
- Nothing staged, committed, or pushed; no prohibited Git or release action occurred.
- Gate: test/typecheck/lint/build/format:check pass; `git diff --check` clean; the
  `onTaskUpdate` flake is eliminated (root-caused and fixed, guard semantics unchanged).
- Runtime: launch fresh-start, visible content (renderer-ready), projects load + restore,
  no duplicate on reselect, relink-cancel quiet, restart ×2 to visible content with data
  preserved, approval/execution surfaces proven, unrelated CRON apps untouched.
- All pre-existing working-tree changes preserved; only the whitespace gate fix touched source.

State exactly:

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
