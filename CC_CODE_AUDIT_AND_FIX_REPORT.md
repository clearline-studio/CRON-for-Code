# CC Audit + Fix Report — CRON for Code

**Date:** 14 August 2026
**Task:** `CC_CODE_AUDIT_AND_FIX_PROMPT.md`
**Repo:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch:** `main` (2 commits ahead of origin, nothing staged)

---

## 1. Before state

### Failing tests (3, all in `packages/core/src/repo-stabilisation.test.ts`)

| Test | Why it failed |
|---|---|
| `dev launcher > launcher does not contain automatic install commands` | `scripts/create-code-dev-shortcut.ps1` contains the user-facing error message `Run pnpm install first.`, which matches the `/pnpm\s+install/` guard regex |
| `dev launcher > shortcut creator targets the silent launcher` | Test asserted the OLD contract (`launch-cron-for-code-dev.vbs` target); the script was **intentionally** rewritten on 2026-08-13 to target `electron.exe` directly for single taskbar identity (Win11 groups by exe path) |
| `dev launcher restart safety > restart-safe launcher logic/source tests pass` | 2 inner assertions in `scripts/test-code-dev-launcher.ps1` asserted the old contract (VBS target, `$repoRoot` working directory) |

Root cause: the 2026-08-13 taskbar-identity fix changed the shortcut design but the launcher tests were not updated in lockstep (the prior session's log incorrectly claimed "launcher tests unaffected").

### Security audit

- **`child_process.exec`:** **NOT present anywhere** in the codebase. The legacy `CommandExecutor` (the `child_process.exec` + shell landmine) was already deleted on 2026-08-13. Grep over all `ts/tsx/mjs/cjs/js`: zero matches in code (docs mention it only as history).
- **`eval`:** zero matches.
- **Remaining `child_process` usage (all safe):**
  - `packages/data-service/src/opencode-runner.ts` — `spawn`/`spawnSync` with `shell: false` (CLI and headless-server modes).
  - `packages/data-service/src/execution-harness.ts` — `spawn`/`spawnSync` with `shell: false`, redacted/bounded output, kill-tree.
  - `apps/standalone/scripts/dev.mjs` — `shell: true` ONLY for spawning fixed-literal `pnpm`/`electron` shims on Windows (`.cmd` shim requirement). No user input is interpolated. Acceptable.
- **Preload sandbox:** no raw `ipcRenderer`/`shell`/`process` exposure; narrow allowlist bridge only.
- **Path boundary:** `assertPathInsideProject` / `resolveProjectRoot` gate all repo access.
- **Secrets:** harness output redaction patterns (private keys, auth headers, tokens) — in place and tested.

### Dead / unused files

- `apps/standalone/electron/main.mjs.before-aumid-fix` (untracked stale backup)
- `scripts/create-code-dev-shortcut.ps1.before-aumid-fix` (tracked stale backup)
- `isTerminalExecution` export in `packages/data-service/src/execution-harness.ts` (defined, never imported, not re-exported)
- `TaskRunner` + `TaskExecutor`/`TaskExecResult`/`TaskRunnerConfig` in `packages/data-service/src/task-runner.ts` — exported public API + tests, **zero live callers** (live path is `ExecutionService`) — flagged, not deleted (needs Architect decision)
- `scripts/_probe-lnk-roundtrip.ps1`, `scripts/_taskbar-button-count.ps1` — untracked diagnostics deliberately kept per 2026-08-13 PROJECT_LOG entry — flagged, not deleted

### Restart button — already wired, no action needed

Store `restartApp` → host bridge `cron:app:restart` → main.mjs writes restart intent + releases single-instance lock → `dev.mjs` relaunches Electron → `RestartOverlay` + pre-React splash linger until the replacement is renderer-ready. Covered by tests (project-management, restart-overlay, main-ipc-registration, dev launcher suites).

### Tray menu — already wired, no action needed

main.mjs `createTray()` sends `cron:tray:show-tasks` / `pause-task` / `stop-task` → preload.cjs subscription bridge (returns unsubscribe) → `createIpcTrayClient()` → `App.tsx` effect with cleanup on unmount → store actions `trayShowTasks`/`trayPauseTask`/`trayStopTask` (Stop rejects a pending OpenCode approval through the injected runner). 6 dedicated tests in `tray-actions.test.ts`.

### TODO/FIXME/HACK — zero in code.

---

## 2. What was fixed (every file, every change)

| File | Change |
|---|---|
| `scripts/create-code-dev-shortcut.ps1` | Error message reworded from `Run pnpm install first.` → `Run the dependency install step first.` (guard no longer trips; the script never ran installs automatically) |
| `packages/core/src/repo-stabilisation.test.ts` | Test `shortcut creator targets the silent launcher` → `shortcut creator targets electron.exe directly (single taskbar identity)`: asserts `electron.exe` + `.TargetPath`, asserts absence of `launch-cron-for-code-dev.vbs` |
| `scripts/test-code-dev-launcher.ps1` | 2 assertions updated to the new contract: `shortcut creator targets electron.exe directly (single taskbar identity)`, `shortcut creator does not target the VBS launcher`, `shortcut runs Electron from the standalone app directory` (`$shortcut.WorkingDirectory = $standaloneDir`) |
| `packages/data-service/src/execution-harness.ts` | Deleted unused `isTerminalExecution` export + its now-unused `isFinalExecutionStatus` import |
| `apps/standalone/electron/main.mjs.before-aumid-fix` | **Deleted** (stale backup; current version in working tree, prior version in git history) |
| `scripts/create-code-dev-shortcut.ps1.before-aumid-fix` | **Deleted** (stale backup; tracked → shows as deleted) |

No architectural changes made.

---

## 3. After state

### Test results — ALL GREEN (325/325)

| Package | Result |
|---|---|
| contracts | 24 passed (4 files) |
| data-service | 94 passed (9 files) |
| core | 184 passed (14 files) — including all 3 previously failing |
| host-adapter | 23 passed (2 files) |

- `pnpm typecheck` — all packages Done
- `pnpm lint` — 0 errors, 3 pre-existing warnings (`react-hooks/exhaustive-deps` in App.tsx)
- `scripts/test-code-dev-launcher.ps1` standalone — all assertions PASS
- `git diff --stat` — 17 files, +482/−165 (includes the pre-existing uncommitted tray/AUMID work from prior sessions)

### Remaining issues

- `TaskRunner` polling executor: unused by the live app (see decisions below)
- 2 untracked diagnostic probe scripts kept by prior decision
- 3 pre-existing lint warnings (exhaustive-deps)

---

## 4. Security verdict

**The `child_process.exec` landmine is GONE.** It was already removed on 2026-08-13 (`CommandExecutor` class + export), and this audit confirms zero `child_process.exec` and zero `eval` remain in the repository. The only governed execution path is `SafeExecutionHarness` (no shell, bounded/redacted output) plus the OpenCode runner (spawn, no shell). The dev script's `shell: true` is fixed-command-only and poses no injection surface. **Safe to commit.**

---

## 5. Left for Venessa / Architect (decisions, not implemented)

1. **Delete `TaskRunner`?** `packages/data-service/src/task-runner.ts` is exported API with tests but zero live callers — the governed `ExecutionService` replaced it. Recommend deletion for the same reason `CommandExecutor` was deleted (prevents accidental wiring of an ungoverned execution path).
2. **Diagnostic scripts:** keep `scripts/_probe-lnk-roundtrip.ps1` + `scripts/_taskbar-button-count.ps1` tracked (as PROJECT_LOG 2026-08-13 records), or move to a gitignored diagnostics folder?
3. **Tray Pause/Stop depth** (pre-existing, from 2026-08-13): Pause has no backend `paused` state; Stop only truly cancels approval-pending OpenCode tasks. Full support needs a backend cancel-by-task API.
4. **Visual taskbar acceptance** (pre-existing): click the pinned icon — should be ONE icon (if a ghost button lingers, unpin/repin once).

## 6. Log files updated (per the permanent rule)

- `PROJECT_LOG.md` — appended 2026-08-14 entry (findings, fixes, verification, training notes)
- `CRON_ARCHITECT_LOG.md` — appended 2026-08-14 entry (stage call, trust score 9/10, priority fixes)
