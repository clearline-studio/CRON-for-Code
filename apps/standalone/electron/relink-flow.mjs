// Pure re-link outcome resolver for the CRON for Code Electron main process.
// No Electron imports so it can be unit-tested with vitest.
// User cancellation of the native folder picker is a first-class NON-ERROR result:
// it must never be converted into a thrown exception, a red banner, or a mutation.

/**
 * Resolves the structured re-link outcome from a native folder-picker result.
 *
 * @param {object} dialogResult - Electron showOpenDialog result ({ canceled, filePaths }).
 * @param {string} projectId - canonical project id (already validated by the caller).
 * @param {(projectId: string, rootPath: string) => Promise<{ project: object, conflict?: object }>} linkRootPath
 *   - the authoritative re-link operation (may throw for invalid selections).
 * @returns {Promise<{status: 'cancelled'} | {status: 'ok'; project: object} | {status: 'conflict'; project: object; conflictProjectId: string; conflictRootPath: string}>}
 */
export async function resolveRelinkOutcome(dialogResult, projectId, linkRootPath) {
  const cancelled =
    !dialogResult ||
    dialogResult.canceled !== false ||
    !Array.isArray(dialogResult.filePaths) ||
    dialogResult.filePaths.length === 0;
  if (cancelled) {
    return { status: 'cancelled' };
  }
  const result = await linkRootPath(projectId, dialogResult.filePaths[0]);
  if (result && result.conflict) {
    return {
      status: 'conflict',
      project: result.project,
      conflictProjectId: result.conflict.conflictProjectId,
      conflictRootPath: result.conflict.conflictRootPath,
    };
  }
  return { status: 'ok', project: result.project };
}
