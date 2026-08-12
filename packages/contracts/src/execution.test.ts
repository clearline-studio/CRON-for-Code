import { describe, it, expect } from 'vitest';
import {
  createExecutionOutput,
  createExecutionError,
  createExecutionRecord,
  createAuditRecord,
  canTransitionExecution,
  isFinalExecutionStatus,
} from './execution.js';

describe('execution contracts', () => {
  it('exports a complete factory output shape', () => {
    const output = createExecutionOutput({ stdout: 'a\nb', stderr: 'x' });
    expect(output.stdout).toBe('a\nb');
    expect(output.stdoutBytes).toBe(3);
    expect(output.stdoutLines).toBe(2);
    expect(output.stderrLines).toBe(1);
    expect(output.truncated).toBe(false);
    expect(output.redacted).toBe(false);
  });

  it('creates a structured error', () => {
    const error = createExecutionError('BOUNDARY_VIOLATION', 'out of bounds', 'detail');
    expect(error.code).toBe('BOUNDARY_VIOLATION');
    expect(error.message).toBe('out of bounds');
    expect(error.details).toBe('detail');
  });

  it('creates a complete execution record with computed duration', () => {
    const record = createExecutionRecord({
      id: 'exe_1',
      status: 'completed',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status', '--short'],
      displayCommand: 'git status --short',
      startedAt: 1000,
      endedAt: 2500,
      exitCode: 0,
      output: createExecutionOutput({ stdout: 'M file.txt' }),
    });
    expect(record.durationMs).toBe(1500);
    expect(record.signal).toBeNull();
    expect(record.error).toBeNull();
    expect(record.timeout.exceeded).toBe(false);
    expect(record.cancellation.requested).toBe(false);
    expect(record.retryable).toBe(false);
  });

  it('keeps endedAt/duration null while running', () => {
    const record = createExecutionRecord({
      id: 'exe_2',
      status: 'running',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status'],
      displayCommand: 'git status',
      startedAt: 1000,
      endedAt: null,
      exitCode: null,
    });
    expect(record.endedAt).toBeNull();
    expect(record.durationMs).toBeNull();
    expect(record.exitCode).toBeNull();
  });

  it('creates an audit record with sensible defaults', () => {
    const audit = createAuditRecord({ id: 'aud_1', eventType: 'task.queued', taskId: 'task_1' });
    expect(audit.actor).toBe('cron');
    expect(audit.projectId).toBeNull();
    expect(audit.redacted).toBe(false);
    expect(typeof audit.timestamp).toBe('number');
  });
});

describe('execution status transitions', () => {
  it('allows the intended lifecycle transitions', () => {
    expect(canTransitionExecution('requested', 'approved')).toBe(true);
    expect(canTransitionExecution('requested', 'rejected')).toBe(true);
    expect(canTransitionExecution('approved', 'running')).toBe(true);
    expect(canTransitionExecution('running', 'completed')).toBe(true);
    expect(canTransitionExecution('running', 'failed')).toBe(true);
    expect(canTransitionExecution('running', 'cancelled')).toBe(true);
    expect(canTransitionExecution('running', 'timed_out')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionExecution('rejected', 'running')).toBe(false);
    expect(canTransitionExecution('completed', 'running')).toBe(false);
    expect(canTransitionExecution('requested', 'running')).toBe(false);
    expect(canTransitionExecution('failed', 'completed')).toBe(false);
  });

  it('classifies final statuses', () => {
    for (const status of ['completed', 'failed', 'cancelled', 'timed_out']) {
      expect(isFinalExecutionStatus(status as never)).toBe(true);
    }
    expect(isFinalExecutionStatus('running')).toBe(false);
    expect(isFinalExecutionStatus('requested')).toBe(false);
  });
});
