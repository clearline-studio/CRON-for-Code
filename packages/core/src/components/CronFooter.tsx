import { type CSSProperties } from 'react';

export function CronFooter() {
  const placeholderTabs = ['PowerShell', 'Git', 'Tests', 'Build', 'Verification', 'Logs'];
  return (
    <div style={footerStyle}>
      <div style={leftGroupStyle}>
        <span style={brandStyle}>Made for CRON</span>
        <span style={sepStyle}>|</span>
        {placeholderTabs.map((tab) => (
          <span key={tab} style={tabStyle}>
            {tab}
            <span style={devBadgeStyle} aria-label={`${tab} not implemented`}>DEV</span>
          </span>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <span style={statusDotStyle} />
      <span style={{ color: '#8da4c7' }}>Ready</span>
    </div>
  );
}

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 28,
  background: 'var(--cron-footer-bg)',
  borderTop: '2px solid var(--cron-panel-border)',
  padding: '0 14px',
  color: '#5f7392',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  gap: 10,
  flexShrink: 0,
  userSelect: 'none',
};

const leftGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const brandStyle: CSSProperties = {
  color: '#8da4c7',
  fontWeight: 500,
};

const sepStyle: CSSProperties = {
  opacity: 0.25,
  color: 'var(--cron-panel-border)',
};

// Placeholder tabs: not implemented yet - shown truthfully with a red DEV badge
// instead of looking like working features.
const tabStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  opacity: 0.45,
  cursor: 'default',
};

const devBadgeStyle: CSSProperties = {
  padding: '1px 4px',
  border: '1px solid rgba(239,68,68,.8)',
  color: '#ff6b6b',
  background: 'rgba(120,12,22,.25)',
  fontSize: 7,
  fontWeight: 700,
  letterSpacing: 0.7,
  borderRadius: 3,
};

const statusDotStyle: CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  boxShadow: '0 0 5px rgba(34, 197, 94, 0.4)',
};
