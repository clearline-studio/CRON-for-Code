import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceStore } from './store.js';
import { createTask } from '@cron-code/contracts';
import type { Task } from '@cron-code/contracts';
import type { Approval } from '@cron-code/contracts';
import type { OpenCodeRunnerClient } from './opencode-client.js';

function createMockDeps(overrides: {
  tasks?: Task[];
  approvals?: Approval[];
  openCodeRunner?: OpenCodeRunnerClient;
} = {}) {
  const { tasks = [], approvals = [], openCodeRunner } = overrides;
  return {
    dataService: {
      projects: {
        list: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(null),
        unarchive: vi.fn().mockResolvedValue(null),
        setRootPath: vi.fn().mockResolvedValue(null),
        setName: vi.fn().mockResolvedValue(null),
        setAvailability: vi.fn().mockResolvedValue(null),
      },
      tasks: {
        list: vi.fn().mockResolvedValue(tasks),
        listAll: vi.fn().mockResolvedValue(tasks),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        queue: vi.fn().mockResolvedValue(undefined),
        runNow: vi.fn().mockResolvedValue(undefined),
      },
      approvals: {
        list: vi.fn().mockResolvedValue([]),
        listAll: vi.fn().mockResolvedValue(approvals),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        resolve: vi.fn().mockResolvedValue(undefined),
      },
      preferences: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      executions: {
        list: vi.fn().mockResolvedValue([]),
        listAll: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
      },
      audit: {
        append: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([]),
      },
      config: { storagePath: '/tmp/test' },
      initialize: vi.fn(),
      flush: vi.fn(),
      destroy: vi.fn(),
      listCommands: vi.fn().mockResolvedValue([]),
    },
    hostAdapter: {
      context: {
        hostId: 'test',
        hostName: 'Test',
        activeProjectId: null,
        theme: 'dark' as const,
        capabilities: { canSelectProject: true, canNavigate: true, supportsTheming: true, supportsMultiProject: false },
        contextualRefs: {},
      },
      selectProject: vi.fn(),
      updateContext: vi.fn(),
      onEvent: vi.fn(() => () => {}),
      destroy: vi.fn(),
      performProjectAction: vi.fn().mockResolvedValue({ status: 'ok' }),
      restartApp: vi.fn().mockResolvedValue(undefined),
    },
    openCodeRunner,
  };
}

function makeTask(id: string, status: Task['status']): Task {
  const task = createTask(id, 'proj_1', `Task ${id}`, 'hello');
  return { ...task, status };
}

function makeOpenCodeApproval(taskId: string, id = 'appr_1'): Approval {
  return {
    id,
    taskId,
    projectId: 'proj_1',
    status: 'requested',
    actionCategory: 'write',
    description: 'OpenCode wants to edit a file',
    reason: null,
    requestedAt: Date.now(),
    respondedAt: null,
    expiresAt: null,
    requester: 'opencode',
    commandId: 'opencode.runner',
    executionId: 'exe_1',
    cwd: 'C:/repo',
    commandSummary: 'OpenCode write runtime-test.txt',
    riskCategory: 'medium',
    openCodeSessionId: 'sess_1',
    openCodePermissionId: 'perm_1',
    openCodeMessageId: 'msg_1',
    openCodeCallId: 'call_1',
  };
}

describe('tray actions', () => {
  it('trayShowTasks selects the running task when one exists', () => {
    const tasks = [makeTask('t_queued', 'queued'), makeTask('t_running', 'running')];
    const store = createWorkspaceStore(createMockDeps({ tasks }));
    store.setState({ tasks });
    store.getState().trayShowTasks();
    expect(store.getState().selectedTaskId).toBe('t_running');
  });

  it('trayShowTasks falls back to approval_required, then queued, then the latest task', () => {
    const onlyQueued = createWorkspaceStore(createMockDeps({
      tasks: [makeTask('t_queued', 'queued'), makeTask('t_draft', 'draft')],
    }));
    onlyQueued.setState({ tasks: [makeTask('t_queued', 'queued'), makeTask('t_draft', 'draft')] });
    onlyQueued.getState().trayShowTasks();
    expect(onlyQueued.getState().selectedTaskId).toBe('t_queued');

    const noActive = createWorkspaceStore(createMockDeps({
      tasks: [makeTask('t_first', 'draft'), makeTask('t_last', 'draft')],
    }));
    noActive.setState({ tasks: [makeTask('t_first', 'draft'), makeTask('t_last', 'draft')] });
    noActive.getState().trayShowTasks();
    expect(noActive.getState().selectedTaskId).toBe('t_last');

    const empty = createWorkspaceStore(createMockDeps({ tasks: [] }));
    empty.getState().trayShowTasks();
    expect(empty.getState().selectedTaskId).toBeNull();
  });

  it('trayPauseTask surfaces the active task and never cancels', () => {
    const tasks = [makeTask('t_running', 'running')];
    const approvals = [makeOpenCodeApproval('t_running')];
    const openCodeRunner = { replyToApproval: vi.fn(), runTask: vi.fn(), onEvent: vi.fn() };
    const deps = createMockDeps({ tasks, approvals, openCodeRunner });
    const store = createWorkspaceStore(deps);
    store.setState({ tasks, approvals });
    store.getState().trayPauseTask();
    expect(store.getState().selectedTaskId).toBe('t_running');
    expect(openCodeRunner.replyToApproval).not.toHaveBeenCalled();
  });

  it('trayStopTask rejects a pending OpenCode approval through the runner and refreshes', async () => {
    const tasks = [makeTask('t_1', 'approval_required')];
    const approvals = [makeOpenCodeApproval('t_1')];
    const replyToApproval = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const openCodeRunner = { replyToApproval, runTask: vi.fn(), onEvent: vi.fn() };
    const deps = createMockDeps({ tasks, approvals, openCodeRunner });
    const store = createWorkspaceStore(deps);
    store.setState({ tasks, approvals, activeProjectId: 'proj_1' });
    await store.getState().trayStopTask();
    expect(replyToApproval).toHaveBeenCalledWith({
      taskId: 't_1',
      approvalId: 'appr_1',
      decision: 'reject',
      reason: 'Stopped from the system tray',
    });
    expect(deps.dataService.tasks.list).toHaveBeenCalled();
    expect(deps.dataService.approvals.listAll).toHaveBeenCalled();
    expect(store.getState().error).toBeNull();
  });

  it('trayStopTask reports honestly when the active task is not interruptible', async () => {
    const tasks = [makeTask('t_1', 'running')];
    const openCodeRunner = { replyToApproval: vi.fn(), runTask: vi.fn(), onEvent: vi.fn() };
    const deps = createMockDeps({ tasks, approvals: [], openCodeRunner });
    const store = createWorkspaceStore(deps);
    store.setState({ tasks });
    await store.getState().trayStopTask();
    expect(openCodeRunner.replyToApproval).not.toHaveBeenCalled();
    expect(store.getState().selectedTaskId).toBe('t_1');
    expect(store.getState().error).toMatch(/not currently interruptible/);
  });

  it('trayStopTask with no active task only surfaces the list', async () => {
    const tasks = [makeTask('t_1', 'draft')];
    const openCodeRunner = { replyToApproval: vi.fn(), runTask: vi.fn(), onEvent: vi.fn() };
    const deps = createMockDeps({ tasks, openCodeRunner });
    const store = createWorkspaceStore(deps);
    store.setState({ tasks });
    await store.getState().trayStopTask();
    expect(openCodeRunner.replyToApproval).not.toHaveBeenCalled();
    expect(store.getState().error).toBeNull();
    expect(store.getState().selectedTaskId).toBe('t_1');
  });
});
