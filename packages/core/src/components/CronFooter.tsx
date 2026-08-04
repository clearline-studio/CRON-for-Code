import { type CSSProperties } from 'react';

export function CronFooter() {
  return (
    <div style={footerStyle}>
      <div style={leftGroupStyle}>
        <span style={brandStyle}>Made for CRON</span>
        <span style={sepStyle}>|</span>
        <span style={mutedStyle}>PowerShell</span>
        <span style={mutedStyle}>Git</span>
        <span style={mutedStyle}>Tests</span>
        <span style={mutedStyle}>Build</span>
        <span style={mutedStyle}>Verification</span>
        <span style={mutedStyle}>Logs</span>
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

const mutedStyle: CSSProperties = {
  opacity: 0.45,
  cursor: 'default',
};

const statusDotStyle: CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  boxShadow: '0 0 5px rgba(34, 197, 94, 0.4)',
};
