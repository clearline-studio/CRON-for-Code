import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHandoffRequest, isHandoffResult } from '@cron-code/contracts';
import type { HandoffResult } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { createJsonDataService } from './json-store.js';
import { createHandoffHttpServer } from './handoff-server.js';
import type { HandoffHttpServer } from './handoff-server.js';
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
        changedFiles: ['src/thing.ts'],
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
          permission: 'edit',
          target: 'src/thing.ts',
          reason: 'Required to complete your request.',
          patterns: ['src/thing.ts'],
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
        changedFiles: ['src/thing.ts'],
      };
    },
  };
}

let tmp: string;
let repoRoot: string;
let dataService: DataService;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-handoff-http-'));
  repoRoot = join(tmp, 'repo');
  makeGitRepo(repoRoot);
  dataService = createJsonDataService({ storagePath: tmp });
  await dataService.initialize();
});

afterEach(async () => {
  await dataService.destroy().catch(() => undefined);
  rmSync(tmp, { recursive: true, force: true });
});

async function postJson(url: string, body: unknown, token?: string): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: response.status, json: await response.json() };
}

describe('createHandoffHttpServer (live transport)', () => {
  let server: HandoffHttpServer;

  it('serves /health', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: completingAdapter() });
    const url = server.baseUrl + '/health';
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    await server.close();
  });

  it('runs a request over HTTP and returns a real HandoffResult', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: completingAdapter() });
    const request = createHandoffRequest({
      requestId: 'req_http_1',
      repoPath: repoRoot,
      name: 'Bridge Repo',
      task: 'Add a dark mode toggle',
    });

    const { status, json } = await postJson(server.baseUrl + '/run', request);
    expect(status).toBe(200);
    const result = json as HandoffResult;
    expect(isHandoffResult(result)).toBe(true);
    expect(result.requestId).toBe('req_http_1');
    expect(result.status).toBe('completed');
    expect(result.changedFiles).toEqual([{ path: 'src/thing.ts', status: 'modified' }]);
    await server.close();
  });

  it('rejects a request that does not match the handoff contract', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: completingAdapter() });
    const { status } = await postJson(server.baseUrl + '/run', { repoPath: repoRoot, task: 'x' });
    expect(status).toBe(400);
    await server.close();
  });

  it('requires the bearer token when one is configured', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: completingAdapter(), token: 'secret' });
    const request = createHandoffRequest({ requestId: 'r', repoPath: repoRoot, task: 't' });

    const denied = await postJson(server.baseUrl + '/run', request);
    expect(denied.status).toBe(401);

    const allowed = await postJson(server.baseUrl + '/run', request, 'secret');
    expect(allowed.status).toBe(200);
    await server.close();
  });

  it('surfaces an approval over HTTP and completes after a reply', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: permissionAdapter() });
    const request = createHandoffRequest({ requestId: 'req_ap_1', repoPath: repoRoot, task: 'Do the thing' });

    const first = await postJson(server.baseUrl + '/run', request);
    const firstJson = first.json as HandoffResult;
    expect(firstJson.status).toBe('awaiting_approval');
    const approvalId = firstJson.approvals[0]!.id;

    const reply = await postJson(server.baseUrl + '/approval', {
      requestId: 'req_ap_1',
      approvalId,
      decision: 'approve',
    });
    expect(reply.status).toBe(200);
    const replyJson = reply.json as HandoffResult;
    expect(replyJson.status).toBe('completed');
    await server.close();
  });

  it('returns 404 for an unrecognised path', async () => {
    server = await createHandoffHttpServer({ dataService, adapter: completingAdapter() });
    const response = await fetch(server.baseUrl + '/nope');
    expect(response.status).toBe(404);
    await server.close();
  });
});
