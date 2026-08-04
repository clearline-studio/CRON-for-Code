import { describe, it, expect } from 'vitest';
import { createTask, updateTaskStatus } from './task.js';

describe('createTask', () => {
  it('creates a task in draft status', () => {
    const task = createTask('t1', 'p1', 'Test Task', 'Do something');
    expect(task.status).toBe('draft');
    expect(task.id).toBe('t1');
    expect(task.projectId).toBe('p1');
    expect(task.title).toBe('Test Task');
    expect(task.prompt).toBe('Do something');
    expect(task.startedAt).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.error).toBeNull();
  });
});

describe('updateTaskStatus', () => {
  it('transitions from draft to queued', () => {
    const task = createTask('t1', 'p1', 'T', 'P');
    const updated = updateTaskStatus(task, 'queued');
    expect(updated.status).toBe('queued');
    expect(updated.startedAt).toBeNull();
  });

  it('sets startedAt when transitioning to running', () => {
    const task = createTask('t1', 'p1', 'T', 'P');
    const updated = updateTaskStatus(task, 'running');
    expect(updated.status).toBe('running');
    expect(updated.startedAt).not.toBeNull();
    expect(updated.startedAt).toBeGreaterThan(0);
  });

  it('sets completedAt when transitioning to completed', () => {
    const task = createTask('t1', 'p1', 'T', 'P');
    const running = updateTaskStatus(task, 'running');
    const completed = updateTaskStatus(running, 'completed');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();
  });

  it('sets error when transitioning to failed', () => {
    const task = createTask('t1', 'p1', 'T', 'P');
    const running = updateTaskStatus(task, 'running');
    const failed = updateTaskStatus(running, 'failed', 'Something broke');
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Something broke');
    expect(failed.completedAt).not.toBeNull();
  });

  it('does not overwrite startedAt if already set', () => {
    const task = createTask('t1', 'p1', 'T', 'P');
    const running = updateTaskStatus(task, 'running');
    const firstStart = running.startedAt;
    const second = updateTaskStatus(running, 'running');
    expect(second.startedAt).toBe(firstStart);
  });
});
