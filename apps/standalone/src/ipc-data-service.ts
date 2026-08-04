import type { CodeProject, Task, TaskStatus, Approval } from '@cron-code/contracts';
import type { DataService, DataServiceConfig } from '@cron-code/data-service';

interface CronHostDb {
  loadAll(): Promise<{
    projects: CodeProject[];
    tasks: Task[];
    approvals: Approval[];
    preferences: Record<string, string | null>;
  }>;
  saveProject(project: CodeProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  saveTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
  updateTaskStatus(id: string, status: TaskStatus, error?: string): Promise<void>;
  queueTask(id: string): Promise<void>;
  saveApproval(approval: Approval): Promise<void>;
  deleteApproval(id: string): Promise<void>;
  resolveApproval(id: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
  setPreference(key: string, value: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
}

declare global {
  interface Window {
    cronHost: {
      selectFolder: () => Promise<string | null>;
      db: CronHostDb;
      task: {
        runNow(taskId: string): Promise<void>;
      };
    };
  }
}

export function createIpcDataService(config: DataServiceConfig): DataService {
  const db = window.cronHost.db;

  return {
    config,

    async initialize() {
      await db.loadAll();
    },

    async destroy() {},

    async flush() {},

    projects: {
      async list() {
        const data = await db.loadAll();
        return data.projects;
      },
      async get(id) {
        const data = await db.loadAll();
        return data.projects.find((p) => p.id === id) ?? null;
      },
      async save(project) {
        await db.saveProject(project);
      },
      async delete(id) {
        await db.deleteProject(id);
      },
    },

    tasks: {
      async list(projectId) {
        const data = await db.loadAll();
        return data.tasks.filter((t) => t.projectId === projectId);
      },
      async listAll() {
        const data = await db.loadAll();
        return data.tasks;
      },
      async get(id) {
        const data = await db.loadAll();
        return data.tasks.find((t) => t.id === id) ?? null;
      },
      async save(task) {
        await db.saveTask(task);
      },
      async delete(id) {
        await db.deleteTask(id);
      },
      async updateStatus(id, status, error) {
        await db.updateTaskStatus(id, status, error);
      },
      async queue(id) {
        await db.queueTask(id);
      },
      async runNow(id) {
        await window.cronHost.task.runNow(id);
      },
    },

    approvals: {
      async list(taskId) {
        const data = await db.loadAll();
        return data.approvals.filter((a) => a.taskId === taskId);
      },
      async listAll() {
        const data = await db.loadAll();
        return data.approvals;
      },
      async get(id) {
        const data = await db.loadAll();
        return data.approvals.find((a) => a.id === id) ?? null;
      },
      async save(approval) {
        await db.saveApproval(approval);
      },
      async delete(id) {
        await db.deleteApproval(id);
      },
      async resolve(id, status, reason) {
        await db.resolveApproval(id, status, reason);
      },
    },

    preferences: {
      async get(key) {
        const data = await db.loadAll();
        return data.preferences[key] ?? null;
      },
      async set(key, value) {
        await db.setPreference(key, value);
      },
      async delete(key) {
        await db.setPreference(key, '');
      },
    },
  };
}
