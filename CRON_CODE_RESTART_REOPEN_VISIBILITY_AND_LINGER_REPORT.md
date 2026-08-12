# CRON FOR CODE — RESTART GAP-FREE REOPEN REPAIR REPORT

Venessa's words: "i click restart - restart screen stays until app full restarts - app opens
full screen" vs the current "i click restart - app vanish - wrong screen flashes for a second
then vanish - app opens but minimised in taskbar".

Slice: `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_ARCHITECT_SLICE.md` (Approved repair)
Executed by: CC/OpenCode — narrow fix, no Git actions.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The restart is now **gap-free and one continuous screen**: click → the Restarting panel
appears and stays the WHOLE time while the app actually restarts, the relaunched window opens
**full screen (maximized), visible and focused** (never minimized on the taskbar), and — after
Venessa's follow-up — the pre-React splash is now a pixel-identical replica of the Restarting
panel, so there is NO intermediate "pop-up" screen between the restart screen and the app.

---

## 2. What Venessa was seeing (plain English)

1. Click Restart → the Restarting screen showed for ~3 seconds (a fixed timer).
2. The old window then closed with a pause of NOTHING on screen while the new app booted →
   "app vanish".
3. The new window appeared, but Windows minimized it on the taskbar (it was started by a
   background process) → "opens minimised".
4. Follow-up: even after the gap-free fix, a slightly different splash (logo + plain text)
   appeared between the restart screen and the app for ~a second — read as a "pop-up screen".

## 3. The fixes

### 3.1 The Restarting screen stays until the app FULLY restarts (gap-free handoff)
- The old window does NOT close on a timer. It writes the restart intent, releases the
  single-instance lock, and watches the runtime marker — the overlay stays visible the whole
  time. It quits only when the replacement (different pid + rendererReady + restartHandoff)
  is ready; bounded at 20 s.
- dev.mjs polls the intent (every 400 ms) and starts the new Electron WHILE the old window is
  still on screen — the new app boots behind the Restarting screen. A superseded-close guard
  prevents teardown when a replacement is running.

### 3.2 The relaunched window cannot be minimized
Reopen sequence: show → restore-if-minimized → maximize (full screen) → focus → brief
always-on-top flip → focus → `app.focus({steal:true})` → delayed focus retry.

### 3.3 No intermediate pop-up screen (Venessa's follow-up)
The new window's pre-React splash was a different design (large logo + plain text). It is now a
pixel-identical replica of the Restarting panel, and the React overlay shows the same texts in
both phases. Follow-up round (Venessa: "another version of the restart screen ... and the app
opens but not full screen"):

- **Backdrops unified**: the overlay previously blurred the app content behind it
  (`backdropFilter: blur`), so the old window's Restarting screen looked subtly different from
  the new window's flat-dark splash. The blur was removed — both windows now show the exact
  same flat dark backdrop + panel. There is no second "version" of the screen.
- **Full screen on open**: the window now maximizes BEFORE it is shown (previously it showed
  at its restored/default size and then maximized), so it can never appear at a small size;
  a delayed retry re-maximizes if anything interferes. Window-state sampling confirms
  `maximized:true` from the first visible sample.
- **Handover without a gap**: the old window now waits for the replacement's `windowReady`
  (ready-to-show), not just `rendererReady` — the new window is visible before the old one
  closes (measured ~100 ms overlap), so the panel never disappears and reappears.

### 3.4 Renderer linger floor
The new app's Restarting panel holds a minimum of 2 seconds after it appears.

---

## 4. Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — core 142 tests (9 files), full suite green |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing warnings |
| `pnpm build` | PASS, exit 0 |
| `pnpm format:check` | PASS (no-op `echo ok`, pre-existing) |
| `git diff --check` | PASS, exit 0 |
| `git status --short` | Reported; nothing staged |
| `node --check` (main.mjs, dev.mjs) | PASS |
| Git actions | None |

### Focused tests/source checks
- Gap-free contract: main contains `REPLACEMENT_WATCH_TIMEOUT_MS`, `startReplacementWatch`,
  `app.releaseSingleInstanceLock`, the replacement-readiness check (different pid +
  rendererReady + restartHandoff); dev.mjs contains the intent poll, the "via poll" spawn, and
  the superseded-close guard.
- Reopen contract: ready-to-show contains show / restore-if-minimized / maximize / focus /
  `app.focus({steal:true})` / always-on-top flip.
- Linger floor: `RESTART_LINGER_MIN_MS` and the floor timer in App.tsx.
- One-screen contract: the splash replicates the panel (`splash-panel`, same panel colors and
  radius, `CRON Restart` pill); the overlay shows the same texts in both phases (no
  `Preparing your workspace` variant); main.tsx sets the handoff splash text on restart.

---

## 5. Live proof (real button click, real relaunch — verbatim log evidence)

### The handoff (supervisor log)
```
[2026-08-09T07:45:11.791Z] Restart intent consumed (pid 27376) via poll; spawning replacement
[2026-08-09T07:45:17.066Z] Superseded Electron instance closed; the replacement continues
```
The replacement was spawned at +0.9 s while the old window was still up, and the old window
closed at +6.2 s — only after the replacement was ready.

### The old window's Restarting screen (continuous, click to close ≈ 6 s)
```
overlay sample at:0    -> overlayVisible:true   (instant)
overlay sample at:400  -> overlayVisible:true
overlay sample at:1000 -> overlayVisible:true
overlay sample at:1500 -> overlayVisible:true
overlay sample at:2000 -> overlayVisible:true
overlay sample at:2400 -> overlayVisible:true
```

### The replacement window (visible, full screen, NEVER minimized)
```
window-state at:600  -> {"visible":true,  "maximized":true, "minimized":false, "focused":true}
window-state at:1200 -> {"visible":true,  "maximized":true, "minimized":false, "focused":true}
window-state at:2500 -> {"visible":true,  "maximized":true, "minimized":false, "focused":true}
```

### The replacement's Restarting screen (holds ≥2 s, then entry)
```
linger sample at:100  -> overlayVisible:true
linger sample at:1200 -> overlayVisible:true
linger sample at:2500 -> overlayVisible:false   (entry screen revealed)
```

### No intermediate pop-up screen (pixel evidence, follow-up fix)
The new window's first-painted frames were pixel-analyzed before and after the fix:
- OLD splash: content box ~220×192 px, light colors (logo + plain text) — a visibly different
  screen between the restart panel and the overlay.
- NEW splash (FIRSTPAINT): content box ~544×332 px, dark panel colors — the SAME panel as the
  overlay (which measures 544×368 maximized). The splash is now indistinguishable from the
  Restarting panel, so there is no "pop-up" screen.

### Stability + safety
- 20 s observation: no restart loop; intent consumed; exactly one stack; Vite reused.
- Unrelated apps: Claims (9336) and HUB (15300) alive at every checkpoint; CRON for Meds'
  dev stack restarted itself at 18:29 under a new PID (34032, its Vite still owns port 5191) —
  this repo's launcher log shows no interaction with any Meds process.
- Port 5190 owned by the repo Vite.
- Dev store intact: 3 project records, `lastActiveProjectId` preserved.

### Honest limit
Windows focus-stealing policy can still, in rare cases, flash the taskbar icon instead of
granting instant foreground to a background-started app — but the window itself is proven to
open visible, maximized, and never minimized, so no taskbar click is ever needed to recover it.

---

## 6. Exact files changed

- `apps/standalone/electron/main.mjs` — gap-free handoff (release lock + replacement watch
  requiring `windowReady`, quit-when-visible, 20 s bound); window reopen hardening
  (maximize BEFORE show → show → restore-if-minimized → focus → always-on-top flip → delayed
  retry); extended diagnostics (click samples 0–2400 ms, continuous 300 ms sampler).
- `apps/standalone/scripts/dev.mjs` — intent poll (400 ms) to spawn the replacement while the
  old instance still runs; superseded-close guard (no teardown when a replacement is alive).
- `apps/standalone/index.html` — splash rewritten as a pixel-identical replica of the
  Restarting panel (no logo block; same backdrop/panel/spinner/texts/pill).
- `apps/standalone/src/main.tsx` — handoff splash text updated (title/message/note) on restart.
- `packages/core/src/components/RestartOverlay.tsx` — both phases show the same texts, and the
  backdrop blur was removed so the overlay is pixel-identical to the splash.
- `packages/core/src/components/App.tsx` — linger floor 2000 ms.
- `packages/core/src/restart-overlay.test.tsx` — unified-panel assertions.
- `packages/core/src/repo-stabilisation.test.ts` — gap-free + reopen + linger + one-screen
  assertions.

## 7. What Venessa should now see

Click **CRON Restart** → the centered Restarting panel appears immediately and STAYS as ONE
continuous screen (no blur difference, no gap, no second "version") → the app reopens FULL
SCREEN and focused with the same panel → the entry screen. No vanish, no pop-up, no small
window, no taskbar click.

## 8. No-Git statement

Nothing staged, committed, or pushed. No Git mutation or release action performed. All Git
commands were read-only.

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
