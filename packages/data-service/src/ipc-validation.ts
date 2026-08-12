import { createExecutionError } from '@cron-code/contracts';
import type { ExecutionError, ProjectAvailability } from '@cron-code/contracts';

const KNOWN_COMMAND_IDS: readonly string[] = [
  'repo.identity',
  'repo.status',
  'repo.diff-check',
  'repo.changed-files',
  'repo.untracked-files',
  'repo.diff-stat',
  'repo.diff-name-status',
  'repo.diff',
  'project.test',
  'project.typecheck',
  'project.lint',
  'project.format-check',
  'project.build',
  'project.package-test',
  'node.syntax-check',
  'powershell.script-test',
];

export const KNOWN_COMMAND_ID_SET: ReadonlySet<string> = new Set(KNOWN_COMMAND_IDS);

/** Validates a command id submitted over IPC. Renderer may only use stable catalogue ids. */
export function assertKnownCommandId(commandId: unknown): string {
  if (typeof commandId !== 'string' || commandId.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'commandId must be a non-empty string');
  }
  if (!KNOWN_COMMAND_ID_SET.has(commandId)) {
    throw createExecutionError('UNKNOWN_COMMAND', `Unknown command id: ${commandId}`);
  }
  return commandId;
}

export function assertTaskId(taskId: unknown): string {
  if (typeof taskId !== 'string' || taskId.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'taskId must be a non-empty string');
  }
  return taskId;
}

export function assertExecutionId(executionId: unknown): string {
  if (typeof executionId !== 'string' || executionId.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'executionId must be a non-empty string');
  }
  return executionId;
}

export function assertProjectId(projectId: unknown): string {
  if (typeof projectId !== 'string' || projectId.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'projectId must be a non-empty string');
  }
  return projectId;
}

const PROJECT_ID_PATTERN = /^proj_[A-Za-z0-9_-]+$/;
const EXECUTION_ID_PATTERN = /^exe_[A-Za-z0-9_-]+$/;
const TASK_ID_PATTERN = /^task_[A-Za-z0-9_-]+$/;

/** Stricter project id validation (canonical `proj_` prefix). */
export function assertCanonicalProjectId(projectId: unknown): string {
  const id = assertProjectId(projectId);
  if (!PROJECT_ID_PATTERN.test(id)) {
    throw createExecutionError('INVALID_REQUEST', 'projectId has an unexpected shape', id);
  }
  return id;
}

export function assertCanonicalTaskId(taskId: unknown): string {
  const id = assertTaskId(taskId);
  if (!TASK_ID_PATTERN.test(id)) {
    throw createExecutionError('INVALID_REQUEST', 'taskId has an unexpected shape', id);
  }
  return id;
}

export function assertCanonicalExecutionId(executionId: unknown): string {
  const id = assertExecutionId(executionId);
  if (!EXECUTION_ID_PATTERN.test(id)) {
    throw createExecutionError('INVALID_REQUEST', 'executionId has an unexpected shape', id);
  }
  return id;
}

/** Validates a non-empty trimmed project display name. Folder name is never used. */
export function assertProjectName(name: unknown): string {
  if (typeof name !== 'string') {
    throw createExecutionError('INVALID_REQUEST', 'project name must be a string');
  }
  const trimmed = name.trim();
  if (trimmed === '') {
    throw createExecutionError('INVALID_REQUEST', 'project name cannot be empty');
  }
  if (trimmed.length > 120) {
    throw createExecutionError('INVALID_REQUEST', 'project name is too long');
  }
  return trimmed;
}

const PROJECT_AVAILABILITY_VALUES: readonly ProjectAvailability[] = [
  'available',
  'missing',
  'unavailable',
];

export function assertProjectAvailability(value: unknown): ProjectAvailability {
  if (typeof value !== 'string' || !PROJECT_AVAILABILITY_VALUES.includes(value as ProjectAvailability)) {
    throw createExecutionError(
      'INVALID_REQUEST',
      `availability must be one of ${PROJECT_AVAILABILITY_VALUES.join(', ')}`,
    );
  }
  return value as ProjectAvailability;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Structural validation for an ExecutionRecord submitted over IPC. */
export function isValidExecutionRecordShape(record: unknown): boolean {
  if (!isPlainObject(record)) return false;
  if (typeof record.id !== 'string') return false;
  if (typeof record.status !== 'string') return false;
  if (typeof record.commandId !== 'string') return false;
  if (typeof record.taskId !== 'string') return false;
  if (typeof record.projectId !== 'string') return false;
  if (typeof record.cwd !== 'string') return false;
  if (typeof record.startedAt !== 'number') return false;
  if (!Array.isArray(record.args)) return false;
  if (!record.args.every((arg) => typeof arg === 'string')) return false;
  return true;
}

/** Structural validation for an AuditRecord submitted over IPC. */
export function isValidAuditRecordShape(record: unknown): boolean {
  if (!isPlainObject(record)) return false;
  if (typeof record.id !== 'string') return false;
  if (typeof record.eventType !== 'string') return false;
  if (typeof record.timestamp !== 'number') return false;
  return true;
}

/** Sanitises an audit-list filter to known string keys only. */
export function sanitizeAuditFilter(filter: unknown): { taskId?: string; projectId?: string; executionId?: string } | undefined {
  if (!isPlainObject(filter)) return undefined;
  const result: { taskId?: string; projectId?: string; executionId?: string } = {};
  if (typeof filter.taskId === 'string') result.taskId = filter.taskId;
  if (typeof filter.projectId === 'string') result.projectId = filter.projectId;
  if (typeof filter.executionId === 'string') result.executionId = filter.executionId;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function toIpcError(err: unknown): ExecutionError {
  if (err && typeof err === 'object' && 'code' in err) {
    const candidate = err as ExecutionError;
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return candidate;
    }
  }
  return createExecutionError('LAUNCH_FAILED', err instanceof Error ? err.message : String(err));
}
