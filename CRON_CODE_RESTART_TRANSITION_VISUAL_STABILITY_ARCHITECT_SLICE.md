# CRON for Code — Restart Transition Visual Stability Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

Venessa does not read code. Keep reports plain-English and evidence-based.

## User evidence

Venessa manually tested the restart-linger repair and rejected the visual result:

- Restart begins.
- The restart screen disappears.
- Another screen briefly pops in all left-aligned for a second.
- Then the app opens.

This means the restart handoff may be technically present, but the visual transition is not acceptable.

## Objective

Make the restart transition visually continuous and centered from click through relaunch readiness.

## Required behavior

After repair:

1. Click **CRON Restart**.
2. The centered Restarting screen appears.
3. The user never sees a blank screen, left-aligned interim layout, unstyled content, or half-loaded shell.
4. The relaunched app either keeps the same centered Restarting/Preparing screen visible or shows a polished centered splash while booting.
5. The final entry/open-or-resume screen appears only after it is styled and ready.
6. No duplicate instance.
7. No restart loop.
8. Other CRON apps and ports are untouched.

## Diagnosis requirement

Find exactly what the left-aligned flash is:

- unstyled React content before CSS loads;
- a fallback/root splash with missing centering;
- the restart overlay mounted before shell layout styles;
- the app rendering entry content before initialization completes;
- a separate Electron window/splash state;
- or a race between marker handoff and renderer initialization.

Document the exact cause with evidence.

## Repair guidance

- Fix the visual handoff, not the general Code UI.
- Keep the restart overlay design consistent with Claims/Code.
- If a pre-React or pre-CSS splash is needed, make it centered and branded in `index.html`/base CSS so there is no unstyled flash.
- Ensure the entry screen is only revealed when ready and styled.
- Keep port `5190`, AppUserModelID, project data, approvals, release gates, and safety model unchanged.
- No Git.

## Verification

Run and report:

- focused tests/source checks for no left-aligned restart interim state;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build`;
- `pnpm format:check`;
- `git diff --check`;
- `git status --short`.

Live proof required:

- launch through the real Code dev launcher;
- click the visible Restart button;
- capture/screenshot/sample the old-window restart state;
- capture/screenshot/sample the relaunched first-painted state;
- prove no left-aligned interim content is visible;
- prove final entry screen appears only after the app is ready.

## Deliverables

Create:

- `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_REPORT.md`
- `CRON_CODE_RESTART_TRANSITION_VISUAL_STABILITY_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

## Completion standard

Do not claim complete until Venessa can click Restart and see a clean continuous centered restart experience with no left-aligned flash.

No Git.
