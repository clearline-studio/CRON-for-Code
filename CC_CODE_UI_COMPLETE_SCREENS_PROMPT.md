# BB — CRON for Code UI — complete remaining screens + buttons

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md`
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
The shell, Home screen, logo, and edge tabs are built and green. Remaining gaps: four tabs are inert (Templates, My Apps, Deployments, Learn), a few top-bar/project buttons are "coming soon", and there are small polish items. This task completes them. ALL screens must be honest — no fake data, no fake "template engine", no fake deployments.

**OBJECTIVE — build the missing pieces**

**A. Four new screens (each a new component in `packages/core/src/components/`, exported from `index.ts`):**

1. **`TemplatesScreen`** — a "Start from a template" library of **6** starter templates in a 3×2 grid (icon + name + one-line description + a "Use template" affordance). Templates:
   - Task dashboard (ClipboardList) — "Track tasks, due dates and progress for your team."
   - Invoicing app (Receipt) — "Send invoices and track payments for your business."
   - Portfolio site (Globe) — "Show off your work with a personal site."
   - Internal tool (Wrench) — "A tool for your team's daily workflow."
   - Expense tracker (Wallet) — "Log spending and see where your money goes."
   - Customer list (Users) — "Keep track of customers and conversations."
   Clicking any card triggers the New-Project picker (same as Home). These are starter ideas — do NOT imply a working template engine.

2. **`MyAppsScreen`** — "Your apps": list the user's real projects, each with a build-status pill derived from real data: "Built" if it has ≥1 execution record, else "Draft"; and "Last built X ago" from the latest execution when it exists. Click → open project. Friendly empty state if none.

3. **`DeploymentsScreen`** — honest empty state: "Nothing deployed yet" + one plain-English sentence ("When you're ready to publish an app, it'll show up here.") + a "Publish an app" button that is visually present but disabled/"coming soon". No fake deployments.

4. **`LearnScreen`** — static, genuine content: a short "How it works" section (Tell CRON what you want → it plans → builds → shows you → you approve), a "Prompt tips" section (be specific, list the features, describe who it's for), and 2–3 plain-English example prompts. No fake data — it's real help copy.

**B. Tab wiring — no more inert tabs.** In `Layout.tsx` + `LeftTabStrip.tsx` + `LeftNav.tsx`, make every tab do something real:
- `home` → HomeScreen (centre)
- `projects` → ProjectBrowser panel
- `templates` → TemplatesScreen (centre)
- `my-apps` → MyAppsScreen (centre)
- `deployments` → DeploymentsScreen (centre)
- `learn` → LearnScreen (centre)
- `create-new` → New-Project picker (action)
- `settings` → ModelSettings (action)
- `menu` → nav panel
Centre views (home/templates/my-apps/deployments/learn) share the centre area the way Home does today; selecting one switches the centre content. Remove the "inert"/"coming soon" tooltip treatment for the now-wired tabs.

**C. Buttons:**
- **Help** (top bar) → opens the Learn screen.
- **"View all projects →"** (ProjectBrowser footer) → switches to the Projects view (no longer "coming soon").
- **Filter** (ProjectBrowser, next to search) → toggles a simple sort: "Recently updated" / "Name (A–Z)". Wire it to actually re-order the project list.
- **Bell** (top bar) → show a count badge of pending approvals (real: approvals with status `requested`); clicking opens the Review panel on the right. No fake notifications.
- **Speak to CRON** → keep present but clearly "coming soon" (subtle disabled/tooltip treatment; voice is a later feature).

**D. Polish fixes (from review):**
- Recent-project cards on `HomeScreen` and `ProjectBrowser` repeat the project name as both title and subtitle — remove the duplicated subtitle line (keep name + updated time).
- Unify date formatting: use relative time everywhere ("2 hours ago", "19 days ago") instead of mixing in absolute dates like "8/4/2026".
- Button consistency: give the primary actions ("+ New Project", "+ New Session", "Speak to CRON", the Home "Build" button) one coherent primary-button style; don't mix ghost/outline/filled for the same action archetype.
- Update `HomeScreen` templates to use the same 6-template list as `TemplatesScreen` (share one source, don't duplicate).

**IN-SCOPE**
New screens + `Layout.tsx`/`LeftTabStrip.tsx`/`LeftNav.tsx`/`HomeScreen.tsx`/`ProjectBrowser.tsx` wiring, `index.ts` exports, store reads for `executions`/`approvals`, and affected tests.

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx` + centre chat, the plan/build pipeline, the "lock the canvas" layout change (separate follow-up), `main.tsx`, the MP4, dead components.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, gitignored).

**ACCEPTANCE**
- All 9 tabs do something real; no "coming soon" tooltips on tabs.
- Templates (6), My Apps (with real build status), Deployments (honest empty), Learn (real content) all render.
- Help→Learn, view-all→Projects, filter sorts, bell shows approval count + opens Review, Speak to CRON reads "coming soon".
- No duplicated project-name subtitle; dates are relative; primary buttons consistent.
- No fake data anywhere. No "LM Studio"/"Gemma" wording. Centre chat + OpenCode still work (regression).

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
