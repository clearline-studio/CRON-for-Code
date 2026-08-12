import { readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CodeProject,
  ProjectAvailability,
  Task,
  Approval,
  ExecutionRecord,
  AuditRecord,
} from '@cron-code/contracts';
import {
  updateTaskStatus,
  resolveApproval,
  archiveCodeProject,
  restoreCodeProject,
  relinkCodeProject,
  renameCodeProject,
  withAvailability,
} from '@cron-code/contracts';
import type { DataService, DataServiceConfig, CommandSummary } from './types.js';
import { buildCommandCatalogue } from './command-catalogue.js';
import { logger } from './logger.js';

interface StoreSchema {
  version: number;
  projects: Record<string, CodeProject>;
  tasks: Record<string, Task>;
  approvals: Record<string, Approval>;
  executions: Record<string, ExecutionRecord>;
  audit: AuditRecord[];
  preferences: Record<string, string>;
}

function emptySchema(): StoreSchema {
  return {
    version: 1,
    projects: {},
    tasks: {},
    approvals: {},
    executions: {},
    audit: [],
    preferences: {},
  };
}

export function createJsonDataService(config: DataServiceConfig): DataService {
  let store: StoreSchema = emptySchema();
  let initialized = false;
  const filePath = join(config.storagePath, 'store.json');

  async function ensureDir() {
    try {
      await access(config.storagePath);
    } catch {
      await mkdir(config.storagePath, { recursive: true });
    }
  }

  async function load(): Promise<void> {
    await ensureDir();
    try {
      const raw = await readFile(filePath, 'utf-8');
      if (!raw.trim()) {
        store = emptySchema();
        return;
      }
      const parsed = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof parsed.version !== 'number'
      ) {
        throw new Error('Invalid store schema');
      }
      store = {
        version: parsed.version,
        projects: parsed.projects ?? {},
        tasks: parsed.tasks ?? {},
        approvals: parsed.approvals ?? {},
        executions: parsed.executions ?? {},
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
        preferences: parsed.preferences ?? {},
      };
      for (const [id, project] of Object.entries(store.projects)) {
        let changed = false;
        if (!('availability' in project) || project.availability === undefined) {
          (project as CodeProject).availability = 'available';
          changed = true;
        }
        if (!('archived' in project) || (project as CodeProject).archived === undefined) {
          (project as CodeProject).archived = false;
          changed = true;
        }
        if (changed) {
          store.projects[id] = project as CodeProject;
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        store = emptySchema();
        return;
      }
      logger.warn('Failed to load store, starting fresh', { error: String(err) });
      store = emptySchema();
    }
  }

  let _flushPromise: Promise<void> | null = null;
  let _flushResolve: (() => void) | null = null;
  let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function doAtomicWrite(): Promise<void> {
    await ensureDir();
    const tmpPath = filePath + '.tmp';
    const content = JSON.stringify(store, null, 2);
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath);
  }

  function persist(): Promise<void> {
    if (_debounceTimer !== null) {
      clearTimeout(_debounceTimer);
    }

    if (!_flushPromise) {
      _flushPromise = new Promise<void>((resolve) => {
        _flushResolve = resolve;
      });
    }

    _debounceTimer = setTimeout(() => {
      _debounceTimer = null;
      void executeFlush();
    }, 250);

    return _flushPromise;
  }

  async function executeFlush(): Promise<void> {
    try {
      await doAtomicWrite();
    } catch (err) {
      logger.warn('Failed to flush store', { error: String(err) });
    }
    const resolve = _flushResolve;
    _flushPromise = null;
    _flushResolve = null;
    resolve?.();
  }

  async function flush(): Promise<void> {
    if (_debounceTimer !== null) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }
    if (_flushPromise) {
      await executeFlush();
    }
  }

  return {
    config,

    async initialize() {
      await load();
      initialized = true;
    },

    async destroy() {
      if (initialized) {
        await flush();
      }
      store = emptySchema();
      initialized = false;
    },

    async flush() {
      await flush();
    },

    async listCommands(): Promise<CommandSummary[]> {
      return buildCommandCatalogue().map((entry) => ({
        id: entry.id,
        displayCommand: entry.displayTemplate,
        category: entry.category,
        risk: entry.risk,
        readOnly: entry.readOnly,
        requiresApproval: entry.requiresApproval,
        timeoutMs: entry.timeoutMs,
      }));
    },

    projects: {
      async list() {
        return Object.values(store.projects);
      },
      async get(id) {
        return store.projects[id] ?? null;
      },
      async save(project) {
        store.projects[project.id] = project;
        await persist();
      },
      async delete(id) {
        delete store.projects[id];
        await persist();
      },
      async archive(id) {
        const project = store.projects[id];
        if (!project) return null;
        const next = archiveCodeProject(project);
        store.projects[id] = next;
        await persist();
        return next;
      },
      async unarchive(id) {
        const project = store.projects[id];
        if (!project) return null;
        const next = restoreCodeProject(project);
        store.projects[id] = next;
        await persist();
        return next;
      },
      async setRootPath(id, rootPath) {
        const project = store.projects[id];
        if (!project) return null;
        const next = relinkCodeProject(project, rootPath);
        store.projects[id] = next;
        await persist();
        return next;
      },
      async setName(id, name) {
        const project = store.projects[id];
        if (!project) return null;
        const next = renameCodeProject(project, name);
        store.projects[id] = next;
        await persist();
        return next;
      },
      async setAvailability(id, availability: ProjectAvailability) {
        const project = store.projects[id];
        if (!project) return null;
        const next = withAvailability(project, availability);
        store.projects[id] = next;
        await persist();
        return next;
      },
    },

    tasks: {
      async list(projectId) {
        return Object.values(store.tasks).filter((t) => t.projectId === projectId);
      },
      async listAll() {
        return Object.values(store.tasks);
      },
      async get(id) {
        return store.tasks[id] ?? null;
      },
      async save(task) {
        store.tasks[task.id] = task;
        await persist();
      },
      async delete(id) {
        delete store.tasks[id];
        await persist();
      },
      async updateStatus(id, status, error) {
        const task = store.tasks[id];
        if (!task) return;
        store.tasks[id] = updateTaskStatus(task, status, error);
        await persist();
      },
      async queue(id) {
        const task = store.tasks[id];
        if (!task) return;
        store.tasks[id] = updateTaskStatus(task, 'queued');
        await persist();
      },
      async runNow(id, _commandId) {
        // Data-layer intent marker: queues the task so the execution service
        // (approval → harness) can pick it up. Not a no-op.
        const task = store.tasks[id];
        if (!task) return;
        store.tasks[id] = updateTaskStatus(task, 'queued');
        await persist();
      },
    },

    approvals: {
      async list(taskId) {
        return Object.values(store.approvals).filter((a) => a.taskId === taskId);
      },
      async listAll() {
        return Object.values(store.approvals);
      },
      async get(id) {
        return store.approvals[id] ?? null;
      },
      async save(approval) {
        store.approvals[approval.id] = approval;
        await persist();
      },
      async delete(id) {
        delete store.approvals[id];
        await persist();
      },
      async resolve(id, status, reason) {
        const approval = store.approvals[id];
        if (!approval) return;
        store.approvals[id] = resolveApproval(approval, status, reason);
        await persist();
      },
    },

    executions: {
      async list(projectId) {
        return Object.values(store.executions)
          .filter((e) => e.projectId === projectId)
          .sort((a, b) => b.startedAt - a.startedAt);
      },
      async listAll() {
        return Object.values(store.executions).sort((a, b) => b.startedAt - a.startedAt);
      },
      async get(id) {
        return store.executions[id] ?? null;
      },
      async save(record) {
        store.executions[record.id] = record;
        await persist();
      },
      async cancel(id) {
        const record = store.executions[id];
        if (!record) return;
        store.executions[id] = {
          ...record,
          cancellation: {
            requested: true,
            requestedAt: record.cancellation.requestedAt ?? Date.now(),
          },
        };
        await persist();
      },
    },

    audit: {
      async append(record) {
        store.audit.push(record);
        await persist();
      },
      async list(filter) {
        const rows = [...store.audit];
        if (filter?.taskId) {
          return rows.filter((r) => r.taskId === filter.taskId);
        }
        if (filter?.projectId) {
          return rows.filter((r) => r.projectId === filter.projectId);
        }
        if (filter?.executionId) {
          return rows.filter((r) => r.executionId === filter.executionId);
        }
        return rows;
      },
    },

    preferences: {
      async get(key) {
        return store.preferences[key] ?? null;
      },
      async set(key, value) {
        store.preferences[key] = value;
        await persist();
      },
      async delete(key) {
        delete store.preferences[key];
        await persist();
      },
    },
  };
}
