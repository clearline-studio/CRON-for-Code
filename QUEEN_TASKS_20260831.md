# Code — Queen task list (Mon 31 Aug 2026)

Focused build list for the Code Gem. Goal: build the REAL bridge so Intelligence can call
Code as a module (full connection, not just a documented seam). Rolling — done today or
carried forward; clean pass/fail.

## Context
Code is healthy and feature-complete for its standalone purpose. The one missing piece for
"slots into Intelligence" is the handoff bridge. This list is ONLY about that bridge.

## 1. Define the handoff contract (the single source of truth)
In `packages/contracts`, define the type-safe shape for the Code <-> Intelligence handoff:
- **Input (Intelligence -> Code):** project (repo path) + plain-language task + optional
  context/attachments.
- **Output (Code -> Intelligence):** status/progress, approval requests, changed files,
  verification evidence.
Make it explicit and typed, so both sides build against one truth.

**Done = verifiable:** the contract is typed, exported from `contracts`, and covered by a
test that asserts the shape. No both-sides drift.

## 2. Build a callable programmatic entry (host-agnostic)
Code's core is a React UI (peer deps). To let Intelligence CALL it (not just React-compose it),
add a host-agnostic programmatic entry — a function that takes (project, task, context) and
drives the OpenCode runner, returning status/approval/changed-files. Keep Electron/tray/
folder-picker OUT of this boundary (they stay standalone-only).

**Done = verifiable:** a non-UI entry point exists that takes task -> runs the real OpenCode
runner -> returns status/approval/changed-files, decoupled from Electron. Tested.

## 3. Separate standalone-only from shared (verify the seam)
Confirm what stays in standalone (Electron shell, tray, folder picker, window/restart) and what
is genuinely reusable (OpenCode runner, safety/approval/audit, contracts, model routing).
The shared engine must be host-neutral with no Electron imports.

**Done = verifiable:** the shared core has no Electron/window.host imports (tested/linted);
standalone-only bits are clearly separated and not leaking into the shared boundary.

## 4. Wire a live path Intelligence can invoke
A concrete integration path so Intelligence can actually reach Code (e.g. a transport both can
use — IPC/HTTP — or a documented, tested adapter that Intelligence's side can call).

**Done = verifiable:** an end-to-end path where an external caller (representing Intelligence)
hands Code a task and receives a real result. Not mock-only.

## 5. Keep the suite green
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass after the changes.
- No regressions to the existing standalone app.

## Note / honesty
This is the bridge build. If any item can't land today it rolls. The important thing is a REAL
working handoff, not a documented-but-unwired seam. Intelligence-side wiring may be a follow-up
once the Code bridge is proven.

---
_Mother Gem — today's list for the Code queen. Focus: the Intelligence->Code bridge._
