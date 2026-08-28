import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';

// Repo-stabilisation and dev-launcher focused tests.
// These verify repository-level invariants (gitignore policy, lint baseline,
// launcher files/behaviour) and that stabilisation did not regress the
// cloud-first model routing, Ollama fallback, or dev/production userData separation.

function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('CRON for Code repo root not found');
    dir = parent;
  }
}

const REPO_ROOT = findRepoRoot(process.cwd());

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function repoPathExists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function isGitIgnored(relativePath: string): boolean {
  const result = spawnSync('git', ['check-ignore', '-q', '--no-index', relativePath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return result.status === 0;
}

function run(command: string, args: string[], cwd: string, timeout: number) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
      cwd,
      encoding: 'utf8',
      timeout,
    });
  }
  return spawnSync(command, args, { cwd, encoding: 'utf8', timeout });
}

function runEslintOverRepo(timeoutMs: number): Promise<{ status: number | null; stdout: string; stderr: string }> {
  const eslintBin = join(REPO_ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
  return new Promise((resolve) => {
    const child: ChildProcess = spawn(process.execPath, [eslintBin, '.', '--ext', '.ts,.tsx,.mjs,.cjs'], {
      cwd: REPO_ROOT,
    });
    let stdout = '';
    let stderr = '';
    const killTimer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err: Error) => {
      clearTimeout(killTimer);
      resolve({ status: null, stdout, stderr: `${stderr}\n${String(err)}` });
    });
    child.on('close', (code: number | null) => {
      clearTimeout(killTimer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

const LAUNCHER_FILES = [
  'launch.vbs',
  'scripts/run-code-dev-hidden.ps1',
  'scripts/create-code-dev-shortcut.ps1',
];

describe('repository stabilisation', () => {
  it('shared/design-tokens is no longer ignored', () => {
    expect(isGitIgnored('shared/design-tokens/index.css')).toBe(false);
    expect(isGitIgnored('shared/design-tokens/package.json')).toBe(false);
  });

  it('secret and token file patterns remain ignored', () => {
    expect(isGitIgnored('apps/standalone/secret-test.pem')).toBe(true);
    expect(isGitIgnored('apps/standalone/auth.token')).toBe(true);
    expect(isGitIgnored('apps/standalone/token-secret.json')).toBe(true);
    expect(isGitIgnored('apps/standalone/credentials-backup.txt')).toBe(true);
    expect(isGitIgnored('apps/standalone/private.key')).toBe(true);
  });

  it('generated dist-renderer output is ignored', () => {
    expect(isGitIgnored('apps/standalone/dist-renderer/assets/index-UNKNOWNHASH.js')).toBe(true);
    expect(isGitIgnored('apps/standalone/dist-renderer/assets/some-chunk.js')).toBe(true);
  });

  it('runtime logs are ignored', () => {
    expect(isGitIgnored('.runtime/code-dev-launcher.log')).toBe(true);
    expect(readRepoFile('.gitignore')).toContain('.runtime');
  });

  it('lint passes with no errors', { timeout: 120000 }, async () => {
    const result = await runEslintOverRepo(100000);
    expect(result.status, `${result.stdout ?? ''}\n${result.stderr ?? ''}`).toBe(0);
  });
});

describe('model provider routing preserved (cloud-first, Ollama fallback)', () => {
  it('model provider IPC handlers remain present in the Electron main process', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    for (const channel of [
      'cron:model:get-config',
      'cron:model:save-config',
      'cron:model:test',
      'cron:model:chat',
    ]) {
      expect(main).toContain(channel);
    }
  });
  it('LlmConfig shape is cloud + Ollama (no legacy textModel/baseUrl-only shape)', () => {
    const llm = readRepoFile('packages/core/src/llm.ts');
    expect(llm).toContain('cloud');
    expect(llm).toContain('ollama');
    expect(llm).toContain('codingModel');
    expect(llm).not.toContain('textModel');
  });

  it('Ollama is the local fallback (port 11434), not a legacy :1234 endpoint', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('11434');
    expect(main).not.toMatch(/:1234/);
    const chatRuntime = readRepoFile('packages/core/src/chat-runtime.ts');
    expect(chatRuntime).toContain('11434');
    expect(chatRuntime).not.toMatch(/:1234/);
  });

  it('no visible LM Studio wording remains in active product source', () => {
    const activeSourceFiles = [
      'apps/standalone/electron/main.mjs',
      'apps/standalone/electron/preload.cjs',
      'apps/standalone/electron/register-ipc.mjs',
      'apps/standalone/electron/tray-template.mjs',
      'apps/standalone/src/ipc-data-service.ts',
      'apps/standalone/src/main.tsx',
      'packages/core/src/chat-runtime.ts',
      'packages/core/src/llm.ts',
      'packages/core/src/activity-english.ts',
      'packages/core/src/opencode-client.ts',
      'packages/core/src/components/CronAssistant.tsx',
      'packages/core/src/components/ModelSettings.tsx',
      'packages/core/src/components/Layout.tsx',
      'packages/core/src/index.ts',
    ];
    const forbidden = /LM Studio|lmstudio|lmStudio/i;
    const offenders = activeSourceFiles.filter((file) => forbidden.test(readRepoFile(file)));
    expect(offenders).toEqual([]);
  });

  it('dev and production userData remain separated', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('CRON for Code Dev');
    expect(main).toContain('CRON_DEV');
  });
});

describe('main-process IPC registration repair', () => {
  const REQUIRED = [
    'cron:app:restart',
    'cron:project:reveal',
    'cron:project:copy-path',
    'cron:project:refresh',
    'cron:project:rename',
    'cron:project:relink',
    'cron:project:archive',
    'cron:project:restore-last-active',
  ];

  it('main.mjs defines a single deterministic registration function', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('function registerCronIpcHandlers()');
    expect(main).toContain('ipcRegistrator.begin()');
    expect(main).toContain('ipcRegistrator.complete()');
    expect(main).toMatch(/app\.whenReady\(\)\.then\([\s\S]*registerCronIpcHandlers\(\)/);
  });

  it('main.mjs registers all eight required channels inside the registration pass', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    for (const channel of REQUIRED) {
      expect(main).toContain(`registerHandler('${channel}'`);
    }
  });

  it('main.mjs writes a dev-only runtime marker with the channel list', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('code-dev-main-marker.json');
    expect(main).toContain('writeDevRuntimeMarker');
    expect(main).toContain('registeredIpcChannels');
    expect(main).toContain('rendererReady');
  });

  it('main.mjs exposes only narrow diagnostic channels (marker + ready)', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain("'cron:diag:marker'");
    expect(main).toContain("'cron:diag:ready'");
    expect(main).not.toContain("'cron:diag:shell'");
  });

  it('the renderer verifies the host connection and surfaces the preferred message', () => {
    const ipcService = readRepoFile('apps/standalone/src/ipc-data-service.ts');
    expect(ipcService).toContain('CRON for Code started with an incomplete host connection. Restart the dev app.');
    expect(ipcService).toContain('diag.marker');
  });

  it('preload exposes only the narrow diag bridge (no raw ipcRenderer/shell/process)', () => {
    const preload = readRepoFile('apps/standalone/electron/preload.cjs');
    expect(preload).toContain("diag: {");
    expect(preload).toContain("'cron:diag:marker'");
    expect(preload).toContain("'cron:diag:ready'");
    expect(preload).not.toContain('process.');
    expect(preload).not.toContain("require('child_process')");
    expect(preload).not.toContain('shell:');
  });

  it('relink cancellation is a structured non-error result, never a thrown message', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('resolveRelinkOutcome');
    expect(main).toContain("status: 'cancelled'");
    expect(main).not.toMatch(/throw new Error\('Re-link cancelled'\)/);
    const flow = readRepoFile('apps/standalone/electron/relink-flow.mjs');
    expect(flow).toContain("return { status: 'cancelled' }");
  });

  it('unarchive is a pure persistence channel that never opens the folder picker', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    const preload = readRepoFile('apps/standalone/electron/preload.cjs');
    const ipcService = readRepoFile('apps/standalone/src/ipc-data-service.ts');
    const registrar = readRepoFile('apps/standalone/electron/register-ipc.mjs');
    expect(registrar).toContain("'cron:project:unarchive'");
    expect(main).toContain("registerHandler('cron:project:unarchive'");
    expect(main).toContain('unarchiveIfArchived');
    expect(preload).toContain("unarchive: (projectId) => ipcRenderer.invoke('cron:project:unarchive', projectId)");
    expect(ipcService).toMatch(/async unarchive\(id\)[\s\S]{0,120}cronHost\.project\.unarchive/);
  });

  it('relinking an archived project restores it (clears archived, preserves id/history)', () => {
    const pm = readRepoFile('packages/data-service/src/project-management.ts');
    expect(pm).toContain('unarchiveIfArchived');
    expect(pm).toMatch(/if \(project\.archived\)[\s\S]{0,120}unarchiveIfArchived/);
  });

  it('dev Restart writes the intent and quits; dev.mjs owns the relaunch', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('performAppRestart');
    expect(main).toContain('writeDevRestartIntent');
    expect(main).toContain('code-dev-restart-requested.json');
    expect(main).toMatch(/if \(IS_DEV\)[\s\S]{0,200}writeDevRestartIntent/);
    expect(main).toMatch(/setImmediate\(\(\) => \{[\s\S]{0,80}app\.relaunch\(\)/);
    // Electron cannot spawn a surviving relauncher (kill-on-close job): the
    // restart handler must never spawn the launcher or powershell. main.mjs is
    // still allowed to spawn the dev-mode Vite server at startup (self-starting
    // --dev launch), so this check is scoped to the restart handler region.
    expect(main).not.toMatch(/performAppRestart[\s\S]{0,3000}spawn\(/);
    expect(main).not.toContain("'powershell.exe'");
    expect(main).not.toContain('run-code-dev-hidden.ps1');
    // The intent write failure must NOT quit silently (visible bounded error).
    expect(main).toContain('restart intent write failed');
  });

  it('dev.mjs relaunches Electron on a fresh restart intent (supervisor owns the lifecycle)', () => {
    const dev = readRepoFile('apps/standalone/scripts/dev.mjs');
    expect(dev).toContain('code-dev-restart-requested.json');
    expect(dev).toContain('RESTART_INTENT_MAX_AGE_MS');
    expect(dev).toContain('relaunching Electron');
    expect(dev).toContain("proc.on('close', () => onElectronClosed(proc))");
    expect(dev).toContain('startElectron()');
    expect(dev).not.toContain('detached: true');
  });

  it('dev Restart has a one-shot test hook for headless proof', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('CRON_CODE_DEV_TEST_RESTART');
    expect(main).toContain('delete process.env.CRON_CODE_DEV_TEST_RESTART');
    const dev = readRepoFile('apps/standalone/scripts/dev.mjs');
    expect(dev).toContain('CRON_CODE_DEV_TEST_RESTART');
  });

  it('dev Restart is gap-free: the old window holds the overlay until the replacement instance is ready', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('REPLACEMENT_WATCH_TIMEOUT_MS');
    expect(main).toContain('startReplacementWatch');
    expect(main).toContain('app.releaseSingleInstanceLock');
    expect(main).toContain("marker.pid !== process.pid");
    expect(main).toContain('marker.rendererReady === true');
    expect(main).toContain('marker.restartHandoff === true');
    expect(main).toMatch(/setInterval\(\(\) => \{[\s\S]{0,400}rendererReady/);
    const dev = readRepoFile('apps/standalone/scripts/dev.mjs');
    expect(dev).toContain('via poll');
    expect(dev).toContain('setInterval');
    expect(dev).toContain('closedProc !== electronProcess');
    expect(dev).toContain('Superseded Electron instance closed');
  });

  it('dev probes cannot loop into the relaunched child', () => {
    const dev = readRepoFile('apps/standalone/scripts/dev.mjs');
    expect(dev).toContain('CRON_CODE_DEV_TEST_CLICK_RESTART');
    expect(dev).toContain('delete process.env.CRON_CODE_DEV_TEST_CLICK_RESTART');
  });

  it('the visible Restarting overlay is wired into the shell', () => {
    const layout = readRepoFile('packages/core/src/components/Layout.tsx');
    expect(layout).toContain('<RestartOverlay preparing={preparing} />');
    const overlay = readRepoFile('packages/core/src/components/RestartOverlay.tsx');
    expect(overlay).toContain('CRON SYSTEM CONTROL');
    expect(overlay).toContain('Stopping and restarting CRON services');
    expect(overlay).toContain('return to the project selection screen');
    const index = readRepoFile('packages/core/src/index.ts');
    expect(index).toContain("export { RestartOverlay } from './components/RestartOverlay.js';");
    const tokens = readRepoFile('shared/design-tokens/index.css');
    expect(tokens).toContain('@keyframes cron-spin');
  });

  it('restart-handoff linger: dev.mjs marks the relaunched instance and the renderer keeps the overlay until ready', () => {
    const dev = readRepoFile('apps/standalone/scripts/dev.mjs');
    expect(dev).toContain('CRON_CODE_RESTARTING');
    expect(dev).toContain('startElectron(true)');
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('restartHandoff');
    expect(main).toContain('process.env.CRON_CODE_RESTARTING === \'1\'');
    const app = readRepoFile('packages/core/src/components/App.tsx');
    expect(app).toContain('startupRestartHandoff');
    expect(app).toContain('setRestartHandoff(false)');
    const layout = readRepoFile('packages/core/src/components/Layout.tsx');
    expect(layout).toContain('preparing');
  });

  it('the pre-React splash is centered and inline-styled (no unstyled/left-aligned frame)', () => {
    const html = readRepoFile('apps/standalone/index.html');
    expect(html).toContain('id="splash"');
    expect(html).toContain('position: fixed');
    expect(html).toContain('align-items: center');
    expect(html).toContain('justify-content: center');
    expect(html).toContain('CRON SYSTEM CONTROL');
    expect(html).toContain('cron-splash-spin');
    const entry = readRepoFile('apps/standalone/src/main.tsx');
    expect(entry).toContain('startupRestartHandoff');
    expect(entry).toContain("title.textContent = 'Restarting'");
    expect(entry).toContain("note.textContent = 'The app will return to the project selection screen.'");
    expect(entry).toContain('setTimeout');
    expect(entry).toContain("splashEl.style.display = 'none'");
  });

  it('the pre-React splash replicates the Restarting panel (one continuous screen, no pop-up)', () => {
    const html = readRepoFile('apps/standalone/index.html');
    expect(html).toContain('id="splash-panel"');
    expect(html).toContain('rgba(9, 18, 34, 0.96)');
    expect(html).toContain('rgba(80, 140, 220, 0.28)');
    expect(html).toContain('border-radius: 14px');
    expect(html).toContain('CRON Restart');
    const overlay = readRepoFile('packages/core/src/components/RestartOverlay.tsx');
    expect(overlay).not.toContain('Preparing your workspace');
    expect(overlay).toContain('The app will return to the project selection screen.');
  });

  it('the relaunched window reopens visible/focused/maximized (never minimized on the taskbar)', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    const readySection = main.slice(main.indexOf('ready-to-show'), main.indexOf('mainWindow.on(\'close\''));
    expect(readySection).toContain('mainWindow.maximize()');
    expect(readySection).toContain('mainWindow.show()');
    expect(readySection).toContain('mainWindow.isMinimized()');
    expect(readySection).toContain('mainWindow.focus()');
    expect(readySection).toContain("app.focus({ steal: true })");
    expect(readySection).toContain('runtimeMarkerState.restartHandoff');
  });

  it('CRON Online is a non-clickable status and the restart button is wired into the top bar', () => {
    const layout = readRepoFile('packages/core/src/components/Layout.tsx');
    expect(layout).toContain('data-testid="cron-online-status"');
    expect(layout).toContain('data-testid="cron-restart-button"');
    expect(layout).toContain('restartApp()');
    const footer = readRepoFile('packages/core/src/components/CronFooter.tsx');
    expect(footer).toContain('placeholderTabs');
    expect(footer).toContain('PowerShell');
    expect(footer).toContain('DEV');
    const sidebar = readRepoFile('packages/core/src/components/Sidebar.tsx');
    expect(sidebar).toContain('>DEV<');
  });

  it('the folder picker is a CRON-styled in-app browser (no raw OS dialog in the happy path)', () => {
    const app = readRepoFile('packages/core/src/components/App.tsx');
    expect(app).toContain('setPickerActive(true)');
    expect(app).toContain('setPickerActive(false)');
    const layout = readRepoFile('packages/core/src/components/Layout.tsx');
    expect(layout).toContain('<PickerModal');
    const modal = readRepoFile('packages/core/src/components/PickerModal.tsx');
    expect(modal).toContain('PROJECT PICKER');
    expect(modal).toContain('data-testid="picker-modal"');
    expect(modal).toContain('Select this folder');
    const index = readRepoFile('packages/core/src/index.ts');
    expect(index).toContain("export { PickerModal } from './components/PickerModal.js';");
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain("'cron:fs:list'");
    const preload = readRepoFile('apps/standalone/electron/preload.cjs');
    expect(preload).toContain("'cron:fs:list'");
  });

  it('the assistant Model control is wired to open the model configuration', () => {
    const assistant = readRepoFile('packages/core/src/components/CronAssistant.tsx');
    expect(assistant).toContain('onConfigureModel');
    expect(assistant).toContain('data-testid="assistant-model-selector"');
    expect(assistant).toMatch(/onClick=\{\(\) => onConfigureModel\?\.\(\)\}/);
    const layout = readRepoFile('packages/core/src/components/Layout.tsx');
    expect(layout).toContain('onConfigureModel');
  });

  it('re-link keeps a dev-only no-dialog diagnostic for chain proof', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('CRON_CODE_DEV_RELINK_NO_DIALOG');
    expect(main).toContain('Opening re-link folder picker for project');
    expect(main).toContain('resolveRelinkOutcome');
  });

  it('the post-restart overlay lingers a minimum perceivable time (no flash)', () => {
    const app = readRepoFile('packages/core/src/components/App.tsx');
    expect(app).toContain('RESTART_LINGER_MIN_MS');
    expect(app).toContain('setTimeout');
    expect(app).toContain('setRestartHandoff(false)');
    expect(app).toMatch(/remaining > 0[\s\S]{0,120}setTimeout/);
  });

  it('launch does not auto-restore the last active project (entry screen first)', () => {
    const app = readRepoFile('packages/core/src/components/App.tsx');
    expect(app).toContain('loadProjects');
    expect(app).not.toContain('restoreLastActiveProject');
    const emptyState = readRepoFile('packages/core/src/components/EmptyState.tsx');
    expect(emptyState).toContain('Resume a project');
    expect(emptyState).toContain('Open Project');
  });

  it('launcher clears stale restart intents left by failed restarts', () => {
    const launcher = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(launcher).toContain('Cleared stale restart intent');
  });

  it('renderer-load diagnostics record did-fail-load and never log payload content', () => {
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('did-fail-load');
    expect(main).toContain('did-finish-load');
    expect(main).toContain('render-process-gone');
    expect(main).toContain('preload-error');
    expect(main).toContain('lastStartupError');
    expect(main).toContain('rendererUrl');
    expect(main).toContain('console-message');
    expect(main).toContain('.slice(0, 240)');
  });
});

describe('dev launcher', () => {
  it('launcher files exist', () => {
    for (const file of LAUNCHER_FILES) {
      expect(repoPathExists(file)).toBe(true);
    }
  });

  it('launcher paths are dynamic (no hardcoded user)', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).not.toContain('C:\\Users');
    expect(ps1).not.toContain('venes');
    expect(ps1).toContain('$PSScriptRoot');
    const vbs = readRepoFile('launch.vbs');
    expect(vbs).toContain('WScript.ScriptFullName');
    expect(repoPathExists('Launch-CRON-for-Code-Dev.bat')).toBe(false);
  });

  it('launcher does not contain automatic install commands', () => {
    for (const file of LAUNCHER_FILES) {
      const content = readRepoFile(file).toLowerCase();
      expect(content).not.toMatch(/pnpm\s+install|npm\s+install|pnpm\s+add|npm\s+i\b|pnpm\s+i\b|yarn\s+add/);
    }
  });

  it('launcher targets the existing dev command', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).toMatch(/dev\.mjs/);
    expect(ps1).not.toMatch(/vite\s+--config/);
  });

  it('launcher logs target .runtime', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).toContain('.runtime');
    expect(ps1).toContain('code-dev-launcher.log');
    expect(ps1).toContain('code-dev-vite.log');
    expect(ps1).toContain('code-dev-electron.log');
  });

  it('shortcut creator targets electron.exe directly (single taskbar identity)', () => {
    const ps1 = readRepoFile('scripts/create-code-dev-shortcut.ps1');
    expect(ps1).toContain('electron.exe');
    expect(ps1).toContain('.TargetPath');
    expect(ps1).not.toContain('launch-cron-for-code-dev.vbs');
  });

  it('shortcut uses the CRON for Code icon', () => {
    const ps1 = readRepoFile('scripts/create-code-dev-shortcut.ps1');
    expect(ps1).toContain('code_icon.ico');
    expect(ps1).toContain('.IconLocation');
    expect(repoPathExists('apps/standalone/branding/assets/code_icon.ico')).toBe(true);
  });
});

describe('dev launcher restart safety', () => {
  it('launcher files resolve paths dynamically and have no terminal-env dependency', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).not.toContain('C:\\Users');
    expect(ps1).not.toContain('venes');
    expect(ps1).toContain('$PSScriptRoot');
    expect(ps1).toContain('code-dev-state.json');
    const vbs = readRepoFile('launch.vbs');
    expect(vbs).not.toContain('CRON_CODE_DEV_PORT');
    const shortcut = readRepoFile('scripts/create-code-dev-shortcut.ps1');
    expect(shortcut).not.toContain('CRON_CODE_DEV_PORT');
  });

  it('built-in default dev port is 5190', () => {
    const logic = readRepoFile('scripts/code-dev-launcher-logic.ps1');
    expect(logic).toMatch(/DevDefaultPort = 5190/);
    expect(logic).toContain('DevReservedPorts');
    expect(logic).not.toContain('DevPortRange');
    const main = readRepoFile('apps/standalone/electron/main.mjs');
    expect(main).toContain('http://127.0.0.1:5190');
    const viteConfig = readRepoFile('apps/standalone/vite.config.ts');
    expect(viteConfig).toMatch(/port: 5190/);
  });

  it('launcher never terminates unrelated processes', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).not.toContain('taskkill');
    expect(ps1).toContain('Stop-Process -Id $action.ElectronMainPid');
    expect(ps1).toContain('Get-OwnedElectronMainPid');
  });

  it('reuse-branch Electron launches from the app directory, not the repo root', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).toContain('pnpm exec electron .');
    expect(ps1).toContain('apps\\standalone');
  });

  it('restart-safe launcher logic/source tests pass', { timeout: 90000 }, () => {
    const result = run(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/test-code-dev-launcher.ps1'],
      REPO_ROOT,
      80000,
    );
    expect(result.status, `${result.stdout ?? ''}\n${result.stderr ?? ''}`).toBe(0);
  });

  it('launcher reads the dev main runtime marker and classifies health', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    const logic = readRepoFile('scripts/code-dev-launcher-logic.ps1');
    expect(ps1).toContain('code-dev-main-marker.json');
    expect(ps1).toContain('Resolve-DevElectronHealth');
    expect(ps1).toContain('Wait-ForMainMarker');
    expect(logic).toContain('DevRequiredIpcChannels');
    expect(logic).toContain('Read-DevMainMarker');
    expect(logic).toContain('Test-DevMainMarkerReady');
    expect(logic).toContain("'cron:app:restart'");
  });

  it('launcher replaces only an owned stale/broken Electron and never uses taskkill', () => {
    const ps1 = readRepoFile('scripts/run-code-dev-hidden.ps1');
    expect(ps1).not.toContain('taskkill');
    expect(ps1).toMatch(/Stop-Process -Id \$action\.ElectronMainPid/);
    expect(ps1).toContain('Get-OwnedElectronMainPid');
    expect(ps1).toMatch(/replace-stale-electron[\s\S]*Replacing only this repo's stale\/broken owned Electron/);
  });
});
