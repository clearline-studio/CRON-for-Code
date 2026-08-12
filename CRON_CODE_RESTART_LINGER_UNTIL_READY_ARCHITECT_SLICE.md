# CRON for Code — Restart Overlay Linger Until Ready

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User acceptance so far

Venessa manually tested the visible restart follow-up and confirmed:

- the restart button now works;
- the restart screen appears;
- the app comes back.

Remaining issue:

- the restart screen should linger until the app has actually started again, so the user is not left staring at a gap or wondering whether restart failed.

## Objective

Make the CRON for Code restart experience feel continuous:

1. User clicks **CRON Restart**.
2. A visible centered **Restarting** screen appears immediately.
3. That restart screen stays visible while the app is shutting down/relaunching.
4. The restarted app should not expose a blank/intermediate state before it is ready.
5. Once the relaunched app is ready, it should show the entry/open-or-resume project screen.

## Required behavior

After repair:

1. Launch CRON for Code.
2. Confirm it opens on the entry/open-or-resume project screen.
3. Click the visible **CRON Restart** button.
4. The Restarting screen appears and remains visible long enough to cover the relaunch gap.
5. The user should not see a blank dark window, half-loaded canvas, or confusing pause after the overlay disappears.
6. The app returns to the entry/open-or-resume screen, visible and usable.
7. No duplicate broken instance.
8. No restart loop.
9. Other CRON apps and ports are untouched.

## Implementation guidance

- Keep the existing restart overlay design.
- Prefer a startup/relaunch readiness handoff over a fixed delay if the architecture supports it.
- If a fixed minimum display time is still needed, keep it conservative and explain why.
- Do not redesign unrelated Code UI.
- Do not change project data, command safety, approvals, release gates, or port `5190`.
- Do not touch Git.

## Verification

Run and report:

- focused tests for the restart overlay/startup readiness behavior;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live/manual proof required:

- launch through the real CRON for Code Dev launcher/shortcut;
- click the same visible restart path;
- prove the overlay remains present until shutdown/relaunch readiness is covered;
- prove the relaunched app lands on the entry/open-or-resume screen;
- prove no blank window, duplicate instance, or restart loop.

## Deliverables

Create:

- `CRON_CODE_RESTART_LINGER_UNTIL_READY_REPORT.md`
- `CRON_CODE_RESTART_LINGER_UNTIL_READY_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim accepted until the visible restart path works and the restart screen covers the whole wait cleanly enough for Venessa to manually confirm.

No Git.
