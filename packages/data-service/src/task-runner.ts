import type { Task } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { logger } from './logger.js';

export interface TaskExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface TaskExecutor {
  execute(task: Task, timeoutMs: number): Promise<TaskExecResult>;
}

export interface TaskRunnerConfig {
  dataService: DataService;
  executor: TaskExecutor;
  pollIntervalMs?: number;
  commandTimeoutMs?: number;
}

export class TaskRunner {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private _stopped = false;
  private readonly _dataService: DataService;
  private readonly _executor: TaskExecutor;
  private readonly _pollIntervalMs: number;
  private readonly _commandTimeoutMs: number;

  constructor(config: TaskRunnerConfig) {
    this._dataService = config.dataService;
    this._executor = config.executor;
    this._pollIntervalMs = config.pollIntervalMs ?? 5000;
    this._commandTimeoutMs = config.commandTimeoutMs ?? 60000;
  }

  start(): void {
    if (this._timer) return;
    this._stopped = false;
    this._timer = setInterval(() => {
      void this._poll();
    }, this._pollIntervalMs);
    void this._poll();
  }

  async stop(): Promise<void> {
    this._stopped = true;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    while (this._running) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  async runNow(taskId: string): Promise<void> {
    const task = await this._dataService.tasks.get(taskId);
    if (!task) return;
    if (task.status !== 'draft' && task.status !== 'queued' && task.status !== 'approval_required') {
      return;
    }

    await this._dataService.tasks.updateStatus(taskId, 'queued');
    await this._processTask(taskId);
  }

  private async _poll(): Promise<void> {
    if (this._stopped || this._running) return;

    try {
      const allTasks = await this._dataService.tasks.listAll();
      const queued = allTasks.filter((t) => t.status === 'queued');

      for (const task of queued) {
        if (this._stopped) break;
        await this._processTask(task.id);
      }
    } catch (err) {
      logger.warn('Task runner poll failed', { error: String(err) });
    }
  }

  private async _processTask(taskId: string): Promise<void> {
    if (this._running) return;

    const task = await this._dataService.tasks.get(taskId);
    if (!task || task.status !== 'queued') return;

    const approvals = await this._dataService.approvals.list(taskId);
    const pendingApproval = approvals.find((a) => a.status === 'requested');
    const rejectedApproval = approvals.find((a) => a.status === 'rejected');

    if (pendingApproval) {
      await this._dataService.tasks.updateStatus(taskId, 'approval_required');
      return;
    }

    if (rejectedApproval) {
      const reason = rejectedApproval.reason ? ` (${rejectedApproval.reason})` : '';
      await this._dataService.tasks.updateStatus(
        taskId,
        'failed',
        `Rejected approval: ${rejectedApproval.description}${reason}`,
      );
      return;
    }

    this._running = true;
    try {
      await this._dataService.tasks.updateStatus(taskId, 'running');

      const result = await this._executor.execute(task, this._commandTimeoutMs);

      if (result.exitCode === 0) {
        await this._dataService.tasks.updateStatus(taskId, 'completed');
      } else {
        const errorDetail = result.stderr || `Exit code: ${result.exitCode}`;
        await this._dataService.tasks.updateStatus(taskId, 'failed', errorDetail);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this._dataService.tasks.updateStatus(taskId, 'failed', message);
    } finally {
      this._running = false;
    }
  }
}

export class CommandExecutor implements TaskExecutor {
  private readonly _command: string;

  constructor(command: string) {
    this._command = command;
  }

  async execute(task: Task, timeoutMs: number): Promise<TaskExecResult> {
    const { exec } = await import('node:child_process');

    return new Promise((resolve) => {
      const child = exec(
        this._command,
        { timeout: timeoutMs, windowsHide: true },
        (error, stdout, stderr) => {
          resolve({
            exitCode: error?.code ?? 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        },
      );

      const prompt = task.prompt;
      if (prompt && child.stdin) {
        child.stdin.write(prompt);
        child.stdin.end();
      }
    });
  }
}
