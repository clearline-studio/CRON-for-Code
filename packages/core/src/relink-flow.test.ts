import { describe, it, expect, vi } from 'vitest';
import { resolveRelinkOutcome } from '../../../apps/standalone/electron/relink-flow.mjs';

describe('resolveRelinkOutcome (native folder-picker cancellation contract)', () => {
  it('returns { status: "cancelled" } when the dialog is cancelled (no throw)', async () => {
    const linkRootPath = vi.fn();
    const outcome = await resolveRelinkOutcome(
      { canceled: true, filePaths: [] },
      'proj_1',
      linkRootPath,
    );
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(linkRootPath).not.toHaveBeenCalled();
  });

  it('returns { status: "cancelled" } when filePaths is empty even if canceled is false', async () => {
    const linkRootPath = vi.fn();
    const outcome = await resolveRelinkOutcome(
      { canceled: false, filePaths: [] },
      'proj_1',
      linkRootPath,
    );
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(linkRootPath).not.toHaveBeenCalled();
  });

  it('returns { status: "cancelled" } for a null dialog result', async () => {
    const outcome = await resolveRelinkOutcome(null, 'proj_1', vi.fn());
    expect(outcome).toEqual({ status: 'cancelled' });
  });

  it('returns { status: "ok", project } when a folder is chosen', async () => {
    const project = { id: 'proj_1', rootPath: 'C:/new' };
    const linkRootPath = vi.fn().mockResolvedValue({ project });
    const outcome = await resolveRelinkOutcome(
      { canceled: false, filePaths: ['C:/new'] },
      'proj_1',
      linkRootPath,
    );
    expect(outcome).toEqual({ status: 'ok', project });
    expect(linkRootPath).toHaveBeenCalledWith('proj_1', 'C:/new');
  });

  it('returns { status: "conflict", ... } when the path belongs to another active project', async () => {
    const project = { id: 'proj_1', rootPath: 'C:/other' };
    const linkRootPath = vi.fn().mockResolvedValue({
      project,
      conflict: { conflictProjectId: 'proj_2', conflictRootPath: 'C:/other' },
    });
    const outcome = await resolveRelinkOutcome(
      { canceled: false, filePaths: ['C:/other'] },
      'proj_1',
      linkRootPath,
    );
    expect(outcome).toEqual({
      status: 'conflict',
      project,
      conflictProjectId: 'proj_2',
      conflictRootPath: 'C:/other',
    });
  });

  it('propagates genuine failures (invalid selection) as exceptions - never silent', async () => {
    const linkRootPath = vi.fn().mockRejectedValue(new Error('PATH_REJECTED: Project path does not exist'));
    await expect(
      resolveRelinkOutcome({ canceled: false, filePaths: ['C:/missing'] }, 'proj_1', linkRootPath),
    ).rejects.toThrow(/PATH_REJECTED/);
  });
});
