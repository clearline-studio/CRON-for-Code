import type { OpenCodeApprovalReplyInput, OpenCodeApprovalReplyResult, OpenCodeRunEvent, OpenCodeRunInput, OpenCodeRunResult } from '@cron-code/data-service';

export interface OpenCodeRunnerClient {
  runTask(input: OpenCodeRunInput): Promise<OpenCodeRunResult>;
  replyToApproval(input: OpenCodeApprovalReplyInput): Promise<OpenCodeApprovalReplyResult>;
  /** Subscribes to incremental runner activity. Returns an unsubscribe function. */
  onEvent?(callback: (event: OpenCodeRunEvent) => void): () => void;
}

export type {
  OpenCodeApprovalReplyInput,
  OpenCodeApprovalReplyResult,
  OpenCodeRunEvent,
  OpenCodeRunInput,
  OpenCodeRunResult,
  OpenCodeRunStatus,
} from '@cron-code/data-service';
