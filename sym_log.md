# sym_log.md - CRON for Code

Shared bridge log between MIMO (Architect) and CC (builder) for this project.

Rules:
- Latest dated entry wins.
- MIMO writes decisions, prompts, scope, and review notes.
- CC reads the latest MIMO entry before working.
- CC writes back with date/time, files changed, tests run, results, and blockers.
- Venessa decides when CC proceeds, when MIMO reviews, and when anything is committed.
- No commits, pushes, merges, tags, releases, resets, or destructive cleanup unless Venessa explicitly approves.
- Every CC task must also update `PROJECT_LOG.md` and `CRON_ARCHITECT_LOG.md` when those files exist in this project.

---

## 2026-08-16 10:16:12 +10:00 - MIMO

Symbiotic log created. No active Code task. Code is currently done/pushed unless Venessa reopens it.

## 2026-08-17 15:15:00 +10:00 - MIMO

**Session 17 — Code UI Fixes #2–#5**

Venessa live-tested Code and found 6 issues. #1 (chat broken) fixed by MIMO directly (defaults corrected to `192.168.1.42:1234`, model `google/gemma-4-26b-a4b-qat`, model validation + error messaging added). 325/325 tests green.

BB prompt written: `CC_CODE_UI_FIXES_PROMPT.md` — covers:
- Fix #2: Wire restart button into Layout (CronHeader.tsx is dead code)
- Fix #3: Cronify file picker (dark navy styled)
- Fix #4: Cronify tray menu (or verify native items)
- Fix #5: Fix sidebar lower stack clipping

Awaiting BB to begin. Read `CC_CODE_UI_FIXES_PROMPT.md` for full scope. No commits, no pushes.

## 2026-08-17 15:20:00 +10:00 - MIMO

**BB INSTRUCTION:** Read `CC_CODE_UI_FIXES_PROMPT.md` in the CRON for Code repo root and execute all 4 fixes (#2 restart button, #3 cronify file picker, #4 cronify tray menu, #5 fix sidebar clipping). Run full test suite after. Update `PROJECT_LOG.md`, `CRON_ARCHITECT_LOG.md`, and write back to this `sym_log.md` with results. No commits.

## 2026-08-17 16:20:00 +10:00 - CC

**BB write-back: UI Fixes #2-#5 DONE. All verification green. No commits, nothing staged.**

### Files changed
- Deleted: `packages/core/src/components/CronHeader.tsx` (dead code).
- New: `packages/core/src/folder-picker.ts` (host-agnostic picker bridge), `packages/core/src/tray-template.test.ts`, `apps/standalone/electron/tray-template.mjs` + `tray-template.d.mts`.
- Edited: core `Layout.tsx`, `PickerModal.tsx`, `Sidebar.tsx`, `App.tsx`, `index.ts`, `project-management.test.tsx`, `workspace-layout.test.tsx`, `dev-marking.test.tsx`, `repo-stabilisation.test.ts`; electron `main.mjs`, `preload.cjs`, `register-ipc.mjs`; standalone `main.tsx`, `ipc-data-service.ts`.

### What each fix did
- **#2:** Restart button now lives in the Layout top bar (before the settings gear), icon-button styled, `Loader2` spinner + disabled while `isRestarting`, calls store `restartApp()`. Keeps `data-testid="cron-restart-button"` (dev click-probe still works) and `cron-online-status` on the status pill. CronHeader deleted; its 2 tests removed; restart-button render test added.
- **#3:** New Project flow no longer opens the raw OS dialog. `PickerModal` is now a full CRON dark-navy folder browser (breadcrumbs, Up button, folder listing, Select this folder / Cancel). New IPC `cron:fs:list`; `cron:select-folder` validates a passed path (native dialog only as a no-arg fallback). Renderer still never touches the filesystem directly.
- **#4:** Native Windows tray menus cannot be CSS-styled, so Option A applied: pure `tray-template.mjs` with the expected items (Open CRON for Code / Show / Pause / Stop / Quit CRON for Code + separators), unit-tested for labels/order + wiring.
- **#5:** `lowerStackStyle` no longer forces `min-height: 0`; the fixed lower stack keeps its natural height and never clips, while the projects list remains the only scroll region. Tests now assert the flex contract.

### Verification (all PASS)
- `pnpm -r run test`: 326/326 (contracts 24, data-service 94, host-adapter 23, core 185).
- `pnpm run typecheck`: clean.
- `pnpm run lint`: 0 errors (3 pre-existing exhaustive-deps warnings).
- `pnpm run build`: clean (packages + standalone `dist-renderer`).

### Notes / blockers
- None blocking. Live tray-menu and folder-browser visuals remain Venessa's manual acceptance step (not run/launched this session).
- Rebuild note: package `dist/` was refreshed (`pnpm -r --filter !@cron-code/standalone run build`) so the standalone typecheck resolves the new core exports.
- Both `PROJECT_LOG.md` and `CRON_ARCHITECT_LOG.md` appended per the permanent rule.

## 2026-08-21 - CC (BB write-back)

**BB write-back: Model Provider Refactor DONE — cloud-first + Ollama fallback, no LM Studio. All verification green. No commits, nothing staged.**

### Product direction lock applied
- Code = plain-language creation app powered by OpenCode. CRON is the friendly/safe wrapper.
- Cloud-first model routing, local Ollama fallback, no LM Studio anywhere in active runtime.
- Truthful model labels only (no hardcoded Flash/Pro claims).
- Embeddable Intelligence boundary documented in README (shared engine, standalone-only shell).

### Files changed
- Core: `llm.ts`, `chat-runtime.ts`, `components/ModelSettings.tsx` (new; `LlmSettings.tsx`
  reduced to a deprecated re-export shim), `components/Layout.tsx`, `components/CronAssistant.tsx`,
  `activity-english.ts`, `index.ts` (unchanged surface), tests (`chat-runtime.test.ts`,
  `repo-stabilisation.test.ts`, `workspace-layout.test.tsx`, `activity-english.test.ts`,
  `model-settings.test.tsx` new).
- Standalone: `electron/main.mjs` (`cron:model:*`, cloud-first chat with Ollama fallback),
  `electron/preload.cjs`, `electron/register-ipc.mjs`, `src/ipc-data-service.ts`.
- Docs: `README.md` (What this is / Model providers / Embeddable boundary / Status).

### What each part did
- **Providers:** `LlmConfig` = `{ cloud, ollama }`; default cloud `https://api.openrouter.ai/api/v1`,
  default Ollama `http://127.0.0.1:11434/v1`. Chat tries cloud then falls back to Ollama.
- **Labels:** route status shows `Coding agent` / `Deeper reasoning` / `Planner` / `Vision`
  with "Cloud AI, local Ollama fallback" — derived from configured models, truthful.
- **No LM Studio:** IPC channels `cron:model:*`, settings "AI Settings", error strings updated;
  a repo guard now asserts no visible "LM Studio"/"lmstudio" in active product source.
- **OpenCode untouched:** runner/server/approval/resume tests (7 + 3) all green.

### Verification (all PASS)
- `pnpm test`: 334/334 (contracts 24, data-service 94, host-adapter 23, core 193).
- `pnpm typecheck`: clean. `pnpm lint`: 0 errors (3 pre-existing warnings).
- `pnpm build`: clean (packages + standalone `dist-renderer`).
- `git diff --check`: clean (only LF→CRLF advisories).

### Notes / blockers
- None blocking. `LlmSettings.tsx` kept as a deprecated shim (file deletion unavailable in this
  environment); no active imports. Stale `lmstudio.config` preference key is simply unused.
- Rebuild note: `@cron-code/core` dist rebuilt so standalone typecheck resolves the new
  `LlmConfig` shape.
- OpenCode live acceptance (prompt → build → approve → changed files) remains Venessa's step.

## 2026-08-22 - Gem (architect)

**Session: UI redesign — "make me an app" (NOT a prettier developer IDE).**

Venessa gave the full product spec for re-skinning CRON for Code as a friendly "code by prompt" product, with OpenCode as the invisible mechanic underneath. Gem audited the current shell + wiring, then wrote the plan.

Files added:
- `CRON_CODE_UI_REDESIGN_SPEC.md` — the full 30-section product spec (the North Star).
- `CRON_CODE_UI_REDESIGN_AUDIT.md` — current-state map + what must NOT break.
- `CC_CODE_UI_REDESIGN_SLICE1_PROMPT.md` — BB's slice 1 prompt (4-column shell + left nav + project browser).

Plan (5 slices): 1. shell + left nav + project browser → 2. build conversation → 3. right sidebar → 4. friendly approvals/errors → 5. live preview (net-new, greenfield — biggest piece).

Key audit findings: live UI = `Layout.tsx` + `CronAssistant.tsx` + `EmptyState.tsx` (single column); many dead components (Sidebar, TaskWorkspace, etc. — leave them); OpenCode wiring narrow + stable (opencode-client/runner + 3 IPC channels + store methods); approvals already work inline; NO live-preview mechanism exists; styling = inline CSSProperties + design tokens; state = zustand `createWorkspaceStore`.

Also this session: fixed a stale-launch bug (taskbar shortcut ran normal mode with a stale in-memory process; recreated a fresh `CRON for Code Dev.lnk`) and confirmed UI fixes #2–#5 work on the live build.

Awaiting Venessa's green-light to hand slice 1 to BB.

## 2026-08-23 - Gem (architect) — end of day save-point

**Session continued: full UI redesign implemented in the working tree (uncommitted).**

Done (all green via BB, tests 219 core / 359 total at peak):
- Slice 1 (4-column shell) + edge-tab revision + logo/tabs follow-up + polish round 2 + Home screen + complete screens/buttons + remove-Menu/profile-footer.
- Current shell: persistent logo header (animated MP4 in chrome frame, `--cron-logo-video-url`), icon-only left rail (Home/Projects/Create New/Templates/My Apps/Deployments/Learn/Settings), centre views, right side (Build Progress/Engine/Tools/Quick Actions/Review), profile footer at bottom of rail.
- 4 new screens: TemplatesScreen (6), MyAppsScreen (build status), DeploymentsScreen (empty), LearnScreen.

**LAST TASK — design polish (7 items) — INTERRUPTED, status UNKNOWN.** Specced in `CC_CODE_UI_DESIGN_POLISH_PROMPT.md`, handed to BB, but the run was cut off when Venessa signed off. Do NOT assume it landed. Items: (1) splash ~3s; (2) slim global footer (not taskbar-hidden); (3) browser-style profile card (credits inside); (4) code-safety shield in left rail (green ShieldCheck default / amber ShieldAlert + count on pending approvals → Review); (5) oryx bg Home-only + glow elsewhere; (6) crisper/brighter font. **Next run: `git status` + `pnpm test` to see what landed, then re-hand `CC_CODE_UI_DESIGN_POLISH_PROMPT.md` if incomplete.**

Still pending after polish: "lock the canvas between the two sidebars" layout fix; CronAssistant plain-English empty state (slice 2); right-side panel real content (slice 3); live preview (slice 5). Nothing committed since `e18dfb7`.

---

## 2026-08-24 - Gem P (project session)

**Session 1 — fix polish bug + self-sufficient dev launcher.**

### What happened this session
1. Design-polish (7 items) had LANDED in the working tree, but left two defects:
   - `RestartOverlay.tsx` read/wrote a React ref during render → lint error → 1 test failing.
   - A double-hold: App.tsx already enforces the ~3s restart linger floor (`RESTART_LINGER_MIN_MS`, bumped 2000→3000 by polish), AND the polish also added a second 3s hold inside RestartOverlay → stacked to 6s → restart-overlay test timed out.
2. **Fixed by Gem P directly:** reverted RestartOverlay to `hidden = !show` (the ~3s floor lives in ONE place — App.tsx); removed the dead `MIN_HOLD_MS`; kept the polish's brighter title colour; updated App.tsx comment. `pnpm test` 221/221 green, typecheck/build clean, dist-renderer rebuilt.

### BB INSTRUCTION (next)
Read `CC_CODE_UI_LAUNCHER_PROMPT.md` (or this entry) — build the self-sufficient dev-mode taskbar launcher. Scope below. After building, run `pnpm test`, `pnpm typecheck`, `pnpm build`, then report back here. No commits.

**Problem:** Venessa's "CRON for Code Dev" shortcut targets `electron.exe .` = NORMAL mode (serves stale `dist-renderer`). Dev mode (fresh Vite source) lives in `run-code-dev-hidden.ps1`/`dev.mjs`, but launching via that shows as a SECOND taskbar icon (wscript/cmd identity). Windows 11 groups the pinned icon with the running window ONLY when the shortcut targets electron.exe directly.

**Goal:** one taskbar shortcut that runs DEV mode (fresh source) with a single icon.

**Design (locked):**
1. `apps/standalone/electron/main.mjs` — make `--dev` self-sufficient. When `IS_DEV`, before `loadURL(DEV_URL)`, ensure the Vite dev server is reachable; if not, spawn it (reuse dev.mjs's exact command: `pnpm exec vite --port <port>`, cwd = `apps/standalone`/projectRoot, shell:true, hidden, log to `.runtime/code-dev-vite-direct.log`), wait for reachability (bounded ~30s), and kill the spawned Vite on `before-quit` (only if THIS process spawned it). Do NOT spawn if already reachable.
2. `scripts/create-code-dev-shortcut.ps1` — change shortcut Arguments `.` → `. --dev`, description → "development app (dev mode, self-starting)". Keep targeting electron.exe directly (grouping).

**Port:** derive from `DEV_URL` (default 5190).

**Restart note:** unchanged — in dev, `cron:app:restart` already writes restart intent + spawns `run-code-dev-hidden.ps1` + quits; the launcher handles teardown + fresh stack. The before-quit Vite kill prevents a stale Vite from holding the port.

**Do NOT touch:** production/normal mode path, OpenCode wiring, the right sidebar, dead components.

**ACCEPTANCE:** `pnpm test`, `pnpm typecheck`, `pnpm build` all green. `git diff --check` clean. No commits.

---

### BB REPORT (2026-08-24) � self-sufficient dev-mode taskbar shortcut: DONE, all green

**Files changed:**
1. pps/standalone/electron/main.mjs � dev self-start: when IS_DEV, probe DEV_URL (fetch + AbortSignal.timeout(1500)); if unreachable, spawn the exact dev.mjs Vite command (pnpm exec vite --port <port>, cwd projectRoot, shell:true, windowsHide:true, stdio appended to .runtime/code-dev-vite-direct.log, env CRON_DEV=1), store child in module-level selfStartedViteProcess, poll ~500ms bounded 30s, log via logger, proceed to loadURL on failure anyway. New pp.on('before-quit') kills ONLY a self-started Vite (taskkill /PID /T /F on win32, else SIGTERM) then clears handle. Added 
ode:child_process import. Normal/production path untouched.
2. scripts/create-code-dev-shortcut.ps1 � Arguments . ? . --dev; description ? (dev mode, self-starting); Target output line updated. Everything else unchanged.
3. packages/core/src/repo-stabilisation.test.ts � narrowed ONE assertion: expect(main).not.toContain('spawn(') (file-wide) ? expect(main).not.toMatch(/performAppRestart[\s\S]{0,3000}spawn\(/) because main.mjs now legitimately spawns Vite at startup. Safety intent (restart handler never spawns launcher/powershell) preserved.

**Verification (real):**
- pnpm test � PASS, 362 tests (contracts 24, data-service 94, host-adapter 23, core 221). 	est-code-dev-launcher.ps1 (94 assertions) PASS; no assertion depended on the old . args.
- pnpm typecheck � PASS (all 7 packages). pnpm build � PASS.
- git diff --check � exit 0 (only pre-existing LF?CRLF warnings).
- Flaky note: estart-overlay.test.tsx "lingers until ready" timed out once under full parallel load (needs ~3.5-4.1s); passes in isolation and on re-run. Pre-existing timing flake, unrelated to this change � not fixed.

**Not done:** no commits/staging. Logs updated (PROJECT_LOG.md, CRON_ARCHITECT_LOG.md, this entry).
