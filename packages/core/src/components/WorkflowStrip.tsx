import { type CSSProperties } from 'react';
import { Menu } from 'lucide-react';

export function WorkflowStrip() {
  return (
    <div style={stripStyle}>
      <button style={menuButtonStyle} aria-label="Open navigation"><Menu size={18} /></button>
      <div style={{ flex: 1 }} />
      <button style={menuButtonStyle} aria-label="Open assistant menu"><Menu size={18} /></button>
    </div>
  );
}

const stripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 'var(--cron-nav-height)',
  background: '#030713',
  padding: '0 14px',
  borderBottom: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
  userSelect: 'none',
};

const menuButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  border: 0,
  background: 'rgba(8, 27, 56, 0.65)',
  color: '#7a9bc8',
  cursor: 'pointer',
};
