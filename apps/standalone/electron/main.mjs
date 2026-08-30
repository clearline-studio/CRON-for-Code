import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, clipboard, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createJsonDataService,
  logger,
  ExecutionService,
  OpenCodeRunner,
  SafeExecutionHarness,
  ProjectManagementService,
  assertKnownCommandId,
  assertTaskId,
  assertExecutionId,
  assertCanonicalProjectId,
  assertProjectName,
  assertProjectId,
  isValidExecutionRecordShape,
  isValidAuditRecordShape,
  sanitizeAuditFilter,
} from '@cron-code/data-service';
import { REQUIRED_IPC_CHANNELS, createIpcRegistrar } from './register-ipc.mjs';
import { resolveRelinkOutcome } from './relink-flow.mjs';
import { buildTrayMenuTemplate } from './tray-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const IS_DEV = process.env.CRON_DEV === '1' || process.argv.includes('--dev');

// Taskbar grouping: Windows 11 groups a pinned taskbar button with the running
// window ONLY when both share one identity. This OS writes no AppUserModelID
// property store into classic-exe shortcuts (verified: every pinned/installer
// shortcut carries an icon-path blob instead, and IPropertyStore refuses
// SetValue), so explicit setAppUserModelId() calls would make the window a
// stranger to its pinned icon (double icon). Leaving the AUMID implicit makes
// the window identity equal the electron.exe path — which is exactly what the
// pinned shortcut resolves to when it targets electron.exe directly.

if (IS_DEV) {
  app.setPath('userData', path.join(app.getPath('appData'), 'CRON for Code Dev'));
}

const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
const RENDERER_ENTRY = path.join(projectRoot, 'dist-renderer', 'index.html');
const DEV_URL = process.env.CRON_CODE_DEV_URL || 'http://127.0.0.1:5190';
const ICON_PATH = path.join(projectRoot, 'branding', 'assets', 'code_icon.ico');
const DEFAULT_MODEL_CONFIG = {
  cloud: {
    baseUrl: 'https://api.openrouter.ai/api/v1',
    apiKey: '',
    chatModel: 'deepseek/deepseek-v4-flash',
    visionModel: 'qwen/qwen-2-vl-7b-instruct',
    // Coding model tracks the OpenCode runner default: the vision Flash via the
    // OpenCode gateway (30 Aug). NOTE: deepseek-v4-flash is a GATEWAY model id,
    // not a DeepSeek-API model — the old default 400'd against the real server.
    codingModel: 'opencode-go/deepseek-v4-flash-vision-exp',
    escalationModel: 'deepseek/deepseek-v4-pro',
  },
  ollama: {
    baseUrl: 'http://127.0.0.1:11434/v1',
    chatModel: 'llama3.1',
    visionModel: 'llava',
  },
};

const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');
const DEV_RUNTIME_DIR = path.join(__dirname, '..', '..', '..', '.runtime');
const DEV_RUNTIME_MARKER_PATH = path.join(DEV_RUNTIME_DIR, 'code-dev-main-marker.json');
const DEV_RESTART_INTENT_PATH = path.join(DEV_RUNTIME_DIR, 'code-dev-restart-requested.json');

let mainWindow = null;
let tray = null;
let dataService = null;
let executionService = null;
let openCodeRunner = null;
let projectManagement = null;
let isQuitting = false;
let isRestarting = false;

// --- Dev-mode self-starting Vite (direct `electron.exe . --dev` launch) ---
//
// The taskbar shortcut targets electron.exe directly (single taskbar identity)
// and passes --dev. A bare direct launch would load a dead dev URL when Vite is
// not already running, so in dev mode we probe DEV_URL and, if unreachable,
// spawn the SAME Vite command dev.mjs uses and poll until it serves. We only
// ever kill a Vite WE spawned here (any other Vite is owned by dev.mjs).

let selfStartedViteProcess = null;

function devUrlPort() {
  try {
    return Number(new URL(DEV_URL).port) || 5190;
  } catch {
    return 5190;
  }
}

async function isDevUrlReachable(timeoutMs = 1500) {
  try {
    await fetch(DEV_URL, { signal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    return false;
  }
}

function spawnSelfVite() {
  const port = devUrlPort();
  const viteLogPath = path.join(DEV_RUNTIME_DIR, 'code-dev-vite-direct.log');
  let stdio;
  try {
    if (!fs.existsSync(DEV_RUNTIME_DIR)) {
      fs.mkdirSync(DEV_RUNTIME_DIR, { recursive: true });
    }
    const fd = fs.openSync(viteLogPath, 'a');
    stdio = ['ignore', fd, fd];
  } catch {
    stdio = 'inherit';
  }
  logger.info(`Dev server unreachable at ${DEV_URL}; self-starting Vite on port ${port} (log: ${viteLogPath})`);
  selfStartedViteProcess = spawn('pnpm', ['exec', 'vite', '--port', String(port)], {
    cwd: projectRoot,
    shell: true,
    windowsHide: true,
    stdio,
    env: { ...process.env, CRON_DEV: '1' },
  });
}

async function ensureDevServerReachable() {
  if (!IS_DEV) return;
  if (await isDevUrlReachable()) {
    logger.info(`Dev server already reachable at ${DEV_URL}; not spawning a second Vite`);
    return;
  }
  try {
    spawnSelfVite();
  } catch (err) {
    logger.error('Could not self-start Vite dev server', { error: String(err) });
    return;
  }
  const startedAt = Date.now();
  const deadline = startedAt + 30000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await isDevUrlReachable()) {
      logger.info(`Dev server became reachable at ${DEV_URL} after ${Date.now() - startedAt}ms`);
      return;
    }
  }
  logger.error(
    `Dev server did not become reachable at ${DEV_URL} within 30s; proceeding to loadURL anyway (startup diagnostics will surface the failure)`,
  );
}

// Kill ONLY the Vite this instance spawned. Idempotent: selfStartedViteProcess
// is cleared on first run, so the shutdown-time app.quit() re-entry is a no-op.
app.on('before-quit', () => {
  if (!selfStartedViteProcess) return;
  const pid = selfStartedViteProcess.pid;
  selfStartedViteProcess = null;
  if (!pid) return;
  logger.info(`Stopping self-started Vite dev server (pid ${pid})`);
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch { /* best effort */ }
});

// --- Dev runtime version/identity marker (dev-only, narrow diagnostics) ---

function fileSha256(filePath) {
  try {
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return '';
  }
}

const MAIN_SOURCE_HASH = fileSha256(path.join(__dirname, 'main.mjs'));
const PRELOAD_SOURCE_HASH = fileSha256(PRELOAD_PATH);

const runtimeMarkerState = {
  appVersion: app.getVersion(),
  pid: process.pid,
  mainHash: MAIN_SOURCE_HASH,
  preloadHash: PRELOAD_SOURCE_HASH,
  registeredIpcChannels: [],
  requiredChannels: [...REQUIRED_IPC_CHANNELS],
  startupTimestamp: Date.now(),
  targetUrl: IS_DEV ? DEV_URL : '',
  windowReady: false,
  rendererReady: false,
  windowReadyAt: null,
  rendererReadyAt: null,
  rendererUsable: false,
  rendererUsableAt: null,
  rendererUrl: '',
  lastStartupError: null,
  lastFailedLoadUrl: null,
  rendererGoneReason: null,
  preloadError: null,
  registrationError: null,
  // True when this instance was relaunched by dev.mjs after an in-app restart
  // (dev.mjs sets CRON_CODE_RESTARTING=1 for the relaunched child). The renderer
  // uses it to keep the Restarting overlay visible until the app is ready.
  restartHandoff: process.env.CRON_CODE_RESTARTING === '1',
};

// Startup profiling baseline: every [STARTUP] line reports milliseconds since
// this instant so launcher→main→window→renderer latency is measurable.
const APP_STARTED_AT = Date.now();

function writeDevRuntimeMarker() {
  // Written in BOTH modes: the launcher's readiness handshake (Wait-ForMainMarker)
  // proves main + renderer readiness for dev (Vite) and normal (built renderer) runs.
  try {
    if (!fs.existsSync(path.dirname(DEV_RUNTIME_MARKER_PATH))) {
      fs.mkdirSync(path.dirname(DEV_RUNTIME_MARKER_PATH), { recursive: true });
    }
    fs.writeFileSync(DEV_RUNTIME_MARKER_PATH, JSON.stringify(runtimeMarkerState, null, 2), 'utf-8');
  } catch (err) {
    logger.warn('Could not write dev runtime marker', { error: String(err) });
  }
}

function readRuntimeMarkerState() {
  return { ...runtimeMarkerState, registeredIpcChannels: [...runtimeMarkerState.registeredIpcChannels] };
}

// --- Dev restart: one authoritative lifecycle (dev.mjs supervises) ---
//
// A bare app.relaunch() is NOT safe in dev: dev.mjs tears down the owned Vite
// process when the Electron shim exits, so the relaunched Electron would load a
// dead dev URL and render a blank window. Electron also cannot spawn a surviving
// relauncher (its own children die with it - kill-on-close job). In dev, Restart
// therefore only records a restart-intent marker and quits; dev.mjs (Electron's
// parent, outside that job) reads the intent and relaunches Electron on the
// still-live Vite server. Production (non-dev) keeps app.relaunch().

function writeDevRestartIntent() {
  try {
    if (!fs.existsSync(DEV_RUNTIME_DIR)) {
      fs.mkdirSync(DEV_RUNTIME_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DEV_RESTART_INTENT_PATH,
      JSON.stringify({ pid: process.pid, requestedAt: Date.now() }),
      'utf-8',
    );
    return true;
  } catch (err) {
    logger.warn('Could not write restart-intent marker', { error: String(err) });
    return false;
  }
}

// Shared body of the visible-UI restart: flush, audit, then converge on the
// approved lifecycle. In dev the restart intent is the ONLY message: Electron
// cannot spawn a surviving relauncher (its children die with it - proven by
// runtime probe: a kill-on-close job object), so dev.mjs (Electron's parent,
// spawned outside that job) watches the intent and spawns the replacement.
//
// Gap-free handoff: the OLD window keeps showing the Restarting overlay while
// the replacement instance boots. This instance releases the single-instance
// lock, then watches the dev runtime marker; it quits ONLY when the replacement
// has rendered (different pid + rendererReady + restartHandoff) - so the user
// never sees a vanishing window, a gap, or a minimized taskbar icon.
const REPLACEMENT_WATCH_TIMEOUT_MS = 20000;

async function performAppRestart() {
  if (dataService) {
    try {
      await dataService.flush();
    } catch (err) {
      logger.warn('Flush before restart failed', { error: String(err) });
    }
  }
  const pm = await ensureProjectManagement();
  await pm.recordAudit({ eventType: 'app.restart_requested' });
  // Direct `electron.exe . --dev` launch (no dev.mjs supervisor, i.e. CRON_DEV
  // env not set): there is no parent to read the restart intent, so fall back to
  // app.relaunch(). This is safe here — the relaunched instance carries the same
  // --dev argv and self-starts Vite, and this instance's before-quit handler
  // kills the Vite it spawned. Supervised dev (CRON_DEV=1 from dev.mjs) keeps
  // the intent + supervisor flow below; production keeps app.relaunch().
  const isDirectDevLaunch = IS_DEV && process.env.CRON_DEV !== '1';
  if (isDirectDevLaunch) {
    setImmediate(() => {
      try {
        app.relaunch();
        app.quit();
      } catch (err) {
        logger.error('Restart failed', { error: String(err) });
        isRestarting = false;
      }
    });
    return { accepted: true };
  }
  if (IS_DEV) {
    // The intent write must succeed: if it cannot, do NOT quit (a quit without
    // an intent would silently leave the app closed).
    if (!writeDevRestartIntent()) {
      throw new Error('Could not prepare the restart (restart intent write failed)');
    }
    logger.info('Dev restart intent written; waiting for the replacement instance');
    // Let the replacement instance acquire the single-instance lock while this
    // window (with the Restarting overlay) stays visible.
    try {
      app.releaseSingleInstanceLock();
    } catch { /* best effort */ }
    startReplacementWatch();
    return { accepted: true };
  }
  setImmediate(() => {
    try {
      app.relaunch();
      app.quit();
    } catch (err) {
      logger.error('Restart failed', { error: String(err) });
      isRestarting = false;
    }
  });
  return { accepted: true };
}

// Polls the dev runtime marker until a DIFFERENT, ready, restart-handoff
// instance appears, then quits. Bounded so the app can never hang.
function startReplacementWatch() {
  const startedAt = Date.now();
  const timer = setInterval(() => {
    let marker = null;
    try {
      if (fs.existsSync(DEV_RUNTIME_MARKER_PATH)) {
        marker = JSON.parse(fs.readFileSync(DEV_RUNTIME_MARKER_PATH, 'utf8'));
      }
    } catch { marker = null; }
    const replacementReady =
      marker &&
      typeof marker.pid === 'number' &&
      marker.pid !== process.pid &&
      marker.rendererReady === true &&
      // The replacement window must be VISIBLE (ready-to-show has fired) so the
      // old window hands over without a no-window gap between the two screens.
      marker.windowReady === true &&
      marker.restartHandoff === true;
    if (replacementReady || Date.now() - startedAt > REPLACEMENT_WATCH_TIMEOUT_MS) {
      clearInterval(timer);
      if (replacementReady) {
        logger.info(`Replacement instance ready (pid ${marker.pid}); quitting`);
      } else {
        logger.warn('Replacement instance did not become ready in time; quitting');
      }
      app.quit();
    }
  }, 300);
}

function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf-8'));
    }
  } catch { /* ignore corrupt state */ }
  return null;
}

function saveWindowState(win) {
  if (win.isDestroyed() || win.isMinimized()) return;
  const maximized = win.isMaximized();
  const bounds = maximized ? null : win.getBounds();
  try {
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify({ maximized, bounds }), 'utf-8');
  } catch { /* ignore write errors */ }
}

function getUserDataPath() {
  const userDataPath = path.join(app.getPath('userData'), 'cron-for-code-data');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return userDataPath;
}

async function ensureDataService() {
  if (dataService) return dataService;
  dataService = createJsonDataService({ storagePath: getUserDataPath() });
  await dataService.initialize();
  return dataService;
}

async function ensureProjectManagement() {
  if (projectManagement) return projectManagement;
  const ds = await ensureDataService();
  projectManagement = new ProjectManagementService(ds);
  return projectManagement;
}

async function ensureOpenCodeRunner() {
  if (openCodeRunner) return openCodeRunner;
  const ds = await ensureDataService();
  openCodeRunner = new OpenCodeRunner({
    dataService: ds,
    defaultModel: DEFAULT_MODEL_CONFIG.cloud.codingModel,
    escalationModel: DEFAULT_MODEL_CONFIG.cloud.escalationModel,
    onEvent: (event) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cron:opencode:event', event);
      }
    },
  });
  return openCodeRunner;
}

function createWindow() {
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState?.bounds?.width ?? 1200,
    height: windowState?.bounds?.height ?? 800,
    x: windowState?.bounds?.x,
    y: windowState?.bounds?.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'CRON for Code',
    backgroundColor: '#0d1117',
    icon: ICON_PATH,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isDev = process.env.CRON_DEV === '1' || process.argv.includes('--dev');

  attachRendererStartupDiagnostics(mainWindow);
  logger.info(`[STARTUP] window created at +${Date.now() - APP_STARTED_AT}ms (mode=${isDev ? 'dev' : 'normal'})`);

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(RENDERER_ENTRY);
  }

  mainWindow.once('ready-to-show', () => {
    runtimeMarkerState.windowReady = true;
    runtimeMarkerState.windowReadyAt = Date.now();
    logger.info(`[STARTUP] window ready-to-show at +${runtimeMarkerState.windowReadyAt - APP_STARTED_AT}ms`);
    writeDevRuntimeMarker();
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_CAPTURE === '1') {
      // First-painted frame evidence: capture BEFORE showing the window.
      const captureDir = path.join(DEV_RUNTIME_DIR, 'captures');
      try {
        fs.mkdirSync(captureDir, { recursive: true });
        mainWindow.webContents
          .capturePage()
          .then((image) => {
            const file = path.join(captureDir, `pid-${process.pid}-FIRSTPAINT.png`);
            fs.writeFileSync(file, image.toPNG());
            logger.info(`Dev capture saved: ${file}`);
          })
          .catch(() => {});
      } catch { /* best effort */ }
    }
    // Reopen behavior: this instance must NEVER come back minimized on the
    // taskbar, and on a restart handoff it must open FULL SCREEN (no small
    // restored-size flash). The dev relaunch is spawned by a background
    // process, which Windows treats as lacking foreground activation - without
    // explicit countermeasures the window can be minimized with a flashing
    // taskbar icon the instant it appears.
    // Sequence: maximize FIRST (so the window never paints at a small size),
    // then show -> restore-if-minimized -> focus, a brief always-on-top flip
    // (forces the window above the taskbar-minimize behavior), focus again,
    // and a delayed retry (restore/maximize/focus can settle late).
    if (runtimeMarkerState.restartHandoff || windowState?.maximized === true) {
      mainWindow.maximize();
    }
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.focus();
    app.focus({ steal: true });
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isMaximized() && (runtimeMarkerState.restartHandoff || windowState?.maximized === true)) {
        mainWindow.maximize();
      }
      mainWindow.focus();
    }, 400);
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      saveWindowState(mainWindow);
      event.preventDefault();
      mainWindow.hide();
    } else {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('context-menu', (_event, params) => {
    // Context menu in BOTH editable fields and non-editable text (conversation,
    // cards, panels): the user can right-click → select/copy/paste anywhere.
    const editable = params.isEditable;
    const hasSelection = typeof params.selectionText === 'string' && params.selectionText.trim().length > 0;
    if (!editable && !hasSelection) return;
    const editMenu = Menu.buildFromTemplate([
      { role: 'cut', enabled: params.editFlags.canCut },
      { role: 'copy', enabled: params.editFlags.canCopy || hasSelection },
      { role: 'paste', enabled: params.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', enabled: params.editFlags.canSelectAll || hasSelection },
    ]);
    editMenu.popup({ window: mainWindow });
  });
}

// Narrow dev startup diagnostics for the renderer load. Records only load/URL/
// crash metadata in the runtime marker + dev electron log - never project
// content, prompts, model payloads, secrets, or full user data.
const RENDERER_READY_TIMEOUT_MS = 30000;
let rendererReadyWatchdog = null;

function attachRendererStartupDiagnostics(win) {
  const record = (partial) => {
    Object.assign(runtimeMarkerState, partial);
    writeDevRuntimeMarker();
  };

  function cancelWatchdog() {
    if (rendererReadyWatchdog) {
      clearTimeout(rendererReadyWatchdog);
      rendererReadyWatchdog = null;
    }
  }

  win.webContents.on('did-start-loading', () => {
    logger.info('Renderer did-start-loading');
  });

  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL();
    logger.info(`[STARTUP] renderer did-finish-load at +${Date.now() - APP_STARTED_AT}ms: ${url}`);
    if (IS_DEV && url && DEV_URL && !url.startsWith(DEV_URL)) {
      record({
        rendererUrl: url,
        lastStartupError: `renderer loaded unexpected URL: ${url} (expected ${DEV_URL})`,
      });
      return;
    }
    record({ rendererUrl: url });
    if (runtimeMarkerState.rendererReady) return;
    // A loaded page that never bootstraps (dead dev server error page, broken
    // preload, renderer crash) becomes an explicit bounded startup failure.
    cancelWatchdog();
    rendererReadyWatchdog = setTimeout(() => {
      rendererReadyWatchdog = null;
      if (runtimeMarkerState.rendererReady) return;
      const message = `renderer did not become ready within ${RENDERER_READY_TIMEOUT_MS}ms of did-finish-load (url=${url})`;
      logger.error(message);
      record({ lastStartupError: message });
    }, RENDERER_READY_TIMEOUT_MS);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(`Renderer did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    record({
      lastStartupError: `did-fail-load ${errorCode} ${errorDescription}`,
      lastFailedLoadUrl: validatedURL,
    });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`Renderer process gone: ${details.reason}`);
    record({ rendererGoneReason: details.reason });
  });

  win.webContents.on('preload-error', (_event, _preloadPath, error) => {
    logger.error(`Preload error: ${String(error)}`);
    record({ preloadError: String(error) });
  });

  win.webContents.on('console-message', (_event, level, message) => {
    // Level 3 = error. 240-char slice; no payload content is logged.
    if (level === 3) {
      logger.info(`Renderer console error: ${String(message).slice(0, 240)}`);
    }
  });
}

function createTray() {
  tray = new Tray(ICON_PATH);
  tray.setToolTip('CRON for Code');

  // Windows renders native tray menus (OS-styled; no custom CSS is possible),
  // so the CRON treatment is a clear, correct item list from the pure template.
  const contextMenu = Menu.buildFromTemplate(
    buildTrayMenuTemplate({
      openApp: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      showTasks: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('cron:tray:show-tasks');
        }
      },
      pauseTask: () => {
        if (mainWindow) {
          mainWindow.webContents.send('cron:tray:pause-task');
        }
      },
      stopTask: () => {
        if (mainWindow) {
          mainWindow.webContents.send('cron:tray:stop-task');
        }
      },
      quit: () => {
        app.quit();
      },
    }),
  );

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

const ipcRegistrator = createIpcRegistrar({
  handle: (channel, handler) => {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await handler(...args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`IPC ${channel} failed`, { error: message });
        throw new Error(message, { cause: err });
      }
    });
  },
});

function registerHandler(channel, handler) {
  ipcRegistrator.register(channel, handler);
}

/**
 * Single deterministic IPC registration pass. Called exactly once at startup
 * after `app.whenReady()`. Registers every handler, verifies the eight required
 * channels, records a dev runtime marker, and throws loudly if anything fails.
 */
function registerCronIpcHandlers() {
  ipcRegistrator.begin();

  registerHandler('cron:select-folder', async (requestedPath) => {
    if (!mainWindow) return null;
    if (IS_DEV && process.env.CRON_CODE_DEV_PICKER_NO_DIALOG === '1') {
      // Dev-only diagnostic: prove the CRON-styled picker flow live without
      // opening a blocking OS dialog. One-shot; consumed here.
      delete process.env.CRON_CODE_DEV_PICKER_NO_DIALOG;
      logger.info('Dev picker diagnostic: folder dialog bypassed, returning null');
      return null;
    }
    // The CRON folder browser sends a chosen path for validation. The raw OS
    // dialog below is only a backward-compatible fallback when no path arrives.
    if (typeof requestedPath === 'string' && requestedPath.trim() !== '') {
      const target = path.resolve(requestedPath.trim());
      let stat;
      try {
        stat = fs.statSync(target);
      } catch (err) {
        throw new Error(`Folder is not accessible: ${target} (${err.message})`, { cause: err });
      }
      if (!stat.isDirectory()) {
        throw new Error(`Selected path is not a folder: ${target}`);
      }
      return target;
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return path.resolve(result.filePaths[0]);
  });

  // Directory listing for the CRON-styled folder browser. Returns folder + file
  // entries for the resolved path (empty string = the host home folder), with a
  // parent pointer (null at a filesystem root) for Up/breadcrumb navigation.
  registerHandler('cron:fs:list', async (dirPath) => {
    const requested = typeof dirPath === 'string' && dirPath.trim() !== '' ? dirPath.trim() : os.homedir();
    const target = path.resolve(requested);
    let stat;
    try {
      stat = fs.statSync(target);
    } catch (err) {
      throw new Error(`Folder is not accessible: ${target} (${err.message})`, { cause: err });
    }
    if (!stat.isDirectory()) {
      throw new Error(`Not a folder: ${target}`);
    }
    let dirents;
    try {
      dirents = fs.readdirSync(target, { withFileTypes: true });
    } catch (err) {
      throw new Error(`Cannot read folder: ${target} (${err.message})`, { cause: err });
    }
    const entries = dirents
      .map((dirent) => ({
        name: dirent.name,
        path: path.join(target, dirent.name),
        isDirectory: dirent.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    const parent = path.dirname(target) === target ? null : path.dirname(target);
    return { path: target, parent, entries };
  });

  // --- Persistence IPC ---

  registerHandler('cron:db:load-all', async () => {
    const ds = await ensureDataService();
    const [projects, tasks, approvals, executions, audit] = await Promise.all([
      ds.projects.list(),
      ds.tasks.listAll(),
      ds.approvals.listAll(),
      ds.executions.listAll(),
      ds.audit.list(),
    ]);
    const prefs = { theme: await ds.preferences.get('theme') };
    return { projects, tasks, approvals, executions, audit, preferences: prefs };
  });

  registerHandler('cron:db:save-project', async (project) => {
    const ds = await ensureDataService();
    await ds.projects.save(project);
  });

  registerHandler('cron:db:delete-project', async (id) => {
    const ds = await ensureDataService();
    await ds.projects.delete(id);
  });

  registerHandler('cron:db:save-task', async (task) => {
    const ds = await ensureDataService();
    await ds.tasks.save(task);
  });

  registerHandler('cron:db:delete-task', async (id) => {
    const ds = await ensureDataService();
    await ds.tasks.delete(id);
  });

  registerHandler('cron:db:save-approval', async (approval) => {
    const ds = await ensureDataService();
    await ds.approvals.save(approval);
  });

  registerHandler('cron:db:delete-approval', async (id) => {
    const ds = await ensureDataService();
    await ds.approvals.delete(id);
  });

  registerHandler('cron:db:set-preference', async (key, value) => {
    const ds = await ensureDataService();
    await ds.preferences.set(key, value);
  });

  registerHandler('cron:db:get-preference', async (key) => {
    const ds = await ensureDataService();
    return ds.preferences.get(key);
  });

  // --- Task lifecycle IPC ---

  registerHandler('cron:db:update-task-status', async (id, status, error) => {
    const ds = await ensureDataService();
    await ds.tasks.updateStatus(id, status, error);
  });

  registerHandler('cron:db:queue-task', async (id) => {
    const ds = await ensureDataService();
    await ds.tasks.queue(id);
    await ensureExecutionService();
    await executionService.queueTask(id);
  });

  registerHandler('cron:db:resolve-approval', async (id, status, reason) => {
    const ds = await ensureDataService();
    await ds.approvals.resolve(id, status, reason);
  });

  // --- Execution IPC (narrow, validated) ---

  registerHandler('cron:task:run-now', async (taskId, commandId) => {
    assertTaskId(taskId);
    const safeCommandId = commandId === undefined ? undefined : assertKnownCommandId(commandId);
    await ensureExecutionService();
    return executionService.runTaskNow(taskId, { commandId: safeCommandId });
  });

  registerHandler('cron:execution:cancel', async (executionId) => {
    assertExecutionId(executionId);
    await ensureExecutionService();
    return executionService.cancel(executionId);
  });

  registerHandler('cron:execution:list-commands', async () => {
    const ds = await ensureDataService();
    return ds.listCommands();
  });

  registerHandler('cron:opencode:run-task', async (input) => {
    const runner = await ensureOpenCodeRunner();
    return runner.runTask({
      taskId: String(input?.taskId || ''),
      model: typeof input?.model === 'string' ? input.model : DEFAULT_MODEL_CONFIG.cloud.codingModel,
      conversationContext: Array.isArray(input?.conversationContext) ? input.conversationContext : [],
    });
  });

  registerHandler('cron:opencode:reply-approval', async (input) => {
    const runner = await ensureOpenCodeRunner();
    return runner.replyToApproval({
      taskId: String(input?.taskId || ''),
      approvalId: String(input?.approvalId || ''),
      decision: input?.decision === 'reject' ? 'reject' : 'approve',
      reason: typeof input?.reason === 'string' ? input.reason : undefined,
    });
  });

  registerHandler('cron:db:save-execution', async (record) => {
    const ds = await ensureDataService();
    if (!isValidExecutionRecordShape(record)) {
      throw new Error('Invalid execution record');
    }
    await ds.executions.save(record);
  });

  registerHandler('cron:db:audit-append', async (record) => {
    const ds = await ensureDataService();
    if (!isValidAuditRecordShape(record)) {
      throw new Error('Invalid audit record');
    }
    await ds.audit.append(record);
  });

  registerHandler('cron:db:audit-list', async (filter) => {
    const ds = await ensureDataService();
    return ds.audit.list(sanitizeAuditFilter(filter));
  });

  // --- Project management IPC (narrow, validated) ---

  registerHandler('cron:project:reveal', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    const ds = await ensureDataService();
    const project = await ds.projects.get(safeId);
    if (!project) {
      throw new Error('Project not found');
    }
    if (project.archived) {
      throw new Error('Project is archived; restore or re-link before opening it');
    }
    if (!fs.existsSync(project.rootPath)) {
      throw new Error('Project folder no longer exists on disk');
    }
    const stat = fs.statSync(project.rootPath);
    if (!stat.isDirectory()) {
      throw new Error('Project path is not a directory');
    }
    const err = await shell.openPath(project.rootPath);
    if (err) {
      throw new Error(`Could not open in File Explorer: ${err}`);
    }
  });

  registerHandler('cron:project:copy-path', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    const ds = await ensureDataService();
    const project = await ds.projects.get(safeId);
    if (!project) {
      throw new Error('Project not found');
    }
    clipboard.writeText(project.rootPath);
  });

  registerHandler('cron:project:refresh', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    const pm = await ensureProjectManagement();
    const result = await pm.refreshAvailability(safeId);
    return { project: result.project, availability: result.availability };
  });

  registerHandler('cron:project:rename', async (projectId, name) => {
    const safeId = assertCanonicalProjectId(projectId);
    const safeName = assertProjectName(name);
    const pm = await ensureProjectManagement();
    const result = await pm.renameProject(safeId, safeName);
    return { project: result.project };
  });

  registerHandler('cron:project:archive', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    const pm = await ensureProjectManagement();
    const result = await pm.archiveProject(safeId);
    if (!result.project) {
      throw new Error('Project not found');
    }
    return { project: result.project };
  });

  registerHandler('cron:project:relink', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    if (!mainWindow) {
      throw new Error('No active window for folder picker');
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_RELINK_NO_DIALOG === '1') {
      // Dev-only diagnostic: prove the FULL re-link chain (menu -> store ->
      // adapter -> preload -> IPC -> handler -> structured cancel) live without
      // opening a blocking OS dialog. One-shot; consumed here.
      delete process.env.CRON_CODE_DEV_RELINK_NO_DIALOG;
      logger.info('Dev relink diagnostic: dialog bypassed, returning cancelled');
      return resolveRelinkOutcome({ canceled: true, filePaths: [] }, safeId, () => Promise.resolve(null));
    }
    logger.info(`Opening re-link folder picker for project ${safeId}`);
    const dialogResult = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Re-link project folder',
    });
    const pm = await ensureProjectManagement();
    // Cancellation is a structured NON-error result ({ status: 'cancelled' });
    // genuine invalid selections still throw (bounded visible error).
    return resolveRelinkOutcome(dialogResult, safeId, (id, newRootPath) => pm.linkRootPath(id, newRootPath));
  });

  registerHandler('cron:project:unarchive', async (projectId) => {
    const safeId = assertCanonicalProjectId(projectId);
    const pm = await ensureProjectManagement();
    const result = await pm.unarchiveIfArchived(safeId);
    if (!result.project) {
      throw new Error('Project not found');
    }
    return { project: result.project };
  });

  registerHandler('cron:project:restore-last-active', async () => {
    const ds = await ensureDataService();
    const pm = await ensureProjectManagement();
    const raw = await pm.readLastActive();
    if (!raw) return { project: null };
    const safeId = assertProjectId(raw);
    const project = await ds.projects.get(safeId);
    if (!project || project.archived) {
      await pm.rememberLastActive(null);
      return { project: null };
    }
    if (project.availability !== 'available' || !fs.existsSync(project.rootPath)) {
      return { project: null };
    }
    return { project };
  });

  // --- App lifecycle IPC (narrow, validated) ---

  registerHandler('cron:app:restart', async () => {
    if (isRestarting) {
      return { accepted: false, reason: 'restart-already-in-progress' };
    }
    isRestarting = true;
    try {
      return await performAppRestart();
    } catch (err) {
      isRestarting = false;
      throw err;
    }
  });

  // --- Dev runtime diagnostics (narrow, dev+prod safe) ---

  registerHandler('cron:diag:marker', async () => {
    const state = readRuntimeMarkerState();
    return {
      appVersion: state.appVersion,
      pid: state.pid,
      mainHash: state.mainHash,
      preloadHash: state.preloadHash,
      registeredIpcChannels: state.registeredIpcChannels,
      requiredChannels: state.requiredChannels,
      startupTimestamp: state.startupTimestamp,
      windowReady: state.windowReady,
      rendererReady: state.rendererReady,
      registrationError: state.registrationError,
      restartHandoff: state.restartHandoff,
    };
  });

  registerHandler('cron:diag:ready', async () => {
    runtimeMarkerState.rendererReady = true;
    runtimeMarkerState.rendererReadyAt = Date.now();
    if (rendererReadyWatchdog) {
      clearTimeout(rendererReadyWatchdog);
      rendererReadyWatchdog = null;
    }
    logger.info(
      `[STARTUP] renderer-ready at +${Date.now() - APP_STARTED_AT}ms (window-ready at +${(runtimeMarkerState.windowReadyAt ?? APP_STARTED_AT) - APP_STARTED_AT}ms)`
    );
    writeDevRuntimeMarker();
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_RESTART === '1') {      // Dev-only diagnostic: drive a REAL restart through the real handler path
      // (flush + audit + intent + quit -> dev.mjs relaunches Electron) so the
      // visible-UI Restart chain can be proven headlessly. One-shot: the env
      // var is consumed here, and dev.mjs strips it from the relaunched child.
      delete process.env.CRON_CODE_DEV_TEST_RESTART;
      setTimeout(() => {
        void performAppRestart().catch((err) => {
          logger.error('Dev test restart failed', { error: String(err) });
        });
      }, 1500);
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_CLICK_RESTART === '1') {
      // Dev-only diagnostic: click the REAL visible Restart button in the real
      // renderer (DOM .click() via executeJavaScript) so the full visible path
      // renderer -> store -> host adapter -> preload -> IPC -> main -> supervisor
      // can be reproduced headlessly. Also samples the DOM during the pre-quit
      // window to prove the Restarting overlay painted. One-shot; consumed here.
      delete process.env.CRON_CODE_DEV_TEST_CLICK_RESTART;
      setTimeout(() => {
        const wc = mainWindow?.webContents;
        if (!wc || wc.isDestroyed()) {
          logger.error('Dev click probe: no window');
          return;
        }
        wc.executeJavaScript(
          `(() => {
             const btn = document.querySelector('[data-testid="cron-restart-button"]');
             if (!btn) return { clicked: false, reason: 'button-not-found' };
             btn.click();
             return { clicked: true };
           })()`,
          true,
        )
          .then((result) => logger.info('Dev click probe: dispatched', { result }))
          .catch((err) => logger.error('Dev click probe failed', { error: String(err) }));
        for (const d of [0, 50, 100, 200, 400, 1000, 1500, 2000, 2400]) {
          setTimeout(() => {
            if (wc.isDestroyed()) {
              logger.info('Dev click probe: renderer gone before overlay sample');
              return;
            }
            wc.executeJavaScript(
              `(() => {
                 const overlay = document.querySelector('[data-testid="restart-overlay"]');
                 const btn = document.querySelector('[data-testid="cron-restart-button"]');
                 return {
                   overlayVisible: !!overlay,
                   buttonDisabled: btn ? btn.disabled : null,
                   buttonBusy: btn ? btn.getAttribute('aria-busy') : null,
                 };
               })()`,
              true,
            )
              .then((sample) => logger.info('Dev click probe: overlay sample', { at: d, sample }))
              .catch((err) => logger.error('Dev click probe sample failed', { error: String(err) }));
          }, d);
        }
      }, 2500);
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_LINGER_SAMPLE === '1') {
      // Dev-only diagnostic (PASSIVE, no restart trigger): sample the renderer's
      // restart-overlay presence on a schedule so the post-relaunch linger can be
      // proven live. Deliberately NOT stripped by dev.mjs so the relaunched
      // instance reports its own overlay state.
      const sampleAt = [100, 300, 600, 1200, 2500, 5000];
      for (const delay of sampleAt) {
        setTimeout(() => {
          const wc = mainWindow?.webContents;
          if (!wc || wc.isDestroyed()) {
            logger.info('Dev linger sample: window gone before sample');
            return;
          }
          wc.executeJavaScript(
            `(() => {
               const overlay = document.querySelector('[data-testid="restart-overlay"]');
               const entry = document.querySelector('[data-testid="restart-overlay"]');
               return {
                 overlayVisible: !!overlay,
                 bodyText: (document.body && document.body.textContent || '').slice(0, 80),
               };
             })()`,
            true,
          )
            .then((sample) => logger.info('Dev linger sample', { at: delay, sample }))
            .catch((err) => logger.error('Dev linger sample failed', { error: String(err) }));
          if (mainWindow && !mainWindow.isDestroyed()) {
            logger.info('Dev linger window-state', {
              at: delay,
              state: {
                visible: mainWindow.isVisible(),
                maximized: mainWindow.isMaximized(),
                minimized: mainWindow.isMinimized(),
                focused: mainWindow.isFocused(),
              },
            });
          }
        }, delay);
      }
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_CAPTURE === '1') {
      // Dev-only diagnostic (PASSIVE): capture the window's actual pixels on a
      // schedule so the restart transition can be verified frame by frame.
      // Deliberately NOT stripped by dev.mjs so the relaunched instance captures
      // its own first-painted states.
      const captureDir = path.join(DEV_RUNTIME_DIR, 'captures');
      try {
        fs.mkdirSync(captureDir, { recursive: true });
      } catch { /* best effort */ }
      const captureAt = [50, 250, 600, 1200, 2500, 5000];
      for (const delay of captureAt) {
        setTimeout(() => {
          const wc = mainWindow?.webContents;
          if (!wc || wc.isDestroyed()) return;
          wc.capturePage()
            .then((image) => {
              const file = path.join(captureDir, `pid-${process.pid}-at-${delay}ms.png`);
              fs.writeFileSync(file, image.toPNG());
              logger.info(`Dev capture saved: ${file}`);
            })
            .catch((err) => logger.error('Dev capture failed', { error: String(err) }));
        }, delay);
      }
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_CONTINUOUS_SAMPLE === '1') {
      // Dev-only diagnostic (PASSIVE): continuous overlay + window-state sampling
      // (every 300 ms for 120 s) so a REAL user click and its full restart cycle
      // are evidenced end to end. Survives relaunch (reports for both instances).
      let samples = 0;
      let lastOverlayVisible = false;
      const captureDir = path.join(DEV_RUNTIME_DIR, 'captures');
      try {
        fs.mkdirSync(captureDir, { recursive: true });
      } catch { /* best effort */ }
      const captureNow = (label) => {
        const wc = mainWindow?.webContents;
        if (!wc || wc.isDestroyed()) return;
        wc.capturePage()
          .then((image) => {
            const file = path.join(captureDir, `pid-${process.pid}-reveal-${label}.png`);
            fs.writeFileSync(file, image.toPNG());
            logger.info(`Dev capture saved: ${file}`);
          })
          .catch(() => {});
      };
      const timer = setInterval(() => {
        samples += 1;
        const wc = mainWindow?.webContents;
        if (!wc || wc.isDestroyed()) {
          logger.info('Dev continuous sample: window gone');
          clearInterval(timer);
          return;
        }
        wc.executeJavaScript(
          `(() => {
             const overlay = document.querySelector('[data-testid="restart-overlay"]');
             const splashVisible = !!document.getElementById('splash') && getComputedStyle(document.getElementById('splash')).display !== 'none';
             return {
               overlayVisible: !!overlay,
               splashVisible,
               bodyText: (document.body && document.body.textContent || '').slice(0, 40),
             };
           })()`,
          true,
        )
          .then((sample) => {
            // Capture the exact "entry reveal" moment (overlay just hidden) so
            // any flash right before the app opens is evidenced pixel-wise.
            if (lastOverlayVisible && !sample.overlayVisible) {
              captureNow('after-overlay-cleared');
              setTimeout(() => captureNow('entry-revealed'), 300);
            }
            lastOverlayVisible = sample.overlayVisible;
            const state = mainWindow && !mainWindow.isDestroyed()
              ? {
                  visible: mainWindow.isVisible(),
                  maximized: mainWindow.isMaximized(),
                  minimized: mainWindow.isMinimized(),
                  focused: mainWindow.isFocused(),
                }
              : null;
            logger.info('Dev continuous sample', { n: samples, sample, window: state });
          })
          .catch(() => {});
        if (samples >= 400) clearInterval(timer);
      }, 300);
    }
    if (IS_DEV && process.env.CRON_CODE_DEV_TEST_DRIVE === '1') {
      // Dev-only diagnostic: script the visible controls (status pill, picker
      // flow, project select, Create Task, Model control, project menu re-link)
      // and log the renderer's resulting DOM state at each step. Proves the
      // functional wiring + DEV-marking slice live. One-shot; consumed here.
      delete process.env.CRON_CODE_DEV_TEST_DRIVE;
      const runJs = (label, js, at) =>
        setTimeout(() => {
          const wc = mainWindow?.webContents;
          if (!wc || wc.isDestroyed()) {
            logger.info(`Dev drive ${label}: window gone`);
            return;
          }
          wc.executeJavaScript(js, true)
            .then((result) => logger.info(`Dev drive ${label}`, { result }))
            .catch((err) => logger.error(`Dev drive ${label} failed`, { error: String(err) }));
        }, at);
      runJs(
        'status-pill-footer',
        `(() => {
           const s = document.querySelector('[data-testid="cron-online-status"]');
           const devBadges = document.querySelectorAll('[aria-label$="not implemented"]').length;
           return { statusTag: s ? s.tagName : null, statusRole: s ? s.getAttribute('role') : null, footerDevBadges: devBadges };
         })()`,
        2500,
      );
      runJs(
        'picker-flow',
        `(() => {
           const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Open Project'));
           if (!btn) return { step: 'button-not-found' };
           btn.click();
           return { step: 'clicked' };
         })()`,
        4000,
      );
      runJs(
        'picker-modal-visible',
        `(() => {
           const modal = document.querySelector('[data-testid="picker-modal"]');
           return { pickerModalVisible: !!modal };
         })()`,
        4300,
      );
      runJs(
        'picker-modal-cleared',
        `(() => {
           const modal = document.querySelector('[data-testid="picker-modal"]');
           return { pickerModalVisible: !!modal };
         })()`,
        7000,
      );
      runJs(
        'select-project',
        `(() => {
           const row = document.querySelector('[data-testid^="project-row-"]');
           if (!row) return { step: 'no-project-row' };
           const clickable = row.querySelector('[role="button"]');
           clickable.click();
           return { step: 'clicked' };
         })()`,
        8000,
      );
      runJs(
        'create-task',
        `(() => {
           const ta = document.querySelector('textarea[aria-label="Task description"]');
           if (!ta) return { step: 'composer-not-found' };
           const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
           setter.call(ta, 'Live proof task from the functional wiring slice');
           ta.dispatchEvent(new Event('input', { bubbles: true }));
           const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Create Task'));
           if (!btn) return { step: 'create-button-not-found' };
           btn.click();
           return { step: 'clicked' };
         })()`,
        11000,
      );
      runJs(
        'create-task-result',
        `(() => {
           const body = document.body.textContent || '';
           return { taskVisible: body.includes('Live proof task from the functional wiring slice') };
         })()`,
        13000,
      );
      runJs(
        'model-control',
        `(() => {
           const sel = document.querySelector('[data-testid="assistant-model-selector"]');
           if (!sel) return { step: 'model-selector-not-found' };
           sel.click();
           return { step: 'clicked' };
         })()`,
        15000,
      );
      runJs(
        'model-settings-opened',
        `(() => {
            const settings = [...document.querySelectorAll('div')].some((d) => (d.textContent || '').includes('Cloud AI'));
           return { settingsDialogVisible: settings };
         })()`,
        15800,
      );
      runJs(
        'relink-menu',
        `(() => {
           const trigger = document.querySelector('[data-testid^="project-menu-trigger-"]');
           if (!trigger) return { step: 'menu-trigger-not-found' };
           trigger.click();
           return { step: 'clicked' };
         })()`,
        17000,
      );
      runJs(
        'relink-action',
        `(() => {
           const item = document.querySelector('[data-testid="project-menu-relink"]');
           if (!item) return { step: 'relink-item-not-found' };
           item.click();
           return { step: 'clicked' };
         })()`,
        17400,
      );
       runJs(
        'relink-result',
        `(() => {
           const body = document.body.textContent || '';
           const errorBanner = [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent);
           return { menuStillOpen: !!document.querySelector('[data-testid="project-context-menu"]'), errors: errorBanner };
         })()`,
        18200,
      );
    }
    return { ok: true };
  });

  registerHandler('cron:diag:usable', async () => {
    if (!runtimeMarkerState.rendererUsable) {
      runtimeMarkerState.rendererUsable = true;
      runtimeMarkerState.rendererUsableAt = Date.now();
    }
    logger.info(
      `[STARTUP] renderer usable entry screen at +${Date.now() - APP_STARTED_AT}ms`
    );
    writeDevRuntimeMarker();
    return { ok: true };
  });

  // --- Model provider IPC (cloud-first, Ollama local fallback) ---

  const MODEL_CONFIG_KEY = 'model.config';

  function cleanUrl(value, fallback) {
    return String(value || fallback).trim().replace(/\/+$/, '');
  }

  function cleanModelConfig(config = {}) {
    const cloud = config.cloud ?? {};
    const ollama = config.ollama ?? {};
    const cloudBaseUrl = cleanUrl(cloud.baseUrl, DEFAULT_MODEL_CONFIG.cloud.baseUrl);
    const ollamaBaseUrl = cleanUrl(ollama.baseUrl, DEFAULT_MODEL_CONFIG.ollama.baseUrl);
    const cloudParsed = new URL(cloudBaseUrl);
    if (!['http:', 'https:'].includes(cloudParsed.protocol)) {
      throw new Error('Cloud AI address must start with http:// or https://');
    }
    const ollamaParsed = new URL(ollamaBaseUrl);
    if (!['http:', 'https:'].includes(ollamaParsed.protocol)) {
      throw new Error('Local AI (Ollama) address must start with http:// or https://');
    }
    return {
      cloud: {
        baseUrl: cloudBaseUrl,
        apiKey: String(cloud.apiKey || '').trim(),
        chatModel: String(cloud.chatModel || DEFAULT_MODEL_CONFIG.cloud.chatModel).trim(),
        visionModel: String(cloud.visionModel || DEFAULT_MODEL_CONFIG.cloud.visionModel).trim(),
        codingModel: String(cloud.codingModel || DEFAULT_MODEL_CONFIG.cloud.codingModel).trim(),
        escalationModel: String(cloud.escalationModel || DEFAULT_MODEL_CONFIG.cloud.escalationModel).trim(),
      },
      ollama: {
        baseUrl: ollamaBaseUrl,
        chatModel: String(ollama.chatModel || DEFAULT_MODEL_CONFIG.ollama.chatModel).trim(),
        visionModel: String(ollama.visionModel || DEFAULT_MODEL_CONFIG.ollama.visionModel).trim(),
      },
    };
  }

  async function modelChatRequest(baseUrl, apiKey, endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    // The key is sent to the provider endpoint only; it is never logged or
    // returned to the renderer.
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Provider returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
    }
    return response.json();
  }

  registerHandler('cron:model:get-config', async () => {
    const ds = await ensureDataService();
    const saved = await ds.preferences.get(MODEL_CONFIG_KEY);
    try {
      return cleanModelConfig(saved ? JSON.parse(saved) : DEFAULT_MODEL_CONFIG);
    } catch {
      return DEFAULT_MODEL_CONFIG;
    }
  });

  registerHandler('cron:model:save-config', async (config) => {
    const ds = await ensureDataService();
    const clean = cleanModelConfig(config);
    await ds.preferences.set(MODEL_CONFIG_KEY, JSON.stringify(clean));
  });

  registerHandler('cron:model:test', async (config) => {
    const clean = cleanModelConfig(config);
    const warnings = [];
    const models = [];

    let cloudOk;
    try {
      const data = await modelChatRequest(clean.cloud.baseUrl, clean.cloud.apiKey, '/models');
      const list = Array.isArray(data?.data) ? data.data.map((m) => String(m.id)).filter(Boolean) : [];
      models.push(...list);
      cloudOk = true;
      for (const [label, model] of [
        ['Chat', clean.cloud.chatModel],
        ['Vision', clean.cloud.visionModel],
        ['Coding', clean.cloud.codingModel],
        ['Deeper reasoning', clean.cloud.escalationModel],
      ]) {
        if (model && !list.includes(model)) warnings.push(`Cloud ${label} model "${model}" not found`);
      }
    } catch {
      cloudOk = false;
    }

    let ollamaOk;
    try {
      const data = await modelChatRequest(clean.ollama.baseUrl, '', '/models');
      const list = Array.isArray(data?.data) ? data.data.map((m) => String(m.id)).filter(Boolean) : [];
      models.push(...list);
      ollamaOk = true;
      for (const [label, model] of [
        ['Local chat', clean.ollama.chatModel],
        ['Local vision', clean.ollama.visionModel],
      ]) {
        if (model && !list.includes(model)) warnings.push(`Local ${label} model "${model}" not found`);
      }
    } catch {
      ollamaOk = false;
    }

    const parts = [
      cloudOk ? `Cloud AI: connected (${models.length ? `${models.length} model${models.length === 1 ? '' : 's'}` : '0 models'}).` : 'Cloud AI: unreachable.',
      ollamaOk ? 'Local AI (Ollama): connected.' : 'Local AI (Ollama): unreachable.',
    ];
    const warnText = warnings.length > 0 ? `\n\nWarnings: ${warnings.join('; ')}. Update these in Settings.` : '';
    return { ok: cloudOk || ollamaOk, models, message: `${parts.join(' ')}${warnText}` };
  });

  function buildLlmMessages({ message, attachments = [], contextMessages = [] }) {
    const prompt = String(message || '').trim();
    const prior = Array.isArray(contextMessages)
      ? contextMessages
        .slice(-10)
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .map((item) => ({ role: item.role, content: item.content.slice(0, 6000) }))
      : [];
    const textParts = [prompt];
    const content = [{ type: 'text', text: prompt }];
    for (const attachment of Array.isArray(attachments) ? attachments : []) {
      const name = String(attachment?.name || 'attachment');
      const kind = String(attachment?.kind || 'file');
      if (kind === 'image' && typeof attachment.dataUrl === 'string' && attachment.dataUrl.startsWith('data:image/')) {
        content.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
        continue;
      }
      if (kind === 'text' && typeof attachment.text === 'string') {
        textParts.push(`\n\nAttached file: ${name}\n${attachment.text.slice(0, 12000)}`);
      } else {
        textParts.push(`\n\nAttached file: ${name} (${kind}; content not sent to model)`);
      }
    }
    if (textParts.length > 1) {
      content[0] = { type: 'text', text: textParts.join('') };
    }
    return [...prior, { role: 'user', content }];
  }

  async function modelChatCompletion(baseUrl, apiKey, model, messages) {
    const data = await modelChatRequest(baseUrl, apiKey, '/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        stream: false,
      }),
    });
    const content = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((part) => part?.text || '').join('') : String(content || '');
    if (!text) throw new Error('The model returned an empty response.');
    return text;
  }

  registerHandler('cron:model:chat', async ({ config, model, message, attachments, contextMessages }) => {
    const clean = cleanModelConfig(config);
    const prompt = String(message || '').trim();
    if (!prompt) throw new Error('A message is required.');
    const messages = buildLlmMessages({ message: prompt, attachments, contextMessages });
    const selectedModel = String(model || clean.cloud.chatModel).trim();
    // Cloud first; if the cloud is unreachable, fall back to local Ollama.
    let cloudError;
    try {
      const text = await modelChatCompletion(clean.cloud.baseUrl, clean.cloud.apiKey, selectedModel, messages);
      return { text };
    } catch (err) {
      cloudError = err;
    }
    try {
      const text = await modelChatCompletion(clean.ollama.baseUrl, '', clean.ollama.chatModel, messages);
      return { text };
    } catch (ollamaError) {
      const cloudMessage = cloudError instanceof Error ? cloudError.message : String(cloudError);
      throw new Error(`Cloud AI and local Ollama are both unavailable. Cloud error: ${cloudMessage}`, { cause: ollamaError });
    }
  });

  const summary = ipcRegistrator.complete();
  runtimeMarkerState.registeredIpcChannels = summary.channels;
  writeDevRuntimeMarker();
  if (IS_DEV) {
    logger.info(`IPC handler registration complete: ${summary.channels.length} channels registered`);
  }
  return summary;
}

async function ensureExecutionService() {
  if (executionService) return executionService;
  const ds = await ensureDataService();
  executionService = new ExecutionService({
    dataService: ds,
    harness: new SafeExecutionHarness(),
  });
  logger.info('Execution service started');
  return executionService;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.maximize();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.info(`[STARTUP] app ready at +${Date.now() - APP_STARTED_AT}ms`);
    // Dev mode must be self-sufficient for a direct electron.exe --dev launch:
    // self-start Vite when it isn't already running, then wait for it to serve.
    await ensureDevServerReachable();
    try {
      registerCronIpcHandlers();
      logger.info(`[STARTUP] IPC registration complete at +${Date.now() - APP_STARTED_AT}ms`);
    } catch (err) {
      // Registration must be loud: record exactly what is missing in the dev
      // marker so the launcher replaces this instance on the next launch, and
      // still open the window so the renderer can surface the visible error.
      const message = err instanceof Error ? err.message : String(err);
      runtimeMarkerState.registrationError = message;
      writeDevRuntimeMarker();
      logger.error('IPC handler registration failed at startup', { error: message });
    }
    createWindow();
    createTray();
    void ensureExecutionService().then((service) => {
      // Restart recovery: re-run approved-but-unfinished tasks.
      void service.recoverApprovedTasks().catch((err) => {
        logger.warn('Execution recovery failed', { error: String(err) });
      });
    });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    // Keep running in system tray
  });
}

app.on('before-quit', (event) => {
  if (!isQuitting && (dataService || executionService)) {
    event.preventDefault();
    isQuitting = true;
    const cleanup = [];
    if (dataService) {
      cleanup.push(dataService.destroy());
    }
    if (tray) {
      cleanup.push(Promise.resolve().then(() => {
        tray.destroy();
        tray = null;
        logger.info('Tray destroyed');
      }));
    }
    Promise.all(cleanup).catch((err) => {
      logger.error('Error during shutdown', { error: String(err) });
    }).finally(() => {
      app.quit();
    });
  }
});
