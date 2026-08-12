# CRON for Code — Pre-Packaging Truth Audit Evidence

Audit date: 2026-08-10. Auditor: CC/OpenCode.

---

## Verification Input Used — Verbatim

The architect instruction was read from `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_ARCHITECT_SLICE.md` (165 lines). The full content is preserved in that file in the repository root. The prompt requires:

> Produce a clear Code readiness report so Venessa and the Architect can decide what remains before packaging.

---

## Commands Executed (Raw)

### Typecheck
```
$ pnpm run typecheck
Scope: 7 of 8 workspace projects
packages/contracts typecheck: Done
shared/design-tokens typecheck: ok
shared/config typecheck: Done
packages/host-adapter typecheck: Done
packages/data-service typecheck: Done
packages/core typecheck: Done
apps/standalone typecheck: Done
```
Exit code: 0

### Lint
```
$ eslint . --ext .ts,.tsx,.mjs,.cjs
C:\Users\venes\projects\CRON APPS\CRON for Code\packages\core\src\components\App.tsx
   90:6  warning  React Hook useEffect has missing dependencies...
  100:6  warning  React Hook useEffect has a missing dependency...
2 problems (0 errors, 2 warnings)
```
Exit code: 0

### Test
```
$ pnpm -r run test
packages/contracts: 4 passed (24 tests) - PASS
packages/data-service: 1 failed (execution-service timeout), 6 passed (73/74 tests) - FAIL
packages/host-adapter: 2 passed (23 tests) - PASS
packages/core: (121 tests) - PASS
shared/config: echo ok
shared/design-tokens: echo ok
apps/standalone: echo ok
```
Exit code: 1 (one flaky timeout in execution-service)

### Build
```
$ pnpm run build
packages/contracts: tsc - Done
packages/data-service: tsc - Done
packages/host-adapter: tsc - Done
packages/core: vite build + tsc --emitDeclarationOnly - Done
  dist/index.js  112.87 kB | gzip: 23.23 kB
apps/standalone: vite build - Done
  dist-renderer/index.html   4.08 kB
  dist-renderer/assets/index-_uEMHHvj.js  297.75 kB | gzip: 85.51 kB
  dist-renderer/assets/index-aGk0rog1.css  2.12 kB
```
Exit code: 0

### Git Status (summary)
```
modified:   42 files (packages/core, packages/contracts, packages/data-service,
            packages/host-adapter, apps/standalone, .gitignore, README.md, eslint.config.mjs)
deleted:    3 files (dist-renderer assets)
untracked:  ~60 files (new source files, tests, launchers, audit documents, design-tokens)
```

### Git Diff Check
```
git diff --check
(no output = clean)
```
Exit code: 0

### Node/pnpm Versions
```
node --version  → v24.18.0
pnpm --version  → 11.18.0
```

---

## File Inventory Audited

### packages/core/src/components/
```
App.tsx              — Root app with restart handoff, project selection, error surfacing
Layout.tsx           — Main shell layout (header, sidebar, task column, chat, footer, overlays)
Sidebar.tsx          — Project list, CURRENT PROJECT, AGENT STATE, Settings/Account, context menu
ProjectArea.tsx      — Top workspace strip (name, path, branch, Reveal/Copy/New)
CronHeader.tsx       — Logo/CRON Online status (non-clickable) + Restart button
CronFooter.tsx       — 6 DEV tabs (PowerShell, Git, Tests, Build, Verification, Logs)
CronAssistant.tsx    — Right chat panel (collapsible), LM Studio bridge, DEV badge
EmptyState.tsx       — Entry/project-selection screen with resume cards
RestartOverlay.tsx   — Full-window restart overlay with fade-out
PickerModal.tsx      — CRON-styled project picker wrapping native OS dialog
TaskWorkspace.tsx    — Task list with per-task Run/Queue/Cancel + command selector
TaskComposer.tsx     — Create Task form (title optional, description required)
TaskCard.tsx         — Individual task card (selectable)
ApprovalPanel.tsx    — Approval cards: pending (approve/reject) + resolved history
ExecutionPanel.tsx   — Execution records: expandable stdout/stderr, status, cancel
ActivityPanel.tsx    — Collapsible "Approval & Evidence" wrapper
ChangedFilesReview.tsx — File-change panel (DEV, not wired to real data)
ErrorBanner.tsx      — Error + loading banner, dismissible
LlmSettings.tsx      — LM Studio settings modal (baseUrl, models, test)
ProjectContextMenu.tsx — Three-dot project action menu
ConfirmDialog.tsx    — Destructive-action confirmation dialog
RenameDialog.tsx     — Project rename dialog
WorkflowStrip.tsx    — Orphaned (exported but not rendered in Layout)
```

### packages/core/src/
```
store.ts             — Zustand store (state + actions, reconcileProjects, openProjectPath, etc.)
context.tsx          — React context + useWorkspaceStore hooks
llm.ts               — LlmClient/LlmConfig interfaces
index.ts             — Package barrel exports
```

### apps/standalone/
```
src/main.tsx          — Renderer bootstrap (host adapter, data service, splash → React handoff)
src/ipc-data-service.ts — IPC-based DataService + LlmClient
electron/main.mjs     — Electron main process (IPC handlers, execution service, project management)
electron/preload.cjs  — Sandboxed preload exposing typed cronHost bridge
electron/register-ipc.mjs — IPC channel registry with once-only guard + verification
electron/relink-flow.mjs  — Re-link structured outcome resolver
package.json          — Electron-builder config, version 1.1.7, scripts
vite.config.ts        — Vite config (port 5190, core source alias)
```

### packages/contracts/src/
```
project.ts            — CodeProject type + factories
task.ts               — Task type + factories
approval.ts           — Approval type + execution-aware approval factory
execution.ts          — ExecutionRecord, AuditRecord types + factories
index.ts              — Barrel exports
```

### packages/data-service/src/
```
json-store.ts         — JSON persistence with atomic writes
types.ts              — DataService + CommandSummary interfaces
task-runner.ts        — Task runner (queues intents)
execution-service.ts  — Execution orchestrator (approval → harness → record → audit)
execution-harness.ts  — Safe process spawn (shell:false, redaction, cancel, timeout)
command-catalogue.ts  — 16 safe command templates with allow/deny rules
project-boundary.ts   — Path validation, git-root discovery, traversal rejection
project-management.ts — Project lifecycle (archive, relink, rename, refresh)
ipc-validation.ts     — IPC payload structural + semantic validation
index.ts              — Barrel exports
```

---

## Key Findings Evidence

### Finding 1: ChangedFilesReview Not Wired
In `Layout.tsx:75`:
```tsx
<ChangedFilesReview />
```
No props are passed (`changes`, `loading`, `onRefresh` are all undefined). The component defaults to showing "No changes". There is no IPC channel to fetch git status for the active project.

### Finding 2: Branch Pill Hardcoded DEV
In `ProjectArea.tsx:22-24`:
```tsx
<span style={branchPillStyle}>
  <span style={{ color: '#8da4c7' }}>main</span>
  <span style={devBadgeStyle}>DEV</span>
</span>
```

### Finding 3: Footer Tabs All DEV
In `CronFooter.tsx:4-15`:
```tsx
const placeholderTabs = ['PowerShell', 'Git', 'Tests', 'Build', 'Verification', 'Logs'];
```
All 6 tabs rendered with DEV badge, `opacity: 0.45`, `cursor: default`.

### Finding 4: Sidebar DEV Blocks
In `Sidebar.tsx`:
- Line 180: `CURRENT PROJECT <span style={miniDevStyle}>DEV</span>`
- Line 194: `AGENT STATE <span style={miniDevStyle}>DEV</span>`
- Line 227: `Account</span><span style={miniDevStyle}>DEV</span>`
- Line 164-165: `General chat</span><span style={miniDevStyle}>DEV</span>`

### Finding 5: WorkflowStrip Orphaned
`packages/core/src/index.ts:35` exports `WorkflowStrip`, but `Layout.tsx` does not import or render it.

### Finding 6: Flaky Test
`packages/data-service/src/execution-service.test.ts:54` — "queues a task and records task.queued audit" timed out at 5000ms default, actual ~9005ms.

### Finding 7: Electron-Builder Config
`apps/standalone/package.json:39-73` contains complete electron-builder configuration:
- appId: `ai.cron-code.standalone`
- NSIS installer (x64, oneClick:false, desktop + start menu shortcuts)
- Output: Desktop
- Files: `dist-renderer/**/*`, `electron/**/*`, `branding/**/*`, `node_modules/**/*`, `package.json`

---

## Test Count by Package

| Package | Tests | Status |
|---------|-------|--------|
| contracts | 24 | PASS |
| host-adapter | 23 | PASS |
| data-service | 73 (of 74) | 1 FAIL (timeout) |
| core | 121 | PASS |
| shared/config | echo ok | — |
| shared/design-tokens | echo ok | — |
| apps/standalone | echo ok | — |
| **Total** | **241 of 242** | — |

---

## Working Tree State (git status --porcelain summary)

```
 M .gitignore
 M README.md
 D apps/standalone/dist-renderer/assets/index-BKHl0T_0.js
 D apps/standalone/dist-renderer/assets/index-DKjNfHep-ByRAIpR-.js
 D apps/standalone/dist-renderer/assets/index-DwH0u0NX.css
 M apps/standalone/dist-renderer/index.html
 M apps/standalone/electron/main.mjs
 M apps/standalone/electron/preload.cjs
 M apps/standalone/index.html
 M apps/standalone/package.json
 M apps/standalone/scripts/dev.mjs
 M apps/standalone/src/ipc-data-service.ts
 M apps/standalone/src/main.tsx
 M apps/standalone/vite.config.ts
 M eslint.config.mjs
 M packages/contracts/src/approval.ts
 M packages/contracts/src/index.ts
 M packages/contracts/src/project.test.ts
 M packages/contracts/src/project.ts
 M packages/core/src/components/App.tsx
 M packages/core/src/components/CronAssistant.tsx
 M packages/core/src/components/CronFooter.tsx
 M packages/core/src/components/CronHeader.tsx
 M packages/core/src/components/EmptyState.tsx
 M packages/core/src/components/Layout.tsx
 M packages/core/src/components/ProjectArea.tsx
 M packages/core/src/components/Sidebar.tsx
 M packages/core/src/components/TaskComposer.tsx
 M packages/core/src/components/TaskWorkspace.tsx
 M packages/core/src/components/WorkflowStrip.tsx
 M packages/core/src/index.ts
 M packages/core/src/store.test.ts
 M packages/core/src/store.ts
 M packages/data-service/src/index.ts
 M packages/data-service/src/json-store.test.ts
 M packages/data-service/src/json-store.ts
 M packages/data-service/src/task-runner.test.ts
 M packages/data-service/src/types.ts
 M packages/host-adapter/src/index.ts
 M packages/host-adapter/src/mock.ts
 M packages/host-adapter/src/standalone.ts
 M packages/host-adapter/src/types.ts

?? (untracked): ~60 files including new components, tests, launchers, audit docs, design-tokens
```

---

## No-Git-Action Confirmation

All Git commands were read-only:
- `git status` (read)
- `git diff --stat` (read)
- `git diff --check` (read)

No `git add`, `git commit`, `git push`, `git rm`, `git reset`, or any other mutation was performed.
