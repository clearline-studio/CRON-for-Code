import { describe, it, expect } from 'vitest';
import {
  activityLabelFor,
  extractChangedPaths,
  friendlyModelName,
  humanizeEvent,
  humanizeStatus,
  humanizeSummary,
  summarizeActivity,
} from './activity-english.js';
import type { OpenCodeRunEvent, OpenCodeRunResult } from './opencode-client.js';

function event(overrides: Partial<OpenCodeRunEvent>): OpenCodeRunEvent {
  return {
    taskId: 'task_1',
    status: 'running',
    message: 'OpenCode server session ses_00abc123 created',
    timestamp: 1,
    model: 'deepseek/deepseek-v4-flash',
    runner: 'opencode',
    ...overrides,
  };
}

describe('plain-English activity mapping', () => {
  it('maps every runner status to a plain-English label', () => {
    expect(humanizeStatus('queued')).toBe('Waiting');
    expect(humanizeStatus('validating')).toBe('Checking project');
    expect(humanizeStatus('awaiting_approval')).toBe('Waiting for approval');
    expect(humanizeStatus('starting')).toBe('Starting');
    expect(humanizeStatus('running')).toBe('Working');
    expect(humanizeStatus('verifying')).toBe('Checking');
    expect(humanizeStatus('completed')).toBe('Done');
    expect(humanizeStatus('failed')).toBe('Failed');
    expect(humanizeStatus('blocked')).toBe('Needs attention');
    expect(humanizeStatus('cancelled')).toBe('Cancelled');
    expect(activityLabelFor('running')).toBe('Working');
  });

  it('never exposes session/permission/execution IDs in the normal surface', () => {
    const human = humanizeEvent(event({ message: 'OpenCode server session ses_00c81648abcd created' }));
    expect(human.message).toBe('Coding session started.');
    expect(human.message).not.toMatch(/ses_/);
    expect(human.message).not.toMatch(/per_/);
    expect(human.message).not.toMatch(/exe_/);
    expect(human.message).not.toMatch(/msg_/);
  });

  it('translates known runner messages to plain English', () => {
    expect(humanizeEvent(event({ message: 'Validating project and Git repository boundary' })).message).toBe('Confirming the selected repository and boundaries.');
    expect(humanizeEvent(event({ status: 'awaiting_approval', message: 'OpenCode permission requested: edit (runtime-test.txt)' })).message).toBe('OpenCode wants permission to edit (runtime-test.txt)');
    expect(humanizeEvent(event({ status: 'running', message: 'OpenCode permission per_ff37abc answered in session ses_00c8' })).message).toBe('Permission answered. Continuing the task.');
    expect(humanizeEvent(event({ status: 'verifying', message: 'Verifying OpenCode result after approval' })).message).toBe('Verifying the requested change.');
    expect(humanizeEvent(event({ status: 'completed', message: 'OpenCode server session completed' })).message).toBe('Coding work finished.');
  });

  it('strips stray internal IDs from arbitrary messages', () => {
    const human = humanizeEvent(event({ message: 'Check exe_1234 and per_5678 details' }));
    expect(human.message).not.toMatch(/exe_|per_/);
  });

  it('produces a concise final summary for a completed run', () => {
    const result = {
      status: 'completed',
      record: { output: { stdout: 'Changed: runtime-test.txt', stderr: '' } },
    } as unknown as OpenCodeRunResult;
    const summary = summarizeActivity(result);
    expect(summary?.status).toBe('completed');
    expect(summary?.headline).toBe('Task completed.');
    expect(summary?.created).toEqual(['runtime-test.txt']);
    expect(summary?.changedCount).toBe(1);
    expect(summary?.tests).toBe('Not required for this task');
  });

  it('never claims completion for awaiting/rejected/failed outcomes', () => {
    expect(summarizeActivity({ status: 'awaiting_approval', approval: { target: 'runtime-test.txt' } } as unknown as OpenCodeRunResult)?.headline).toContain('runtime-test.txt');
    const cancelled = summarizeActivity({ status: 'cancelled' } as unknown as OpenCodeRunResult);
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.headline).toContain('No file changes were made');
    const failed = summarizeActivity({ status: 'failed', blocker: 'Permission rejected' } as unknown as OpenCodeRunResult);
    expect(failed?.status).toBe('failed');
    expect(failed?.headline).toBe('Permission rejected');
  });

  it('extracts changed paths from execution output', () => {
    expect(extractChangedPaths('Changed: runtime-test.txt\nCreated: src/app.tsx')).toEqual(['runtime-test.txt', 'src/app.tsx']);
    expect(extractChangedPaths('nothing here')).toEqual([]);
  });

  it('humanizes raw summaries, blockers and errors without leaking internal IDs', () => {
    expect(humanizeSummary('OpenCode server session completed')).toBe('Coding work finished.');
    expect(humanizeSummary('OpenCode server session ses_00c81648abcd created')).toBe('Coding session started.');
    expect(humanizeSummary('OpenCode requests edit runtime-test.txt')).toBe('OpenCode wants to edit runtime-test.txt');
    expect(humanizeSummary('Capturing OpenCode runner result')).toBe('Checking the result.');
    expect(humanizeSummary('Timed out waiting for OpenCode session permission')).toBe('The coding agent took too long to respond.');
    expect(humanizeSummary('OpenCode unavailable')).toBe('OpenCode unavailable');
    expect(humanizeSummary('err exe_1 per_2')).not.toMatch(/exe_|per_/);
  });

  it('maps model ids to friendly executor labels in the normal surface', () => {
    expect(friendlyModelName('deepseek/deepseek-v4-flash')).toBe('DeepSeek V4 Flash');
    expect(friendlyModelName('deepseek/deepseek-v4-pro')).toBe('DeepSeek V4 Pro (deeper reasoning)');
    expect(friendlyModelName('')).toBe('Coding agent');
  });

  it('keeps heartbeat progress messages in plain English', () => {
    for (const message of [
      'OpenCode is reading the project files.',
      'OpenCode is planning the change.',
      'OpenCode is still working on the request.',
      'OpenCode is checking the result.',
    ]) {
      const human = humanizeEvent(event({ status: 'running', message }));
      expect(human.message).toBe(message);
      expect(human.message).not.toMatch(/ses_|per_|exe_|msg_|call_/);
    }
  });
});
