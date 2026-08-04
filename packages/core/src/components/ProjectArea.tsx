import { useWorkspaceStore } from '../context.js';

export function ProjectArea() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeId);

  if (!activeProject) return null;

  return (
    <div
      style={{
        padding: 'var(--cron-space-sm) var(--cron-space-md)',
        borderBottom: '1px solid var(--cron-shell-border)',
        color: 'var(--cron-shell-text-muted)',
        fontSize: 'var(--cron-font-size-sm)',
        fontFamily: 'var(--cron-font-family)',
        background: 'var(--cron-shell-bg)',
      }}
    >
      <span style={{ fontWeight: 500, color: 'var(--cron-shell-text)' }}>
        {activeProject.name}
      </span>
      <span style={{ marginLeft: 'var(--cron-space-md)' }}>
        {activeProject.rootPath}
      </span>
    </div>
  );
}
