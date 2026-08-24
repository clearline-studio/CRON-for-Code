# BB — CRON for Code UI — follow-up: animated logo + left tabs relabel

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md`
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
Slice 1 + the edge-tab revision are already built and working in the working tree. This is a small follow-up with two changes. The compressed logo video already exists at `apps/standalone/branding/assets/cron_logo_loop_small.mp4` (505 KB, H.264, no audio, 512px) — do NOT re-compress or move it.

**OBJECTIVE**

1. **Animated logo in the menu header.** In `packages/core/src/components/LeftNav.tsx`, the logo row currently renders a 26px static `<img>` (from `--cron-logo-url`) next to the "CRON for Code" wordmark. Replace that 26px image with a **`<video>`** playing `cron_logo_loop_small.mp4`, inside a **square (1:1) chrome/silver frame**:
   - Video: `autoPlay`, `loop`, `muted`, `playsInline`, `object-fit: contain`, no controls.
   - Frame: a ~44px square with a **chrome/silver metallic border** — a polished-silver gradient ring (light silver → mid silver → light silver) with subtle rounded corners and a faint metallic sheen/shadow. The video sits slightly inset inside it.
   - Keep the "CRON for Code" wordmark exactly where it is, to the right of the framed logo.
   - Wiring: follow the existing pattern — `apps/standalone/src/main.tsx` imports the `.mp4` and sets a CSS variable (e.g. `--cron-logo-video-url`) on the root, and `LeftNav` reads it via `getComputedStyle` (mirror how `--cron-logo-url` flows today, lines 50–51 of main.tsx and line 58 of LeftNav.tsx). Do NOT change the EmptyState big logo or the `--cron-logo-url` variable.

2. **Left edge tabs relabel.** In `packages/core/src/components/LeftTabStrip.tsx` (and `Layout.tsx` wiring), change the left edge from two icon-only tabs (☰ Menu + folder Projects) to **three labeled book-tabs**, in this order: **Menu, Projects, Create New**.
   - Each tab shows an icon + a short text label, book-tab style (small labeled tab protruding from the edge; active tab highlighted with the electric-blue treatment + subtle glow).
   - **Menu** → opens the navigation panel (existing `LeftNav`: Home, Projects, Create New, Templates, My Apps, Deployments, Learn, Settings + account area at bottom).
   - **Projects** → opens the existing `ProjectBrowser` panel.
   - **Create New** → is an ACTION, not a panel: clicking it triggers the existing New-Project flow (`onSelectProject` / folder picker). It does not open a panel.
   - Only one panel open at a time (Menu/Projects share the slot); Create New is always an action.
   - Do NOT add a "Files" tab.

**IN-SCOPE**
`apps/standalone/src/main.tsx` (video import + CSS var), `packages/core/src/components/LeftNav.tsx`, `LeftTabStrip.tsx`, `Layout.tsx` (tab wiring), `index.ts` exports if needed, and any affected tests (`workspace-layout.test.tsx`, `entry-screen.test.tsx` if they assert the old tabs/logo).

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx`, the centre chat, the EmptyState big logo, the right sidebar, dead components, the compressed MP4 file itself.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, already gitignored).

**ACCEPTANCE**
- Menu header shows the animated logo loop inside a square chrome/silver frame, with "CRON for Code" text beside it.
- Left edge shows three labeled tabs (Menu, Projects, Create New); Menu and Projects open their panels in the shared slot; Create New opens the new-project picker.
- No "Files" tab. No "LM Studio"/"Gemma" wording.
- Centre chat + everything else still works (regression).

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
