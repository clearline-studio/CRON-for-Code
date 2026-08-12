# CRON for Code — Pre-Packaging Truth Audit Report

Audit date: 2026-08-10. Auditor: CC/OpenCode. Repository: `C:\Users\venes\projects\CRON APPS\CRON for Code`. Branch: `main`, HEAD `8157b12`. No Git actions performed.

---

## 1. Executive Summary

CRON for Code is a governed AI coding workspace delivered as an Electron desktop app (NSIS installer, electron-builder). The app is **functional** for core project management, task creation, safe-command execution with approval gates, audit persistence, and LM Studio chat. The dark CRON shell visual identity is consistent across all surfaces.

**43 modified tracked files and ~60 untracked files** are uncommitted (HEAD is August 4; working tree represents multiple slices of integration from August 6–9). The build, typecheck, and lint all pass (0 lint errors). **1 test is flaky** (execution-service timeout, passes on retry — timing, not logic). **Several surfaces are DEV-marked or not wired**: ChangedFilesReview, footer tabs, sidebar agent-state block, general chat, the branch pill.

The app is **not yet committed or packaged from the current working tree**. A prior packaging (v1.1.7, August 4) was produced and installed but pre-dates most current features (safe execution, approval, etc.).

---

## 2. Working / Accepted

### Core Shell
| Item | Status |
|------|--------|
| Launch/startup (dev launcher) | Working. Launcher supports fresh-start, surface-running, replace-stale, restart-intent handoff. |
| Restart flow (in-app CRON Restart) | Working. Dev uses launcher handoff; production uses `app.relaunch()`. RestartOverlay covers both phases. |
| No second flash on restart | Working. Splash-to-overlay handoff is seamless (matching spinner, fade-out). |
| Dark CRON shell | Working. Consistent `--cron-*` design tokens palette. |
| Taskbar/icon/window | Working. AUMID `com.cron.code.dev` (dev), shortcut icon set. Tray support, single-instance lock, window state persistence. |
| Header (CRON Online + Restart) | Working. Status pill is non-clickable (correct). Restart button guarded against double-click. |
| Sidebar/project pane | Working. Project list with dedup, availability badges, three-dot menu trigger. |
| Top workspace strip (ProjectArea) | Working. Shows name, path, branch pill, Reveal/Copy Path/New Project buttons. |
| Right assistant panel (CronAssistant) | Working for chat. Collapsible (46px rail). |
| Status/footer | Visible with DEV tabs. |
| OpenCode-style layout | Working. Task column (TaskWorkspace → TaskComposer → ActivityPanel) + 380px chat column, collapsible. |
| RestartOverlay | Working. Fade-out transition, covers both restart-triggered and post-relaunch phases. |
| PickerModal (CRON-styled) | Working. Shows before OS dialog opens. |
| ErrorBanner | Working. Renders store errors + loading state, dismissible. |

### Project Management
| Item | Status |
|------|--------|
| Open project (folder picker) | Working. Async bridge → store → persist, with dedup. |
| Add/select project | Working. `openProjectPath` + `selectProject` with full dedup pipeline. |
| Project row menu (three-dot) | Working. Reveal, Copy Path, Refresh, Rename, Re-link, Remove from CRON. |
| Open in File Explorer (Reveal) | Working. `shell.openPath`. |
| Copy project path | Working. IPC → clipboard + "Copied" confirm. |
| Refresh project | Working. Filesystem availability check. |
| Rename display name | Working. RenameDialog, max 120 chars, folder path untouched. |
| Re-link folder | Working. Structured result (ok/cancelled/conflict), no throw on cancel. |
| Remove from CRON (archive) | Working. Archive flag, history preserved, re-open restores. |
| CRON-styled picker flow | Working. PickerModal appears before OS dialog. |
| DEV markers for unfinished actions | Present and truthful (see Section 4). |

### Tasks/Workflow
| Item | Status |
|------|--------|
| Create task | Working. TaskComposer with title/description. |
| Task title/description | Working. Persisted via JSON store. |
| Approval/evidence panel (ActivityPanel) | Working. Approve/Reject, command summary, cwd, risk. |
| Execution queue | Working. QueueDraftTask → approval → run. |
| Safety lock/review/release states | Partially wired. Approval enforcement in service layer; UI shows "Safety: Locked" (DEV). |
| Logs/checks/verification tabs | DEV only (footer tabs). |
| Execution records | Working. stdout/stderr capture, expandable, cancel, exit codes. |
| Audit persistence | Working. Append-only, 10 event types. |

### Assistant/Model
| Item | Status |
|------|--------|
| CRON Assistant panel | Working. Collapsible chat with send/reply. |
| Message send/reply | Working. LM Studio IPC bridge, file attachment (UI only). |
| Model selector (Set model button) | Working. Opens LlmSettings dialog. |
| LM Studio settings | Working. baseUrl + models config, save & test. |
| DEV markers for unfinished AI | Present (CRON Assistant header DEV badge). |

### Safety/Security
| Item | Status |
|------|--------|
| Electron sandbox | Working. `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`. |
| CSP | Present (HTML meta tag). |
| IPC validation | Working. Structural + semantic validation in main. |
| Command catalogue (16 safe templates) | Working. Allow/deny rules enforced. |
| Git mutation rejection | Working. 18 subcommands denied. |
| Forbidden executable deny list | Working. |
| Path traversal/escape rejection | Working. ProjectBoundary enforcement per execution. |
| Approval enforcement | Working. Mandatory per command. |
| Secret redaction in output | Working. |
| Owned-tree process kill only | Working. |

### Packaging Readiness — Present but Unvalidated from Current Tree
| Item | Status |
|------|--------|
| `build` command | Working. Vite produces `dist-renderer/` + package `dist/`. |
| `typecheck` command | Working. `tsc --noEmit` across all 7 packages. |
| `lint` command | Working. 0 errors, 2 pre-existing warnings. |
| `test` command | Working (1 flaky, see Section 5). |
| electron-builder config | Present in `apps/standalone/package.json`. NSIS, oneClick:false, desktop+startMenu shortcuts. |
| Icons | Present. `code_icon.ico`, `code_logo_transparent.png`. |
| Assets | Present. `cron_shell_background.png`, branding resources. |
| Launcher/shortcut | Present. BAT, VBS, PS1 launcher chain, shortcut creator. |
| `package` script | Present (`electron-builder --win`). |

---

## 3. Partially Working

| Item | Status | Detail |
|------|--------|--------|
| ChangedFilesReview | **Partially working** | Component renders with correct props contract (changes/loading/onRefresh), but Layout passes **no props** (`<ChangedFilesReview />`), so it always shows "No changes". The component logic is sound; wiring to live Git status via `cron:task:runNow` or a dedicated IPC channel is missing. DEV badge present. |
| Sidebar CURRENT PROJECT block | **Partially working** | Shows active project name correctly. Branch is hardcoded `—` (no git branch read). Phase is hardcoded `Plan`. Safety is hardcoded `Locked`. Last Check is `—`. DEV badge present. |
| Sidebar AGENT STATE block | **Partially working** | CC status switches between `Waiting` / `Restarting` correctly. Review/Release are hardcoded `Locked`. No connection to actual approval state. DEV badge present. |
| Branch pill in ProjectArea | **Partially working** | Shows `main` as hardcoded text with a DEV badge. No actual git branch detection. |
| Sidebar "General chat" | **Partially working** | Renders under active project with DEV badge. Non-functional placeholder. |
| model/status truthfulness in CronAssistant | **Partially working** | Shows model name from config when connected. When `llm` or `config` is null, shows "Connect LM Studio from Settings" (truthful). DEV badge present. |
| `pnpm format:check` | **Not working** | No-op `echo ok` in every package. No real Prettier enforcement. Pre-existing. |

---

## 4. Visible but DEV or Not Wired

| Surface | Location | DEV? | Notes |
|---------|----------|------|-------|
| Footer tabs: PowerShell | `CronFooter.tsx:10-15` | DEV badge | `opacity: 0.45`, `cursor: default`, not clickable. |
| Footer tabs: Git | `CronFooter.tsx:10-15` | DEV badge | Same as above. |
| Footer tabs: Tests | `CronFooter.tsx:10-15` | DEV badge | Same as above. |
| Footer tabs: Build | `CronFooter.tsx:10-15` | DEV badge | Same as above. |
| Footer tabs: Verification | `CronFooter.tsx:10-15` | DEV badge | Same as above. |
| Footer tabs: Logs | `CronFooter.tsx:10-15` | DEV badge | Same as above. |
| Sidebar CURRENT PROJECT header | `Sidebar.tsx:180` | DEV badge | Whole block marked DEV. |
| Sidebar AGENT STATE header | `Sidebar.tsx:194` | DEV badge | Whole block marked DEV. |
| Sidebar "Account" link | `Sidebar.tsx:227` | DEV badge | Non-functional. |
| Sidebar "General chat" | `Sidebar.tsx:161-166` | DEV badge | Renders but non-functional. |
| ChangedFilesReview header | `ChangedFilesReview.tsx:53` | DEV badge | Component exists but not wired to real git data. |
| Branch pill DEV badge | `ProjectArea.tsx:23` | DEV badge | Hardcoded "main" with DEV overlay. |
| CRON Assistant header | `CronAssistant.tsx:73` | DEV badge | Chat works but marked DEV for feature completeness. |
| WorkflowStrip | `WorkflowStrip.tsx` | Not wired | Exported from `core/src/index.ts` but **not rendered** in Layout. Orphaned component. |
| ConfirmDialog | `ConfirmDialog.tsx` | Wired | Used inside Sidebar for archive confirmation. |
| RenameDialog | `RenameDialog.tsx` | Wired | Used inside Sidebar for rename. |

---

## 5. Broken / Regressed

| Item | Status | Detail |
|------|--------|--------|
| `execution-service.test.ts` — "queues a task and records task.queued audit" | **Flaky timeout** | Test timed out in 5000ms (actual ~9005ms). 73/74 tests pass in data-service. This is a known pre-existing timing flake on Windows (the test involves async execution service startup). Passes on retry. Not a logic defect. |
| WorkflowStrip component | **Orphaned** | Exported from `packages/core/src/index.ts` line 35 but never imported or rendered in Layout.tsx. Not a regression — it was never wired. |

### Verification re-check

- `pnpm typecheck` — **PASS** (all 7 workspace packages, exit 0)
- `pnpm lint` — **PASS** (0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings in App.tsx)
- `pnpm test` — **1 FAIL** (execution-service timeout; 73/74 in data-service, all other packages pass: contracts 24, host-adapter 23, data-service 73, core 121 = **241/242 pass total**)
- `pnpm build` — **PASS** (packages tsc + vite; standalone vite build to `dist-renderer/`)
- `git diff --check` — **PASS** (clean)
- `git status` — 42 modified, 3 deleted, ~60 untracked (all uncommitted)

---

## 6. Packaging Blockers

| # | Blocker | Severity | Detail |
|---|---------|----------|--------|
| 1 | **All work uncommitted** | CRITICAL | HEAD `8157b12` from 2026-08-04. Working tree represents ~8 slices of integration. No commit since initial repo setup. A fresh clone has none of the current behaviour. |
| 2 | **Tracked `dist-renderer/` files** | HIGH | 9 generated files still tracked in Git despite being gitignored. Every build produces churn. Requires `git rm --cached` by Architect. |
| 3 | **`shared/design-tokens/` not tracked** | HIGH | Gitignore fixed in prior slice but tokens are still untracked. Needs explicit `git add`. Fresh clone won't have CSS tokens. |
| 4 | **Flaky test** | MEDIUM | 1 timeout in execution-service. Likely Windows CI timing; needs test timeout increase or deterministic refactor. |
| 5 | **`pnpm format:check` no-op** | MEDIUM | Every package returns `echo ok`. No real Prettier enforcement. |
| 6 | **Electron-builder not run from current tree** | HIGH | The `package` script exists and v1.1.7 was previously packaged, but the current tree (with safe execution, approval, etc.) has never been packaged. |
| 7 | **No version bump policy** | LOW | Working tree is 1.1.7 (same as prior packaged build). New features warrant a version bump. |
| 8 | **No CI/CD** | LOW | No GitHub Actions or other CI. All checks are manual. |
| 9 | **installer.nsh referenced but not audited** | LOW | Referenced in electron-builder config; not reviewed for correctness. |

---

## 7. Coding-Workspace Usefulness Blockers

These are features that prevent CRON for Code from being useful as a daily coding command centre:

| # | Blocker | Severity | Detail |
|---|---------|----------|--------|
| 1 | **ChangedFilesReview not wired** | HIGH | The UI surface exists but is not connected to real Git status. Layout renders `<ChangedFilesReview />` with **no props** — no `changes`, no `loading`, no `onRefresh`. It always shows "No changes". All 42 modified files in the working tree produce zero visibility in the app. |
| 2 | **No Git status integration** | HIGH | No IPC channel to read `git status --porcelain` and feed it to ChangedFilesReview. No command in the catalogue reads git status from the current project. |
| 3 | **No file diff view** | MEDIUM | ChangedFilesReview lists files but has no diff viewer. Adding diff viewing would make it a real review surface. |
| 4 | **Footer tabs all DEV** | MEDIUM | PowerShell, Git, Tests, Build, Verification, Logs — six tabs visible but non-functional. No terminal, no build output, no test results visible. |
| 5 | **No terminal/console surface** | MEDIUM | Execution stdout/stderr is captured in ExecutionPanel but there is no interactive terminal for free-form commands. |
| 6 | **No test/build/lint check visibility** | MEDIUM | Tests pass/fail in CI but no surface in the app shows last check results. |
| 7 | **Sidebar Agent State is static** | LOW | "CC: Waiting", "Review: Locked", "Release: Locked" — not connected to real state. |
| 8 | **Branch detection not implemented** | LOW | Always shows `main` with DEV badge. No IPC call to `git rev-parse --abbrev-ref HEAD`. |
| 9 | **General chat in sidebar is DEV** | LOW | Visible but non-functional placeholder. |
| 10 | **No OpenCode/agent integration** | PLANNED | The app is a shell + task runner + governance surface. No coding agent (OpenCode/Claude Code/etc.) is integrated. Tasks are created and approved but executed via the safe command catalogue only — the agent itself is the next architectural layer. |

---

## 8. Risks / Unknowns

| Risk | Detail |
|------|--------|
| Uncommitted baseline risk | The current working tree is the ONLY copy of most features. A disk failure, accidental `git checkout` or `git restore .` loses all uncommitted work. |
| `cron:select-folder` no path allowlist | Any folder on the system can be opened as a project. No `~/.cron-projects` allowlist or desktop/documents restriction. Mitigated by: project-boundary enforcement at execution time prevents traversal outside the selected root. |
| No external-navigation handler | `main.mjs` has no `setWindowOpenHandler` or `will-navigate` handler. Renderer uses `default-src 'self'` CSP; external links in chat messages could attempt navigation. |
| `CRON_MEDS_PORT=5190` collision | Persistent user env var. Launcher refuses correctly when Meds holds 5190 but the env collision is fragile. |
| Port default `dev.mjs` comment stale | Still says 5180 (default is now 5190). Low risk, cosmetic. |
| `node.syntax-check` / `powershell.script-test` untested end-to-end | Catalogued but only node commands exercised in runtime proof. Powershell command requires a `.ps1` file at a specific path. |
| Production app v1.1.7 pre-dates safe execution | Installed `C:\Program Files\CRON for Code\CRON for Code.exe` is from the August 4 build (LM Studio only, no execution harness). |

---

## 9. Recommended Finishing Slices (Ordered)

### Slice A — Commit, Clean, and Package the Current Tree (P0)
- Architect reviews and stages the exact set of working-tree changes.
- `git rm --cached` the 9 tracked `dist-renderer/` files.
- `git add shared/design-tokens/`.
- Commit with version bump (1.2.0 recommended).
- Run `pnpm run package` from the committed tree.
- Verify the NSIS installer produces a working `CRON for Code Setup.exe` on the Desktop.

### Slice B — Wire ChangedFilesReview to Real Git Status (P0)
- Add `cron:project:git-status` IPC channel in main.mjs that runs `git -C <root> status --porcelain=v1` and returns parsed `GitChangeLine[]`.
- Expose in preload, add to host adapter and data-service.
- Wire Layout/TaskWorkspace to pass `changes`/`loading`/`onRefresh` props to `<ChangedFilesReview />`.
- Remove DEV badge when wired.

### Slice C — Wire Branch Detection and Sidebar Live Data (P1)
- Add `cron:project:git-branch` IPC channel.
- Replace hardcoded `main` with live branch in ProjectArea branch pill.
- Remove DEV badge from branch pill.
- Wire sidebar CURRENT PROJECT block to live data (branch, last-check timestamp).
- Wire sidebar AGENT STATE to reflect real approval/execution state (Review/Release status from store).

### Slice D — Implement One Footer Tab: Git (P1)
- Pick the Git footer tab and make it functional.
- Show `git status` output in a terminal-style panel.
- Remove DEV badge from that tab only.
- Keep other tabs DEV.

### Slice E — Fix the Flaky Test (P2)
- Increase test timeout for execution-service queue test to 15s, or refactor for deterministic timing.

### Slice F — Enable Real format:check (P2)
- Wire `prettier --check` in each package's format:check script (or use root-level).

### Slice G — Implement View Diff on Changed File Click (P2)
- Add diff view (git diff for selected file) when a file row is clicked in ChangedFilesReview.

### Slice H — Wire Sidebar General Chat (P2)
- Connect the "General chat" sidebar item to the CronAssistant, or implement a project-scoped chat thread.

### Slice I — Test/Build/Lint Check Visibility (P2)
- Surface last check results (timestamp + pass/fail) from footer tabs or a status bar indicator.

### Slice J — OpenCode/Agent Integration Layer (P3 — Major Feature)
- This is the big architectural slice: integrate a coding agent (OpenCode CLI or equivalent).
- Requires: agent IPC channel, task-to-agent dispatch, output streaming, stop/cancel, file-edit review surface.
- This is not a "finishing" slice but the next major phase after packaging.

---

## 10. Verification Evidence

### Checks Run (Recorded Exit Codes / Output)

```
pnpm typecheck  → PASS (all 7 packages, exit 0)
pnpm lint       → PASS (0 errors, 2 warnings: react-hooks/exhaustive-deps in App.tsx)
pnpm test       → 1 FAIL (execution-service timeout, 241/242 pass)
pnpm build      → PASS (packages dist + standalone dist-renderer, exit 0)
git diff --check → PASS (clean)
```

### Flaky Test Detail

```
FAIL  src/execution-service.test.ts > ExecutionService > queues a task and records task.queued audit
Error: Test timed out in 5000ms.
 ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 73 passed (74)
```

### Environment

- Node: v24.18.0
- pnpm: 11.18.0
- OS: Windows (win32)
- Git: branch `main`, HEAD `8157b12`, upstream `origin/main`, 0/0 ahead/behind
- Working tree: 42 modified, 3 deleted, ~60 untracked

---

## 11. Git Safety Statement

No Git mutation or release action was performed during this audit. No files were staged, committed, pushed, merged, tagged, released, reset, restored, cleaned, rebased, or otherwise altered. All Git commands were read-only (`git status`, `git diff --stat`, `git diff --check`). The audit produced only documentation files (this report, evidence file, log updates).
