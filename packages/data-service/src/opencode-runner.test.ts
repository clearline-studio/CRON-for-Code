import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCodeProject, createTask } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { createJsonDataService } from './json-store.js';
import { FORBIDDEN_EXECUTABLES, buildCommandCatalogue } from './command-catalogue.js';
import { OpenCodeRunner } from './opencode-runner.js';
import type { OpenCodeRunnerAdapter, OpenCodeRunnerAdapterResult } from './opencode-runner.js';

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(dir, 'README.md'), 'repo\n');
}

function completingAdapter(summary = 'OpenCode completed'): OpenCodeRunnerAdapter {
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
      return { exitCode: 0, stdout: 'changed files: none', stderr: '', summary };
    },
  };
}

function permissionAdapter(options: {
  permissionId?: string;
  sessionId?: string;
  target?: string;
  approveResult?: OpenCodeRunnerAdapterResult;
  rejectResult?: OpenCodeRunnerAdapterResult;
}): OpenCodeRunnerAdapter {
  const permissionId = options.permissionId ?? 'perm_1';
  const sessionId = options.sessionId ?? 'sess_1';
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
          sessionId,
          permissionId,
          messageId: 'msg_1',
          callId: 'call_1',
          permission: 'edit',
          target: options.target ?? 'runtime-test.txt',
          reason: 'Required to complete your request.',
          patterns: [options.target ?? 'runtime-test.txt'],
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
      if (input.decision === 'reject') {
        return options.rejectResult ?? { exitCode: 1, stdout: '', stderr: 'OpenCode permission rejected', summary: 'OpenCode permission rejected' };
      }
      return options.approveResult ?? {
        exitCode: 0,
        stdout: 'session continued and completed',
        stderr: '',
        summary: 'OpenCode server session completed',
        changedFiles: ['runtime-test.txt'],
      };
    },
  };
}

let tmp: string;
let repoRoot: string;
let dataService: DataService;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-opencode-'));
  repoRoot = join(tmp, 'repo');
  makeGitRepo(repoRoot);
  dataService = createJsonDataService({ storagePath: tmp });
  await dataService.initialize();
});

afterEach(async () => {
  await dataService.destroy().catch(() => undefined);
  rmSync(tmp, { recursive: true, force: true });
});

async function seed(status: 'draft' | 'completed' = 'draft'): Promise<string> {
  const project = createCodeProject('proj_1', 'Repo', repoRoot);
  await dataService.projects.save(project);
  const task = { ...createTask('task_1', project.id, 'OpenCode handoff', 'Implement the thing'), status };
  await dataService.tasks.save(task);
  return task.id;
}

describe('OpenCodeRunner', () => {
  it('runs a valid governed task through the injected runner and completes the task', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: completingAdapter() });
    const result = await runner.runTask({ taskId });
    expect(result.status).toBe('completed');
    expect(result.model).toBe('opencode-go/deepseek-v4-flash-vision-exp');
    expect(result.runnerInterface).toBe('test');
    expect((await dataService.tasks.get(taskId))?.status).toBe('completed');
    expect((await dataService.executions.listAll())[0].commandId).toBe('opencode.runner');
  });

  it('blocks invalid repo/project context before runner start', async () => {
    const project = createCodeProject('proj_1', 'Not repo', join(tmp, 'not-repo'));
    mkdirSync(project.rootPath, { recursive: true });
    await dataService.projects.save(project);
    await dataService.tasks.save(createTask('task_1', project.id, 'OpenCode handoff', 'x'));
    const runner = new OpenCodeRunner({ dataService, adapter: completingAdapter() });
    const result = await runner.runTask({ taskId: 'task_1' });
    expect(result.status).toBe('blocked');
    expect(result.blocker).toMatch(/not a Git repository/i);
    expect((await dataService.tasks.get('task_1'))?.status).toBe('blocked');
  });

  it('blocks disallowed task states', async () => {
    const taskId = await seed('completed');
    const runner = new OpenCodeRunner({ dataService, adapter: completingAdapter() });
    const result = await runner.runTask({ taskId });
    expect(result.status).toBe('blocked');
    expect(result.blocker).toContain('Cannot run OpenCode task in state completed');
  });

  it('emits runner status transitions in a valid order', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: completingAdapter() });
    const result = await runner.runTask({ taskId });
    expect(result.events.map((event) => event.status)).toEqual([
      'queued',
      'validating',
      'starting',
      'running',
      'running',
      'verifying',
      'completed',
    ]);
  });

  it('captures failed runner execution as structured failure state', async () => {
    const taskId = await seed();
    const failing: OpenCodeRunnerAdapter = {
      interfaceKind: 'test',
      executable: 'opencode-test',
      async run() {
        return { exitCode: 1, stdout: '', stderr: 'runner failed' };
      },
    };
    const result = await new OpenCodeRunner({ dataService, adapter: failing }).runTask({ taskId });
    expect(result.status).toBe('failed');
    expect(result.record?.error?.message).toContain('runner failed');
    expect((await dataService.tasks.get(taskId))?.status).toBe('failed');
  });

  it('never marks permission auto-rejection or a rejected CLI permission as completed', async () => {
    const taskId = await seed();
    const permissionBlocked: OpenCodeRunnerAdapter = {
      interfaceKind: 'test',
      executable: 'opencode-test',
      async run() {
        return {
          exitCode: 0,
          stdout: [
            'permission requested: edit (runtime-test.txt); auto-rejecting',
            'Write runtime-test.txt failed',
            'The user rejected permission to use this specific tool call.',
          ].join('\n'),
          stderr: '',
        };
      },
    };

    const result = await new OpenCodeRunner({ dataService, adapter: permissionBlocked }).runTask({ taskId });

    expect(result.status).toBe('failed');
    expect(result.record?.error?.code).toBe('APPROVAL_REJECTED');
    expect(result.record?.error?.message).toMatch(/without a resumable session/);
    expect((await dataService.tasks.get(taskId))?.status).toBe('failed');
    expect(await dataService.approvals.list(taskId)).toHaveLength(0);
  });

  it('does not mark failed write output as completed when OpenCode exits zero', async () => {
    const taskId = await seed();
    const failedWrite: OpenCodeRunnerAdapter = {
      interfaceKind: 'test',
      executable: 'opencode-test',
      async run() {
        return {
          exitCode: 0,
          stdout: 'Write runtime-test.txt failed',
          stderr: '',
          summary: 'Write runtime-test.txt failed',
        };
      },
    };

    const result = await new OpenCodeRunner({ dataService, adapter: failedWrite }).runTask({ taskId });

    expect(result.status).toBe('failed');
    expect(result.record?.status).toBe('failed');
    expect(result.record?.error?.message).toContain('Write runtime-test.txt failed');
    expect((await dataService.tasks.get(taskId))?.status).toBe('failed');
  });

  it('blocks when no OpenCode interface is available instead of faking execution', async () => {
    const taskId = await seed();
    const result = await new OpenCodeRunner({ dataService, adapter: null }).runTask({ taskId });
    expect(result.status).toBe('blocked');
    expect(result.blocker).toContain('OpenCode execution interface is not available');
  });

  it('uses the vision Flash by default (OpenCode gateway) and never silently selects V4 Pro', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: completingAdapter() });
    expect((await runner.runTask({ taskId })).model).toBe('opencode-go/deepseek-v4-flash-vision-exp');
    const pro = await runner.runTask({ taskId, model: 'deepseek/deepseek-v4-pro' });
    expect(pro.status).toBe('blocked');
    expect(pro.blocker).toContain('explicit escalation approval');
  });

  it('falls back to DeepSeek V4 Flash when the vision model cannot launch (one retry, honest trail)', async () => {
    const taskId = await seed();
    const base = completingAdapter();
    let calls = 0;
    const flaky: typeof base = {
      executable: base.executable,
      interfaceKind: base.interfaceKind,
      async run(input, onEvent) {
        calls += 1;
        if (calls === 1) {
          throw new Error('LAUNCH_FAILED: model not found: opencode-go/deepseek-v4-flash-vision-exp');
        }
        return base.run(input, onEvent);
      },
      async replyToPermission(input, onEvent) {
        return base.replyToPermission!(input, onEvent);
      },
    };
    const runner = new OpenCodeRunner({ dataService, adapter: flaky });
    const result = await runner.runTask({ taskId });
    expect(result.status).toBe('completed');
    expect(result.model).toBe('opencode-go/deepseek-v4-flash');
    // The fallback event is visible on the trail.
    expect(result.events.some((event) => /fallback/i.test(event.message))).toBe(true);
    // Both attempts are recorded honestly; no duplicate approval records.
    const executions = (await dataService.executions.listAll()).sort((a, b) => a.startedAt - b.startedAt);
    expect(executions).toHaveLength(2);
    expect(executions[0]?.status).toBe('failed');
    expect(executions[1]?.status).toBe('completed');
  });

  it('does not add an unrestricted shell path or broaden the safe catalogue', () => {
    expect(FORBIDDEN_EXECUTABLES).toEqual(expect.arrayContaining(['cmd', 'powershell', 'bash']));
    expect(buildCommandCatalogue().some((entry) => entry.id === 'opencode.runner')).toBe(false);
  });

  it('falls back when the primary model STALLS silently (never throws) instead of spinning forever', async () => {
    const taskId = await seed();
    const base = completingAdapter();
    let calls = 0;
    const hanging: typeof base = {
      executable: base.executable,
      interfaceKind: base.interfaceKind,
      async run(input, onEvent) {
        calls += 1;
        if (calls === 1) {
          onEvent({ taskId: input.task.id, status: 'running', message: 'session created but gateway is wedged', model: input.model, runner: 'opencode' });
          // Never settles: simulates a hung gateway long-poll.
          await new Promise(() => {});
        }
        return base.run(input, onEvent);
      },
      async replyToPermission(input, onEvent) {
        return base.replyToPermission!(input, onEvent);
      },
    };
    const runner = new OpenCodeRunner({ dataService, adapter: hanging, stallTimeoutMs: 300 });
    const result = await runner.runTask({ taskId });
    // The stall on the primary must classify as a launch failure and retry the fallback.
    expect(result.status).toBe('completed');
    expect(result.model).toBe('opencode-go/deepseek-v4-flash');
    // The stall event surfaces on the honest trail.
    expect(result.events.some((event) => /fallback/i.test(event.message))).toBe(true);
    // Two attempts recorded: first stalled (failed), second completed.
    const executions = (await dataService.executions.listAll()).sort((a, b) => a.startedAt - b.startedAt);
    expect(executions).toHaveLength(2);
    expect(executions[0]?.status).toBe('failed');
    expect(executions[1]?.status).toBe('completed');
  });

  it('streams runner events to the onEvent subscription as they occur (incremental UI activity)', async () => {
    const taskId = await seed();
    const received: Array<{ status: string; timestamp: number }> = [];
    const runner = new OpenCodeRunner({
      dataService,
      adapter: completingAdapter('OpenCode completed'),
      onEvent: (event) => received.push({ status: event.status, timestamp: event.timestamp }),
    });
    await runner.runTask({ taskId });
    expect(received.length).toBeGreaterThan(1);
    expect(received.some((event) => event.status === 'queued')).toBe(true);
    expect(received.some((event) => event.status === 'running')).toBe(true);
    expect(received.some((event) => event.status === 'completed')).toBe(true);
    // Timestamps must be monotonic: events publish as they happen, not in a bulk flush.
    for (let index = 1; index < received.length; index += 1) {
      expect(received[index].timestamp).toBeGreaterThanOrEqual(received[index - 1].timestamp);
    }
  });

  it('preserves executionId, sessionID, and permissionID correlation on the pending approval', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: permissionAdapter({}) });
    const result = await runner.runTask({ taskId });
    expect(result.status).toBe('awaiting_approval');
    expect(result.executionId).toBeTruthy();
    expect(result.approval).toMatchObject({
      sessionId: 'sess_1',
      permissionId: 'perm_1',
      messageId: 'msg_1',
      callId: 'call_1',
      target: 'runtime-test.txt',
    });
    // The live awaiting event carries the structured approval so the UI can
    // render Approve/Reject inline while the task is still running.
    const awaiting = result.events.find((event) => event.status === 'awaiting_approval');
    expect(awaiting?.approval).toMatchObject({
      approvalId: result.approval!.approvalId,
      sessionId: 'sess_1',
      permissionId: 'perm_1',
    });
    const stored = await dataService.approvals.get(result.approval!.approvalId);
    expect(stored).toMatchObject({
      taskId,
      executionId: result.executionId,
      openCodeSessionId: 'sess_1',
      openCodePermissionId: 'perm_1',
      openCodeMessageId: 'msg_1',
      openCodeCallId: 'call_1',
    });
  });

  it('approve resumes the same execution and never creates a duplicate record or task', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: permissionAdapter({}) });
    const first = await runner.runTask({ taskId });
    expect(first.status).toBe('awaiting_approval');

    const reply = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'approve' });
    expect(reply.status).toBe('completed');
    expect(reply.executionId).toBe(first.executionId);

    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].id).toBe(first.executionId);
    expect(executions[0].status).toBe('completed');
    expect(executions[0].approvalId).toBe(first.approval!.approvalId);
    expect((await dataService.tasks.get(taskId))?.status).toBe('completed');
  });

  it('reject resolves the exact session/request, keeps the same execution, and never reports completed', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: permissionAdapter({}) });
    const first = await runner.runTask({ taskId });

    const reply = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'reject', reason: 'Not needed' });
    expect(reply.status).toBe('cancelled');
    expect(reply.executionId).toBe(first.executionId);

    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].id).toBe(first.executionId);
    expect(executions[0].status).toBe('cancelled');
    expect(executions[0].error?.code).toBe('APPROVAL_REJECTED');
    expect((await dataService.tasks.get(taskId))?.status).toBe('cancelled');
    expect((await dataService.approvals.get(first.approval!.approvalId))?.status).toBe('rejected');
  });

  it('maps session diff evidence back to the correct execution record after approval', async () => {
    const taskId = await seed();
    const runner = new OpenCodeRunner({ dataService, adapter: permissionAdapter({}) });
    const first = await runner.runTask({ taskId });
    await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'approve' });

    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].output.stdout).toContain('Changed: runtime-test.txt');
    expect(executions[0].status).toBe('completed');
  });

  it('a follow-up permission after approval stays on the same session and execution', async () => {
    const taskId = await seed();
    const adapter = permissionAdapter({
      approveResult: {
        exitCode: 0,
        stdout: '',
        stderr: '',
        summary: 'OpenCode needs another approval',
        approval: {
          sessionId: 'sess_1',
          permissionId: 'perm_2',
          messageId: 'msg_2',
          callId: 'call_2',
          permission: 'write',
          target: 'runtime-test.txt',
          reason: 'Required to complete your request.',
          patterns: ['runtime-test.txt'],
        },
      },
    });
    const runner = new OpenCodeRunner({ dataService, adapter });
    const first = await runner.runTask({ taskId });

    const reply = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'approve' });
    expect(reply.status).toBe('awaiting_approval');
    expect(reply.approval?.approvalId).not.toBe(first.approval!.approvalId);
    expect(reply.approval?.sessionId).toBe('sess_1');
    expect(reply.approval?.permissionId).toBe('perm_2');
    expect(reply.executionId).toBe(first.executionId);

    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].id).toBe(first.executionId);
    expect(executions[0].status).toBe('blocked');
    expect(executions[0].error?.code).toBe('APPROVAL_REQUIRED');

    const followUp = await dataService.approvals.get(reply.approval!.approvalId);
    expect(followUp?.executionId).toBe(first.executionId);
    expect(followUp?.openCodeSessionId).toBe('sess_1');
    expect(followUp?.openCodePermissionId).toBe('perm_2');
    expect((await dataService.tasks.get(taskId))?.status).toBe('approval_required');
  });

  it('approving the follow-up finishes the same execution as completed', { timeout: 30000 }, async () => {
    const taskId = await seed();
    let followUpNeeded = true;
    const adapter: OpenCodeRunnerAdapter = {
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
            permission: 'edit',
            target: 'runtime-test.txt',
            reason: 'Required to complete your request.',
            patterns: ['runtime-test.txt'],
          },
        };
      },
      async replyToPermission(input) {
        if (followUpNeeded && input.decision === 'approve' && input.permissionId === 'perm_1') {
          followUpNeeded = false;
          return {
            exitCode: 0,
            stdout: '',
            stderr: '',
            summary: 'OpenCode needs another approval',
            approval: {
              sessionId: 'sess_1',
              permissionId: 'perm_2',
              messageId: 'msg_2',
              callId: 'call_2',
              permission: 'write',
              target: 'runtime-test.txt',
              reason: 'Required to complete your request.',
              patterns: ['runtime-test.txt'],
            },
          };
        }
        return {
          exitCode: 0,
          stdout: 'session continued and completed',
          stderr: '',
          summary: 'OpenCode server session completed',
          changedFiles: ['runtime-test.txt'],
        };
      },
    };
    const runner = new OpenCodeRunner({ dataService, adapter });
    const first = await runner.runTask({ taskId });
    const second = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'approve' });
    const third = await runner.replyToApproval({ taskId, approvalId: second.approval!.approvalId, decision: 'approve' });

    expect(third.status).toBe('completed');
    expect(third.executionId).toBe(first.executionId);
    const executions = await dataService.executions.listAll();
    expect(executions).toHaveLength(1);
    expect(executions[0].id).toBe(first.executionId);
    expect(executions[0].status).toBe('completed');
    expect((await dataService.tasks.get(taskId))?.status).toBe('completed');
  });
});
