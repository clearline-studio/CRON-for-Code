import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { createCodeProject, createTask } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { createJsonDataService } from './json-store.js';
import { OpenCodeRunner, createOpenCodeServerAdapter } from './opencode-runner.js';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(dir, 'README.md'), 'repo\n');
}

interface MockOpenCodeServer {
  server: Server;
  baseUrl: string;
  close(): Promise<void>;
  readonly requests: Array<{ method: string; url: string; body?: unknown }>;
  permissionId: string;
  permissionAsked: Deferred<void>;
  replyReceived: Deferred<{ reply: string; message?: string }>;
}

async function startMockOpenCodeServer(): Promise<MockOpenCodeServer> {
  const requests: MockOpenCodeServer['requests'] = [];
  const permissionId = 'per_mock_1';
  let permissionActive = false;
  let messageDone = false;
  let sessionId = '';
  const permissionAsked = deferred<void>();
  const replyReceived = deferred<{ reply: string; message?: string }>();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const bodyText = await readBody(req).catch(() => '');
    let body: unknown;
    if (bodyText) {
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
    }
    requests.push({ method: req.method ?? '', url: req.url ?? '', body });

    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'POST' && url.pathname === '/session') {
      // NEW server protocol: session create = { title, permission } (no model).
      const parsed = body as { title?: unknown; permission?: unknown; model?: unknown };
      if (typeof parsed?.title !== 'string' || !Array.isArray(parsed?.permission)) {
        return send(400, { _tag: 'BadRequest' });
      }
      if (parsed.model !== undefined) {
        return send(400, { _tag: 'BadRequest' });
      }
      sessionId = 'ses_mock_1';
      return send(200, { id: sessionId, version: '1.18.25' });
    }

    if (req.method === 'POST' && url.pathname === `/session/${sessionId}/message`) {
      const parsed = body as { model?: { providerID?: string; modelID?: string } };
      if (!parsed?.model?.modelID) {
        return send(400, { name: 'BadRequest', data: { message: 'Missing key\n  at ["model"]["modelID"]' } });
      }
      messageDone = false;
      permissionActive = false;
      setTimeout(() => {
        permissionActive = true;
        permissionAsked.resolve();
      }, 30);
      await new Promise<void>((resolve) => {
        const poll = setInterval(() => {
          if (messageDone) { clearInterval(poll); resolve(); }
        }, 25);
        setTimeout(() => { clearInterval(poll); resolve(); }, 30_000);
      });
      send(200, {
        info: {
          id: 'msg_mock_1',
          sessionID: sessionId,
          role: 'assistant',
          finish: 'stop',
          time: { created: Date.now(), completed: Date.now() },
        },
        parts: [{ type: 'text', text: 'Created runtime-test.txt.' }],
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/permission') {
      const items = permissionActive
        ? [{
            id: permissionId,
            sessionID: sessionId,
            permission: 'edit',
            patterns: ['runtime-test.txt'],
            metadata: {
              filepath: `${(url.searchParams.get('directory') ?? '').replace(/\/$/, '')}/runtime-test.txt`,
              diff: 'Index: runtime-test.txt\n+CRON CODE RUNTIME OK',
            },
            tool: { messageID: 'msg_mock_1', callID: 'call_mock_1' },
          }]
        : [];
      return send(200, items);
    }

    if (req.method === 'POST' && url.pathname === `/permission/${permissionId}/reply`) {
      const parsed = body as { reply?: string; message?: string };
      if (!parsed?.reply) return send(400, { error: 'missing reply' });
      permissionActive = false;
      messageDone = true;
      replyReceived.resolve({ reply: parsed.reply, message: parsed.message });
      return send(200, true);
    }

    if (req.method === 'GET' && url.pathname === `/session/${sessionId}/diff`) {
      return send(200, []);
    }

    if (req.method === 'GET' && url.pathname === '/global/health') {
      return send(200, { healthy: true, version: '1.18.16' });
    }

    return send(404, { error: 'not found', path: url.pathname });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    permissionId,
    permissionAsked,
    replyReceived,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

let tmp: string;
let repoRoot: string;
let dataService: DataService;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-opencode-server-'));
  repoRoot = join(tmp, 'repo');
  makeGitRepo(repoRoot);
  dataService = createJsonDataService({ storagePath: tmp });
  await dataService.initialize();
});

afterEach(async () => {
  await dataService.destroy().catch(() => undefined);
  rmSync(tmp, { recursive: true, force: true });
});

async function seed(): Promise<string> {
  const project = createCodeProject('proj_1', 'Repo', repoRoot);
  await dataService.projects.save(project);
  const task = createTask('task_1', project.id, 'OpenCode handoff', 'Create runtime-test.txt');
  await dataService.tasks.save(task);
  return task.id;
}

describe('OpenCode server adapter (verified installed API)', () => {
  it('creates the session, streams the message, surfaces the permission, and resumes the same session after approval', { timeout: 30000 }, async () => {
    const mock = await startMockOpenCodeServer();
    try {
      const taskId = await seed();
      const adapter = createOpenCodeServerAdapter('opencode-test', { baseUrl: mock.baseUrl });
      const runner = new OpenCodeRunner({ dataService, adapter });

      const first = await runner.runTask({ taskId });
      await Promise.race([mock.permissionAsked.promise, new Promise((_, rej) => setTimeout(() => rej(new Error('no permission asked')), 5000))]);

      expect(first.status).toBe('awaiting_approval');
      expect(first.approval?.sessionId).toBe('ses_mock_1');
      expect(first.approval?.permissionId).toBe('per_mock_1');
      expect(first.approval?.messageId).toBe('msg_mock_1');
      expect(first.approval?.callId).toBe('call_mock_1');
      expect(first.approval?.permission).toBe('edit');
      expect(first.approval?.target).toMatch(/runtime-test\.txt$/);

      const sessionPost = mock.requests.find((r) => r.method === 'POST' && r.url.startsWith('/session?'));
      const messagePost = mock.requests.find((r) => r.method === 'POST' && r.url.includes('/message?'));
      const permissionGet = mock.requests.find((r) => r.method === 'GET' && r.url.startsWith('/permission?'));
      expect(sessionPost?.body).toMatchObject({
        title: expect.any(String),
        permission: expect.arrayContaining([
          { permission: 'read', pattern: '*', action: 'allow' },
          { permission: 'edit', pattern: '*', action: 'ask' },
          { permission: 'bash', pattern: '*', action: 'ask' },
        ]),
      });
      expect(messagePost?.body).toMatchObject({ model: { providerID: 'opencode-go', modelID: 'deepseek-v4-flash-vision-exp' } });
      expect(permissionGet?.url).toContain('directory=');

      const reply = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'approve' });
      const { reply: replyValue } = await Promise.race([mock.replyReceived.promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no reply sent')), 5000))]);

      expect(replyValue).toBe('once');
      expect(reply.status).toBe('completed');
      expect(reply.executionId).toBe(first.executionId);

      const executions = await dataService.executions.listAll();
      expect(executions).toHaveLength(1);
      expect(executions[0].id).toBe(first.executionId);
      expect(executions[0].status).toBe('completed');
      expect(executions[0].output.stdout).toContain('Changed:');
      expect(executions[0].output.stdout).toContain('runtime-test.txt');
      expect((await dataService.tasks.get(taskId))?.status).toBe('completed');

      const replyPost = mock.requests.find((r) => r.method === 'POST' && r.url.includes('/permission/per_mock_1/reply'));
      expect(replyPost?.url).toContain('directory=');
      expect(replyPost?.body).toEqual({ reply: 'once', message: undefined });
    } finally {
      await mock.close();
    }
  });

  it('rejects the exact permission request and never completes', { timeout: 30000 }, async () => {
    const mock = await startMockOpenCodeServer();
    try {
      const taskId = await seed();
      const adapter = createOpenCodeServerAdapter('opencode-test', { baseUrl: mock.baseUrl });
      const runner = new OpenCodeRunner({ dataService, adapter });

      const first = await runner.runTask({ taskId });
      await Promise.race([mock.permissionAsked.promise, new Promise((_, rej) => setTimeout(() => rej(new Error('no permission asked')), 5000))]);

      const reply = await runner.replyToApproval({ taskId, approvalId: first.approval!.approvalId, decision: 'reject', reason: 'Not needed' });
      const { reply: replyValue } = await Promise.race([mock.replyReceived.promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no reply sent')), 5000))]);

      expect(replyValue).toBe('reject');
      expect(reply.status).toBe('cancelled');
      expect(reply.executionId).toBe(first.executionId);
      const executions = await dataService.executions.listAll();
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('cancelled');
      expect(executions[0].error?.code).toBe('APPROVAL_REJECTED');
      expect((await dataService.tasks.get(taskId))?.status).toBe('cancelled');
      expect((await dataService.approvals.get(first.approval!.approvalId))?.status).toBe('rejected');
    } finally {
      await mock.close();
    }
  });

  it('emits plain-English heartbeat events while a long message streams (no silent gap, no artificial slow-down)', { timeout: 30000 }, async () => {
    const events: Array<{ status: string; message: string; timestamp: number }> = [];
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const send = (status: number, payload: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      if (req.method === 'POST' && url.pathname === '/session') return send(200, { id: 'ses_beat_1' });
      if (req.method === 'GET' && url.pathname === '/permission') return send(200, []);
      if (req.method === 'GET' && url.pathname === '/global/health') return send(200, { healthy: true });
      if (req.method === 'GET' && url.pathname === '/session/ses_beat_1/diff') return send(200, []);
      if (req.method === 'POST' && url.pathname === '/session/ses_beat_1/message') {
        await new Promise((resolve) => setTimeout(resolve, 4600));
        return send(200, {
          info: { id: 'msg_beat_1', sessionID: 'ses_beat_1', role: 'assistant', finish: 'stop' },
          parts: [{ type: 'text', text: 'Created runtime-test.txt.' }],
        });
      }
      return send(404, { error: 'not found' });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const taskId = await seed();
      const adapter = createOpenCodeServerAdapter('opencode-test', { baseUrl });
      const runner = new OpenCodeRunner({ dataService, adapter, onEvent: (event) => events.push({ status: event.status, message: event.message, timestamp: event.timestamp }) });
      const result = await runner.runTask({ taskId });
      expect(result.status).toBe('completed');
      const heartbeats = events.filter((event) => event.status === 'running' && /^OpenCode is /.test(event.message));
      expect(heartbeats.length).toBeGreaterThan(0);
      // Heartbeats carry plain-English progress, never internal IDs.
      for (const heartbeat of heartbeats) {
        expect(heartbeat.message).not.toMatch(/ses_|per_|exe_|msg_|call_/);
      }
      // First heartbeat only after ~4s of streaming: the backend is never slowed.
      expect(heartbeats[0].timestamp - result.events[0].timestamp).toBeGreaterThanOrEqual(3500);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
