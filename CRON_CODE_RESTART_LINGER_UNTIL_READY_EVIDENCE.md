# CRON FOR CODE — RESTART OVERLAY LINGER UNTIL READY EVIDENCE

Supporting evidence for `CRON_CODE_RESTART_LINGER_UNTIL_READY_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_RESTART_LINGER_UNTIL_READY_ARCHITECT_SLICE.md` (Approved follow-up repair).
Full text:

```markdown
# CRON for Code — Restart Overlay Linger Until Ready

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User acceptance so far

Venessa manually tested the visible restart follow-up and confirmed:

- the restart button now works;
- the restart screen appears;
- the app comes back.

Remaining issue:

- the restart screen should linger until the app has actually started again, so the user is not left staring at a gap or wondering whether restart failed.

## Objective

Make the CRON for Code restart experience feel continuous:

1. User clicks **CRON Restart**.
2. A visible centered **Restarting** screen appears immediately.
3. That restart screen stays visible while the app is shutting down/relaunching.
4. The restarted app should not expose a blank/intermediate state before it is ready.
5. Once the relaunched app is ready, it should show the entry/open-or-resume project screen.

## Required behavior

After repair:

1. Launch CRON for Code.
2. Confirm it opens on the entry/open-or-resume project screen.
3. Click the visible **CRON Restart** button.
4. The Restarting screen appears and remains visible long enough to cover the relaunch gap.
5. The user should not see a blank dark window, half-loaded canvas, or confusing pause after the overlay disappears.
6. The app returns to the entry/open-or-resume screen, visible and usable.
7. No duplicate broken instance.
8. No restart loop.
9. Other CRON apps and ports are untouched.

## Implementation guidance

- Keep the existing restart overlay design.
- Prefer a startup/relaunch readiness handoff over a fixed delay if the architecture supports it.
- If a fixed minimum display time is still needed, keep it conservative and explain why.
- Do not redesign unrelated Code UI.
- Do not change project data, command safety, approvals, release gates, or port `5190`.
- Do not touch Git.

## Verification

Run and report:

- focused tests for the restart overlay/startup readiness behavior;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live/manual proof required:

- launch through the real CRON for Code Dev launcher/shortcut;
- click the same visible restart path;
- prove the overlay remains present until shutdown/relaunch readiness is covered;
- prove the relaunched app lands on the entry/open-or-resume screen;
- prove no blank window, duplicate instance, or restart loop.

## Deliverables

Create:

- `CRON_CODE_RESTART_LINGER_UNTIL_READY_REPORT.md`
- `CRON_CODE_RESTART_LINGER_UNTIL_READY_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim accepted until the visible restart path works and the restart screen covers the whole wait cleanly enough for Venessa to manually confirm.

No Git.
```

---

## 2. Pre-slice state

- Git: `8157b12 feat-refine-cron-shell-layout`, upstream 0/0, nothing staged.
- Live dev stack up (marker electron 32052, previous slice's relaunch). Unrelated CRON apps
  alive: Meds 10788, Claims 9336, HUB 15300. Production CRON for Code not running.

---

## 3. Implementation summary (files)

- `apps/standalone/electron/main.mjs`:
  - `runtimeMarkerState.restartHandoff = process.env.CRON_CODE_RESTARTING === '1'` (startup);
  - `cron:diag:marker` payload includes `restartHandoff`;
  - passive dev-only linger sampler (env `CRON_CODE_DEV_TEST_LINGER_SAMPLE=1`, deliberately NOT
    stripped on relaunch so the relaunched instance reports its own DOM state).
- `apps/standalone/scripts/dev.mjs`: `startElectron(true)` on restart-intent relaunch sets
  `CRON_CODE_RESTARTING: '1'` in the child env.
- `apps/standalone/src/ipc-data-service.ts`: `CronHostDiag.marker()` return type includes
  `restartHandoff: boolean`.
- `apps/standalone/src/main.tsx`: `await window.cronHost.diag.marker()` → `startupRestartHandoff`
  passed into `CronCodeApp` deps.
- `packages/core/src/components/App.tsx`: new `startupRestartHandoff?: boolean` dep; local
  `restartHandoff` state holds the overlay from first paint; cleared in `finally` after
  init (initialize → loadCommands → loadProjects) — success or visible-error path.
- `packages/core/src/components/Layout.tsx`: `preparing` prop → `<RestartOverlay preparing={...} />`.
- `packages/core/src/components/RestartOverlay.tsx`: shows when `isRestarting || preparing`;
  `Preparing your workspace...` note during the handoff.
- Preload deliberately UNCHANGED (narrow-bridge security guard: no `process.` exposure).

---

## 4. Verification gate — raw results

```
pnpm test         -> PASS; packages/core 139 tests (9 files), full suite green
pnpm typecheck    -> PASS, exit 0 (one transient recursive-run race, clean on re-run)
pnpm lint         -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build        -> PASS, exit 0
pnpm format:check -> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check  -> PASS, exit 0
git status --short -> nothing staged
node --check apps/standalone/electron/main.mjs -> 0
node --check apps/standalone/scripts/dev.mjs  -> 0
```

### Focused tests

`restart-overlay.test.tsx` (48 tests incl. shared files):
- `lingers after a restart handoff until the renderer is ready (preparing prop)` — overlay +
  `Preparing your workspace...` present with the handoff, without store restart state.
- `covers the relaunch gap on a restart-handoff launch and clears when ready` — App-level
  integration (real temp data service + mock host adapter): overlay visible from first paint;
  `waitFor` overlay gone after init.
- `does not linger on a normal (non-handoff) launch` — no overlay.
- plus existing overlay/restart-store tests.

`repo-stabilisation.test.ts`: `restart-handoff linger` assertion block (dev.mjs marks the
relaunched instance, main records `restartHandoff`, App holds/clears, Layout wires `preparing`),
and the overlay-wiring test updated to `<RestartOverlay preparing={preparing} />`.

---

## 5. Live proof — real button click and relaunch linger

Diagnostics used (dev-only, env-gated):
- `CRON_CODE_DEV_TEST_CLICK_RESTART=1` — clicks the REAL rendered button
  (`document.querySelector('[data-testid="cron-restart-button"]').click()` via
  `webContents.executeJavaScript`) + samples the DOM 400 ms after the click.
- `CRON_CODE_DEV_TEST_LINGER_SAMPLE=1` — PASSIVE sampler (no restart trigger), samples
  overlay presence at +100/300/600/1200/2500/5000 ms. Deliberately survives the relaunch so
  the relaunched instance reports its own state.

### Click phase (old instance)
```
[2026-08-09T06:04:08.974Z] Dev click probe: dispatched {"result":{"clicked":true}}
[2026-08-09T06:04:09.369Z] Dev click probe: overlay sample {"sample":{"overlayVisible":true,
  "overlayText":"CRON SYSTEM CONTROLRestartingStopping and restarting CRON services...The app will return to the project selection screen",
  "buttonDisabled":true,"buttonBusy":"true","buttonLabel":"Restarting."}}
```

### Relaunch handoff
```
SUPERVISOR: [2026-08-09T06:04:10.988Z] Restart intent consumed (pid 28736); relaunching Electron
```

### Relaunched instance — overlay linger (the new behavior)
```
[2026-08-09T06:04:13.152Z] Dev linger sample {"at":100,  "sample":{"overlayVisible":true, ...}}
[2026-08-09T06:04:13.185Z] Dev linger sample {"at":300,  "sample":{"overlayVisible":true, ...}}
[2026-08-09T06:04:13.465Z] Dev linger sample {"at":600,  "sample":{"overlayVisible":false,...}}
[2026-08-09T06:04:14.061Z] Dev linger sample {"at":1200, "sample":{"overlayVisible":false,...}}
[2026-08-09T06:04:15.371Z] Dev linger sample {"at":2500, "sample":{"overlayVisible":false,...}}
[2026-08-09T06:04:17.864Z] Dev linger sample {"at":5000, "sample":{"overlayVisible":false,...}}
```
The relaunched window's first painted state is the Restarting overlay (readiness handoff),
held until init completes, then cleared to reveal the entry screen.

Marker of the relaunched instance:
```
pid=22892 rendererReady=True restartHandoff=True lastStartupError=
```

### Entry screen + stability + safety
- Relaunched app's dev server serves the entry screen (`Resume a project` present).
- 25 s stability observation: supervisor log line count unchanged (64 → 64) — no restart loop.
- Intent consumed; exactly one owned dev stack; Vite reused (same listener PID through the
  relaunch) — no blank window by construction.
- Unrelated apps alive at every checkpoint: Meds 10788, Claims 9336, HUB 15300.
- Port 5190 owned by the repo Vite throughout; `CRON_MEDS_PORT` never modified; production
  CRON for Code untouched.
- Dev store intact: 3 project records, `lastActiveProjectId=proj_1786063530296_t62fq0`.

### Failed attempts (recorded honestly)
- First sampler timing (min 1000 ms) missed the linger: init completes in ~300–600 ms, so the
  overlay had already cleared. Retimed to 100 ms+ and captured.
- The handoff flag was initially planned via `process.env` in the preload; the preload's
  narrow-bridge security guard (`not.toContain('process.')`) rejected it. Re-routed through
  the existing `cron:diag:marker` payload instead — preload stays narrow.

---

## 6. Git safety

No Git mutation or release action performed. All Git commands read-only. Nothing staged.
