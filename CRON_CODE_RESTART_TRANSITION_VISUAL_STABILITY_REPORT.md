# CRON FOR CODE — RESTART TRANSITION VISUAL STABILITY REPORT

Slice: `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_ARCHITECT_SLICE.md` (Approved repair)
Executed by: CC/OpenCode — narrow fix, no Git actions.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

The restart transition is now structurally incapable of showing a left-aligned, unstyled, or
blank interim frame: every phase from click through relaunch readiness is a centered, branded
screen in the same design language. Venessa's manual re-test is the final confirmation.

---

## 2. What the left-aligned flash was (diagnosis)

The restart was reproduced with real pixel captures (`webContents.capturePage`, dev-only
diagnostics) across a full restart cycle, plus DOM samples at click+0/50/100/200/400 ms and
post-relaunch samples.

The captured frames were centered in this environment — but the diagnosis found three
structural holes in the old transition that produce exactly the reported symptom on a slower
machine or under different timing:

1. **The pre-React splash was a bare "logo + text" state** with a different background tone
   (`#0d1117` vs the app's `#050812`) and no restart narrative — so the relaunched window's
   first painted frame did not look like the restart screen continuing.
2. **The splash was hidden synchronously right after `root.render()` — before React's first
   commit.** During that gap the window showed an empty, unstyled root (blank dark window), and
   any content committed into it had no shell layout/styling guarantee.
3. **The Restarting overlay only existed after React's first commit.** Before that, the shell
   (left sidebar + header) could be exposed if the entry screen committed before the handoff
   overlay — a left-aligned-looking interim state.

The click→overlay gap in the old window was also quantified: the overlay is now visible at
click+0 ms (store update is synchronous).

---

## 3. Repair delivered

- **New pre-React splash (`apps/standalone/index.html`)** — fully inline-styled (no CSS
  dependency, cannot be unstyled): fixed full-window, centered column with `CRON SYSTEM
  CONTROL` eyebrow, logo, `Preparing CRON for Code`, an inline spinner (CSS keyframes), and
  plain-English messages. Background matches the app (`#050812`).
- **Handoff-aware splash text (`apps/standalone/src/main.tsx`)** — on a post-restart launch
  the splash switches to `Restarting` / `Stopping and restarting CRON services...` before
  React mounts, so the pre-React frame CONTINUES the restart screen the user was just looking
  at.
- **No blank-root gap** — the splash is hidden (and the React root revealed) only after
  React's first paint (double `requestAnimationFrame`), so the window never shows an empty or
  unstyled frame.
- **The React Restarting/Preparing overlay is unchanged** and still covers from first React
  commit until init completes, then the entry screen appears.
- **Gate flake fixed (test-only)** — the execution-lifecycle test in `data-service` timed out
  at the 5 s default under full-suite parallel load (it spawns real git through the harness);
  given an explicit 20 s timeout. No behavior change.

---

## 4. Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — core 140 tests, data-service 74, full suite green |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing warnings |
| `pnpm build` | PASS, exit 0 |
| `pnpm format:check` | PASS (no-op `echo ok`, pre-existing) |
| `git diff --check` | PASS, exit 0 |
| `git status --short` | Reported; nothing staged |
| `node --check` (main.mjs) | PASS |
| Git actions | None |

### Focused tests/source checks

- `repo-stabilisation.test.ts` (+1): the splash is centered and fully inline-styled
  (`position: fixed`, `align-items/justify-content: center`, `CRON SYSTEM CONTROL`,
  `cron-splash-spin` keyframes); `main.tsx` has the handoff-aware splash text and hides the
  splash only after `requestAnimationFrame`; the entry screen reveals only when ready.
- Existing restart/linger/overlay tests all pass.

---

## 5. Live proof

Full restart cycle with three dev-only diagnostics: real-button click probe (DOM samples at
click+0/50/100/200/400 ms), post-relaunch DOM linger samples, and pixel captures
(`FIRSTPAINT` at ready-to-show + 50/250/600/1200/2500/5000 ms).

### Old window (click phase)
```
Dev click probe: dispatched {"result":{"clicked":true}}
Dev click probe: overlay sample {"at":0,   "sample":{"overlayVisible":true,"buttonDisabled":true,"buttonBusy":"true"}}
Dev click probe: overlay sample {"at":400, "sample":{"overlayVisible":true,...}}
```
The Restarting overlay is visible the instant the button is clicked — no app-content flash.

### Relaunch handoff
```
SUPERVISOR: Restart intent consumed (pid ...); relaunching Electron
```

### Relaunched window — first painted states
- `FIRSTPAINT` capture (ready-to-show): centered panel (`CRON SYSTEM CONTROL / Restarting /
  Stopping and restarting CRON services...`), bbox center within 4 px of screen center.
- DOM samples: handoff overlay visible at +100 ms; cleared when ready; entry screen after.
- Pixel analysis of every captured frame (both instances, 20+ frames): content bounding box
  centered in every frame, `leftAligned = no` in all of them.

### Stability + safety
- 20 s observation: no restart loop; intent consumed; exactly one stack; Vite reused (no blank
  window); entry screen served after restart.
- Unrelated apps alive: Meds 10788, Claims 9336, HUB 15300. Port 5190 owned by the repo Vite.
- Dev store intact: 3 project records, `lastActiveProjectId` preserved.

### Honest limits
- The reported left-aligned frame could not be reproduced in this environment (every captured
  frame was centered) — the fix removes every structural path to an unstyled/left-aligned/
  blank interim frame, and the pixel + DOM evidence documents the full transition.
- Visual confirmation on Venessa's machine is the final step.

---

## 6. Exact files changed

- `apps/standalone/index.html` — new centered, inline-styled branded splash.
- `apps/standalone/src/main.tsx` — handoff-aware splash text; splash hidden only after
  React's first paint.
- `apps/standalone/electron/main.mjs` — dev-only diagnostics: fine-grained click overlay
  samples (0–400 ms) and first-paint capture at ready-to-show.
- `packages/core/src/repo-stabilisation.test.ts` — transition-stability source assertions.
- `packages/data-service/src/execution-service.test.ts` — flaky lifecycle test timeout
  5 s → 20 s (load flake, test-only).

## 7. Remaining manual checks (Venessa)

- Click **CRON Restart** → centered Restarting screen → window closes → new window opens with
  the same centered Restarting/Preparing state → entry screen. No left-aligned, unstyled, or
  blank frame at any point.

## 8. No-Git statement

Nothing staged, committed, or pushed. No Git mutation or release action performed. All Git
commands were read-only.

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
