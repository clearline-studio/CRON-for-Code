import { useState, type CSSProperties } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { AccountArea } from './AccountArea.js';

// Design polish — the bottom of the app is now two layers:
//   1. ProfileAvatar: the compact clickable avatar at the bottom of the LEFT
//      RAIL (above the global footer). Clicking opens the dark browser-style
//      profile card (reuses AccountArea) as an elevated popover.
//   2. ProfileFooter: the slim GLOBAL footer bar across the full app width
//      (spec §19): a top divider, a green dot + "All Systems Operational" on
//      the left, `v1.0.0` on the right. It sits above the taskbar because the
//      app is a fixed 100vh column and this bar is its last row — nothing
//      overflows the viewport, so it is never clipped.
// Placeholder identity values (no real auth).
export function ProfileFooter() {
  return (
    <footer style={footerStyle} data-testid="profile-footer">
      <div style={leftStyle}>
        <span style={greenDotStyle} />
        <span style={labelStyle}>All Systems Operational</span>
      </div>
      <span style={versionStyle}>v1.0.0</span>
    </footer>
  );
}

export function ProfileAvatar() {
  const [open, setOpen] = useState(false);

  return (
    <div style={avatarWrapStyle} data-testid="profile-avatar">
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={avatarButtonStyle}
        aria-expanded={open}
        aria-label={open ? 'Close your account' : 'Open account'}
        title="Account"
        data-testid="profile-avatar-button"
      >
        <span style={avatarStyle}>A</span>
        <span style={avatarNameStyle}>Venessa</span>
        <ChevronDown size={13} color="#8da4c7" style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <div style={modalBackdropStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} data-testid="profile-popover">
          <section style={accountModalStyle} role="dialog" aria-modal="true" aria-label="Account">
            <header style={accountModalHeaderStyle}>
              <h2 style={accountModalTitleStyle}>Account</h2>
              <button type="button" onClick={() => setOpen(false)} style={modalCloseStyle} aria-label="Close account" data-testid="account-modal-close">
                <X size={16} />
              </button>
            </header>
            <div style={accountModalBodyStyle}>
              <AccountArea />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// --- Slim global footer (spec §19): ~24px, divider on top, minimal content. ---
const footerStyle: CSSProperties = {
  height: 24,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  padding: '0 12px',
  boxSizing: 'border-box',
  borderTop: '1px solid rgba(100,160,255,.16)',
  background: 'rgba(2, 9, 23, 0.92)',
  color: '#8da4c7',
  fontSize: 9.5,
  fontFamily: 'var(--cron-font-family)',
};

const leftStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const greenDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  boxShadow: '0 0 6px rgba(34,197,94,.6)',
  flexShrink: 0,
};

const versionStyle: CSSProperties = {
  color: '#5f7392',
  flexShrink: 0,
};

// --- Intelligence-style header account control: avatar + name + chevron button
// in the top-right, opening a centred Account modal. ---
const avatarWrapStyle: CSSProperties = {
  flexShrink: 0,
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
};

const avatarButtonStyle: CSSProperties = {
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '0 12px 0 9px',
  border: '1px solid #1c4268',
  borderRadius: 8,
  background: '#071427',
  color: '#d7e9ff',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'var(--cron-font-family)',
  fontSize: 12,
  fontWeight: 700,
};

const avatarStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  border: '1px solid rgba(78,169,231,.64)',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0,
};

const avatarNameStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  color: '#d7e9ff',
};

// Centred Account modal (matches Intelligence's account modal): dark blurred
// backdrop + a centred panel.
const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 40,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '112px 24px 32px',
  background: 'rgba(0, 6, 14, 0.62)',
  backdropFilter: 'blur(9px)',
};

const accountModalStyle: CSSProperties = {
  width: 'min(650px, 100%)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid rgba(61, 114, 169, 0.72)',
  borderRadius: 14,
  background: 'rgba(5, 14, 26, 0.98)',
  boxShadow: '0 24px 80px rgba(0,0,0,.6)',
};

const accountModalHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  padding: '16px 18px',
  borderBottom: '1px solid rgba(61,114,169,.3)',
};

const accountModalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  color: '#eaf2ff',
};

const modalCloseStyle: CSSProperties = {
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(100,160,255,.28)',
  borderRadius: 7,
  background: 'rgba(10, 26, 52, .62)',
  color: '#b7cdf0',
  cursor: 'pointer',
};

const accountModalBodyStyle: CSSProperties = {
  padding: 18,
  overflowY: 'auto',
};
