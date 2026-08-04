import { useWorkspaceStore } from '../context.js';

export function ProjectArea() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeId);

  if (!activeProject) return null;

  return (
    <div
      style={{
        padding: '6px 14px',
        borderBottom: '1px solid var(--cron-panel-border)',
        color: 'var(--cron-panel-text-muted)',
        fontSize: 'var(--cron-font-size-sm)',
        fontFamily: 'var(--cron-font-family)',
        background: 'var(--cron-panel-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <span style={{ fontWeight: 600, color: 'var(--cron-accent)' }}>
        {activeProject.name}
      </span>
      <span style={{ color: 'var(--cron-panel-text-muted)', fontSize: 'var(--cron-font-size-xs)', opacity: 0.7 }}>
        {activeProject.rootPath}
      </span>
    </div>
  );
}
