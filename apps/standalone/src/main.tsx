import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CronCodeApp } from '@cron-code/core';
import { createStandaloneHostAdapter } from '@cron-code/host-adapter';
import type { HostProjectAction, HostProjectActionResult } from '@cron-code/host-adapter';
import { createIpcDataService, createIpcLlmClient, createIpcOpenCodeRunnerClient } from './ipc-data-service.js';
import '@cron-code/design-tokens';

import shellBgUrl from '../branding/assets/cron_shell_background.png';
import logoUrl from '../branding/assets/code_logo_transparent.png';

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
  const rootEl = document.documentElement;
  rootEl.style.setProperty('--cron-shell-bg-image', `url(${JSON.stringify(shellBgUrl).slice(1, -1)})`);
  rootEl.style.setProperty('--cron-logo-url', `url(${JSON.stringify(logoUrl).slice(1, -1)})`);
  // Post-restart instances (relaunched by dev.mjs) carry restartHandoff in the
  // runtime marker; the renderer keeps the Restarting overlay visible from
  // first paint until the app is ready.
  const startupRestartHandoff = await window.cronHost.diag
    .marker()
    .then((diag) => !!diag.restartHandoff)
    .catch(() => false);
  const hostAdapter = createStandaloneHostAdapter({
    selectFolder: () => window.cronHost.selectFolder(),
    hostActionBridge: {
      perform: performProjectAction,
      restart: restartApp,
    },
  });

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
  // in the layout before the browser paints the next frame.
  setTimeout(() => {
    const splashEl = document.getElementById('splash');
    if (splashEl) splashEl.style.display = 'none';
  }, 0);
}

bootstrap().catch(() => {
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.style.display = 'block';
});
