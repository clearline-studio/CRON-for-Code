import { type CSSProperties } from 'react';
import { Menu } from 'lucide-react';

export function CronNavBar() {
  return (
    <div style={navStyle}>
      <button style={menuBtnStyle}>
        <Menu size={15} />
      </button>
      <div style={{ flex: 1 }} />
      <button style={menuBtnStyle}>
        <Menu size={15} />
      </button>
    </div>
  );
}

const navStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 'var(--cron-nav-height)',
  background: 'var(--cron-nav-bg)',
  padding: '0 20px',
  borderBottom: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
  userSelect: 'none',
};

const menuBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  color: 'var(--cron-shell-text-muted)',
  cursor: 'pointer',
};
