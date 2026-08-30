import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceStore, reconcileProjects, normalizeProjectPath } from './store.js';
import { createCodeProject, createTask } from '@cron-code/contracts';
import type { CodeProject, Task, Approval } from '@cron-code/contracts';
import type { DataService } from '@cron-code/data-service';
import type { HostAdapter } from '@cron-code/host-adapter';

function createMockDeps() {
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
        list: vi.fn().mockResolvedValue([]),
        listAll: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        queue: vi.fn().mockResolvedValue(undefined),
        runNow: vi.fn().mockResolvedValue(undefined),
      },
      approvals: {
        list: vi.fn().mockResolvedValue([]),
        listAll: vi.fn().mockResolvedValue([]),
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
  };
}

describe('createWorkspaceStore', () => {
  it('creates with initial state', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    const state = store.getState();
    expect(state.projects).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.activeProjectId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loads projects', async () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    await store.getState().loadProjects();
    expect(deps.dataService.projects.list).toHaveBeenCalled();
  });

  it('selectTask updates selectedTaskId', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    store.getState().selectTask('task-1');
    expect(store.getState().selectedTaskId).toBe('task-1');
  });

  it('setError updates error', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    store.getState().setError('Something wrong');
    expect(store.getState().error).toBe('Something wrong');
  });

  it('flags a duplicate folder: two concurrent opens of the same path create ONE project and set the notice', async () => {
    const deps = createMockDeps();
    let saved: Array<{ id: string; rootPath: string; name: string }> = [];
    const saveDelay = 8;
    deps.dataService.projects.save = vi.fn(async (project: { id: string; rootPath: string; name: string }) => {
      await new Promise((resolve) => setTimeout(resolve, saveDelay));
      saved = [...saved.filter((p) => p.id !== project.id), project];
    });
    deps.dataService.projects.list = vi.fn(async () => saved);
    deps.dataService.projects.get = vi.fn(async (id: string) => saved.find((p) => p.id === id) ?? null);
    const store = createWorkspaceStore(deps);
    // Both fire in the same tick — the old code raced and saved twice.
    const first = store.getState().openProjectPath('C:/repo', 'Meds');
    const second = store.getState().openProjectPath('C:/repo', 'Meds');
    await Promise.all([first, second]);
    expect(saved).toHaveLength(1);
    expect(store.getState().notice).toMatch(/already a project/i);
    expect(store.getState().activeProjectId).toBe(saved[0]?.id ?? null);
  });

  it('setNotice updates the notice and clears it', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    store.getState().setNotice('Hello');
    expect(store.getState().notice).toBe('Hello');
    store.getState().setNotice(null);
    expect(store.getState().notice).toBeNull();
  });

  it('updates hostContext', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    store.getState().setHostContext({ ...deps.hostAdapter.context, theme: 'light' });
    expect(store.getState().hostContext.theme).toBe('light');
  });

  it('loads the safe command catalogue', async () => {
    const deps = createMockDeps();
    deps.dataService.listCommands = vi.fn().mockResolvedValue([
      { id: 'repo.status', displayCommand: 'git status --short', category: 'repo', risk: 'low', readOnly: true, requiresApproval: true, timeoutMs: 120000 },
    ]);
    const store = createWorkspaceStore(deps);
    await store.getState().loadCommands();
    expect(store.getState().commands).toHaveLength(1);
    expect(store.getState().commands[0].id).toBe('repo.status');
  });

  it('loads executions for the selected project', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    deps.dataService.projects.list = vi.fn().mockResolvedValue([project]);
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([
      { id: 'exe_1', status: 'completed', commandId: 'repo.status', taskId: 't', projectId: 'proj_1' },
    ]);
    const store = createWorkspaceStore(deps);
    await store.getState().selectProject('proj_1');
    expect(deps.dataService.executions.list).toHaveBeenCalledWith('proj_1');
    expect(store.getState().executions).toHaveLength(1);
  });

  it('runTaskNow forwards the selected command id to the data service', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([]);
    const store = createWorkspaceStore(deps);
    await store.getState().selectProject('proj_1');
    await store.getState().runTaskNow('task_1', 'repo.diff-check');
    expect(deps.dataService.tasks.runNow).toHaveBeenCalledWith('task_1', 'repo.diff-check');
  });

  it('cancelExecution cancels via the data service and refreshes', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([]);
    const store = createWorkspaceStore(deps);
    await store.getState().selectProject('proj_1');
    await store.getState().cancelExecution('exe_1');
    expect(deps.dataService.executions.cancel).toHaveBeenCalledWith('exe_1');
  });

  it('approving an approval refreshes tasks, approvals and executions', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([]);
    const store = createWorkspaceStore(deps);
    await store.getState().selectProject('proj_1');
    await store.getState().approveApproval('task_1', 'appr_1');
    expect(deps.dataService.approvals.resolve).toHaveBeenCalledWith('appr_1', 'approved');
    expect(deps.dataService.executions.list).toHaveBeenCalled();
  });

  it('approving an OpenCode-backed approval resumes the session', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    const approval = {
      id: 'appr_oc',
      taskId: 'task_oc',
      projectId: 'proj_1',
      status: 'requested' as const,
      commandId: 'repo.identity',
      openCodeSessionId: 'ses_1',
      openCodePermissionId: 'per_1',
    };
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([approval]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([]);
    const openCodeRunner = { runTask: vi.fn(), replyToApproval: vi.fn().mockResolvedValue({ status: 'completed' }), onEvent: vi.fn() };
    const store = createWorkspaceStore({ ...deps, openCodeRunner });
    await store.getState().selectProject('proj_1');
    await store.getState().approveApproval('', 'appr_oc');
    expect(openCodeRunner.replyToApproval).toHaveBeenCalledWith({
      taskId: 'task_oc',
      approvalId: 'appr_oc',
      decision: 'approve',
    });
  });

  it('rejecting an OpenCode-backed approval rejects the session', async () => {
    const deps = createMockDeps();
    const project = createCodeProject('proj_1', 'Repo', 'C:/repo');
    const approval = {
      id: 'appr_oc2',
      taskId: 'task_oc2',
      projectId: 'proj_1',
      status: 'requested' as const,
      commandId: 'repo.identity',
      openCodeSessionId: 'ses_2',
      openCodePermissionId: 'per_2',
    };
    deps.dataService.projects.get = vi.fn().mockResolvedValue(project);
    deps.dataService.tasks.list = vi.fn().mockResolvedValue([]);
    deps.dataService.approvals.listAll = vi.fn().mockResolvedValue([approval]);
    deps.dataService.executions.list = vi.fn().mockResolvedValue([]);
    const openCodeRunner = { runTask: vi.fn(), replyToApproval: vi.fn().mockResolvedValue({ status: 'completed' }), onEvent: vi.fn() };
    const store = createWorkspaceStore({ ...deps, openCodeRunner });
    await store.getState().selectProject('proj_1');
    await store.getState().rejectApproval('', 'appr_oc2', 'Not needed');
    expect(openCodeRunner.replyToApproval).toHaveBeenCalledWith({
      taskId: 'task_oc2',
      approvalId: 'appr_oc2',
      decision: 'reject',
      reason: 'Not needed',
    });
  });
});

describe('project deduplication', () => {
  function createHostAdapterMock(): HostAdapter {
    return {
      context: {
        hostId: 'test',
        hostName: 'Test',
        activeProjectId: null,
        theme: 'dark' as const,
        capabilities: {
          canSelectProject: true,
          canNavigate: true,
          supportsTheming: true,
          supportsMultiProject: false,
        },
        contextualRefs: {},
      },
      selectProject: vi.fn(),
      updateContext: vi.fn(),
      onEvent: vi.fn(() => () => {}),
      destroy: vi.fn(),
      performProjectAction: vi.fn().mockResolvedValue({ status: 'ok' }),
      restartApp: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createInMemoryDataService(initial?: {
    projects?: CodeProject[];
    tasks?: Task[];
    approvals?: Approval[];
  }): DataService {
    const projects = new Map<string, CodeProject>();
    const tasks = new Map<string, Task>();
    const approvals = new Map<string, Approval>();
    const preferences = new Map<string, string>();
    for (const project of initial?.projects ?? []) projects.set(project.id, project);
    for (const task of initial?.tasks ?? []) tasks.set(task.id, task);
    for (const approval of initial?.approvals ?? []) approvals.set(approval.id, approval);

    return {
      config: { storagePath: '/tmp' },
      async initialize() {},
      async flush() {},
      async destroy() {},
      projects: {
        async list() {
          return [...projects.values()];
        },
        async get(id) {
          return projects.get(id) ?? null;
        },
        async save(project) {
          projects.set(project.id, project);
        },
        async delete(id) {
          projects.delete(id);
        },
        async archive(id) {
          const target = projects.get(id);
          if (!target) return null;
          const next = { ...target, archived: true, updatedAt: Date.now() };
          projects.set(id, next);
          return next;
        },
        async unarchive(id) {
          const target = projects.get(id);
          if (!target) return null;
          const next = { ...target, archived: false, availability: 'available' as const, updatedAt: Date.now() };
          projects.set(id, next);
          return next;
        },
        async setRootPath(id, rootPath) {
          const target = projects.get(id);
          if (!target) return null;
          const next = { ...target, rootPath, availability: 'available' as const, updatedAt: Date.now() };
          projects.set(id, next);
          return next;
        },
        async setName(id, name) {
          const target = projects.get(id);
          if (!target) return null;
          const next = { ...target, name, updatedAt: Date.now() };
          projects.set(id, next);
          return next;
        },
        async setAvailability(id, availability) {
          const target = projects.get(id);
          if (!target) return null;
          const next = { ...target, availability, updatedAt: Date.now() };
          projects.set(id, next);
          return next;
        },
      },
      tasks: {
        async list(projectId) {
          return [...tasks.values()].filter((task) => task.projectId === projectId);
        },
        async listAll() {
          return [...tasks.values()];
        },
        async get(id) {
          return tasks.get(id) ?? null;
        },
        async save(task) {
          tasks.set(task.id, task);
        },
        async delete(id) {
          tasks.delete(id);
        },
        async updateStatus() {},
        async queue() {},
        async runNow() {},
      },
      approvals: {
        async list(taskId) {
          return [...approvals.values()].filter((approval) => approval.taskId === taskId);
        },
        async listAll() {
          return [...approvals.values()];
        },
        async get(id) {
          return approvals.get(id) ?? null;
        },
        async save(approval) {
          approvals.set(approval.id, approval);
        },
        async delete(id) {
          approvals.delete(id);
        },
        async resolve() {},
      },
      preferences: {
        async get(key) {
          return preferences.get(key) ?? null;
        },
        async set(key, value) {
          preferences.set(key, value);
        },
        async delete(key) {
          preferences.delete(key);
        },
      },
      executions: {
        async list() {
          return [];
        },
        async listAll() {
          return [];
        },
        async get() {
          return null;
        },
        async save() {},
        async cancel() {},
      },
      audit: {
        async append() {},
        async list() {
          return [];
        },
      },
      async listCommands() {
        return [];
      },
    };
  }

  it('normalises project paths across separators, trailing slashes and case', () => {
    expect(normalizeProjectPath('C:\\repo\\foo\\')).toBe('c:/repo/foo');
    expect(normalizeProjectPath('C:/repo/foo')).toBe('c:/repo/foo');
    expect(normalizeProjectPath('c:/repo/foo')).toBe('c:/repo/foo');
  });

  it('reconciles duplicate project paths deterministically', () => {
    const oldest = createCodeProject('proj_1', 'Repo', 'C:/repo');
    oldest.createdAt = 1000;
    const duplicate = createCodeProject('proj_2', 'Repo', 'C:\\repo\\');
    const other = createCodeProject('proj_3', 'Other', 'C:/other');

    const reconciliation = reconcileProjects([oldest, duplicate, other], 'proj_2');

    expect(reconciliation.projects).toHaveLength(2);
    const repoProject = reconciliation.projects.find((p) => p.rootPath === 'C:/repo');
    expect(repoProject?.id).toBe('proj_1');
    expect(reconciliation.moves.get('proj_2')).toBe('proj_1');
    expect(reconciliation.remappedActiveId).toBe('proj_1');
  });

  it('reconciliation is stable regardless of input order', () => {
    const a = createCodeProject('proj_a', 'Repo', 'C:/repo');
    a.createdAt = 2000;
    const b = createCodeProject('proj_b', 'Repo', 'C:/repo');
    b.createdAt = 1000;

    const forward = reconcileProjects([a, b], null);
    const backward = reconcileProjects([b, a], null);

    expect(forward.projects[0].id).toBe('proj_b');
    expect(backward.projects[0].id).toBe('proj_b');
  });

  it('does not create a duplicate record when the same path is opened again', async () => {
    const dataService = createInMemoryDataService();
    const store = createWorkspaceStore({ dataService, hostAdapter: createHostAdapterMock() });

    await store.getState().openProjectPath('C:/repo/a', 'A');
    const firstId = store.getState().activeProjectId;
    await store.getState().openProjectPath('C:\\repo\\a', 'A');
    await store.getState().openProjectPath('c:/repo/a', 'A');

    const projects = await dataService.projects.list();
    expect(projects).toHaveLength(1);
    expect(store.getState().activeProjectId).toBe(firstId);
  });

  it('reconciles existing duplicates on load and remaps task references', async () => {
    const older = createCodeProject('proj_1', 'Repo', 'C:/repo');
    older.createdAt = 1000;
    const duplicate = createCodeProject('proj_2', 'Repo', 'C:/repo');
    const task = createTask('task_1', 'proj_2', 'Untitled', 'hello');

    const dataService = createInMemoryDataService({
      projects: [older, duplicate],
      tasks: [task],
    });
    const store = createWorkspaceStore({ dataService, hostAdapter: createHostAdapterMock() });

    await store.getState().loadProjects();

    expect(store.getState().projects).toHaveLength(1);
    expect(store.getState().projects[0].id).toBe('proj_1');
    const migratedTask = await dataService.tasks.get('task_1');
    expect(migratedTask?.projectId).toBe('proj_1');
  });
});
