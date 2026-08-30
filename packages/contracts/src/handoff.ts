/**
 * CRON for Code <-> Intelligence handoff contract.
 *
 * This module is the SINGLE SOURCE OF TRUTH for the shape of the bridge between
 * CRON for Intelligence (the caller) and CRON for Code (the governed coding
 * engine). Both sides build against these types — no drift.
 *
 * Input (Intelligence -> Code):   a repo path + a plain-language task + optional
 *                                 context/attachments.
 * Output (Code -> Intelligence):  progress/status, approval requests, changed
 *                                 files, and verification evidence.
 *
 * HOST-AGNOSTIC: these types carry no Electron, React, DOM, or filesystem
 * import. They are plain serializable data and stay valid across IPC, HTTP, or
 * an in-process call.
 */

export type HandoffStatus =
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

/** Where the handoff originated. Code only ever serves requests from Intelligence. */
export type HandoffSource = 'intelligence';

export interface HandoffProject {
  /** Absolute (or canonical) path to the repository root Code should operate on. */
  readonly repoPath: string;
  /** Display name, when the caller knows it. */
  readonly name?: string;
}

export type HandoffAttachmentKind = 'file' | 'text' | 'diff' | 'image' | 'reference';

export interface HandoffAttachment {
  readonly kind: HandoffAttachmentKind;
  /** File name / label, when applicable. */
  readonly name?: string;
  /** Path to the attachment when it points at a real file. */
  readonly path?: string;
  /** Raw content when the attachment is carried inline. */
  readonly content?: string;
  /** MIME type, when known. */
  readonly mime?: string;
}

export interface HandoffContext {
  readonly attachments?: readonly HandoffAttachment[];
  /** Prior conversation turns, for continuity when the task builds on a chat. */
  readonly conversation?: readonly { role: 'user' | 'assistant'; content: string }[];
}

export interface HandoffRequest {
  /** Unique id for the whole request, echo back on the result so callers can match. */
  readonly requestId: string;
  readonly source: HandoffSource;
  readonly project: HandoffProject;
  /** The plain-language build/fix/create instruction. */
  readonly task: string;
  readonly context?: HandoffContext;
  /** Optional model override. Code applies its own routing/default when omitted. */
  readonly model?: string;
  readonly createdAt: number;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type HandoffApprovalAction = 'read' | 'write' | 'execute' | 'delete';

/** A pending permission Code needs the user to decide before it can proceed. */
export interface HandoffApprovalRequest {
  readonly id: string;
  readonly description: string;
  readonly action: HandoffApprovalAction;
  /** The thing the action targets (file path, command, etc.), when meaningful. */
  readonly target: string | null;
  readonly reason: string;
  readonly patterns: readonly string[];
  readonly requestedAt: number;
}

export type HandoffChangedFileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface HandoffChangedFile {
  readonly path: string;
  readonly status: HandoffChangedFileStatus;
}

export type HandoffEvidenceKind = 'test' | 'output' | 'diff' | 'manual' | 'screenshot';

/** Evidence Code hands back so the caller can trust the change actually happened. */
export interface HandoffEvidence {
  readonly kind: HandoffEvidenceKind;
  readonly description: string;
  /** Optional reference so the caller can locate the underlying record. */
  readonly reference?: string;
  /** Whether the evidence indicates a pass/fail (meaningful for test evidence). */
  readonly pass?: boolean;
}

export interface HandoffError {
  readonly code: string;
  readonly message: string;
}

/** A caller's decision on a pending HandoffApprovalRequest (Intelligence -> Code). */
export interface HandoffApprovalReply {
  /** Echo of the originating request id. */
  readonly requestId: string;
  /** The approval id from HandoffApprovalRequest. */
  readonly approvalId: string;
  readonly decision: 'approve' | 'reject';
  readonly reason?: string;
}

export interface HandoffResult {
  readonly requestId: string;
  readonly status: HandoffStatus;
  /** Human-readable summary of what happened. */
  readonly summary: string;
  /** Why Code is blocked, when status is 'blocked' or 'failed'. */
  readonly blocker: string | null;
  /** Progress in [0, 100], when Code can report it. */
  readonly progress: number | null;
  /** Approval requests surfaced so the caller can render Approve/Reject. */
  readonly approvals: readonly HandoffApprovalRequest[];
  /** Files the run created/modified/deleted. */
  readonly changedFiles: readonly HandoffChangedFile[];
  /** Verification evidence (tests, output, diffs, screenshots). */
  readonly evidence: readonly HandoffEvidence[];
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly error: HandoffError | null;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function createHandoffRequest(input: {
  requestId: string;
  repoPath: string;
  task: string;
  name?: string;
  context?: HandoffContext;
  model?: string;
  createdAt?: number;
}): HandoffRequest {
  return {
    requestId: input.requestId,
    source: 'intelligence',
    project: {
      repoPath: input.repoPath,
      name: input.name,
    },
    task: input.task,
    context: input.context,
    model: input.model,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function createHandoffResult(requestId: string, status: HandoffStatus, summary: string): HandoffResult {
  return {
    requestId,
    status,
    summary,
    blocker: null,
    progress: null,
    approvals: [],
    changedFiles: [],
    evidence: [],
    startedAt: Date.now(),
    completedAt: status === 'completed' ? Date.now() : null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Type guards (serialization-safe — useful across a real transport boundary)
// ---------------------------------------------------------------------------

export function isHandoffRequest(value: unknown): value is HandoffRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    v.source === 'intelligence' &&
    typeof v.task === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.project === 'object' &&
    v.project !== null &&
    typeof (v.project as Record<string, unknown>).repoPath === 'string'
  );
}

export function isHandoffResult(value: unknown): value is HandoffResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    typeof v.summary === 'string' &&
    (v.blocker === null || typeof v.blocker === 'string') &&
    (v.progress === null || typeof v.progress === 'number') &&
    Array.isArray(v.approvals) &&
    Array.isArray(v.changedFiles) &&
    Array.isArray(v.evidence) &&
    typeof v.startedAt === 'number' &&
    (v.completedAt === null || typeof v.completedAt === 'number') &&
    (v.error === null || typeof v.error === 'object')
  );
}

export function isHandoffApprovalReply(value: unknown): value is HandoffApprovalReply {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    typeof v.approvalId === 'string' &&
    (v.decision === 'approve' || v.decision === 'reject') &&
    (v.reason === undefined || typeof v.reason === 'string')
  );
}
