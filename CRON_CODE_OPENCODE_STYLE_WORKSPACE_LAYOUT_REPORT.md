# CRON for Code — OpenCode-Style Workspace Layout Report

## Slice: Workspace Layout Reshuffling + Restart Flash Cleanup

**Date:** 2026-08-10
**Architect instruction:** `CRON_CODE_OPENCODE_STYLE_WORKSPACE_LAYOUT_ARCHITECT_SLICE.md`

---

## Summary of Changes

### 1. Restart Flash Fix

**Problem:** The RestartOverlay used a Lucide `<Loader2>` SVG spinner while the HTML pre-React splash used a CSS border spinner. When the splash was hidden and the React overlay became visible, the spinner visual difference created a perceptible "second flash" or pop-in.

**Fix:**
- `packages/core/src/components/RestartOverlay.tsx`: Replaced `<Loader2>` spinner with a CSS border spinner (`spinnerCssStyle`) that matches the HTML splash `#splash-spinner` exactly in size (34px), border (3px), colors, animation (0.9s linear), and appearance.
- Removed the unused `Loader2` import.

**Splash-to-overlay timing:**
- `apps/standalone/src/main.tsx`: Replaced the double `requestAnimationFrame` pattern (which left a 2-frame stale-splash gap) with `setTimeout(0)`. The root is revealed immediately after React's synchronous commit (`rootEl2.style.display = 'block'`), the overlay (z-index 1000) covers the splash, then the splash is hidden in the next microtask. The overlay spinner and splash spinner are now identical, so the transition is one continuous centered screen.

**Test update:**
- `packages/core/src/repo-stabilisation.test.ts`: Updated splash test to expect `setTimeout` instead of `requestAnimationFrame`.

### 2. Top Workspace Strip (ProjectArea)

**`packages/core/src/components/ProjectArea.tsx`** — Full rewrite:
- Expanded from a thin single-row strip to a proper workspace command bar.
- Left side: project name (bold, accent-colored), root path (truncated), branch pill (`main` with DEV badge).
- Right side: Reveal (File Explorer), Copy Path (with inline confirmation), separator, New Project button.
- All buttons use inline icons (`ExternalLink`, `Copy`, `Plus`).
- Consistent CRON dark styling with existing border/background tokens.
- Clean flex layout with proper text overflow handling.

### 3. Sidebar Refinement

**`packages/core/src/components/Sidebar.tsx`**:
- Width increased from 196px to 210px for slightly better content fit.
- The existing left pane already prioritizes projects, current project status, agent state, and DEV markers. Vertical space is already well-managed with the fixed lower stack pattern. No structural change needed beyond the width refinement.

### 4. Changed Files / Review Area

**New component: `packages/core/src/components/ChangedFilesReview.tsx`**:
- Collapsible section with header showing: expand/collapse chevron, GitBranch icon, "Changed Files" label, file count badge, addition/deletion counts, DEV badge, refresh button.
- States handled:
  - **Loading:** Shows "Scanning repository for changes..." with loading badge.
  - **No changes:** Green "No changes" status with helpful message.
  - **Changes present:** File list with status character (M=modified/yellow, A=added/green, D=deleted/red), file path, addition/deletion counts.
- Props: `changes` (GitChangeLine array), `loading`, `onRefresh` (all optional — ready for wiring).
- Properly DEV-marked: the data feed requires wiring through the execution service.
- Exported from `packages/core/src/index.ts`.

**Integration into Layout:**
- `packages/core/src/components/Layout.tsx`: Inserted `<ChangedFilesReview />` between `<TaskWorkspace />` and `<TaskComposer />` in the central workspace column.

### 5. TaskWorkspace Empty State

**`packages/core/src/components/TaskWorkspace.tsx`**:
- Enhanced empty state from a single "No tasks yet" line to a structured layout:
  - ClipboardList icon (muted)
  - "No tasks yet" heading
  - Descriptive subtitle: "Describe a task below to plan and execute code changes."
  - Two action hints with icons: "Check changed files in the review panel below" and "Create a task to run safe commands on your project"
- Uses consistent spacing and styling with the rest of the app.

### 6. CronAssistant Header Refinement

**`packages/core/src/components/CronAssistant.tsx`**:
- Header text changed from "CRON / Assistant — supporting help" to "CRON Assistant / Dev support — local chat" for clearer labeling.
- DEV badge retained.
- All collapse/expand behavior preserved.

**Test update:**
- `packages/core/src/workspace-layout.test.tsx`: Updated CronAssistant test to match new header text ("Dev support — local chat" instead of "Assistant — supporting help").

### 7. Index Export

**`packages/core/src/index.ts`**:
- Added export for `ChangedFilesReview` component.

---

## What Was Kept Intact
- All existing CRON dark styling and CSS design tokens.
- CRON branding: header logo, "CRON Online" status pill, "CRON Restart" button.
- DEV truth markers throughout the UI.
- Restart behaviour (unchanged logic, only spinner visual and timing fixed).
- No fake Git/check/test status. ChangedFilesReview is a ready-to-wire shell.
- No fake model/assistant capability.
- Current project state and data persistence.
- All existing IPC, store, and project management logic.

---

## Verification

| Check | Result |
|-------|--------|
| Core typecheck | Passed |
| Standalone typecheck | Passed |
| Lint | Passed (2 pre-existing warnings only) |
| Core tests (154) | All passed |
| Core build | Passed |

---

## Files Changed

| File | Action |
|------|--------|
| `packages/core/src/components/RestartOverlay.tsx` | Spinner replaced (Loader2 → CSS border spinner) |
| `apps/standalone/src/main.tsx` | Splash timing fixed (RAF → setTimeout) |
| `packages/core/src/components/ProjectArea.tsx` | Full rewrite to workspace strip |
| `packages/core/src/components/Sidebar.tsx` | Width 196→210 |
| `packages/core/src/components/ChangedFilesReview.tsx` | New component |
| `packages/core/src/components/Layout.tsx` | Integrated ChangedFilesReview |
| `packages/core/src/components/TaskWorkspace.tsx` | Enhanced empty state |
| `packages/core/src/components/CronAssistant.tsx` | Header text refined |
| `packages/core/src/index.ts` | Export ChangedFilesReview |
| `packages/core/src/workspace-layout.test.tsx` | Updated CronAssistant test |
| `packages/core/src/repo-stabilisation.test.ts` | Updated splash test |

---

## Completion Status

The slice is complete. All six required layout directions are addressed. The restart second-flash issue is resolved. All checks pass.
