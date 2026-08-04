import { app, BrowserWindow, Tray, Menu, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createJsonDataService, logger, TaskRunner, CommandExecutor } from '@cron-code/data-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
const RENDERER_ENTRY = path.join(projectRoot, 'dist-renderer', 'index.html');
const DEV_URL = 'http://127.0.0.1:5180';
const ICON_PATH = path.join(projectRoot, 'branding', 'assets', 'code_icon.ico');

const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

let mainWindow = null;
let tray = null;
let dataService = null;
let taskRunner = null;
let isQuitting = false;

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

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(RENDERER_ENTRY);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
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

function handleIpcSafe(channel, handler) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`IPC ${channel} failed`, { error: message });
      throw new Error(message);
    }
  });
}

handleIpcSafe('cron:select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return path.resolve(result.filePaths[0]);
});

// --- Persistence IPC ---

handleIpcSafe('cron:db:load-all', async () => {
  const ds = await ensureDataService();
  const [projects, tasks, approvals] = await Promise.all([
    ds.projects.list(),
    ds.tasks.listAll(),
    ds.approvals.listAll(),
  ]);
  const prefs = { theme: await ds.preferences.get('theme') };
  return { projects, tasks, approvals, preferences: prefs };
});

handleIpcSafe('cron:db:save-project', async (project) => {
  const ds = await ensureDataService();
  await ds.projects.save(project);
});

handleIpcSafe('cron:db:delete-project', async (id) => {
  const ds = await ensureDataService();
  await ds.projects.delete(id);
});

handleIpcSafe('cron:db:save-task', async (task) => {
  const ds = await ensureDataService();
  await ds.tasks.save(task);
});

handleIpcSafe('cron:db:delete-task', async (id) => {
  const ds = await ensureDataService();
  await ds.tasks.delete(id);
});

handleIpcSafe('cron:db:save-approval', async (approval) => {
  const ds = await ensureDataService();
  await ds.approvals.save(approval);
});

handleIpcSafe('cron:db:delete-approval', async (id) => {
  const ds = await ensureDataService();
  await ds.approvals.delete(id);
});

handleIpcSafe('cron:db:set-preference', async (key, value) => {
  const ds = await ensureDataService();
  await ds.preferences.set(key, value);
});

handleIpcSafe('cron:db:get-preference', async (key) => {
  const ds = await ensureDataService();
  return ds.preferences.get(key);
});

// --- Task lifecycle IPC ---

handleIpcSafe('cron:db:update-task-status', async (id, status, error) => {
  const ds = await ensureDataService();
  await ds.tasks.updateStatus(id, status, error);
});

handleIpcSafe('cron:db:queue-task', async (id) => {
  const ds = await ensureDataService();
  await ds.tasks.queue(id);
});

handleIpcSafe('cron:db:resolve-approval', async (id, status, reason) => {
  const ds = await ensureDataService();
  await ds.approvals.resolve(id, status, reason);
});

handleIpcSafe('cron:task:run-now', async (taskId) => {
  await ensureDataService();
  if (taskRunner) {
    await taskRunner.runNow(taskId);
  }
});

async function initTaskRunner() {
  const ds = await ensureDataService();
  taskRunner = new TaskRunner({
    dataService: ds,
    executor: new CommandExecutor(
      'node -e "var d=\'\';process.stdin.on(\'data\',function(c){d+=c});process.stdin.on(\'end\',function(){console.log(d);process.exit(0)})"',
    ),
  });
  taskRunner.start();
  logger.info('Task runner started');
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
    createWindow();
    createTray();
    void initTaskRunner();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    // Keep running in system tray
  });
}

app.on('before-quit', (event) => {
  if (!isQuitting && (dataService || taskRunner)) {
    event.preventDefault();
    isQuitting = true;
    const cleanup = [];
    if (taskRunner) {
      cleanup.push(taskRunner.stop().then(() => {
        logger.info('Task runner stopped');
      }));
    }
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
