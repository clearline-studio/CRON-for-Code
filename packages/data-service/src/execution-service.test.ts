import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createJsonDataService } from './json-store.js';
import type { DataService } from './types.js';
import { SafeExecutionHarness } from './execution-harness.js';
import { ExecutionService } from './execution-service.js';
import { createCodeProject, createTask } from '@cron-code/contracts';

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'tags'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(
    join(dir, '.git', 'config'),
    '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n',
  );
  writeFileSync(join(dir, 'README.md'), 'test repo\n');
}

let tmp: string;
let repoRoot: string;
let dataService: DataService;
let service: ExecutionService;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-service-'));
  repoRoot = join(tmp, 'repo');
  makeGitRepo(repoRoot);
  dataService = createJsonDataService({ storagePath: tmp });
  await dataService.initialize();
  service = new ExecutionService({
    dataService,
    harness: new SafeExecutionHarness(),
  });
});

afterEach(async () => {
  await dataService.destroy().catch(() => undefined);
  rmSync(tmp, { recursive: true, force: true });
});

async function seed(): Promise<{ projectId: string; taskId: string }> {
  const project = createCodeProject('proj_1', 'Repo', repoRoot);
  await dataService.projects.save(project);
  const task = createTask('task_1', 'proj_1', 'Run identity', 'show identity');
  await dataService.tasks.save(task);
  return { projectId: project.id, taskId: task.id };
}

describe('ExecutionService', () => {
  it('queues a task and records task.queued audit', async () => {
    const { taskId } = await seed();
    const outcome = await service.queueTask(taskId);
    expect(outcome.queued).toBe(true);
    const task = await dataService.tasks.get(taskId);
    expect(task?.status).toBe('queued');
    const audits = await dataService.audit.list({ taskId });
    expect(audits.some((a) => a.eventType === 'task.queued')).toBe(true);
  });

  it('requests approval first and blocks execution until approved', async () => {
    const { taskId } = await seed();
    const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(blocked.executed).toBe(false);
    expect(blocked.blockedReason).toBe('Approval is pending');
    expect(blocked.approval).not.toBeNull();
    expect(blocked.approval?.commandId).toBe('repo.identity');
    const task = await dataService.tasks.get(taskId);
    expect(task?.status).toBe('approval_required');
    expect(await dataService.executions.listAll()).toHaveLength(0);
  });

  it(
    'executes after approval, persists the record and audits the lifecycle',
    { timeout: 20000 },
    async () => {
      const { taskId } = await seed();
      const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
      const approvalId = blocked.approval!.id;
      await dataService.approvals.resolve(approvalId, 'approved', 'ok');

      const outcome = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
      expect(outcome.executed).toBe(true);
      expect(outcome.record?.status).toBe('completed');
      expect(outcome.record?.exitCode).toBe(0);
      expect(outcome.record?.cwd).toBe(repoRoot);
      expect(outcome.record?.commandId).toBe('repo.identity');

      const task = await dataService.tasks.get(taskId);
      expect(task?.status).toBe('completed');
    expect(task?.completedAt).not.toBeNull();

    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);

    const audits = await dataService.audit.list({ taskId });
    const eventTypes = audits.map((a) => a.eventType);
    expect(eventTypes).toContain('approval.requested');
    expect(eventTypes).toContain('execution.started');
    expect(eventTypes).toContain('execution.completed');
  });

  it('persists records across a restart (new service on the same store)', async () => {
    const { taskId } = await seed();
    const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    await dataService.approvals.resolve(blocked.approval!.id, 'approved');
    await service.runTaskNow(taskId, { commandId: 'repo.identity' });

    const reloaded = createJsonDataService({ storagePath: tmp });
    await reloaded.initialize();
    const executions = await reloaded.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].status).toBe('completed');
    const audits = await reloaded.audit.list({ taskId });
    expect(audits.some((a) => a.eventType === 'execution.completed')).toBe(true);
    await reloaded.destroy();
  });

  it('blocks execution when approval is rejected', async () => {
    const { taskId } = await seed();
    const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    await dataService.approvals.resolve(blocked.approval!.id, 'rejected', 'no');

    const again = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(again.executed).toBe(false);
    expect(again.blockedReason).toBe('Approval rejected');
    const task = await dataService.tasks.get(taskId);
    expect(task?.status).toBe('failed');
    expect(await dataService.executions.listAll()).toHaveLength(0);
  });

  it('blocks execution when a previously approved approval has expired', async () => {
    const { taskId } = await seed();
    const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    const stale = blocked.approval!;
    await dataService.approvals.save({ ...stale, expiresAt: Date.now() - 1000 });
    await dataService.approvals.resolve(stale.id, 'approved');

    const again = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(again.executed).toBe(false);
    expect(again.blockedReason).toBe('Approval expired');
    const task = await dataService.tasks.get(taskId);
    expect(task?.status).toBe('failed');
  });

  it('invalidates a prior approval when the command changes', async () => {
    const { taskId } = await seed();
    const first = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(first.approval?.commandId).toBe('repo.identity');

    const second = await service.runTaskNow(taskId, { commandId: 'repo.status' });
    expect(second.approval?.commandId).toBe('repo.status');

    const oldApproval = await dataService.approvals.get(first.approval!.id);
    expect(oldApproval?.status).toBe('expired');
  });

  it('rejects a task already in a terminal state', async () => {
    const { taskId } = await seed();
    await dataService.tasks.updateStatus(taskId, 'completed');
    const outcome = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(outcome.executed).toBe(false);
    expect(outcome.blockedReason).toMatch(/Cannot run task in state/);
  });

  it('serialises executions per task (no concurrency for the same task)', async () => {
    const { taskId } = await seed();
    const blocked = await service.runTaskNow(taskId, { commandId: 'repo.identity' });
    await dataService.approvals.resolve(blocked.approval!.id, 'approved');

    const harness = new SafeExecutionHarness();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const original = harness.execute.bind(harness);
    harness.execute = (async (input: { id: string }) => {
      await gate;
      return original(input as never);
    }) as typeof harness.execute;

    const slowService = new ExecutionService({ dataService, harness });
    const running = slowService.runTaskNow(taskId, { commandId: 'repo.identity' });
    // Wait until the first execution has actually moved the task into `running`
    // (avoids a timing race between the async approval/status round-trips).
    const started = Date.now();
    while (Date.now() - started < 5000) {
      const status = (await dataService.tasks.get(taskId))?.status;
      if (status === 'running') break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const second = await slowService.runTaskNow(taskId, { commandId: 'repo.identity' });
    expect(second.executed).toBe(false);
    expect(second.blockedReason).toMatch(/Cannot run task in state/);
    release();
    const outcome = await running;
    expect(outcome.executed).toBe(true);
  });

  it('runs a command that fails syntax check as failed with a non-zero exit', async () => {
    const { taskId } = await seed();
    mkdirSync(join(repoRoot, 'src'), { recursive: true });
    writeFileSync(join(repoRoot, 'src', 'bad.js'), '{{{');

    let blocked = await service.runTaskNow(taskId, {
      commandId: 'node.syntax-check',
      params: { file: 'src/bad.js' },
    });
    if (!blocked.executed) {
      await dataService.approvals.resolve(blocked.approval!.id, 'approved');
      blocked = await service.runTaskNow(taskId, {
        commandId: 'node.syntax-check',
        params: { file: 'src/bad.js' },
      });
    }
    expect(blocked.executed).toBe(true);
    expect(blocked.record?.status).toBe('failed');
    expect(blocked.record?.exitCode).not.toBe(0);
    const updated = await dataService.tasks.get(taskId);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toBeTruthy();
  });
});
