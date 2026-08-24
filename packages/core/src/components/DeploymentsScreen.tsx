import { type CSSProperties } from 'react';
import { CloudUpload, Rocket } from 'lucide-react';

// Spec §A.3 — Deployments: an honest empty state. Publishing is not available
// yet, so the "Publish an app" button is present but disabled — there are no
// fake deployments and no fake publish flow.
export function DeploymentsScreen() {
  return (
    <div style={wrapperStyle} data-testid="deployments-screen">
      <div style={centreStyle}>
        <div style={iconStyle}>
          <CloudUpload size={38} />
        </div>
        <h1 style={headingStyle}>Nothing deployed yet</h1>
        <p style={bodyStyle}>
          When you&apos;re ready to publish an app, it&apos;ll show up here.
        </p>
        <button type="button" disabled style={publishButtonStyle} title="Publishing is coming soon" aria-disabled="true">
          <Rocket size={15} /> Publish an app
        </button>
        <p style={noteStyle}>Publishing is coming soon — your apps stay private until then.</p>
      </div>
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  overflowY: 'auto',
  background: 'linear-gradient(to right, rgba(3, 12, 28, 0.40), rgba(3, 12, 28, 0.10) 58%, rgba(3, 12, 28, 0.02))',
  fontFamily: 'var(--cron-font-family)',
};

const centreStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '0 24px',
  textAlign: 'center',
};

const iconStyle: CSSProperties = {
  width: 74,
  height: 74,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 20,
  background: 'rgba(23, 107, 255, 0.08)',
  border: '1px solid rgba(31,130,255,.22)',
  color: '#5f7392',
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 400,
  color: '#eaf2ff',
  letterSpacing: 0.3,
};

const bodyStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: '#8da4c7',
  lineHeight: 1.6,
  maxWidth: 380,
};

const publishButtonStyle: CSSProperties = {
  marginTop: 8,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '0 16px',
  border: '1px solid rgba(31,130,255,.4)',
  borderRadius: 8,
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'not-allowed',
  opacity: 0.45,
};

const noteStyle: CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  color: '#5f7392',
};
