export type { DataService, DataServiceConfig, DataStore, CommandSummary } from './types.js';
export { createJsonDataService } from './json-store.js';
export { logger } from './logger.js';
export { ProjectManagementService } from './project-management.js';
export type { ProjectManagementConflict, ProjectManagementOutcome } from './project-management.js';
export { normalizeProjectPath } from './path-normalize.js';
export { TaskRunner, CommandExecutor } from './task-runner.js';
export type { TaskExecutor, TaskExecResult, TaskRunnerConfig } from './task-runner.js';
export { SafeExecutionHarness } from './execution-harness.js';
export type { ExecutionInput, SpawnHandle, SpawnFn, HarnessOptions } from './execution-harness.js';
export { ExecutionService } from './execution-service.js';
export type { ExecutionServiceOptions, RunTaskOptions, RunTaskOutcome, QueueOutcome } from './execution-service.js';
export { OpenCodeRunner, discoverOpenCodeCli, createOpenCodeServerAdapter } from './opencode-runner.js';
export type {
  OpenCodeRunEvent,
  OpenCodeApprovalReplyInput,
  OpenCodeApprovalReplyResult,
  OpenCodeRunInput,
  OpenCodeRunResult,
  OpenCodeRunStatus,
  OpenCodeRunnerAdapter,
  OpenCodeRunnerAdapterInput,
  OpenCodeRunnerAdapterResult,
  OpenCodeRunnerOptions,
  OpenCodeServerAdapterOptions,
} from './opencode-runner.js';
export {
  resolveProjectRoot,
  assertPathInsideProject,
  assertIsGitRoot,
  listProjectTopLevel,
  toExecutionError,
} from './project-boundary.js';
export type { VerifiedProjectRoot } from './project-boundary.js';
export {
  assertKnownCommandId,
  assertTaskId,
  assertExecutionId,
  assertProjectId,
  assertProjectName,
  assertProjectAvailability,
  assertCanonicalProjectId,
  assertCanonicalTaskId,
  assertCanonicalExecutionId,
  isValidExecutionRecordShape,
  isValidAuditRecordShape,
  sanitizeAuditFilter,
  toIpcError,
  KNOWN_COMMAND_ID_SET,
} from './ipc-validation.js';
export {
  buildCommandCatalogue,
  resolveCommand,
  assertNotForbidden,
  FORBIDDEN_EXECUTABLES,
  FORBIDDEN_GIT_MUTATIONS,
} from './command-catalogue.js';
export type {
  CommandTemplate,
  CommandParamSpec,
  CommandCatalogueContext,
  ResolvedCommand,
} from './command-catalogue.js';
