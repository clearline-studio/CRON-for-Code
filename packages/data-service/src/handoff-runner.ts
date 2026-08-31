/**
 * HandoffRunner — the host-agnostic programmatic entry for the Code <-> Intelligence
 * bridge.
 *
 * This is the NON-UI way to run a governed OpenCode task: a caller hands in a
 * HandoffRequest (repo path + plain-language task + context) and receives a
 * HandoffResult (status, approvals, changed files, evidence). It is decoupled
 * from Electron/tray/folder-picker — those stay standalone-only. Everything here
 * runs on plain node + the shared contracts.
 *
 * It adapts a HandoffRequest onto the existing governed OpenCodeRunner:
 *   1. finds-or-creates a CodeProject for the repo path
 *   2. creates a Task from the handoff prompt
 *   3. runs the governed runner
 *   4. maps the OpenCodeRunResult back to the HandoffResult shape
 *
 * The caller also controls the approval loop via replyToApproval.
 */

import {
  createCodeProject,
  createTask,
} from '@cron-code/contracts';
import type {
  CodeProject,
  HandoffApprovalReply,
  HandoffRequest,
  HandoffResult,
  Task,
} from '@cron-code/contracts';
import { discoverOpenCodeCli, OpenCodeRunner } from './opencode-runner.js';
import type {
  OpenCodeApprovalReplyInput,
  OpenCodePermissionRequest,
  OpenCodeRunResult,
  OpenCodeRunnerAdapter,
} from './opencode-runner.js';
import type { DataService } from './types.js';

export interface HandoffRunnerOptions {
  readonly dataService: DataService;
  /** Pre-built adapter, or omit to auto-discover the OpenCode CLI. */
  readonly adapter?: OpenCodeRunnerAdapter | null;
  readonly defaultModel?: string;
  readonly visionModel?: string;
  readonly fallbackModel?: string;
  readonly escalationModel?: string;
  /** Max quiet time before a silent-hung attempt retries with the fallback. */
  readonly stallTimeoutMs?: number;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalisePath(value: string): string {
  return value.replace(/[\\/]+$/, '').trim();
}

const HANDOFF_STATUS_MAP: Record<string, HandoffResult['status']> = {
  queued: 'queued',
  validating: 'running',
  starting: 'running',
  running: 'running',
  verifying: 'running',
  awaiting_approval: 'awaiting_approval',
  completed: 'completed',
  failed: 'failed',
  blocked: 'blocked',
  cancelled: 'cancelled',
};

export class HandoffRunner {
  private readonly dataService: DataService;
  private readonly runner: OpenCodeRunner;

  constructor(options: HandoffRunnerOptions) {
    this.dataService = options.dataService;
    this.runner = new OpenCodeRunner({
      dataService: options.dataService,
      adapter: options.adapter === undefined ? discoverOpenCodeCli() : options.adapter,
      defaultModel: options.defaultModel,
      visionModel: options.visionModel,
      fallbackModel: options.fallbackModel,
      escalationModel: options.escalationModel,
      stallTimeoutMs: options.stallTimeoutMs,
    });
  }

  /** Entry point: take a handoff request, run it governed, translate the result. */
  async run(request: HandoffRequest): Promise<HandoffResult> {
    const project = await this.resolveProject(request);
    const task = await this.resolveTask(project, request);

    let result: OpenCodeRunResult;
    try {
      result = await this.runner.runTask({
        taskId: task.id,
        model: request.model,
        conversationContext: request.context?.conversation,
        needsVision: this.requestNeedsVision(request),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failedResult(request, 'RUNNER_ERROR', message);
    }

    return this.mapResult(request, result);
  }

  /** Auto-switch signal: run on the vision model when the task needs image input. */
  private requestNeedsVision(request: HandoffRequest): boolean {
    const hasImage = (request.context?.attachments ?? []).some(
      (attachment) => attachment.kind === 'image' || (attachment.mime ?? '').startsWith('image/'),
    );
    if (hasImage) return true;
    return /screenshot|visual(ly)?|image|look at the|ui design|mockup|layout picture/i.test(request.task);
  }

  /** Approve/reject a pending handoff approval and get the resumed result. */
  async replyToApproval(reply: HandoffApprovalReply): Promise<HandoffResult> {
    const input: OpenCodeApprovalReplyInput = {
      approvalId: reply.approvalId,
      // The approval is correlated to a task server-side; the runner resolves it.
      taskId: await this.resolveTaskIdFromApproval(reply.approvalId),
      decision: reply.decision,
      reason: reply.reason,
    };
    let result: OpenCodeRunResult;
    try {
      result = await this.runner.replyToApproval(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failedResult(null, 'APPROVAL_REPLY_FAILED', message);
    }
    return this.mapResult(null, result);
  }

  /** Close the underlying data service (flush + teardown) when the caller is done. */
  async close(): Promise<void> {
    await this.dataService.destroy().catch(() => undefined);
  }

  private async resolveProject(request: HandoffRequest): Promise<CodeProject> {
    const repoPath = normalisePath(request.project.repoPath);
    // Reuse an existing project with the same root path so repeated handoffs from
    // Intelligence accumulate on one project rather than duplicating.
    const existing = (await this.dataService.projects.list()).find(
      (project) => normalisePath(project.rootPath) === repoPath,
    );
    if (existing) return existing;

    const project = createCodeProject(newId('proj'), request.project.name ?? repoPath, repoPath);
    await this.dataService.projects.save(project);
    return project;
  }

  private async resolveTask(project: CodeProject, request: HandoffRequest): Promise<Task> {
    const task = createTask(newId('task'), project.id, request.task.slice(0, 80), request.task);
    await this.dataService.tasks.save(task);
    return task;
  }

  private async resolveTaskIdFromApproval(approvalId: string): Promise<string> {
    const approval = await this.dataService.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`OpenCode approval not found: ${approvalId}`);
    }
    return approval.taskId;
  }

  private mapResult(
    request: HandoffRequest | null,
    result: OpenCodeRunResult,
  ): HandoffResult {
    const status = HANDOFF_STATUS_MAP[result.status] ?? 'failed';
    const approvals = this.mapApprovals(result.approval);
    const changedFiles = result.changedFiles.map((path) => ({ path, status: 'modified' as const }));

    const evidence: Array<HandoffResult['evidence'][number]> = [];
    for (const path of result.changedFiles) {
      evidence.push({
        kind: 'diff',
        description: `Changed file: ${path}`,
        reference: path,
      });
    }
    if (result.summary) {
      evidence.push({ kind: 'output', description: result.summary });
    }

    return {
      requestId: request?.requestId ?? result.taskId,
      status,
      summary: result.summary,
      blocker: result.blocker,
      progress: null,
      approvals,
      changedFiles,
      evidence,
      startedAt: result.events[0]?.timestamp ?? Date.now(),
      completedAt: status === 'completed' ? Date.now() : null,
      error: result.record?.error ?? null,
    };
  }

  private mapApprovals(request: OpenCodePermissionRequest | null): HandoffResult['approvals'] {
    if (!request) return [];
    return [
      {
        id: request.approvalId,
        description: `OpenCode wants to ${request.permission}${request.target ? ` ${request.target}` : ''}`,
        action: mapApprovalAction(request.permission),
        target: request.target,
        reason: request.reason,
        patterns: request.patterns,
        requestedAt: Date.now(),
      },
    ];
  }

  private failedResult(
    request: HandoffRequest | null,
    code: string,
    message: string,
  ): HandoffResult {
    return {
      requestId: request?.requestId ?? '',
      status: 'failed',
      summary: message,
      blocker: message,
      progress: null,
      approvals: [],
      changedFiles: [],
      evidence: [],
      startedAt: Date.now(),
      completedAt: null,
      error: { code, message },
    };
  }
}

function mapApprovalAction(permission: string): HandoffResult['approvals'][number]['action'] {
  if (/^read$/i.test(permission)) return 'read';
  if (/reject|delete|remove/i.test(permission)) return 'delete';
  if (/edit|write|create|modify/i.test(permission)) return 'write';
  if (/bash|run|exec|execute|command/i.test(permission)) return 'execute';
  return 'execute';
}
