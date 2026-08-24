import { RefreshCw } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useWorkspaceStore } from '../context.js';

// Full-window restart-in-progress overlay (Claims-style pattern, Code styling).
// Shown in two phases:
//  - while the user-triggered restart is in flight (store isRestarting);
//  - after the app relaunches, until the renderer is ready (preparing handoff
//    from dev.mjs's CRON_CODE_RESTARTING flag), so the overlay covers the whole
//    relaunch gap and the user never sees a blank or half-loaded window.
// Both phases show the SAME texts as the pre-React splash panel, so the whole
// restart transition is one continuous centered screen.
// When hiding (the entry screen is ready) the overlay FADES OUT over 400 ms
// instead of snapping away - a sudden unmount reads as a "flash screen" right
// before the app opens. Visibility hides it (and removes it from hit-testing
// and the accessibility tree) only AFTER the fade completes.
// The ~3s minimum hold is enforced by App (RESTART_LINGER_MIN_MS) on the
// relaunch/handoff path, so the overlay itself just mirrors `show` and fades.
const FADE_MS = 400;

export function RestartOverlay({ preparing = false }: { preparing?: boolean }) {
  const isRestarting = useWorkspaceStore((s) => s.isRestarting);
  const show = isRestarting || preparing;
  // Latches whether the overlay was showing on mount, so a relaunch that starts
  // in the handoff state keeps the overlay mounted (hidden) for its fade-out,
  // while a normal launch renders nothing at all.
  const [everShown] = useState(show);
  if (!everShown && !show) return null;
  const hidden = !show;

  return (
    <div
      style={{
        ...backdropStyle,
        opacity: hidden ? 0 : 1,
        visibility: hidden ? 'hidden' : 'visible',
        transition: `opacity ${FADE_MS}ms ease, visibility 0s linear ${FADE_MS}ms`,
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      role="status"
      aria-live="assertive"
      aria-busy={!hidden}
      aria-hidden={hidden}
      data-testid="restart-overlay"
    >
      <div style={panelStyle}>
        <div style={eyebrowStyle}>CRON SYSTEM CONTROL</div>
        <div style={iconWrapStyle}>
          <div style={spinnerCssStyle} />
        </div>
        <div style={titleStyle}>Restarting</div>
        <div style={messageStyle}>Stopping and restarting CRON services...</div>
        <div style={noteStyle}>The app will return to the project selection screen.</div>
        <div style={disabledRestartStyle}>
          <RefreshCw size={12} />
          <span>CRON Restart</span>
        </div>
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Flat dark backdrop - identical to the pre-React splash backdrop so the old
  // window's overlay and the relaunched window's splash are indistinguishable
  // (no blur: blurred app content would make the two screens look different).
  background: 'rgba(2, 6, 17, 0.82)',
  fontFamily: 'var(--cron-font-family)',
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  minWidth: 340,
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
  fontFamily: 'var(--cron-font-family)',
};

const iconWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 4,
};

// CSS border spinner matching the HTML splash #splash-spinner exactly, so the
// transition from the static pre-React splash to the React RestartOverlay is one
// continuous visual (no Loader2 SVG pop-in / second flash).
const spinnerCssStyle: CSSProperties = {
  width: 34,
  height: 34,
  border: '3px solid rgba(96, 165, 250, 0.25)',
  borderTopColor: '#60a5fa',
  borderRadius: '50%',
  animation: 'cron-spin 0.9s linear infinite',
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 300,
  color: '#f5f9ff',
  letterSpacing: 0.5,
};

const messageStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-md)',
  color: '#9ab6de',
};

const noteStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-xs)',
  color: '#5f7392',
  marginBottom: 4,
};

const disabledRestartStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 8,
  background: 'rgba(59, 130, 246, 0.14)',
  color: '#7ea7e8',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
};
