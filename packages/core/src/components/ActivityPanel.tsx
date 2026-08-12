import { useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronRight, ShieldAlert, Terminal } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { ApprovalPanel } from './ApprovalPanel.js';
import { ExecutionPanel } from './ExecutionPanel.js';

export function ActivityPanel() {
  const approvals = useWorkspaceStore((s) => s.approvals);
  const executions = useWorkspaceStore((s) => s.executions);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const raw = useWorkspaceStoreRaw();
  const [expanded, setExpanded] = useState(true);

  const projectApprovals = approvals.filter((a) => a.projectId === activeProjectId);
  const projectExecutions = executions.filter((e) => e.projectId === activeProjectId);
  const pendingApprovals = projectApprovals.filter((a) => a.status === 'requested').length;

  return (
    <section style={panelStyle} data-testid="activity-panel">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={headerStyle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse approval and evidence' : 'Expand approval and evidence'}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <ShieldAlert size={13} />
        <span>Approval &amp; Evidence</span>
        {pendingApprovals > 0 && <span style={pendingBadgeStyle}>{pendingApprovals} pending</span>}
        <span style={countStyle}>
          <Terminal size={10} /> {projectExecutions.length}
        </span>
        <div style={{ flex: 1 }} />
      </button>
      {expanded && (
        <div style={bodyStyle}>
          <ApprovalPanel
            approvals={projectApprovals}
            onApprove={(approvalId) => raw.getState().approveApproval('', approvalId)}
            onReject={(approvalId) => raw.getState().rejectApproval('', approvalId)}
          />
          <ExecutionPanel
            executions={projectExecutions}
            onCancel={(executionId) => raw.getState().cancelExecution(executionId)}
          />
        </div>
      )}
    </section>
  );
}

const panelStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 120,
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
};

const pendingBadgeStyle: CSSProperties = {
  background: 'rgba(245, 158, 11, 0.18)',
  color: '#f59e0b',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
};

const countStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#60a5fa',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
};

const bodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
};
