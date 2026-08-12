import { type CSSProperties } from 'react';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';

export function CronHeader() {
  const logoStyle = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasLogo = logoStyle && logoStyle !== 'none';
  const logoSrc = hasLogo ? logoStyle.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : '';
  const isRestarting = useWorkspaceStore((s) => s.isRestarting);
  const raw = useWorkspaceStoreRaw();

  function handleRestart() {
    if (isRestarting) return;
    void raw.getState().restartApp();
  }

  return (
    <div style={headerStyle}>
      <div style={leftStyle}>
        {hasLogo ? (
          <div style={logoWrapStyle}>
            <img src={logoSrc} alt="CRON for Code" style={logoImgStyle} />
          </div>
        ) : (
          <span style={logoTextStyle}>CRON for Code</span>
        )}
      </div>
      <div style={rightStyle}>
        <div
          role="status"
          aria-live="polite"
          style={statusPillStyle}
          data-testid="cron-online-status"
        >
          <Activity size={15} />
          <span style={{ marginLeft: 8 }}>{isRestarting ? 'Restarting…' : 'CRON Online'}</span>
          <span style={greenDot} />
        </div>
        <button
          style={restartBtnStyle(isRestarting)}
          disabled={isRestarting}
          aria-busy={isRestarting}
          aria-label={isRestarting ? 'Restarting CRON for Code' : 'Restart CRON for Code'}
          onClick={handleRestart}
          onMouseEnter={(e) => {
            if (isRestarting) return;
            (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.14)';
          }}
          onMouseLeave={(e) => {
            if (isRestarting) return;
            (e.currentTarget as HTMLElement).style.background = 'var(--cron-accent-subtle)';
          }}
          data-testid="cron-restart-button"
        >
          {isRestarting ? <Loader2 size={15} /> : <RefreshCw size={15} />}
          <span style={{ marginLeft: 8 }}>{isRestarting ? 'Restarting…' : 'CRON Restart'}</span>
        </button>
      </div>
      <div style={glowStyle} />
    </div>
  );
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 'var(--cron-header-height)',
  background: 'var(--cron-header-bg)',
  padding: '0 24px',
  borderBottom: '2px solid var(--cron-panel-border)',
  flexShrink: 0,
  userSelect: 'none',
  position: 'relative',
  overflow: 'hidden',
};

const leftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

const logoWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
};

const logoImgStyle: CSSProperties = {
  width: 190,
  height: 'auto',
  objectFit: 'contain',
  transform: 'translateY(10px)',
};

const logoTextStyle: CSSProperties = {
  color: '#eaf2ff',
  fontSize: 26,
  fontWeight: 700,
  fontFamily: 'var(--cron-font-family)',
};

const rightStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  zIndex: 1,
};

const buttonBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 40,
  padding: '9px 17px',
  borderRadius: 10,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
  transition: 'background 0.15s',
};

// Status indicator only - NOT clickable (no button semantics, no hover).
const statusPillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 40,
  padding: '9px 17px',
  borderRadius: 10,
  border: '1px solid rgba(34, 197, 94, 0.15)',
  background: 'rgba(34, 197, 94, 0.04)',
  color: '#22c55e',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
  cursor: 'default',
  userSelect: 'none',
};

const restartBtnStyle = (isRestarting: boolean): CSSProperties => ({
  ...buttonBase,
  background: isRestarting ? 'rgba(59, 130, 246, 0.22)' : 'var(--cron-accent-subtle)',
  color: isRestarting ? '#bfdbfe' : '#60a5fa',
  borderColor: 'rgba(59, 130, 246, 0.15)',
  cursor: isRestarting ? 'wait' : 'pointer',
  opacity: isRestarting ? 0.85 : 1,
});

const greenDot: CSSProperties = {
  display: 'inline-block',
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: '#22c55e',
  marginLeft: 8,
  boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
};

const glowStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 1,
  background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.25), transparent)',
  pointerEvents: 'none',
};
