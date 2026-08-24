# BB — CRON for Code UI Redesign — Slice 1 Revision: edge tabs + pin + 15% smaller

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md` — the product vision (esp. §26 responsive, §27 what-not-to-do).
2. `CRON_CODE_UI_REDESIGN_AUDIT.md` — current-state map + what must not break.

**CONTEXT — Slice 1 is already built and merged into the working tree (do NOT redo it):**
You (or a previous BB run) already added `LeftNav.tsx`, `ProjectBrowser.tsx`, `AccountArea.tsx`, `RightSidebar.tsx`, and reshaped `Layout.tsx` into a 4-column grid (left nav 220 | project browser 290 | centre | right placeholder 330), plus a slim top app bar. This revision **reshapes** that work — extend/reuse those components, don't rebuild from scratch.

**OBJECTIVE — revise the shell as follows**

1. **Left edge → tab dividers (book-tab style).** Replace the always-visible 220px `LeftNav` + 290px `ProjectBrowser` with a slim vertical **tab strip** on the far left (icon tabs sticking out, ~48–56px wide). Two tabs:
   - **☰ Menu** → opens the navigation (Home, Projects, Create New, Templates, My Apps, Deployments, Learn, Settings) in a shared panel slot, with the **account area (avatar/name/plan/credits/v1.0.0/status) pinned to the bottom** of that panel.
   - **Projects** → opens the `ProjectBrowser` ("Your Projects", search, `+ New Project`, project cards) in the same shared slot.
   - Behaviour: click a tab to open its panel (slides in from the left, ~290px); click the same tab again (or another tab) to swap/close. Only one left panel open at a time; centre takes the freed space when both are closed.
   - Remove the **top-bar hamburger** (the ☰ Menu tab replaces it). Leave the old `ProjectDrawer` component alone (do not delete).

2. **Right edge → tab dividers with PIN.** Replace the fixed 330px `RightSidebar` placeholder with a slim vertical **tab strip** on the far right. Tabs (icons): **Build Progress, Engine, Tools, Quick Actions**. Clicking a tab opens its panel (slides in from the right, ~330px). Each panel's header has a **pin toggle icon**: pinned = the panel stays open; unpinned = it auto-collapses back to a tab when another tab is clicked. Content is still placeholder (real content is slice 3) — keep the honest "coming next" copy, no fake data.

3. **Whole app ~15% less bulky.** Shrink the base scale: reduce the `--cron-font-size-*` and `--cron-space-*` tokens in `shared/design-tokens/index.css` by roughly 15%, and shrink the few hardcoded px sizes in the shell (e.g. nav item ~48→~41, top bar ~46→~40, panel widths ~220/290/330 → ~190/245/280, the EmptyState heading/icon sizes) proportionally. Do this via tokens + sizes — **do NOT use `transform: scale()` or a CSS `zoom` hack** (blurs/misrenders). Keep hit targets still comfortably clickable.

**IN-SCOPE**
`Layout.tsx`, `LeftNav.tsx` (or its replacement tab-strip component), `ProjectBrowser.tsx`, `AccountArea.tsx`, `RightSidebar.tsx`, `shared/design-tokens/index.css`, `index.ts` exports, and any layout test updates (`workspace-layout.test.tsx`). New components for the two tab strips as needed.

**OUT-OF-SCOPE (do NOT touch)**
- OpenCode wiring (`opencode-client.ts`, `opencode-runner.ts`, `cron:opencode:*` IPC, store `createDraftTask`/`approveApproval`/`rejectApproval`).
- `CronAssistant.tsx` internals and the centre chat.
- The `EmptyState`/`entry-screen` "Gemma → CRON" text change Gem just made (keep it as-is; do not revert or re-broader).
- Real right-panel content (Build Progress / Engine / Tools / Quick Actions logic) — slice 3. Placeholder only.
- Deleting dead components (`Sidebar`, `TaskWorkspace`, `ProjectDrawer`, etc.).

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (copy to `*.bak-<date>`, already gitignored). If you touch something out of scope, revert it and say so.

**ACCEPTANCE**
- Left edge shows a slim tab strip (Menu + Projects); clicking each opens its panel in one shared slot; centre grows when closed. No top-bar hamburger.
- Right edge shows a slim tab strip (4 tabs); clicking opens the panel; the pin toggle keeps it open when set.
- Account area lives at the bottom of the Menu panel, not clipped by the taskbar.
- Centre chat + EmptyState still work (open a project, send a message — regression check).
- Whole app visibly smaller/less bulky, still readable and clickable.
- No horizontal overflow; no "LM Studio"/"Gemma" wording; labels use the spec's plain-English copy.

**VERIFY (run all, report real results)**
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**FINAL REPORT (copy this back)**
1. Exact files changed (added/edited) + purpose of each.
2. What existing functionality you preserved.
3. What you intentionally did NOT change.
4. Test/typecheck/lint/build results (counts).
5. Any gaps, mismatches, or questions — max 10 lines.

Do not commit. Stop and report back when done.
