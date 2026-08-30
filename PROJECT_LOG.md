
---

## 2026-08-30 - Intelligence-parity header + sidebar + canvas lock + splash fix

Venessa's live-feedback loop on the running app (she's driving the look, I drive the code):

- **Header (top bar)** — framed logo replaced by the 505KB... no: top-bar logo now the
  NEW flash-style loop (`code_logo_loop.mp4`, 6.3MB — same size class Intelligence runs;
  the old "small loop locked" workaround was from an earlier stall that no longer applies).
  Frameless 40px (Intelligence numbers), wordmark 15px/800 (was 19px — "too big"), subtitle
  **CODING WORKSPACE** visible at 10px (was `display: none`; "GOVERNED" dropped per Venessa
  — too long), logo↔wordmark gap tightened to 4px.
- **Sidebar** — one 256px Intelligence-parity column replacing the old 172px rail +
  separate Projects panel: New Project button (top), WORKSPACE section rows (Home/Templates/
  My Apps/Deployments/Learn, 13.5px, blue border rows; active = inset #2ea8ff left edge +
  glow), glowing divider, PROJECTS section (search, sort recent/name, project rows with
  per-row meta, "View all projects" → My Apps view), code-safety shield pinned at bottom.
  All ProjectBrowser behaviors preserved (component still exported + unit-tested).
- **Canvas lock** — right panel changed from absolute overlay (clipped the canvas) to an
  in-flow column: the canvas reflows narrower; nothing gets covered. Right strip 44→40px,
  panel 280→256px. Left 288→256px.
- **Splash fix** — `#splash-media` (pre-React splash video) never had a `src`; wired
  `code_flash.mp4` in `main.tsx` bootstrap so the flash plays on the splash hold (~3s).
- **Button sweep** — audited 91 buttons: 85 wired. Home "Attach a file" paperclip was the
  only reachable dead button (no file-picker capability) → removed (with dead style).
  CronNavBar/WorkflowStrip dead buttons are documented legacy (never mounted).
- **Security sweep** — .gitignore covers .env*/pem/key/credentials*/token; no secrets
  tracked; repo-stabilisation secret-pattern test green. No creds in this repo.
- Verified: typecheck ✓ (all 8 projects), lint ✓ clean, full test suite ✓ (223 core
  + 94 data-service + others), standalone build ✓, app relaunched + captured (PrintWindow
  shows no video frames — logo/splash video verified by Venessa's eyes).
- Committed as `70ae861`.

---


- Logo bumped to 72px (was 60) in LeftNav.tsx.
- Hero heading "What do you want to build?" smaller + thinner (22px, weight 200).
- Section headings ("RECENT PROJECTS"/"START FROM A TEMPLATE") bolder-but-thin,
  brighter (12.5px, letter-spacing 1.4, color #c3d4ef).
- Left sidebar tab text brightened to near-white (#e8f0fb); icon color brightened.
- Verified: typecheck ✓ (all 7 pkgs), lint ✓ (0 errors, 3 pre-existing), test ✓
  (223 core), build ✓. Window captured via PrintWindow to confirm the look.
- Note: invoking electron through the shell attach was flaky; the reliable way to
  (re)launch the dev app is the proper launcher
  (`scripts\run-code-dev-hidden.ps1 -Mode dev`). Recorded for future sessions.

---

## 2026-08-29 - UI feedback pass (Venessa's 11-point list)

Home/canvas polish based on Venessa's numbered notes:
- #2 Hero heading thinner (fontWeight 300, 30px, white) with subtext beneath.
- #3 Top-bar logo enlarged ~25% (48px -> 60px).
- #4 Active left sidebar tab now has a blue left-edge accent line
  (inset box-shadow), on top of the existing blue tint.
- #5 Tab icons get a blue halo glow (drop-shadow) + brighter text on hover/active.
- #6 Code-safety shield spacing bumped so it isn't clipped by the footer/taskbar.
- #7 Home canvas scrollbar hidden (scrollbarWidth: none) + tight.
- #8 Home canvas background switched to a soft radial blue glow to lighten it.
- #9 Template cards + project cards + the prompt intake box are now frosted glass
  (backdrop-blur) with a blue halo glow.
- #10 Prompt intake box gained an Attach (paperclip) button on the left.
- #11 Cards have real click affordances (hover lift + glow via a scoped <style>),
  and their click handlers are verified by tests (template -> New-Project flow,
  project card -> opens workspace).
- Verified: typecheck ✓, lint ✓ (0 errors, 3 pre-existing), test ✓ (223 core),
  build ✓. I caught + fixed a syntax slip (`]` vs `}`) during this pass.
- Scoped CSS used (injected <style>) because core uses inline styles only.

---

## 2026-08-29 - Intelligence look alignment (batch 2)

- Matched the top bar + account section to CRON for Intelligence (peeked at
  Intelligence's Header.jsx/App.jsx/shell.css only — did NOT touch her repo).
- Top bar: now 74px, dark #040b18, border #143152 (was 44px lighter).
- Logo: frameless + bigger 48px animated loop (removed metallic box frame), top-left.
- Heading: CRON is now BLUE (#45ccff) and "for Code" is WHITE (was reversed).
- Home screen: removed the logo card; oryx shell background via the backdrop.
- Account section: replaced the bottom-left avatar popover with an
  Intelligence-style header account button (avatar + "Venessa" + chevron) that
  opens a centred Account modal (dark blurred backdrop).
- Settings: now an Intelligence-style top-bar dropdown (gear -> menu with
  Settings + Help); removed the Settings tab from the left rail entirely.
- Left rail: 7 labelled tabs (Home/Projects/Create New/Templates/My Apps/
  Deployments/Learn). Settings no longer a rail tab.
- Declutter: removed the disabled "Speak to CRON" button from the top bar
  (voice not decided); made New Session an icon; settings gear icon-only.
- Top bar controls enlarged to 38px (#071427 bg, #1c4268 border) like Intelligence.
- Home content bottom padding increased (72px) so nothing clips at the footer.
- Single "2 instances" cause identified: a stale PACKAGED copy
  (win-unpacked\CRON for Code.exe) from this morning ran ALONGSIDE the dev app
  (different exe = no shared single-instance lock). Closing the stale packaged
  copy leaves only the dev app. The app's own requestSingleInstanceLock works.
- Tests updated in workspace-layout.test.tsx (Settings to top bar, Speak-removed,
  account modal close) — suite green.
- Verified: typecheck ✓, lint ✓ (3 pre-existing warnings), test ✓ (223 core),
  build ✓. Captured via PrintWindow to confirm the new look.
- Pre-edit backup: `backups/pre-ui-polish-20260829/`.

---

## 2026-08-29 - UI uniformity pass (Code -> Intelligence family look)

- Goal: make CRON for Code read as a sibling of CRON for Intelligence (they'll
  slide together), per Venessa's direction + brand assets.
- Branding wired (assets copied to `apps/standalone/branding/assets/`):
  - Flash/splash screen plays `code_flash.mp4` (`--cron-flash-video-url`, set in
    main.tsx + 3s hold in index.html).
  - App logo (top bar) = `code_logo_loop.mp4` (`--cron-logo-video-url`).
  - Home-screen-only animated logo loop = `code_logo_loop.mp4` (HomeScreen hero).
- Layout restructure (intelligence-style chrome):
  - Logo moved into the TOP BAR (was a big block above the left rail).
  - Left rail is now a LABELLED list (Home/Projects/Create New/Templates/My
    Apps/Deployments/Learn/Settings) instead of icon-only; hover flyout retained.
  - Profile avatar moved to top-right (was bottom-left); global footer stays.
  - Background unified to the oryx/shell scene on every screen (was Home-only).
  - Top bar de-cluttered: removed the "Build mode:" text label + standalone Help
    button; Speak-to-CRON is now an icon-only disabled mic button.
- Files changed: `main.tsx`, `index.html`, `Layout.tsx`, `LeftNav.tsx`,
  `LeftTabStrip.tsx`, `HomeScreen.tsx` (+ tests in `workspace-layout.test.tsx`
  updated to the new design). Pre-edit backup: `backups/pre-ui-polish-20260829/`.
- Verified: typecheck ✓, lint ✓ (3 pre-existing warnings), test ✓ (223 core),
  build ✓. App relaunched and captured via PrintWindow to confirm the new look.
- Backup for the #4 packaging fix: `backups/pre-package-fix-20260829/`.

---

## 2026-08-29 - Packaged app verified RUNNING (post #4 fix)
- Launched `win-unpacked\CRON for Code.exe` (the real production build, what the
  installer installs). Verified: window titled "CRON for Code" (NOT blank, NOT
  Electron), 1 main process + renderer children (single instance), standalone —
  not connected to any dev Vite server. The #4 packaging blank-window fix is
  proven end-to-end: the packaged app actually launches and renders.
- Note: the leftover dev Vite (node.exe on :5190) and the separate
  `CRON for Intelligence` window are unrelated to the packaged CRON for Code app.
- Backup for the #4 change: `backups/pre-package-fix-20260829/`.

---

## 2026-08-29 - Packaging blank-window fix (#4) — package now builds first

- Defect: the `package` script (`electron-builder --win`) did NOT build first, so a
  packaged/fresh app shipped a stale `dist-renderer/index.html` pointing at
  gitignored JS/CSS hashes → blank window.
- Fix: `apps/standalone/package.json` `package` script now runs the parent root
  workspace build first, then electron-builder:
  `package` = `pnpm --dir ../.. run build && electron-builder --win`.
- Verified live: ran `pnpm --filter @cron-code/standalone package`. Build ran, then
  electron-builder produced `CRON for Code Setup 1.1.7.exe` + `win-unpacked` to
  Desktop. Inspected `app.asar` — `dist-renderer/index.html` references
  `index-CkrFFtHn.js` / `index-DPulWfBg.css` and both are packed alongside it in
  the archive. Renderer is self-consistent; blank-window root cause eliminated.
- Suite still green after change: typecheck ✓, test ✓ (contracts 24, data-service
  94, host-adapter 23, core 223), build ✓.
- Pre-edit backup: `backups/pre-package-fix-20260829/standalone-package.json`.
- Test artifacts left on Desktop (`win-unpacked/`, `CRON for Code Setup 1.1.7.exe`
  + `.blockmap`) — left in place (no delete without Venessa). NOTE: a stray
  `index.html` also appears at repo root from the asar extraction; untracked.

---

## 2026-08-29 (later) - Findings 1-3 fix pass

- #1 (OpenCode not reachable from the UI) — resolved by verification: the live
  Planner (Layout → CronAssistant) already triggers `openCodeRunner.runTask`
  (handoff card + auto-handoff); the audit's finding predates the committed UI
  slice. No code needed.
- #2 (Approve did not resume) — fixed: `store.approveApproval`/`rejectApproval`
  now reply to the OpenCode session (`replyToApproval`) after resolving the DB
  record when the approval is OpenCode-backed (same guard as trayStopTask).
  Chat + tray paths were already correct; the Review panel surface is now live.
- #3 (model payload asymmetry) — fixed: createSession sends `modelID` (was
  `id`); the mock server side now validates the real contract and asserts the
  request body. New tests: adapter 3/3, store 17/17 (2 new resume tests).
- Verification gate green: typecheck ✓ | lint ✓ (0 errors, 3 pre-existing
  warnings) | test ✓ (362+) | build ✓ (valid dist-renderer bundle).

- Audited the real code (data-service/OpenCode engine, core UI, Electron shell)
  and ran the full verification suite on a freshly built workspace:
  - typecheck ✓ | lint ✓ (0 errors, 3 pre-existing `react-hooks/exhaustive-deps`
    warnings in App.tsx) | test ✓ (362 passed: contracts 24, data-service 94,
    host-adapter 23, core 221) | build ✓.
- Unblocked pnpm verification: fixed a literal placeholder in `pnpm-workspace.yaml`
  (`electron-winstaller: set this to true or false` → `true`).
- Verified defect: committed `dist-renderer/index.html` references missing
  build hashes (`index-Cq3PZoEX.js` / `index-DPulWfBg.css`, gitignored) → a
  packaged production app renders a blank window until built. `pnpm build`
  regenerates it correctly.
- Top findings for the build:
  1. OpenCode coding engine is not reachable from the shipped UI (no component
     calls `openCodeRunner.runTask`; `cron:opencode:run-task` is manual-only).
  2. UI "Approve" does not resume an OpenCode session (approve resolves the DB
     record only; only tray Stop sends an OpenCode reply — a reject).
  3. OpenCode model payload asymmetry (`model.id` vs `model.modelID`) + runner
     pinned to `deepseek-v4-flash` (V4 Pro escalation intentionally blocked).
- Working tree after build: `apps/standalone/dist-renderer/index.html` +
  `pnpm-workspace.yaml` modified. dist/ build outputs are gitignored.

Unknown at this point: none blocking.

## 2026-08-28 - Aligned to the project Gem model

- Charter replaced: `AGENTS.md` is now the project Gem charter (clock check, reference pack, autonomy, launcher duty, git boundaries, Friday status).
- `reference/` pack added (soul, nessa, guardrails, workflow).
- Launcher standardised: `launch-cron-for-code-dev.vbs` -> `launch.vbs` (same runner chain `scripts\run-code-dev-hidden.ps1`); taskbar pin updated; `Launch-CRON-for-Code-Dev.bat` retired to `_dump_`.
- 65 legacy slice docs retired to `_dump_` (old MIMO/CC bridge log, session starters, report+evidence pairs). `CRON_CODE_UI_REDESIGN_SPEC.md` + `AUDIT.md` kept as the design truth. PROJECT_LOG remains the single story.
- Pre-edit snapshot of the uncommitted UI-redesign slice (35 files) saved to `backups/pre-alignment-20260828/` - nothing uncommitted was touched.
- HANDOVER created, gitignore updated (`backups/`, `_dump_`, `unrecon_nessa.md`).
# PROJECT LOG â€” CRON for Code

Append-only execution log. Preserved history + fresh-session resume-audit entry.
