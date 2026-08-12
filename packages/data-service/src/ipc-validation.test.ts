import { describe, it, expect } from 'vitest';
import {
  assertKnownCommandId,
  assertTaskId,
  assertExecutionId,
  isValidExecutionRecordShape,
  isValidAuditRecordShape,
  sanitizeAuditFilter,
} from './ipc-validation.js';

describe('IPC validation', () => {
  it('accepts known command ids', () => {
    expect(assertKnownCommandId('repo.status')).toBe('repo.status');
    expect(assertKnownCommandId('node.syntax-check')).toBe('node.syntax-check');
  });

  it('rejects unknown command ids', () => {
    expect(() => assertKnownCommandId('not.a.command')).toThrow(/Unknown command id/);
    expect(() => assertKnownCommandId('git commit')).toThrow(/Unknown command id/);
  });

  it('rejects non-string or empty task/execution ids', () => {
    expect(() => assertTaskId('')).toThrow(/taskId/);
    expect(() => assertTaskId(123)).toThrow(/taskId/);
    expect(() => assertExecutionId('')).toThrow(/executionId/);
    expect(() => assertExecutionId(null)).toThrow(/executionId/);
  });

  it('accepts well-formed execution records', () => {
    const record = {
      id: 'exe_1',
      status: 'completed',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status', '--short'],
      startedAt: 1,
    };
    expect(isValidExecutionRecordShape(record)).toBe(true);
  });

  it('rejects malformed execution records (no shape injection)', () => {
    expect(isValidExecutionRecordShape(null)).toBe(false);
    expect(isValidExecutionRecordShape({ id: 'x' })).toBe(false);
    expect(
      isValidExecutionRecordShape({
        id: 'exe_1',
        status: 'completed',
        commandId: 'repo.status',
        taskId: 'task_1',
        projectId: 'proj_1',
        // cwd missing → structural rejection
        executable: 'git',
        args: ['status', '--short'],
        startedAt: 1,
      }),
    ).toBe(false);
    expect(
      isValidExecutionRecordShape({
        id: 'exe_1',
        status: 'completed',
        commandId: 'repo.status',
        taskId: 'task_1',
        projectId: 'proj_1',
        cwd: 'C:/repo',
        executable: 'git',
        args: ['status', 123],
        startedAt: 1,
      }),
    ).toBe(false); // non-string argument
  });

  it('validates audit record shapes', () => {
    expect(
      isValidAuditRecordShape({ id: 'a', eventType: 'task.queued', timestamp: 1 }),
    ).toBe(true);
    expect(isValidAuditRecordShape({ id: 'a', eventType: 5 })).toBe(false);
    expect(isValidAuditRecordShape({ id: 'a' })).toBe(false);
  });

  it('sanitises audit filters to known keys', () => {
    expect(sanitizeAuditFilter({ taskId: 't', extra: 1 })).toEqual({ taskId: 't' });
    expect(sanitizeAuditFilter({ foo: 'bar' })).toBeUndefined();
    expect(sanitizeAuditFilter('nope')).toBeUndefined();
    expect(sanitizeAuditFilter({ taskId: 5 })).toBeUndefined();
  });
});
