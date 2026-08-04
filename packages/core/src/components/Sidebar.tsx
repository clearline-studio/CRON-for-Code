import { FolderOpen, Plus } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';

interface SidebarProps {
  onSelectProject: () => void;
}

export function Sidebar({ onSelectProject }: SidebarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const store = useWorkspaceStoreRaw();

  return (
    <div
      style={{
        width: 240,
        background: 'var(--cron-shell-surface)',
        borderRight: '1px solid var(--cron-shell-border)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--cron-shell-text)',
        fontFamily: 'var(--cron-font-family)',
      }}
    >
      <div
        style={{
          padding: 'var(--cron-space-md)',
          borderBottom: '1px solid var(--cron-shell-border)',
          fontWeight: 600,
          fontSize: 'var(--cron-font-size-lg)',
        }}
      >
        CRON for Code
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--cron-space-sm)' }}>
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => store.getState().selectProject(p.id)}
            style={{
              padding: 'var(--cron-space-sm) var(--cron-space-md)',
              borderRadius: 'var(--cron-border-radius-sm)',
              cursor: 'pointer',
              background: activeId === p.id ? 'var(--cron-accent-subtle)' : 'transparent',
              color: activeId === p.id ? 'var(--cron-accent)' : 'var(--cron-shell-text)',
              fontSize: 'var(--cron-font-size-md)',
              marginBottom: 2,
            }}
            onMouseEnter={(e) => {
              if (activeId !== p.id)
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (activeId !== p.id)
                (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <FolderOpen size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {p.name}
          </div>
        ))}
      </div>

      <div style={{ padding: 'var(--cron-space-sm)', borderTop: '1px solid var(--cron-shell-border)' }}>
        <button
          onClick={onSelectProject}
          style={{
            width: '100%',
            padding: 'var(--cron-space-sm)',
            background: 'var(--cron-accent-subtle)',
            color: 'var(--cron-accent)',
            border: 'none',
            borderRadius: 'var(--cron-border-radius-sm)',
            cursor: 'pointer',
            fontSize: 'var(--cron-font-size-md)',
            fontFamily: 'var(--cron-font-family)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--cron-space-sm)',
          }}
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>
    </div>
  );
}
