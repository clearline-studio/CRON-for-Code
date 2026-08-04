import { describe, it, expect } from 'vitest';
import { createMockHostAdapter } from './mock.js';

describe('createMockHostAdapter', () => {
  it('returns initial context', () => {
    const adapter = createMockHostAdapter();
    expect(adapter.context.hostId).toBe('mock');
    expect(adapter.context.theme).toBe('dark');
  });

  it('selectProject returns null in mock', async () => {
    const adapter = createMockHostAdapter();
    const result = await adapter.selectProject();
    expect(result).toBeNull();
  });

  it('fires context-changed on updateContext', () => {
    const adapter = createMockHostAdapter();
    const events: string[] = [];
    adapter.onEvent((type) => events.push(type));
    adapter.updateContext({ theme: 'light' });
    expect(events).toContain('context-changed');
  });

  it('fires project-selected on simulate', () => {
    const adapter = createMockHostAdapter();
    const events: string[] = [];
    adapter.onEvent((type) => events.push(type));
    adapter.simulateProjectSelection({ rootPath: '/test', name: 'Test' });
    expect(events).toContain('project-selected');
    expect(adapter.context.activeProjectId).toBe('/test');
  });

  it('removes listener on unsubscribe', () => {
    const adapter = createMockHostAdapter();
    const events: string[] = [];
    const unsub = adapter.onEvent((type) => events.push(type));
    unsub();
    adapter.updateContext({ theme: 'light' });
    expect(events).toHaveLength(0);
  });
});
