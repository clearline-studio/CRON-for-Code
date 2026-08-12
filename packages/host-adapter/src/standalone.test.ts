import { describe, it, expect, vi } from 'vitest';
import { createStandaloneHostAdapter } from './standalone.js';
import type { HostProjectAction, HostProjectActionResult } from './types.js';

function makeAdapter(options?: { perform?: (a: HostProjectAction) => Promise<HostProjectActionResult>; restart?: () => Promise<void> }) {
  const perform = options?.perform ?? vi.fn().mockResolvedValue({ status: 'ok' });
  const restart = options?.restart ?? vi.fn().mockResolvedValue(undefined);
  const adapter = createStandaloneHostAdapter({
    selectFolder: vi.fn().mockResolvedValue('C:/repos/A'),
    hostActionBridge: { perform, restart },
  });
  return { adapter, perform, restart };
}

describe('standalone host adapter folder-picker bridge', () => {
  it('returns a valid selection and emits project-selected on success', async () => {
    const selectFolder = vi.fn().mockResolvedValue('C:\\Users\\x\\projects\\CRON for Meds');
    const adapter = createStandaloneHostAdapter({ selectFolder });
    const listener = vi.fn();
    adapter.onEvent(listener);

    const selection = await adapter.selectProject();

    expect(selection).toEqual({
      rootPath: 'C:\\Users\\x\\projects\\CRON for Meds',
      name: 'CRON for Meds',
    });
    expect(listener).toHaveBeenCalledWith('project-selected', selection);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns null and emits nothing when the picker is cancelled', async () => {
    const selectFolder = vi.fn().mockResolvedValue(null);
    const adapter = createStandaloneHostAdapter({ selectFolder });
    const listener = vi.fn();
    adapter.onEvent(listener);

    const selection = await adapter.selectProject();

    expect(selection).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it('propagates a picker failure to the caller (no silent swallow)', async () => {
    const selectFolder = vi.fn().mockRejectedValue(new Error('picker exploded'));
    const adapter = createStandaloneHostAdapter({ selectFolder });
    const listener = vi.fn();
    adapter.onEvent(listener);

    await expect(adapter.selectProject()).rejects.toThrow('picker exploded');
    expect(listener).not.toHaveBeenCalled();
  });

  it('derives the project name from the last path segment and handles trailing separators', async () => {
    const adapter = createStandaloneHostAdapter({
      selectFolder: async () => 'C:/repos/My Project\\',
    });
    const selection = await adapter.selectProject();
    expect(selection?.name).toBe('My Project');
  });

  it('unsubscribe removes the listener', async () => {
    const selectFolder = async () => 'C:/repos/A';
    const adapter = createStandaloneHostAdapter({ selectFolder });
    const listener = vi.fn();
    const unsub = adapter.onEvent(listener);
    unsub();
    await adapter.selectProject();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('standalone host adapter project-action bridge', () => {
  it('routes a reveal action through the host action bridge', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'reveal', projectId: 'proj_1' });
    expect(perform).toHaveBeenCalledWith({ kind: 'reveal', projectId: 'proj_1' });
  });

  it('routes a copy-path action through the host action bridge', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'copy-path', projectId: 'proj_1' });
    expect(perform).toHaveBeenCalledWith({ kind: 'copy-path', projectId: 'proj_1' });
  });

  it('routes a refresh action through the host action bridge', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'refresh', projectId: 'proj_1' });
    expect(perform).toHaveBeenCalledWith({ kind: 'refresh', projectId: 'proj_1' });
  });

  it('routes a rename action with the validated next name', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'rename', projectId: 'proj_1', nextName: 'New Name' });
    expect(perform).toHaveBeenCalledWith({ kind: 'rename', projectId: 'proj_1', nextName: 'New Name' });
  });

  it('routes a relink action with the new root path', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'relink', projectId: 'proj_1', newRootPath: 'C:/new' });
    expect(perform).toHaveBeenCalledWith({ kind: 'relink', projectId: 'proj_1', newRootPath: 'C:/new' });
  });

  it('propagates the structured relink result (cancelled/conflict/ok) to the caller', async () => {
    const cancelled = { status: 'cancelled' } as const;
    const conflict = { status: 'conflict', conflictProjectId: 'proj_2', conflictRootPath: 'C:/x' } as const;
    const ok = { status: 'ok' } as const;
    for (const result of [cancelled, conflict, ok]) {
      const perform = vi.fn().mockResolvedValue(result);
      const adapter = createStandaloneHostAdapter({
        selectFolder: vi.fn(),
        hostActionBridge: { perform, restart: vi.fn() },
      });
      const outcome = await adapter.performProjectAction({ kind: 'relink', projectId: 'proj_1' });
      expect(outcome).toEqual(result);
    }
  });

  it('normalizes an undefined bridge result to { status: "ok" }', async () => {
    const adapter = createStandaloneHostAdapter({
      selectFolder: vi.fn(),
      hostActionBridge: { perform: vi.fn().mockResolvedValue(undefined), restart: vi.fn() },
    });
    const outcome = await adapter.performProjectAction({ kind: 'copy-path', projectId: 'proj_1' });
    expect(outcome).toEqual({ status: 'ok' });
  });

  it('routes an archive action', async () => {
    const { adapter, perform } = makeAdapter();
    await adapter.performProjectAction({ kind: 'archive', projectId: 'proj_1' });
    expect(perform).toHaveBeenCalledWith({ kind: 'archive', projectId: 'proj_1' });
  });

  it('emits a project-action event after performing the action', async () => {
    const { adapter } = makeAdapter();
    const listener = vi.fn();
    adapter.onEvent(listener);
    await adapter.performProjectAction({ kind: 'refresh', projectId: 'proj_1' });
    expect(listener).toHaveBeenCalledWith('project-action', { kind: 'refresh', projectId: 'proj_1' });
  });

  it('propagates a host bridge failure to the caller', async () => {
    const perform = vi.fn().mockRejectedValue(new Error('reveal failed'));
    const { adapter } = makeAdapter({ perform });
    await expect(adapter.performProjectAction({ kind: 'reveal', projectId: 'proj_1' })).rejects.toThrow('reveal failed');
  });

  it('throws a clear error when the host action bridge is unavailable', async () => {
    const adapter = createStandaloneHostAdapter({ selectFolder: vi.fn() });
    await expect(adapter.performProjectAction({ kind: 'reveal', projectId: 'proj_1' })).rejects.toThrow(
      /Project actions are not available/,
    );
  });
});

describe('standalone host adapter restart bridge', () => {
  it('routes restart through the host action bridge', async () => {
    const { adapter, restart } = makeAdapter();
    await adapter.restartApp();
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when the restart bridge is unavailable', async () => {
    const adapter = createStandaloneHostAdapter({ selectFolder: vi.fn() });
    await expect(adapter.restartApp()).rejects.toThrow(/Restart is not available/);
  });
});
