import { useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
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
        onClick={() => setOpen((value) => !value)}
        style={avatarButtonStyle}
        aria-expanded={open}
        aria-label={open ? 'Close your profile' : 'Open your profile'}
        title="Your profile"
        data-testid="profile-avatar-button"
      >
        <span style={avatarStyle}>A</span>
        <ChevronDown size={12} color="#5f7392" style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <div style={popoverStyle} role="dialog" aria-label="Your profile" data-testid="profile-popover">
          <AccountArea />
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

// --- Profile avatar at the bottom of the left rail (above the global footer). ---
const avatarWrapStyle: CSSProperties = {
  flexShrink: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 10px',
  boxSizing: 'border-box',
  borderTop: '1px solid rgba(100,160,255,.18)',
  background: 'rgba(4, 13, 28, 0.94)',
};

const avatarButtonStyle: CSSProperties = {
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: 0,
  border: '1px solid rgba(31,130,255,.35)',
  borderRadius: '50%',
  background: 'rgba(23, 107, 255, 0.12)',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'var(--cron-font-family)',
};

const avatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 700,
};

// The popover is an empty shell; AccountArea renders the dark browser-style card.
const popoverStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 10px)',
  left: 10,
  zIndex: 60,
  width: 252,
  boxSizing: 'border-box',
};
