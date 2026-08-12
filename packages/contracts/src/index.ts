export type { CodeProject, CodeProjectSummary, ProjectAvailability } from './project.js';
export {
  createCodeProject,
  touchProject,
  withAvailability,
  archiveCodeProject,
  restoreCodeProject,
  relinkCodeProject,
  renameCodeProject,
} from './project.js';

export type { Task, TaskStatus } from './task.js';
export { createTask, updateTaskStatus } from './task.js';

export type { Approval, ApprovalStatus, ApprovalActionCategory } from './approval.js';
export { createApproval, createExecutionApproval, resolveApproval, expireApproval } from './approval.js';
export type { CreateApprovalOptions } from './approval.js';

export type { HostContext, HostCapabilities } from './host.js';
export { createHostContext } from './host.js';

export type {
  ExecutionStatus,
  ExecutionErrorCode,
  CommandCategory,
  OutputType,
  RiskCategory,
  ExecutionCommand,
  ExecutionRequest,
  ExecutionOutput,
  ExecutionError,
  ExecutionTimeout,
  ExecutionCancellation,
  ExecutionRecord,
  AuditEventType,
  AuditRecord,
  ExecutionApprovalRequirement,
} from './execution.js';
export {
  createExecutionOutput,
  createExecutionError,
  createExecutionRecord,
  createAuditRecord,
  canTransitionExecution,
  isFinalExecutionStatus,
} from './execution.js';
