# CRON FOR CODE — RESTART TRANSITION VISUAL STABILITY EVIDENCE

Supporting evidence for `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_ARCHITECT_SLICE.md` (Approved repair). Full text:

```markdown
# CRON for Code — Restart Transition Visual Stability Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User evidence

Venessa manually tested the restart-linger repair and rejected the visual result:

- Restart begins.
- The restart screen disappears.
- Another screen briefly pops in all left-aligned for a second.
- Then the app opens.

This means the restart handoff may be technically present, but the visual transition is not acceptable.

## Objective

Make the restart transition visually continuous and centered from click through relaunch readiness.

## Required behavior

After repair:

1. Click **CRON Restart**.
2. The centered Restarting screen appears.
3. The user never sees a blank screen, left-aligned interim layout, unstyled content, or half-loaded shell.
4. The relaunched app either keeps the same centered Restarting/Preparing screen visible or shows a polished centered splash while booting.
5. The final entry/open-or-resume screen appears only after it is styled and ready.
6. No duplicate instance.
7. No restart loop.
8. Other CRON apps and ports are untouched.

## Diagnosis requirement

Find exactly what the left-aligned flash is:

- unstyled React content before CSS loads;
- a fallback/root splash with missing centering;
- the restart overlay mounted before shell layout styles;
- the app rendering entry content before initialization completes;
- a separate Electron window/splash state;
- or a race between marker handoff and renderer initialization.

Document the exact cause with evidence.

## Repair guidance

- Fix the visual handoff, not the general Code UI.
- Keep the restart overlay design consistent with Claims/Code.
- If a pre-React or pre-CSS splash is needed, make it centered and branded in `index.html`/base CSS so there is no unstyled flash.
- Ensure the entry screen is only revealed when ready and styled.
- Keep port `5190`, AppUserModelID, project data, approvals, release gates, and safety model unchanged.
- No Git.

## Verification

Run and report:

- focused tests/source checks for no left-aligned restart interim state;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live proof required:

- launch through the real Code dev launcher;
- click the visible Restart button;
- capture/screenshot/sample the old-window restart state;
- capture/screenshot/sample the relaunched first-painted state;
- prove no left-aligned interim content is visible;
- prove final entry screen appears only after the app is ready.

## Deliverables

Create:

- `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_REPORT.md`
- `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim complete until Venessa can click Restart and see a clean continuous centered restart experience with no left-aligned flash.

No Git.
```

---

## 2. Diagnosis tooling (dev-only, env-gated)

- `CRON_CODE_DEV_TEST_CLICK_RESTART=1` — clicks the real rendered button
  (`document.querySelector('[data-testid="cron-restart-button"]').click()` via
  `webContents.executeJavaScript`) and samples the overlay DOM at click+0/50/100/200/400 ms.
- `CRON_CODE_DEV_TEST_LINGER_SAMPLE=1` — passive DOM sampler (survives relaunch).
- `CRON_CODE_DEV_TEST_CAPTURE=1` — `webContents.capturePage()` at ready-to-show (`FIRSTPAINT`)
  and +50/250/600/1200/2500/5000 ms (survives relaunch; saves `.runtime/captures/*.png`).
- `.runtime/analyze-captures.ps1` — System.Drawing pixel analysis: content bounding box,
  bbox-center offset from screen center, mean RGB, left-aligned detection.

---

## 3. Diagnosis findings (structure of the old transition)

Pixel analysis of two full cycles (20+ frames, both instances):

| Frame | Content bbox | bbox center offset | leftAligned |
| --- | --- | --- | --- |
| old-window FIRSTPAINT (splash) | (628,388)-(848,580) | -4 px | no |
| old-window app (entry) | (0,28)-(1916,1040) | -2 px | no |
| old-window pre-quit overlay | (688,364)-(1232,688) | 0 px | no |
| relaunched FIRSTPAINT (overlay) | (468,312)-(1012,680) | -2 px | no |
| relaunched splash/overlay frames | centered | ≤4 px | no |
| relaunched entry screen | (0,28)-(1916,1040) | -2 px | no |

All captured frames were centered. The structural holes that produce a raw/left-aligned/blank
interim frame on slower machines or different timings:

1. The old splash was a bare logo+text state, different background tone, no restart narrative.
2. `main.tsx` hid the splash synchronously after `root.render()` but BEFORE React's first
   commit → an empty, unstyled root window for up to a few hundred ms; raw content had no
   shell styling guarantee.
3. The Restarting overlay existed only after React's first commit → the shell (left sidebar)
   could be exposed first if the handoff overlay committed late.

---

## 4. Fix (as shipped)

- `apps/standalone/index.html`: splash is now a fixed full-window centered column with inline
  CSS (`position: fixed; inset: 0; align-items/justify-content: center`), `CRON SYSTEM
  CONTROL` eyebrow, logo, `Preparing CRON for Code`, inline spinner (`cron-splash-spin`
  keyframes), plain-English messages, background `#050812` (matches the app).
- `apps/standalone/src/main.tsx`: on `startupRestartHandoff` the splash text is switched to
  `Restarting` / `Stopping and restarting CRON services...` before React mounts; the splash is
  hidden and the React root revealed only after React's first paint
  (`requestAnimationFrame` × 2) — no blank-root or unstyled window.
- React handoff overlay unchanged (covers from first React commit until init completes).

---

## 5. Verification gate — raw results

```
pnpm test         -> PASS; packages/core 140 tests (9 files), packages/data-service 74,
                     full suite green (the lifecycle test's 5 s timeout was the pre-existing
                     load flake; raised to 20 s - test-only)
pnpm typecheck    -> PASS, exit 0
pnpm lint         -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build        -> PASS, exit 0
pnpm format:check -> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check  -> PASS, exit 0
git status --short -> nothing staged
node --check apps/standalone/electron/main.mjs -> 0
```

### Focused source checks (repo-stabilisation.test.ts)
- splash: `id="splash"`, `position: fixed`, `align-items: center`, `justify-content: center`,
  `CRON SYSTEM CONTROL`, `cron-splash-spin`;
- `main.tsx`: `startupRestartHandoff`, `title.textContent = 'Restarting'`,
  `requestAnimationFrame`, `splashEl.style.display = 'none'`.

---

## 6. Live proof (raw)

### Old window — click phase
```
Dev click probe: dispatched {"result":{"clicked":true}}
Dev click probe: overlay sample {"at":0,   "sample":{"overlayVisible":true,"buttonDisabled":true,"buttonBusy":"true"}}
Dev click probe: overlay sample {"at":50,  ... {"overlayVisible":true,...}}
Dev click probe: overlay sample {"at":100, ... {"overlayVisible":true,...}}
Dev click probe: overlay sample {"at":200, ... {"overlayVisible":true,...}}
Dev click probe: overlay sample {"at":400, ... {"overlayVisible":true,"overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen","buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
```

### Relaunch handoff
```
SUPERVISOR: Restart intent consumed (pid ...); relaunching Electron
```

### Relaunched window — first painted state
`FIRSTPAINT` capture (ready-to-show): centered `CRON SYSTEM CONTROL / Restarting / Stopping
and restarting CRON services...` panel (bbox center within 4 px of screen center).

### Relaunched window — DOM samples
```
Dev linger sample {"at":100, ... bodyText "CRON SYSTEM CONTROL / Restarting / Stopping an..."}   overlay present
Dev linger sample {"at":300+ ...}  overlay cleared when ready (entry screen)
```

### Normal-launch splash
```
Dev linger sample ... bodyText "CRON SYSTEM CONTROL / Preparing CRON for Code / Starting local services..."
```
(before the first React paint; centered, branded, spinner).

### Stability / safety (post-cycle)
- 20 s observation: supervisor log line count unchanged — no restart loop.
- Marker (relaunched instance): `rendererReady=True restartHandoff=True lastStartupError=`.
- Entry screen served after restart (`Resume a project`). Splash served (`CRON SYSTEM
  CONTROL`, `cron-splash-spin`).
- Unrelated apps alive: Meds 10788, Claims 9336, HUB 15300. Port 5190 owned by the repo Vite.
  Dev store intact: 3 records, `lastActiveProjectId` preserved.

### Failed attempts (recorded honestly)
- The reported left-aligned frame was NOT reproducible in this environment (every captured
  frame centered across two full cycles). The fix therefore targets the three structural paths
  that can produce it (bare splash, blank-root gap, pre-overlay shell exposure) rather than a
  single reproduced pixel; pixel + DOM evidence documents the whole transition.
- The full-suite data-service flake (`execution-service.test.ts` 5 s timeout under parallel
  load) was fixed with a test-only 20 s timeout; passes isolated and in-suite.

---

## 7. Git safety

No Git mutation or release action performed. All Git commands read-only. Nothing staged.
