import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { Agent, fetch as undiciFetch } from 'undici';
import {
  createAuditRecord,
  createApproval,
  createExecutionError,
  createExecutionOutput,
  createExecutionRecord,
} from '@cron-code/contracts';
import type { Approval, AuditRecord, CodeProject, ExecutionErrorCode, ExecutionRecord, Task } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { assertPathInsideProject, resolveProjectRoot, toExecutionError } from './project-boundary.js';

export type OpenCodeRunStatus =
  | 'queued'
  | 'validating'
  | 'awaiting_approval'
  | 'starting'
  | 'running'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface OpenCodeRunEvent {
  readonly taskId: string;
  readonly status: OpenCodeRunStatus;
  readonly message: string;
  readonly timestamp: number;
  readonly model: string;
  readonly runner: 'opencode';
  /** Present on awaiting_approval events so the UI can render Approve/Reject inline. */
  readonly approval?: OpenCodePermissionRequest | null;
}

export interface OpenCodeRunInput {
  readonly taskId: string;
  readonly model?: string;
  readonly conversationContext?: readonly { role: 'user' | 'assistant'; content: string }[];
}

export interface OpenCodeRunnerAdapterInput {
  readonly task: Task;
  readonly project: CodeProject;
  readonly repoPath: string;
  readonly request: string;
  readonly model: string;
  readonly conversationContext: readonly { role: 'user' | 'assistant'; content: string }[];
}

export interface OpenCodeRunnerAdapterResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly summary?: string;
  readonly approval?: Omit<OpenCodePermissionRequest, 'approvalId'> | null;
  readonly changedFiles?: readonly string[];
}

export interface OpenCodePermissionRequest {
  readonly approvalId: string;
  readonly sessionId: string | null;
  readonly permissionId: string | null;
  readonly messageId: string | null;
  readonly callId: string | null;
  readonly permission: string;
  readonly target: string | null;
  readonly reason: string;
  readonly patterns: readonly string[];
}

export interface OpenCodeApprovalReplyInput {
  readonly approvalId: string;
  readonly taskId: string;
  readonly decision: 'approve' | 'reject';
  readonly reason?: string;
}

export interface OpenCodeRunnerAdapter {
  readonly interfaceKind: 'cli' | 'headless' | 'test';
  readonly executable: string;
  run(input: OpenCodeRunnerAdapterInput, onEvent: (event: Omit<OpenCodeRunEvent, 'timestamp'>) => void): Promise<OpenCodeRunnerAdapterResult>;
  replyToPermission?(
    input: OpenCodeApprovalReplyInput & {
      readonly sessionId: string;
      readonly permissionId: string;
    },
    onEvent: (event: Omit<OpenCodeRunEvent, 'timestamp'>) => void,
  ): Promise<OpenCodeRunnerAdapterResult>;
}

export interface OpenCodeRunResult {
  readonly taskId: string;
  readonly status: OpenCodeRunStatus;
  readonly model: string;
  readonly runner: 'opencode';
  readonly runnerInterface: 'cli' | 'headless' | 'test' | 'unavailable';
  readonly events: readonly OpenCodeRunEvent[];
  readonly summary: string;
  readonly blocker: string | null;
  readonly executionId: string | null;
  readonly record: ExecutionRecord | null;
  readonly approval: OpenCodePermissionRequest | null;
  /** Files the run created/modified/deleted. Populated when the adapter reports them. */
  readonly changedFiles: readonly string[];
}

export interface OpenCodeApprovalReplyResult extends OpenCodeRunResult {
  readonly approvalId: string;
  readonly decision: 'approve' | 'reject';
}

export interface OpenCodeRunnerOptions {
  readonly dataService: DataService;
  readonly adapter?: OpenCodeRunnerAdapter | null;
  readonly defaultModel?: string;
  /** Model used only if the primary model fails to launch (session-level). */
  readonly fallbackModel?: string;
  readonly escalationModel?: string;
  /** Streams runner events as they occur (used for live/incremental UI activity). */
  readonly onEvent?: (event: OpenCodeRunEvent) => void;
  /**
   * Wall-clock window the PRIMARY model attempt must settle within (completion or
   * a permission request), else it is treated as a launch failure and retried with
   * the fallback. Fixes the case where a wedged gateway keeps pinging heartbeats
   * (which are not progress) and would otherwise spin to the 60-min ceiling. The
   * known-good fallback attempt is not deadline-bound. Default 120s.
   */
  readonly stallTimeoutMs?: number;
}

const DEFAULT_CODING_MODEL = 'opencode-go/deepseek-v4-flash-vision-exp';
// NOTE: the fallback MUST be a gateway model id — deepseek/deepseek-v4-flash is
// not a real DeepSeek-API model (400) and the gateway's providerID is opencode-go.
const DEFAULT_FALLBACK_MODEL = 'opencode-go/deepseek-v4-flash';
const DEFAULT_ESCALATION_MODEL = 'deepseek/deepseek-v4-pro';

// Default deadline window for the PRIMARY model attempt. Generous enough that a
// slow-but-alive run settles, but short enough that a wedged gateway (which keeps
// pinging heartbeats) falls back instead of spinning to the 60-min ceiling.
const DEFAULT_STALL_TIMEOUT_MS = 120_000;
// Sentinel marking an attempt that stalled (produced no progress then went quiet)
// as a LAUNCH failure, so the fallback retry fires. Distinguished from a legit
// wait-timeout, which means "the session ran but was just slow" and must NOT fall back.
const LAUNCH_STALL_ERROR = 'OpenCode stalled: no progress';

// Governed session policy sent with every CRON session. Reads are allowed so
// the agent can survey the project; any file edit or shell command ASKS — the
// server exposes the pending permission, CRON surfaces it as an approval to
// the user, and the session resumes only after the user decides.
const GOVERNED_PERMISSION_POLICY: ReadonlyArray<{ permission: string; pattern: string; action: string }> = [
  { permission: 'read', pattern: '*', action: 'allow' },
  { permission: 'edit', pattern: '*', action: 'ask' },
  { permission: 'bash', pattern: '*', action: 'ask' },
];

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function discoverOpenCodeCli(): OpenCodeRunnerAdapter | null {
  for (const executable of openCodeExecutableCandidates()) {
    const probe = spawnSync(executable, ['--version'], { shell: false, windowsHide: true, encoding: 'utf-8' });
    if (!probe.error && probe.status === 0) {
      return process.env.CRON_OPENCODE_FORCE_CLI === '1'
        ? createOpenCodeCliAdapter(executable)
        : createOpenCodeServerAdapter(executable);
    }
  }
  return null;
}

function openCodeExecutableCandidates(): string[] {
  // Prefer the REAL exe (no cmd wrapper, no shell) — the .cmd is a PS wrapper
  // that spawns the same exe; with the new dist the wrapper path proved flaky.
  const candidates: string[] = ['opencode'];
  const appData = process.env.APPDATA;
  if (appData) {
    candidates.unshift(path.join(appData, 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode.exe'));
    candidates.unshift(path.join(appData, 'npm', 'opencode.cmd'));
  }
  return candidates.filter((candidate) => candidate === 'opencode' || existsSync(candidate));
}

interface OpenCodeServerSession {
  readonly sessionId: string;
  readonly messageId: string;
  readonly taskId: string;
  readonly model: string;
  readonly repoPath: string;
  readonly permissionFilepath: string | null;
  readonly messagePromise: Promise<OpenCodeRunnerAdapterResult>;
}

function openCodeServerAuthHeaders(): Record<string, string> {
  // Prefer an explicitly configured credential; otherwise use the per-run
  // password the runner generates when IT spawns the server (see ensureServer).
  const password = generatedServerPassword ?? process.env.OPENCODE_SERVER_PASSWORD;
  if (!password) return {};
  const username = generatedServerUsername ?? process.env.OPENCODE_SERVER_USERNAME ?? 'opencode';
  return { authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
}

// Vars set by the running adapter's ensureServer so requests carry the same
// credential the spawned server was started with (1.18.25 serves require auth;
// without it every request 401s).
let generatedServerPassword: string | null = null;
let generatedServerUsername: string | null = null;

export interface OpenCodeServerAdapterOptions {
  /** Pre-provisioned OpenCode server base URL (skips spawning and health wait). */
  readonly baseUrl?: string;
}

export function createOpenCodeServerAdapter(executable: string, options: OpenCodeServerAdapterOptions = {}): OpenCodeRunnerAdapter {
  let server: { baseUrl: string; process: ChildProcess } | null = options.baseUrl
    ? { baseUrl: options.baseUrl, process: null as unknown as ChildProcess }
    : null;
  const sessions = new Map<string, OpenCodeServerSession>();

  async function ensureServer(cwd: string): Promise<string> {
    if (server) return server.baseUrl;
    const port = await findOpenPort();
    // Credentials: prefer the environment's (the app can inherit them from its
    // parent process); otherwise generate one so the spawned server and every
    // request share it — the 1.18.25 server requires auth either way.
    if (!generatedServerPassword) {
      generatedServerPassword = process.env.OPENCODE_SERVER_PASSWORD ?? `cron-${Math.random().toString(36).slice(2, 12)}`;
      generatedServerUsername = process.env.OPENCODE_SERVER_USERNAME ?? 'opencode';
    }
    const child = spawn(executable, ['serve', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd,
      windowsHide: true,
      shell: executable.endsWith('.cmd'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OPENCODE_SERVER_PASSWORD: generatedServerPassword,
        OPENCODE_SERVER_USERNAME: generatedServerUsername ?? 'opencode',
      },
    });
    const launched = { baseUrl: `http://127.0.0.1:${port}`, process: child };
    server = launched;
    await waitForHealth(launched.baseUrl);
    return launched.baseUrl;
  }

  async function createSession(baseUrl: string, input: OpenCodeRunnerAdapterInput): Promise<string> {
    // NEW server protocol (1.18.25): session create accepts { title, permission }
    // ONLY — a `model` (or agent/metadata) field is REJECTED with 400. The
    // model rides on the MESSAGE level instead.
    // Governed policy (CRON's gate): reads allowed, file edits + shell run ASK —
    // every change surfaces as an approval request to the user; nothing writes
    // silently. Verified against the real server (edit:ask surfaces in
    // GET /permission; reply value is "once").
    const response = await postJson<{ id?: string }>(
      `${baseUrl}/session?directory=${encodeURIComponent(input.repoPath)}`,
      {
        title: input.task.title || 'CRON Code task',
        permission: GOVERNED_PERMISSION_POLICY,
      },
      openCodeServerAuthHeaders(),
    );
    if (!response.id) throw new Error('OpenCode server did not return a session id');
    return response.id;
  }

  async function sendMessage(baseUrl: string, sessionId: string, messageId: string, input: OpenCodeRunnerAdapterInput): Promise<OpenCodeRunnerAdapterResult> {
    const model = parseOpenCodeModel(input.model);
    const response = await postJson<{ info?: { id?: string; tokens?: { output?: number; input?: number } }; parts?: unknown[] }>(
      `${baseUrl}/session/${encodeURIComponent(sessionId)}/message?directory=${encodeURIComponent(input.repoPath)}`,
      {
        messageID: messageId,
        model: { providerID: model.providerID, modelID: model.modelID },
        agent: 'build',
        // The message text is the RAW task request. The longer CRON wrapper
        // prompt confused the coding model into verbose inactivity (verified
        // live 30 Aug: wrapped → zero tokens/no asks for minutes; the bare
        // request surfaces the permission ask within seconds).
        parts: [{ type: 'text', text: input.request }],
      },
      openCodeServerAuthHeaders(),
    );
    // Honesty guard: a refused/broken stream (e.g. gateway model opt-in error)
    // returns a 200 response with ZERO tokens and no parts. Treating that as
    // "completed" would fake a successful build — fail honestly instead.
    const hasOutput = Array.isArray(response.parts) && response.parts.length > 0;
    const outputTokens = response.info?.tokens?.output ?? 0;
    if (!hasOutput && outputTokens === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'OpenCode session produced no output — the coding model did not run. Check the model route and gateway opt-in.',
        summary: 'OpenCode session produced no output',
        changedFiles: [],
      };
    }
    return {
      exitCode: 0,
      stdout: summarizeMessageResponse(response),
      stderr: '',
      summary: 'OpenCode server session completed',
      changedFiles: await listSessionDiff(baseUrl, sessionId, input.repoPath),
    };
  }

  return {
    interfaceKind: 'headless',
    executable,
    async run(input, onEvent) {
      const baseUrl = await ensureServer(input.repoPath);
      const sessionId = await createSession(baseUrl, input);
      const messageId = newId('msg');
      onEvent({ taskId: input.task.id, status: 'running', message: `OpenCode server session ${sessionId} created`, model: input.model, runner: 'opencode' });
      const messagePromise = sendMessage(baseUrl, sessionId, messageId, input);
      sessions.set(sessionId, { sessionId, messageId, taskId: input.task.id, model: input.model, repoPath: input.repoPath, permissionFilepath: null, messagePromise });
      const pending = await waitForPermissionOrCompletion(baseUrl, sessionId, input.repoPath, messagePromise, { taskId: input.task.id, model: input.model }, onEvent);
      if (pending) {
        sessions.set(sessionId, { sessionId, messageId, taskId: input.task.id, model: input.model, repoPath: input.repoPath, permissionFilepath: pending.metadata?.filepath ?? null, messagePromise });
        return {
          exitCode: 0,
          stdout: `OpenCode permission requested: ${pending.action} (${pending.resources.join(', ')})`,
          stderr: '',
          summary: `OpenCode needs approval to ${pending.action}`,
          approval: {
            sessionId,
            permissionId: pending.id,
            messageId: pending.source?.messageID ?? messageId,
            callId: pending.source?.callID ?? null,
            permission: pending.action,
            target: pending.metadata?.filepath ?? pending.resources[0] ?? null,
            reason: 'Required to complete your request.',
            patterns: pending.resources,
          },
        };
      }
      return messagePromise;
    },
    async replyToPermission(input, onEvent) {
      const baseUrl = server?.baseUrl;
      if (!baseUrl) throw new Error('OpenCode server is not running for this permission');
      const pending = sessions.get(input.sessionId);
      if (!pending || pending.taskId !== input.taskId) {
        throw new Error('OpenCode session/task correlation mismatch');
      }
      await postJson<void>(
        `${baseUrl}/permission/${encodeURIComponent(input.permissionId)}/reply?directory=${encodeURIComponent(pending.repoPath)}`,
        {
          reply: input.decision === 'approve' ? 'once' : 'reject',
          message: input.reason,
        },
        openCodeServerAuthHeaders(),
      );
      onEvent({ taskId: input.taskId, status: input.decision === 'approve' ? 'running' : 'cancelled', message: `OpenCode permission ${input.permissionId} answered in session ${input.sessionId}`, model: pending.model, runner: 'opencode' });
      if (input.decision === 'reject') {
        sessions.delete(input.sessionId);
        return { exitCode: 1, stdout: '', stderr: input.reason ?? 'OpenCode permission rejected', summary: 'OpenCode permission rejected' };
      }
      const completion = await waitForPermissionOrCompletion(
        baseUrl,
        input.sessionId,
        pending.repoPath,
        pending.messagePromise,
        { taskId: input.taskId, model: pending.model },
        onEvent,
        input.permissionId,
      );
      if (completion) {
        return {
          exitCode: 0,
          stdout: `OpenCode permission requested: ${completion.action} (${completion.resources.join(', ')})`,
          stderr: '',
          summary: `OpenCode needs approval to ${completion.action}`,
          approval: {
            sessionId: input.sessionId,
            permissionId: completion.id,
            messageId: completion.source?.messageID ?? pending.messageId,
            callId: completion.source?.callID ?? null,
            permission: completion.action,
            target: completion.metadata?.filepath ?? completion.resources[0] ?? null,
            reason: 'Required to complete your request.',
            patterns: completion.resources,
          },
        };
      }
      sessions.delete(input.sessionId);
      const result = await pending.messagePromise;
      if ((!result.changedFiles || result.changedFiles.length === 0) && pending.permissionFilepath) {
        return { ...result, changedFiles: [pending.permissionFilepath] };
      }
      return result;
    },
  };
}

interface OpenCodePendingPermission {
  readonly id: string;
  readonly sessionID: string;
  readonly action: string;
  readonly resources: readonly string[];
  readonly source?: { messageID?: string; callID?: string };
  readonly metadata?: { filepath?: string | null; diff?: string | null };
}

function parseOpenCodeModel(model: string): { providerID: string; modelID: string } {
  const [providerID, ...rest] = model.split('/');
  return { providerID: providerID || 'deepseek', modelID: rest.join('/') || model };
}

function summarizeMessageResponse(response: unknown): string {
  if (!response || typeof response !== 'object') return 'OpenCode server completed';
  const parts = Array.isArray((response as { parts?: unknown[] }).parts) ? (response as { parts: unknown[] }).parts : [];
  const text = parts
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const maybe = part as { type?: string; text?: string };
      return maybe.type === 'text' && typeof maybe.text === 'string' ? maybe.text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || 'OpenCode server completed';
}

async function listSessionDiff(baseUrl: string, sessionId: string, repoPath: string): Promise<string[]> {
  try {
    const diff = await getJson<unknown[]>(`${baseUrl}/session/${encodeURIComponent(sessionId)}/diff?directory=${encodeURIComponent(repoPath)}`, openCodeServerAuthHeaders());
    return diff
      .map((item) => item && typeof item === 'object' ? String((item as { path?: string; file?: string }).path ?? (item as { file?: string }).file ?? '') : '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

const OPENCODE_HEARTBEAT_INTERVAL_MS = 4000;
const OPENCODE_HEARTBEAT_MAX = 14;
const OPENCODE_HEARTBEAT_MESSAGES = Object.freeze([
  'OpenCode is reading the project files.',
  'OpenCode is planning the change.',
  'OpenCode is working on the request.',
  'OpenCode is still working on the request.',
  'OpenCode is checking the result.',
]);

async function waitForPermissionOrCompletion(
  baseUrl: string,
  sessionId: string,
  repoPath: string,
  messagePromise: Promise<OpenCodeRunnerAdapterResult>,
  input: { taskId: string; model: string },
  onEvent: (event: Omit<OpenCodeRunEvent, 'timestamp'>) => void,
  skipPermissionId?: string,
): Promise<OpenCodePendingPermission | null> {
  const startedAt = Date.now();
  let heartbeatCount = 0;
  let lastHeartbeatAt = startedAt;
  // Governed builds can legitimately run long (slow gateway models). 60 min
  // ceiling; the user cancels via the app's own cancel path.
  while (Date.now() - startedAt < 60 * 60 * 1000) {
      const permission = await getSessionPermission(baseUrl, sessionId, repoPath);
      if (permission && permission.id !== skipPermissionId) {
        onEvent({ taskId: input.taskId, status: 'awaiting_approval', message: `OpenCode requests ${permission.action} ${permission.resources.join(', ')}`, model: input.model, runner: 'opencode' });
        return permission;
      }
      const completed = await isPromiseSettled(messagePromise);
      if (completed) return null;
      if (
        heartbeatCount < OPENCODE_HEARTBEAT_MAX &&
        Date.now() - lastHeartbeatAt >= OPENCODE_HEARTBEAT_INTERVAL_MS
      ) {
        lastHeartbeatAt = Date.now();
        heartbeatCount += 1;
        onEvent({
          taskId: input.taskId,
          status: 'running',
          message:
            OPENCODE_HEARTBEAT_MESSAGES[
              (heartbeatCount - 1) %
              OPENCODE_HEARTBEAT_MESSAGES.length
            ],
          model: input.model,
          runner: 'opencode',
        });
      }
      await delay(400);
    }
  throw new Error('Timed out waiting for OpenCode session permission or completion');
}

interface OpenCodePermissionItem {
  readonly id?: string;
  readonly requestID?: string;
  readonly sessionID?: string;
  readonly permission?: string;
  readonly action?: string;
  readonly patterns?: readonly string[];
  readonly resources?: readonly string[];
  readonly tool?: { messageID?: string; callID?: string };
  readonly metadata?: { filepath?: string | null; diff?: string | null };
}

async function getSessionPermission(baseUrl: string, sessionId: string, repoPath: string): Promise<OpenCodePendingPermission | null> {
  const data = await getJson<OpenCodePermissionItem[] | { data?: OpenCodePermissionItem[] }>(
    `${baseUrl}/permission?directory=${encodeURIComponent(repoPath)}`,
  ).catch(() => null);
  const permissions = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const item = permissions.find((permission) => permission?.sessionID === sessionId) ?? permissions[0] ?? null;
  if (!item) return null;
  return {
    id: item.id ?? item.requestID ?? '',
    sessionID: item.sessionID ?? sessionId,
    action: item.permission ?? item.action ?? 'governed action',
    resources: item.patterns ?? item.resources ?? [],
    source: item.tool,
    metadata: item.metadata,
  };
}

async function findOpenPort(): Promise<number> {
  for (let port = 4097; port < 4125; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error('No free localhost port found for OpenCode server');
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function waitForHealth(baseUrl: string): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const health = await getJson<{ healthy?: boolean }>(`${baseUrl}/global/health`, openCodeServerAuthHeaders());
      if (health.healthy) return;
    } catch {
      // keep polling while the server boots
    }
    await delay(250);
  }
  throw new Error('OpenCode server did not become healthy');
}

// The OpenCode message endpoint is a long-poll: the run may take MINUTES
// before response headers arrive, and Node's default fetch (undici) has a
// 300s headers/body timeout — every long run died at ~5min with
// UNDERR_ERR_HEADERS_TIMEOUT. This dispatcher disables both timeouts
// (user cancellation via the runner's own cancel path is the control).
// IMPORTANT: the pool must allow MANY connections — the message long-poll
// holds its connection for the whole run, and the /permission polling runs
// concurrently on the same origin. Default pool (1 connection) starves the
// polls: the run would spin forever in heartbeats without ever surfacing an
// approval (found the hard way, 30 Aug).
const SERVER_DISPATCHER = new Agent({
  connections: 200,
  headersTimeout: 0,
  bodyTimeout: 0,
  connect: { timeout: 10000 },
});

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await undiciFetch(url, { headers, dispatcher: SERVER_DISPATCHER });
  if (!response.ok) {
    throw new Error(`OpenCode server returned ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await undiciFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    body: JSON.stringify(body),
    dispatcher: SERVER_DISPATCHER,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenCode server returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function isPromiseSettled<T>(promise: Promise<T>): Promise<boolean> {
  let settled = false;
  void promise.then(() => { settled = true; }, () => { settled = true; });
  await Promise.resolve();
  await Promise.resolve();
  return settled;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rejects a wrapped attempt once the wall-clock window elapses WITHOUT it having
 * settled. Used ONLY to bound the primary (unreliable) model attempt so a wedged
 * gateway that keeps pinging heartbeats can't hold it forever. Heartbeats are
 * "still alive" pings, not progress, so they must NOT extend the window. The
 * known-good fallback attempt is never sent through this guard.
 */
async function withAttemptDeadline<T>(
  promise: Promise<T>,
  windowMs: number,
  stallMessage: string,
): Promise<T> {
  if (windowMs <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(stallMessage), { launchFailure: true })), windowMs);
  });
  // Clear the deadline timer if the attempt settles first so it isn't leaked. The
  // wrapped promise is raced directly (its own rejection is handled by the race),
  // avoiding an unhandled rejection from a separate finally chain.
  const settle = (): void => { if (timer) clearTimeout(timer); };
  void promise.then(settle, settle);
  return Promise.race([promise, guard]);
}

function createOpenCodeCliAdapter(executable: string): OpenCodeRunnerAdapter {
  return {
    interfaceKind: 'cli',
    executable,
    async run(input, onEvent) {
      onEvent({
        taskId: input.task.id,
        status: 'running',
        message: 'OpenCode CLI process launched',
        model: input.model,
        runner: 'opencode',
      });
      const prompt = buildOpenCodePrompt(input);
      return runOpenCodeCli(executable, input.repoPath, input.model, prompt, (message) => {
        onEvent({
          taskId: input.task.id,
          status: 'running',
          message,
          model: input.model,
          runner: 'opencode',
        });
      });
    },
  };
}

function buildOpenCodePrompt(input: OpenCodeRunnerAdapterInput): string {
  const context = input.conversationContext
    .slice(-8)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n\n');
  return [
    'CRON for Code governed backend execution.',
    '',
    'You are OpenCode running behind CRON. CRON is the visible UI and control plane.',
    `Project: ${input.project.name}`,
    `Repo path: ${input.repoPath}`,
    `Model route: ${input.model}`,
    '',
    'Hard constraints:',
    '- Do not commit, push, reset, clean, or perform destructive Git actions.',
    '- Do not request or expose secrets.',
    '- Keep output concise and report blockers clearly.',
    '- Use only the current repository context.',
    '',
    context ? `Conversation context:\n${context}\n` : '',
    'Task request:',
    input.request,
  ].filter(Boolean).join('\n');
}

function runOpenCodeCli(
  executable: string,
  cwd: string,
  model: string,
  prompt: string,
  onLine?: (message: string) => void,
): Promise<OpenCodeRunnerAdapterResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['run', '-m', model, prompt], {
      cwd,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const cap = 256 * 1024;
    const emitLines = (chunk: Buffer): string => {
      const text = chunk.toString('utf-8');
      for (const line of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(-12)) {
        if (!/chain[-\s]?of[-\s]?thought|private reasoning|hidden reasoning/i.test(line)) onLine?.(line);
      }
      return text;
    };
    child.stdout?.on('data', (chunk) => {
      stdout = (stdout + emitLines(chunk)).slice(-cap);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = (stderr + emitLines(chunk)).slice(-cap);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const exitCode = code ?? 1;
      resolve({
        exitCode,
        stdout,
        stderr,
        summary: summarizeOpenCodeOutput(stdout, stderr, exitCode),
      });
    });
  });
}

function summarizeOpenCodeOutput(stdout: string, stderr: string, exitCode: number): string {
  const source = (stdout || stderr || '').trim();
  if (!source) return exitCode === 0 ? 'OpenCode completed without output' : `OpenCode exited with code ${exitCode}`;
  return source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-8).join('\n');
}

function withChangedFileEvidence(stdout: string, changedFiles: readonly string[] | undefined): string {
  if (!changedFiles || changedFiles.length === 0) return stdout;
  const evidence = changedFiles.map((file) => `Changed: ${file}`).join('\n');
  return stdout ? `${stdout}\n${evidence}` : evidence;
}

interface OpenCodeOutcomeAnalysis {
  readonly status: 'completed' | 'failed' | 'awaiting_approval';
  readonly summary: string;
  readonly errorCode: ExecutionErrorCode | null;
  readonly approval: Omit<OpenCodePermissionRequest, 'approvalId'> | null;
}

function analyzeOpenCodeResult(result: OpenCodeRunnerAdapterResult): OpenCodeOutcomeAnalysis {
  const source = `${result.stdout}\n${result.stderr}`.trim();
  const permission = parsePermissionRequest(source);
  const hasAutoReject = /\bauto-?reject(?:ed|ing)?\b/i.test(source);
  const hasPermissionRejection = /\buser rejected permission\b|\brejected permission\b|\bpermission rejected\b/i.test(source);
  const hasWriteFailure = /\b(?:write|edit|create)\b[^\r\n]*\bfailed\b|\bfailed\b[^\r\n]*\b(?:write|edit|create)\b/i.test(source);

  if ((result.approval || permission) && (result.approval || hasAutoReject || hasPermissionRejection)) {
    const approval = result.approval ?? permission;
    if (!approval) {
      throw new Error('OpenCode permission analysis lost the permission request');
    }
    if (result.approval?.sessionId && result.approval?.permissionId) {
      return {
        status: 'awaiting_approval',
        summary: `OpenCode needs approval to ${approval.permission}${approval.target ? ` ${approval.target}` : ''}.`,
        errorCode: 'APPROVAL_REQUIRED',
        approval: result.approval,
      };
    }
    return {
      status: 'failed',
      summary: 'OpenCode rejected or blocked a permission without a resumable session, so CRON cannot approve it. No file change was made.',
      errorCode: 'APPROVAL_REJECTED',
      approval: null,
    };
  }

  if (result.exitCode !== 0 || hasPermissionRejection || hasWriteFailure) {
    return {
      status: 'failed',
      summary: result.summary || summarizeOpenCodeOutput(result.stdout, result.stderr, result.exitCode) || 'OpenCode runner failed',
      errorCode: hasPermissionRejection ? 'APPROVAL_REJECTED' : 'LAUNCH_FAILED',
      approval: null,
    };
  }

  return {
    status: 'completed',
    summary: result.summary || summarizeOpenCodeOutput(result.stdout, result.stderr, result.exitCode) || 'OpenCode runner completed',
    errorCode: null,
    approval: null,
  };
}

function parsePermissionRequest(source: string): Omit<OpenCodePermissionRequest, 'approvalId'> | null {
  const match = /permission requested:\s*([a-z0-9_.-]+)(?:\s*\(([^)]+)\))?/i.exec(source);
  if (!match) return null;
  const permission = match[1]?.trim() || 'governed action';
  const target = match[2]?.trim() || null;
  return {
    sessionId: null,
    permissionId: null,
    messageId: null,
    callId: null,
    permission,
    target,
    reason: 'Required to complete your request.',
    patterns: target ? [target] : [],
  };
}

export class OpenCodeRunner {
  private readonly dataService: DataService;
  private readonly adapter: OpenCodeRunnerAdapter | null;
  private readonly defaultModel: string;
  private readonly fallbackModel: string;
  private readonly escalationModel: string;
  private readonly onEvent?: (event: OpenCodeRunEvent) => void;
  private readonly stallTimeoutMs: number;

  constructor(options: OpenCodeRunnerOptions) {
    this.dataService = options.dataService;
    this.adapter = options.adapter === undefined ? discoverOpenCodeCli() : options.adapter;
    this.defaultModel = options.defaultModel ?? DEFAULT_CODING_MODEL;
    this.fallbackModel = options.fallbackModel ?? DEFAULT_FALLBACK_MODEL;
    this.escalationModel = options.escalationModel ?? DEFAULT_ESCALATION_MODEL;
    this.onEvent = options.onEvent;
    this.stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
  }

  private publish(event: OpenCodeRunEvent): void {
    this.onEvent?.(event);
  }

  async runTask(input: OpenCodeRunInput): Promise<OpenCodeRunResult> {
    const model = (input.model || this.defaultModel).trim();
    const events: OpenCodeRunEvent[] = [];
    const emit = (event: Omit<OpenCodeRunEvent, 'timestamp'>): void => {
      const fullEvent: OpenCodeRunEvent = { ...event, timestamp: Date.now() };
      events.push(fullEvent);
      this.publish(fullEvent);
    };

    const block = async (task: Task | null, projectId: string | null, message: string, errorCode: ExecutionErrorCode = 'RUNNER_BLOCKED'): Promise<OpenCodeRunResult> => {
      const executionId = newId('exe');
      const record = createExecutionRecord({
        id: executionId,
        status: 'blocked',
        commandId: 'opencode.runner',
        taskId: input.taskId,
        projectId: projectId ?? task?.projectId ?? 'unknown',
        approvalId: null,
        cwd: '',
        executable: 'opencode',
        args: ['<governed-task>'],
        displayCommand: `OpenCode governed runner (${model})`,
        startedAt: Date.now(),
        endedAt: Date.now(),
        exitCode: null,
        output: createExecutionOutput({ stdout: '', stderr: message }),
        error: createExecutionError(errorCode, message),
      });
      await this.dataService.executions.save(record);
      if (task) await this.dataService.tasks.updateStatus(task.id, 'blocked', message);
      await this.audit('execution.blocked', task, executionId, record.cwd, record.error?.code ?? errorCode);
      emit({ taskId: input.taskId, status: 'blocked', message, model, runner: 'opencode' });
      return {
        taskId: input.taskId,
        status: 'blocked',
        model,
        runner: 'opencode',
        runnerInterface: 'unavailable',
        events,
        summary: message,
        blocker: message,
        executionId,
        record,
        approval: null,
        changedFiles: [],
      };
    };

    emit({ taskId: input.taskId, status: 'queued', message: 'Task accepted by CRON runner boundary', model, runner: 'opencode' });
    const task = await this.dataService.tasks.get(input.taskId);
    if (!task) return block(null, null, 'Task not found');

    if (model === this.escalationModel) {
      return block(task, task.projectId, 'DeepSeek V4 Pro escalation was requested but explicit escalation approval is not implemented in this slice');
    }
    if (model !== this.defaultModel) {
      return block(task, task.projectId, `Coding model is not allowed for this runner: ${model}`);
    }
    if (!['draft', 'queued', 'approval_required', 'failed', 'blocked'].includes(task.status)) {
      return block(task, task.projectId, `Cannot run OpenCode task in state ${task.status}`);
    }

    await this.dataService.tasks.updateStatus(task.id, 'queued');
    emit({ taskId: task.id, status: 'validating', message: 'Validating project and Git repository boundary', model, runner: 'opencode' });

    const project = await this.dataService.projects.get(task.projectId);
    if (!project) return block(task, task.projectId, `Project not found: ${task.projectId}`);

    let repoPath: string;
    try {
      const verified = resolveProjectRoot(project.rootPath);
      repoPath = assertPathInsideProject(verified.gitRoot, verified.gitRoot);
    } catch (error) {
      const err = toExecutionError(error);
      return block(task, task.projectId, err.message, err.code);
    }
    emit({ taskId: task.id, status: 'starting', message: 'Repository validated; preparing OpenCode runner', model, runner: 'opencode' });

    if (!this.adapter) {
      return block(task, task.projectId, 'OpenCode execution interface is not available on PATH or configured as a headless runner');
    }

    // Model fallback (30 Aug): the primary is the vision Flash via the OpenCode
    // gateway; if it cannot even LAUNCH a session (gateway/auth/model issue),
    // retry ONCE with the known-good flash fallback. Only launch-level failures
    // fall back — permission waits and real tool failures never do.
    const attemptModels: string[] = [model];
    if (model === this.defaultModel && this.fallbackModel !== model) {
      attemptModels.push(this.fallbackModel);
    }

    let attemptResult: (OpenCodeRunResult & { launchFailure: boolean }) | null = null;
    for (let attemptIndex = 0; attemptIndex < attemptModels.length; attemptIndex += 1) {
      const attemptModel = attemptModels[attemptIndex]!;
      // Only the PRIMARY attempt is deadline-bound. The known-good fallback gets a
      // normal long floor so a genuinely slow build isn't cut. If the primary
      // doesn't settle (completion OR permission) within the window — even if it
      // keeps pinging heartbeats — we treat it as a launch failure and fall back.
      const deadlineMs = attemptIndex === 0 ? this.stallTimeoutMs : 0;
      attemptResult = await this.runAttempt(task, project, repoPath, input, attemptModel, emit, events, deadlineMs);
      if (!attemptResult.launchFailure) break;
      if (attemptIndex + 1 >= attemptModels.length) break;
      emit({ taskId: task.id, status: 'running', message: 'Primary model could not launch — retrying with the DeepSeek V4 Flash fallback', model: attemptModel, runner: 'opencode' });
    }
    return attemptResult!;
  }

  private async runAttempt(
    task: Task,
    project: CodeProject,
    repoPath: string,
    input: OpenCodeRunInput,
    model: string,
    emit: (event: Omit<OpenCodeRunEvent, 'timestamp'>) => void,
    events: OpenCodeRunEvent[],
    deadlineMs = 0,
  ): Promise<OpenCodeRunResult & { launchFailure: boolean }> {
    const executionId = newId('exe');
    await this.dataService.tasks.updateStatus(task.id, 'running');
    emit({ taskId: task.id, status: 'running', message: `OpenCode runner started with ${model}`, model, runner: 'opencode' });
    await this.audit('execution.started', task, executionId, repoPath, null);

    try {
      // Deadline guard (primary attempt only): a wedged gateway can hold the
      // adapter promise forever while pinging heartbeats — which are "still
      // alive" pings, NOT progress. The launch-failure fallback never fires on a
      // thrown error, so a silent-wedge spins until the 60-min ceiling. This sets
      // a hard window on the primary attempt; if it doesn't settle (completion OR
      // a permission) it is treated as a launch failure and retried with the
      // known-good fallback. Slow-but-alive RUNS on the fallback are unbounded.
      const runPromise = this.adapter!.run(
        {
          task,
          project,
          repoPath,
          request: task.prompt,
          model,
          conversationContext: input.conversationContext ?? [],
        },
        (event) => emit(event),
      );
      const guard = withAttemptDeadline(
        runPromise,
        deadlineMs,
        `${LAUNCH_STALL_ERROR} for ${model} (${deadlineMs}ms)`,
      );
      const result = await guard;
      emit({ taskId: task.id, status: 'verifying', message: 'Capturing OpenCode runner result', model, runner: 'opencode' });
      const outcome = analyzeOpenCodeResult(result);
      let approval: OpenCodePermissionRequest | null = null;
      if (outcome.approval) {
        approval = await this.requestOpenCodeApproval(task, repoPath, executionId, outcome.approval);
      }
      const executionStatus = outcome.status === 'awaiting_approval' ? 'blocked' : outcome.status;
      const record = createExecutionRecord({
        id: executionId,
        status: executionStatus,
        commandId: 'opencode.runner',
        taskId: task.id,
        projectId: task.projectId,
        approvalId: approval?.approvalId ?? null,
        cwd: repoPath,
        executable: this.adapter!.executable,
        args: ['<governed-task>'],
        displayCommand: `OpenCode governed runner (${model})`,
        startedAt: Date.now(),
        endedAt: Date.now(),
        exitCode: result.exitCode,
        output: createExecutionOutput({ stdout: withChangedFileEvidence(result.stdout, result.changedFiles), stderr: result.stderr }),
        error: outcome.errorCode ? createExecutionError(outcome.errorCode, outcome.summary) : null,
        retryable: outcome.status !== 'completed',
      });
      await this.dataService.executions.save(record);
      const taskStatus = outcome.status === 'awaiting_approval' ? 'approval_required' : outcome.status;
      await this.dataService.tasks.updateStatus(task.id, taskStatus, outcome.status === 'completed' ? undefined : record.error?.message);
      await this.audit(
        outcome.status === 'completed' ? 'execution.completed' : outcome.status === 'awaiting_approval' ? 'execution.blocked' : 'execution.failed',
        task,
        executionId,
        repoPath,
        record.error?.code ?? null,
      );
      if (approval) {
        emit({ taskId: task.id, status: 'awaiting_approval', message: approval.reason, model, runner: 'opencode', approval });
      } else {
        emit({ taskId: task.id, status: outcome.status, message: outcome.summary, model, runner: 'opencode' });
      }
      return {
        taskId: task.id,
        status: outcome.status,
        model,
        runner: 'opencode',
        runnerInterface: this.adapter!.interfaceKind,
        events,
        summary: outcome.summary,
        blocker: outcome.status === 'failed' ? outcome.summary : null,
        executionId,
        record,
        approval,
        changedFiles: result.changedFiles ?? [],
        launchFailure: false,
      };
    } catch (error) {
      const err = toExecutionError(error);
      // A wait-timeout is NOT a launch failure: the session ran fine, it was
      // just slow. Falling back in that case would double the wait for nothing.
      // A STALL (no progress for the window) IS a launch failure: the session
      // wedged without ever throwing, and the fallback should get a clean shot.
      const isStall = err.message.includes(LAUNCH_STALL_ERROR);
      const launchFailure = !err.message.includes('Timed out waiting') || isStall;
      const record = createExecutionRecord({
        id: executionId,
        status: 'failed',
        commandId: 'opencode.runner',
        taskId: task.id,
        projectId: task.projectId,
        approvalId: null,
        cwd: repoPath,
        executable: this.adapter!.executable,
        args: ['<governed-task>'],
        displayCommand: `OpenCode governed runner (${model})`,
        startedAt: Date.now(),
        endedAt: Date.now(),
        exitCode: null,
        output: createExecutionOutput({ stderr: err.message }),
        error: err,
      });
      await this.dataService.executions.save(record);
      await this.dataService.tasks.updateStatus(task.id, 'failed', err.message);
      await this.audit('execution.failed', task, executionId, repoPath, err.code);
      emit({ taskId: task.id, status: 'failed', message: err.message, model, runner: 'opencode' });
      return {
        taskId: task.id,
        status: 'failed',
        model,
        runner: 'opencode',
        runnerInterface: this.adapter!.interfaceKind,
        events,
        summary: err.message,
        blocker: null,
        executionId,
        record,
        approval: null,
        changedFiles: [],
        launchFailure,
      };
    }
  }

  async replyToApproval(input: OpenCodeApprovalReplyInput): Promise<OpenCodeApprovalReplyResult> {
    const approval = await this.dataService.approvals.get(input.approvalId);
    if (!approval) {
      throw new Error(`OpenCode approval not found: ${input.approvalId}`);
    }
    if (approval.taskId !== input.taskId) {
      throw new Error('OpenCode approval/task mismatch');
    }
    if (approval.status !== 'requested') {
      throw new Error(`OpenCode approval is already ${approval.status}`);
    }
    const task = await this.dataService.tasks.get(input.taskId);
    if (!task) {
      throw new Error(`Task not found: ${input.taskId}`);
    }
    const sessionId = approval.openCodeSessionId ?? null;
    const permissionId = approval.openCodePermissionId ?? null;
    if (!sessionId || !permissionId) {
      throw new Error('OpenCode approval is missing session/permission correlation ids');
    }
    if (!this.adapter?.replyToPermission) {
      throw new Error('OpenCode server permission reply API is not connected');
    }

    const model = this.defaultModel;
    const events: OpenCodeRunEvent[] = [];
    const emit = (event: Omit<OpenCodeRunEvent, 'timestamp'>): void => {
      const fullEvent: OpenCodeRunEvent = { ...event, timestamp: Date.now() };
      events.push(fullEvent);
      this.publish(fullEvent);
    };

    const approvalStatus = input.decision === 'approve' ? 'approved' : 'rejected';
    await this.dataService.approvals.resolve(input.approvalId, approvalStatus, input.reason);
    await this.dataService.audit.append(createAuditRecord({
      id: newId('aud'),
      eventType: input.decision === 'approve' ? 'approval.approved' : 'approval.rejected',
      taskId: task.id,
      projectId: task.projectId,
      approvalId: input.approvalId,
      commandId: 'opencode.runner',
      cwd: approval.cwd ?? null,
      actor: 'cron-opencode-runner',
      transition: input.decision,
      errorCode: input.decision === 'reject' ? 'APPROVAL_REJECTED' : null,
    }));

    emit({
      taskId: task.id,
      status: input.decision === 'approve' ? 'running' : 'cancelled',
      message: `${input.decision === 'approve' ? 'Approval' : 'Rejection'} sent to OpenCode session ${sessionId}`,
      model,
      runner: 'opencode',
    });

    const result = await this.adapter.replyToPermission({ ...input, sessionId, permissionId }, emit);
    if (input.decision === 'reject') {
      const executionId = approval.executionId ?? newId('exe');
      const startedAt = await this.resolveExecutionStartedAt(executionId);
      const record = createExecutionRecord({
        id: executionId,
        status: 'cancelled',
        commandId: 'opencode.runner',
        taskId: task.id,
        projectId: task.projectId,
        approvalId: input.approvalId,
        cwd: approval.cwd ?? '',
        executable: this.adapter.executable,
        args: ['<opencode-permission-reject>'],
        displayCommand: `OpenCode permission reject (${model})`,
        startedAt,
        endedAt: Date.now(),
        exitCode: result.exitCode,
        output: createExecutionOutput({ stdout: result.stdout, stderr: result.stderr }),
        error: createExecutionError('APPROVAL_REJECTED', input.reason ?? 'OpenCode permission rejected in CRON'),
      });
      await this.dataService.executions.save(record);
      await this.dataService.tasks.updateStatus(task.id, 'cancelled', record.error?.message);
      await this.audit('execution.cancelled', task, record.id, record.cwd, record.error?.code ?? null);
      return this.replyResult(input, task, approval, model, events, record, 'cancelled', 'OpenCode approval was rejected.', 'OpenCode approval was rejected.');
    }

    emit({ taskId: task.id, status: 'verifying', message: 'Verifying OpenCode result after approval', model, runner: 'opencode' });
    const outcome = analyzeOpenCodeResult(result);
    const executionId = approval.executionId ?? newId('exe');
    const startedAt = await this.resolveExecutionStartedAt(executionId);
    if (outcome.status === 'awaiting_approval' && outcome.approval) {
      const followUp = await this.requestOpenCodeApproval(task, approval.cwd ?? '', executionId, outcome.approval);
      const record = createExecutionRecord({
        id: executionId,
        status: 'blocked',
        commandId: 'opencode.runner',
        taskId: task.id,
        projectId: task.projectId,
        approvalId: followUp.approvalId,
        cwd: approval.cwd ?? '',
        executable: this.adapter.executable,
        args: ['<opencode-permission-required>'],
        displayCommand: `OpenCode same-session approval (${model})`,
        startedAt,
        endedAt: Date.now(),
        exitCode: result.exitCode,
        output: createExecutionOutput({ stdout: result.stdout, stderr: result.stderr }),
        error: createExecutionError('APPROVAL_REQUIRED', `OpenCode needs approval to ${followUp.permission}${followUp.target ? ` ${followUp.target}` : ''}.`),
        retryable: true,
      });
      await this.dataService.executions.save(record);
      await this.dataService.tasks.updateStatus(task.id, 'approval_required', record.error?.message);
      await this.audit('execution.blocked', task, record.id, record.cwd, 'APPROVAL_REQUIRED');
      emit({ taskId: task.id, status: 'awaiting_approval', message: record.error?.message ?? 'OpenCode needs another approval.', model, runner: 'opencode', approval: { ...followUp, approvalId: followUp.approvalId } });
      return this.replyResult(input, task, approval, model, events, record, 'awaiting_approval', followUp.reason, null, {
        ...followUp,
        approvalId: followUp.approvalId,
      });
    }
    const recordStatus = outcome.status === 'completed' ? 'completed' : 'failed';
    const record = createExecutionRecord({
      id: executionId,
      status: recordStatus,
      commandId: 'opencode.runner',
      taskId: task.id,
      projectId: task.projectId,
      approvalId: input.approvalId,
      cwd: approval.cwd ?? '',
      executable: this.adapter.executable,
      args: ['<opencode-permission-reply>'],
      displayCommand: `OpenCode same-session resume (${model})`,
      startedAt,
      endedAt: Date.now(),
      exitCode: result.exitCode,
      output: createExecutionOutput({ stdout: withChangedFileEvidence(result.stdout, result.changedFiles), stderr: result.stderr }),
      error: outcome.errorCode ? createExecutionError(outcome.errorCode, outcome.summary) : null,
      retryable: outcome.status !== 'completed',
    });
    await this.dataService.executions.save(record);
    await this.dataService.tasks.updateStatus(task.id, outcome.status === 'completed' ? 'completed' : 'failed', outcome.status === 'completed' ? undefined : record.error?.message);
    await this.audit(outcome.status === 'completed' ? 'execution.completed' : 'execution.failed', task, record.id, record.cwd, record.error?.code ?? null);
    emit({ taskId: task.id, status: outcome.status, message: outcome.summary, model, runner: 'opencode' });
    return this.replyResult(input, task, approval, model, events, record, outcome.status, outcome.summary, outcome.status === 'completed' ? null : outcome.summary, undefined, result.changedFiles ?? []);
  }

  private async resolveExecutionStartedAt(executionId: string): Promise<number> {
    const existing = await this.dataService.executions.get(executionId).catch(() => null);
    return existing?.startedAt ?? Date.now();
  }

  private replyResult(
    input: OpenCodeApprovalReplyInput,
    task: Task,
    approvalRecord: Approval,
    model: string,
    events: readonly OpenCodeRunEvent[],
    record: ExecutionRecord,
    status: OpenCodeRunStatus,
    summary: string,
    blocker: string | null,
    approvalRequest?: OpenCodePermissionRequest,
    changedFiles: readonly string[] = [],
  ): OpenCodeApprovalReplyResult {
    const approval = approvalRequest ?? {
      approvalId: input.approvalId,
      sessionId: approvalRecord.openCodeSessionId ?? null,
      permissionId: approvalRecord.openCodePermissionId ?? null,
      messageId: approvalRecord.openCodeMessageId ?? null,
      callId: approvalRecord.openCodeCallId ?? null,
      permission: 'OpenCode permission',
      target: null,
      reason: input.reason ?? summary,
      patterns: [],
    } satisfies OpenCodePermissionRequest;
    return {
      taskId: task.id,
      status,
      model,
      runner: 'opencode',
      runnerInterface: this.adapter?.interfaceKind ?? 'unavailable',
      events,
      summary,
      blocker,
      executionId: record.id,
      record,
      approval,
      approvalId: input.approvalId,
      decision: input.decision,
      changedFiles,
    };
  }

  private async requestOpenCodeApproval(
    task: Task,
    cwd: string,
    executionId: string,
    request: Omit<OpenCodePermissionRequest, 'approvalId'>,
  ): Promise<OpenCodePermissionRequest> {
    if (!request.sessionId || !request.permissionId) {
      throw new Error('OpenCode permission request did not include resumable session/permission ids');
    }
    const approvalId = newId('appr');
    const target = request.target ? `\n\nTarget:\n${request.target}` : '';
    const approval: Approval = {
      ...createApproval(
        approvalId,
        task.id,
        task.projectId,
        'write',
        `OpenCode wants to ${request.permission}.${target}`,
      ),
      requester: 'opencode',
      commandId: 'opencode.runner',
      executionId,
      cwd,
      commandSummary: `OpenCode ${request.permission}${request.target ? ` ${request.target}` : ''}`,
      riskCategory: 'medium',
      openCodeSessionId: request.sessionId,
      openCodePermissionId: request.permissionId,
      openCodeMessageId: request.messageId,
      openCodeCallId: request.callId,
    };
    await this.dataService.approvals.save(approval);
    await this.dataService.audit.append(createAuditRecord({
      id: newId('aud'),
      eventType: 'approval.requested',
      taskId: task.id,
      projectId: task.projectId,
      approvalId,
      executionId,
      commandId: 'opencode.runner',
      cwd,
      actor: 'cron-opencode-runner',
      transition: 'awaiting_approval',
      errorCode: 'APPROVAL_REQUIRED',
    }));
    return { ...request, approvalId };
  }

  private async audit(
    eventType: 'execution.started' | 'execution.completed' | 'execution.failed' | 'execution.blocked' | 'execution.cancelled',
    task: Task | null,
    executionId: string,
    cwd: string | null,
    errorCode: string | null,
  ): Promise<void> {
    const record: AuditRecord = createAuditRecord({
      id: newId('aud'),
      eventType,
      taskId: task?.id ?? null,
      projectId: task?.projectId ?? null,
      executionId,
      commandId: 'opencode.runner',
      cwd,
      actor: 'cron-opencode-runner',
      transition: eventType.replace('execution.', ''),
      errorCode,
    });
    await this.dataService.audit.append(record);
  }
}

