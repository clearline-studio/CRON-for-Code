# CRON for Code — Re-link Cancellation and Project-List Preservation Repair — Evidence

**Executed by:** CC/OpenCode (approved narrow runtime defect-repair slice)
**Date:** 2026-08-07 16:20 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Branch / HEAD:** `main` / `8157b127f5739f02fcfe04fec745666392c67f5e`
**Task class:** Approved narrow runtime defect-repair slice.

---

## Verification Input Used — Verbatim

The exact task prompt used for this slice is stored verbatim in `CRON_ARCHITECT_LOG.md` (Re-link Cancellation and Project-List Preservation Repair checkpoint, `### Verification Input Used — Verbatim`). It is the complete content of `CRON_for_Code_Relink_Cancellation_and_Project_List_Preservation_Repair_Prompt.md` as issued.

---

## Repository identity (verified 2026-08-07 16:20 +10:00)

```
Branch: main
HEAD:   8157b127f5739f02fcfe04fec745666392c67f5e (feat-refine-cron-shell-layout)
Upstream: main -> origin/main (ahead/behind 0/0)
Staged: none
```

## Initial working-tree state (captured before edits)

```
Modified: 37   Deleted: 3   Untracked: 53   (93 changes total)
Staged: none
```

## 1. Persisted dev store proof (read-only, BEFORE any edit)

Path: `C:\Users\venes\AppData\Roaming\CRON for Code Dev\cron-for-code-data\store.json`
Length 3083, LastWriteTime 2026-08-07 16:06:22. Raw content (key fields):

```json
{
  "version": 1,
  "projects": {
    "proj_1786050841183": { "name": "CRON for Meds", "rootPath": "C:\\Users\\venes\\projects\\CRON APPS\\CRON for Meds", "availability": "available", "archived": true, "updatedAt": 1786082763607 },
    "proj_1786063530295_4ir189": { "name": "CRON for Claims", "rootPath": "C:\\Users\\venes\\projects\\CRON APPS\\CRON for Claims", "availability": "available", "archived": true },
    "proj_1786063530296_t62fq0": { "name": "CRON for Claims", "rootPath": "C:\\Users\\venes\\projects\\CRON APPS\\CRON for Claims", "availability": "available", "archived": false }
  },
  "tasks": {}, "approvals": {}, "executions": {},
  "audit": [
    { "eventType": "project.archived", "projectId": "proj_1786063530295_4ir189", "timestamp": 1786082697287 },
    { "eventType": "project.archived", "projectId": "proj_1786050841183", "timestamp": 1786082702842 },
    { "eventType": "project.relinked", "projectId": "proj_1786050841183", "timestamp": 1786082763989 },
    { "eventType": "app.restart_requested", "timestamp": 1786082782539 }
  ],
  "preferences": { "lastActiveProjectId": "proj_1786050841183" }
}
```

### Where the projects went (proven)

| Cause | Evidence |
|---|---|
| Meds + Claims-295 archived | `project.archived` audits (the only writer of that event is the Remove-from-CRON confirm path) — deliberate user actions |
| Meds re-linked but stayed hidden | `project.relinked` audit + `archived: true` persisting after re-link (`relinkCodeProject` never clears `archived`) |
| Active duplicate Claims-296 hidden | `reconcileProjects` picked oldest record per path (Claims-295, archived) as canonical → active Claims-296 dropped from the visible list → `No projects yet` |
| No active project after restart | `restoreLastActiveProject` cleared the pref without fallback when last-active was archived |
| Red banner on Cancel | main threw `Re-link cancelled`; `handleIpcSafe` wrapped it; store exact-match failed → `error` set |
| `Loading project...` stuck | `openProjectPath` existing-branch unguarded; surprise unarchive picker (unarchive → relink IPC) cancel threw; `isLoading` never cleared |

## 2. Exact code-boundary proof (before repair)

- `main.mjs` relink handler: `if (dialogResult.canceled || ...) { throw new Error('Re-link cancelled'); }` — cancel = exception.
- `ipc-data-service.ts` `unarchive(id)`: `return window.cronHost.project.relink(id).then((r) => r.project);` — unarchive OPENS THE FOLDER PICKER.
- `store.ts` `relinkProject` catch: `if (message === 'Re-link cancelled') return;` — never matches the wrapped IPC message → `set({ error: 'Re-link failed: ' + message })` (red banner).
- `store.ts` `openProjectPath`: `if (existing) { if (existing.archived) await dataService.projects.unarchive(existing.id); await get().selectProject(existing.id); set({ isLoading: false }); return; }` — the `unarchive`/`selectProject` calls sit OUTSIDE try/catch; a cancel throws and skips `set({ isLoading: false })` → `Loading project...` forever; the throw propagates to Layout's `onSelectProject` catch → red banner with the raw IPC error text.

## 3. Command results

All commands run from repo root `C:\Users\venes\projects\CRON APPS\CRON for Code` unless noted. Times local (+10:00).

| # | Command | Time | Exit | Result |
|---|---|---|---|---|
| 1 | `git status --porcelain --branch` / `git rev-parse HEAD` | 16:20 | 0 | main / 8157b12 |
| 2 | dev store read-only inspection (above) | 16:20 | 0 | 3 project records; audits; pref |
| 3 | live stack + marker inspection | 16:20 | 0 | electron 37040 (old main hash 5c7dbd56), 33 channels, prod PIDs 9032/11552/25456/28260 |
| 4 | `node --check` main.mjs / relink-flow.mjs / preload.cjs | 16:27 | 0 | clean |
| 5 | `pnpm typecheck` | 16:28 | 1 | host-adapter test helper return type (fixed) |
| 6 | `pnpm typecheck` (after host-adapter rebuild) | 16:30 | 0 | all packages clean |
| 7 | vitest relink-flow + main-ipc-registration | 16:31 | 0 | 17 tests |
| 8 | vitest project-management.test.tsx | 16:32 | 0 | 29 tests |
| 9 | vitest workspace-layout.test.tsx | 16:32 | 1 | em-dash mojibake from my PS bulk edit (fixed with UTF-8-safe edit) |
| 10 | `pnpm --filter @cron-code/core test` | 16:34 | 0 | 119 tests |
| 11 | `pnpm test` | 16:35 | 0 | 240 tests (24+23+74+119) |
| 12 | `pnpm lint` | 16:36 | 0 | 0 errors, 2 pre-existing warnings |
| 13 | `pnpm build` | 16:36 | 0 | packages + renderer |
| 14 | `pnpm format:check` + launcher harness | 16:37 | 0 | no-op ok / all pass |
| 15 | live launcher relaunch (repair) | 16:38 | 0 | stale 37040 replaced; fresh stack electron 41120; marker ready |
| 16 | live verification (marker/store/port/AUMID/prod) | 16:39 | 0 | see below |
| 17 | `git diff --check` + narrow secret scan | 16:40 | 0 | clean |

## 4. Failed attempts (recorded)

1. **Host-adapter helper type** — `makeAdapter` `perform` typed `Promise<void>` vs new `Promise<HostProjectActionResult>` (typecheck). Fixed signature.
2. **Repo-stabilisation negative regex** — `not.toMatch(/unarchive\(id\)[\s\S]{0,200}cronHost\.project\.relink/)` matched via the inner `unarchive(id)` call (194 chars to the relink in setRootPath). Replaced with a precise positive assertion `async unarchive(id)...cronHost\.project\.unarchive`.
3. **PS 5.1 bulk-edit corruption** — `Set-Content -Encoding UTF8` after `Get-Content -Raw` (ANSI read) corrupted the em dash in `workspace-layout.test.tsx` (`Assistant — supporting help` became em-dash mojibake). Fixed with a UTF-8-safe Edit; verified the other two files are clean (mojibake scan).
4. **Stale main on live app** — the running app (16:07) carried the previous slice's main; the launcher correctly classified it stale (hash mismatch) and replaced it (16:38) — no code failure.

## 5. Live runtime proof (16:38-16:39)

```
Launcher log:
[16:38:43] Stale dev main detected ... current main hash=935E0097... marker main hash=5c7dbd56...
[16:38:43] Lifecycle decision: replace-stale-electron (vite=50992 electron=37040 dev=49204 health=stale).
[16:38:44] Stale Electron stopped. Proceeding with replacement.
[16:38:45] Starting a fresh dev stack on port 5190.
[16:39:04] App ready (electron PID 41120, renderer-ready marker confirmed). Launcher completed.
```

Marker (after): `pid=41120 windowReady=true rendererReady=true registrationError=null channels=34`
- `cron:project:unarchive` registered: true; `cron:project:relink` registered: true; 8/8 required channels present.

Store (after launch): project records 3/3 identical (Meds archived, Claims-295 archived, Claims-296 active); audit entries 4 (unchanged); `lastActiveProjectId = proj_1786063530296_t62fq0` (valid active record — restored as active); store LastWriteTime 16:39:02 (preference write only).

Port 5190 owned by repo Vite 25836. Renderer 13592 AUMID `com.cron.code.dev`. Exactly one owned dev Electron main (41120). Production PIDs 9032/11552/25456/28260 untouched.

## 6. Conclusion-to-evidence mapping

| Requirement | Evidence |
|---|---|
| Cancel is structured non-error | relink-flow.mjs `{ status: 'cancelled' }`; 6 unit tests; main.mjs no longer throws on cancel (static assertion) |
| No red error on cancel | store test: `status-banner` absent after cancelled relink |
| Loading clears | openProjectPath `finally { isLoading: false }` + test |
| No mutation on cancel | store test: error null, projects/active/pref/rootPath/availability/archived unchanged, no relink/archive audit |
| Projects remain loaded on failure | store tests (conflict + host failure): list intact |
| Active project preserved | store tests |
| Last-active fallback | restore tests: valid → restored; archived → fallback; none → pref cleared, list intact |
| Restart preserves list + active | live: store unchanged after relaunch; pref = valid active duplicate |
| No duplicates | reconcile rule (oldest active canonical) + test |
| Archived semantics unchanged | Meds/Claims-295 remain archived (deliberate actions preserved); relink of archived now restores (test) |
| Success/conflict/failure distinct | store tests + relink-flow tests |
| All 8 handlers + marker healthy | live marker 8/8, 34 channels, rendererReady |
| Port/AUMID/prod untouched | live port 5190, AUMID, prod PIDs |
| No store migration / no manual recreation | none performed; records preserved as-is |

## Final self-audit confirmation

- Correct repo/branch/HEAD; nothing staged; pre-existing work preserved.
- Meds/Claims persisted records inspected read-only before repair (§1).
- Cancellation structured non-error; no mutation; no red error; loading clears; projects remain loaded; active project remains; preference preserved/fallback correct; restart restores list; no duplicates; archived semantics unchanged; success/conflict/failure distinct; 8 handlers + `cron:project:unarchive` registered; marker healthy; port 5190; AUMID `com.cron.code.dev`; production/unrelated untouched.
- Tests/build/lint/typecheck exit 0; `git diff --check` clean; secret + suspicious-path scans clean; logs/reports updated; exact prompt preserved; no prohibited Git action occurred.

