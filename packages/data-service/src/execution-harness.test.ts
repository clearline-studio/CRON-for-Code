import { describe, it, expect } from 'vitest';
import { SafeExecutionHarness, type ExecutionInput } from './execution-harness.js';

const NODE = process.execPath;

function makeInput(overrides: Partial<ExecutionInput> = {}): ExecutionInput {
  return {
    id: 'exe_test',
    commandId: 'node.syntax-check',
    taskId: 'task_1',
    projectId: 'proj_1',
    approvalId: 'appr_1',
    cwd: process.cwd(),
    executable: NODE,
    args: ['-e', "console.log('out'); console.error('err'); process.exit(0)"],
    displayCommand: 'node -e …',
    timeoutMs: 10000,
    readOnly: true,
    outputType: 'text',
    ...overrides,
  };
}

describe('SafeExecutionHarness', () => {
  it('captures stdout and stderr on success', async () => {
    const harness = new SafeExecutionHarness();
    const record = await harness.execute(makeInput());
    expect(record.status).toBe('completed');
    expect(record.exitCode).toBe(0);
    expect(record.output.stdout).toContain('out');
    expect(record.output.stderr).toContain('err');
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
    expect(record.startedAt).toBeGreaterThan(0);
    expect(record.endedAt).not.toBeNull();
  });

  it('records a non-zero exit as failed with the exit code', async () => {
    const harness = new SafeExecutionHarness();
    const record = await harness.execute(
      makeInput({ args: ['-e', 'process.exit(3)'] }),
    );
    expect(record.status).toBe('failed');
    expect(record.exitCode).toBe(3);
    expect(record.error?.code).toBe('LAUNCH_FAILED');
  });

  it('times out long-running commands', async () => {
    const harness = new SafeExecutionHarness();
    const record = await harness.execute(
      makeInput({ args: ['-e', 'setTimeout(() => {}, 60000)'], timeoutMs: 300 }),
    );
    expect(record.status).toBe('timed_out');
    expect(record.timeout.exceeded).toBe(true);
    expect(record.error?.code).toBe('TIMEOUT');
  });

  it('cancels a running execution and reports cancelled', async () => {
    const harness = new SafeExecutionHarness();
    const promise = harness.execute(
      makeInput({ args: ['-e', 'setInterval(() => {}, 1000)'], timeoutMs: 60000 }),
    );
    await new Promise((r) => setTimeout(r, 200));
    expect(harness.cancel('exe_test')).toBe(true);
    const record = await promise;
    expect(record.status).toBe('cancelled');
    expect(record.cancellation.requested).toBe(true);
    expect(record.cancellation.requestedAt).not.toBeNull();
  });

  it('makes repeated cancellation idempotent', async () => {
    const harness = new SafeExecutionHarness();
    const promise = harness.execute(
      makeInput({ args: ['-e', 'setInterval(() => {}, 1000)'], timeoutMs: 60000 }),
    );
    await new Promise((r) => setTimeout(r, 150));
    expect(harness.cancel('exe_test')).toBe(true);
    // No error and no double-kill from a repeated call.
    expect(() => harness.cancel('exe_test')).not.toThrow();
    expect(harness.cancel('missing-execution')).toBe(false);
    const record = await promise;
    expect(record.status).toBe('cancelled');
    // After the execution has settled, cancellation reports false.
    expect(harness.cancel('exe_test')).toBe(false);
  });

  it('reports a structured launch failure when spawn throws', async () => {
    const harness = new SafeExecutionHarness({
      spawnFn: () => {
        throw new Error('ENOENT');
      },
    });
    const record = await harness.execute(makeInput());
    expect(record.status).toBe('failed');
    expect(record.error?.code).toBe('LAUNCH_FAILED');
    expect(record.error?.message).toContain('ENOENT');
  });

  it('truncates large output and retains head and tail', async () => {
    const harness = new SafeExecutionHarness({ outputLimitBytes: 200, outputTailBytes: 40 });
    const record = await harness.execute(
      makeInput({ args: ['-e', "for(let i=0;i<5000;i++){console.log('line-'+i)}"] }),
    );
    expect(record.status).toBe('completed');
    expect(record.output.truncated).toBe(true);
    expect(record.output.stdout).toContain('line-0');
    expect(record.output.stdout).toContain('line-4999');
    expect(record.output.stdout).toContain('[output truncated]');
    expect(record.output.stdoutBytes).toBeGreaterThan(5000);
  });

  it('redacts likely secret values in output', async () => {
    const harness = new SafeExecutionHarness();
    const record = await harness.execute(
      makeInput({ args: ['-e', "console.log('Authorization: Bearer abc123')"] }),
    );
    expect(record.output.stdout).not.toContain('abc123');
    expect(record.output.stdout).toContain('[REDACTED]');
    expect(record.redacted).toBe(true);
  });
});
