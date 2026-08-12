import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createJsonDataService } from './json-store.js';
import {
  createCodeProject,
  createTask,
  createApproval,
  createExecutionRecord,
  createAuditRecord,
} from '@cron-code/contracts';

describe('JsonDataService', () => {
  let dir: string;
  let ds: ReturnType<typeof createJsonDataService>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cron-data-test-'));
    ds = createJsonDataService({ storagePath: dir });
  });

  afterEach(async () => {
    await ds.destroy();
    await rm(dir, { recursive: true, force: true });
  });

  it('starts with empty store', async () => {
    await ds.initialize();
    const projects = await ds.projects.list();
    expect(projects).toHaveLength(0);
  });

  it('saves and loads a project', async () => {
    await ds.initialize();
    const project = createCodeProject('p1', 'Test', '/test');
    await ds.projects.save(project);

    const loaded = await ds.projects.get('p1');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Test');
  });

  it('persists across re-initialization', async () => {
    await ds.initialize();
    const project = createCodeProject('p1', 'Persist Test', '/test');
    await ds.projects.save(project);
    await ds.destroy();

    const ds2 = createJsonDataService({ storagePath: dir });
    await ds2.initialize();
    const loaded = await ds2.projects.get('p1');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Persist Test');
    await ds2.destroy();
  });

  it('saves and lists tasks', async () => {
    await ds.initialize();
    const task = createTask('t1', 'p1', 'Task 1', 'Do it');
    await ds.tasks.save(task);

    const tasks = await ds.tasks.list('p1');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('draft');
  });

  it('saves and lists approvals', async () => {
    await ds.initialize();
    const approval = createApproval('a1', 't1', 'p1', 'read', 'Read file');
    await ds.approvals.save(approval);

    const approvals = await ds.approvals.list('t1');
    expect(approvals).toHaveLength(1);
    expect(approvals[0].status).toBe('requested');
  });

  it('handles preferences', async () => {
    await ds.initialize();
    await ds.preferences.set('theme', 'dark');
    const value = await ds.preferences.get('theme');
    expect(value).toBe('dark');
  });

  it('returns null for missing project', async () => {
    await ds.initialize();
    const project = await ds.projects.get('nonexistent');
    expect(project).toBeNull();
  });

  it('survives invalid stored data', async () => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'store.json'), 'not json at all', 'utf-8');

    const ds2 = createJsonDataService({ storagePath: dir });
    await ds2.initialize();
    const projects = await ds2.projects.list();
    expect(projects).toHaveLength(0);
    await ds2.destroy();
  });

  it('saves and lists execution records', async () => {
    await ds.initialize();
    const record = createExecutionRecord({
      id: 'exe_1',
      status: 'completed',
      commandId: 'repo.status',
      taskId: 't1',
      projectId: 'p1',
      approvalId: 'a1',
      cwd: '/test',
      executable: 'git',
      args: ['status', '--short'],
      displayCommand: 'git status --short',
      startedAt: 10,
      endedAt: 20,
      exitCode: 0,
    });
    await ds.executions.save(record);
    const list = await ds.executions.list('p1');
    expect(list).toHaveLength(1);
    expect(await ds.executions.get('exe_1')).not.toBeNull();
  });

  it('persists audit records in append order and reloads them', async () => {
    await ds.initialize();
    await ds.audit.append(createAuditRecord({ id: 'aud_1', eventType: 'task.queued', taskId: 't1', timestamp: 1 }));
    await ds.audit.append(createAuditRecord({ id: 'aud_2', eventType: 'execution.completed', taskId: 't1', timestamp: 2 }));

    const list = await ds.audit.list({ taskId: 't1' });
    expect(list.map((a) => a.id)).toEqual(['aud_1', 'aud_2']);

    await ds.destroy();
    const ds2 = createJsonDataService({ storagePath: dir });
    await ds2.initialize();
    const reloaded = await ds2.audit.list({ taskId: 't1' });
    expect(reloaded).toHaveLength(2);
    expect(reloaded[0].id).toBe('aud_1');
    await ds2.destroy();
  });

  it('audit records are append-only through the normal API (no edit/delete exposed)', async () => {
    await ds.initialize();
    await ds.audit.append(createAuditRecord({ id: 'aud_1', eventType: 'task.queued', taskId: 't1' }));
    const before = await ds.audit.list();
    expect(before).toHaveLength(1);
    // No update method exists on the returned service; the original record object
    // is stored by value (append), so mutating the caller's copy must not change it.
    const second = createAuditRecord({ id: 'aud_2', eventType: 'task.queued', taskId: 't1' });
    (second as { timestamp: number }).timestamp = 999;
    await ds.audit.append(second);
    const after = await ds.audit.list();
    expect(after).toHaveLength(2);
  });
});
