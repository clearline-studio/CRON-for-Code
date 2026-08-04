import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  onSelectProject: () => void;
}

export function EmptyState({ onSelectProject }: EmptyStateProps) {
  const logoStyle = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasLogo = logoStyle && logoStyle !== 'none';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--cron-shell-text-muted)',
        fontFamily: 'var(--cron-font-family)',
        gap: 'var(--cron-space-md)',
      }}
    >
      {hasLogo ? (
        <img
          src={logoStyle.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')}
          alt="CRON for Code"
          style={{ width: 64, height: 64, opacity: 0.85, marginBottom: 'var(--cron-space-sm)' }}
        />
      ) : (
        <FolderOpen size={48} opacity={0.5} />
      )}
      <div style={{ fontSize: 'var(--cron-font-size-xl)', fontWeight: 300 }}>
        No Project Selected
      </div>
      <div style={{ fontSize: 'var(--cron-font-size-md)', maxWidth: 400, textAlign: 'center' }}>
        Open a local project folder to begin. CRON for Code will help you plan, review, and execute
        coding tasks with governance built in.
      </div>
      <button
        onClick={onSelectProject}
        style={{
          marginTop: 'var(--cron-space-sm)',
          padding: 'var(--cron-space-sm) var(--cron-space-lg)',
          background: 'var(--cron-accent)',
          color: 'var(--cron-text-inverse)',
          border: 'none',
          borderRadius: 'var(--cron-border-radius-md)',
          cursor: 'pointer',
          fontSize: 'var(--cron-font-size-md)',
          fontFamily: 'var(--cron-font-family)',
        }}
      >
        Select Project Folder
      </button>
    </div>
  );
}
