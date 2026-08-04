import { FolderOpen, Plus, MessageSquare, Settings, User, Shield, Activity } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { type CSSProperties } from 'react';

interface SidebarProps {
  onSelectProject: () => void;
}

export function Sidebar({ onSelectProject }: SidebarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeId);
  const store = useWorkspaceStoreRaw();

  return (
    <div style={railStyle}>
      <div style={sectionHeaderStyle}>PROJECTS</div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px', minHeight: 0 }}>
        {projects.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div key={p.id}>
              <div
                onClick={() => store.getState().selectProject(p.id)}
                style={projectItemStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <FolderOpen size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
              </div>
              {isActive && (
                <div style={chatEntryStyle}>
                  <div style={chatItemStyle}>
                    <MessageSquare size={11} />
                    <span>General chat</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {projects.length === 0 && (
          <div style={{ padding: 12, color: 'var(--cron-panel-text-muted)', fontSize: 'var(--cron-font-size-sm)', textAlign: 'center' }}>
            No projects yet
          </div>
        )}
      </div>

      <div style={blockStyle}>
        <div style={blockHeaderStyle}>CURRENT PROJECT</div>
        <div style={blockBodyStyle}>
          <div>Repo: {activeProject ? activeProject.name : 'Not opened'}</div>
          <div>Branch: —</div>
          <div>Phase: <span style={{ color: '#3b82f6' }}>Plan</span></div>
          <div style={safetyRowStyle}>
            <Shield size={10} color="#22c55e" />
            <span style={{ color: '#22c55e' }}>Safety: Locked</span>
          </div>
          <div>Last Check: —</div>
        </div>
      </div>

      <div style={blockStyle}>
        <div style={blockHeaderStyle}>AGENT STATE</div>
        <div style={blockBodyStyle}>
          <div style={statusRowStyle}>
            <Activity size={9} color="#38bdf8" />
            <span>CC: <span style={{ color: '#38bdf8' }}>Waiting</span></span>
          </div>
          <div style={statusRowStyle}>
            <Shield size={9} color="#f59e0b" />
            <span>Review: <span style={{ color: '#f59e0b' }}>Locked</span></span>
          </div>
          <div style={statusRowStyle}>
            <Shield size={9} color="#f59e0b" />
            <span>Release: <span style={{ color: '#f59e0b' }}>Locked</span></span>
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--cron-panel-border)' }}>
        <button onClick={onSelectProject} style={sidebarBtnStyle}>
          <Plus size={15} />
          Add Project
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--cron-panel-border)', padding: '4px 4px 30px' }}>
        <div style={bottomLinkStyle}>
          <Settings size={13} style={{ opacity: 0.5 }} />
          <span>Settings</span>
        </div>
        <div style={bottomLinkStyle}>
          <User size={13} style={{ opacity: 0.5 }} />
          <span>Account</span>
        </div>
      </div>
    </div>
  );
}

const railStyle: CSSProperties = {
  width: 'clamp(150px, 13vw, 220px)',
  background: 'linear-gradient(180deg, #030711 0%, #07111f 45%, #0b1d36 100%)',
  borderRight: '1px solid var(--cron-panel-border)',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--cron-panel-text)',
  fontFamily: 'var(--cron-font-family)',
  userSelect: 'none',
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  padding: '9px 14px',
  borderBottom: '1px solid var(--cron-panel-border)',
  fontSize: 'var(--cron-font-size-xs)',
  fontWeight: 700,
  color: 'var(--cron-panel-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  flexShrink: 0,
};

const projectItemStyle = (active: boolean): CSSProperties => ({
  padding: '5px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  background: active ? 'var(--cron-accent-subtle)' : 'transparent',
  color: active ? '#eaf2ff' : 'var(--cron-panel-text)',
  fontSize: 'var(--cron-font-size-md)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 1,
  border: active ? '1px solid rgba(59, 130, 246, 0.18)' : '1px solid transparent',
});

const chatEntryStyle: CSSProperties = {
  paddingLeft: 22,
  fontSize: 'var(--cron-font-size-xs)',
  color: 'var(--cron-panel-text-muted)',
};

const chatItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 8px',
  borderRadius: 5,
  cursor: 'default',
};

const blockStyle: CSSProperties = {
  borderTop: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
};

const blockHeaderStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--cron-panel-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
};

const blockBodyStyle: CSSProperties = {
  padding: '2px 12px 6px',
  fontSize: 'var(--cron-font-size-xs)',
  color: 'var(--cron-panel-text-muted)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const safetyRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const sidebarBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px',
  background: 'var(--cron-accent-subtle)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.15)',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontWeight: 500,
};

const bottomLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  color: 'var(--cron-panel-text-muted)',
  fontSize: 'var(--cron-font-size-sm)',
  marginBottom: 1,
};
