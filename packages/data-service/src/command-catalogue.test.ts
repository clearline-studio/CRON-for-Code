import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildCommandCatalogue,
  resolveCommand,
  assertNotForbidden,
  FORBIDDEN_GIT_MUTATIONS,
} from './command-catalogue.js';
import { resolveProjectRoot } from './project-boundary.js';

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
let ctx: { repoRoot: string; pnpmScriptPath: string };

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'cron-catalogue-'));
  repo = join(tmp, 'repo');
  makeGitRepo(repo);
  mkdirSync(join(repo, 'node_modules', 'pnpm', 'bin'), { recursive: true });
  writeFileSync(join(repo, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'), '');
  ctx = {
    repoRoot: repo,
    pnpmScriptPath: join(repo, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  };
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('command catalogue structure', () => {
  it('catalogue has the required first-version command ids', () => {
    const ids = buildCommandCatalogue().map((c) => c.id);
    for (const id of [
      'repo.identity',
      'repo.status',
      'repo.diff-check',
      'repo.changed-files',
      'repo.untracked-files',
      'repo.diff-stat',
      'repo.diff-name-status',
      'repo.diff',
      'project.test',
      'project.typecheck',
      'project.lint',
      'project.format-check',
      'project.build',
      'project.package-test',
      'node.syntax-check',
      'powershell.script-test',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('every catalogue entry requires approval in this slice', () => {
    for (const entry of buildCommandCatalogue()) {
      expect(entry.requiresApproval).toBe(true);
    }
  });

  it('resolves repo.status to a fixed git argument vector', () => {
    const resolved = resolveCommand('repo.status', undefined, ctx);
    expect(resolved.executable).toBe('git');
    expect(resolved.args).toEqual(['status', '--short']);
    expect(resolved.displayCommand).toBe('git status --short');
    expect(resolved.command.readOnly).toBe(true);
  });

  it('unknown command id throws', () => {
    expect(() => resolveCommand('not.a.command', undefined, ctx)).toThrow(/Unknown command id/);
  });
});

describe('structured argument safety', () => {
  it('rejects shell metacharacters in parameters', () => {
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(join(repo, 'scripts', 'x.ps1'), '');
    for (const bad of ['x;y', 'a|b', 'a&b', 'a`b', 'a<b', 'a>b', 'a$(b)', 'a\nb', 'a&&b', 'a||b']) {
      expect(() =>
        resolveCommand('powershell.script-test', { script: bad }, ctx),
      ).toThrow(/not allowed|injection/i);
    }
  });

  it('rejects path traversal in parameters', () => {
    const script = join(repo, 'scripts', 'ok.ps1');
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(script, '');
    expect(() =>
      resolveCommand('powershell.script-test', { script: '../../evil.ps1' }, ctx),
    ).toThrow(/traversal/);
    expect(() =>
      resolveCommand('powershell.script-test', { script: 'C:/Windows/x.ps1' }, ctx),
    ).toThrow(/absolute/);
  });

  it('requires params to live under the declared namespace', () => {
    writeFileSync(join(repo, 'root.ps1'), '');
    expect(() =>
      resolveCommand('powershell.script-test', { script: 'root.ps1' }, ctx),
    ).toThrow(/must be under "scripts"/);
  });

  it('rejects unsupported file extensions', () => {
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(join(repo, 'scripts', 'x.txt'), '');
    expect(() =>
      resolveCommand('powershell.script-test', { script: 'scripts/x.txt' }, ctx),
    ).toThrow(/Unsupported file type/);
  });

  it('resolves a valid node.syntax-check file', () => {
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'src', 'x.js'), '');
    const resolved = resolveCommand('node.syntax-check', { file: 'src/x.js' }, ctx);
    expect(resolved.executable).toBe('node');
    expect(resolved.args[0]).toBe('--check');
  });

  it('rejects a pnpm script path outside node_modules', () => {
    const bad = join(tmp, 'elsewhere', 'pnpm.cjs');
    mkdirSync(join(tmp, 'elsewhere'), { recursive: true });
    writeFileSync(bad, '');
    expect(() => resolveCommand('project.test', undefined, { ...ctx, pnpmScriptPath: bad })).toThrow(
      /not a valid node_modules path/,
    );
  });

  it('rejects parameters that begin with a dash or dot', () => {
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'src', '.hidden.js'), '');
    writeFileSync(join(repo, 'src', '-flag.js'), '');
    expect(() => resolveCommand('node.syntax-check', { file: 'src/-flag.js' }, ctx)).toThrow(
      /begin with a dash or dot/,
    );
  });
});

describe('allow/deny executable and git mutation rules', () => {
  it('forbids dangerous executables', () => {
    for (const exe of ['cmd.exe', 'cmd', 'pwsh', 'bash', 'sh', 'wsl', 'curl', 'reg.exe', 'taskkill', 'wmic', 'rundll32', 'mshta', 'gh']) {
      expect(() => assertNotForbidden(exe, [])).toThrow(/forbidden/);
    }
  });

  it('forbids arbitrary powershell -Command strings', () => {
    expect(() => assertNotForbidden('powershell.exe', ['-Command', 'Invoke-Expression x'])).toThrow(/forbidden/);
    expect(() => assertNotForbidden('powershell', ['-File', 'x.ps1'])).toThrow(/forbidden/);
  });

  it('allows node and git read-only', () => {
    expect(() => assertNotForbidden('node', ['--check', 'x.js'])).not.toThrow();
    expect(() => assertNotForbidden('git', ['status', '--short'])).not.toThrow();
  });

  it('forbids git mutation subcommands', () => {
    for (const sub of FORBIDDEN_GIT_MUTATIONS) {
      expect(() => assertNotForbidden('git', [sub, 'x']), `git ${sub}`).toThrow(/forbidden/);
    }
  });

  it('allows git inspection subcommands', () => {
    for (const args of [
      ['status', '--short'],
      ['diff', '--check'],
      ['rev-parse', '--show-toplevel'],
      ['ls-files', '--others', '--exclude-standard'],
    ]) {
      expect(() => assertNotForbidden('git', args)).not.toThrow();
    }
  });

  it('resolves commands against a real boundary (integration)', () => {
    const project = resolveProjectRoot(repo);
    const resolved = resolveCommand('repo.status', undefined, { repoRoot: project.gitRoot });
    expect(resolved.args).toEqual(['status', '--short']);
  });
});
