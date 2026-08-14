import { createStore } from 'zustand';
import type { StoreApi } from 'zustand';
import { createCodeProject, createTask } from '@cron-code/contracts';
import type {
  CodeProject,
  Task,
  Approval,
  HostContext,
  ExecutionRecord,
} from '@cron-code/contracts';
import type { DataService, CommandSummary } from '@cron-code/data-service';
import type { HostAdapter } from '@cron-code/host-adapter';
import type { OpenCodeRunnerClient } from './opencode-client.js';

export interface WorkspaceState {
  hostContext: HostContext;
  projects: CodeProject[];
  activeProjectId: string | null;
  tasks: Task[];
  approvals: Approval[];
  executions: ExecutionRecord[];
  commands: CommandSummary[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  isRestarting: boolean;
  copyConfirm: { path: string; at: number } | null;
  /** True while the native folder picker flow is active (CRON-styled wrap). */
  pickerActive: boolean;
}

export interface WorkspaceActions {
  setHostContext(ctx: HostContext): void;
  loadProjects(): Promise<void>;
  loadCommands(): Promise<void>;
  addProject(project: CodeProject): Promise<void>;
  openProjectPath(rootPath: string, name: string): Promise<void>;
  selectProject(projectId: string): Promise<void>;
  createDraftTask(title: string, prompt: string): Promise<string | null>;
  selectTask(taskId: string | null): void;
  refreshTasks(): Promise<void>;
  refreshApprovals(): Promise<void>;
  refreshExecutions(): Promise<void>;
  queueDraftTask(taskId: string): Promise<void>;
  runTaskNow(taskId: string, commandId?: string): Promise<void>;
  cancelExecution(executionId: string): Promise<void>;
  approveApproval(taskId: string, approvalId: string): Promise<void>;
  rejectApproval(taskId: string, approvalId: string, reason?: string): Promise<void>;
  setError(error: string | null): void;
  setPickerActive(active: boolean): void;
  archiveProject(projectId: string): Promise<void>;
  relinkProject(projectId: string): Promise<void>;
  renameProject(projectId: string, name: string): Promise<void>;
  refreshProject(projectId: string): Promise<void>;
  revealProject(projectId: string): Promise<void>;
  copyProjectPath(projectId: string): Promise<void>;
  clearCopyConfirm(): void;
  restartApp(): Promise<void>;
  restoreLastActiveProject(): Promise<void>;
  trayShowTasks(): void;
  trayPauseTask(): void;
  trayStopTask(): Promise<void>;
}

export type WorkspaceStoreType = WorkspaceState & WorkspaceActions;
export type WorkspaceStoreApi = StoreApi<WorkspaceStoreType>;

/** Normalises a project root path so equal folders compare equal (case-insensitive on Windows drives too). */
export function normalizeProjectPath(rootPath: string): string {
  return rootPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export interface ProjectReconciliation {
  projects: CodeProject[];
  remappedActiveId: string | null;
  moves: Map<string, string>;
  /** Canonical id per duplicate path (used to unarchive the canonical row when re-adding). */
  archivedDupes: Map<string, string>;
}

/**
 * Deterministically collapses projects that point at the same folder.
 * The canonical project per folder is the oldest ACTIVE (non-archived) record;
 * when the whole path is archived the oldest record is canonical. This preserves
 * the original stored project id for live navigation while ensuring an archived
 * record never shadows a newer active duplicate of the same folder.
 * Other non-archived ids for that folder are recorded in `moves` (duplicateId ->
 * canonicalId) so references can be remapped. Archived duplicates stay in
 * persistence (history preserved) and are excluded from navigation without
 * reference remapping. No project records are deleted.
 */
export function reconcileProjects(
  projects: CodeProject[],
  activeProjectId: string | null,
): ProjectReconciliation {
  const groups = new Map<string, CodeProject[]>();
  for (const project of projects) {
    const key = normalizeProjectPath(project.rootPath);
    const bucket = groups.get(key) ?? [];
    bucket.push(project);
    groups.set(key, bucket);
  }

  const reconciled: CodeProject[] = [];
  const moves = new Map<string, string>();
  const archivedDupes = new Map<string, string>();
  let remappedActiveId = activeProjectId;

  for (const bucket of groups.values()) {
    const sorted = [...bucket].sort(
      (a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    const active = sorted.filter((project) => !project.archived);
    const canonical = active.length > 0 ? active[0] : sorted[0];
    reconciled.push(canonical);
    if (canonical.archived) {
      for (const duplicate of sorted) {
        if (duplicate.id === canonical.id) continue;
        if (!duplicate.archived) {
          archivedDupes.set(duplicate.id, canonical.id);
        }
      }
      continue;
    }
    for (const duplicate of sorted) {
      if (duplicate.id === canonical.id) continue;
      if (duplicate.archived) continue;
      moves.set(duplicate.id, canonical.id);
      if (activeProjectId === duplicate.id) {
        remappedActiveId = canonical.id;
      }
    }
  }

  return { projects: reconciled, remappedActiveId, moves, archivedDupes };
}

/** Filters a project list to visible (non-archived) rows for sidebar/active navigation. */
export function visibleProjects(projects: CodeProject[]): CodeProject[] {
  return projects.filter((project) => !project.archived);
}

/** Moves tasks/approvals that referenced a collapsed duplicate project onto the canonical id. */
async function remapProjectReferences(
  dataService: DataService,
  moves: Map<string, string>,
): Promise<void> {
  if (moves.size === 0) return;

  const tasks = await dataService.tasks.listAll();
  for (const task of tasks) {
    const targetId = moves.get(task.projectId);
    if (targetId) {
      await dataService.tasks.save({ ...task, projectId: targetId });
    }
  }

  const approvals = await dataService.approvals.listAll();
  for (const approval of approvals) {
    const targetId = moves.get(approval.projectId);
    if (targetId) {
      await dataService.approvals.save({ ...approval, projectId: targetId });
    }
  }
}

export function createWorkspaceStore(deps: {
  dataService: DataService;
  hostAdapter: HostAdapter;
  /** Optional runner bridge so tray Stop can cancel a pending OpenCode approval. */
  openCodeRunner?: OpenCodeRunnerClient;
}): WorkspaceStoreApi {
  const { dataService, hostAdapter } = deps;

  return createStore<WorkspaceStoreType>()((set, get) => ({
    hostContext: hostAdapter.context,
    projects: [],
    activeProjectId: null,
    tasks: [],
    approvals: [],
    executions: [],
    commands: [],
    selectedTaskId: null,
    isLoading: false,
    error: null,
    isRestarting: false,
    copyConfirm: null,
    // True while the native folder picker flow is active (CRON-styled picker
    // modal wraps the OS dialog so the user stays in app context).
    pickerActive: false,

    setPickerActive(active) {
      set({ pickerActive: active });
    },

    setHostContext(ctx) {
      set({ hostContext: ctx });
    },

    async loadCommands() {
      try {
        const commands = await dataService.listCommands();
        set({ commands });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to load commands',
        });
      }
    },

    async loadProjects() {
      set({ isLoading: true, error: null });
      try {
        const projects = await dataService.projects.list();
        const reconciliation = reconcileProjects(projects, get().activeProjectId);
        await remapProjectReferences(dataService, reconciliation.moves);
        set({
          projects: reconciliation.projects,
          activeProjectId: reconciliation.remappedActiveId,
          isLoading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to load projects',
          isLoading: false,
        });
      }
    },

    async restoreLastActiveProject() {
      try {
        const raw = await dataService.preferences.get('lastActiveProjectId');
        let targetId: string | null = null;
        if (typeof raw === 'string' && raw.trim() !== '') {
          const candidate = await dataService.projects.get(raw);
          if (candidate && !candidate.archived && candidate.availability === 'available') {
            targetId = candidate.id;
          }
        }
        const all = await dataService.projects.list();
        const reconciliation = reconcileProjects(all, targetId);
        if (!targetId) {
          // Last active is missing/archived/unavailable: use the current safe
          // fallback (first available non-archived visible project) instead of
          // leaving the app without a project. Never clears the loaded list.
          const fallback = reconciliation.projects.find(
            (project) => !project.archived && project.availability === 'available',
          );
          targetId = fallback?.id ?? null;
        }
        if (!targetId) {
          await dataService.preferences.set('lastActiveProjectId', '');
          return;
        }
        set({
          projects: reconciliation.projects,
          activeProjectId: targetId,
        });
        const tasks = await dataService.tasks.list(targetId);
        const approvals = await dataService.approvals.listAll();
        const executions = await dataService.executions.list(targetId);
        set({
          activeProjectId: targetId,
          tasks,
          approvals,
          executions,
        });
        await dataService.preferences.set('lastActiveProjectId', targetId);
      } catch {
        // Silent: restore is best-effort and must never break startup.
      }
    },

    async addProject(project) {
      try {
        // Dedup against PERSISTED projects too: the in-memory list can lag behind
        // (e.g. a second selection racing the first open), which previously let
        // duplicate records through. The persisted store is the source of truth.
        const persisted = await dataService.projects.list();
        const existing =
          get().projects.find(
            (candidate) =>
              normalizeProjectPath(candidate.rootPath) === normalizeProjectPath(project.rootPath),
          ) ??
          persisted.find(
            (candidate) =>
              normalizeProjectPath(candidate.rootPath) === normalizeProjectPath(project.rootPath),
          );
        if (existing) {
          if (existing.archived) {
            await dataService.projects.unarchive(existing.id);
          }
          await get().selectProject(existing.id);
          return;
        }
        await dataService.projects.save(project);
        const projects = await dataService.projects.list();
        const reconciliation = reconcileProjects(projects, project.id);
        set({
          projects: reconciliation.projects,
          activeProjectId: reconciliation.remappedActiveId,
          isLoading: false,
        });
        await dataService.preferences.set('lastActiveProjectId', project.id);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to add project',
          isLoading: false,
        });
      }
    },

    async openProjectPath(rootPath, name) {
      if (typeof rootPath !== 'string' || rootPath.trim() === '') {
        set({ error: 'Project folder path is missing' });
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const normalized = normalizeProjectPath(rootPath);
        const persisted = await dataService.projects.list();
        const existing =
          get().projects.find(
            (candidate) => normalizeProjectPath(candidate.rootPath) === normalized,
          ) ??
          persisted.find(
            (candidate) => normalizeProjectPath(candidate.rootPath) === normalized,
          );
        if (existing) {
          if (existing.archived) {
            const unarchived = await dataService.projects.unarchive(existing.id);
            if (unarchived) {
              set((state) => ({
                projects: state.projects.map((p) => (p.id === existing.id ? unarchived : p)),
              }));
            }
          }
          await get().selectProject(existing.id);
          return;
        }
        const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const project = createCodeProject(id, name ?? 'Project', rootPath);
        await get().addProject(project);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to open project',
        });
      } finally {
        set({ isLoading: false });
      }
    },

    async selectProject(projectId) {
      try {
        const project = await dataService.projects.get(projectId);
        if (!project) {
          set({ error: `Project not found: ${projectId}` });
          return;
        }
        let active = project;
        if (project.archived) {
          const unarchived = await dataService.projects.unarchive(projectId);
          if (unarchived) {
            active = unarchived;
            set((state) => ({
              projects: state.projects.map((p) => (p.id === projectId ? unarchived : p)),
            }));
          }
        }
        await dataService.projects.save({
          ...active,
          lastOpenedAt: Date.now(),
          updatedAt: Date.now(),
        });
        await dataService.preferences.set('lastActiveProjectId', active.id);
        const tasks = await dataService.tasks.list(active.id);
        const approvals = await dataService.approvals.listAll();
        const executions = await dataService.executions.list(active.id);
        set({
          activeProjectId: active.id,
          tasks,
          approvals,
          executions,
          selectedTaskId: null,
          isLoading: false,
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
        return null;
      }

      try {
        const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const task = createTask(id, activeProjectId, title, prompt);

        await dataService.tasks.save(task);
        const tasks = await dataService.tasks.list(activeProjectId);
        set({ tasks, selectedTaskId: task.id });
        return task.id;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to create task',
        });
        return null;
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

    async refreshApprovals() {
      try {
        const approvals = await dataService.approvals.listAll();
        set({ approvals });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to refresh approvals',
        });
      }
    },

    async refreshExecutions() {
      const { activeProjectId } = get();
      if (!activeProjectId) return;
      try {
        const executions = await dataService.executions.list(activeProjectId);
        set({ executions });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to refresh executions',
        });
      }
    },

    async queueDraftTask(taskId) {
      try {
        await dataService.tasks.queue(taskId);
        await get().refreshTasks();
        await get().refreshApprovals();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to queue task',
        });
      }
    },

    async runTaskNow(taskId, commandId) {
      try {
        await dataService.tasks.runNow(taskId, commandId);
        await get().refreshTasks();
        await get().refreshApprovals();
        await get().refreshExecutions();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to run task',
        });
      }
    },

    async cancelExecution(executionId) {
      try {
        await dataService.executions.cancel(executionId);
        await get().refreshExecutions();
        await get().refreshTasks();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to cancel execution',
        });
      }
    },

    async approveApproval(_taskId, approvalId) {
      try {
        await dataService.approvals.resolve(approvalId, 'approved');
        await get().refreshTasks();
        await get().refreshApprovals();
        await get().refreshExecutions();
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
        await get().refreshApprovals();
        await get().refreshExecutions();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to reject approval',
        });
      }
    },

    setError(error) {
      set({ error });
    },

    async archiveProject(projectId) {
      try {
        const project = await dataService.projects.get(projectId);
        if (!project) {
          set({ error: 'Project not found' });
          return;
        }
        if (project.archived) {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? project : p)),
            activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
          }));
          return;
        }
        const next = await dataService.projects.archive(projectId);
        if (!next) return;
        set((state) => {
          const visible = state.projects.filter((p) => p.id !== projectId);
          const wasActive = state.activeProjectId === projectId;
          const fallback = wasActive ? (visible[0]?.id ?? null) : state.activeProjectId;
          if (wasActive) {
            void dataService.preferences.set('lastActiveProjectId', fallback ?? '');
          }
          return {
            projects: visible,
            activeProjectId: fallback,
            tasks: wasActive ? [] : state.tasks,
            executions: wasActive ? [] : state.executions,
            selectedTaskId: wasActive ? null : state.selectedTaskId,
          };
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to remove project' });
      }
    },

    async relinkProject(projectId) {
      try {
        const result = await hostAdapter.performProjectAction({ kind: 'relink', projectId });
        if (result && typeof result === 'object' && result.status === 'cancelled') {
          // User cancelled the folder picker: exact no-op. No error, no mutation,
          // no loading state, no active-project or list change.
          return;
        }
        if (result && typeof result === 'object' && result.status === 'conflict') {
          set({
            error: `Re-link blocked: that folder already belongs to project ${result.conflictProjectId} (${result.conflictRootPath}).`,
          });
          return;
        }
        await get().loadProjects();
        const all = await dataService.projects.list();
        const refreshed = all.find((p) => p.id === projectId);
        if (refreshed) {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? refreshed : p)),
          }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Re-link failed';
        set({ error: `Re-link failed: ${message}` });
      }
    },

    async renameProject(projectId, name) {
      try {
        const trimmed = typeof name === 'string' ? name.trim() : '';
        if (trimmed === '') {
          set({ error: 'Project name cannot be empty' });
          return;
        }
        if (trimmed.length > 120) {
          set({ error: 'Project name is too long' });
          return;
        }
        const next = await dataService.projects.setName(projectId, trimmed);
        if (!next) {
          set({ error: 'Project not found' });
          return;
        }
        set((state) => ({
          projects: state.projects.map((p) => (p.id === projectId ? next : p)),
        }));
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to rename project' });
      }
    },

    async refreshProject(projectId) {
      try {
        const project = await dataService.projects.get(projectId);
        if (!project) return;
        // When running under a host that implements project actions, route through
        // the validated host bridge; otherwise fall back to a best-effort local
        // availability check (test environments / headless contexts).
        const host = hostAdapter;
        if (host && typeof host.performProjectAction === 'function') {
          await host.performProjectAction({ kind: 'refresh', projectId });
          const refreshed = await dataService.projects.get(projectId);
          if (refreshed) {
            set((state) => ({
              projects: state.projects.map((p) => (p.id === projectId ? refreshed : p)),
            }));
          }
          return;
        }
        const next = await dataService.projects.setAvailability(projectId, 'available');
        if (next) {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? next : p)),
          }));
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to refresh project' });
      }
    },

    async revealProject(projectId) {
      try {
        await hostAdapter.performProjectAction({ kind: 'reveal', projectId });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to open in File Explorer' });
      }
    },

    async copyProjectPath(projectId) {
      try {
        await hostAdapter.performProjectAction({ kind: 'copy-path', projectId });
        const project = get().projects.find((p) => p.id === projectId);
        if (project) {
          set({ copyConfirm: { path: project.rootPath, at: Date.now() } });
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to copy project path' });
      }
    },

    clearCopyConfirm() {
      set({ copyConfirm: null });
    },

    async restartApp() {
      if (get().isRestarting) return;
      set({ isRestarting: true, error: null });
      try {
        await hostAdapter.restartApp();
        // On success the app is about to close/relaunch: keep isRestarting true
        // so the Restarting overlay stays painted for the whole pre-quit window.
        // Only a genuine failure clears it (with a visible error below).
      } catch (err) {
        set({
          isRestarting: false,
          error: err instanceof Error ? err.message : 'Failed to restart CRON',
        });
      }
    },

    trayShowTasks() {
      const { tasks } = get();
      const active =
        tasks.find((task) => task.status === 'running') ??
        tasks.find((task) => task.status === 'approval_required') ??
        tasks.find((task) => task.status === 'queued') ??
        tasks[tasks.length - 1] ??
        null;
      set({ selectedTaskId: active?.id ?? null });
    },

    trayPauseTask() {
      // The task model has no pause state (TaskStatus has no 'paused'), so the
      // tray Pause item surfaces the active task like "Show active tasks"
      // instead of pretending to pause. It never cancels anything.
      get().trayShowTasks();
    },

    async trayStopTask() {
      const { tasks, approvals } = get();
      const task =
        tasks.find((candidate) => candidate.status === 'running') ??
        tasks.find((candidate) => candidate.status === 'approval_required') ??
        null;
      if (!task) {
        get().trayShowTasks();
        return;
      }
      const pending = approvals.find(
        (approval) => approval.taskId === task.id && approval.status === 'requested',
      );
      if (
        pending?.openCodeSessionId &&
        pending?.openCodePermissionId &&
        deps.openCodeRunner
      ) {
        try {
          await deps.openCodeRunner.replyToApproval({
            taskId: task.id,
            approvalId: pending.id,
            decision: 'reject',
            reason: 'Stopped from the system tray',
          });
          await get().refreshTasks();
          await get().refreshApprovals();
          await get().refreshExecutions();
          return;
        } catch (err) {
          set({
            selectedTaskId: task.id,
            error: err instanceof Error ? err.message : 'CRON could not stop the task from the tray',
          });
          return;
        }
      }
      // No interruptible execution handle exists for this task: catalogue
      // executions and running OpenCode sessions expose no cancel id to the
      // renderer, so a genuine stop needs a backend cancel path.
      set({
        selectedTaskId: task.id,
        error:
          'CRON could not stop the running task from the tray: it is not currently interruptible from the app.',
      });
    },
  }));
}
