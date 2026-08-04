import { FolderOpen, Shield, Cpu } from 'lucide-react';
import { type CSSProperties } from 'react';

interface EmptyStateProps {
  onSelectProject: () => void;
}

export function EmptyState({ onSelectProject }: EmptyStateProps) {
  const logoStyle = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasLogo = logoStyle && logoStyle !== 'none';

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        {hasLogo ? (
          <img
            src={logoStyle.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')}
            alt="CRON for Code"
            style={logoStyleProp}
          />
        ) : (
          <FolderOpen size={52} opacity={0.35} color="#5f7392" />
        )}
        <div style={headingStyle}>CRON for Code</div>
        <div style={subtitleStyle}>Agent-safe coding shell</div>
        <div style={descStyle}>
          Open a local project to plan, execute, verify, and release code changes with governance built in.
        </div>
        <div style={actionsStyle}>
          <button onClick={onSelectProject} style={ctaStyle}>
            Select Project Folder
          </button>
          <button style={ctaSecondaryStyle} disabled>
            Open Recent Project
          </button>
        </div>
        <div style={chipsStyle}>
          <div style={chipStyle}>
            <Cpu size={10} />
            <span>Local Model: Pending</span>
          </div>
          <div style={{ ...chipStyle, borderColor: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8' }}>
            <Shield size={10} />
            <span>OpenCode: Waiting</span>
          </div>
          <div style={{ ...chipStyle, borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>
            <Shield size={10} />
            <span>Release Gate: Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontFamily: 'var(--cron-font-family)',
  position: 'relative',
  zIndex: 1,
  padding: 'var(--cron-space-xl)',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: 520,
  textAlign: 'center',
  gap: 'var(--cron-space-md)',
  background: 'rgba(11, 22, 40, 0.40)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 14,
  padding: '40px 48px',
};

const logoStyleProp: CSSProperties = {
  width: 200,
  height: 'auto',
  opacity: 0.9,
  marginBottom: 4,
};

const headingStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.5,
};

const subtitleStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-lg)',
  color: '#8da4c7',
  fontWeight: 400,
  marginTop: -8,
};

const descStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-md)',
  color: 'var(--cron-panel-text-muted)',
  lineHeight: 'var(--cron-line-height)',
  maxWidth: 400,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
};

const ctaStyle: CSSProperties = {
  padding: '10px 28px',
  background: 'var(--cron-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
};

const ctaSecondaryStyle: CSSProperties = {
  padding: '10px 28px',
  background: 'transparent',
  color: '#5f7392',
  border: '1px solid rgba(95, 115, 146, 0.3)',
  borderRadius: 7,
  cursor: 'not-allowed',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
  opacity: 0.6,
};

const chipsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 6,
  flexWrap: 'wrap' as const,
  justifyContent: 'center',
};

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 10px',
  borderRadius: 12,
  border: '1px solid rgba(95, 115, 146, 0.25)',
  fontSize: 'var(--cron-font-size-xs)',
  color: '#5f7392',
  fontFamily: 'var(--cron-font-family)',
};
