import { spawn, spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..', '..');

// Optional support used by the hidden dev launcher (scripts/run-code-dev-hidden.ps1).
// - CRON_DEV_LOG_DIR: write per-process stdout/stderr to files under this directory.
// - CRON_CODE_DEV_PORT: run the dev server on an alternate port (also forwarded to Electron).
// - CRON_RUN_MODE: 'dev' (default) starts Vite + Electron with HMR; 'normal' skips
//   Vite entirely and runs Electron against the production-built renderer
//   (dist-renderer, file://) so ordinary daily use never pays the dev-server cost.
//   Restart supervision stays identical in both modes.
// When neither is set, behaviour is identical to the original script (inherit stdio, port 5180).
const logDir = process.env.CRON_DEV_LOG_DIR ? resolve(process.env.CRON_DEV_LOG_DIR) : null;
const devPort = process.env.CRON_CODE_DEV_PORT ? String(process.env.CRON_CODE_DEV_PORT).trim() : '';
const runMode = process.env.CRON_RUN_MODE === 'normal' ? 'normal' : 'dev';
const isNormalMode = runMode === 'normal';

// In-app restart intent (written by Electron main before it quits). dev.mjs is
// Electron's parent and survives Electron's exit, so it owns the relaunch.
const restartIntentPath = join(repoRoot, '.runtime', 'code-dev-restart-requested.json');
const RESTART_INTENT_MAX_AGE_MS = 300_000;

function childOptions(name) {
  if (!logDir) return { stdio: 'inherit' };
  const fd = fs.openSync(join(logDir, name), 'a');
  return { stdio: ['ignore', fd, fd] };
}

function supervisorLog(line) {
  if (!logDir) return;
  try {
    fs.appendFileSync(
      join(logDir, 'code-dev-supervisor.log'),
      `[${new Date().toISOString()}] ${line}\n`,
      'utf8',
    );
  } catch { /* best effort */ }
}

function readRestartIntent() {
  try {
    if (!fs.existsSync(restartIntentPath)) return null;
    let raw = fs.readFileSync(restartIntentPath, 'utf8');
    // Tolerate a UTF-8 BOM if another tool rewrote the file (JSON.parse rejects it).
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const obj = JSON.parse(raw);
    const requestedAt = Number(obj?.requestedAt) || 0;
    if (requestedAt <= 0) return null;
    const ageMs = Date.now() - requestedAt;
    if (ageMs < 0 || ageMs > RESTART_INTENT_MAX_AGE_MS) return null;
    return obj;
  } catch { return null; }
}

function clearRestartIntent() {
  try {
    if (fs.existsSync(restartIntentPath)) fs.unlinkSync(restartIntentPath);
  } catch { /* best effort */ }
}

// Kill the whole child process tree synchronously. With shell:true the spawn PID is a cmd shim,
// so a plain kill() (or an async taskkill) would orphan the real vite/electron process on Windows.
function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch { /* best effort */ }
}

const viteArgs = ['exec', 'vite', ...(devPort ? ['--port', devPort] : [])];

const viteProcess = isNormalMode ? null : spawn('pnpm', viteArgs, {
  cwd: projectRoot,
  shell: true,
  ...childOptions('code-dev-vite.log'),
  env: { ...process.env, CRON_DEV: '1' },
});

if (!isNormalMode) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

function buildElectronEnv(restarting = false) {
  const base = isNormalMode
    ? { ...process.env, CRON_DEV: '0' }
    : { ...process.env, CRON_DEV: '1' };
  return {
    ...base,
    ...(restarting ? { CRON_CODE_RESTARTING: '1' } : {}),
    ...(devPort ? { CRON_CODE_DEV_URL: `http://127.0.0.1:${devPort}` } : {}),
  };
}

let electronProcess = null;

const electronCandidates = [
  join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe'),
  join(repoRoot, 'node_modules', 'electron', 'dist', 'electron.exe'),
];
const electronExe = electronCandidates.find((candidate) => fs.existsSync(candidate));

function startElectron(restarting = false) {
  const env = buildElectronEnv(restarting);
  const proc = electronExe
    ? spawn(electronExe, ['.'], {
        cwd: projectRoot,
        shell: false,
        windowsHide: true,
        ...childOptions('code-dev-electron.log'),
        env,
      })
    : spawn('pnpm', ['exec', 'electron', '.'], {
        cwd: projectRoot,
        shell: true,
        ...childOptions('code-dev-electron.log'),
        env,
      });
  proc.on('close', () => onElectronClosed(proc));
  electronProcess = proc;
}

function onElectronClosed(closedProc) {
  if (closedProc !== electronProcess) {
    // A superseded instance closed (the replacement was spawned by the intent
    // poll while the old one was still running). The current stack continues.
    supervisorLog('Superseded Electron instance closed; the replacement continues');
    return;
  }
  const intent = readRestartIntent();
  if (intent) {
    // Fresh in-app restart intent: relaunch Electron on the still-live Vite
    // server. Electron's own children die with it (kill-on-close job), so the
    // relaunch MUST come from here - the process that spawned Electron, outside
    // that job. The launcher/shortcut path stays as the recovery route.
    clearRestartIntent();
    // Dev-only one-shot probes must not loop into the relaunched child.
    delete process.env.CRON_CODE_DEV_TEST_RESTART;
    delete process.env.CRON_CODE_DEV_TEST_CLICK_RESTART;
    supervisorLog(`Restart intent consumed (pid ${intent.pid}); relaunching Electron`);
    startElectron(true);
    return;
  }
  supervisorLog('Electron closed without a restart intent; tearing down');
  if (viteProcess) killTree(viteProcess.pid);
  process.exit(0);
}

// Gap-free restart: the in-app restart writes the intent while the OLD window
// is still showing the Restarting overlay (main releases the single-instance
// lock first). Poll the intent so the replacement is spawned immediately,
// BEFORE the old instance exits - the user then sees one continuous Restarting
// screen instead of a vanishing window and a gap.
setInterval(() => {
  const intent = readRestartIntent();
  if (intent) {
    clearRestartIntent();
    delete process.env.CRON_CODE_DEV_TEST_RESTART;
    delete process.env.CRON_CODE_DEV_TEST_CLICK_RESTART;
    supervisorLog(`Restart intent consumed (pid ${intent.pid}) via poll; spawning replacement`);
    startElectron(true);
  }
}, 400);

startElectron();
supervisorLog(`dev.mjs supervising started (mode=${runMode})`);

if (viteProcess) {
  viteProcess.on('close', () => {
    if (electronProcess && !electronProcess.killed) killTree(electronProcess.pid);
  });
}
