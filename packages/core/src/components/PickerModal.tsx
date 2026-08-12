import { FolderSearch, Loader2 } from 'lucide-react';
import { type CSSProperties } from 'react';
import { useWorkspaceStore } from '../context.js';

// CRON-styled wrapper around the native OS folder picker. The OS dialog itself
// is unavoidable (Windows folder access), but the flow around it stays in app
// context: this modal appears before the dialog opens and while the selection
// is being added, so the user is never dropped into raw Windows without context.
export function PickerModal() {
  const pickerActive = useWorkspaceStore((s) => s.pickerActive);
  if (!pickerActive) return null;

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Choosing your project folder"
      data-testid="picker-modal"
    >
      <div style={panelStyle}>
        <div style={eyebrowStyle}>PROJECT PICKER</div>
        <div style={iconWrapStyle}>
          <FolderSearch size={26} style={{ color: '#60a5fa' }} />
        </div>
        <div style={titleStyle}>Choosing your project folder</div>
        <div style={messageStyle}>
          The system folder picker will open. CRON will take it from here — the folder is
          scanned and added as a project with your history intact.
        </div>
        <div style={loadingRowStyle}>
          <Loader2 size={15} style={spinnerStyle} />
          <span>Opening picker…</span>
        </div>
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(2, 6, 17, 0.82)',
  fontFamily: 'var(--cron-font-family)',
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  minWidth: 360,
  maxWidth: 460,
  padding: '34px 48px',
  textAlign: 'center',
  background: 'rgba(9, 18, 34, 0.96)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 14,
  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#5f7392',
};

const iconWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 4,
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.5,
};

const messageStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: '#9ab6de',
};

const loadingRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '6px 14px',
  borderRadius: 8,
  background: 'rgba(59, 130, 246, 0.14)',
  color: '#7ea7e8',
  fontSize: 11,
};

const spinnerStyle: CSSProperties = {
  color: '#60a5fa',
  animation: 'cron-spin 0.9s linear infinite',
};
