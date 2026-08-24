# BB — CRON for Code UI — Home screen (dashboard)

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md` (esp. §9, §14, §20, §25)
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
The shell is built and green: persistent logo header, 9 icon tabs (Menu/Home/Projects/Create New/Templates/My Apps/Deployments/Learn/Settings), right-side tab panels incl. Review, centre chat. The "Home" tab is currently inert, and when no project is selected the centre shows the old `EmptyState` welcome card. This task builds the real **Home screen** and wires it as the no-project landing + the Home tab.

**OBJECTIVE**

Build a new `HomeScreen` component and use it as the **"no project selected" centre view** (replacing `EmptyState` in that role), and make the **Home tab** active/show it. Three sections, all honest (no fake data):

1. **Hero — "What do you want to build?"** (the CODE BY PROMPT entry point)
   - Friendly heading + one-line subtext, e.g. "Tell CRON what you want to make — it plans, builds, and shows you the result."
   - A large prompt input, placeholder `Describe what you want to build...`, with a blue paper-plane "Build" button.
   - On submit: trigger the existing New-Project flow (the folder picker via the existing `onSelectProject`/`selectProject` path). Do NOT build the plan/build pipeline — that's a later slice. (Keep the typed text local; carrying it into the new project is out of scope.)

2. **Recent projects** (real data)
   - Heading "Recent projects" / "Jump back in".
   - Cards for the user's real projects from the store (name + last-updated, mirroring `ProjectBrowser`'s card style). Click → open that project.
   - Empty state when there are none: a friendly hint pointing to the hero above.

3. **Starter templates** (honest suggestions, not fake projects)
   - Heading "Start from a template".
   - A row of 3–4 starter cards (lucide icon + name + one-line description): "Task dashboard", "Invoicing app", "Portfolio site", "Internal tool".
   - Clicking one triggers the New-Project flow (same as the hero). No template engine exists — do not imply one; these are starter ideas.

**Wiring**
- `HomeScreen` needs: `onNewProject` (open picker) and `onSelectProject(id)` props, and reads `projects` from the workspace store (same pattern as the current `EmptyState`).
- In `Layout.tsx`: when `activeProjectId` is null, render `HomeScreen` (instead of `EmptyState`). Make the "home" tab the default-selected tab and render `HomeScreen` when it's active.
- Leave `EmptyState.tsx` in place (do not delete) — it just stops being the default view. Keep its tests passing or repoint them if needed.

**IN-SCOPE**
New `HomeScreen.tsx`, `Layout.tsx` wiring, `index.ts` export, and test updates (`workspace-layout.test.tsx`, `entry-screen.test.tsx` if they reference the old default).

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx`, centre chat, the plan/build pipeline, templates engine, right sidebar, `main.tsx`, the MP4.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, gitignored).

**ACCEPTANCE**
- Launching with no project shows the Home screen (hero + recent projects + templates).
- Home tab is selected by default and shows Home.
- Hero submit and template clicks both open the New-Project picker.
- Recent projects list real projects and open on click; empty state is friendly.
- No fake/sample project data. No "LM Studio"/"Gemma" wording. Centre chat still works when a project is open (regression).

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
