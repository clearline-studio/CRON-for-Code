# CRON for Code — Runtime Acceptance Architect Slice

Status: Approved Architect slice  
Owner: Venessa Olivier  
Lane: Code — runtime safety lane  
Date: 2026-08-09

---

## Plain-English Goal

Prove CRON for Code can reliably open, restart, remember projects, and show its approval/execution surfaces without blank windows, missing controls, or scary silent failures.

This slice is about trust. Do not expand the app into broader agent execution until the runtime foundation is accepted.

---

## Approved Scope

CC may verify and repair only the current runtime acceptance path:

- Dev app launch from the approved shortcut/launcher.
- In-app restart returning to visible content.
- Project list preservation and last-active project restoration.
- Folder picker cancellation behaving like a quiet cancel, not an error.
- Approval and execution surfaces visible enough to prove the foundation exists.
- Runtime health markers and IPC registration working as designed.
- Plain error messages if something genuinely fails.
- Focused tests/evidence for the acceptance path.
- Update `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`, and report/evidence files.

---

## Out of Scope

Not approved:

- No OpenCode integration.
- No broad autonomous agent execution.
- No arbitrary command entry.
- No Git release gate.
- No dependency changes.
- No package-manager changes.
- No port, icon, AppUserModelID, launcher identity, or packaging changes unless a defect in this exact acceptance path makes it unavoidable and Architect re-approves.
- No staging, commit, push, release, reset, or cleanup.

---

## Acceptance Journey

This slice is accepted only when:

1. CRON for Code launches from the dev shortcut.
2. The main window renders visible content.
3. Known projects appear.
4. Selecting a project does not duplicate it.
5. Re-link cancel is quiet and does not clear the project list.
6. In-app restart closes and reopens to visible content.
7. Approval/execution surfaces are visible and safe.
8. No unrelated CRON app is stopped or hijacked.

---

## Verification Gate

Before completion is claimed:

- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm lint` passes or any remaining warnings are plainly classified.
- `pnpm build` passes.
- `git diff --check` passes.
- Current git status is reported.
- Runtime proof is recorded in evidence.
- No Git action is performed.

If a check fails, CC fixes it inside the slice and explains the issue plainly. Venessa is not expected to debug it.

---

## Architect Notes

The current README says real task/agent execution, approval UI gates, Git release gate, and OpenCode integration are not yet implemented. Do not blur that line.

The priority is reliability before power.

