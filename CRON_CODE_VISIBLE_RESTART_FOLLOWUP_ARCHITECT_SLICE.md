# CRON for Code — Visible Restart Follow-up Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User evidence

Venessa manually tested the previous restart/entry repair.

Accepted:
- CRON for Code now opens on the entry / open-or-resume project screen.

Rejected:
- Clicking the visible **CRON Restart** button still does not complete a usable restart.
- During restart, CRON for Code should show the same clear restart overlay pattern as the other CRON apps: a centered **Restarting** screen/dialog that remains visible while services are stopping/restarting.

Screenshot evidence:
- Code entry screen is visible and correct.
- Claims shows the desired restart UX pattern: darkened app, centered `CRON SYSTEM CONTROL` / `Restarting` modal, spinner, message `Stopping and restarting CRON services...`, disabled restart state.

## Objective

Fix the **actual visible Restart button path** for CRON for Code and add/keep a visible restart-in-progress screen while the app is restarting.

This is not accepted by source proof alone. Venessa must be able to click the visible Restart button and see the app come back usable.

## Required behavior

After repair:

1. Launch CRON for Code.
2. The first visible screen is still the entry/open-or-resume project screen.
3. Click the visible **CRON Restart** button.
4. A centered restart screen/dialog appears immediately and stays visible long enough to reassure the user.
5. The restart screen clearly says the app is restarting.
6. The Restart button cannot be double-clicked into duplicate restarts.
7. The app closes/relaunches or refreshes via the approved architecture.
8. The app returns visible and usable.
9. It returns to the entry/open-or-resume project screen after restart.
10. No blank window.
11. No duplicate broken instance.
12. Other CRON apps and ports are untouched.

## Important diagnosis requirement

Do not rely only on the previous hook-driven proof.

Find why Venessa's **visible button click** still fails:

- Is the button wired to the wrong store action?
- Is the renderer not awaiting/showing restart state?
- Is the IPC path not triggered by the visible button?
- Does the app quit before the overlay paints?
- Does the supervisor only handle test-hook restart but not UI restart?
- Does the restart intent get written but not consumed?
- Does the restart work but take too long with no visible state?

Document the exact cause with evidence.

## UI requirement

Use the same visual language as the Claims restart modal where practical:

- darkened background;
- centered restart panel;
- title/eyebrow similar to `CRON SYSTEM CONTROL`;
- `Restarting`;
- spinner/loading icon;
- plain-English message;
- disabled/restarting button state.

Keep it consistent with Code styling and do not redesign unrelated UI.

## Must preserve

- entry/open-or-resume screen behavior;
- project data;
- command execution safety model;
- approval/release safety model;
- port `5190`;
- AppUserModelID `com.cron.code.dev`;
- package dependencies unless truly unavoidable;
- unrelated UI and workflows;
- Git untouched.

## Verification

Run and report:

- focused tests you add/update for visible restart UI and wiring;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live/manual proof required:

- launch through the real CRON for Code Dev launcher/shortcut;
- start on entry screen;
- trigger the same path as the visible Restart button, and if direct UI clicking is not tool-accessible, prove the rendered button calls the same handler and explain the limitation clearly;
- show/verify the restart overlay appears before shutdown;
- verify the app returns usable on the entry screen;
- verify no duplicate Code instance and other CRON apps untouched.

## Deliverables

Create:

- `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_REPORT.md`
- `CRON_CODE_VISIBLE_RESTART_FOLLOWUP_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim accepted until the visible Restart path is fixed enough for Venessa to manually click it and see:

- restart screen appears;
- app comes back;
- entry screen returns.

No Git.
