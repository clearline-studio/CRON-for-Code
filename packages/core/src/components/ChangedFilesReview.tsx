import { type CSSProperties, useState } from 'react';
import { FileDiff, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';

interface GitChangeLine {
  path: string;
  status: string;
  additions?: number;
  deletions?: number;
}

interface ChangedFilesReviewProps {
  /** Pass real git status data when wired. Empty = no changes detected. */
  changes?: GitChangeLine[];
  /** True when the git status check is still running. */
  loading?: boolean;
  /** Refreshes git status (caller wires to repo.status execution). */
  onRefresh?: () => void;
}

export function ChangedFilesReview({ changes, loading = false, onRefresh }: ChangedFilesReviewProps) {
  const [expanded, setExpanded] = useState(true);
  const fileCount = changes?.length ?? 0;
  const hasChanges = fileCount > 0;
  const additions = hasChanges ? (changes ?? []).reduce((sum, c) => sum + (c.additions ?? 0), 0) : 0;
  const deletions = hasChanges ? (changes ?? []).reduce((sum, c) => sum + (c.deletions ?? 0), 0) : 0;

  return (
    <section style={panelStyle} data-testid="changed-files-review">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={headerStyle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse changed files' : 'Expand changed files'}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <GitBranch size={13} />
        <span>Changed Files</span>
        {loading && <span style={loadingBadgeStyle}>Scanning...</span>}
        {!loading && hasChanges && (
          <span style={countBadgeStyle}>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
        )}
        {!loading && !hasChanges && (
          <span style={noChangesStyle}>No changes</span>
        )}
        {!loading && hasChanges && additions > 0 && (
          <span style={additionsStyle}>+{additions}</span>
        )}
        {!loading && hasChanges && deletions > 0 && (
          <span style={deletionsStyle}>-{deletions}</span>
        )}
        <div style={{ flex: 1 }} />
        {onRefresh && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            style={refreshBtnStyle}
          >
            Refresh
          </button>
        )}
      </button>
      {expanded && (
        <div style={bodyStyle}>
          {loading && (
            <div style={emptyStateStyle}>Scanning repository for changes...</div>
          )}
          {!loading && hasChanges && (
            <div style={fileListStyle}>
              {(changes ?? []).map((change) => (
                <div key={change.path} style={fileRowStyle}>
                  <span style={statusCharStyle(change.status)}>{change.status}</span>
                  <FileDiff size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
                  <span style={filePathStyle}>{change.path}</span>
                  {change.additions !== undefined && change.additions > 0 && (
                    <span style={diffCountStyle(true)}>+{change.additions}</span>
                  )}
                  {change.deletions !== undefined && change.deletions > 0 && (
                    <span style={diffCountStyle(false)}>-{change.deletions}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Empty state renders NOTHING below the header: no ghost text, no
              reserved vertical area, no clipped rows (Review empty-state repair). */}
        </div>
      )}
    </section>
  );
}

const panelStyle: CSSProperties = {
  flex: '0 1 auto',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  maxHeight: '45%',
  borderTop: '1px solid var(--cron-surface-border)',
  background: 'rgba(4, 16, 36, 0.94)',
  fontFamily: 'var(--cron-font-family)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px var(--cron-space-md)',
  border: 'none',
  background: 'rgba(10, 26, 52, 0.9)',
  color: '#79adff',
  fontWeight: 700,
  fontSize: 'var(--cron-font-size-sm)',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
  borderBottom: '1px solid var(--cron-surface-border)',
  fontFamily: 'var(--cron-font-family)',
};

const bodyStyle: CSSProperties = {
  flex: '0 1 auto',
  minHeight: 0,
  overflow: 'auto',
};

const countBadgeStyle: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#60a5fa',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
};

const loadingBadgeStyle: CSSProperties = {
  background: 'rgba(245, 158, 11, 0.18)',
  color: '#f59e0b',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
  fontStyle: 'italic',
};

const noChangesStyle: CSSProperties = {
  color: '#22c55e',
  fontSize: 10,
  fontStyle: 'italic',
};

const additionsStyle: CSSProperties = {
  color: '#22c55e',
  fontSize: 10,
  fontFamily: 'var(--cron-font-mono)',
};

const deletionsStyle: CSSProperties = {
  color: '#ef4444',
  fontSize: 10,
  fontFamily: 'var(--cron-font-mono)',
};

const refreshBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  border: '1px solid rgba(100,160,255,.3)',
  background: 'rgba(18,63,134,.2)',
  color: '#8da4c7',
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: 'var(--cron-font-family)',
  borderRadius: 3,
};

const emptyStateStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px var(--cron-space-md)',
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-sm)',
};

const fileListStyle: CSSProperties = {
  padding: '4px var(--cron-space-sm)',
  display: 'flex',
  flexDirection: 'column',
};

const fileRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 6px',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-mono)',
  color: 'var(--cron-text-secondary)',
  borderRadius: 3,
  cursor: 'default',
};

const statusCharStyle = (status: string): CSSProperties => ({
  color: status === 'M' ? '#f59e0b' : status === 'A' ? '#22c55e' : status === 'D' ? '#ef4444' : '#8da4c7',
  fontWeight: 700,
  fontSize: 10,
  width: 12,
  textAlign: 'center',
});

const filePathStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const diffCountStyle = (isAddition: boolean): CSSProperties => ({
  color: isAddition ? '#22c55e' : '#ef4444',
  fontSize: 9,
  fontWeight: 600,
  marginLeft: 4,
});
