export type ApprovalStatus = 'requested' | 'approved' | 'rejected' | 'expired';

export type ApprovalActionCategory =
  | 'read'
  | 'write'
  | 'execute'
  | 'delete'
  | 'network'
  | 'project_scope_change';

export interface Approval {
  id: string;
  taskId: string;
  projectId: string;
  status: ApprovalStatus;
  actionCategory: ApprovalActionCategory;
  description: string;
  reason: string | null;
  requestedAt: number;
  respondedAt: number | null;
  expiresAt: number | null;
  /** Command catalogue id this approval covers, when tied to execution. */
  commandId?: string | null;
  /** Execution id this approval covers, when tied to execution. */
  executionId?: string | null;
  /** Verified working directory this approval covers, when tied to execution. */
  cwd?: string | null;
  /** Human readable command summary shown during approval. */
  commandSummary?: string | null;
  /** Requester identity/source. */
  requester?: string;
  /** Risk category for execution approvals. */
  riskCategory?: 'low' | 'medium' | 'high';
  /** OpenCode server session id for server-backed approvals. */
  openCodeSessionId?: string | null;
  /** OpenCode server permission/request id for server-backed approvals. */
  openCodePermissionId?: string | null;
  /** OpenCode server message id associated with the permission, when known. */
  openCodeMessageId?: string | null;
  /** OpenCode server tool call id associated with the permission, when known. */
  openCodeCallId?: string | null;
}

export interface CreateApprovalOptions {
  expiresAt?: number;
  commandId?: string;
  executionId?: string;
  cwd?: string;
  commandSummary?: string;
  requester?: string;
  riskCategory?: 'low' | 'medium' | 'high';
  openCodeSessionId?: string;
  openCodePermissionId?: string;
  openCodeMessageId?: string;
  openCodeCallId?: string;
}

export function createApproval(
  id: string,
  taskId: string,
  projectId: string,
  actionCategory: ApprovalActionCategory,
  description: string,
  expiresAt?: number,
): Approval {
  return {
    id,
    taskId,
    projectId,
    status: 'requested',
    actionCategory,
    description,
    reason: null,
    requestedAt: Date.now(),
    respondedAt: null,
    expiresAt: expiresAt ?? null,
  };
}

/** Creates an approval specifically tied to an execution (task + command + cwd). */
export function createExecutionApproval(
  id: string,
  taskId: string,
  projectId: string,
  description: string,
  options: CreateApprovalOptions = {},
): Approval {
  return {
    id,
    taskId,
    projectId,
    status: 'requested',
    actionCategory: 'execute',
    description,
    reason: null,
    requestedAt: Date.now(),
    respondedAt: null,
    expiresAt: options.expiresAt ?? null,
    commandId: options.commandId ?? null,
    cwd: options.cwd ?? null,
    commandSummary: options.commandSummary ?? description,
    requester: options.requester ?? 'cron',
    riskCategory: options.riskCategory ?? 'low',
  };
}

export function resolveApproval(
  approval: Approval,
  status: 'approved' | 'rejected',
  reason?: string,
): Approval {
  return {
    ...approval,
    status,
    reason: reason ?? null,
    respondedAt: Date.now(),
  };
}

export function expireApproval(approval: Approval): Approval {
  return {
    ...approval,
    status: 'expired',
    respondedAt: Date.now(),
  };
}
