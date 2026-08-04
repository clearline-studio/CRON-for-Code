import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CronCodeApp } from '@cron-code/core';
import { createStandaloneHostAdapter } from '@cron-code/host-adapter';
import { createIpcDataService } from './ipc-data-service.js';
import '@cron-code/design-tokens';

import shellBgUrl from '../branding/assets/cron_shell_background.png';
import logoUrl from '../branding/assets/code_logo_transparent.png';

async function bootstrap() {
  const rootEl = document.documentElement;
  rootEl.style.setProperty('--cron-shell-bg-image', `url(${JSON.stringify(shellBgUrl).slice(1, -1)})`);
  rootEl.style.setProperty('--cron-logo-url', `url(${JSON.stringify(logoUrl).slice(1, -1)})`);
  const hostAdapter = createStandaloneHostAdapter({
    selectFolder: () => window.cronHost.selectFolder(),
  });

  const dataService = createIpcDataService({ storagePath: '' });

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <CronCodeApp deps={{ dataService, hostAdapter }} />
    </StrictMode>,
  );

  const splash = document.getElementById('splash');
  if (splash) splash.style.display = 'none';
  const rootEl2 = document.getElementById('root');
  if (rootEl2) rootEl2.style.display = 'block';
}

bootstrap();
