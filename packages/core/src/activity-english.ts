import type { OpenCodeRunEvent, OpenCodeRunStatus, OpenCodeRunResult } from './opencode-client.js';

/**
 * Plain-English mapping for the normal coding workspace.
 * Venessa is not a programmer: session/permission/execution IDs and internal
 * endpoint names belong in Review/Evidence, never in the normal activity trail.
 * This module is the single translation point for user-facing activity language.
 */

const STATUS_LABELS: Record<OpenCodeRunStatus, string> = {
  queued: 'Waiting',
  validating: 'Checking project',
  awaiting_approval: 'Waiting for approval',
  starting: 'Starting',
  running: 'Working',
  verifying: 'Checking',
  completed: 'Done',
  failed: 'Failed',
  blocked: 'Needs attention',
  cancelled: 'Cancelled',
};

export function humanizeStatus(status: OpenCodeRunStatus): string {
  return STATUS_LABELS[status] ?? 'Working';
}

const ID_PATTERN = /\b(?:ses|per|msg|cl|call|exe|task|appr|prt|aud)_[A-Za-z0-9_-]+/g;

function stripInternalIds(text: string): string {
  return text.replace(ID_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}

const MESSAGE_TRANSLATIONS: Array<{ match: RegExp; replace: string }> = [
  { match: /^Task accepted by CRON runner boundary$/i, replace: 'Task handed to the coding agent.' },
  { match: /^Validating project and Git repository boundary$/i, replace: 'Confirming the selected repository and boundaries.' },
  { match: /^OpenCode server session [A-Za-z0-9_-]+ created$/i, replace: 'Coding session started.' },
  { match: /^OpenCode (server session )?permission requested: /i, replace: 'OpenCode wants permission to ' },
  { match: /^OpenCode requests /i, replace: 'OpenCode wants to ' },
  { match: /^OpenCode permission [A-Za-z0-9_-]+ answered in session [A-Za-z0-9_-]+$/i, replace: 'Permission answered. Continuing the task.' },
  { match: /^Edit permission approved\.?/i, replace: 'Edit permission approved. Continuing the task.' },
  { match: /^Verifying OpenCode result after approval$/i, replace: 'Verifying the requested change.' },
  { match: /^OpenCode session resumed$/i, replace: 'Continuing the task in the same session.' },
  { match: /^OpenCode same-session (resume|approval)/i, replace: 'Continuing the task.' },
  { match: /^OpenCode completed without output$/i, replace: 'Coding work finished.' },
  { match: /^OpenCode server session completed$/i, replace: 'Coding work finished.' },
  { match: /^OpenCode server completed$/i, replace: 'Coding work finished.' },
  { match: /^OpenCode runner completed$/i, replace: 'Coding work finished.' },
  { match: /^Repository validated; preparing OpenCode runner$/i, replace: 'Project confirmed. Starting the coding agent.' },
  { match: /^Capturing OpenCode runner result$/i, replace: 'Checking the result.' },
  { match: /^OpenCode runner started with .*/i, replace: 'The coding agent started.' },
  { match: /^OpenCode CLI process launched$/i, replace: 'The coding agent started.' },
  { match: /^OpenCode needs approval to /i, replace: 'OpenCode wants permission to ' },
  { match: /^OpenCode permission rejected/i, replace: 'The request was cancelled.' },
  { match: /^OpenCode exited with code \d+$/i, replace: 'The coding agent stopped with an error.' },
  { match: /^Coding model is not allowed for this runner: .*/i, replace: 'That coding model is not allowed for this task.' },
  { match: /^Cannot run OpenCode task in state .*/i, replace: 'This task cannot run in its current state.' },
  { match: /^Timed out waiting for OpenCode session.*/i, replace: 'The coding agent took too long to respond.' },
  { match: /^OpenCode execution interface is not available.*/i, replace: 'The coding agent could not start.' },
  { match: /^OpenCode runner is not connected/i, replace: 'The coding agent is not connected yet.' },
  { match: /^OpenCode approval is already .*/i, replace: 'This permission was already answered.' },
  { match: /^OpenCode approval\/task mismatch$/i, replace: 'This permission belongs to a different request.' },
  { match: /^OpenCode approval not found/i, replace: 'This permission is no longer available.' },
  { match: /^OpenCode needs permission to /i, replace: 'OpenCode wants permission to ' },
];

/** Translates a raw runner summary/blocker/error line for the normal surface. */
export function humanizeSummary(text: string | null | undefined): string {
  const source = String(text || '').trim();
  if (!source) return '';
  for (const entry of MESSAGE_TRANSLATIONS) {
    if (entry.match.test(source)) {
      return stripInternalIds(source.replace(entry.match, entry.replace));
    }
  }
  return stripInternalIds(source);
}

const FRIENDLY_MODEL_NAMES: Record<string, string> = {
  'deepseek/deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek/deepseek-v4-pro': 'DeepSeek V4 Pro (deeper reasoning)',
};

export function friendlyModelName(model: string | null | undefined): string {
  const value = String(model || '').trim();
  return FRIENDLY_MODEL_NAMES[value] ?? (value || 'Coding agent');
}

export function humanizeEvent(event: OpenCodeRunEvent): { status: string; message: string } {
  let message = event.message?.trim() ?? '';
  for (const entry of MESSAGE_TRANSLATIONS) {
    if (entry.match.test(message)) {
      message = message.replace(entry.match, entry.replace);
      break;
    }
  }
  return { status: humanizeStatus(event.status), message: stripInternalIds(message) };
}

/** Translates the runner's technical status into the conversational trail label. */
export function activityLabelFor(status: OpenCodeRunStatus): string {
  return humanizeStatus(status);
}

export interface ActivitySummary {
  status: OpenCodeRunStatus;
  headline: string;
  created: string[];
  checked: string;
  tests: string;
  changedCount: number;
}

/** Builds the concise final result summary shown in the normal workspace. */
export function summarizeActivity(result: OpenCodeRunResult | null | undefined): ActivitySummary | null {
  if (!result) return null;
  if (result.status === 'completed') {
    const created = result.record?.output.stdout
      ? extractChangedPaths(result.record.output.stdout)
      : [];
    const changedCount = created.length;
    return {
      status: 'completed',
      headline: 'Task completed.',
      created,
      checked: 'The requested change was verified.',
      tests: 'Not required for this task',
      changedCount,
    };
  }
  if (result.status === 'awaiting_approval') {
    const target = result.approval?.target ?? result.approval?.patterns?.[0] ?? null;
    return {
      status: 'awaiting_approval',
      headline: target ? `OpenCode wants to edit ${target}.` : 'OpenCode needs your approval.',
      created: [],
      checked: '',
      tests: '',
      changedCount: 0,
    };
  }
  if (result.status === 'cancelled') {
    return {
      status: 'cancelled',
      headline: 'Task cancelled. No file changes were made.',
      created: [],
      checked: '',
      tests: '',
      changedCount: 0,
    };
  }
  if (result.status === 'failed') {
    return {
      status: 'failed',
      headline: result.blocker ?? result.summary ?? 'The task could not be completed.',
      created: [],
      checked: '',
      tests: '',
      changedCount: 0,
    };
  }
  return null;
}

export function extractChangedPaths(text: string): string[] {
  const paths = new Set<string>();
  for (const match of text.matchAll(/\b(?:changed|created|edited|file(?:\.edited)?):\s*([^\r\n]+)/gi)) {
    const file = match[1]?.trim().split(/\s+/)[0]?.replace(/\\/g, '/');
    if (file && !file.includes(':')) paths.add(file);
  }
  return [...paths];
}
