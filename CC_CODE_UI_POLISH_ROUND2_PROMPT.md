# BB — CRON for Code UI — polish round 2 (persistent logo, icon tabs, drawer right side, Review tab)

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md`
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
Slice 1 + edge-tab revision + logo/tabs follow-up are all built and green. The logo video already lives at `apps/standalone/branding/assets/cron_logo_loop_small.mp4` and is wired via `--cron-logo-video-url` (set in `main.tsx`, read in `LeftNav.tsx`). This round is polish + structural cleanup. Do NOT re-compress or move the video.

**OBJECTIVE — seven changes**

1. **Thin the logo frame.** In `LeftNav.tsx`, the chrome/silver frame around the video is too thick. Slim it to a refined, subtle metallic border (thin ring, ~1–2px visual weight, lighter sheen). Keep the video size (44px) unchanged.

2. **Persistent logo + heading.** Move the framed logo + "CRON for Code" wordmark OUT of the Menu panel so they sit in a **persistent header at the top-left of the app, always visible regardless of which tab/panel is open**. Restructure `Layout.tsx` as needed (e.g. wrap the left tab rail + panel slot in a left region with a header above it). The account area stays inside the Menu panel (bottom).

3. **Tabs → icon-only, label on hover.** `LeftTabStrip.tsx`: each tab shows only its icon; the section name reveals on hover (a small tooltip/flyout label). No permanent text labels on the tabs.

4. **Add the rest of the tabs.** Extend the left rail to the full set, top to bottom:
   - `menu` (☰ Menu icon) → opens the nav panel (existing `LeftNav`, unchanged content)
   - `home` (House) → inert (no panel yet)
   - `projects` (Folder) → `ProjectBrowser` panel
   - `create-new` (CirclePlus) → ACTION: new-project picker (no panel)
   - `templates` (LayoutTemplate) → inert
   - `my-apps` (Boxes) → inert
   - `deployments` (CloudUpload) → inert
   - `learn` (GraduationCap) → inert
   - `settings` (Settings) → ACTION: opens `ModelSettings`
   Inert tabs: clicking does nothing visible; give them a "coming soon" tooltip. Update `Layout.tsx` tab wiring + `LeftTabId` type accordingly.

5. **Centre welcome card balance.** In `EmptyState.tsx`, the welcome card sits left-of-centre (the left panel skews it). Rebalance so the card reads as centred in the available centre space. (CSS-only; keep the right art panel behaviour.)

6. **Right panels: pin → drawer close.** In `RightSidebar.tsx`, remove the pin toggle entirely. Each open panel's header gets a **close/drawer icon** (panel-close / chevron style, matching the icon family used for the old top-bar review toggle) that collapses the panel back to its tab. No pinning: opening a different tab closes the previous panel.

7. **Fold Review into the right side; remove the top-bar toggle.** 
   - Remove the review-pane toggle button from the top bar in `Layout.tsx`.
   - Remove the centre's inline review pane + resizer.
   - Add a **"Review" tab** to `RightSidebar` (icon: ClipboardList or similar). Its panel shows the existing `ReviewPane` content (Changed Files / Approvals / Evidence — the `ChangedFilesReview`, `ActivityPanel`, `deriveChangedFiles` pieces). When no project is active, the Review panel shows a plain "Open a project to review changes" empty state (no fake data).

**IN-SCOPE**
`LeftNav.tsx`, `LeftTabStrip.tsx`, `RightSidebar.tsx`, `Layout.tsx`, `EmptyState.tsx`, `index.ts` (types/exports), `AccountArea.tsx` if needed, and affected tests (`workspace-layout.test.tsx`, `entry-screen.test.tsx`, `right-sidebar`/layout tests).

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx`, the centre chat logic, `main.tsx` (unless you must adjust the CSS-var name — it already works), the MP4 file, dead components (`Sidebar`, `TaskWorkspace`, `ProjectDrawer`, etc.).

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, gitignored).

**ACCEPTANCE**
- Framed logo (thin frame) + "CRON for Code" heading visible at top-left on EVERY tab.
- Left rail shows 9 icon-only tabs with hover labels; Projects opens the browser; Create New + Settings are actions; inert tabs show "coming soon".
- Right side: no pin; panels close via a drawer icon; Review is a right-side tab showing Changed Files / Approvals / Evidence (or the empty state when no project).
- Top bar has no review toggle; centre has no inline review pane.
- Centre welcome card reads centred.
- No horizontal overflow; no "LM Studio"/"Gemma" wording; centre chat still works (regression).

**VERIFY (run all, report real results)**
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**FINAL REPORT (copy this back)**
1. Exact files changed + purpose.
2. What you preserved.
3. What you did NOT change.
4. Test/typecheck/lint/build results.
5. Gaps/questions — max 10 lines.

Do not commit. Stop and report back when done.
