# CRON FOR CODE — RESTART OVERLAY LINGER UNTIL READY REPORT

Slice: `CRON_CODE_RESTART_LINGER_UNTIL_READY_ARCHITECT_SLICE.md` (Approved follow-up repair)
Executed by: CC/OpenCode — narrow fix, no Git actions.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The restart experience is now continuous: click CRON Restart → the Restarting screen appears
immediately in the old window, the app relaunches, and the SAME Restarting screen is the first
thing the relaunched window shows — held by a real readiness handoff, not a fixed delay — until
the app is ready and the entry screen is revealed. Venessa's manual confirmation is the final step.

---

## 2. What was wrong

After the previous slice the restart worked, but there was still a perception gap: the old
window closed (overlay died with it) and the new window only appeared seconds later. The
Restarting overlay could not cover the relaunch gap because nothing told the relaunched app to
keep showing it.

---

## 3. Repair delivered — a real readiness handoff (no fixed delay)

1. **dev.mjs marks the relaunched instance.** When it relaunches Electron after consuming a
   restart intent, it sets `CRON_CODE_RESTARTING=1` in the child's environment. Normal launches
   never have it.
2. **main.mjs records it in the runtime marker.** `restartHandoff` is read from the env at
   startup and included in the dev runtime marker and the `cron:diag:marker` payload (live
   evidence: the relaunched instance's marker shows `restartHandoff: true`).
3. **The renderer keeps the overlay up from first paint.** `main.tsx` reads the flag from the
   marker before rendering and passes `startupRestartHandoff` to the app. The app holds the
   Restarting overlay visible from its very first frame and clears it only when initialization
   completes (data service ready, commands + projects loaded) — in the `finally`, so a visible
   error is never buried under the overlay either.
4. **The overlay itself** accepts the handoff (`preparing`) state and shows a
   `Preparing your workspace...` note during it. Design unchanged otherwise.

Resulting flow: click → Restarting overlay (old window, ~1.5 s) → relaunch → new window opens
with the same Restarting overlay (splash → overlay → entry screen) → overlay clears exactly
when the entry screen is ready. No blank window, no half-loaded canvas, no silent pause.

---

## 4. Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — 139 core tests (9 files) |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing warnings |
| `pnpm build` | PASS, exit 0 |
| `pnpm format:check` | PASS (no-op `echo ok`, pre-existing) |
| `git diff --check` | PASS, exit 0 |
| `git status --short` | Reported; nothing staged |
| `node --check` (main.mjs, dev.mjs) | PASS |
| Git actions | None |

### Focused tests

- `restart-overlay.test.tsx` (+4): overlay lingers with the `preparing` handoff and shows
  `Preparing your workspace...`; an App-level integration test proves a restart-handoff launch
  shows the overlay from first paint and clears it exactly when the app finishes loading; a
  normal launch never shows it.
- `repo-stabilisation.test.ts` (+1 assertion block): dev.mjs marks the relaunched instance;
  main records `restartHandoff`; the app holds and clears the handoff; Layout wires `preparing`.
  (The preload narrow-bridge guard is preserved — the flag travels via the marker IPC, never
  via `process` in the preload.)

---

## 5. Live proof (real rendered button, real relaunch)

Setup: stack launched via the approved launcher with two dev-only diagnostics — the real-button
click probe and a passive overlay sampler (the sampler is NOT stripped on relaunch, so the
relaunched instance reports its own overlay state).

Click (electron log, verbatim):
```
Dev click probe: dispatched {"result":{"clicked":true}}
Dev click probe: overlay sample {"sample":{"overlayVisible":true,
  "overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen",
  "buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
```
Relaunch (supervisor log, verbatim):
```
Restart intent consumed (pid 28736); relaunching Electron
```
**Relaunched instance — overlay linger samples (electron log, verbatim):**
```
Dev linger sample {"at":100,  "sample":{"overlayVisible":true,  ...}}
Dev linger sample {"at":300,  "sample":{"overlayVisible":true,  ...}}
Dev linger sample {"at":600,  "sample":{"overlayVisible":false, ...}}
Dev linger sample {"at":1200, "sample":{"overlayVisible":false, ...}}
Dev linger sample {"at":2500, "sample":{"overlayVisible":false, ...}}
Dev linger sample {"at":5000, "sample":{"overlayVisible":false, ...}}
```
The overlay is the relaunched window's first painted state, stays while the app finishes
starting, and clears when the entry screen is ready. Marker of the relaunched instance:
`pid=22892 rendererReady=True restartHandoff=True lastStartupError=`.

### Entry screen + safety

- Entry/open-or-resume screen served after restart (`Resume a project` present).
- Stability: 25 s observation with zero new relaunch lines — no restart loop.
- Intent consumed; exactly one dev stack; Vite reused (no blank window).
- Unrelated apps alive at every checkpoint: Meds 10788, Claims 9336, HUB 15300.
- Port 5190 owned by the repo Vite; `CRON_MEDS_PORT` never modified; production app untouched.
- Dev store intact: 3 project records, `lastActiveProjectId` preserved.

### Honest limits

- The button click is a DOM `.click()` on the real rendered button (physical clicking not
  tool-accessible). The overlay samples read the real live DOM of the relaunched app.
- Visual confirmation of the continuous feel is Venessa's step.

---

## 6. Exact files changed

- `apps/standalone/electron/main.mjs` — `restartHandoff` in marker state + `cron:diag:marker`
  payload; passive dev-only linger sampler.
- `apps/standalone/scripts/dev.mjs` — `CRON_CODE_RESTARTING=1` for the relaunched instance.
- `apps/standalone/src/ipc-data-service.ts` — marker payload type includes `restartHandoff`.
- `apps/standalone/src/main.tsx` — reads the flag from the marker and passes
  `startupRestartHandoff` to the app.
- `packages/core/src/components/App.tsx` — `startupRestartHandoff` dep; overlay held from
  first paint and cleared in `finally` when init completes.
- `packages/core/src/components/Layout.tsx` — `preparing` prop passed to the overlay.
- `packages/core/src/components/RestartOverlay.tsx` — `preparing` handoff + note.
- `packages/core/src/restart-overlay.test.tsx` — +4 tests.
- `packages/core/src/repo-stabilisation.test.ts` — linger handoff assertions.

## 7. Remaining manual checks (Venessa)

- Launch → click **CRON Restart** → Restarting screen appears → window closes → the new window
  opens showing Restarting/Preparing → the entry screen appears. No blank or half-loaded state
  at any point.

## 8. No-Git statement

Nothing staged, committed, or pushed. No Git mutation or release action performed. All Git
commands were read-only.

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
