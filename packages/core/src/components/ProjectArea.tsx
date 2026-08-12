import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { Plus, FolderOpen, ExternalLink, Copy } from 'lucide-react';

export function ProjectArea({ onSelectProject }: { onSelectProject: () => void }) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const copyConfirm = useWorkspaceStore((s) => s.copyConfirm);
  const raw = useWorkspaceStoreRaw();
  const activeProject = projects.find((p) => p.id === activeId);

  if (!activeProject) return null;

  const isCopying = copyConfirm?.path === activeProject.rootPath;

  return (
    <div style={stripStyle}>
      <div style={leftGroupStyle}>
        <FolderOpen size={14} style={{ color: 'var(--cron-accent)', flexShrink: 0 }} />
        <span style={projectNameStyle}>{activeProject.name}</span>
        <span style={pathStyle}>{activeProject.rootPath}</span>
        <span style={branchPillStyle}>
          <span style={{ color: '#8da4c7' }}>main</span>
          <span style={devBadgeStyle}>DEV</span>
        </span>
      </div>
      <div style={rightGroupStyle}>
        <button
          type="button"
          onClick={() => raw.getState().revealProject(activeProject.id)}
          style={actionBtnStyle}
          title="Open in File Explorer"
        >
          <ExternalLink size={12} />
          <span style={actionBtnLabelStyle}>Reveal</span>
        </button>
        <button
          type="button"
          onClick={() => raw.getState().copyProjectPath(activeProject.id)}
          style={actionBtnStyle}
        >
          <Copy size={12} />
          <span style={actionBtnLabelStyle}>{isCopying ? 'Copied' : 'Copy Path'}</span>
        </button>
        <span style={sepStyle} />
        <button onClick={onSelectProject} style={newProjectBtnStyle}>
          <Plus size={13} />
          <span style={actionBtnLabelStyle}>New Project</span>
        </button>
      </div>
    </div>
  );
}

const stripStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: '1px solid var(--cron-panel-border)',
  color: 'var(--cron-panel-text-muted)',
  fontSize: 'var(--cron-font-size-sm)',
  fontFamily: 'var(--cron-font-family)',
  background: 'rgba(4, 16, 36, 0.82)',
  flexShrink: 0,
  userSelect: 'none',
  gap: 12,
  minWidth: 0,
};

const leftGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  flex: 1,
};

const rightGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
};

const projectNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--cron-accent)',
  fontSize: 'var(--cron-font-size-md)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 200,
};

const pathStyle: React.CSSProperties = {
  color: 'var(--cron-panel-text-muted)',
  fontSize: 'var(--cron-font-size-xs)',
  opacity: 0.7,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flex: 1,
  minWidth: 0,
};

const branchPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '2px 8px',
  borderRadius: 4,
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(80, 140, 220, 0.18)',
  fontSize: 'var(--cron-font-size-xs)',
  flexShrink: 0,
};

const devBadgeStyle: React.CSSProperties = {
  padding: '1px 4px',
  border: '1px solid rgba(239,68,68,.8)',
  color: '#ff6b6b',
  background: 'rgba(120,12,22,.25)',
  fontSize: 7,
  fontWeight: 700,
  letterSpacing: 0.7,
  borderRadius: 3,
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  border: '1px solid rgba(100,160,255,.25)',
  background: 'rgba(18,63,134,.15)',
  color: '#8da4c7',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'var(--cron-font-family)',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};

const actionBtnLabelStyle: React.CSSProperties = {
  display: 'inline',
};

const newProjectBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 10px',
  border: '1px solid rgba(100,160,255,.38)',
  background: 'rgba(18,63,134,.25)',
  color: '#8fbaff',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'var(--cron-font-family)',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};

const sepStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: 'rgba(80, 140, 220, 0.2)',
  margin: '0 4px',
};
