# CRON for Code — Restart Reopen Visibility and Linger Repair

## Role

You are CC implementing an Architect-approved follow-up repair slice.

## User report

Venessa tested the latest restart transition repair:

> it also works but the restartscreen flashes too fast and opens minimised in taskbar

So the restart now works and the left-aligned flash appears fixed, but the final user experience is still not accepted:

- The Restarting screen disappears too quickly.
- The restarted Code window opens minimized / only on the taskbar instead of returning visible.

## Goal

Make the restart feel continuous and complete:

1. The centered Restarting screen appears immediately after clicking **CRON Restart**.
2. The Restarting screen lingers until the relaunched app is actually ready/opening.
3. The relaunched Code window opens visible, focused, and preferably maximized.
4. It must not sit minimized on the taskbar.
5. The final entry/open-or-resume screen appears only once styled and ready.
6. No duplicate app stack and no restart loop.

## Scope

Allowed:

- Inspect and adjust `apps/standalone/electron/main.mjs`, `apps/standalone/scripts/dev.mjs`, `scripts/run-code-dev-hidden.ps1`, and the renderer restart handoff timing.
- Improve Electron BrowserWindow show/focus/maximize/restore behavior on restart handoff.
- Improve the old-window close timing and/or launcher readiness handshake so the Restarting screen is not only a short flash.
- Add focused tests/source checks for the window state and linger contract where practical.
- Update `CRON_ARCHITECT_LOG.md`, `PROJECT_LOG.md`, and create report/evidence files.

Not allowed:

- Do not change port 5190.
- Do not change AppUserModelID/taskbar identity.
- Do not change project data, approval/execution safety, release gates, store schema, or command execution behavior.
- Do not add dependencies.
- Do not stage, commit, push, or open a PR.

## Required diagnosis

Before changing code, document:

- Where the old window decides to close.
- Where the restart handoff launches the new Electron window.
- Whether Electron creates the new window minimized, fails to restore it, fails to focus it, or Windows prevents focus.
- Why the Restarting screen only flashes briefly instead of staying visible until the new app is actually ready.

## Required behavior

After repair, Venessa should see:

`click Restart` → centered Restarting screen stays visible → relaunched Code window appears visible/focused/maximized → entry screen.

She should not have to click the taskbar icon to recover the app.

If Windows focus-stealing rules prevent absolute focus, make the safest possible behavior: restore/show/maximize the window and document the limit plainly.

## Verification

Run and report:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
git diff --check
git status --short --branch
```

Live proof required if possible:

- Launch through the real Code dev launcher.
- Click the visible Restart button.
- Capture/sample that the old window shows the Restarting screen long enough to be seen.
- Capture/sample that the relaunched window is visible/restored/maximized, not minimized.
- Prove no duplicate stack and no restart loop.

## Deliverables

Create:

- `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_REPORT.md`
- `CRON_CODE_RESTART_REOPEN_VISIBILITY_AND_LINGER_EVIDENCE.md`

Update:

- `PROJECT_LOG.md`
- `CRON_ARCHITECT_LOG.md`

No Git.
