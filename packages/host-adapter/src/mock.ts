import type { HostContext } from '@cron-code/contracts';
import { createHostContext } from '@cron-code/contracts';
import type { HostAdapter, HostEventListener, HostProjectSelection } from './types.js';

export function createMockHostAdapter(
  initialContext?: Partial<HostContext>,
): HostAdapter & { simulateProjectSelection(selection: HostProjectSelection): void } {
  let context = createHostContext('mock', 'Mock Host', {
    theme: 'dark',
    ...initialContext,
  });
  const listeners = new Set<HostEventListener>();

  return {
    get context() {
      return context;
    },

    async selectProject(): Promise<HostProjectSelection | null> {
      await new Promise((r) => setTimeout(r, 0));
      return null;
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

    simulateProjectSelection(selection: HostProjectSelection): void {
      context = { ...context, activeProjectId: selection.rootPath };
      for (const listener of listeners) {
        listener('project-selected', selection);
      }
    },
  };
}
