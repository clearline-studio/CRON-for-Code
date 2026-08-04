import { type CSSProperties } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export function CronHeader() {
  const logoStyle = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasLogo = logoStyle && logoStyle !== 'none';
  const logoSrc = hasLogo ? logoStyle.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : '';

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
        <div style={subtitleStyle}>Agent-safe coding shell</div>
      </div>
      <div style={rightStyle}>
        <button
          style={statusBtnStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(34, 197, 94, 0.10)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(34, 197, 94, 0.04)'; }}
        >
          <Activity size={15} />
          <span style={{ marginLeft: 8 }}>CRON Online</span>
          <span style={greenDot} />
        </button>
        <button
          style={restartBtnStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.14)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--cron-accent-subtle)'; }}
        >
          <RefreshCw size={15} />
          <span style={{ marginLeft: 8 }}>CRON Restart</span>
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
  padding: '0 36px',
  borderBottom: '2px solid var(--cron-panel-border)',
  flexShrink: 0,
  userSelect: 'none',
  position: 'relative',
  overflow: 'hidden',
};

const leftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const logoWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
};

const logoImgStyle: CSSProperties = {
  width: 220,
  height: 'auto',
  objectFit: 'contain',
  transform: 'translateY(14px)',
};

const logoTextStyle: CSSProperties = {
  color: '#eaf2ff',
  fontSize: 26,
  fontWeight: 700,
  fontFamily: 'var(--cron-font-family)',
};

const subtitleStyle: CSSProperties = {
  color: '#5f7392',
  fontSize: 'var(--cron-font-size-sm)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 400,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginTop: 2,
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
  minHeight: 44,
  padding: '12px 24px',
  borderRadius: 6,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
  transition: 'background 0.15s',
};

const statusBtnStyle: CSSProperties = {
  ...buttonBase,
  background: 'rgba(34, 197, 94, 0.04)',
  color: '#22c55e',
  borderColor: 'rgba(34, 197, 94, 0.15)',
};

const restartBtnStyle: CSSProperties = {
  ...buttonBase,
  background: 'var(--cron-accent-subtle)',
  color: '#60a5fa',
  borderColor: 'rgba(59, 130, 246, 0.15)',
};

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
