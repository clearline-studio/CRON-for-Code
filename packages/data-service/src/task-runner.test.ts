import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskRunner } from './task-runner.js';
import type { TaskExecutor, TaskRunnerConfig } from './task-runner.js';
import { createTask, createApproval } from '@cron-code/contracts';
import type { Task, Approval } from '@cron-code/contracts';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    ...createTask('t1', 'p1', 'Test Task', 'echo hello'),
    status: 'queued',
    ...overrides,
  };
}

function makeApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    ...createApproval('a1', 't1', 'p1', 'execute', 'Run task'),
    ...overrides,
  };
}

function createMockExecutor(result?: { exitCode: number; stdout: string; stderr: string }) {
  return {
    execute: vi.fn().mockResolvedValue(result ?? { exitCode: 0, stdout: 'ok', stderr: '' }),
  } as TaskExecutor & { execute: ReturnType<typeof vi.fn> };
}

function createMockDataService(taskOverrides: Partial<Task> = {}, approvals: Approval[] = []) {
  const taskStore: Record<string, Task> = {
    t1: makeTask(taskOverrides),
  };

  return {
    tasks: {
      listAll: vi.fn(async () => Object.values(taskStore)),
      list: vi.fn(async (projectId: string) => Object.values(taskStore).filter((t) => t.projectId === projectId)),
      get: vi.fn(async (id: string) => taskStore[id] ?? null),
      save: vi.fn(async (task: Task) => {
        taskStore[task.id] = task;
      }),
      delete: vi.fn(async (id: string) => {
        delete taskStore[id];
      }),
      updateStatus: vi.fn(async (id: string, status: string, error?: string) => {
        if (taskStore[id]) {
          const now = Date.now();
          taskStore[id] = {
            ...taskStore[id],
            status: status as Task['status'],
            updatedAt: now,
            ...(status === 'running' && taskStore[id].startedAt === null ? { startedAt: now } : {}),
            ...(['completed', 'failed', 'cancelled'].includes(status) ? { completedAt: now } : {}),
            error: error ?? null,
          };
        }
      }),
      queue: vi.fn(async (id: string) => {
        if (taskStore[id]) {
          taskStore[id] = { ...taskStore[id], status: 'queued' as const, updatedAt: Date.now() };
        }
      }),
      runNow: vi.fn(),
    },
    approvals: {
      listAll: vi.fn(async () => approvals),
      list: vi.fn(async () => approvals),
      get: vi.fn(async (id: string) => approvals.find((a) => a.id === id) ?? null),
      save: vi.fn(),
      delete: vi.fn(),
      resolve: vi.fn(),
    },
    config: { storagePath: '/tmp' },
    initialize: vi.fn(),
    flush: vi.fn(),
    destroy: vi.fn(),
  };
}

function createRunner(overrides: Partial<TaskRunnerConfig> = {}) {
  const executor = createMockExecutor();
  const dataService = createMockDataService();
  const runner = new TaskRunner({
    dataService: dataService as never,
    executor,
    pollIntervalMs: 100,
    commandTimeoutMs: 5000,
    ...overrides,
  });
  return { runner, executor, dataService };
}

describe('TaskRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('transitions queued task to running then completed on success', async () => {
    const { runner, dataService } = createRunner();

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'completed');
  });

  it('transitions queued task to failed on non-zero exit code', async () => {
    const executor = createMockExecutor({ exitCode: 1, stdout: '', stderr: 'command failed' });
    const { runner, dataService } = createRunner({ executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'failed', 'command failed');
  });

  it('transitions queued task to failed on executor error', async () => {
    const executor = {
      execute: vi.fn().mockRejectedValue(new Error('exec crash')),
    } as TaskExecutor;

    const { runner, dataService } = createRunner({ executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'failed', 'exec crash');
  });

  it('transitions queued task to approval_required when pending approval exists', async () => {
    const approval = makeApproval({ status: 'requested' });
    const dataService = createMockDataService({}, [approval]);
    const executor = createMockExecutor();
    const runner = new TaskRunner({ dataService: dataService as never, executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'approval_required');
  });

  it('transitions queued task to failed when approval is rejected', async () => {
    const approval = makeApproval({ status: 'rejected', reason: 'Not allowed' });
    const dataService = createMockDataService({}, [approval]);
    const executor = createMockExecutor();
    const runner = new TaskRunner({ dataService: dataService as never, executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith(
      't1',
      'failed',
      'Rejected approval: Run task (Not allowed)',
    );
  });

  it('runs task normally when all approvals are approved', async () => {
    const approval = makeApproval({ status: 'approved' });
    const dataService = createMockDataService({}, [approval]);
    const executor = createMockExecutor();
    const runner = new TaskRunner({ dataService: dataService as never, executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'completed');
  });

  it('runNow queues a draft task and processes it', async () => {
    const dataService = createMockDataService({ status: 'draft' });
    const executor = createMockExecutor();
    const runner = new TaskRunner({ dataService: dataService as never, executor });

    await runner.runNow('t1');

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'queued');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');
    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'completed');
  });

  it('stop waits for running task to complete', async () => {
    let resolveExec: (value: { exitCode: number; stdout: string; stderr: string }) => void = () => {};
    const executor = {
      execute: vi.fn().mockReturnValue(new Promise((r) => { resolveExec = r; })),
    } as TaskExecutor;

    const { runner, dataService } = createRunner({ executor });

    runner.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'running');

    const stopPromise = runner.stop();
    await vi.advanceTimersByTimeAsync(500);

    resolveExec({ exitCode: 0, stdout: 'ok', stderr: '' });
    await vi.advanceTimersByTimeAsync(200);
    await stopPromise;

    expect(dataService.tasks.updateStatus).toHaveBeenCalledWith('t1', 'completed');
  });
});
