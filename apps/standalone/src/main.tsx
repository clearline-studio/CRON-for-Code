import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CronCodeApp, awaitFolderSelection } from '@cron-code/core';
import type { FolderPickerBridge } from '@cron-code/core';
import { createStandaloneHostAdapter } from '@cron-code/host-adapter';
import type { HostProjectAction, HostProjectActionResult } from '@cron-code/host-adapter';
import { createIpcDataService, createIpcLlmClient, createIpcOpenCodeRunnerClient, createIpcTrayClient } from './ipc-data-service.js';
import '@cron-code/design-tokens';

import shellBgUrl from '../branding/assets/cron_shell_background.png';
import logoUrl from '../branding/assets/code_logo_transparent.png';
// Locked spec §5: the small (505 KB) loop — the full-size loop stalls the top bar on load.
import logoVideoUrl from '../branding/assets/cron_logo_loop_small.mp4';
import flashVideoUrl from '../branding/assets/code_flash.mp4';

async function performProjectAction(action: HostProjectAction): Promise<HostProjectActionResult> {
  switch (action.kind) {
    case 'reveal':
      await window.cronHost.project.reveal(action.projectId);
      return { status: 'ok' };
    case 'copy-path':
      await window.cronHost.project.copyPath(action.projectId);
      return { status: 'ok' };
    case 'refresh':
      await window.cronHost.project.refresh(action.projectId);
      return { status: 'ok' };
    case 'rename':
      await window.cronHost.project.rename(action.projectId, action.nextName);
      return { status: 'ok' };
    case 'archive':
      await window.cronHost.project.archive(action.projectId);
      return { status: 'ok' };
    case 'relink':
      // The main process returns a structured result; cancellation is
      // { status: 'cancelled' } and must never become a thrown error here.
      return window.cronHost.project.relink(action.projectId);
    case 'restart':
      return { status: 'ok' };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return { status: 'ok' };
    }
  }
}

async function restartApp(): Promise<void> {
  await window.cronHost.app.restart();
}

async function bootstrap() {
  // Splash hold floor (design polish): the pre-React splash must be visible for
  // a ~3s minimum on both initial launch and restart so it never reads as a
  // glitchy 1s flash. The splash hides at max(3000ms, ready).
  const bootstrapStartedAt = performance.now();
  const rootEl = document.documentElement;
  rootEl.style.setProperty('--cron-shell-bg-image', `url(${JSON.stringify(shellBgUrl).slice(1, -1)})`);
  rootEl.style.setProperty('--cron-logo-url', `url(${JSON.stringify(logoUrl).slice(1, -1)})`);
  rootEl.style.setProperty('--cron-logo-video-url', `url(${JSON.stringify(logoVideoUrl).slice(1, -1)})`);
  rootEl.style.setProperty('--cron-flash-video-url', `url(${JSON.stringify(flashVideoUrl).slice(1, -1)})`);
  // Post-restart instances (relaunched by dev.mjs) carry restartHandoff in the
  // runtime marker; the renderer keeps the Restarting overlay visible from
  // first paint until the app is ready.
  const startupRestartHandoff = await window.cronHost.diag
    .marker()
    .then((diag) => !!diag.restartHandoff)
    .catch(() => false);
  const hostAdapter = createStandaloneHostAdapter({
    // The CRON folder browser modal settles this promise with the picked folder
    // (or null on cancel) via `settleFolderSelection`.
    selectFolder: () => awaitFolderSelection(),
    hostActionBridge: {
      perform: performProjectAction,
      restart: restartApp,
    },
  });

  // CRON-styled folder browser bridge: main-process directory listing plus
  // path validation for the final selection (replaces the raw OS dialog).
  const folderPicker: FolderPickerBridge = {
    list: (dir) => window.cronHost.fs.list(dir),
    confirm: (dir) => window.cronHost.selectFolder(dir),
  };

  const dataService = createIpcDataService({ storagePath: '' });

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <CronCodeApp
        deps={{
          dataService,
          hostAdapter,
          llm: createIpcLlmClient(),
          openCodeRunner: createIpcOpenCodeRunnerClient(),
          tray: createIpcTrayClient(),
          folderPicker,
          startupRestartHandoff,
          onUsable: () => {
            void window.cronHost.diag.usable().catch(() => undefined);
          },
        }}
      />
    </StrictMode>,
  );

  // Tell the main process the renderer bootstrapped (dev runtime marker readiness).
  void window.cronHost.diag.ready().catch(() => undefined);

  // Post-restart handoff: align the pre-React splash with the restart
  // narrative so the transition from the old window's Restarting screen to the
  // new window's first paint is continuous (one identical centered panel).
  const splash = document.getElementById('splash');
  if (splash && startupRestartHandoff) {
    const title = document.getElementById('splash-title');
    const message = document.getElementById('splash-message');
    const note = document.getElementById('splash-note');
    if (title) title.textContent = 'Restarting';
    if (message) message.textContent = 'Stopping and restarting CRON services...';
    if (note) note.textContent = 'The app will return to the project selection screen.';
  }

  // React's initial commit is synchronous; the root DOM is fully built by now.
  // Reveal the root immediately so the RestartOverlay (z-index 1000) covers the
  // splash in the same frame. Then hide the splash - the overlay spinner matches
  // the splash spinner exactly, so the transition is seamless (no second flash).
  const rootEl2 = document.getElementById('root');
  if (rootEl2) rootEl2.style.display = 'block';
  // Delay splash removal by one microtask so the overlay spinner is definitely
  // in the layout before the browser paints the next frame, and enforce the
  // ~3s minimum display (max(3000ms, ready)) on both launch and restart. On a
  // restart-handoff relaunch the RestartOverlay (z-index 1000) covers the
  // splash seamlessly and enforces its own 3s floor.
  const splashHoldMs = Math.max(0, 3000 - Math.round(performance.now() - bootstrapStartedAt));
  setTimeout(() => {
    const splashEl = document.getElementById('splash');
    if (splashEl) splashEl.style.display = 'none';
  }, splashHoldMs);
}

bootstrap().catch(() => {
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.style.display = 'block';
});
