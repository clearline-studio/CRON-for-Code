import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, clipboard, shell } from 'electron';
import path from 'node:path';
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
const DEFAULT_LM_STUDIO_CONFIG = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  textModel: 'gemma-4-26b-a4b-qat',
  visionModel: 'gemma-4-26b-a4b-qat',
  codingModel: 'deepseek/deepseek-v4-flash',
  escalationModel: 'deepseek/deepseek-v4-pro',
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
    defaultModel: DEFAULT_LM_STUDIO_CONFIG.codingModel,
    escalationModel: DEFAULT_LM_STUDIO_CONFIG.escalationModel,
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
    if (!params.isEditable) return;
    const editMenu = Menu.buildFromTemplate([
      { role: 'cut', enabled: params.editFlags.canCut },
      { role: 'copy', enabled: params.editFlags.canCopy },
      { role: 'paste', enabled: params.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', enabled: params.editFlags.canSelectAll },
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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open CC',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Show active tasks',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('cron:tray:show-tasks');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Pause current task',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('cron:tray:pause-task');
        }
      },
    },
    {
      label: 'Stop current task',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('cron:tray:stop-task');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit CC',
      click: () => {
        app.quit();
      },
    },
  ]);

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

  registerHandler('cron:select-folder', async () => {
    if (!mainWindow) return null;
    if (IS_DEV && process.env.CRON_CODE_DEV_PICKER_NO_DIALOG === '1') {
      // Dev-only diagnostic: prove the CRON-styled picker flow live without
      // opening a blocking OS dialog. One-shot; consumed here.
      delete process.env.CRON_CODE_DEV_PICKER_NO_DIALOG;
      logger.info('Dev picker diagnostic: folder dialog bypassed, returning null');
      return null;
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return path.resolve(result.filePaths[0]);
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
      model: typeof input?.model === 'string' ? input.model : DEFAULT_LM_STUDIO_CONFIG.codingModel,
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
           const settings = [...document.querySelectorAll('div')].some((d) => (d.textContent || '').includes('LM Studio'));
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

  // --- LM Studio IPC ---

  function cleanLlmConfig(config = {}) {
    const baseUrl = String(config.baseUrl || DEFAULT_LM_STUDIO_CONFIG.baseUrl).trim().replace(/\/+$/, '');
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('LM Studio URL must start with http:// or https://');
    }
    return {
      baseUrl,
      textModel: String(config.textModel || DEFAULT_LM_STUDIO_CONFIG.textModel).trim(),
      visionModel: String(config.visionModel || DEFAULT_LM_STUDIO_CONFIG.visionModel).trim(),
      codingModel: String(config.codingModel || DEFAULT_LM_STUDIO_CONFIG.codingModel).trim(),
      escalationModel: String(config.escalationModel || DEFAULT_LM_STUDIO_CONFIG.escalationModel).trim(),
    };
  }

  async function lmStudioRequest(config, endpoint, options = {}) {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`LM Studio returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
    }
    return response.json();
  }

  registerHandler('cron:lmstudio:get-config', async () => {
    const ds = await ensureDataService();
    const saved = await ds.preferences.get('lmstudio.config');
    try {
      return cleanLlmConfig(saved ? JSON.parse(saved) : DEFAULT_LM_STUDIO_CONFIG);
    } catch {
      return DEFAULT_LM_STUDIO_CONFIG;
    }
  });

  registerHandler('cron:lmstudio:save-config', async (config) => {
    const ds = await ensureDataService();
    const clean = cleanLlmConfig(config);
    await ds.preferences.set('lmstudio.config', JSON.stringify(clean));
  });

  registerHandler('cron:lmstudio:test', async (config) => {
    const clean = cleanLlmConfig(config);
    const data = await lmStudioRequest(clean, '/models');
    const models = Array.isArray(data?.data) ? data.data.map((model) => String(model.id)).filter(Boolean) : [];
    return { ok: true, models, message: `Connected. ${models.length} model${models.length === 1 ? '' : 's'} available.` };
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

  registerHandler('cron:lmstudio:chat', async ({ config, model, message, attachments, contextMessages }) => {
    const clean = cleanLlmConfig(config);
    const selectedModel = String(model || clean.textModel).trim();
    const prompt = String(message || '').trim();
    if (!selectedModel || !prompt) throw new Error('A model and message are required.');
    const messages = buildLlmMessages({ message: prompt, attachments, contextMessages });
    const data = await lmStudioRequest(clean, '/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.2,
        stream: false,
      }),
    });
    const content = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((part) => part?.text || '').join('') : String(content || '');
    if (!text) throw new Error('LM Studio returned an empty response.');
    return { text };
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

  app.whenReady().then(() => {
    logger.info(`[STARTUP] app ready at +${Date.now() - APP_STARTED_AT}ms`);
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
