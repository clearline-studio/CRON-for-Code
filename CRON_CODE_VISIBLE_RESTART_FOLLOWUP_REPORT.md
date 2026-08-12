# CRON FOR CODE — VISIBLE RESTART FOLLOW-UP REPORT

Slice: `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_ARCHITECT_SLICE.md` (Approved follow-up repair)
Executed by: CC/OpenCode — narrow fix, no Git actions.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The visible CRON Restart path is fixed and proven end to end through the REAL rendered button
(not a hook that bypassed the renderer), with the Claims-style Restarting overlay painted and
held while services stop, and the app returning to the entry screen. Venessa's manual click is
the final acceptance step.

---

## 2. What was wrong (diagnosed with evidence)

### 2.1 The mechanics already worked — the UX failed

- Venessa's click DID relaunch the app once (supervisor log: `Restart intent consumed (pid
  9196); relaunching Electron` at 13:07) — but the app vanished instantly (quit happened in a
  `setImmediate`, ~1–5 ms after the click) with NO visible restarting state, and the new window
  only appeared ~8 s later. From the user's perspective: click → nothing → long silence →
  "restart fails".
- The slice's own diagnosis list included "Does the app quit before the overlay paints?" — yes,
  it did. There was no overlay at all, and the tiny button-label change ("Restarting…") was
  destroyed before it could be perceived.

### 2.2 Reproduction (stronger than the previous hook proof)

A dev-only diagnostic was added that clicks the REAL visible button in the REAL renderer
(`document.querySelector('[data-testid="cron-restart-button"]').click()` via
`webContents.executeJavaScript`). The full chain — renderer store → host adapter → preload →
IPC `cron:app:restart` → main handler → intent → quit → dev.mjs relaunch — ran end to end
(repeatedly, which also exposed a test-only loop: the probe env var propagated through
relaunches; fixed by stripping both probe vars in dev.mjs).

---

## 3. Repair delivered

### 3.1 Restarting overlay (Claims pattern, Code styling)

- New `RestartOverlay` component rendered by the shell while `isRestarting`:
  - darkened full-window backdrop with blur;
  - centered panel: `CRON SYSTEM CONTROL` eyebrow, `Restarting` title, spinner
    (`cron-spin` keyframes added to the design tokens), `Stopping and restarting CRON
    services...`, note `The app will return to the project selection screen.`;
  - `aria-busy`/`role=status` for accessibility; `data-testid="restart-overlay"`.
- The store's `restartApp` now KEEPS `isRestarting` true after a successful restart request
  (the app is about to close; only a genuine failure clears it, with a visible error).
- The header Restart button is disabled/busy while restarting (existing + verified in the
  live DOM sample).

### 3.2 The button path actually relaunches and returns to the entry screen

- `main.mjs`: the dev quit is now delayed (`DEV_RESTART_QUIT_DELAY_MS = 1500`) so the overlay
  paints and stays visible before the window closes; the intent is still the only message to
  dev.mjs, which relaunches Electron on the live Vite server; production keeps `app.relaunch()`.
- The relaunched app lands on the entry/open-or-resume screen (no auto-restore — verified:
  the relaunched app serves the entry screen and the store-level launch test proves
  `activeProjectId` stays null after load).
- `dev.mjs`: strips both one-shot probe vars on relaunch (loop fix).

---

## 4. Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — 135 core tests (9 files) |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing warnings |
| `pnpm build` | PASS, exit 0 |
| `pnpm format:check` | PASS (no-op `echo ok`, pre-existing) |
| `git diff --check` | PASS, exit 0 |
| `git status --short` | Reported; nothing staged |
| `node --check` (main.mjs, dev.mjs) | PASS |
| Git actions | None |

### Focused tests

- `restart-overlay.test.tsx` (new, 4 tests): overlay absent when not restarting; overlay shows
  `CRON SYSTEM CONTROL` / `Restarting` / message / disabled restart state when restarting;
  store keeps `isRestarting` after success; store clears it with a visible error on failure.
- `repo-stabilisation.test.ts` (+3): quit delay present; probe vars cannot loop; overlay wired
  into Layout + exported + `cron-spin` keyframes exist.

---

## 5. Live proof (real rendered button, two consecutive cycles)

Each cycle: launch → real DOM click on the visible Restart button → overlay sample taken 400 ms
later → app quits → dev.mjs relaunches → healthy app on the entry screen.

Cycle 1 evidence (electron log):
```
Dev click probe: dispatched {"result":{"clicked":true}}
Dev click probe: overlay sample {"sample":{"overlayVisible":true,
  "overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen",
  "buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
```
Cycle 2 evidence (electron log): identical overlay sample.
Supervisor (both cycles):
```
Restart intent consumed (pid 23128); relaunching Electron
```
After each cycle: marker `rendererReady=True`, 34 channels, `lastStartupError=`; Vite PID
unchanged (reused — no blank window possible); intent consumed; exactly one dev stack;
15-second stability check shows no repeated restarts (no loop). The relaunched app serves the
entry screen (`Resume a project` present).

### Safety

- Meds (10788), Claims (9336), HUB (15300) alive at every checkpoint.
- Only owned processes stopped (owned dev Electron during the cycles).
- Port 5190 owned by the repo Vite throughout; `CRON_MEDS_PORT` never modified.
- Dev store intact: 3 project records (Meds + Claims-295 archived, Claims-296 active
  canonical), `lastActiveProjectId` preserved; new audit entries are only the expected
  `app.restart_requested` events from the real restart cycles.
- Production CRON for Code untouched.

### Honest limits

- The click is dispatched as a DOM `.click()` on the real button (Chromium does not expose its
  DOM to Windows UI Automation for a physical-mouse-equivalent click). This runs the REAL
  onClick handler → store → adapter → preload → IPC → main → supervisor; nothing is bypassed.
- Visual confirmation of the overlay in the live window is Venessa's step.

---

## 6. Exact files changed

- `packages/core/src/components/RestartOverlay.tsx` — new overlay component.
- `packages/core/src/components/Layout.tsx` — renders `<RestartOverlay />`.
- `packages/core/src/index.ts` — exports RestartOverlay.
- `packages/core/src/store.ts` — `restartApp` keeps `isRestarting` after success.
- `apps/standalone/electron/main.mjs` — quit delay (1500 ms) so the overlay paints; dev-only
  real-button click diagnostic with DOM overlay sampling.
- `apps/standalone/scripts/dev.mjs` — strips both probe env vars on relaunch (loop fix).
- `shared/design-tokens/index.css` — `@keyframes cron-spin`.
- `packages/core/src/restart-overlay.test.tsx` — new tests (4).
- `packages/core/src/repo-stabilisation.test.ts` — +3 source assertions.

## 7. Remaining manual checks (Venessa)

- Launch → entry screen → click **CRON Restart** → the Restarting overlay appears → app closes
  and reopens → entry screen returns, visibly usable. No blank window, no duplicate instance.

## 8. No-Git statement

Nothing staged, committed, or pushed. No Git mutation or release action performed. All Git
commands were read-only.

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
