import { existsSync, statSync, realpathSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createExecutionError } from '@cron-code/contracts';
import type { ExecutionError } from '@cron-code/contracts';

export interface VerifiedProjectRoot {
  /** Canonical absolute local path as selected (used as project record identity). */
  readonly canonicalRoot: string;
  /** Resolved Git working-tree root (directory containing `.git`). */
  readonly gitRoot: string;
  /** True when the path was resolved through the filesystem (symlinks/junctions resolved). */
  readonly realRoot: string;
}

const SYSTEM_ROOT_GUARDS = ['C:\\windows', 'c:/windows', 'C:\\program files', 'C:/program files'];

function isUncPath(p: string): boolean {
  return p.startsWith('\\\\') || p.startsWith('//');
}

function isDriveRoot(p: string): boolean {
  return p === path.parse(p).root;
}

function normalizeComparable(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function hasGitMarker(dir: string): boolean {
  return existsSync(path.join(dir, '.git'));
}

function findGitRoot(start: string): string | null {
  let current = path.resolve(start);
  for (;;) {
    if (hasGitMarker(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Resolves and verifies a selected project path.
 * Returns the canonical root plus the discovered Git working-tree root.
 * Throws a structured ExecutionError when the path is unsupported or unsafe.
 */
export function resolveProjectRoot(rawPath: string): VerifiedProjectRoot {
  if (!rawPath || typeof rawPath !== 'string' || rawPath.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'Project path is missing');
  }

  const absolute = path.resolve(rawPath);

  if (!/^[A-Za-z]:[\\/]/.test(absolute) && !absolute.startsWith('/')) {
    throw createExecutionError('PATH_REJECTED', 'Project path must be an absolute local path', absolute);
  }
  if (isUncPath(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'UNC/network paths are not supported for execution', absolute);
  }
  if (isDriveRoot(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'Root-drive execution is not allowed', absolute);
  }
  if (!existsSync(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'Project path does not exist', absolute);
  }
  let stat;
  try {
    stat = statSync(absolute);
  } catch {
    throw createExecutionError('PATH_REJECTED', 'Project path cannot be inspected', absolute);
  }
  if (!stat.isDirectory()) {
    throw createExecutionError('PATH_REJECTED', 'Project path is not a directory', absolute);
  }

  const realRoot = (() => {
    try {
      return realpathSync(absolute);
    } catch {
      return absolute;
    }
  })();

  for (const guard of SYSTEM_ROOT_GUARDS) {
    if (normalizeComparable(realRoot) === normalizeComparable(guard)) {
      throw createExecutionError('PATH_REJECTED', 'System folders cannot be executed against', absolute);
    }
  }

  const gitRoot = findGitRoot(realRoot);
  if (!gitRoot) {
    throw createExecutionError(
      'NOT_A_REPOSITORY',
      'Selected project is not a Git repository (no .git marker found)',
      absolute,
    );
  }

  return { canonicalRoot: absolute, gitRoot, realRoot };
}

/**
 * Revalidates that `candidate` is inside `root` after canonicalisation,
 * blocking path traversal and symlink/junction escapes where detectable.
 */
export function assertPathInsideProject(root: string, candidate: string): string {
  const rootReal = (() => {
    try {
      return realpathSync(root);
    } catch {
      return path.resolve(root);
    }
  })();
  const candidateReal = (() => {
    try {
      return realpathSync(candidate);
    } catch {
      return path.resolve(candidate);
    }
  })();

  const rootNorm = normalizeComparable(rootReal);
  const candidateNorm = normalizeComparable(candidateReal);

  if (candidateNorm === rootNorm) return candidateReal;
  if (!candidateNorm.startsWith(rootNorm + path.sep.toLowerCase())) {
    throw createExecutionError(
      'BOUNDARY_VIOLATION',
      'Working directory is outside the project Git root',
      candidate,
    );
  }
  return candidateReal;
}

/** Revalidates a directory is a Git working tree root using only filesystem inspection. */
export function assertIsGitRoot(dir: string): string {
  if (!existsSync(dir)) {
    throw createExecutionError('PATH_REJECTED', 'Git root does not exist', dir);
  }
  const real = (() => {
    try {
      return realpathSync(dir);
    } catch {
      return path.resolve(dir);
    }
  })();
  if (!hasGitMarker(real)) {
    throw createExecutionError('NOT_A_REPOSITORY', 'Not a Git repository root', real);
  }
  return real;
}

/** Lists visible children of a directory (used to prove read-only access only). */
export function listProjectTopLevel(dir: string): string[] {
  assertIsGitRoot(dir);
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

export function toExecutionError(err: unknown): ExecutionError {
  if (err && typeof err === 'object' && 'code' in err) {
    const candidate = err as ExecutionError;
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return candidate;
    }
  }
  return createExecutionError(
    'LAUNCH_FAILED',
    err instanceof Error ? err.message : String(err),
  );
}
