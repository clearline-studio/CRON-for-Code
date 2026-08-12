import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  createExecutionApproval,
  createExecutionError,
  expireApproval,
  createAuditRecord,
  createExecutionRecord,
  isFinalExecutionStatus,
} from '@cron-code/contracts';
import type {
  Approval,
  Task,
  AuditEventType,
  AuditRecord,
  ExecutionRecord,
} from '@cron-code/contracts';
import type { DataService } from './types.js';
import type { SafeExecutionHarness, ExecutionInput } from './execution-harness.js';
import {
  resolveProjectRoot,
  assertPathInsideProject,
  toExecutionError,
} from './project-boundary.js';
import type { VerifiedProjectRoot } from './project-boundary.js';
import { resolveCommand } from './command-catalogue.js';
import type { CommandCatalogueContext, ResolvedCommand } from './command-catalogue.js';

export interface ExecutionServiceOptions {
  dataService: DataService;
  harness: SafeExecutionHarness;
  /** Pending approval cap per task per action. */
  pendingApprovalLimit?: number;
  /** Approval expiry window in ms. */
  approvalExpiryMs?: number;
}

export interface RunTaskOptions {
  commandId?: string;
  params?: Record<string, string>;
  reason?: string;
}

export interface RunTaskOutcome {
  executed: boolean;
  approval: Approval | null;
  record: ExecutionRecord | null;
  blockedReason: string | null;
}

export interface QueueOutcome {
  queued: boolean;
  error?: string;
}

const DEFAULT_PENDING_APPROVAL_LIMIT = 10;
const DEFAULT_APPROVAL_EXPIRY_MS = 30 * 60 * 1000;

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pnpmScriptPath(gitRoot: string): string {
  const candidates = [
    path.join(gitRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(gitRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.js'),
  ];
  return candidates.find((c) => existsSync(c)) ?? candidates[0];
}

/**
 * Orchestrates the approved task-to-execution path:
 * request → catalogue resolve → project boundary → approval → harness → persist + audit.
 */
export class ExecutionService {
  private readonly dataService: DataService;
  private readonly harness: SafeExecutionHarness;
  private readonly pendingApprovalLimit: number;
  private readonly approvalExpiryMs: number;
  private readonly activeByTask = new Map<string, string>();

  constructor(options: ExecutionServiceOptions) {
    this.dataService = options.dataService;
    this.harness = options.harness;
    this.pendingApprovalLimit = options.pendingApprovalLimit ?? DEFAULT_PENDING_APPROVAL_LIMIT;
    this.approvalExpiryMs = options.approvalExpiryMs ?? DEFAULT_APPROVAL_EXPIRY_MS;
  }

  get isBusy(): boolean {
    return this.harness.isExecuting;
  }

  cancel(executionId: string): boolean {
    const killed = this.harness.cancel(executionId);
    void this.dataService.executions.cancel(executionId).catch(() => undefined);
    return killed;
  }

  private async audit(
    eventType: AuditEventType,
    input: {
      taskId?: string | null;
      projectId?: string | null;
      approvalId?: string | null;
      executionId?: string | null;
      commandId?: string | null;
      cwd?: string | null;
      actor?: string;
      transition?: string | null;
      exitCode?: number | null;
      errorCode?: string | null;
    },
  ): Promise<void> {
    const record: AuditRecord = createAuditRecord({
      id: newId('aud'),
      eventType,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      approvalId: input.approvalId ?? null,
      executionId: input.executionId ?? null,
      commandId: input.commandId ?? null,
      cwd: input.cwd ?? null,
      actor: input.actor ?? 'cron',
      transition: input.transition ?? null,
      exitCode: input.exitCode ?? null,
      errorCode: input.errorCode ?? null,
    });
    await this.dataService.audit.append(record);
  }

  private async resolveProject(task: Task): Promise<VerifiedProjectRoot> {
    const project = await this.dataService.projects.get(task.projectId);
    if (!project) {
      throw createExecutionError('INVALID_REQUEST', `Project not found: ${task.projectId}`);
    }
    // The root path itself is revalidated from disk on every execution.
    return resolveProjectRoot(project.rootPath);
  }

  private resolveCommandFor(
    commandId: string,
    params: Record<string, string> | undefined,
    gitRoot: string,
  ): ResolvedCommand {
    const ctx: CommandCatalogueContext = {
      repoRoot: gitRoot,
      pnpmScriptPath: pnpmScriptPath(gitRoot),
    };
    return resolveCommand(commandId, params, ctx);
  }

  private async ensureApproval(
    task: Task,
    command: ResolvedCommand,
    cwd: string,
    _reason: string | undefined,
  ): Promise<{ approval: Approval; created: boolean; blockedReason: string | null }> {
    const approvals = await this.dataService.approvals.list(task.id);
    const exact = approvals.filter(
      (a) => a.projectId === task.projectId && a.commandId === command.command.id && a.cwd === cwd,
    );

    const pendingExact = exact.find((a) => a.status === 'requested');
    if (pendingExact) {
      await this.dataService.tasks.updateStatus(task.id, 'approval_required');
      await this.audit('approval.requested', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: pendingExact.id,
        commandId: command.command.id,
        cwd,
        transition: 'requested',
      });
      return { approval: pendingExact, created: false, blockedReason: 'Approval is pending' };
    }

    const approvedExact = exact.find((a) => a.status === 'approved');
    if (approvedExact) {
      if (approvedExact.expiresAt && approvedExact.expiresAt < Date.now()) {
        const expired = expireApproval(approvedExact);
        await this.dataService.approvals.save(expired);
        await this.audit('approval.expired', {
          taskId: task.id,
          projectId: task.projectId,
          approvalId: expired.id,
          commandId: command.command.id,
          cwd,
          transition: 'expired',
        });
        await this.dataService.tasks.updateStatus(
          task.id,
          'failed',
          `Approval expired: ${command.command.displayCommand}`,
        );
        return { approval: expired, created: false, blockedReason: 'Approval expired' };
      }
      return { approval: approvedExact, created: false, blockedReason: null };
    }

    const rejectedExact = exact.find((a) => a.status === 'rejected');
    if (rejectedExact) {
      const reasonText = rejectedExact.reason ? ` (${rejectedExact.reason})` : '';
      await this.dataService.tasks.updateStatus(
        task.id,
        'failed',
        `Rejected approval: ${command.command.displayCommand}${reasonText}`,
      );
      await this.audit('approval.rejected', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: rejectedExact.id,
        commandId: command.command.id,
        cwd,
        transition: 'rejected',
      });
      return { approval: rejectedExact, created: false, blockedReason: 'Approval rejected' };
    }

    // Invalidate prior pending approvals for the same task with a different command/cwd.
    const toInvalidate = approvals.filter(
      (a) =>
        a.status === 'requested' &&
        !(a.commandId === command.command.id && a.cwd === cwd),
    );
    const pendingCount = approvals.filter((a) => a.status === 'requested').length;
    if (pendingCount >= this.pendingApprovalLimit) {
      throw createExecutionError(
        'APPROVAL_REQUIRED',
        `Too many pending approvals (limit ${this.pendingApprovalLimit})`,
      );
    }
    for (const stale of toInvalidate) {
      const expired = expireApproval(stale);
      await this.dataService.approvals.save(expired);
    }

    const approval = createExecutionApproval(
      newId('appr'),
      task.id,
      task.projectId,
      `Run ${command.command.displayCommand} in ${cwd}`,
      {
        commandId: command.command.id,
        cwd,
        commandSummary: command.command.displayCommand,
        requester: 'cron',
        riskCategory: command.command.risk,
        expiresAt: Date.now() + this.approvalExpiryMs,
      },
    );
    await this.dataService.approvals.save(approval);
    await this.dataService.tasks.updateStatus(task.id, 'approval_required');
    await this.audit('approval.requested', {
      taskId: task.id,
      projectId: task.projectId,
      approvalId: approval.id,
      commandId: command.command.id,
      cwd,
      transition: 'requested',
    });
    return { approval, created: true, blockedReason: 'Approval is pending' };
  }

  private async persistExecution(record: ExecutionRecord): Promise<void> {
    await this.dataService.executions.save(record);
  }

  private async executeApproved(
    task: Task,
    approval: Approval,
    command: ResolvedCommand,
    cwd: string,
  ): Promise<ExecutionRecord> {
    if (this.activeByTask.has(task.id)) {
      throw createExecutionError('INVALID_REQUEST', 'Task already has an active execution');
    }
    const executionId = newId('exe');
    const input: ExecutionInput = {
      id: executionId,
      commandId: command.command.id,
      taskId: task.id,
      projectId: task.projectId,
      approvalId: approval.id,
      cwd,
      executable: command.executable,
      args: command.args,
      displayCommand: command.displayCommand,
      timeoutMs: command.command.timeoutMs,
      readOnly: command.command.readOnly,
      outputType: command.command.outputType,
    };

    this.activeByTask.set(task.id, executionId);
    await this.dataService.tasks.updateStatus(task.id, 'running');
    await this.audit('execution.started', {
      taskId: task.id,
      projectId: task.projectId,
      approvalId: approval.id,
      executionId,
      commandId: command.command.id,
      cwd,
      transition: 'running',
    });

    let record: ExecutionRecord;
    try {
      record = await this.harness.execute(input);
    } catch (err) {
      const error = toExecutionError(err);
      record = createExecutionRecord({
        id: executionId,
        status: 'failed',
        commandId: command.command.id,
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval.id,
        cwd,
        executable: command.executable,
        args: command.args,
        displayCommand: command.displayCommand,
        startedAt: Date.now(),
        endedAt: Date.now(),
        exitCode: null,
        error,
      });
    } finally {
      this.activeByTask.delete(task.id);
    }

    await this.persistExecution(record);

    const errorCode = record.error?.code ?? null;
    if (record.status === 'completed') {
      await this.dataService.tasks.updateStatus(task.id, 'completed');
      await this.audit('execution.completed', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval.id,
        executionId,
        commandId: command.command.id,
        cwd,
        transition: 'completed',
        exitCode: record.exitCode,
      });
    } else if (record.status === 'cancelled') {
      await this.dataService.tasks.updateStatus(task.id, 'cancelled');
      await this.audit('execution.cancelled', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval.id,
        executionId,
        commandId: command.command.id,
        cwd,
        transition: 'cancelled',
      });
    } else if (record.status === 'timed_out') {
      await this.dataService.tasks.updateStatus(task.id, 'failed', record.error?.message ?? 'Timed out');
      await this.audit('execution.timed_out', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval.id,
        executionId,
        commandId: command.command.id,
        cwd,
        transition: 'timed_out',
        exitCode: record.exitCode,
        errorCode,
      });
    } else {
      await this.dataService.tasks.updateStatus(task.id, 'failed', record.error?.message ?? 'Execution failed');
      await this.audit('execution.failed', {
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval.id,
        executionId,
        commandId: command.command.id,
        cwd,
        transition: 'failed',
        exitCode: record.exitCode,
        errorCode,
      });
    }

    return record;
  }

  /** Queues a draft task (persist intent). Approval is requested at run time. */
  async queueTask(taskId: string): Promise<QueueOutcome> {
    const task = await this.dataService.tasks.get(taskId);
    if (!task) return { queued: false, error: 'Task not found' };
    if (task.status !== 'draft' && task.status !== 'queued' && task.status !== 'approval_required') {
      return { queued: false, error: `Cannot queue task in state ${task.status}` };
    }
    await this.dataService.tasks.queue(taskId);
    await this.audit('task.queued', {
      taskId: task.id,
      projectId: task.projectId,
      transition: 'queued',
    });
    return { queued: true };
  }

  /**
   * Full approved path: validate request → resolve project boundary → resolve command
   * → ensure approval → execute → persist + audit.
   */
  async runTaskNow(taskId: string, options: RunTaskOptions = {}): Promise<RunTaskOutcome> {
    const task = await this.dataService.tasks.get(taskId);
    if (!task) {
      throw createExecutionError('INVALID_REQUEST', 'Task not found');
    }
    if (
      task.status !== 'draft' &&
      task.status !== 'queued' &&
      task.status !== 'approval_required' &&
      task.status !== 'failed'
    ) {
      return { executed: false, approval: null, record: null, blockedReason: `Cannot run task in state ${task.status}` };
    }

    const commandId = options.commandId ?? 'repo.status';
    const project = await this.resolveProject(task);
    const gitRoot = project.gitRoot;
    assertPathInsideProject(gitRoot, gitRoot);
    const command = this.resolveCommandFor(commandId, options.params, gitRoot);
    const cwd = gitRoot;

    const approvalState = await this.ensureApproval(task, command, cwd, options.reason);
    if (approvalState.blockedReason) {
      return {
        executed: false,
        approval: approvalState.approval,
        record: null,
        blockedReason: approvalState.blockedReason,
      };
    }
    const record = await this.executeApproved(task, approvalState.approval, command, cwd);
    return { executed: true, approval: approvalState.approval, record, blockedReason: null };
  }

  /** Restart recovery: re-runs approved-but-unfinished tasks that are still marked queued/approval_required. */
  async recoverApprovedTasks(): Promise<void> {
    const all = await this.dataService.tasks.listAll();
    for (const task of all) {
      if (task.status !== 'queued' && task.status !== 'approval_required') continue;
      if (this.activeByTask.has(task.id)) continue;
      const approvals = await this.dataService.approvals.list(task.id);
      const approved = approvals.find(
        (a) =>
          a.status === 'approved' &&
          a.commandId !== undefined &&
          (a.expiresAt === null || a.expiresAt > Date.now()),
      );
      if (!approved || !approved.commandId) continue;
      try {
        await this.runTaskNow(task.id, { commandId: approved.commandId });
      } catch {
        // recovery failures are logged, never escalated
      }
    }
  }
}

export { isFinalExecutionStatus };
