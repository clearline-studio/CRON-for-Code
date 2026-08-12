# CRON FOR CODE — RESTART AND ENTRY SCREEN REPAIR EVIDENCE

Supporting evidence for `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_REPORT.md`.
All commands run from the repo root `C:\Users\venes\projects\CRON APPS\CRON for Code`
on 2026-08-09 (+10:00) unless stated. Exit codes recorded verbatim.

---

## 1. Verification Input Used — Verbatim

`CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_ARCHITECT_SLICE.md` (Approved defect repair).
Full text:

```markdown
# CRON for Code — Restart and Entry Screen Repair Architect Slice

## Status

Approved defect repair.

## User evidence

Venessa manually tested the current CRON for Code runtime acceptance state on 2026-08-09.

Observed failures:

1. Restart fails.
2. The app opens on the working canvas instead of the entry screen with the card/actions to open or resume projects.

This fails manual acceptance.

## Goal

Repair only these two acceptance failures:

1. Restart must work from the visible app UI.
2. On normal launch/relaunch, CRON for Code must open to the entry/project-selection screen with clear cards/actions to open or resume projects, not directly into the working canvas.

## Acceptance

Venessa must be able to verify:

- Launch CRON for Code.
- The first visible screen is the entry/project-selection screen.
- It shows clear options/cards for opening or resuming projects.
- Selecting/resuming a project enters the working canvas.
- Pressing Restart from the visible UI closes/restarts and returns to a usable visible app.
- Restart does not blank the window.
- Restart does not open a duplicate broken instance.
- Restart does not touch Meds, Claims, Chat, Browser, or unrelated ports/processes.

## Boundary

Stay narrow.

Allowed:

- startup route/state selection;
- last-active project restoration behavior;
- restart button path from UI → store → host adapter → Electron/main/launcher;
- focused tests for startup screen and restart path;
- runtime diagnostics if needed;
- report/evidence/log updates.

Do not change:

- command execution safety model;
- approval model;
- project storage schema unless unavoidable and explicitly justified;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- package dependencies;
- unrelated UI redesign;
- Git state.

## Required diagnosis

Do not rely only on automated marker proof. Reproduce the user-visible failures.

Find and document:

1. Why the UI restart fails when Venessa clicks it.
2. Why startup restores directly into the working canvas.
3. Whether the current "last active project" behavior conflicts with the desired entry screen.
4. Whether dev restart handoff is only working through scripted intent files but not the visible UI button.

## Required repair

1. Make visible UI Restart work reliably.
2. Make normal launch land on the entry/project-selection screen.
3. Keep project data preserved; do not delete projects just to force a clean screen.
4. Keep the working canvas available after the user explicitly selects/resumes a project.
5. Show a visible bounded error if restart cannot complete.

## Verification

Run:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
git diff --check
git status --short
```

Also perform live runtime proof:

- launch from the real CRON for Code Dev shortcut/launcher;
- confirm entry/project-selection screen appears first;
- open/resume a project;
- click the visible Restart button;
- confirm app returns visible and usable;
- confirm no blank window and no duplicate broken instance;
- confirm unrelated CRON apps/processes are not touched.

If CC cannot click the native UI button directly, document that limitation and still provide the strongest possible runtime proof. Do not claim manual acceptance until Venessa confirms it.

## Report back

Create:

- `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_REPORT.md`
- `CRON_CODE_RESTART_AND_ENTRY_SCREEN_REPAIR_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

Report:

- root cause;
- exact files changed;
- verification results;
- live proof;
- remaining manual checks;
- no Git actions performed.

Do not claim full acceptance. Claim only ready for Architect review.
```

---

## 2. Pre-slice state

- Git: `8157b12 feat-refine-cron-shell-layout`, upstream `origin/main` 0/0, nothing staged.
- Live stack was down; dev store had 3 project records (Meds + Claims-295 archived, Claims-296
  active canonical), `lastActiveProjectId=proj_1786063530296_t62fq0`.
- Unrelated CRON apps alive: Meds vite PID 10788 (5191), Claims vite PID 9336 (5193),
  CRON HUB vite PID 15300. Production CRON for Code not running (untouched).

---

## 3. User failure recovered from the real logs

Electron log (Venessa's manual test):
```
[2026-08-09T00:53:34.848Z] [INFO] Handing dev restart to the approved launcher (...\run-code-dev-hidden.ps1 -Port 5190)
[2026-08-09T00:53:34.880Z] [INFO] Tray destroyed
[2026-08-09T00:55:31.462Z] [INFO] Handing dev restart to the approved launcher (...)
[2026-08-09T00:55:31.481Z] [INFO] Tray destroyed
```
Launcher log: NO entry after 10:53:57 for either click. Intent file left unconsumed
(`{"pid":24588,"requestedAt":1786236931461}`). Stack stayed down after the second click.

---

## 4. Root-cause reproductions

### 4.1 Spawn-option matrix (isolates `detached`)

`node .runtime/spawn-matrix.mjs` — powershell marker writes, 8 s wait, parent alive:

```
base: DIED        (detached:true, stdio ignore, windowsHide)
noHide: DIED      (detached:true, stdio ignore)
noDetach: SURVIVED (stdio ignore, windowsHide)
pipes: DIED       (detached:true)
withCwd: DIED
shellTrue: DIED
```
Conclusion: `detached: true` kills the PowerShell before its engine runs.

### 4.2 Marker-loop probe from the REAL Electron main

Dev-only probe: real Electron spawned a powershell writing `probe-<n>.marker` every second,
then exited after 4 s:

```
[2026-08-09T02:04:26.223Z] Dev job probe: marker loop spawned, parent exits after 4000ms
[2026-08-09T02:04:30.225Z] Dev job probe: parent exiting now
MARKERS: 4  (last probe-4 at 12:04:29 — no marker after the parent's exit)
```
Conclusion: Electron's exit kills its children (kill-on-close job). Electron cannot spawn a
surviving relauncher. `cmd /c start` and VBS shell-launch variants were also tested and died
with the parent.

### 4.3 Spawn-from-Electron is otherwise fine

Same probe WITHOUT the parent exit: the spawned launcher COMPLETED its whole job
(`Lifecycle decision: surface-running ... Launcher completed`). The launcher and spawn options
were never the problem — the parent exit was.

---

## 5. Verification gate — raw results

```
pnpm test        -> PASS; packages/core 128 tests (8 files), full suite green
pnpm typecheck   -> PASS, exit 0
pnpm lint        -> PASS, exit 0 (0 errors; 2 pre-existing react-hooks warnings)
pnpm build       -> PASS, exit 0 (packages + dist-renderer)
pnpm format:check-> PASS, exit 0 (no-op echo ok, pre-existing)
git diff --check -> PASS, exit 0
git status --short -> 40 modified / 3 deleted / 65 untracked; nothing staged
node --check apps/standalone/electron/main.mjs -> 0
node --check apps/standalone/scripts/dev.mjs  -> 0
PowerShell parser (run-code-dev-hidden.ps1, code-dev-launcher-logic.ps1) -> OK
Launcher PS test harness (inside vitest: "restart-safe launcher logic/source tests pass") -> PASS
```

---

## 6. Live proof — Restart cycles

### 6.1 Cycle 1 (REAL handler path via one-shot dev hook)

```
> $env:CRON_CODE_DEV_TEST_RESTART = "1"
> powershell -File scripts\run-code-dev-hidden.ps1 -Port 5190   -> exit 0, app ready (electron 29064)
> (15 s wait)
SUPERVISOR LOG (.runtime/code-dev-supervisor.log):
[2026-08-09T02:43:10.170Z] dev.mjs supervising started
[2026-08-09T02:43:23.405Z] Restart intent consumed (pid 29064); relaunching Electron
ELECTRON LOG: [2026-08-09T02:32:07.581Z] Dev restart intent written; handing the relaunch to dev.mjs
             + Tray destroyed
MARKER: pid=27352 rendererReady=True channels=34 lastStartupError=
VITE: same PID 792 (reused)     INTENT: consumed
```

### 6.2 Cycle 2 (intent + owned-stack stop)

```
> node -e "fs.writeFileSync('.runtime/code-dev-restart-requested.json', JSON.stringify({pid:27916, requestedAt:Date.now()}), 'utf8')"
> taskkill /PID 27916 /F     (owned dev Electron main only)
SUPERVISOR LOG: [2026-08-09T03:03:13.379Z] Restart intent consumed (pid 27916); relaunching Electron
MARKER: pid=9196 rendererReady=True channels=34 lastStartupError=
VITE: same PID 12632 (reused)     INTENT: consumed
Exactly one owned dev Electron main after each cycle.
```

### 6.3 Failed attempts (recorded honestly)

1. First hook run: dev.mjs tore down despite the intent — root cause: dev.mjs computed the
   intent path from `apps/` instead of the repo root (off-by-one `resolve(projectRoot, '..')`).
   Fixed to `resolve(projectRoot, '..', '..')`.
2. First hook run also showed the hook env never reached the first Electron (dev.mjs stripped
   it at build time). Fixed: strip only when relaunching (after the intent is consumed).
3. Cycle 2 attempt with a manually written intent failed twice: (a) `Set-Content -Encoding
   UTF8` wrote a UTF-8 BOM → `JSON.parse` rejected it (the real click path never writes a BOM;
   dev.mjs now tolerates it defensively); (b) my hardcoded timestamp was ~100 s in the future
   → correctly rejected by the age check. Re-run with the real `Date.now()` contract passed.

---

## 7. Live proof — Entry screen

- Served App.tsx (live dev server, Vite module graph): contains `loadProjects`, does NOT
  contain `restoreLastActiveProject`.
- Served EmptyState.tsx: contains `Resume a project`, `Open Project`, and `selectProject`
  (resume-card action).
- Dev store after all cycles: 3 project records intact; `lastActiveProjectId` unchanged
  (`proj_1786063530296_t62fq0`); only new data = `app.restart_requested` audit events (one per
  real restart cycle — expected behavior).
- Store-level launch test (in `project-picker.test.tsx`): after `loadProjects` on a fresh
  store with a persisted last-active preference, `activeProjectId` stays null (entry screen),
  then explicit `selectProject` enters the canvas.

---

## 8. Safety proof

- Unrelated CRON apps alive at every checkpoint: Meds 10788, Claims 9336, HUB 15300.
- Only owned processes were ever stopped: the owned dev Electron main during cycle 2, and the
  owned stack teardown between experiments (dev.mjs's own `killTree` on its vite, exactly as
  the standard teardown does).
- Port 5190 owned by the repo Vite throughout; `CRON_MEDS_PORT` env never modified.
- Production CRON for Code: not running at start, never touched.

---

## 9. Files changed

Tracked modifications: `apps/standalone/electron/main.mjs`, `apps/standalone/scripts/dev.mjs`,
`packages/core/src/components/App.tsx`, `packages/core/src/components/EmptyState.tsx`.
Also changed (pre-existing untracked files): `scripts/run-code-dev-hidden.ps1`,
`packages/core/src/project-picker.test.tsx`, `packages/core/src/repo-stabilisation.test.ts`.
Local-only gitignored artifacts: `.runtime/runtime-acceptance-proof.mjs` (prior slice),
`.runtime/spawn-matrix*.mjs`, `.runtime/spawn-repro*.mjs`, `.runtime/ps-parse-check.ps1`.

## 10. Git safety

No Git mutation or release action performed. All Git commands read-only.
