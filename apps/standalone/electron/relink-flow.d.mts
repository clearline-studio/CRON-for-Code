export interface RelinkOkResult {
  status: 'ok';
  project: Record<string, unknown>;
}

export interface RelinkCancelledResult {
  status: 'cancelled';
}

export interface RelinkConflictResult {
  status: 'conflict';
  project: Record<string, unknown>;
  conflictProjectId: string;
  conflictRootPath: string;
}

export type RelinkOutcome = RelinkOkResult | RelinkCancelledResult | RelinkConflictResult;

export type LinkRootPathFn = (
  projectId: string,
  rootPath: string,
) => Promise<{
  project: Record<string, unknown>;
  conflict?: { conflictProjectId: string; conflictRootPath: string };
}>;

export declare function resolveRelinkOutcome(
  dialogResult: { canceled: boolean; filePaths: string[] } | null | undefined,
  projectId: string,
  linkRootPath: LinkRootPathFn,
): Promise<RelinkOutcome>;
