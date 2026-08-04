import { readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { CodeProject, Task, Approval } from '@cron-code/contracts';
import { updateTaskStatus, resolveApproval } from '@cron-code/contracts';
import type { DataService, DataServiceConfig } from './types.js';
import { logger } from './logger.js';

interface StoreSchema {
  version: number;
  projects: Record<string, CodeProject>;
  tasks: Record<string, Task>;
  approvals: Record<string, Approval>;
  preferences: Record<string, string>;
}

function emptySchema(): StoreSchema {
  return { version: 1, projects: {}, tasks: {}, approvals: {}, preferences: {} };
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
        preferences: parsed.preferences ?? {},
      };
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
      async runNow(_id) {
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
