import type { HostContext } from '@cron-code/contracts';

export interface HostProjectSelection {
  readonly rootPath: string;
  readonly name: string;
}

export type HostEventType =
  | 'context-changed'
  | 'project-selected'
  | 'navigate-requested'
  | 'lifecycle-pause'
  | 'lifecycle-resume';

export type HostEventListener = (event: HostEventType, data?: unknown) => void;

export interface HostAdapter {
  readonly context: HostContext;

  selectProject(): Promise<HostProjectSelection | null>;
  updateContext(partial: Partial<HostContext>): void;
  onEvent(listener: HostEventListener): () => void;
  destroy(): void;
}
