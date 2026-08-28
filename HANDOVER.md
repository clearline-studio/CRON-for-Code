# HANDOVER — CRON for Code

## Current verified state

- Repo: `C:\Users\venes\projects\CRON APPS\CRON for Code` — pnpm monorepo
  (packages: core, contracts, data-service, host-adapter + apps/standalone +
  shared). Branch `main`, plus an uncommitted UI-redesign build slice (35 files
  snapshotted to `backups/pre-alignment-20260828/` — untouched, stays dirty for
  the Code session).
- Product: governed AI coding workspace (OpenCode engine wrapper). Design truth:
  `CRON_CODE_UI_REDESIGN_SPEC.md` + `CRON_CODE_UI_REDESIGN_AUDIT.md`.

## Completed

- 28 Aug alignment: charter (Code), reference/ pack, launcher standardised
  (`launch.vbs` → `scripts\run-code-dev-hidden.ps1`; taskbar pin updated;
  `.bat` retired to `_dump_`), 65 legacy CC/Architect slice docs retired to
  `_dump_` (old MIMO/CC bridge log, session starters, report+evidence pairs),
  `.bak` files → `backups/`, gitignore updated. README kept as-is (good).

## Parked

- The uncommitted UI-redesign slice — the Code session commits it at its
  boundary. Snapshot safe in `backups/`.

## Genuine defect / unresolved

- None known in verified state. Standard verification for this repo:
  `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`.

## Single next step

- Continue the UI redesign per SPEC/AUDIT; commit the slice at its boundary
  with typecheck/lint/test/build green.

## Evidence

- PROJECT_LOG.md (newest-first), README.md, launcher chain, renames verified.
