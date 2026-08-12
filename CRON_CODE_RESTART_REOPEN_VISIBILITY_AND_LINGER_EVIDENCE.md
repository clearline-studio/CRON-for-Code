# CRON FOR CODE — RESTART GAP-FREE REOPEN EVIDENCE

Supporting evidence for `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_ARCHITECT_SLICE.md` (Approved repair). Full text:

```markdown
# CRON for Code — Restart Reopen Visibility and Linger Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

## User report

Venessa tested the latest restart transition repair:

> it also works but the restartscreen flashes too fast and opens minimised in taskbar

So the restart now works and the left-aligned flash appears fixed, but the final user experience is still not accepted:

- The Restarting screen disappears too quickly.
- The restarted Code window opens minimized / only on the taskbar instead of returning visible.

## Goal

Make the restart feel continuous and complete:

1. The centered Restarting screen appears immediately after clicking **CRON Restart**.
2. The Restarting screen lingers until the relaunched app is actually ready/opening.
3. The relaunched Code window opens visible, focused, and preferably maximized.
4. It must not sit minimized on the taskbar.
5. The final entry/open-or-resume screen appears only once styled and ready.
6. No duplicate app stack and no restart loop.

## Scope

Allowed:

- Inspect and adjust `apps/standalone/electron/main.mjs`, `apps/standalone/scripts/dev.mjs`, `scripts/run-code-dev-hidden.ps1`, and the renderer restart handoff timing.
- Improve Electron BrowserWindow show/focus/maximize/restore behavior on restart handoff.
- Improve the old-window close timing and/or launcher readiness handshake so the Restarting screen is not only a short flash.
- Add focused tests/source checks for the window state and linger contract where practical.
- Update `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`, and create report/evidence files.

Not allowed:

- Do not change port 5190.
- Do not change AppUserModelID/taskbar identity.
- Do not change project data, approval/execution safety, release gates, store schema, or command execution behavior.
- Do not add dependencies.
- Do not stage, commit, push, or open a PR.

## Required diagnosis

Before changing code, document:

- Where the old window decides to close.
- Where the restart handoff launches the new Electron window.
- Whether Electron creates the new window minimized, fails to restore it, fails to focus it, or Windows prevents focus.
- Why the Restarting screen only flashes briefly instead of staying visible until the new app is actually ready.

## Required behavior

After repair, Venessa should see:

`click Restart` → centered Restarting screen stays visible → relaunched Code window appears visible/focused/maximized → entry screen.

She should not have to click the taskbar icon to recover the app.

If Windows focus-stealing rules prevent absolute focus, make the safest possible behavior: restore/show/maximize the window and document the limit plainly.

## Verification

Run and report:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
git diff --check
git status --short --branch
```

Live proof required if possible:

- Launch through the real Code dev launcher.
- Click the visible Restart button.
- Capture/sample that the old window shows the Restarting screen long enough to be seen.
- Capture/sample that the relaunched window is visible/restored/maximized, not minimized.
- Prove no duplicate stack and no restart loop.

## Deliverables

Create:

- `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md`
- `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

No Git.
```

---

## 2. Venessa's clarification (direct quote)

> "ok this is venessa i dont think architect is explaining what i want... so this is what needs
> to happen > i click restart - restart screen stays until app full restarts - app opens full
> screen BUT at the moment this happens = i click restart - app vanish - wrong screen flashes
> for a second then vanish - app opens but minimised in taskbar... pls can u fx it"

> "corrction - restart screen does show but only for 3 seconds"

So: the Restarting screen DID show (~3 s — the old window's fixed hold), then the app
vanished (the gap while the new process booted), then the new window was minimized on the
taskbar.

---

## 3. Diagnosis (before changing code)

- Old window close: `performAppRestart` → flush/audit/intent → fixed hold → `app.quit()`.
- The fixed hold ended BEFORE the replacement was ready → a no-window gap ("app vanish").
- New window: spawned by dev.mjs (background process). Without restore/focus/foreground
  countermeasures, Windows minimized it on the taskbar.
- Linger: the old overlay's fixed hold (~3 s) and the replacement's overlay (cleared at
  readiness, ~100–600 ms) were both shorter than the perceived restart.

---

## 4. Repair (as shipped)

### main.mjs
- `performAppRestart` (dev): write intent → `app.releaseSingleInstanceLock()` →
  `startReplacementWatch()` (poll the marker every 300 ms; quit when a DIFFERENT pid has
  `rendererReady:true` and `restartHandoff:true`, or after `REPLACEMENT_WATCH_TIMEOUT_MS`
  = 20 s).
- `ready-to-show`: show → restore-if-minimized → maximize (saved maximized or handoff) →
  focus → always-on-top flip (true→false) → focus → `app.focus({steal:true})` → delayed
  (400 ms) restore/maximize/focus retry.

### dev.mjs
- Intent poll (`setInterval`, 400 ms): fresh intent → consume → spawn replacement IMMEDIATELY
  (while the old instance still runs) → "via poll" log.
- `onElectronClosed(closedProc)`: if `closedProc !== electronProcess` (a superseded instance
  closed; a replacement is running) → log and continue; else existing intent/teardown logic.

### App.tsx
- `RESTART_LINGER_MIN_MS = 2000` — the replacement's overlay holds ≥2 s after first paint.

---

## 5. Verification gate — raw results

```
pnpm test         -> PASS; packages/core 142 tests (9 files), full suite green
pnpm typecheck    -> PASS, exit 0
pnpm lint         -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build        -> PASS, exit 0
pnpm format:check -> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check  -> PASS, exit 0
git status --short -> nothing staged
node --check apps/standalone/electron/main.mjs  -> 0
node --check apps/standalone/scripts/dev.mjs   -> 0
```

### Focused tests/source checks (repo-stabilisation.test.ts)
- `dev Restart is gap-free: the old window holds the overlay until the replacement instance is
  ready` — main contains `REPLACEMENT_WATCH_TIMEOUT_MS`, `startReplacementWatch`,
  `app.releaseSingleInstanceLock`, `marker.pid !== process.pid`, `marker.rendererReady ===
  true`, `marker.restartHandoff === true`, the readiness `setInterval`; dev.mjs contains
  `via poll`, `setInterval`, `closedProc !== electronProcess`, `Superseded Electron instance
  closed`.
- `the relaunched window reopens visible/focused/maximized` — show/restore/maximize/focus/
  always-on-top in the ready-to-show path.
- `the post-restart overlay lingers a minimum perceivable time` — `RESTART_LINGER_MIN_MS` +
  floor timer.

---

## 6. Live proof (raw)

### 6.1 Supervisor (handoff)
```
[2026-08-09T07:45:03.980Z] dev.mjs supervising started
[2026-08-09T07:45:11.791Z] Restart intent consumed (pid 27376) via poll; spawning replacement
[2026-08-09T07:45:17.066Z] Superseded Electron instance closed; the replacement continues
```
Replacement spawned at +0.9 s after the click (old window still up); old window closed at
+6.2 s — after the replacement was ready. dev.mjs did NOT tear down (the guard works).

### 6.2 Old window — Restarting screen continuous (click at ~07:45:10.9)
```
overlay sample {"at":0,    "overlayVisible":true}
overlay sample {"at":400,  "overlayVisible":true}
overlay sample {"at":1000, "overlayVisible":true}
overlay sample {"at":1500, "overlayVisible":true}
overlay sample {"at":2000, "overlayVisible":true}
overlay sample {"at":2400, "overlayVisible":true}
```

### 6.3 Replacement window — visible / full screen / never minimized
```
window-state {"at":100,  "state":{"visible":false,"maximized":false,"minimized":false,"focused":false}}   (pre-show boot)
window-state {"at":300,  "state":{"visible":false,"maximized":false,"minimized":false,"focused":false}}   (pre-show boot)
window-state {"at":600,  "state":{"visible":true, "maximized":true, "minimized":false,"focused":true }}
window-state {"at":1200, "state":{"visible":true, "maximized":true, "minimized":false,"focused":true }}
window-state {"at":2500, "state":{"visible":true, "maximized":true, "minimized":false,"focused":true }}
window-state {"at":5000, "state":{"visible":true, "maximized":true, "minimized":false,"focused":false}}
```
(`focused` dropped to false at +5000 ms because the console regained focus; the window is
never minimized at any sample.)

### 6.4 Replacement Restarting screen — holds, then entry
```
linger sample {"at":100,  "overlayVisible":true}   "CRON SYSTEM CONTROL / Restarting / Stopping an..."
linger sample {"at":300,  "overlayVisible":true}
linger sample {"at":600,  "overlayVisible":true}
linger sample {"at":1200, "overlayVisible":true}
linger sample {"at":2500, "overlayVisible":false}  (entry screen revealed)
```

### 6.5 Stability / safety
- 20 s observation: supervisor log unchanged — no restart loop.
- Marker (replacement): `pid=16392 rendererReady=True restartHandoff=True lastStartupError=`.
- Intent consumed; exactly one owned dev stack; Vite reused; entry screen served.
- Unrelated apps alive: Meds 10788, Claims 9336, HUB 15300. Port 5190 owned by the repo Vite.
- Dev store intact: 3 project records, `lastActiveProjectId=proj_1786063530296_t62fq0`.

### 6.6 Failed attempts (recorded honestly)
- First gap-free implementation left a dangling `proc` reference in dev.mjs's `startElectron`
  (spawn result not captured) — caught by `node --check`, fixed to capture the child.
- The old `DEV_RESTART_QUIT_DELAY_MS` source assertion was replaced by the new gap-free
  contract assertions.

### 6.6 No intermediate pop-up screen (Venessa's follow-up fix)

Venessa: "its better but there is still a scree that pops up in between the restart screen and
the app for a second, can u remove it".

Cause: the new window's pre-React splash was a DIFFERENT design from the Restarting panel
(large 96 px logo + plain centered text, lighter content). Between the old window's overlay
closing and the React overlay mounting, that splash was visible for ~0.5–1 s.

Fix: the splash is now a pixel-identical replica of the React Restarting panel (same backdrop
rgba(2,6,17,0.82), same panel rgba(9,18,34,0.96) with the same border/radius/shadow, same
eyebrow/spinner/title/message/note/disabled pill), and the React overlay uses the same texts in
both phases.

Pixel evidence (System.Drawing analysis, `analyze-captures.ps1`):

| Frame | Content box | Mean RGB | Interpretation |
| --- | --- | --- | --- |
| OLD splash (pre-fix) | (628,388)–(848,580) ≈ 220×192 | (124,138,152) light | logo + text — visibly different screen |
| NEW splash FIRSTPAINT (1483×954) | (468,312)–(1012,644) ≈ 544×332 | (56,76,106) dark | the Restarting panel |
| NEW overlay (1920×1052) | (688,364)–(1232,732) ≈ 544×368 | (54,71,100) dark | the Restarting panel |
| entry screen | full width | (56,82,116) | entry |

The splash and the overlay are the same centered dark panel — the transition is one continuous
screen.

Re-run of the full gap-free cycle (verbatim supervisor):
```
[2026-08-09T08:33:07.347Z] dev.mjs supervising started
[2026-08-09T08:33:16.279Z] Restart intent consumed (pid 28068) via poll; spawning replacement
[2026-08-09T08:33:23.705Z] Superseded Electron instance closed; the replacement continues
```
Replacement marker: `pid=32028 rendererReady=True restartHandoff=True lastStartupError=`.
No loop (20 s observation); intent consumed; exactly one stack; Vite reused.

### 6.7 Unrelated-app note (final checkpoint)
Claims 9336 and HUB 15300 alive at every checkpoint. CRON for Meds' dev stack restarted
itself at 18:29 under a new PID (34032); its Vite still owns port 5191. This repo's launcher
log contains no action against any Meds process (only the pre-existing `CRON_MEDS_PORT=5190`
env disclosure note, never modified).

---

## 7. Git safety

No Git mutation or release action performed. All Git commands read-only. Nothing staged.
