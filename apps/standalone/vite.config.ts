import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const currentDir = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@cron-code/core': resolve(currentDir, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
  },
});
