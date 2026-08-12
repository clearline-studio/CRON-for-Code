# CRON for Code — Project Picker Load Regression Repair Report

**Executed by:** CC/OpenCode (approved narrow defect-repair slice)
**Date:** 2026-08-07 08:55 +10:00
**Repository:** `C:\Users\venes\projects\CRON APPS\CRON for Code`
**Task file:** `CRON_for_Code_Project_Picker_Load_Regression_Repair_Prompt.md`
**Classification:** `READY FOR ARCHITECT REVIEW`

---

## 1. Final status

`READY FOR ARCHITECT REVIEW`

## 2. Repository identity

Branch `main`, HEAD `8157b127f5739f02fcfe04fec745666392c67f5e` (`feat-refine-cron-shell-layout`), upstream `main -> origin/main` (0/0). Remote `origin` = `https://github.com/clearline-studio/CRON-for-Code.git`. Nothing staged.

## 3. Verification input used

Full verbatim task prompt stored in `CRON_CODE_PROJECT_PICKER_LOAD_REGRESSION_EVIDENCE.md` (`## Verification Input Used — Verbatim`).

## 4. Complete CRON Architect Log — Verbatim

See section 4 of this report's final response — the file `CRON_ARCHITECT_LOG.md` is included verbatim in the response body (now 8 checkpoints; this slice appends the `Project Picker Load Regression Repair — 2026-08-07 08:55` entry).

## 5. Initial working-tree state

Pre-slice: 31 modified / 3 deleted / 41 untracked, nothing staged, `git diff --check` clean. Post-slice: 31 modified / 3 deleted / 44 untracked (+3 new files), nothing staged.

## 6. User-tested defect

Venessa: selecting a valid project folder after clicking New Project did not load the project, did not activate it, did not update the sidebar, and showed no error.

## 7. Root cause

Proven by runtime reproduction with the real built packages (`node .runtime\picker-repro.mjs`), not guessed:
1. `App.onSelectProject` discarded the returned selection and relied on an unawaited `project-selected` event → `openProjectPath`.
2. `openProjectPath` used a dynamic `import('@cron-code/contracts')` (latency/failure point) and deduped only against in-memory state — a second selection racing the first's in-flight open created duplicate persisted records (2 "CRON for Meds" records reproduced).
3. Every failure was written to the store `error` field, which no component rendered (silent); a picker failure was an unhandled rejection.
4. No loading/optimistic state — the open took ~500–600 ms with zero feedback, so a normal click looked like a no-op.

The data layer, host-adapter bridge, preload, IPC, `reconcileProjects`, and `selectProject` were verified correct.

## 8. Exact repair

- `App.tsx`: `onSelectProject` awaits the returned selection and opens it directly; errors surfaced via `setError`. Event listener retained as an idempotent secondary path.
- `store.ts`: static imports for `createCodeProject`/`createTask`; `openProjectPath` guards non-string inputs, sets `isLoading`, dedupes against in-memory + persisted projects; `addProject` dedupes against persisted projects; `selectProject` clears `isLoading`.
- `ErrorBanner.tsx` + `Layout.tsx`: store `error`/`isLoading` rendered as a visible dismissible banner.
- `index.ts`: export `ErrorBanner`.

## 9. Folder-picker bridge proof

`packages/host-adapter/src/standalone.test.ts` (5 tests): success returns `{rootPath, name}` + emits `project-selected`; cancelled returns `null` with no event; picker failure propagates (no silent swallow); name derived from last path segment incl. trailing separators; unsubscribe works. Preload exposes only the approved `selectFolder` bridge (no raw `ipcRenderer`); main returns `path.resolve(filePaths[0])` or `null`.

## 10. Project activation and deduplication proof

`packages/core/src/project-picker.test.tsx` (10 tests, real data-service + real host adapter + real store): a valid selection activates immediately and persists; same folder (case/slash/trailing variants) reconciles to one canonical record; re-selecting a persisted folder reactivates without a duplicate; switching folders loads + activates; cancelled picker is a safe no-op; picker failure sets a visible error; EmptyState New Project invokes the handler; ErrorBanner renders + dismisses + loading note; persisted reload creates no duplicate. `addProject`/`openProjectPath` now dedup against persisted data, closing the duplicate race.

## 11. Persistence proof

After adding projects: destroy + reload the json store → both projects remain, no duplicates; reload into a fresh store keeps `projectCount` at the canonical count. Regression: task creation, approval/execution wiring, chat, and sidebar suites unchanged and green.

## 12. Runtime verification

`scripts\run-code-dev-hidden.ps1 -Port 5190` → exit 0 (`fresh-start`, app-ready; stale state correctly detected and replaced). Dev server 5190 → 200 (owned Vite PID 52140). Renderer AUMID `com.cron.code.dev` verified live. Production CRON for Code PIDs 9032/11552/25456/28260 untouched. LM Studio 200. No unrelated process terminated. Interactive dialog selection in the running window is Venessa's step (not claimed by CC); the full picker→bridge→store→persist flow is proven with the real built packages.

## 13. Tests, build, lint, typecheck, and quality results

| Command | cwd | Exit | Result |
|---|---|---|---|
| `pnpm test` | repo root | 0 | 166 tests (contracts 20, host-adapter 10, data-service 74, core 62) |
| `pnpm typecheck` | repo root | 0 | all 7 packages clean |
| `pnpm lint` | repo root | 0 | 0 errors, 2 pre-existing warnings |
| `pnpm build` | repo root | 0 | packages + standalone renderer built |
| `pnpm format:check` | repo root | 0 | no-op `echo ok` (pre-existing) |
| `git diff --check` | repo root | 0 | clean |
| secret scan | repo root | 0 | no matches |
| launcher runtime check | repo root | 0 | fresh-start exit 0; dev server 200; AUMID unchanged |

New focused tests: host-adapter standalone bridge (5) + core project-picker integration (10). Regression suites green.

## 14. Exact files changed

`packages/core/src/store.ts`, `packages/core/src/components/App.tsx`, `packages/core/src/components/Layout.tsx`, `packages/core/src/index.ts`.

## 15. Exact files created

`packages/core/src/components/ErrorBanner.tsx`, `packages/core/src/project-picker.test.tsx`, `packages/host-adapter/src/standalone.test.ts`. (Gitignored local-only repro scripts in `.runtime/`: picker-repro.mjs, picker-debug.mjs, picker-debug2.mjs, dynimport-check.mjs.)

## 16. Protected boundaries preserved

Workspace hierarchy repair; port 5190; AUMID `com.cron.code.dev`; launcher + shortcut; LM Studio wiring; safe execution harness; approval semantics; command catalogue; audit persistence; IPC security model; project deduplication rules (kept, strengthened); storage format unchanged; no new dependencies; no OpenCode; no shell redesign.

## 17. Remaining gaps

1. Live interactive dialog verification in the running window is Venessa's manual step.
2. Last-active-project restore on startup remains unimplemented (pre-existing intended behavior — unchanged by this slice).
3. `pnpm format:check` remains a no-op stub (pre-existing).

## 18. Final self-audit

Correct repo/branch/HEAD. Nothing staged. 31 modified / 3 deleted / 44 untracked (was 41; +3 new files, all this slice's tests/component). Only authorised files changed; pre-existing work preserved. Folder picker returns a valid path; valid project loads + activates immediately; sidebar/workspace render (store `activeProjectId`); duplicate selection reuses canonical; cancellation safe; errors visible (ErrorBanner); persistence works after restart; hierarchy + task/approval/execution wiring intact; LM Studio + launcher + port 5190 + AUMID unchanged. Tests/build/lint/typecheck pass exit 0; `git diff --check` clean; secret + suspicious-path scans pass.

## 19. Git safety statement

Explicitly confirmed: nothing staged, nothing committed, nothing pushed, no prohibited Git or release action occurred. All Git commands were read-only.

## 20. Exact next action

`Return this complete report to the CRON Architect for review. Do not begin another Code task until Venessa approves the Architect's next CC prompt.`
