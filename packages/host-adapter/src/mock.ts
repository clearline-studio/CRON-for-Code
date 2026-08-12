import type { HostContext } from '@cron-code/contracts';
import { createHostContext } from '@cron-code/contracts';
import type {
  HostAdapter,
  HostEventListener,
  HostProjectAction,
  HostProjectActionResult,
  HostProjectSelection,
} from './types.js';

export function createMockHostAdapter(
  initialContext?: Partial<HostContext>,
): HostAdapter & {
  simulateProjectSelection(selection: HostProjectSelection): void;
  performActionMock: {
    last: HostProjectAction | null;
    count: number;
    failWith: Error | null;
    result: HostProjectActionResult;
  };
  restartMock: { count: number; failWith: Error | null };
} {
  let context = createHostContext('mock', 'Mock Host', {
    theme: 'dark',
    ...initialContext,
  });
  const listeners = new Set<HostEventListener>();
  const performActionMock = {
    last: null as HostProjectAction | null,
    count: 0,
    failWith: null as Error | null,
    result: { status: 'ok' as const },
  };
  const restartMock = { count: 0, failWith: null as Error | null };

  function emit(type: HostEventListener extends (event: infer T, data?: unknown) => void ? T : never, data?: unknown) {
    for (const listener of listeners) listener(type, data);
  }

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
      performActionMock.last = action;
      performActionMock.count += 1;
      if (performActionMock.failWith) throw performActionMock.failWith;
      emit('project-action', action);
      return performActionMock.result;
    },

    async restartApp(): Promise<void> {
      restartMock.count += 1;
      if (restartMock.failWith) throw restartMock.failWith;
    },

    performActionMock,
    restartMock,

    simulateProjectSelection(selection: HostProjectSelection): void {
      context = { ...context, activeProjectId: selection.rootPath };
      emit('project-selected', selection);
    },
  };
}
