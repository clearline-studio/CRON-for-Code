import type { HostContext } from '@cron-code/contracts';
import { createHostContext } from '@cron-code/contracts';
import type {
  HostAdapter,
  HostEventListener,
  HostEventType,
  HostProjectAction,
  HostProjectActionResult,
  HostProjectSelection,
} from './types.js';

export interface StandaloneHostActionBridge {
  perform(action: HostProjectAction): Promise<HostProjectActionResult>;
  restart(): Promise<void>;
}

export interface StandaloneHostDeps {
  selectFolder(): Promise<string | null>;
  hostActionBridge?: StandaloneHostActionBridge;
}

export function createStandaloneHostAdapter(deps: StandaloneHostDeps): HostAdapter {
  let context: HostContext = createHostContext('standalone', 'CRON for Code');
  const listeners = new Set<HostEventListener>();

  function emit(event: HostEventType, data?: unknown): void {
    for (const listener of listeners) listener(event, data);
  }

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
      emit('project-selected', selection);

      return selection;
    },

    updateContext(partial: Partial<HostContext>): void {
      context = { ...context, ...partial };
      emit('context-changed', context);
    },

    onEvent(listener: HostEventListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy(): void {
      listeners.clear();
    },

    async performProjectAction(action: HostProjectAction): Promise<HostProjectActionResult> {
      if (!deps.hostActionBridge) {
        throw new Error('Project actions are not available in this host');
      }
      const result = await deps.hostActionBridge.perform(action);
      emit('project-action', action);
      return result ?? { status: 'ok' };
    },

    async restartApp(): Promise<void> {
      if (!deps.hostActionBridge) {
        throw new Error('Restart is not available in this host');
      }
      await deps.hostActionBridge.restart();
    },
  };
}
