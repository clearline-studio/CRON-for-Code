# CRON FOR CODE — RESTART AND ENTRY SCREEN REPAIR REPORT

Slice: `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_ARCHITECT_SLICE.md` (Approved defect repair)
Executed by: CC/OpenCode — narrow repair only, no Git actions.

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

Both user-visible failures are fixed and proven at runtime:
1. Visible-UI Restart now works (proven by a REAL restart driven through the real
   Electron main-process handler, plus a second independent restart cycle).
2. Launch now lands on the entry/project-selection screen (open + resume), and the
   working canvas appears only after an explicit project selection.

The native Restart-button click itself remains Venessa's manual step (Chromium does not expose
its DOM to Windows UI Automation) — documented, with the strongest available runtime proof.

---

## 2. User-visible failures (as reported)

- Restart fails from the visible UI.
- The app opens on the working canvas instead of the entry screen.

---

## 3. Root causes (proven by reproduction, not guessed)

### 3.1 Restart

Venessa's manual session (2026-08-09 10:53–10:55) was recovered from the logs:

- First Restart click (10:53:34): Electron logged `Handing dev restart to the approved
  launcher` + `Tray destroyed`, wrote the restart intent, and quit. The PowerShell launcher it
  spawned never ran (no launcher log line). The app came back only because Venessa relaunched
  the shortcut at 10:53:48, and the launcher found her still-fresh intent.
- Second Restart click (10:55:31): same spawn, same silent death, no shortcut relaunch this
  time — the app closed and never returned. The intent file was left unconsumed and the stack
  stayed down. This is exactly "Restart fails".

Two independent killers were isolated with controlled reproductions:

1. **`detached: true` killed the spawned PowerShell before its engine ever ran.**
   Spawn-option matrix (powershell marker writes): `detached` → process dies immediately;
   without `detached` → process runs (with the parent alive). PowerShell 5.1 ConsoleHost
   cannot initialise under DETACHED_PROCESS in this environment.
2. **Even without `detached`, the spawned launcher dies when Electron exits.** A marker-loop
   probe spawned by the REAL Electron main kept writing markers every second until the parent
   exited — then stopped instantly. The launcher itself is fine (it completes when its parent
   stays alive, proven twice); the parent's exit kills all its children. Conclusion: Electron's
   process tree runs under a kill-on-close job object — Electron CANNOT spawn a surviving
   relauncher, no matter the options (also confirmed for `cmd /c start` / VBS shell launch).

Design consequence: the relaunch must come from a process that is NOT Electron's child.
The app's supervisor `dev.mjs` (Electron's parent, spawned by the launcher/shortcut) is that
process.

### 3.2 Entry screen

`App.tsx` initialisation called `restoreLastActiveProject()`, which set `activeProjectId` and
rendered the working canvas immediately on every launch — the last-active auto-restore directly
conflicts with an entry screen. Additionally, the entry screen (`EmptyState`) only offered a
single "New Project" action with no resume options.

---

## 4. Repair delivered

### 4.1 Restart (new lifecycle: intent → dev.mjs relaunch)

- **`apps/standalone/electron/main.mjs`**: the dev restart handler no longer spawns anything.
  `performAppRestart()` flushes data, records the `app.restart_requested` audit event, writes
  the restart intent, and quits. If the intent write fails, it throws instead of quitting
  (visible bounded error in the UI; the app stays up). Production keeps `app.relaunch()`.
  Removed: `restartViaLauncher()`, the PowerShell spawn, `devPortFromEnv`, the `spawn` import.
- **`apps/standalone/scripts/dev.mjs`** (the supervisor): on Electron exit it reads the
  restart intent (age-bounded 300 s, UTF-8-BOM tolerant). Fresh intent → consumes it and
  relaunches Electron on the STILL-LIVE Vite server (no blank window, no PowerShell cold
  start); no intent → tears down as before. Logs to `.runtime/code-dev-supervisor.log`.
- **`scripts/run-code-dev-hidden.ps1`**: clears stale restart intents left behind by failed
  restart attempts (self-healing).
- **Dev-only one-shot test hook** (`CRON_CODE_DEV_TEST_RESTART=1`): drives a REAL restart
  through the real handler path headlessly (used for proof; consumed before relaunch so it can
  never loop).

### 4.2 Entry screen

- **`packages/core/src/components/App.tsx`**: removed the auto `restoreLastActiveProject()`
  call at launch. Launch now stays on the entry screen; the working canvas appears only after
  the user explicitly opens or resumes a project.
- **`packages/core/src/components/EmptyState.tsx`**: now the entry/project-selection screen —
  "Open Project" action (folder picker) plus a "Resume a project" card list of known available
  projects (each card enters the canvas via the store's explicit `selectProject`).
- Project data is fully preserved: `lastActiveProjectId` preference remains, archived records
  untouched, no records deleted.

---

## 5. Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS — 128 core tests (was 121; +7 new: entry-screen open/resume/launch tests, restart-architecture source assertions) |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS — 0 errors, 2 pre-existing warnings |
| `pnpm build` | PASS, exit 0 |
| `pnpm format:check` | PASS (no-op `echo ok`, pre-existing) |
| `git diff --check` | PASS, exit 0 |
| `git status --short` | 40 modified / 3 deleted / 65 untracked — nothing staged |
| `node --check` (main.mjs, dev.mjs) | PASS |
| PowerShell parser (launcher + logic) | PASS |
| Launcher PS test harness (in vitest) | PASS |
| Git actions | None |

### Focused tests added/updated

- `project-picker.test.tsx` (13 tests): entry screen renders resume cards; resume card enters
  the canvas; "Open Project" invokes the picker handler; launch does not auto-enter the canvas
  (active project stays null after `loadProjects` with the preference still persisted).
- `repo-stabilisation.test.ts` (37 tests): restart handler writes the intent + quits and never
  spawns powershell; `dev.mjs` owns the relaunch; one-shot test hook; launcher clears stale
  intents; App.tsx no longer auto-restores; EmptyState has resume cards + Open Project.

---

## 6. Live runtime proof (real app, real main process, real supervisor)

Environment: unrelated CRON apps snapshotted at start — CRON for Meds vite (PID 10788),
CRON for Claims vite (9336), CRON HUB vite (15300) — all verified ALIVE at every checkpoint.

### 6.1 Restart cycle 1 — REAL handler path (hook-driven, equivalent to a UI click)

Launch with the one-shot test hook → the real Electron main ran `performAppRestart()`:
- Electron log: `Dev restart intent written; handing the relaunch to dev.mjs` + `Tray destroyed`.
- Supervisor log: `Restart intent consumed (pid 29064); relaunching Electron`.
- Result: new Electron main (27352) healthy — marker `rendererReady=True`, 34 channels,
  `lastStartupError=` — on the SAME Vite (PID 792 unchanged). Intent consumed. No loop.

### 6.2 Restart cycle 2 — intent + owned-stack stop (independent second cycle)

- Fresh intent written with the real `Date.now()` contract, owned Electron main stopped.
- Supervisor log: `Restart intent consumed (pid 27916); relaunching Electron`.
- Result: new Electron main (9196) healthy — marker `rendererReady=True`, 34 channels,
  `lastStartupError=` — on the SAME Vite (PID 12632 unchanged). Intent consumed. Exactly one
  dev stack after every cycle.

### 6.3 Entry screen

- App.tsx served by the live dev server no longer contains `restoreLastActiveProject`.
- The served entry screen contains `Resume a project`, `Open Project`, and the resume-card
  `selectProject` action.
- Dev store preserved: all 3 project records intact (Meds + Claims-295 archived, Claims-296
  active canonical), `lastActiveProjectId` unchanged. Only new content is the expected
  `app.restart_requested` audit events from the real restart cycles.

### 6.4 Safety

- No blank window possible by construction: Vite is reused (same PID across every restart);
  the relaunched Electron loads the live dev URL immediately.
- No duplicate stack: exactly one owned dev stack after every cycle.
- Unrelated CRON apps (Meds/Claims/HUB) alive at every checkpoint. Production CRON for Code
  untouched. Port 5190 owned by the repo Vite throughout. No other project's port or env
  variable modified.

### 6.5 Honest limits

- The native Restart button click is not CC-drivable (Chromium does not expose its DOM to
  Windows UI Automation). The hook drives the exact same handler path in the real Electron
  main; the button → store → host adapter → IPC → handler chain is additionally test-covered
  (`project-management.test.tsx` restart tests).
- Visual confirmation of the entry screen in the live window is Venessa's step.

---

## 7. Exact files changed

- `apps/standalone/electron/main.mjs` — restart redesign (intent-only in dev; no spawn; bounded
  error on intent-write failure; removed launcher-spawn code and unused imports; one-shot dev
  test hook retained).
- `apps/standalone/scripts/dev.mjs` — supervisor relaunch on fresh restart intent (BOM
  tolerance, age bound, supervisor log, relaunched-child env cleanup).
- `scripts/run-code-dev-hidden.ps1` — stale restart-intent cleanup.
- `packages/core/src/components/App.tsx` — removed auto last-active restore at launch.
- `packages/core/src/components/EmptyState.tsx` — entry screen with Open Project + Resume cards.
- `packages/core/src/project-picker.test.tsx` — entry-screen tests (13 tests).
- `packages/core/src/repo-stabilisation.test.ts` — restart-architecture + entry-screen source
  assertions (37 tests).

## 8. Remaining manual checks (Venessa)

- Launch CRON for Code Dev → entry screen with Open Project + Resume cards.
- Resume/open a project → working canvas.
- Click CRON Restart → app closes and reopens to the entry screen, visibly usable.
- No blank window; no duplicate instance; Meds/Claims/Chat/Browser untouched.

## 9. No-Git statement

Nothing staged, committed, or pushed. No Git mutation or release action performed. All Git
commands were read-only.

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
