import { describe, it, expect } from 'vitest';
import { createApproval, resolveApproval, expireApproval } from './approval.js';

describe('createApproval', () => {
  it('creates a requested approval', () => {
    const approval = createApproval('a1', 't1', 'p1', 'write', 'Write to file');
    expect(approval.status).toBe('requested');
    expect(approval.actionCategory).toBe('write');
    expect(approval.respondedAt).toBeNull();
    expect(approval.reason).toBeNull();
  });
});

describe('resolveApproval', () => {
  it('approves with reason', () => {
    const a = createApproval('a1', 't1', 'p1', 'read', 'Read config');
    const resolved = resolveApproval(a, 'approved', 'Read-only is safe');
    expect(resolved.status).toBe('approved');
    expect(resolved.reason).toBe('Read-only is safe');
    expect(resolved.respondedAt).not.toBeNull();
  });

  it('rejects', () => {
    const a = createApproval('a1', 't1', 'p1', 'execute', 'Run script');
    const resolved = resolveApproval(a, 'rejected');
    expect(resolved.status).toBe('rejected');
    expect(resolved.respondedAt).not.toBeNull();
  });
});

describe('expireApproval', () => {
  it('marks as expired', () => {
    const a = createApproval('a1', 't1', 'p1', 'read', 'Read file', Date.now() + 5000);
    const expired = expireApproval(a);
    expect(expired.status).toBe('expired');
    expect(expired.respondedAt).not.toBeNull();
  });
});
