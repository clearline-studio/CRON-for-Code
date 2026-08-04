import type { HostContext } from '@cron-code/contracts';
import { createHostContext } from '@cron-code/contracts';
import type { HostAdapter, HostEventListener, HostProjectSelection } from './types.js';

export interface StandaloneHostDeps {
  selectFolder(): Promise<string | null>;
}

export function createStandaloneHostAdapter(deps: StandaloneHostDeps): HostAdapter {
  let context: HostContext = createHostContext('standalone', 'CRON for Code');
  const listeners = new Set<HostEventListener>();

  return {
    get context() {
      return context;
    },

    async selectProject(): Promise<HostProjectSelection | null> {
      const folderPath = await deps.selectFolder();
      if (!folderPath) return null;

      const parts = folderPath.replace(/\\/g, '/').split('/').filter(Boolean);
      const name = parts[parts.length - 1] || folderPath;

      const selection: HostProjectSelection = {
        rootPath: folderPath,
        name,
      };

      context = { ...context, activeProjectId: folderPath };
      for (const listener of listeners) {
        listener('project-selected', selection);
      }

      return selection;
    },

    updateContext(partial: Partial<HostContext>): void {
      context = { ...context, ...partial };
      for (const listener of listeners) {
        listener('context-changed', context);
      }
    },

    onEvent(listener: HostEventListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy(): void {
      listeners.clear();
    },
  };
}
