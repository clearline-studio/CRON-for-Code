import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Boundary guard: the shared engine must stay host-neutral. Electron belongs
 * ONLY to apps/standalone (the desktop shell). Nothing in a shared package
 * source tree may import Electron or reach into the renderer host bridge
 * (window.cronHost). This is what lets Intelligence call Code as a module
 * without dragging along the desktop shell.
 */

const SHARED_PACKAGES = ['contracts', 'core', 'data-service', 'host-adapter'];
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
// The guard scans for forbidden strings, so it must never scan itself.
const SELF = resolve(HERE, 'handoff-boundary.test.ts');

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|mjs|cjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function isElectronImport(content: string): boolean {
  return content.includes("from 'electron'")
    || content.includes('from "electron"')
    || content.includes("require('electron')")
    || content.includes('require("electron")');
}

function isRendererBridgeRef(content: string): boolean {
  return content.includes('window.cronHost')
    || content.includes('globalThis.cronHost')
    || content.includes('contextBridge');
}

describe('shared engine host-neutrality boundary', () => {
  for (const pkg of SHARED_PACKAGES) {
    const srcDir = join(REPO_ROOT, 'packages', pkg, 'src');

    it(pkg + ' imports no Electron', () => {
      const offenders = collectSourceFiles(srcDir).filter((file) =>
        file !== SELF && isElectronImport(readFileSync(file, 'utf-8')),
      );
      expect(offenders).toEqual([]);
    });

    it(pkg + ' does not reach into the renderer host bridge', () => {
      const offenders = collectSourceFiles(srcDir).filter((file) =>
        file !== SELF && isRendererBridgeRef(readFileSync(file, 'utf-8')),
      );
      expect(offenders).toEqual([]);
    });
  }
});
