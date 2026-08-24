# CC PROMPT — Code: Delete legacy CommandExecutor + Wire tray menu listeners

## Context

Two safety/usability fixes. Restart button is already wired — ignore it.

## Fix 1: Delete legacy CommandExecutor (SECURITY)

**File:** `packages/data-service/src/task-runner.ts`

The `CommandExecutor` class (lines 131-161) uses `child_process.exec` with shell — this is a security landmine. It is unused by the live application (the governed `ExecutionService` replaced it), but if anyone ever accidentally wires it up, it would allow arbitrary shell command execution.

**Actions:**
1. Delete the `CommandExecutor` class entirely (lines 131-161)
2. Remove it from the export in `packages/data-service/src/index.ts` (line 7: `export { TaskRunner, CommandExecutor } from './task-runner.js'` → remove `CommandExecutor` from the export)
3. Check if any other file imports `CommandExecutor` — if so, remove those imports too

**Verification:** Run `npx vitest run` in `packages/data-service` — tests should still pass (CommandExecutor has no live callers).

## Fix 2: Wire tray menu listeners (USABILITY)

**Problem:** The Electron main process (`apps/standalone/electron/main.mjs`) sends three IPC events from the tray context menu:
- `cron:tray:show-tasks` (line 492)
- `cron:tray:pause-task` (line 501)
- `cron:tray:stop-task` (line 509)

But the renderer has NO listeners for these channels. Clicking tray menu items does nothing.

**Actions:**
1. In the renderer (likely `packages/core/src/store.ts` or `packages/core/src/components/App.tsx` or the main IPC registration file), add `ipcRenderer.on` listeners for these three channels
2. `show-tasks` → bring the window to focus / show the task workspace
3. `pause-task` → pause the currently running task (use the existing task store action if available)
4. `stop-task` → stop/cancel the currently running task (use the existing task store action if available)
5. Clean up listeners on unmount

**Check the preload bridge** (`apps/standalone/electron/preload.cjs`) — make sure these channels are exposed to the renderer. If not, add them to the preload allowlist.

**Verification:** Run `npx vitest run` in `packages/core` — tests should still pass.

## Files to change

1. `packages/data-service/src/task-runner.ts` — delete CommandExecutor class
2. `packages/data-service/src/index.ts` — remove CommandExecutor export
3. Renderer IPC registration (wherever `ipcRenderer.on` listeners are set up) — add 3 tray listeners
4. `apps/standalone/electron/preload.cjs` — add tray channels to allowlist if missing

## What NOT to touch

- Do not change the governed ExecutionService
- Do not change the tray context menu in main.mjs
- Do not change any existing tests (only add if needed)
- Do not touch the restart button — it already works

## Verification

1. Run `npx vitest run` in `packages/data-service` — should pass
2. Run `npx vitest run` in `packages/core` — should pass
3. Confirm CommandExecutor is fully removed (grep for it)
4. Confirm tray channels exist in preload and have renderer listeners

## IMPORTANT: Update log files

After making all changes, update BOTH log files at the project root:

### Update `PROJECT_LOG.md`
Append a new entry at the bottom with:
- Date
- What was changed (deleted legacy CommandExecutor security landmine, wired tray menu listeners)
- Which files were modified
- Test results

### Update `CRON_ARCHITECT_LOG.md`
Append a new entry with:
- Date
- What was fixed and why (security: removed shell exec; usability: tray menu now functional)
- Architectural decisions (ExecutionService is the only approved executor, CommandExecutor removed permanently)

## Report format

Report back:
- Files changed
- What changed in each
- Test results
- Whether log files were updated
- Any issues encountered
