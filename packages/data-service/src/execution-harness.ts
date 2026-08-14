import { spawn, spawnSync } from 'node:child_process';
import {
  createExecutionRecord,
  createExecutionOutput,
  createExecutionError,
} from '@cron-code/contracts';
import type {
  ExecutionRecord,
  ExecutionOutput,
  ExecutionError,
  OutputType,
} from '@cron-code/contracts';

export interface ExecutionInput {
  readonly id: string;
  readonly commandId: string;
  readonly taskId: string;
  readonly projectId: string;
  readonly approvalId: string | null;
  readonly cwd: string;
  readonly executable: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
  readonly timeoutMs: number;
  readonly readOnly: boolean;
  readonly outputType: OutputType;
}

export interface SpawnHandle {
  readonly pid: number | undefined;
  stdout: { on(event: 'data', cb: (chunk: string | Buffer) => void): unknown } | null;
  stderr: { on(event: 'data', cb: (chunk: string | Buffer) => void): unknown } | null;
  kill(signal?: string): boolean;
  on(event: 'error', cb: (err: Error) => void): unknown;
  on(event: 'close', cb: (code: number | null, signal: string | null) => void): unknown;
}

export type SpawnFn = (
  executable: string,
  args: readonly string[],
  options: { cwd: string; windowsHide: boolean; shell: boolean },
) => SpawnHandle;

export interface HarnessOptions {
  /** Per-stream output cap in bytes. Begin and end are retained when exceeded. */
  outputLimitBytes?: number;
  /** Tail bytes retained when the output limit is exceeded. */
  outputTailBytes?: number;
  spawnFn?: SpawnFn;
}

const DEFAULT_OUTPUT_LIMIT = 256 * 1024;
const DEFAULT_TAIL = 16 * 1024;

const REDACTION_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /(authorization\s*[:=]\s*)[^\r\n]+/gi,
  /(password\s*[:=]\s*)[^\r\n]+/gi,
  /(api[_-]?key\s*[:=]\s*)[^\r\n]+/gi,
  /(token\s*[:=]\s*)[^\r\n]+/gi,
  /(x-auth-token\s*[:=]\s*)[^\r\n]+/gi,
];

function redact(text: string): { text: string; changed: boolean } {
  let changed = false;
  let result = text;
  for (const pattern of REDACTION_PATTERNS) {
    const replaced = result.replace(pattern, (match) => {
      changed = true;
      if (match.startsWith('-----BEGIN')) return '-----BEGIN REDACTED PRIVATE KEY-----';
      const marker = match.split(/[:=]\s*/)[0];
      return `${marker}: [REDACTED]`;
    });
    result = replaced;
  }
  return { text: result, changed };
}

/** Bounded stream accumulator that retains the beginning and end when over limit. */
class BoundedBuffer {
  private head = '';
  private tail = '';
  private totalBytes = 0;
  private lines = 0;
  private overflow = false;

  constructor(private readonly limit: number, private readonly tailBytes: number) {}

  append(chunk: string): void {
    this.totalBytes += Buffer.byteLength(chunk, 'utf-8');
    if (!this.overflow && this.totalBytes <= this.limit) {
      this.head += chunk;
      this.lines = this.head.split('\n').length;
      return;
    }
    this.overflow = true;
    this.tail = (this.tail + chunk).slice(-this.tailBytes);
    this.lines += chunk.split('\n').length;
  }

  get truncated(): boolean {
    return this.overflow;
  }

  value(): string {
    if (!this.overflow) return this.head;
    return `${this.head}\n…[output truncated]…\n${this.tail}`;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  get lineCount(): number {
    return this.lines;
  }
}

interface RunningExecution {
  child: SpawnHandle;
  cancelledAt: number | null;
  timedOut: boolean;
  finished: boolean;
}

/**
 * Safe execution harness. Accepts only a pre-validated, catalogue-resolved
 * execution, launches without a shell, captures bounded stdout/stderr, applies
 * timeouts and idempotent cancellation, and kills only its own process tree.
 */
export class SafeExecutionHarness {
  private readonly running = new Map<string, RunningExecution>();
  private readonly outputLimitBytes: number;
  private readonly outputTailBytes: number;
  private readonly spawnFn: SpawnFn;

  constructor(options: HarnessOptions = {}) {
    this.outputLimitBytes = options.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT;
    this.outputTailBytes = options.outputTailBytes ?? DEFAULT_TAIL;
    this.spawnFn =
      options.spawnFn ??
      ((exe, args, opts) =>
        spawn(exe, [...args], {
          cwd: opts.cwd,
          windowsHide: opts.windowsHide,
          shell: opts.shell,
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as unknown as SpawnHandle);
  }

  /** Idempotent cancellation. Returns true when an execution was active. */
  cancel(executionId: string): boolean {
    const running = this.running.get(executionId);
    if (!running || running.finished) return false;
    running.cancelledAt = running.cancelledAt ?? Date.now();
    this.killTree(running.child);
    return true;
  }

  get isExecuting(): boolean {
    return this.running.size > 0;
  }

  hasActive(executionId: string): boolean {
    const running = this.running.get(executionId);
    return running !== undefined && !running.finished;
  }

  private killTree(child: SpawnHandle): void {
    if (child.pid === undefined) return;
    try {
      child.kill('SIGTERM');
    } catch {
      /* best effort */
    }
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    }
  }

  async execute(input: ExecutionInput): Promise<ExecutionRecord> {
    const startedAt = Date.now();
    const stdoutBuf = new BoundedBuffer(this.outputLimitBytes, this.outputTailBytes);
    const stderrBuf = new BoundedBuffer(this.outputLimitBytes, this.outputTailBytes);

    let child: SpawnHandle;
    let launchError: ExecutionError | null = null;

    try {
      child = this.spawnFn(input.executable, input.args, {
        cwd: input.cwd,
        windowsHide: true,
        shell: false,
      });
    } catch (err) {
      launchError = createExecutionError(
        'LAUNCH_FAILED',
        err instanceof Error ? err.message : 'Failed to launch process',
      );
      return createExecutionRecord({
        id: input.id,
        status: 'failed',
        commandId: input.commandId,
        taskId: input.taskId,
        projectId: input.projectId,
        approvalId: input.approvalId,
        cwd: input.cwd,
        executable: input.executable,
        args: input.args,
        displayCommand: input.displayCommand,
        startedAt,
        endedAt: Date.now(),
        exitCode: null,
        output: createExecutionOutput({ redacted: false }),
        error: launchError,
        retryable: false,
      });
    }

    const running: RunningExecution = {
      child,
      cancelledAt: null,
      timedOut: false,
      finished: false,
    };
    this.running.set(input.id, running);

    const redaction = {
      stdout: false,
      stderr: false,
    };

    const appendStdout = (chunk: string | Buffer): void => {
      const text = chunk.toString('utf-8');
      const r = redact(text);
      redaction.stdout = redaction.stdout || r.changed;
      stdoutBuf.append(r.text);
    };
    const appendStderr = (chunk: string | Buffer): void => {
      const text = chunk.toString('utf-8');
      const r = redact(text);
      redaction.stderr = redaction.stderr || r.changed;
      stderrBuf.append(r.text);
    };

    child.stdout?.on('data', appendStdout);
    child.stderr?.on('data', appendStderr);

    return new Promise<ExecutionRecord>((resolve) => {
      let settled = false;
      let exitCode: number | null = null;
      let signal: string | null = null;
      const timer = setTimeout(() => {
        if (settled) return;
        running.timedOut = true;
        this.killTree(child);
      }, input.timeoutMs);

      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        running.finished = true;
        this.running.delete(input.id);

        const cancelledAt = running.cancelledAt;
        let status: ExecutionRecord['status'];
        let error: ExecutionError | null = null;

        if (cancelledAt !== null) {
          status = 'cancelled';
          error = createExecutionError('CANCELLED', 'Execution cancelled');
        } else if (running.timedOut) {
          status = 'timed_out';
          error = createExecutionError('TIMEOUT', `Exceeded ${input.timeoutMs}ms timeout`);
        } else if (launchError) {
          status = 'failed';
          error = launchError;
        } else if (exitCode === 0) {
          status = 'completed';
        } else {
          status = 'failed';
          error = createExecutionError(
            'LAUNCH_FAILED',
            stderrBuf.value() || `Exit code: ${exitCode}`,
          );
        }

        const output: ExecutionOutput = createExecutionOutput({
          stdout: stdoutBuf.value(),
          stderr: stderrBuf.value(),
          truncated: stdoutBuf.truncated || stderrBuf.truncated,
          redacted: redaction.stdout || redaction.stderr,
          stdoutBytes: stdoutBuf.bytes,
          stderrBytes: stderrBuf.bytes,
          stdoutLines: stdoutBuf.lineCount,
          stderrLines: stderrBuf.lineCount,
        });

        resolve(
          createExecutionRecord({
            id: input.id,
            status,
            commandId: input.commandId,
            taskId: input.taskId,
            projectId: input.projectId,
            approvalId: input.approvalId,
            cwd: input.cwd,
            executable: input.executable,
            args: input.args,
            displayCommand: input.displayCommand,
            startedAt,
            endedAt: Date.now(),
            exitCode,
            signal,
            output,
            error,
            timeout: { timeoutMs: input.timeoutMs, exceeded: running.timedOut },
            cancellation: {
              requested: cancelledAt !== null,
              requestedAt: cancelledAt,
            },
            redacted: redaction.stdout || redaction.stderr,
            retryable: false,
          }),
        );
      };

      child.on('error', (err: Error) => {
        if (settled) return;
        // Guard: spawn succeeded in the synchronous try above; async errors are
        // treated as launch failures only when no code is produced.
        launchError = createExecutionError(
          'LAUNCH_FAILED',
          err.message,
        );
        exitCode = null;
        finish();
      });

      child.on('close', (code: number | null, sig: string | null) => {
        exitCode = code;
        signal = sig;
        finish();
      });
    });
  }
}
