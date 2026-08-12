import type {
  CodeProject,
  Task,
  TaskStatus,
  Approval,
  ExecutionRecord,
  AuditRecord,
  ProjectAvailability,
} from '@cron-code/contracts';
import type { DataService, DataServiceConfig, CommandSummary } from '@cron-code/data-service';
import type { OpenCodeApprovalReplyInput, OpenCodeApprovalReplyResult, OpenCodeRunEvent, OpenCodeRunInput, OpenCodeRunResult } from '@cron-code/data-service';
interface LlmClient {
  getConfig(): Promise<{ baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }>;
  saveConfig(config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }): Promise<void>;
  test(config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }): Promise<{ ok: boolean; models: string[]; message: string }>;
  chat(input: {
    config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string };
    model: string;
    message: string;
    route?: string;
    attachments?: Array<{ id: string; name: string; mimeType: string; size: number; kind: string; dataUrl?: string; text?: string }>;
    contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{ text: string }>;
}

interface CronHostDb {
  loadAll(): Promise<{
    projects: CodeProject[];
    tasks: Task[];
    approvals: Approval[];
    executions: ExecutionRecord[];
    audit: AuditRecord[];
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
  saveExecution(record: ExecutionRecord): Promise<void>;
  cancelExecution(id: string): Promise<void>;
  auditAppend(record: AuditRecord): Promise<void>;
  auditList(filter?: { taskId?: string; projectId?: string; executionId?: string }): Promise<AuditRecord[]>;
  setPreference(key: string, value: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
}

export type HostRelinkResult =
  | { status: 'cancelled' }
  | { status: 'ok'; project: CodeProject }
  | { status: 'conflict'; project: CodeProject; conflictProjectId: string; conflictRootPath: string };

interface CronHostProject {
  reveal(projectId: string): Promise<void>;
  copyPath(projectId: string): Promise<void>;
  refresh(projectId: string): Promise<{ project: CodeProject; availability: ProjectAvailability }>;
  rename(projectId: string, name: string): Promise<{ project: CodeProject }>;
  archive(projectId: string): Promise<{ project: CodeProject }>;
  unarchive(projectId: string): Promise<{ project: CodeProject }>;
  relink(projectId: string): Promise<HostRelinkResult>;
  restoreLastActive(): Promise<{ project: CodeProject | null }>;
}

interface CronHostApp {
  restart(): Promise<void>;
}

interface CronHostDiag {
  marker(): Promise<{
    appVersion: string;
    pid: number;
    mainHash: string;
    preloadHash: string;
    registeredIpcChannels: string[];
    requiredChannels: string[];
    startupTimestamp: number;
    windowReady: boolean;
    rendererReady: boolean;
    rendererUsable: boolean;
    registrationError: string | null;
    restartHandoff: boolean;
  }>;
  ready(): Promise<{ ok: boolean }>;
  usable(): Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    cronHost: {
      selectFolder: () => Promise<string | null>;
      db: CronHostDb;
      task: {
        runNow(taskId: string, commandId?: string): Promise<void>;
      };
      execution: {
        cancel(executionId: string): Promise<void>;
        listCommands(): Promise<CommandSummary[]>;
      };
      opencode: {
        runTask(input: OpenCodeRunInput): Promise<OpenCodeRunResult>;
        replyToApproval(input: OpenCodeApprovalReplyInput): Promise<OpenCodeApprovalReplyResult>;
        onEvent(callback: (event: OpenCodeRunEvent) => void): () => void;
      };
      project: CronHostProject;
      app: CronHostApp;
      diag: CronHostDiag;
      lmStudio: {
        getConfig(): Promise<{ baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }>;
        saveConfig(config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }): Promise<void>;
        test(config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string }): Promise<{ ok: boolean; models: string[]; message: string }>;
        chat(input: {
          config: { baseUrl: string; textModel: string; visionModel: string; codingModel: string; escalationModel: string };
          model: string;
          message: string;
          route?: string;
          attachments?: Array<{ id: string; name: string; mimeType: string; size: number; kind: string; dataUrl?: string; text?: string }>;
          contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
        }): Promise<{ text: string }>;
      };
    };
  }
}

/** Exact message shown when the host connection is incomplete (missing IPC handlers). */
export const INCOMPLETE_HOST_MESSAGE =
  'CRON for Code started with an incomplete host connection. Restart the dev app.';

export function createIpcLlmClient(): LlmClient {
  return {
    getConfig: () => window.cronHost.lmStudio.getConfig(),
    saveConfig: (config) => window.cronHost.lmStudio.saveConfig(config),
    test: (config) => window.cronHost.lmStudio.test(config),
    chat: (input) => window.cronHost.lmStudio.chat(input),
  };
}

export function createIpcOpenCodeRunnerClient() {
  return {
    runTask: (input: OpenCodeRunInput) => window.cronHost.opencode.runTask(input),
    replyToApproval: (input: OpenCodeApprovalReplyInput) => window.cronHost.opencode.replyToApproval(input),
    onEvent: (callback: (event: OpenCodeRunEvent) => void) => window.cronHost.opencode.onEvent(callback),
  };
}

export function createIpcDataService(config: DataServiceConfig): DataService {
  const db = window.cronHost.db;

  return {
    config,

    async initialize() {
      await db.loadAll();
      // Verify the live host connection: an old/stale Electron main process does
      // not register the current handlers. Surface the preferred message instead
      // of a bare "No handler registered" IPC error.
      try {
        const diag = await window.cronHost.diag.marker();
        const required = Array.isArray(diag.requiredChannels) ? diag.requiredChannels : [];
        const registered = Array.isArray(diag.registeredIpcChannels) ? diag.registeredIpcChannels : [];
        const missing = required.filter((channel) => !registered.includes(channel));
        if (diag.registrationError || missing.length > 0) {
          throw new Error(INCOMPLETE_HOST_MESSAGE);
        }
      } catch (err) {
        if (err instanceof Error && err.message === INCOMPLETE_HOST_MESSAGE) throw err;
        throw new Error(INCOMPLETE_HOST_MESSAGE, { cause: err });
      }
    },

    async destroy() {},

    async flush() {},

    async listCommands() {
      return window.cronHost.execution.listCommands();
    },

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
      async archive(id) {
        return window.cronHost.project.archive(id).then((r) => r.project);
      },
      async unarchive(id) {
        // Pure persistence operation - never opens a folder picker.
        return window.cronHost.project.unarchive(id).then((r) => r.project);
      },
      async setRootPath(id) {
        // Re-link requires a user-selected folder; main shows the picker.
        const result = await window.cronHost.project.relink(id);
        return result.status === 'ok' ? result.project : null;
      },
      async setName(id, name) {
        return window.cronHost.project.rename(id, name).then((r) => r.project);
      },
      async setAvailability(id) {
        return window.cronHost.project.refresh(id).then((r) => r.project);
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
      async runNow(id, commandId) {
        await window.cronHost.task.runNow(id, commandId);
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

    executions: {
      async list(projectId) {
        const data = await db.loadAll();
        return data.executions.filter((e) => e.projectId === projectId);
      },
      async listAll() {
        const data = await db.loadAll();
        return data.executions;
      },
      async get(id) {
        const data = await db.loadAll();
        return data.executions.find((e) => e.id === id) ?? null;
      },
      async save(record) {
        await db.saveExecution(record);
      },
      async cancel(id) {
        await window.cronHost.execution.cancel(id);
      },
    },

    audit: {
      async append(record) {
        await db.auditAppend(record);
      },
      async list(filter) {
        return db.auditList(filter);
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
