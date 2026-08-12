export type ExecutionStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'timed_out';

export type ExecutionErrorCode =
  | 'INVALID_REQUEST'
  | 'UNKNOWN_COMMAND'
  | 'BOUNDARY_VIOLATION'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_EXPIRED'
  | 'APPROVAL_MISMATCH'
  | 'LAUNCH_FAILED'
  | 'RUNNER_UNAVAILABLE'
  | 'RUNNER_BLOCKED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'OUTPUT_LIMIT'
  | 'FORBIDDEN_EXECUTABLE'
  | 'FORBIDDEN_ARGUMENT'
  | 'NOT_A_REPOSITORY'
  | 'PATH_REJECTED';

export type CommandCategory = 'repo' | 'project' | 'node' | 'powershell';

export type OutputType = 'text' | 'json' | 'diff' | 'none';

export type RiskCategory = 'low' | 'medium' | 'high';

export interface ExecutionCommand {
  /** Stable catalogue identifier, e.g. `repo.status`. */
  readonly id: string;
  readonly category: CommandCategory;
  /** Human/machine readable command line used for display and approval. */
  readonly displayCommand: string;
  readonly executable: string;
  /** Fixed, validated argument vector (never includes user free text). */
  readonly args: readonly string[];
  readonly readOnly: boolean;
  readonly requiresApproval: boolean;
  readonly timeoutMs: number;
  readonly outputType: OutputType;
  readonly risk: RiskCategory;
}

export interface ExecutionRequest {
  readonly taskId: string;
  readonly projectId: string;
  readonly commandId: string;
  /** Verified canonical working directory for this execution. */
  readonly cwd: string;
  /** Pre-resolved argument vector. Validated by the catalogue; not free text. */
  readonly args: readonly string[];
  readonly approvalId?: string;
  readonly reason?: string;
}

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
  truncated: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutLines: number;
  stderrLines: number;
  redacted: boolean;
}

export interface ExecutionError {
  readonly code: ExecutionErrorCode;
  readonly message: string;
  readonly details?: string;
}

export interface ExecutionTimeout {
  readonly timeoutMs: number;
  readonly exceeded: boolean;
}

export interface ExecutionCancellation {
  readonly requested: boolean;
  readonly requestedAt: number | null;
}

export interface ExecutionRecord {
  readonly id: string;
  readonly status: ExecutionStatus;
  readonly commandId: string;
  readonly taskId: string;
  readonly projectId: string;
  readonly approvalId: string | null;
  readonly cwd: string;
  readonly executable: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly output: ExecutionOutput;
  readonly error: ExecutionError | null;
  readonly timeout: ExecutionTimeout;
  readonly cancellation: ExecutionCancellation;
  readonly redacted: boolean;
  readonly retryable: boolean;
  readonly createdAt: number;
}

export type AuditEventType =
  | 'task.created'
  | 'task.queued'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.blocked'
  | 'execution.cancelled'
  | 'execution.timed_out'
  | 'project.archived'
  | 'project.restored'
  | 'project.renamed'
  | 'project.relinked'
  | 'project.refreshed'
  | 'app.restart_requested';

export interface AuditRecord {
  readonly id: string;
  readonly eventType: AuditEventType;
  readonly timestamp: number;
  readonly taskId: string | null;
  readonly projectId: string | null;
  readonly approvalId: string | null;
  readonly executionId: string | null;
  readonly commandId: string | null;
  readonly cwd: string | null;
  readonly actor: string;
  readonly transition: string | null;
  readonly exitCode: number | null;
  readonly outputReference: string | null;
  readonly redacted: boolean;
  readonly errorCode: string | null;
  readonly evidenceLink: string | null;
}

export interface ExecutionApprovalRequirement {
  readonly approvalId: string;
  readonly taskId: string;
  readonly projectId: string;
  readonly commandId: string;
  readonly cwd: string;
  readonly risk: RiskCategory;
  readonly reason: string;
  readonly status: 'required' | 'satisfied' | 'denied' | 'expired';
}

export function createExecutionOutput(options?: {
  stdout?: string;
  stderr?: string;
  truncated?: boolean;
  redacted?: boolean;
  /** Total stdout bytes emitted (may exceed retained string when truncated). */
  stdoutBytes?: number;
  /** Total stderr bytes emitted (may exceed retained string when truncated). */
  stderrBytes?: number;
  /** Total stdout line count emitted. */
  stdoutLines?: number;
  /** Total stderr line count emitted. */
  stderrLines?: number;
}): ExecutionOutput {
  const stdout = options?.stdout ?? '';
  const stderr = options?.stderr ?? '';
  return {
    stdout,
    stderr,
    truncated: options?.truncated ?? false,
    stdoutBytes: options?.stdoutBytes ?? Buffer.byteLength(stdout, 'utf-8'),
    stderrBytes: options?.stderrBytes ?? Buffer.byteLength(stderr, 'utf-8'),
    stdoutLines: options?.stdoutLines ?? (stdout === '' ? 0 : stdout.split('\n').length),
    stderrLines: options?.stderrLines ?? (stderr === '' ? 0 : stderr.split('\n').length),
    redacted: options?.redacted ?? false,
  };
}

export function createExecutionError(
  code: ExecutionErrorCode,
  message: string,
  details?: string,
): ExecutionError {
  return { code, message, details };
}

export function createExecutionRecord(input: {
  id: string;
  status: ExecutionStatus;
  commandId: string;
  taskId: string;
  projectId: string;
  approvalId: string | null;
  cwd: string;
  executable: string;
  args: readonly string[];
  displayCommand: string;
  startedAt: number;
  endedAt: number | null;
  exitCode: number | null;
  signal?: string | null;
  output?: ExecutionOutput;
  error?: ExecutionError | null;
  timeout?: ExecutionTimeout;
  cancellation?: ExecutionCancellation;
  redacted?: boolean;
  retryable?: boolean;
  createdAt?: number;
}): ExecutionRecord {
  const now = input.createdAt ?? Date.now();
  const durationMs = input.endedAt === null ? null : Math.max(0, input.endedAt - input.startedAt);
  return {
    id: input.id,
    status: input.status,
    commandId: input.commandId,
    taskId: input.taskId,
    projectId: input.projectId,
    approvalId: input.approvalId,
    cwd: input.cwd,
    executable: input.executable,
    args: input.args,
    displayCommand: input.displayCommand,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMs,
    exitCode: input.exitCode,
    signal: input.signal ?? null,
    output: input.output ?? createExecutionOutput(),
    error: input.error ?? null,
    timeout: input.timeout ?? { timeoutMs: 0, exceeded: false },
    cancellation: input.cancellation ?? { requested: false, requestedAt: null },
    redacted: input.redacted ?? false,
    retryable: input.retryable ?? false,
    createdAt: now,
  };
}

export function createAuditRecord(input: {
  id: string;
  eventType: AuditEventType;
  timestamp?: number;
  taskId?: string | null;
  projectId?: string | null;
  approvalId?: string | null;
  executionId?: string | null;
  commandId?: string | null;
  cwd?: string | null;
  actor?: string;
  transition?: string | null;
  exitCode?: number | null;
  outputReference?: string | null;
  redacted?: boolean;
  errorCode?: string | null;
  evidenceLink?: string | null;
}): AuditRecord {
  return {
    id: input.id,
    eventType: input.eventType,
    timestamp: input.timestamp ?? Date.now(),
    taskId: input.taskId ?? null,
    projectId: input.projectId ?? null,
    approvalId: input.approvalId ?? null,
    executionId: input.executionId ?? null,
    commandId: input.commandId ?? null,
    cwd: input.cwd ?? null,
    actor: input.actor ?? 'cron',
    transition: input.transition ?? null,
    exitCode: input.exitCode ?? null,
    outputReference: input.outputReference ?? null,
    redacted: input.redacted ?? false,
    errorCode: input.errorCode ?? null,
    evidenceLink: input.evidenceLink ?? null,
  };
}

/** Deterministic, conservative transition table for the execution lifecycle. */
export function canTransitionExecution(
  from: ExecutionStatus,
  to: ExecutionStatus,
): boolean {
  if (from === to) return true;
  switch (from) {
    case 'requested':
      return to === 'approved' || to === 'rejected';
    case 'approved':
      return to === 'running' || to === 'rejected';
    case 'rejected':
      return false;
    case 'running':
      return (
        to === 'completed' ||
        to === 'failed' ||
        to === 'blocked' ||
        to === 'cancelled' ||
        to === 'timed_out'
      );
    case 'completed':
    case 'failed':
    case 'blocked':
    case 'cancelled':
    case 'timed_out':
      return false;
    default:
      return false;
  }
}

export function isFinalExecutionStatus(status: ExecutionStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'blocked' ||
    status === 'cancelled' ||
    status === 'timed_out'
  );
}
