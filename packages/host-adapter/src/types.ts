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
  | 'lifecycle-resume'
  | 'project-action';

export type HostEventListener = (event: HostEventType, data?: unknown) => void;

export type HostProjectAction =
  | { kind: 'reveal'; projectId: string }
  | { kind: 'copy-path'; projectId: string }
  | { kind: 'refresh'; projectId: string }
  | { kind: 'rename'; projectId: string; nextName: string }
  | { kind: 'relink'; projectId: string; newRootPath?: string }
  | { kind: 'archive'; projectId: string }
  | { kind: 'restart' };

/** Structured result of a host project action. Cancellation is a first-class
 *  non-error result, never a thrown exception. */
export type HostProjectActionResult =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'conflict'; conflictProjectId: string; conflictRootPath: string };

export interface HostAdapter {
  readonly context: HostContext;

  selectProject(): Promise<HostProjectSelection | null>;
  updateContext(partial: Partial<HostContext>): void;
  onEvent(listener: HostEventListener): () => void;
  destroy(): void;
  /** Invokes an audited, validated project-management host action. */
  performProjectAction(action: HostProjectAction): Promise<HostProjectActionResult>;
  /** Requests a CRON app restart through the approved lifecycle path. */
  restartApp(): Promise<void>;
}
