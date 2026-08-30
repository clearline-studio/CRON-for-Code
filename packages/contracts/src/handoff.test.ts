import { describe, it, expect } from 'vitest';
import {
  createHandoffRequest,
  createHandoffResult,
  isHandoffRequest,
  isHandoffResult,
} from './handoff.js';
import type { HandoffResult } from './handoff.js';

describe('createHandoffRequest', () => {
  it('builds a minimal request with sensible defaults', () => {
    const req = createHandoffRequest({
      requestId: 'req_1',
      repoPath: '/repo/app',
      task: 'Add a dark mode toggle',
    });

    expect(req.requestId).toBe('req_1');
    expect(req.source).toBe('intelligence');
    expect(req.project.repoPath).toBe('/repo/app');
    expect(req.task).toBe('Add a dark mode toggle');
    expect(req.context).toBeUndefined();
    expect(req.model).toBeUndefined();
    expect(req.createdAt).toBeGreaterThan(0);
  });

  it('carries optional context, model, and project name', () => {
    const req = createHandoffRequest({
      requestId: 'req_2',
      repoPath: 'C:/repo',
      name: 'My Project',
      task: 'Fix the login bug',
      context: {
        attachments: [{ kind: 'file', name: 'note.txt', content: 'see issue 5' }],
        conversation: [{ role: 'user', content: 'we talked about this' }],
      },
      model: 'deepseek/deepseek-v4-pro',
      createdAt: 12345,
    });

    expect(req.project.name).toBe('My Project');
    expect(req.context?.attachments).toHaveLength(1);
    expect(req.context?.conversation).toHaveLength(1);
    expect(req.model).toBe('deepseek/deepseek-v4-pro');
    expect(req.createdAt).toBe(12345);
  });
});

describe('createHandoffResult', () => {
  it('builds an empty result for a completed run', () => {
    const result = createHandoffResult('req_1', 'completed', 'Added dark mode toggle');

    expect(result.requestId).toBe('req_1');
    expect(result.status).toBe('completed');
    expect(result.summary).toBe('Added dark mode toggle');
    expect(result.blocker).toBeNull();
    expect(result.progress).toBeNull();
    expect(result.approvals).toEqual([]);
    expect(result.changedFiles).toEqual([]);
    expect(result.evidence).toEqual([]);
    expect(result.completedAt).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('marks non-completed results as not finished and carries pending approvals', () => {
    const result = createHandoffResult('req_2', 'awaiting_approval', 'Needs approval to edit');
    const withApproval: HandoffResult = {
      ...result,
      approvals: [
        {
          id: 'ap_1',
          description: 'Edit src/component.tsx',
          action: 'write',
          target: 'src/component.tsx',
          reason: 'Reason needed',
          patterns: ['src/**'],
          requestedAt: Date.now(),
        },
      ],
    };

    expect(result.completedAt).toBeNull();
    expect(withApproval.approvals[0].action).toBe('write');
    expect(withApproval.approvals[0].patterns).toContain('src/**');
  });
});

describe('handoff type guards', () => {
  it('accepts a valid request shape', () => {
    const req = createHandoffRequest({ requestId: 'r', repoPath: '/p', task: 't' });
    expect(isHandoffRequest(req)).toBe(true);
  });

  it('rejects a request missing the repo path', () => {
    expect(isHandoffRequest({ requestId: 'r', task: 't', createdAt: 1 })).toBe(false);
  });

  it('accepts a valid result shape', () => {
    const result = createHandoffResult('r', 'completed', 'done');
    expect(isHandoffResult(result)).toBe(true);
  });

  it('rejects a result missing the summary', () => {
    expect(isHandoffResult({ requestId: 'r', status: 'completed' })).toBe(false);
  });
});
