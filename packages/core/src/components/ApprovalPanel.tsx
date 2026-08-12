import { type CSSProperties } from 'react';
import { Check, ShieldAlert, X } from 'lucide-react';
import type { Approval } from '@cron-code/contracts';

interface ApprovalPanelProps {
  approvals: Approval[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export function ApprovalPanel({ approvals, onApprove, onReject }: ApprovalPanelProps) {
  const pending = approvals.filter((a) => a.status === 'requested');
  const resolved = approvals.filter((a) => a.status !== 'requested');

  if (pending.length === 0 && resolved.length === 0) {
    return null;
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <ShieldAlert size={13} />
        <span>Approvals</span>
        {pending.length > 0 && <span style={badgeStyle}>{pending.length} pending</span>}
      </div>

      {pending.length === 0 && resolved.length > 0 && (
        <div style={emptyNoteStyle}>No pending approvals.</div>
      )}

      {pending.map((approval) => (
        <div key={approval.id} style={cardStyle}>
          <div style={riskRowStyle}>
            <span style={commandStyle}>{approval.commandSummary ?? approval.description}</span>
            {approval.riskCategory && (
              <span style={riskBadgeStyle(approval.riskCategory)}>{approval.riskCategory}</span>
            )}
          </div>
          <div style={metaStyle}>
            {approval.commandId && <span>cmd: {approval.commandId}</span>}
            {approval.cwd && <span>cwd: {approval.cwd}</span>}
          </div>
          <div style={metaStyle}>Requested by {approval.requester ?? 'cron'}</div>
          {approval.reason && <div style={reasonStyle}>Reason: {approval.reason}</div>}
          <div style={actionsStyle}>
            <button type="button" onClick={() => onApprove(approval.id)} style={approveBtnStyle}>
              <Check size={12} /> Approve
            </button>
            <button type="button" onClick={() => onReject(approval.id)} style={rejectBtnStyle}>
              <X size={12} /> Reject
            </button>
          </div>
        </div>
      ))}

      {resolved.map((approval) => (
        <div key={approval.id} style={resolvedRowStyle}>
          <span style={statusTextStyle(approval.status)}>{approval.status.toUpperCase()}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {approval.commandSummary ?? approval.description}
          </span>
          {approval.reason && <span style={{ color: 'var(--cron-text-tertiary)' }}>— {approval.reason}</span>}
        </div>
      ))}
    </div>
  );
}

const panelStyle: CSSProperties = {
  borderTop: '1px solid var(--cron-surface-border)',
  background: 'rgba(4, 16, 36, 0.82)',
  padding: 'var(--cron-space-sm) var(--cron-space-md)',
  fontFamily: 'var(--cron-font-family)',
  maxHeight: 260,
  overflow: 'auto',
  flexShrink: 0,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#79adff',
  fontWeight: 700,
  fontSize: 'var(--cron-font-size-sm)',
  padding: '4px 0',
};

const badgeStyle: CSSProperties = {
  background: 'rgba(245, 158, 11, 0.18)',
  color: '#f59e0b',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
};

const emptyNoteStyle: CSSProperties = {
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-sm)',
  padding: '6px 0',
};

const cardStyle: CSSProperties = {
  border: '1px solid rgba(245, 158, 11, 0.35)',
  background: 'rgba(120, 60, 12, 0.12)',
  borderRadius: 6,
  padding: 'var(--cron-space-sm)',
  margin: '6px 0',
};

const riskRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const commandStyle: CSSProperties = {
  color: 'var(--cron-text-primary)',
  fontWeight: 600,
  fontFamily: 'var(--cron-font-mono)',
  fontSize: 'var(--cron-font-size-sm)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const riskBadgeStyle = (risk: string): CSSProperties => ({
  padding: '1px 6px',
  borderRadius: 8,
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#22c55e',
  border: `1px solid ${risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#22c55e'}44`,
});

const metaStyle: CSSProperties = {
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-mono)',
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 4,
};

const reasonStyle: CSSProperties = {
  color: 'var(--cron-text-secondary)',
  fontSize: 'var(--cron-font-size-xs)',
  marginTop: 4,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 8,
};

const approveBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 12px',
  border: '1px solid rgba(34, 197, 94, 0.5)',
  background: 'rgba(22, 101, 52, 0.35)',
  color: '#4ade80',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const rejectBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 12px',
  border: '1px solid rgba(239, 68, 68, 0.5)',
  background: 'rgba(127, 29, 29, 0.3)',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const resolvedRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '3px 0',
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-xs)',
};

const statusTextStyle = (status: string): CSSProperties => ({
  color: status === 'approved' ? '#22c55e' : status === 'rejected' ? '#ef4444' : '#5f7392',
  fontWeight: 700,
  fontSize: 9,
});
