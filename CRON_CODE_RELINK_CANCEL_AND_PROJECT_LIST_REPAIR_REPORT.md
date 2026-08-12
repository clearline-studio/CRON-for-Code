# CRON for Code — Re-link Cancellation and Project-List Preservation Repair Report

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 16:20 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task class:** Approved narrow runtime defect-repair slice.
**Classification:** `READY FOR ARCHITECT REVIEW`

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

## 2. Repository identity

Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used

Full verbatim task prompt stored in `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_EVIDENCE.md` (`## Verification Input Used — Verbatim`) and in `CRON_ARCHITECT_LOG.md` (Re-link Cancellation and Project-List Preservation Repair checkpoint, same section).

## 4. Complete CRON Architect Log — Verbatim

See `CRON_ARCHITECT_LOG.md` in full. This slice appends the `Re-link Cancellation and Project-List Preservation Repair — 2026-08-07 16:20` checkpoint (prompt stored verbatim, root cause, repairs, tests, live proof, updated decision history). Prior entries remain verbatim and unchanged.

## 5. Initial working-tree state (before this slice)

88 changes: 37 modified tracked files, 3 deleted tracked files, 48 untracked. Nothing staged. All pre-existing uncommitted work preserved. Post-slice: 37 modified / 3 deleted / 56 untracked (+8 new: relink-flow.mjs, relink-flow.d.mts, relink-flow.test.ts, report, evidence, .runtime marker is gitignored).

## 6. User-verified defect

After the Live IPC Registration repair, Venessa tested Re-link → Cancel and saw:

- red error banner `Error invoking remote method 'cron:project:relink': Error: Re-link cancelled`
- project list empty, sidebar `No projects yet`
- top strip `Loading project...`
- no active project; Meds and Claims no longer shown.

## 7. Persisted project-store state before repair

Dev store `C:\Users\venes\AppData\Roaming\CRON for Code Dev\cron-for-code-data\store.json` (read-only, before any edit; 3083 bytes, LastWriteTime 16:06:22):

- `proj_1786050841183` "CRON for Meds" — `archived: true`, `availability: available`
- `proj_1786063530295_4ir189` "CRON for Claims" — `archived: true`, `availability: available`
- `proj_1786063530296_t62fq0` "CRON for Claims" (duplicate path) — `archived: false`, `availability: available`
- `preferences.lastActiveProjectId`: `proj_1786050841183` (Meds) at inspection time
- Audit: `project.archived` Claims-295 @16:04:57, `project.archived` Meds @16:05:02, `project.relinked` Meds @16:06:03, `app.restart_requested` @16:06:22.

**Conclusion:** Meds and Claims-295 were archived through the app's own Remove-from-CRON action (`project.archived` audits — the only writer of that event). The relink audit at 16:06:03 proves a real (non-cancelled) re-link of Meds occurred and left `archived: true` (re-link never cleared the flag). These are deliberate user actions, NOT accidental defect mutations — therefore no manual unarchive/restore of Meds/Claims-295 is performed (contract-correct; documented for the Architect).

## 8. Exact cancellation root cause

- `main.mjs` `cron:project:relink` threw `new Error('Re-link cancelled')` when the dialog reported `canceled`.
- `handleIpcSafe` rethrows, so the renderer receives `Error invoking remote method 'cron:project:relink': Error: Re-link cancelled` — never the bare string.
- `store.relinkProject` matched `message === 'Re-link cancelled'` (exact string) — which can NEVER match the wrapped IPC message — then fell through to `set({ error: 'Re-link failed: ' + message })` → red banner. This is precisely the "string-matching as primary design" the task forbade.

## 9. Exact project-list disappearance root cause

Four compounding defects (each proven):

1. **Surprise picker on unarchive (Bug B).** `ipc-data-service.projects.unarchive()` delegated to `cron:project:relink`, which opens the native folder picker. Every flow that unarchives (`openProjectPath` existing-branch, `selectProject` archived-branch, `addProject`) could pop a second picker.
2. **Unguarded open branch (stuck loading).** `openProjectPath`'s existing-branch ran `unarchive()`/`selectProject()` outside any try/catch; a cancelled surprise picker threw, `isLoading` stayed `true` → `Loading project...` persisted, and Layout's `onSelectProject` catch surfaced the raw IPC error banner.
3. **Relink never restores (Bug C).** `relinkCodeProject` does not clear `archived`; the successful Meds re-link (audit 16:06:03) kept Meds archived → hidden.
4. **Archived canonical shadows the active duplicate (Bug D).** `reconcileProjects` picked the OLDEST record per folder as canonical even when archived, so the active duplicate Claims-296 was dropped from the visible list → sidebar `No projects yet` after restart.
5. **No last-active fallback (Bug E).** `restoreLastActiveProject` cleared the preference and returned when the last-active was archived → no active project after restart.

## 10. Re-link cancellation contract repair

- New pure module `apps/standalone/electron/relink-flow.mjs` — `resolveRelinkOutcome(dialogResult, projectId, linkRootPath)` returns a structured, first-class result:
  - `{ status: 'cancelled' }` for dialog cancel / empty selection (never throws);
  - `{ status: 'ok', project }` on success;
  - `{ status: 'conflict', project, conflictProjectId, conflictRootPath }` on conflict;
  - genuine invalid selections still throw (bounded visible error).
- `main.mjs` relink handler uses it; the `throw new Error('Re-link cancelled')` is gone.
- Host contract: `HostProjectActionResult` union; `performProjectAction` returns it; the standalone bridge passes through the relink result; the mock exposes a configurable result.
- Store `relinkProject` interprets the structured result: cancelled → exact no-op (no error, no mutation, no loading, no active/list change); conflict → concise `Re-link blocked: ...`; ok → reload from persisted state; genuine failure → `Re-link failed: ...` with the list intact.

## 11. Store/loading/error-state repair

- New pure IPC channel `cron:project:unarchive` (registered in main + `ALL_IPC_CHANNELS` + preload + ipc-data-service): unarchive is now a pure persistence operation — it NEVER opens a folder picker.
- `openProjectPath` existing-branch wrapped in try/catch with `finally { set({ isLoading: false }) }`; the unarchived record is refreshed in the in-memory projects array.
- `selectProject` archived-branch also refreshes the in-memory entry after unarchive.
- `relinkProject` never leaves loading active (no isLoading set; no early-return path skips cleanup).

## 12. Project-list preservation repair

- `reconcileProjects`: the canonical record per folder is now the oldest NON-archived record when any exists; an archived record never shadows a newer active duplicate. Archived duplicates stay in persistence (history preserved) and are excluded from navigation without reference remapping. Active duplicates still collapse deterministically (oldest active wins; `moves` remaps references).
- No project-management action replaces the loaded project array on failure: cancelled/conflict/error paths only touch `error`/`isLoading`; the last good `projects` collection is preserved.
- `ProjectManagementService.linkRootPath` unarchives an archived project before re-linking (restore + relink, preserving id/history; audits `project.restored` + `project.relinked`).

## 13. Last-active restoration proof

`restoreLastActiveProject` now:
- restores the valid non-archived available last-active project when present;
- otherwise falls back to the first available non-archived visible project (preference updated to the fallback);
- only clears the preference when NO available project exists;
- never clears or duplicates the project list.

Tests: valid restore ✓; archived last-active → fallback selected + pref updated ✓; only-archived → pref cleared + list intact ✓.

## 14. Restart preservation proof

- Unit/integration: restart/load re-runs `loadProjects` (persisted source of truth) + `restoreLastActiveProject`; project list preserved; no duplicates (reconcile).
- Live: after the repaired launcher relaunch (16:38-16:39), `store.json` still contains exactly the same 3 project records with the same archived flags; audit array unchanged (4 entries); only the preference file write occurred (LastWriteTime 16:39:02); the active duplicate `proj_1786063530296_t62fq0` remains the last-active preference and is the visible/restored project.

## 15. Re-link success/conflict/failure behavior

- **Success:** same project id; rootPath updates; history stays linked; active project stays active; list intact (test `successful relink keeps the same id, updates rootPath, keeps the active project and the list`).
- **Cancelled:** exact no-op (test asserts no error, no mutation, loading false, preference/list/active unchanged, no audit write).
- **Conflict:** concise `Re-link blocked: ...` error; no mutation (test).
- **Invalid selection:** main throws `PATH_REJECTED`-style error → bounded `Re-link failed: ...`; list intact (test).
- **Genuine host failure:** bounded error; `isLoading` cleared; list intact (test).

## 16. Live runtime verification

- Launcher relaunch (16:38:43): `Stale dev main detected` (hash `5c7dbd...` ≠ current `935E0097...`) → `replace-stale-electron (electron=37040 health=stale)` → fresh stack → `App ready (electron PID 41120, renderer-ready marker confirmed)`, exit 0.
- Marker: pid 41120, `windowReady: true`, `rendererReady: true`, `registrationError: null`, **34 channels** including `cron:project:unarchive` and `cron:project:relink`, all 8 required channels present.
- Store after launch: 3 project records identical (Meds archived, Claims-295 archived, Claims-296 active); audit still 4 entries (no accidental writes); preference = `proj_1786063530296_t62fq0` (valid active duplicate, restored as active).
- Port 5190 owned by repo Vite (25836); AUMID `com.cron.code.dev` live on renderer 13592; dev userData unchanged; exactly one owned dev Electron main (41120).
- Production CRON PIDs 9032/11552/25456/28260 untouched; unrelated CRON apps untouched (no launcher changes this slice).
- The actual native-dialog Cancel click is Venessa's manual step (CC cannot drive the native picker); the entire renderer→host→main→store chain is proven deterministically by the focused tests.

## 17. Tests/build/quality results

| Command | Exit | Result |
|---|---|---|
| `pnpm test` | 0 | 240 tests (contracts 24, host-adapter 23, data-service 74, core 119) |
| `pnpm typecheck` | 0 | all workspace packages clean |
| `pnpm lint` | 0 | 0 errors, 2 pre-existing warnings |
| `pnpm build` | 0 | packages + renderer built |
| `pnpm format:check` | 0 | no-op `echo ok` |
| launcher harness (`scripts/test-code-dev-launcher.ps1`) | 0 | all assertions pass |
| `node --check` (main.mjs, relink-flow.mjs, preload.cjs) | 0 | clean |
| `git diff --check` | 0 | clean |
| Narrow secret scan | 0 | no matches |
| Suspicious/generated-path scan | 0 | clean |

New focused tests:
- `packages/core/src/relink-flow.test.ts` (6): cancel/empty/null → `{ status: 'cancelled' }` no throw; ok; conflict; genuine failure propagates.
- `packages/core/src/project-management.test.tsx` (+9): cancel no-op (no error/mutation/loading/pref/audit); cancel → no red banner + no loading strip; success preserves id/rootPath/active/list; conflict bounded error + list intact; host failure bounded + loading cleared + list intact; `openProjectPath` on archived existing unarchives without any picker + clears loading; reconcile keeps active duplicate under archived canonical; restore fallback; restore with nothing available.
- `packages/host-adapter/src/standalone.test.ts` (+3): relink result pass-through (cancelled/conflict/ok); undefined → `{ status: 'ok' }`.
- `packages/core/src/repo-stabilisation.test.ts` (+3): cancellation structured non-error (no `throw new Error('Re-link cancelled')`); unarchive pure channel (registered + preload + ipc-service uses `project.unarchive`, no relink in unarchive body); relink-of-archived restores (linkRootPath unarchives first).

## 18. Exact files changed

- `apps/standalone/electron/main.mjs` — relink handler returns structured outcome via `resolveRelinkOutcome`; new `cron:project:unarchive` handler.
- `apps/standalone/electron/preload.cjs` — `project.unarchive` bridge.
- `apps/standalone/electron/register-ipc.mjs` — `ALL_IPC_CHANNELS` + `cron:project:unarchive` (34 channels).
- `apps/standalone/src/ipc-data-service.ts` — `HostRelinkResult` type; `unarchive` is picker-free; `setRootPath` handles structured result.
- `apps/standalone/src/main.tsx` — bridge returns structured results (relink pass-through).
- `packages/host-adapter/src/types.ts` — `HostProjectActionResult` union; `performProjectAction` returns it.
- `packages/host-adapter/src/standalone.ts` — bridge result pass-through + `{ status: 'ok' }` normalization.
- `packages/host-adapter/src/mock.ts` — configurable result.
- `packages/host-adapter/src/index.ts` — exports the new type.
- `packages/data-service/src/project-management.ts` — `linkRootPath` unarchives archived projects before relinking.
- `packages/core/src/store.ts` — `reconcileProjects` (active-canonical rule); `restoreLastActiveProject` (fallback); `openProjectPath` (guarded + finally); `selectProject` (in-memory refresh); `relinkProject` (structured results).
- `packages/core/src/project-management.test.tsx`, `packages/core/src/store.test.ts`, `packages/core/src/workspace-layout.test.tsx`, `packages/host-adapter/src/standalone.test.ts` — mock updates + new tests.
- `packages/core/src/repo-stabilisation.test.ts` — +3 static assertions.

## 19. Exact files created

- `apps/standalone/electron/relink-flow.mjs`
- `apps/standalone/electron/relink-flow.d.mts`
- `packages/core/src/relink-flow.test.ts`
- `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_REPORT.md`
- `CRON_CODE_RELINK_CANCEL_AND_PROJECT_LIST_REPAIR_EVIDENCE.md`

## 20. Protected boundaries preserved

Port `5190`; AUMID `com.cron.code.dev`; dev userData `CRON for Code Dev`; launcher and runtime-marker architecture (unchanged, marker stays healthy); all 8 required IPC handlers (unchanged set, still registered; +1 new pure channel); production CRON untouched; archival semantics (Meds/Claims-295 remain archived — deliberate user actions preserved); last-active semantics (with safe fallback); history preserved; task/approval/execution/audit/LM Studio data untouched; canonical-path deduplication rules preserved (active duplicates still collapse deterministically); sandbox/contextIsolation; narrow preload; shell layout; no new dependencies, no version changes, no store migration, no manual data recreation, no Git mutations.

## 21. Remaining gaps

1. The native-dialog Cancel click itself is Venessa's manual acceptance step; the full chain is covered by deterministic tests and the live marker/store proofs.
2. Meds and Claims-295 remain archived (their own Remove-from-CRON actions, audit-evidenced). To bring Meds back, Venessa re-adds it once via New Project → the Meds folder (the repaired flow restores history, no duplicates). If the Architect instead authorizes a one-time restore, that is a separate decision (out of this slice's scope).
3. `pnpm format:check` remains a no-op stub (pre-existing).

## 22. Final self-audit

Correct repo/branch/HEAD. Nothing staged. Working-tree counts: 37 modified / 3 deleted / 56 untracked (was 37/3/48; +8 this slice). Every changed path classified (source/launcher/tests/docs; no secrets). Pre-existing work preserved. Meds/Claims persisted records inspected read-only before any repair (see §7). Cancellation is a structured non-error result (relink-flow + tests). Cancellation causes no mutation (test). No red error on cancel (test asserts no status banner). Loading clears (finally + tests). Projects remain loaded after cancel/conflict/failure (tests). Active project stays active (tests). Last-active preference preserved/updated correctly (tests + live store). Restart restores the project list (live store unchanged + tests). No duplicates (reconcile rule + tests). Archived semantics unchanged (Meds/Claims-295 stay archived). Success/conflict/failure semantics distinct (tests). All 8 handlers still registered + `cron:project:unarchive` added (live marker). Runtime marker healthy (live). Port 5190, AUMID `com.cron.code.dev` (live). Production/unrelated processes untouched (live PIDs). Tests/build/lint/typecheck exit 0. `git diff --check` clean. Logs/reports updated. Exact prompt preserved. No prohibited Git action occurred.

## 23. Git safety statement

Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred. All Git commands were read-only.

## 24. Exact next action

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
