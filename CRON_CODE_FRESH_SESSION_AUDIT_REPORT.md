# CRON for Code — Fresh Session Audit Report

**Auditor:** CC/OpenCode (fresh session, read-only audit)
**Date:** 2026-08-13 (local)
**Task class:** Read-only audit. One file was authorised for creation/update: `CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`. Everything else was read-only.

---

## 1. YOUR IDENTITY

- **Exact folder audited:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
- **App name:** CRON for Code (package `cron-for-code`, version of standalone app `1.1.7` in the working tree).
- **Tech stack:** pnpm monorepo (workspaces: `apps/*`, `packages/*`, `shared/*`).
  - `apps/standalone` — Electron desktop host (`electron/main.mjs` main process, sandboxed `preload.cjs`, React renderer via Vite to `dist-renderer/`).
  - `packages/contracts` — typed domain contracts (project/task/approval/execution/audit/host).
  - `packages/core` — reusable React workspace (zustand store + components), TypeScript.
  - `packages/data-service` — JSON-backed persistence + execution services, TypeScript.
  - `packages/host-adapter` — host boundary, TypeScript.
  - `shared/config` + `shared/design-tokens` — shared TS config and CSS tokens.
  - React 19, Zustand, Electron 35, Vite 6, Vitest 3, TypeScript 5.

## 2. WHAT ACTUALLY WORKS

Each item is wired end-to-end; evidence file names in brackets.

- **The app launches and runs.** A live instance was running at audit time (Electron processes, clean startup). The dev runtime marker `.runtime/code-dev-main-marker.json` shows: all 37 IPC channels registered, `windowReady: true`, `rendererReady: true`, `rendererUsable: true`, no startup errors (`apps/standalone/electron/main.mjs`). Startup logs in `.runtime/code-dev-electron.log` show clean boots (~1–2 s to usable).
- **Window + tray + window-state persistence.** Window opens, minimizes to tray on close, restores size/position (`main.mjs` `createWindow`, `loadWindowState`/`saveWindowState`, `createTray`). Single-instance lock with "second instance focuses existing window".
- **Dev launch/restart supervision.** `apps/standalone/scripts/dev.mjs` supervises Vite + Electron, consumes a restart-intent file, relaunches the app after an in-app restart, with a replacement-watch so the old window hands over only when the new one is ready (`main.mjs` `performAppRestart`/`startReplacementWatch`; launchers `Launch-CRON-for-Code-Dev.bat`, `launch-cron-for-code-dev.vbs`, `scripts/run-code-dev-hidden.ps1`).
- **Persistence.** JSON store with atomic debounced writes: projects, tasks, approvals, executions, audit trail, preferences (`packages/data-service/src/json-store.ts`). Save/load/delete IPC for all of these (`main.mjs` `cron:db:*` handlers).
- **Projects.** Add, open, select, rename, archive/unarchive, re-link (folder picker with structured cancel/conflict results), refresh availability, reveal in Explorer, copy path (`packages/core/src/store.ts`, `packages/data-service/src/project-management.ts`, `main.mjs` `cron:project:*`). Duplicate folders are collapsed to one canonical project (`store.ts` `reconcileProjects`). Re-link of an archived project restores it; selecting a path that already belongs to another project is blocked with a conflict message.
- **Entry/project-selection screen.** Launch lands on a real entry screen with "Open Project" (CRON-styled picker modal wraps the OS dialog: `PickerModal.tsx`) and "Resume a project" cards (`EmptyState.tsx`).
- **Chat with LM Studio (local models).** Real chat UI (`CronAssistant.tsx`) with routing (local chat / local vision / coding handoff), attachments, and a model/settings dialog (`LlmSettings.tsx`). Full chain renderer → preload → IPC → main → LM Studio HTTP (`main.mjs` `cron:lmstudio:*`, `preload.cjs`, `apps/standalone/src/ipc-data-service.ts`). Verified live in previous evidence reports; **note:** at audit time LM Studio was NOT listening on port 1234, so a chat message sent today would error until it starts.
- **Coding-agent (OpenCode) execution.** A governed runner exists: it validates the project is a Git repo inside a safe boundary, discovers the `opencode` CLI (installed on this machine) or spawns a headless OpenCode server, sends a constrained prompt (no destructive Git, no secrets), and captures changed-file evidence (`packages/data-service/src/opencode-runner.ts`, `opencode-server-adapter.ts`). Escalation model (V4 Pro) is deliberately blocked until explicit approval support exists.
- **Command execution with approvals.** Allowlisted command catalogue (read-only Git inspection + `pnpm test/typecheck/lint/format-check/build` + `node --check` + one restricted PowerShell-script command under `scripts/`), approval request/approve/reject state machine with expiry, safe spawn harness with output caps, redaction of secrets in output, timeouts, cancellation, and kill-tree (`command-catalogue.ts`, `execution-service.ts`, `execution-harness.ts`, `project-boundary.ts`). Every catalogue command requires approval; Git mutations, shells, and `gh` are forbidden by the catalogue.
- **Approvals UI.** Pending approvals render with Approve/Reject in the Review pane and inline in the chat handoff card (`ActivityPanel.tsx`, `ApprovalPanel.tsx`, `CronAssistant.tsx`), and OpenCode permission requests can be answered in the same session (`cron:opencode:reply-approval`).
- **Execution history + audit trail.** Execution records (status, exit code, output with redaction flags, timeouts, cancellation) and append-only audit records for task/approval/execution transitions are persisted and surfaced (`executions`/`audit` in store, `ActivityPanel.tsx`, `ExecutionPanel.tsx`).
- **Review pane.** Right-hand pane with Changed Files (derived from execution evidence), Approval & Evidence, live activity trail (`Layout.tsx` `ReviewPane`, `ChangedFilesReview.tsx`, `ActivityPanel.tsx`).
- **Quality gates.** `pnpm typecheck` PASS, `pnpm lint` PASS (0 errors, 2 hook warnings in `App.tsx` — was failing before), `pnpm build` PASS, 317 of 319 tests pass (see §5 for the 2 failures).

## 3. WHAT IS HALF-DONE

- **Test suite is RED.** `pnpm test` fails: 2 tests in `packages/data-service/src/opencode-runner.test.ts` time out at the 5 s default (`reject resolves the exact session/request…` at line 315 and `a follow-up permission after approval stays on the same session…` at line 345). Reproduced consistently twice. The whole opencode-runner file is very slow (~55 s for 17 tests); a sibling test needs an explicit 30 s timeout to pass. Looks like a timeout/throttling problem rather than wrong assertions, but it is a genuine current failure.
- **Restart is fully built but has no visible button.** The restart overlay, IPC handler, dev supervisor, and relaunch logic all work, but the only UI that had a "CRON Restart" button is `CronHeader.tsx` (line 53), and the current `Layout.tsx` does not render `CronHeader` at all. A user today has no visible way to trigger restart; it is only reachable programmatically.
- **Tray menu actions are inert.** The tray's "Show active tasks", "Pause current task", "Stop current task" send `webContents` messages (`main.mjs` `createTray`) that nothing in the renderer listens for (no listener anywhere in `packages/core`).
- **Legacy task UI is dead code.** `TaskComposer`, `TaskWorkspace`, `TaskCard`, `Sidebar`, `CronHeader`, `CronFooter`, `ProjectArea`, `WorkflowStrip`, `CronNavBar` all exist, are exported and tested, but the live `Layout.tsx` uses a new drawer-style navigation instead — the legacy shell only appears in tests.
- **`CommandExecutor` (legacy) is unsafe-by-design but unused.** `packages/data-service/src/task-runner.ts:138` executes an arbitrary command string via `child_process.exec` (shell). It is exported from `index.ts` but NOT used by the live app (the live path is `ExecutionService` + `SafeExecutionHarness`). A landmine if someone wires it up later.
- **Review pane tabs.** "Approvals" and "Evidence" tabs in the Review pane header are static labels (real approval/evidence content is below them regardless) (`Layout.tsx` `reviewTabsStyle`).
- **Changed-files detection is heuristic.** It regex-parses execution output for changed/created lines and `*-runtime-test.txt` files (`Layout.tsx` `deriveChangedFiles`) — it is not a real diff-based verification.
- **Escalation route is stubbed.** "DeepSeek V4 Pro escalation… not implemented in this slice" (`opencode-runner.ts:759`).
- **Data-layer `tasks.runNow` is only an intent marker.** It just queues; real execution happens via the `cron:task:run-now` IPC → ExecutionService (`json-store.ts:280`). This is fine but easy to misread.

## 4. WHAT IS JUST A PRETTY PICTURE

- **"Release Gate: Locked" chip** on the entry screen (`EmptyState.tsx:83`) — there is no release gate anywhere in the app.
- **"Executor: OpenCode" chip** is real only if the OpenCode CLI/server is available; it is not a guarantee shown to the user.
- **Tray items** "Show active tasks / Pause / Stop current task" — pretty menu, no listener.
- **The "CRON Restart" button** (see §3) — present in an unwired component, absent from the live screen.
- **Footer tabs** (PowerShell, Git, Tests, Build, Verification, Logs) with red "DEV" badges (`CronFooter.tsx`) — component not rendered by the live layout; the DEV-badge honesty marker only shows in tests.
- **Review pane tabs** "Approvals"/"Evidence" — labels only.

## 5. WHAT IS BROKEN OR CONCERNING

- **Broken (currently):** `pnpm test` fails with the 2 timeouts described in §3; LM Studio chat will error today because the local model server is off; no visible restart control.
- **Secrets scan:** No hardcoded API keys, tokens, or passwords found in the repo (source scan + commit scan). What exists:
  - The runner reads an environment variable `OPENCODE_SERVER_PASSWORD` (plus `OPENCODE_SERVER_USERNAME`) for Basic auth to the locally-spawned OpenCode server (`packages/data-service/src/opencode-runner.ts:162-167`). That env var IS set on this machine. It lives in the environment, not in the repo — nothing to fix in code, but be aware it is present in the session.
  - LM Studio config stores no credentials (local `http://127.0.0.1:1234/v1` endpoint only). The settings dialog accepts any `http(s)://` URL with no host allowlist (`main.mjs` `cleanLlmConfig`) — a user could point it anywhere; acceptable for a local tool, worth noting.
- **Delete/irreversible operations:** IPC handlers `cron:db:delete-project`, `cron:db:delete-task`, `cron:db:delete-approval` exist in main + preload, but NO UI calls them (no `deleteProject/deleteTask/deleteApproval` call anywhere in `packages/core`). The UI only archives projects. Command execution is gated: every catalogue command requires approval, the harness spawns without a shell, and destructive Git/shell/`gh` executables are forbidden. So nothing irreversible can be triggered from the UI today.
- **Release/commit/push capability:** the app has none. `git` mutations and `gh` are on the forbidden list in the command catalogue (`command-catalogue.ts:7-65`). A Git remote exists (`origin` = `https://github.com/clearline-studio/CRON-for-Code.git`), and `pnpm package` can build an NSIS installer to the Desktop (`apps/standalone/package.json`), but neither is reachable from inside the app and both require deliberate manual action outside it.
- **Repository hygiene (concerning for the Architect):**
  - The whole recent feature set is **uncommitted**: 40 modified files, 3 deleted (old tracked build assets), 105 untracked files (including all source for execution/approvals/OpenCode, the launcher scripts, and ~50 report/evidence markdown files). `git log` is still only 2 commits; `origin/main` has nothing newer. If anything happened to the disk, weeks of work would be lost.
  - `shared/design-tokens/` is still untracked (the `.gitignore` over-match was fixed this time, but the directory was never committed) — a fresh clone still cannot build.
  - `apps/standalone/dist-renderer/` build output is now gitignored, but `index.html` inside it is still tracked, so every build keeps churning a tracked file (currently shows as modified, plus 3 deleted assets).
  - README "Status" section is stale: it claims task/agent execution, approval UI gates, and OpenCode integration are "not yet implemented" — all three now exist in the working tree.
  - Minor: `register-ipc.mjs` `ALL_IPC_CHANNELS` list omits `cron:db:save-approval`/`cron:db:delete-approval` that `main.mjs` actually registers (the required-channel verification list is correct; only the static all-list is incomplete).

## 6. WHAT IS MISSING VERSUS THE PLAN

Long-term parts of CRON for Code, judged against the working tree:

| Part | Status |
|---|---|
| Architect role | Exists as governance docs/logs in the repo (`CRON_ARCHITECT_LOG.md`, slice reports) — external to the app, not in-app. |
| Coding agent | Implemented: OpenCode runner (CLI + headless server), governed prompts, changed-file evidence. |
| Independent reviewer | **Missing.** There is a "Review" pane but it is evidence display only; no independent second-pass reviewer role or module. |
| Repositories | Implemented: project add/open/archive/relink/rename/dedup/conflict checks. |
| Tasks | Implemented: create/queue/run with full state machine (draft→queued→approval_required→running→completed/failed/blocked/cancelled). |
| Approvals | Implemented: command approvals with expiry + OpenCode permission approvals, UI in Review pane + inline chat. |
| Command execution | Implemented: allowlisted catalogue, safe harness, project-boundary checks, redaction, timeouts, cancellation. |
| Logs | Runtime logs (`.runtime/*.log`) + persisted audit trail exist; no dedicated "Logs" screen (the footer "Logs" tab is a DEV-marked placeholder, and the footer is not rendered anyway). |
| Verification | Partial: execution records + changed-file derivation, but no real diff-based verification gate ("Verification" tab is a placeholder). |
| Release controls | **Missing.** Only a static "Release Gate: Locked" chip; Git mutations are forbidden rather than gated-with-approval. |
| Training history | **Missing.** No session/training history module. |

## 7. YOUR HONEST STAGE CALL

**Active Development.** A large, genuinely working governed-execution feature set (approvals, safe command catalogue, OpenCode runner, audit trail, project management) sits on top of a clean shell, but it is entirely uncommitted, the test suite is red by two timeouts, several UI surfaces are unwired or inert, and the release/training/independent-reviewer parts of the plan do not exist yet.

## 8. WHAT YOU DID NOT TOUCH

- No source file, config file, or document was changed by this audit. Nothing was staged, committed, pushed, reset, or deleted. `git status` before and after the audit shows the same working-tree shape: 40 modified / 3 deleted / 105 untracked, 0 staged.
- The only filesystem activity was running the repo's own verification scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`. The build regenerated the now-gitignored `dist-renderer/` output and rewrote the already-modified tracked `apps/standalone/dist-renderer/index.html` (its git status was already "modified" before this session and still is).
- The only file written by this audit is this report (`CRON_CODE_FRESH_SESSION_AUDIT_REPORT.md`), which replaced the previous session's report with the same name.

REPORT COMPLETE.
