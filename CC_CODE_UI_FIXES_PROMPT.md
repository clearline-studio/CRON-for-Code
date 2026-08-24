# BB Prompt: CRON for Code — UI Fixes #2–#5

**Date:** 17 August 2026
**Author:** MIMO (Architect)
**Repo:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch:** `main`
**Priority:** HIGH
**Scope:** 4 targeted UI fixes. No architectural changes.

---

## Context

Venessa live-tested CRON for Code and found 6 issues. #1 (chat broken) was fixed by MIMO in Session 17 (defaults corrected, model validation added). This prompt covers the remaining 4.

Tests are currently 325/325 green. Lint 0 errors. Typecheck pass. **Do not regress any of these.**

---

## Fix #2: Wire Restart Button into the Layout

**Problem:** `CronHeader.tsx` exists with a working restart button, but it is NEVER rendered in the app. The layout (`Layout.tsx`) uses its own top bar that has no restart button. Dead code.

**What to do:**
1. Remove `CronHeader.tsx` — it is dead code, never imported by any live component.
2. Add a "CRON Restart" button to the **top bar** in `Layout.tsx` (next to the settings gear icon, before it).
3. Style it to match the existing top bar buttons (use `iconButtonStyle`).
4. On click, call `restartApp()` from the workspace store (same pattern as `CronHeader`).
5. Show a loading spinner (Loader2 from lucide-react) while `isRestarting` is true. Disable the button while restarting.
6. Test: add a test in `project-management.test.tsx` that the restart button is rendered and calls restartApp when clicked.

**Files to touch:**
- Delete `packages/core/src/components/CronHeader.tsx`
- Edit `packages/core/src/components/Layout.tsx` — add restart button to `topBarStyle` header
- Edit `packages/core/src/project-management.test.tsx` or `workspace-layout.test.tsx` — add restart button render test
- Check `packages/core/src/dev-marking.test.tsx` — remove CronHeader import and tests (they test dead code)

---

## Fix #3: Cronify File Picker

**Problem:** When user clicks "New Project" or the + Project button, a raw Windows folder picker opens. Other CRON apps (Browser, Claims) have a CRON-styled dark navy picker.

**What to do:**
1. Look at how Browser (`CRON HUB - BROWSER - FILES - RESTORED BACKUP/client/src/components/OryxShell.jsx` or similar) or Claims handles its file picker — it uses a custom styled modal.
2. In Code's `Layout.tsx`, replace the native `dialog.showOpenDialog` call (which happens in `main.mjs` IPC) with a CRON-styled folder browser modal.
3. The modal should:
   - Have CRON dark navy background (`#07142a` or matching the app's `--cron-panel-border` style)
   - Show the current directory listing with folder icons
   - Have breadcrumb navigation
   - Have an "Up" button to go to parent
   - Have a "Select this folder" button
   - Have a "Cancel" button
   - Match the CRON design language (font, colors, borders)
4. If creating a full custom folder browser is too large a scope, **at minimum**: style the existing dialog backdrop and make it feel native to the app. Check if Electron's `dialog.showOpenDialog` supports any custom properties.

**Files to touch:**
- `apps/standalone/electron/main.mjs` — the `cron:select-folder` IPC handler
- `packages/core/src/components/Layout.tsx` — the picker trigger
- Possibly a new `FolderPicker.tsx` component if building custom

---

## Fix #4: Cronify Tray Context Menu

**Problem:** Right-clicking the system tray icon shows a plain Windows default context menu. Needs CRON dark navy styling to match the rest of the app.

**What to do:**
1. Check `main.mjs` `createTray()` — it uses Electron's `Menu.buildFromTemplate` + `tray.setContextMenu`.
2. Electron's native tray menu on Windows does NOT support custom CSS/styling — it uses the OS menu.
3. **Options:**
   - **Option A (Recommended):** Accept the native menu but ensure the items are correct and working. The items already work (Show, Pause, Stop, Quit). Verify the tray icon itself has the CRON branding (it should use `code_icon.ico`).
   - **Option B:** Build a custom tray window — a frameless BrowserWindow that appears on right-click, positioned at the cursor, styled with CRON dark navy. This is significantly more work but gives full control.
4. **Minimum viable:** If Option B is out of scope, just verify the native menu items are correct and functional. The items should be:
   - Open CRON for Code
   - ────── (separator)
   - Show active tasks
   - Pause current task
   - Stop current task
   - ────── (separator)
   - Quit CRON for Code
5. Add a test that the tray menu template contains the expected items.

**Files to touch:**
- `apps/standalone/electron/main.mjs` — `createTray()` function
- Tests: add tray menu item assertion

---

## Fix #5: Fix Sidebar Text Clipping

**Problem:** Sidebar project names get clipped with `text-overflow: ellipsis`. The lower stack sections (Current Project, Agent State) also get squished when content grows.

**What to do:**
1. The sidebar is 210px wide. Project names with `textOverflow: 'ellipsis'` is correct behavior for long names — that's not the real bug.
2. **The real issue:** The `lowerStackStyle` in `Sidebar.tsx` has `overflow: 'hidden'` which clips the "CURRENT PROJECT" and "AGENT STATE" blocks. When the projects list is long, it pushes these blocks off screen.
3. Ensure the lower stack is always visible — it should have a `maxHeight` or the projects list should scroll independently so the lower stack never gets pushed below the viewport.
4. The projects list already scrolls (`overflow: 'auto'` on `sidebar-projects`). Verify the flex layout doesn't let the projects list grow past the available space.
5. Test: ensure the sidebar lower stack is always visible in the test (the existing `sidebar-lower-stack` test should pass).

**Files to touch:**
- `packages/core/src/components/Sidebar.tsx` — adjust `railStyle`, `lowerStackStyle`, or the projects container flex rules

---

## Verification (required)

After all 4 fixes:
1. `pnpm -r run test` — all 325+ tests must pass
2. `pnpm run typecheck` — must pass
3. `pnpm run lint` — 0 errors (3 pre-existing warnings OK)
4. `pnpm run build` — must pass
5. Update `PROJECT_LOG.md` and `CRON_ARCHITECT_LOG.md` after every change
6. Report back to this sym_log with files changed, test results, and any blockers

## Do NOT

- Commit, push, merge, or tag anything
- Touch the LM Studio defaults or chat handler (already fixed by MIMO)
- Redesign the shell or overall layout
- Change the Electron preload or IPC bridge architecture
- Add new npm dependencies without explicit approval
