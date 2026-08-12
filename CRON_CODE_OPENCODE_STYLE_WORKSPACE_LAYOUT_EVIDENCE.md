# CRON for Code — OpenCode-Style Workspace Layout Evidence

## Verification Evidence

### Typecheck

**Core package:**
```
pnpm --filter @cron-code/core typecheck
$ tsc --noEmit
(no errors)
```

**Standalone package:**
```
pnpm --filter @cron-code/standalone typecheck
$ tsc --noEmit
(no errors)
```

### Lint

```
pnpm lint
$ eslint . --ext .ts,.tsx,.mjs,.cjs
2 warnings (pre-existing, in App.tsx - react-hooks/exhaustive-deps)
0 errors
```

### Tests

```
pnpm --filter @cron-code/core test
Test Files  10 passed (10)
Tests      154 passed (154)
Duration   43.60s
```

All test files:
- `task-ui.test.tsx` — 6 tests passed
- `dev-marking.test.tsx` — 7 tests passed
- `restart-overlay.test.tsx` — 7 tests passed
- `workspace-layout.test.tsx` — 11 tests passed
- `store.test.ts` — 15 tests passed
- `main-ipc-registration.test.ts` — 11 tests passed
- `project-picker.test.tsx` — 13 tests passed
- `relink-flow.test.ts` — 6 tests passed
- `project-management.test.tsx` — 29 tests passed
- `repo-stabilisation.test.ts` — 49 tests passed

### Build

```
pnpm --filter @cron-code/core build
$ vite build && tsc --emitDeclarationOnly
✓ 34 modules transformed.
dist/index.js  112.87 kB │ gzip: 23.23 kB
✓ built in 558ms
```

### Changed Files (git diff)

```
(No Git actions per architect instruction — diff available for manual review)
```

---

## Layout Changes Evidence

### 1. Restart Flash Fix

**Before:** RestartOverlay used `<Loader2>` SVG spinner; HTML splash used CSS border spinner. Visual difference caused a perceptible "second flash" when the splash transitioned to the overlay.

**After:** Both use identical CSS border spinners (34px, 3px border, same colors, `cron-spin` 0.9s animation). The splash-to-overlay transition is one continuous centered screen.

**Timing fix:** Replaced `requestAnimationFrame(requestAnimationFrame(...))` with `setTimeout(0)`. Root is revealed immediately after React's synchronous commit, overlay covers the splash, splash is hidden in the next microtask.

### 2. Workspace Strip (ProjectArea)

**Before:** Thin single-row bar with project name, path, and "New Project" button.

**After:** Proper workspace command bar with:
- Left: folder icon, project name (bold/accent), truncated path, branch pill with DEV badge
- Right: Reveal, Copy Path, separator, New Project

### 3. Sidebar

**Before:** 196px width

**After:** 210px width for slightly better content fit. Projects, project status, agent state, and DEV markers preserved.

### 4. ChangedFilesReview Component

**Before:** No changed-files section in the workspace.

**After:** Collapsible section between tasks and composer with:
- Header: chevron, GitBranch icon, "Changed Files" label, file count, +/- counts, DEV badge, refresh button
- Body: expands to ~180px for file list or empty state
- Ready-to-wire: accepts `changes` array, `loading` flag, `onRefresh` callback

### 5. TaskWorkspace Empty State

**Before:** Single line: "No tasks yet. Describe a task below to create one."

**After:** Structured layout with ClipboardList icon, heading, descriptive text, and two actionable hints pointing to changed-files review and task creation.

### 6. CronAssistant Header

**Before:** "CRON / Assistant — supporting help"

**After:** "CRON Assistant / Dev support — local chat"

---

## Restart Flow Verification

1. User clicks "CRON Restart" in header → `isRestarting` set to `true`
2. Full-screen `RestartOverlay` appears (spinner matches splash CSS exactly)
3. Old window remains visible with overlay while replacement boots
4. New instance launches with `CRON_CODE_RESTARTING=1`
5. HTML splash shows, then JS updates splash text to "Restarting"
6. React commits, root is shown, overlay (z-index 1000) covers splash
7. Splash is hidden via `setTimeout(0)` — no visual change (identical spinners)
8. Init completes + 2s minimum linger passes
9. Overlay fades out over 400ms
10. Entry/project-selection screen appears

No intermediate frame, no pop-in, no unstyled/left-aligned flash.
