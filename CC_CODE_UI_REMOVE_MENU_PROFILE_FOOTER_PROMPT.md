# BB — CRON for Code UI — remove Menu, fixed profile footer

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md`
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
The shell is built and green: persistent logo header, icon rail (Menu/Home/Projects/Create New/Templates/My Apps/Deployments/Learn/Settings), centre views, right side, Home screen, 4 new screens. This task makes two structural changes Venessa requested.

**OBJECTIVE**

1. **Remove the Menu tab + the labeled nav panel.**
   - In `LeftTabStrip.tsx`, remove the `menu` tab from the rail (and its `LeftTabId` value if safe).
   - In `Layout.tsx`, remove the `LeftNav` panel rendering (the `leftTab === 'menu'` branch) and any Menu wiring.
   - `LeftNav.tsx` becomes unused — leave the file in place (do NOT delete it). All sections are now tabs, so the labeled nav list is redundant.

2. **Move the profile/account area to a fixed footer at the bottom of the left rail.**
   - Create a compact, always-visible profile footer at the **bottom of the left rail** (below the icon tabs), with a **divider line above it** to separate it from the icons.
   - Compact form: a clickable avatar (~36–40px). Clicking it opens a small popover showing the full account card content (avatar, "Alex Smith", "Creator Plan" placeholder, "OpenCode Credits" bar, version `v1.0.0`, "All Systems Operational"). Keep the placeholder identity values (no real auth yet).
   - Move this content out of `LeftNav`/`AccountArea` as needed (reuse `AccountArea`'s pieces if practical). The footer is always visible; the left panel (Projects) opens in the space **above** it — from the logo header down to the profile divider (i.e. the profile footer is never covered).

**IN-SCOPE**
`LeftTabStrip.tsx`, `Layout.tsx`, `AccountArea.tsx` (or a new `ProfileFooter` component), `index.ts` exports, and affected tests (`workspace-layout.test.tsx` etc.).

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx` + centre chat, the plan/build pipeline, the "lock the canvas" layout change (separate follow-up), the 4 new screens' content, `main.tsx`, the MP4, dead components.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, gitignored).

**ACCEPTANCE**
- No Menu tab; the rail is Home/Projects/Create New/Templates/My Apps/Deployments/Learn/Settings.
- Profile avatar is fixed at the bottom-left, always visible, with a divider line above it; clicking shows the full profile (name/plan/credits/version/status).
- The Projects panel opens above the profile footer and does not cover it.
- Centre views, right side, Home, and the 4 screens all still work (regression). No "LM Studio"/"Gemma" wording.

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
