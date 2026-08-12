# CRON FOR CODE — VISIBLE RESTART FOLLOW-UP EVIDENCE

Supporting evidence for `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_VISIBLE_RESTART_FOLLOWUP_ARCHITECT_SLICE.md` (Approved follow-up repair).
Full text:

```markdown
# CRON for Code — Visible Restart Follow-up Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User evidence

Venessa manually tested the previous restart/entry repair.

Accepted:
- CRON for Code now opens on the entry / open-or-resume project screen.

Rejected:
- Clicking the visible **CRON Restart** button still does not complete a usable restart.
- During restart, CRON for Code should show the same clear restart overlay pattern as the other CRON apps: a centered **Restarting** screen/dialog that remains visible while services are stopping/restarting.

Screenshot evidence:
- Code entry screen is visible and correct.
- Claims shows the desired restart UX pattern: darkened app, centered `CRON SYSTEM CONTROL` / `Restarting` modal, spinner, message `Stopping and restarting CRON services...`, disabled restart state.

## Objective

Fix the **actual visible Restart button path** for CRON for Code and add/keep a visible restart-in-progress screen while the app is restarting.

This is not accepted by source proof alone. Venessa must be able to click the visible Restart button and see the app come back usable.

## Required behavior

After repair:

1. Launch CRON for Code.
2. The first visible screen is still the entry/open-or-resume project screen.
3. Click the visible **CRON Restart** button.
4. A centered restart screen/dialog appears immediately and stays visible long enough to reassure the user.
5. The restart screen clearly says the app is restarting.
6. The Restart button cannot be double-clicked into duplicate restarts.
7. The app closes/relaunches or refreshes via the approved architecture.
8. The app returns visible and usable.
9. It returns to the entry/open-or-resume project screen after restart.
10. No blank window.
11. No duplicate broken instance.
12. Other CRON apps and ports are untouched.

## Important diagnosis requirement

Do not rely only on the previous hook-driven proof.

Find why Venessa's **visible button click** still fails:

- Is the button wired to the wrong store action?
- Is the renderer not awaiting/showing restart state?
- Is the IPC path not triggered by the visible button?
- Does the app quit before the overlay paints?
- Does the supervisor only handle test-hook restart but not UI restart?
- Does the restart intent get written but not consumed?
- Does the restart work but take too long with no visible state?

Document the exact cause with evidence.

## UI requirement

Use the same visual language as the Claims restart modal where practical:

- darkened background;
- centered restart panel;
- title/eyebrow similar to `CRON SYSTEM CONTROL`;
- `Restarting`;
- spinner/loading icon;
- plain-English message;
- disabled/restarting button state.

Keep it consistent with Code styling and do not redesign unrelated UI.

## Must preserve

- entry/open-or-resume screen behavior;
- project data;
- command execution safety model;
- approval/release safety model;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- package dependencies unless truly unavoidable;
- unrelated UI and workflows;
- Git untouched.

## Verification

Run and report:

- focused tests you add/update for visible restart UI and wiring;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live/manual proof required:

- launch through the real CRON for Code Dev launcher/shortcut;
- start on entry screen;
- trigger the same path as the visible Restart button, and if direct UI clicking is not tool-accessible, prove the rendered button calls the same handler and explain the limitation clearly;
- show/verify the restart overlay appears before shutdown;
- verify the app returns usable on the entry screen;
- verify no duplicate Code instance and other CRON apps untouched.

## Deliverables

Create:

- `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_REPORT.md`
- `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim accepted until the visible Restart path is fixed enough for Venessa to manually click it and see:

- restart screen appears;
- app comes back;
- entry screen returns.

No Git.
```

---

## 2. Pre-slice state

- Git: `8157b12 feat-refine-cron-shell-layout`, upstream 0/0, nothing staged.
- Live dev stack up (marker electron 29844). Unrelated CRON apps alive: Meds 10788, Claims
  9336, HUB 15300. Production CRON for Code not running.

---

## 3. Diagnosis — Venessa's click already relaunched; the UX died

Supervisor log recovered from Venessa's manual test window:
```
[2026-08-09T05:07:49.359Z] Restart intent consumed (pid 9196); relaunching Electron
```
So the mechanics (button → IPC → intent → dev.mjs relaunch) completed. The failure is that the
quit happened ~1–5 ms after the click (`setImmediate` in `performAppRestart`), so no restarting
state could ever paint, and the new window took ~8 s to appear — from the user's viewpoint:
click → app gone → long silence.

### Reproduction — real button click via the renderer's own DOM

Dev-only diagnostic in main.mjs (`CRON_CODE_DEV_TEST_CLICK_RESTART=1`):
```js
wc.executeJavaScript(
  `(() => {
     const btn = document.querySelector('[data-testid="cron-restart-button"]');
     if (!btn) return { clicked: false, reason: 'button-not-found' };
     btn.click();
     return { clicked: true };
   })()`,
  true,
)
```
Plus a DOM sample 400 ms after the click (overlay/button state).

First run (loop exposed): the probe env var propagated through relaunches and re-clicked every
~5 s (8+ supervisor relaunch lines in one minute) — a test-only loop; dev.mjs now strips both
probe vars on relaunch.

---

## 4. Verification gate — raw results

```
pnpm test         -> PASS; packages/core 135 tests (9 files), full suite green
pnpm typecheck    -> PASS, exit 0
pnpm lint         -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build        -> PASS, exit 0 (packages + dist-renderer)
pnpm format:check -> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check  -> PASS, exit 0
git status --short -> nothing staged
node --check apps/standalone/electron/main.mjs -> 0
node --check apps/standalone/scripts/dev.mjs  -> 0
```

---

## 5. Live proof — two consecutive real-button restart cycles

Setup: fresh stack via the approved launcher with the one-shot click-probe env.

### Cycle 1 (15:24 launch)
```
ELECTRON LOG:
[2026-08-09T05:24:18.280Z] Dev click probe: dispatched {"result":{"clicked":true}}
[2026-08-09T05:24:18.628Z] Dev restart intent written; handing the relaunch to dev.mjs
[2026-08-09T05:24:18.667Z] Dev click probe: overlay sample {"sample":{"overlayVisible":true,
  "overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen",
  "buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
SUPERVISOR:
[2026-08-09T05:24:20.670Z] Restart intent consumed (pid 27344); relaunching Electron
MARKER (relaunched app): pid=18424 rendererReady=True lastStartupError=
```
Overlay painted at +389 ms after the click; quit happens at +1500 ms (delay). Vite reused.

### Cycle 2 (15:27 launch)
```
ELECTRON LOG:
[2026-08-09T05:27:24.466Z] Dev click probe: dispatched {"result":{"clicked":true}}
[2026-08-09T05:27:24.870Z] Dev click probe: overlay sample {"sample":{"overlayVisible":true,
  "overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen",
  "buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
SUPERVISOR:
[2026-08-09T05:27:27.149Z] Restart intent consumed (pid 23128); relaunching Electron
MARKER (relaunched app): pid=32052 rendererReady=True lastStartupError=
```
Stability check (15 s later): marker unchanged (pid 32052, rendererReady) — no repeated
restarts, no loop. Vite 20464 reused. Intent consumed.

### Entry screen after restart
- The relaunched app's dev server serves the entry screen: `EmptyState.tsx` contains
  `Resume a project` (HTTP 200 via the Vite module graph).
- Store-level launch test (project-picker.test.tsx): `activeProjectId` stays null after
  `loadProjects` with a persisted last-active preference; explicit `selectProject` enters the
  canvas.

### Safety
- Meds 10788 / Claims 9336 / HUB 15300 alive at every checkpoint.
- Only owned processes stopped (the owned dev Electron main during the cycles; the owned stack
  teardown between experiments).
- Port 5190 owned by the repo Vite throughout; `CRON_MEDS_PORT` never modified.
- Dev store intact: 3 project records (Meds + Claims-295 archived, Claims-296 active
  canonical), `lastActiveProjectId=proj_1786063530296_t62fq0`; the only new audit content is
  `app.restart_requested` events from the real restart cycles (52 total today across all
  testing, incl. the earlier probe loop).
- Production CRON for Code untouched.

### Honest limitation
- The click is a DOM `.click()` on the real visible button (physical-mouse clicking is not
  tool-accessible: Chromium does not expose its DOM to Windows UI Automation without an
  unapproved flag). The real onClick handler and every downstream layer run unchanged.

---

## 6. Files changed

- `packages/core/src/components/RestartOverlay.tsx` — new.
- `packages/core/src/components/Layout.tsx` — overlay rendered.
- `packages/core/src/index.ts` — overlay exported.
- `packages/core/src/store.ts` — restartApp keeps isRestarting after success.
- `apps/standalone/electron/main.mjs` — 1500 ms quit delay; dev-only real-button click probe
  with DOM sampling.
- `apps/standalone/scripts/dev.mjs` — strips both probe vars on relaunch.
- `shared/design-tokens/index.css` — `@keyframes cron-spin`.
- `packages/core/src/restart-overlay.test.tsx` — new (4 tests).
- `packages/core/src/repo-stabilisation.test.ts` — +3 assertions.

## 7. Git safety

No Git mutation or release action performed. All Git commands read-only.
