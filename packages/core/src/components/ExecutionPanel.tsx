import { useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronRight, Square, Terminal } from 'lucide-react';
import type { ExecutionRecord } from '@cron-code/contracts';

interface ExecutionPanelProps {
  executions: ExecutionRecord[];
  onCancel: (executionId: string) => void;
}

export function ExecutionPanel({ executions, onCancel }: ExecutionPanelProps) {
  if (executions.length === 0) {
    return (
      <div style={emptyStyle}>
        <Terminal size={12} />
        <span>No executions yet. Queue a task and approve it to run a safe command.</span>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <Terminal size={13} />
        <span>Executions</span>
        <span style={countStyle}>{executions.length}</span>
      </div>
      {executions.map((execution) => (
        <ExecutionRow key={execution.id} execution={execution} onCancel={onCancel} />
      ))}
    </div>
  );
}

function ExecutionRow({
  execution,
  onCancel,
}: {
  execution: ExecutionRecord;
  onCancel: (executionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = execution.status === 'running';
  const showCancel = active && execution.id.length > 0;

  return (
    <div style={rowStyle}>
      <div style={rowHeaderStyle}>
        <button type="button" onClick={() => setOpen((v) => !v)} style={chevronBtnStyle} aria-label="Expand execution">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span style={statusBadgeStyle(execution.status)}>{execution.status.toUpperCase()}</span>
        <span style={commandStyle}>{execution.displayCommand}</span>
        <span style={metaStyle}>{execution.cwd}</span>
        <div style={{ flex: 1 }} />
        <span style={metaStyle}>
          {execution.startedAt > 0 ? new Date(execution.startedAt).toLocaleTimeString() : ''}
        </span>
        <span style={metaStyle}>
          {execution.endedAt !== null && execution.durationMs !== null
            ? `${execution.durationMs}ms`
            : ''}
        </span>
        <span style={metaStyle}>
          {execution.exitCode !== null ? `exit ${execution.exitCode}` : ''}
        </span>
        {showCancel && (
          <button type="button" onClick={() => onCancel(execution.id)} style={cancelBtnStyle}>
            <Square size={11} /> Cancel
          </button>
        )}
      </div>
      {execution.timeout.exceeded && <div style={noteStyle}>Timed out after {execution.timeout.timeoutMs}ms</div>}
      {execution.cancellation.requested && <div style={noteStyle}>Cancelled on request</div>}
      {execution.error && <div style={errorNoteStyle}>{execution.error.message}</div>}
      {open && (
        <div style={outputStyle}>
          <OutputBlock label="stdout" text={execution.output.stdout} truncated={execution.output.truncated} />
          <OutputBlock label="stderr" text={execution.output.stderr} truncated={execution.output.truncated} />
        </div>
      )}
    </div>
  );
}

function OutputBlock({ label, text, truncated }: { label: string; text: string; truncated: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 400 && !expanded ? `${text.slice(0, 400)}…` : text;
  return (
    <div style={outputBlockStyle}>
      <div style={outputLabelStyle}>
        <span>{label} ({Buffer.byteLength(text, 'utf-8')} bytes)</span>
        {truncated && <span style={{ color: '#f59e0b' }}>truncated</span>}
        {text.length > 400 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} style={expandBtnStyle}>
            {expanded ? 'collapse' : 'expand'}
          </button>
        )}
      </div>
      <pre style={preStyle}>{preview || '(empty)'}</pre>
    </div>
  );
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-sm)',
  padding: 'var(--cron-space-sm) var(--cron-space-md)',
  borderTop: '1px solid var(--cron-surface-border)',
  fontFamily: 'var(--cron-font-family)',
};

const panelStyle: CSSProperties = {
  borderTop: '1px solid var(--cron-surface-border)',
  background: 'rgba(4, 16, 36, 0.82)',
  padding: 'var(--cron-space-sm) var(--cron-space-md)',
  fontFamily: 'var(--cron-font-family)',
  maxHeight: 300,
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

const countStyle: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#60a5fa',
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 8,
};

const rowStyle: CSSProperties = {
  borderTop: '1px solid rgba(80, 140, 220, 0.15)',
  padding: '4px 0',
};

const rowHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 'var(--cron-font-size-xs)',
};

const chevronBtnStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  border: 0,
  background: 'transparent',
  color: 'var(--cron-text-tertiary)',
  cursor: 'pointer',
  padding: 0,
};

const statusBadgeStyle = (status: string): CSSProperties => {
  const colors: Record<string, string> = {
    running: '#3b82f6',
    completed: '#22c55e',
    failed: '#ef4444',
    cancelled: '#5f7392',
    timed_out: '#f59e0b',
  };
  const color = colors[status] ?? '#5f7392';
  return {
    color,
    border: `1px solid ${color}44`,
    padding: '1px 6px',
    borderRadius: 8,
    fontSize: 9,
    fontWeight: 700,
  };
};

const commandStyle: CSSProperties = {
  color: 'var(--cron-text-primary)',
  fontFamily: 'var(--cron-font-mono)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 280,
};

const metaStyle: CSSProperties = {
  color: 'var(--cron-text-tertiary)',
  fontSize: 10,
  fontFamily: 'var(--cron-font-mono)',
  whiteSpace: 'nowrap',
  maxWidth: 220,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const cancelBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  border: '1px solid rgba(239, 68, 68, 0.5)',
  background: 'rgba(127, 29, 29, 0.3)',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const noteStyle: CSSProperties = {
  color: '#f59e0b',
  fontSize: 'var(--cron-font-size-xs)',
  padding: '2px 0 2px 20px',
};

const errorNoteStyle: CSSProperties = {
  color: '#f87171',
  fontSize: 'var(--cron-font-size-xs)',
  padding: '2px 0 2px 20px',
};

const outputStyle: CSSProperties = {
  padding: '4px 0 4px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const outputBlockStyle: CSSProperties = {
  border: '1px solid rgba(80, 140, 220, 0.18)',
  borderRadius: 4,
  background: 'rgba(2, 9, 23, 0.6)',
  overflow: 'hidden',
};

const outputLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '3px 8px',
  color: 'var(--cron-text-tertiary)',
  fontSize: 10,
  fontFamily: 'var(--cron-font-mono)',
};

const expandBtnStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: '#60a5fa',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-mono)',
  fontSize: 10,
  padding: 0,
};

const preStyle: CSSProperties = {
  margin: 0,
  padding: '6px 8px',
  color: '#b7cdf0',
  fontFamily: 'var(--cron-font-mono)',
  fontSize: 'var(--cron-font-size-xs)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 220,
  overflow: 'auto',
};
