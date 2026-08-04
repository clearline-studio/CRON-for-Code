import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceStore } from './store.js';

function createMockDeps() {
  return {
    dataService: {
      projects: {
        list: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
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
      config: { storagePath: '/tmp/test' },
      initialize: vi.fn(),
      flush: vi.fn(),
      destroy: vi.fn(),
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

  it('updates hostContext', () => {
    const deps = createMockDeps();
    const store = createWorkspaceStore(deps);
    store.getState().setHostContext({ ...deps.hostAdapter.context, theme: 'light' });
    expect(store.getState().hostContext.theme).toBe('light');
  });
});
