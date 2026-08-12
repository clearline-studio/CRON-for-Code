import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveProjectRoot,
  assertPathInsideProject,
  assertIsGitRoot,
} from './project-boundary.js';

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'tags'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(
    join(dir, '.git', 'config'),
    '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n',
  );
  writeFileSync(join(dir, 'README.md'), 'test repo\n');
}

let tmp: string;
let repo: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-boundary-'));
  repo = join(tmp, 'repo');
  makeGitRepo(repo);
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('resolveProjectRoot', () => {
  it('resolves an existing git repository and finds its git root', () => {
    const verified = resolveProjectRoot(repo);
    expect(verified.gitRoot).toBe(verified.realRoot);
    expect(verified.canonicalRoot).toBe(repo);
  });

  it('finds the git root from a nested directory', () => {
    const nested = join(repo, 'packages', 'core');
    mkdirSync(nested, { recursive: true });
    const verified = resolveProjectRoot(nested);
    expect(verified.gitRoot.toLowerCase()).toBe(repo.toLowerCase());
  });

  it('rejects a missing folder', () => {
    expect(() => resolveProjectRoot(join(tmp, 'missing'))).toThrow(/does not exist/);
  });

  it('rejects a file instead of a directory', () => {
    const file = join(repo, 'file.txt');
    writeFileSync(file, 'x');
    expect(() => resolveProjectRoot(file)).toThrow(/not a directory/);
  });

  it('rejects a drive root', () => {
    expect(() => resolveProjectRoot('C:\\')).toThrow(/Root-drive/);
  });

  it('rejects an empty / missing path', () => {
    expect(() => resolveProjectRoot('')).toThrow(/missing/);
    expect(() => resolveProjectRoot('   ')).toThrow(/missing/);
  });

  it('rejects a directory that is not a git repository', () => {
    const plain = join(tmp, 'plain');
    mkdirSync(plain, { recursive: true });
    expect(() => resolveProjectRoot(plain)).toThrow(/not a Git repository/);
  });
});

describe('assertPathInsideProject', () => {
  it('allows the root itself', () => {
    expect(assertPathInsideProject(repo, repo)).toBeTruthy();
  });

  it('allows a nested valid path (case-insensitive on Windows)', () => {
    const nested = join(repo, 'src', 'index.ts');
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(nested, '');
    const allowed = assertPathInsideProject(repo, nested);
    expect(allowed.toLowerCase()).toContain('src'.toLowerCase());
  });

  it('rejects a path outside the project', () => {
    const outside = join(tmp, 'elsewhere');
    mkdirSync(outside, { recursive: true });
    expect(() => assertPathInsideProject(repo, outside)).toThrow(/outside the project/);
  });

  it('rejects a traversal escape', () => {
    const escape = join(repo, '..', '..', tmp.split(join('..'))[0] ?? 'tmp');
    expect(() => assertPathInsideProject(repo, escape)).toThrow(/outside the project/);
  });

  it('assertIsGitRoot rejects a non-git directory', () => {
    const plain = join(tmp, 'plain');
    mkdirSync(plain, { recursive: true });
    expect(() => assertIsGitRoot(plain)).toThrow(/[Nn]ot a Git repository/);
  });
});

describe('symlink/junction escape (where supported)', () => {
  it('rejects a symlink escaping the root when realpath resolves', () => {
    const outside = join(tmp, 'outside');
    mkdirSync(outside, { recursive: true });
    const link = join(repo, 'escape-link');
    try {
      symlinkSync(outside, link, 'junction');
    } catch {
      return; // junction/symlink support not available in this environment
    }
    if (existsSync(link)) {
      expect(() => assertPathInsideProject(repo, link)).toThrow(/outside the project/);
    }
  });
});
