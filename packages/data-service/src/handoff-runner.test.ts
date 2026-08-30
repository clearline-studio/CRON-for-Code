import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHandoffRequest } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { createJsonDataService } from './json-store.js';
import { HandoffRunner } from './handoff-runner.js';
import type { OpenCodeRunnerAdapter } from './opencode-runner.js';

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(dir, 'README.md'), 'repo\n');
}

function completingAdapter(): OpenCodeRunnerAdapter {
  return {
    interfaceKind: 'test',
    executable: 'opencode-test',
    async run(input, onEvent) {
      onEvent({
        taskId: input.task.id,
        status: 'running',
        message: `using ${input.model}`,
        model: input.model,
        runner: 'opencode',
      });
      return {
        exitCode: 0,
        stdout: 'done',
        stderr: '',
        summary: 'OpenCode completed the task',
        changedFiles: ['src/toggle.ts', 'src/toggle.test.ts'],
      };
    },
  };
}

function permissionAdapter(): OpenCodeRunnerAdapter {
  return {
    interfaceKind: 'test',
    executable: 'opencode-test',
    async run() {
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
        summary: 'OpenCode needs approval',
        approval: {
          sessionId: 'sess_1',
          permissionId: 'perm_1',
          messageId: 'msg_1',
          callId: 'call_1',
          permission: 'bash',
          target: 'npm install',
          reason: 'Required to complete your request.',
          patterns: ['npm install'],
        },
      };
    },
    async replyToPermission(input, onEvent) {
      onEvent({
        taskId: input.taskId,
        status: input.decision === 'approve' ? 'running' : 'cancelled',
        message: `permission ${input.permissionId} answered`,
        model: 'opencode-go/deepseek-v4-flash-vision-exp',
        runner: 'opencode',
      });
      return {
        exitCode: 0,
        stdout: 'session continued and completed',
        stderr: '',
        summary: 'OpenCode server session completed',
        changedFiles: ['runtime-result.txt'],
      };
    },
  };
}

let tmp: string;
let repoRoot: string;
let dataService: DataService;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-handoff-'));
  repoRoot = join(tmp, 'repo');
  makeGitRepo(repoRoot);
  dataService = createJsonDataService({ storagePath: tmp });
  await dataService.initialize();
});

afterEach(async () => {
  await dataService.destroy().catch(() => undefined);
  rmSync(tmp, { recursive: true, force: true });
});

function makeRequest(task = 'Add a dark mode toggle') {
  return createHandoffRequest({
    requestId: 'req_1',
    repoPath: repoRoot,
    name: 'Bridge Repo',
    task,
  });
}

describe('HandoffRunner', () => {
  it('runs a handoff request through the governor and returns a mapped result', async () => {
    const runner = new HandoffRunner({ dataService, adapter: completingAdapter() });
    const result = await runner.run(makeRequest());

    expect(result.requestId).toBe('req_1');
    expect(result.status).toBe('completed');
    expect(result.summary).toBe('OpenCode completed the task');
    // Changed files surfaced directly (not parsed from stdout).
    expect(result.changedFiles).toHaveLength(2);
    expect(result.changedFiles[0]).toMatchObject({ path: 'src/toggle.ts', status: 'modified' });
    // Evidence includes one diff per changed file plus the summary output.
    expect(result.evidence.length).toBeGreaterThanOrEqual(3);
    expect(result.approvals).toEqual([]);
    expect(result.completedAt).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('creates a project keyed to the repo path and reuses it across runs', async () => {
    const runner = new HandoffRunner({ dataService, adapter: completingAdapter() });
    await runner.run(makeRequest('task one'));
    const created = await dataService.projects.list();
    expect(created).toHaveLength(1);

    await runner.run(makeRequest('task two'));
    const afterSecond = await dataService.projects.list();
    expect(afterSecond).toHaveLength(1);
  });

  it('surfaces a pending approval as a handoff approval + maps a reply to the resumed result', async () => {
    const runner = new HandoffRunner({ dataService, adapter: permissionAdapter() });
    const result = await runner.run(makeRequest());

    expect(result.status).toBe('awaiting_approval');
    expect(result.approvals).toHaveLength(1);
    const approval = result.approvals[0]!;
    expect(approval.action).toBe('execute');
    expect(approval.target).toBe('npm install');
    expect(approval.id).toBeTruthy();

    const reply = await runner.replyToApproval({
      requestId: 'req_1',
      approvalId: approval.id,
      decision: 'approve',
    });
    expect(reply.status).toBe('completed');
    expect(reply.changedFiles).toContainEqual({ path: 'runtime-result.txt', status: 'modified' });
  });

  it('returns a failed result when the runner has no usable adapter', async () => {
    const runner = new HandoffRunner({ dataService, adapter: null });
    const result = await runner.run(makeRequest());
    expect(result.status).toBe('blocked');
    expect(result.blocker).toBeTruthy();
  });
});
