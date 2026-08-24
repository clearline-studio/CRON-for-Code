import { type CSSProperties } from 'react';

// Spec §5 + design polish — the account/profile card (dark browser-style panel):
// a large avatar + "Alex Smith" + "Creator Plan", an "OpenCode Credits" token
// monitor (the progress bar), then a divider and `v1.0.0` + green
// "All Systems Operational". Clean sections separated by thin dividers.
// Placeholder identity values for now; nothing is wired to real auth yet.
export function AccountArea() {
  return (
    <div style={cardStyle} data-testid="account-area">
      <div style={userCardStyle}>
        <div style={avatarStyle}>A</div>
        <div style={userTextStyle}>
          <span style={nameStyle}>Alex Smith</span>
          <span style={planStyle}>Creator Plan</span>
        </div>
      </div>

      <div style={sectionDividerStyle} />

      <div style={creditsStyle}>
        <div style={creditsTitleStyle}>OpenCode Credits</div>
        <div style={creditsBarWrapStyle}>
          <div style={creditsBarStyle} />
        </div>
        <div style={creditsMetaStyle}>
          <span>1,250 / 2,000</span>
          <span>Resets in 12 days</span>
        </div>
      </div>

      <div style={sectionDividerStyle} />

      <div style={statusRowStyle}>
        <span style={versionStyle}>v1.0.0</span>
        <span style={statusStyle}>
          <span style={greenDotStyle} />
          All Systems Operational
        </span>
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(13, 27, 49, 0.98)',
  border: '1px solid rgba(100,160,255,.3)',
  borderRadius: 12,
  boxShadow: '0 14px 40px rgba(0,0,0,.55), 0 2px 10px rgba(0,0,0,.35)',
  overflow: 'hidden',
  fontFamily: 'var(--cron-font-family)',
};

const userCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '14px 14px',
};

const avatarStyle: CSSProperties = {
  width: 42,
  height: 42,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  fontSize: 16,
  fontWeight: 700,
  boxShadow: '0 0 12px rgba(23,107,255,.35)',
};

const userTextStyle: CSSProperties = {
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const nameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#f5f9ff',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const planStyle: CSSProperties = {
  fontSize: 10.5,
  color: '#8da4c7',
};

const sectionDividerStyle: CSSProperties = {
  height: 1,
  flexShrink: 0,
  background: 'rgba(100,160,255,.14)',
};

const creditsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
};

const creditsTitleStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  color: '#8da4c7',
};

const creditsBarWrapStyle: CSSProperties = {
  height: 5,
  borderRadius: 999,
  background: 'rgba(95, 115, 146, 0.25)',
  overflow: 'hidden',
};

const creditsBarStyle: CSSProperties = {
  width: '62.5%',
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(to right, #1F82FF, #176BFF)',
  boxShadow: '0 0 8px rgba(31,130,255,.5)',
};

const creditsMetaStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 6,
  fontSize: 10,
  color: '#8da4c7',
};

const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '11px 14px',
};

const versionStyle: CSSProperties = {
  fontSize: 10,
  color: '#5f7392',
};

const statusStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 10,
  color: '#9ee6b2',
  whiteSpace: 'nowrap',
};

const greenDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  boxShadow: '0 0 6px rgba(34,197,94,.6)',
  flexShrink: 0,
};
