import path from 'node:path';
import { existsSync } from 'node:fs';
import { createExecutionError } from '@cron-code/contracts';
import type { ExecutionCommand, CommandCategory, OutputType, RiskCategory } from '@cron-code/contracts';
import type { ExecutionError } from '@cron-code/contracts';

export const FORBIDDEN_EXECUTABLES: readonly string[] = [
  'cmd.exe',
  'cmd',
  'powershell.exe',
  'powershell',
  'pwsh.exe',
  'pwsh',
  'bash',
  'sh',
  'wsl',
  'wsl.exe',
  'curl',
  'curl.exe',
  'wget',
  'certutil',
  'certutil.exe',
  'bitsadmin',
  'reg',
  'reg.exe',
  'schtasks',
  'schtasks.exe',
  'sc.exe',
  'sc',
  'wmic',
  'wmic.exe',
  'taskkill',
  'taskkill.exe',
  'rundll32',
  'rundll32.exe',
  'mshta',
  'mshta.exe',
  'gh',
  'gh.exe',
];

export const FORBIDDEN_GIT_MUTATIONS: readonly string[] = [
  'add',
  'commit',
  'push',
  'pull',
  'fetch',
  'merge',
  'rebase',
  'tag',
  'reset',
  'restore',
  'clean',
  'checkout',
  'switch',
  'stash',
  'cherry-pick',
  'revert',
  'remote',
  'gc',
  'prune',
  'filter-branch',
  'update-index',
  'update-ref',
];

const SHELL_METACHARACTERS = /[;|&`<>()\r\n\t]/;
const INJECTION_PATTERNS = /\$\s*\(|&&|\|\||>|>>|<|\n|\r|`/;

export interface CommandParamSpec {
  readonly kind: 'file' | 'script';
  /** Allowed path namespace relative to the git root (e.g. '' for anywhere, 'scripts' for scripts dir). */
  readonly allowUnder: string;
  readonly allowedExtensions: readonly string[];
}

export interface CommandTemplate {
  readonly id: string;
  readonly category: CommandCategory;
  readonly displayTemplate: string;
  readonly executable: string;
  readonly fixedArgs: readonly string[];
  readonly params?: Record<string, CommandParamSpec>;
  readonly timeoutMs: number;
  readonly requiresApproval: boolean;
  readonly readOnly: boolean;
  readonly outputType: OutputType;
  readonly risk: RiskCategory;
}

export interface CommandCatalogueContext {
  /** Repository git root (the cwd for every catalogue command). */
  readonly repoRoot: string;
  /** Absolute path to the pnpm cli script (validated to live under node_modules). */
  readonly pnpmScriptPath?: string;
}

export interface ResolvedCommand {
  readonly command: ExecutionCommand;
  readonly executable: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
}

function template(
  id: string,
  category: CommandCategory,
  displayTemplate: string,
  executable: string,
  fixedArgs: readonly string[],
  options: {
    params?: Record<string, CommandParamSpec>;
    timeoutMs?: number;
    requiresApproval?: boolean;
    readOnly?: boolean;
    outputType?: OutputType;
    risk?: RiskCategory;
  },
): CommandTemplate {
  return {
    id,
    category,
    displayTemplate,
    executable,
    fixedArgs,
    params: options.params,
    timeoutMs: options.timeoutMs ?? 120000,
    requiresApproval: options.requiresApproval ?? true,
    readOnly: options.readOnly ?? true,
    outputType: options.outputType ?? 'text',
    risk: options.risk ?? 'low',
  };
}

export function buildCommandCatalogue(): readonly CommandTemplate[] {
  const git = (id: string, args: readonly string[], outputType: OutputType): CommandTemplate =>
    template(id, 'repo', `git ${args.join(' ')}`, 'git', args, { outputType });

  const pnpm = (id: string, args: readonly string[], outputType: OutputType, risk: RiskCategory = 'low'): CommandTemplate =>
    template(id, 'project', `pnpm ${args.join(' ')}`, 'node', ['{pnpmScript}', ...args], {
      outputType,
      risk,
      readOnly: false,
    });

  return [
    git('repo.identity', ['rev-parse', '--show-toplevel'], 'text'),
    git('repo.status', ['status', '--short'], 'text'),
    git('repo.diff-check', ['diff', '--check'], 'text'),
    git('repo.changed-files', ['diff', '--name-only'], 'text'),
    git('repo.untracked-files', ['ls-files', '--others', '--exclude-standard'], 'text'),
    git('repo.diff-stat', ['diff', '--stat'], 'text'),
    git('repo.diff-name-status', ['diff', '--name-status'], 'text'),
    git('repo.diff', ['diff'], 'diff'),

    pnpm('project.test', ['-r', 'test'], 'text'),
    pnpm('project.typecheck', ['-r', 'run', 'typecheck'], 'text'),
    pnpm('project.lint', ['lint'], 'text'),
    pnpm('project.format-check', ['format:check'], 'text'),
    pnpm('project.build', ['build'], 'text', 'medium'),
    pnpm('project.package-test', ['--filter', '@cron-code/standalone', 'test'], 'text'),

    template('node.syntax-check', 'node', 'node --check <file>', 'node', ['--check'], {
      params: {
        file: { kind: 'file', allowUnder: '', allowedExtensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'] },
      },
      outputType: 'text',
    }),
    template('powershell.script-test', 'powershell', 'powershell -File <script>', 'powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
    ], {
      params: {
        script: { kind: 'script', allowUnder: 'scripts', allowedExtensions: ['.ps1'] },
      },
      outputType: 'text',
    }),
  ];
}

function validateStructuredArg(value: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'Structured argument cannot be empty');
  }
  if (SHELL_METACHARACTERS.test(value)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Shell metacharacters are not allowed in arguments', value);
  }
  if (INJECTION_PATTERNS.test(value)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Injection patterns are not allowed in arguments', value);
  }
  if (/^[.-]/.test(value)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Arguments cannot begin with a dash or dot', value);
  }
}

function resolveProjectRelativePath(repoRoot: string, relative: string, spec: CommandParamSpec): string {
  const normalized = relative.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '.')) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Path traversal is not allowed in parameters', relative);
  }
  if (path.isAbsolute(normalized)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Parameter must be project-relative, not absolute', relative);
  }
  if (parts.some((part) => part.startsWith('-'))) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Arguments cannot begin with a dash or dot', relative);
  }
  validateStructuredArg(relative);
  const namespace = spec.allowUnder ? spec.allowUnder.split('/') : [];
  for (let i = 0; i < namespace.length; i += 1) {
    if (parts[i] !== namespace[i]) {
      throw createExecutionError('FORBIDDEN_ARGUMENT', `Parameter must be under "${spec.allowUnder}"`, relative);
    }
  }
  const ext = path.extname(normalized).toLowerCase();
  if (!spec.allowedExtensions.includes(ext)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', `Unsupported file type for this command: ${ext}`, relative);
  }
  const absolute = path.resolve(repoRoot, normalized);
  if (!absolute.startsWith(repoRoot + path.sep)) {
    throw createExecutionError('FORBIDDEN_ARGUMENT', 'Parameter escapes the repository root', relative);
  }
  if (!existsSync(absolute)) {
    throw createExecutionError('INVALID_REQUEST', 'Parameter file does not exist', relative);
  }
  return absolute;
}

/** Denies forbidden executables and Git mutation subcommands. Defense in depth. */
export function assertNotForbidden(executable: string, args: readonly string[]): void {
  const base = path.basename(executable).toLowerCase();
  if (FORBIDDEN_EXECUTABLES.includes(base)) {
    throw createExecutionError('FORBIDDEN_EXECUTABLE', `Executable is forbidden: ${base}`);
  }
  if (base === 'git') {
    const first = args.find((arg) => !arg.startsWith('-'));
    if (first && FORBIDDEN_GIT_MUTATIONS.includes(first)) {
      throw createExecutionError('FORBIDDEN_ARGUMENT', `Git mutation command is forbidden: git ${first}`);
    }
  }
}

/** Resolves a catalogue command id + validated params into a concrete executable/args. */
export function resolveCommand(
  id: string,
  params: Record<string, string> | undefined,
  ctx: CommandCatalogueContext,
): ResolvedCommand {
  const templateEntry = buildCommandCatalogue().find((t) => t.id === id);
  if (!templateEntry) {
    throw createExecutionError('UNKNOWN_COMMAND', `Unknown command id: ${id}`);
  }

  const args: string[] = [];
  for (const fixed of templateEntry.fixedArgs) {
    if (fixed === '{pnpmScript}') {
      const pnpm = ctx.pnpmScriptPath;
      if (!pnpm) {
        throw createExecutionError('INVALID_REQUEST', 'pnpm script path not provided');
      }
      const normPnpm = path.resolve(pnpm);
      const nodeModules = path.resolve(ctx.repoRoot, 'node_modules');
      if (!normPnpm.startsWith(nodeModules + path.sep) || !existsSync(normPnpm)) {
        throw createExecutionError('FORBIDDEN_ARGUMENT', 'pnpm script path is not a valid node_modules path', pnpm);
      }
      args.push(normPnpm);
      continue;
    }
    args.push(fixed);
  }

  for (const [name, spec] of Object.entries(templateEntry.params ?? {})) {
    const value = params?.[name];
    if (value === undefined) {
      throw createExecutionError('INVALID_REQUEST', `Missing required parameter: ${name}`);
    }
    const resolved = resolveProjectRelativePath(ctx.repoRoot, value, spec);
    args.push(resolved);
  }

  // Validate fixed args too (defense in depth against catalogue defects).
  for (const arg of args) {
    if (SHELL_METACHARACTERS.test(arg)) {
      throw createExecutionError('FORBIDDEN_ARGUMENT', 'Shell metacharacters in resolved arguments', arg);
    }
  }

  const executable = templateEntry.executable;
  assertNotForbidden(executable, args);

  const displayCommand = templateEntry.displayTemplate.replace(/<[^>]+>/g, (match) => {
    const name = match.slice(1, -1);
    return params?.[name] ?? match;
  });

  const command: ExecutionCommand = {
    id: templateEntry.id,
    category: templateEntry.category,
    displayCommand,
    executable,
    args,
    readOnly: templateEntry.readOnly,
    requiresApproval: templateEntry.requiresApproval,
    timeoutMs: templateEntry.timeoutMs,
    outputType: templateEntry.outputType,
    risk: templateEntry.risk,
  };

  return { command, executable, args, displayCommand };
}

export { createExecutionError };
export type { ExecutionError };
