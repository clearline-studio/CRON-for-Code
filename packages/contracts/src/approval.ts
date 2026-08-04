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
