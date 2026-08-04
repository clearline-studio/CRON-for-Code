import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const viteProcess = spawn('pnpm', ['exec', 'vite'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CRON_DEV: '1' },
});

await new Promise((resolve) => setTimeout(resolve, 2000));

const electronProcess = spawn('pnpm', ['exec', 'electron', '.'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CRON_DEV: '1' },
});

electronProcess.on('close', () => {
  viteProcess.kill();
  process.exit(0);
});

viteProcess.on('close', () => {
  if (!electronProcess.killed) electronProcess.kill();
});
