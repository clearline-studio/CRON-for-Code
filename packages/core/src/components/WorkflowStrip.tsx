import { type CSSProperties } from 'react';

const stages = ['Plan', 'Build', 'Verify', 'Review', 'Release'];

export function WorkflowStrip() {
  return (
    <div style={stripStyle}>
      {stages.map((label, i) => (
        <div key={label} style={pillStyle(i === 0)}>
          <span style={dotStyle(i === 0)} />
          {label}
        </div>
      ))}
    </div>
  );
}

const stripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 'var(--cron-nav-height)',
  background: 'linear-gradient(90deg, #030711 0%, #07111f 45%, #0b1d36 100%)',
  padding: '0 20px',
  gap: 2,
  borderBottom: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
  userSelect: 'none',
};

const pillStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 16px',
  borderRadius: 6,
  fontSize: 'var(--cron-font-size-md)',
  fontWeight: active ? 600 : 400,
  fontFamily: 'var(--cron-font-family)',
  color: active ? '#eaf2ff' : 'var(--cron-shell-text-muted)',
  background: active ? 'var(--cron-accent-subtle)' : 'transparent',
  border: active ? '1px solid rgba(59, 130, 246, 0.20)' : '1px solid transparent',
  cursor: 'default',
});

const dotStyle = (active: boolean): CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: active ? '#3b82f6' : '#3d4f6b',
  boxShadow: active ? '0 0 6px rgba(59, 130, 246, 0.5)' : 'none',
});
