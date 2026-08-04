import { createStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { CodeProject, Task, Approval, HostContext } from '@cron-code/contracts';
import type { DataService } from '@cron-code/data-service';
import type { HostAdapter } from '@cron-code/host-adapter';

export interface WorkspaceState {
  hostContext: HostContext;
  projects: CodeProject[];
  activeProjectId: string | null;
  tasks: Task[];
  approvals: Approval[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface WorkspaceActions {
  setHostContext(ctx: HostContext): void;
  loadProjects(): Promise<void>;
  addProject(project: CodeProject): Promise<void>;
  selectProject(projectId: string): Promise<void>;
  createDraftTask(title: string, prompt: string): Promise<void>;
  selectTask(taskId: string | null): void;
  refreshTasks(): Promise<void>;
  queueDraftTask(taskId: string): Promise<void>;
  runTaskNow(taskId: string): Promise<void>;
  approveApproval(taskId: string, approvalId: string): Promise<void>;
  rejectApproval(taskId: string, approvalId: string, reason?: string): Promise<void>;
  setError(error: string | null): void;
}

export type WorkspaceStoreType = WorkspaceState & WorkspaceActions;
export type WorkspaceStoreApi = StoreApi<WorkspaceStoreType>;

export function createWorkspaceStore(deps: {
  dataService: DataService;
  hostAdapter: HostAdapter;
}): WorkspaceStoreApi {
  const { dataService, hostAdapter } = deps;

  return createStore<WorkspaceStoreType>()((set, get) => ({
    hostContext: hostAdapter.context,
    projects: [],
    activeProjectId: null,
    tasks: [],
    approvals: [],
    selectedTaskId: null,
    isLoading: false,
    error: null,

    setHostContext(ctx) {
      set({ hostContext: ctx });
    },

    async loadProjects() {
      set({ isLoading: true, error: null });
      try {
        const projects = await dataService.projects.list();
        set({ projects, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to load projects',
          isLoading: false,
        });
      }
    },

    async addProject(project) {
      try {
        await dataService.projects.save(project);
        const projects = await dataService.projects.list();
        set({ projects, activeProjectId: project.id });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to add project',
        });
      }
    },

    async selectProject(projectId) {
      try {
        const project = await dataService.projects.get(projectId);
        if (!project) {
          set({ error: `Project not found: ${projectId}` });
          return;
        }
        await dataService.projects.save({
          ...project,
          lastOpenedAt: Date.now(),
          updatedAt: Date.now(),
        });
        const tasks = await dataService.tasks.list(projectId);
        const approvals = await dataService.approvals.listAll();
        set({
          activeProjectId: projectId,
          tasks,
          approvals,
          selectedTaskId: null,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to select project',
        });
      }
    },

    async createDraftTask(title, prompt) {
      const { activeProjectId } = get();
      if (!activeProjectId) {
        set({ error: 'No project selected' });
        return;
      }

      try {
        const { createTask: makeTask } = await import('@cron-code/contracts');
        const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const task = makeTask(id, activeProjectId, title, prompt);

        await dataService.tasks.save(task);
        const tasks = await dataService.tasks.list(activeProjectId);
        set({ tasks, selectedTaskId: task.id });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to create task',
        });
      }
    },

    selectTask(taskId) {
      set({ selectedTaskId: taskId });
    },

    async refreshTasks() {
      const { activeProjectId } = get();
      if (!activeProjectId) return;
      try {
        const tasks = await dataService.tasks.list(activeProjectId);
        set({ tasks });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to refresh tasks',
        });
      }
    },

    async queueDraftTask(taskId) {
      try {
        await dataService.tasks.queue(taskId);
        await get().refreshTasks();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to queue task',
        });
      }
    },

    async runTaskNow(taskId) {
      try {
        await dataService.tasks.runNow(taskId);
        await get().refreshTasks();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to run task',
        });
      }
    },

    async approveApproval(_taskId, approvalId) {
      try {
        await dataService.approvals.resolve(approvalId, 'approved');
        await get().refreshTasks();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to approve',
        });
      }
    },

    async rejectApproval(_taskId, approvalId, reason) {
      try {
        await dataService.approvals.resolve(approvalId, 'rejected', reason);
        await get().refreshTasks();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to reject approval',
        });
      }
    },

    setError(error) {
      set({ error });
    },
  }));
}
