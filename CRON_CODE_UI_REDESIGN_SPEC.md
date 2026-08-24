# CRON for Code — UI Redesign Spec ("Make Me an App")

The North Star for this redesign:

> **Don't build a prettier developer IDE. Build a "make me an app" interface, and let OpenCode be the invisible mechanic underneath.**

CRON for Code is a desktop application for **non-coders who want to create software by describing what they want in plain English**. The engine underneath is OpenCode, but the user should never need to understand code, repositories, terminals, frameworks, or developer tooling.

The mental model:

> "Tell CRON what you want to build. CRON plans it, builds it, shows you what it is doing, and lets you approve the result."

This must NOT feel like VS Code, Cursor, Windsurf, or a traditional IDE. OpenCode is the engine under the hood; CRON for Code is the friendly product layer above it.

---

## 1. Primary design goal

A non-technical user must immediately understand:
- where their projects are
- where to describe what they want
- what CRON is currently doing
- how far through the build it is
- what the app being built looks like
- whether something needs their approval
- how to preview the result
- how to make another change using plain English

The central concept is **CODE BY PROMPT**. Raw code must NOT be the main visual element. Code, terminal output, logs, diffs, branches, commits and technical details live only behind secondary controls (View logs / Advanced / Technical details / Export code). They never dominate the normal experience.

## 2. Overall visual style

Use the existing CRON brand language. Dark premium desktop interface.

Colours:
- Main background: near-black / deep navy `#050A12`
- Primary panels: `#091220`, `#0B1524`
- Secondary cards: `#0E1A2B`
- Primary accent: electric blue `#176BFF`
- Bright blue accent: `#1F82FF`
- Text primary: near-white; secondary: cool grey; disabled: muted blue-grey
- Success: green; warning: amber; failure: restrained red
- Borders: `1px solid rgba(110,150,200,0.16–0.24)`
- Rounded corners: ~10–14px
- Glow: use sparingly — only strong actions: selected navigation, New Project, main Send/Build button, active build progress, CRON status indicator.

Feel: expensive, calm, safe, trustworthy, easy, NOT "hacker-ish".

## 3. Overall desktop layout

Four-area composition:
1. left application navigation
2. project browser
3. main build conversation/workspace
4. right build/status sidebar

Approximate widths: left nav `220px`, projects `290px`, right sidebar `330px`, centre takes the rest and is dominant.

App opens maximized. No horizontal overflow.

## 4. Left navigation

Dark vertical sidebar, full height. Top: CRON oryx logo, `CRON` (white/chrome) + `for Code` (electric blue).

Order: Home, Projects, Create New, Templates, My Apps, Deployments, Learn, Settings.

Simple line icons (Lucide): Home→Home, Projects→Folder, Create New→PlusCircle, Templates→LayoutTemplate, My Apps→Boxes/Package, Deployments→CloudUpload, Learn→GraduationCap, Settings→Settings.

Selected item: electric-blue rounded rectangle, subtle glow, white icon/text. Items ~48px tall (large enough for non-coders).

## 5. User / account area

Near bottom-left. Compact user card: avatar, `Alex Smith`, `Creator Plan`, small dropdown chevron. Below/within: `OpenCode Credits` `1,250 / 2,000` with blue progress bar, small text `Resets in 12 days`. Very bottom: `v1.0.0` + green status dot `All Systems Operational`. Must NOT be clipped by the Windows taskbar.

## 6. Top app bar

Slim top bar above the workspace. Left: `Build mode:` then `OpenCode (local)` with a small green status dot (reassurance without making OpenCode the centre). Right: Help, notifications bell, prominent `Speak to CRON` button (blue, waveform/mic icon, optional, voice-first later). Electron window controls on the far right.

## 7. Project browser column

Immediately right of navigation. Heading `Your Projects`; top-right `+ New Project` (primary). Below: search `Search projects...` + small filter button. Then project cards: project icon, name, type, last-updated time.

Examples: `TaskFlow Dashboard` / `SaaS Project` / `Updated 10 mins ago`; `AI Content Generator` / `Web App` / `2 hours ago`; `Expense Tracker` / `Web App` / `1 day ago`; `Portfolio Website` / `Marketing Site` / `2 days ago`; `Inventory Manager` / `Internal Tool` / `3 days ago`.

Selected card: slightly brighter bg, electric-blue border, small blue glow, optional pin icon. Bottom: `View all projects →`. Keep cards simple — recognisable by name + visual, not by path.

## 8. Main workspace header

`TaskFlow Dashboard` + small pencil edit icon. Below: `SaaS Project • Created May 20, 2024`. Right: `Share`, three-dot overflow menu. No developer terms in this header.

## 9. Main build conversation

Chat-with-CRON + visual progress. User prompt prominent, top-right: `Create a task management dashboard for small teams.` then `Features: task list, due dates, priority labels, progress bar, team members, dark mode.` Blue bg/border/rounded, max width ~60–65%, `You` + timestamp. No code shown.

## 10. CRON response

Below, left-aligned, CRON oryx avatar, `CRON for Code` + timestamp. `Got it! I'll build a modern task management dashboard with those features.` then `Here's my plan:` — the plan gives confidence without exposing implementation complexity.

## 11. Build plan

Vertical checklist/timeline: green ✓ for complete, blue ● for current, muted ○ for pending.

✓ Understand requirements — Completed
✓ Design database schema — Completed
✓ Build backend API — Completed
● Build frontend dashboard — In progress
○ Test & refine — Pending
○ Deploy — Pending

No more jargon than necessary — hide dependency installs, migrations, etc. under friendly phase names.

## 12. Live app preview

To the right of (or inside) the build plan, show a preview of the app being built. Example: TaskFlow dashboard — internal sidebar (Dashboard, Tasks, Calendar, Team, Settings), cards (Total Tasks 128, In Progress 42, Completed 86, Overdue 6), a simple chart, recent-tasks list. It must feel like a real running app — NOT source code. The user should feel "CRON is actually building my app."

## 13. Build activity status

Below plan/preview: small green activity dot + `OpenCode is writing code...`. That's enough — do NOT stream raw terminal text into the primary workspace. Right side: `View full logs` button (secondary).

## 14. Main prompt composer

Bottom of centre panel — the main control. Large rounded input, placeholder **`Describe what you want to build...`** (never "Enter coding instructions" / "development prompt"). Bottom-left controls: paperclip `Attach`, `Templates`, `Code Blocks` (rename to `Examples` if friendlier). Bottom-right: mic button + bright blue send/build button (paper-plane). Below: `Tip: Be as detailed as you can. You can also use voice.` Right: `Learn how to prompt →`. Feel: ChatGPT for building apps.

## 15. Right sidebar — build progress

Panel `Build Progress`, top-right `View roadmap`. Large circular indicator `75%` `Complete`; beside it `Current Step` `Build frontend dashboard`; then `Time Elapsed` `12m 45s`, `Est. Completion` `~5 min`, horizontal bar below. Answers "How far along is my app?"

## 16. Right sidebar — OpenCode engine

Panel `OpenCode Engine`, green pill `Active`. Fields: `Engine` `OpenCode (local)`, `Model` e.g. `Qwen3-Coder-30B-A3B`, `Context Window` `124K / 128K` + blue bar, `Speed` `Fast` + green dot. Can be technical (secondary) but concise; no terminal output.

## 17. Right sidebar — tools & integrations

Panel `Tools & Integrations`, small icon cards: Database/PostgreSQL, Authentication/Supabase, Storage/S3 Compatible, Payments/Stripe, Emails/Resend, Analytics/PostHog. Each: icon + name + provider. State honestly: Connected / Available / Not configured. Bottom: `Manage Integrations`.

## 18. Right sidebar — quick actions

Panel `Quick Actions`, four large icon buttons: Preview App (Eye), Deploy App (Rocket), Share (Share2), Export Code (Code2). Preview App first, Export Code last (reinforces: no code needed).

## 19. Bottom global status bar

Subtle, slim, across bottom: green cloud `Auto-save on`, backup icon `Backup created 2m ago`, green check `Project saved`; far right `Need help?` `Join our community`.

## 20. Key UX principle — plain English first

Translate every developer concept. BAD→GOOD:
- `Run npm build` → `Build app`
- `Resolve dependency conflict` → `Fixing setup issue`
- `git commit failed` → `Saving project changes`
- `Run migration` → `Updating your project data`
- `Build pipeline` → `Build progress`

Raw detail goes behind View logs / Technical details / Advanced — never automatic.

## 21. Approval system

Friendly approval cards for significant actions. e.g. `CRON wants to install 2 project packages.` → `Approve` / `Not now` (+ optional `Show details`). e.g. `Your app is ready to publish.` → `Preview first` / `Publish`. Never silently perform destructive actions.

## 22. Errors

Never show a terminal traceback. Translate. `ModuleNotFoundError: xyz` → `CRON hit a setup issue while building this feature.` + `I can fix this automatically.` → `Fix it` / `Show technical details`. `npm exited with code 1` → `The app build did not complete successfully.` then explain next action simply.

## 23. Optional advanced mode

Hidden by default drawer: raw logs, repository files, generated code, diffs, terminal, model details, OpenCode session info. Normal users never need it.

## 24. Design priority (hierarchy)

1. What am I building? 2. What did I ask CRON to do? 3. What is CRON doing now? 4. What does my app look like? 5. How much is left? 6. Do I need to approve anything? 7. How do I ask for another change?

NOT: repository, terminal, source tree, source code, package details.

## 25. Example user journey

New Project → CRON asks `What would you like to build?` → user: `I need a simple invoicing app for my cleaning business.` → CRON: `Absolutely. I'll create a simple invoicing app with customers, invoices, payments and PDF downloads.` → plan → `Start Building` → OpenCode works underneath → progress + preview updates → approve only when required → `Your app is ready.` → `Open App` / `Make a Change` / `Publish`. User: `Make the invoice screen simpler and add my logo.` → CRON makes the change.

## 26. Responsive / window behaviour

Desktop-first Electron. Large: four columns. Below ~1400px: reduce project + right-sidebar widths. Below ~1200px: right sidebar collapses into a drawer. Centre conversation never gets narrower than practical. Account area stays above the taskbar. Opens maximized.

## 27. What NOT to do

Do NOT: recreate VS Code; show a file explorer as the primary sidebar; permanently show a terminal or code; make the user pick frameworks before building; expose git unless advanced mode; ask non-coders about package managers; use developer jargon in primary controls; turn every panel into glowing neon; overload with metrics; use fake developer-looking text for decoration; replace working OpenCode integration; modify backend/build logic purely to make a screenshot match.

This is a visual/UX shell first.

## 28. Implementation rules (before editing)

1. confirm repository identity; 2. inspect the existing shell; 3. identify existing OpenCode wiring; 4. identify working project state; 5. locate routing + persistence; 6. locate the chat/prompt flow; 7. identify approval handling; 8. identify the preview mechanism.

Do NOT break the working OpenCode integration. Do NOT remove backend wiring. Do NOT rewrite architecture for UI. Wrap visual components around existing working functionality.

## 29. Implementation order

1. 4-column shell; 2. left nav; 3. projects browser; 4. project header; 5. chat/build conversation; 6. friendly build plan; 7. live preview container; 8. prompt composer; 9. build-progress sidebar; 10. OpenCode engine status; 11. tools/integrations card; 12. quick actions; 13. approval cards; 14. error states; 15. responsive behaviour; 16. taskbar-safe vertical layout; 17. tests/build verification.

## 30. Acceptance criteria

Complete only when: opens maximized; user immediately sees where to describe what they want; does not look like an IDE; selected project obvious; build conversation central; build plan visible; live preview visible; progress % + current step visible; OpenCode status visible but secondary; logs hidden behind a button; important actions in plain English; Preview App more prominent than Export Code; approval UI exists for significant actions; user can ask for another change in natural language; no taskbar clipping; no horizontal overflow; existing OpenCode wiring intact; no unrelated files modified; tests/typecheck/build pass.

Final report must list: exact files changed, purpose of each, what was preserved, what was intentionally not changed, verification commands, test/build results, remaining gaps.

---

## 31. Design revisions (locked 23 Aug, supersedes §3 fixed columns)

Venessa's direction after seeing slice 1 live:

1. **Side panels collapse into edge tabs (book-divider style).** Instead of three always-visible columns, both edges become slim tab strips. Clicking a tab slides its panel into a shared slot; the centre takes the freed space. This strengthens §3's "centre must be dominant."
   - **Left edge tabs:** ☰ Menu (navigation + account area at bottom) and Projects ("Your Projects" list). One open at a time; swap/close on click. The top-bar hamburger is removed (the ☰ Menu tab replaces it).
   - **Right edge tabs:** Build Progress, Engine, Tools, Quick Actions — each with a **pin icon** so the user can keep a panel open if they choose (unpinned = auto-collapses to a tab).
2. **Whole app ~15% less bulky.** Reduce base font sizes + spacing (design tokens) and panel widths ~15%. Done via tokens, NOT `transform: scale()` / `zoom` (blurs). "15%" is a guide — tune by eye.
3. **Stale branding fixed:** EmptyState "Plan with Gemma" / "Planner: Gemma" → "Plan with CRON" / "Planner: CRON" (the old planner model name was dropped).

Slice 1 revision (edge tabs + pin + 15%) → `CC_CODE_UI_REDESIGN_SLICE1_REVISION_PROMPT.md`.

4. **Left edge = labeled book-tabs** (locked 23 Aug): **Menu, Projects, Create New** (in that order; NO "Files"). Menu → nav panel (secondary items + account); Projects → project browser; Create New → action (new-project picker, not a panel).
5. **Animated logo** (locked 23 Aug): the menu-header logo becomes the `cron_logo_loop.mp4` loop (compressed 19.3 MB → 505 KB as `apps/standalone/branding/assets/cron_logo_loop_small.mp4`), played muted/looping inside a **1:1 chrome/silver metallic frame** (~44px square), with the "CRON for Code" wordmark beside it. Wired via a CSS variable set in `main.tsx` (mirrors the existing `--cron-logo-url` flow). The EmptyState big logo is unchanged.
