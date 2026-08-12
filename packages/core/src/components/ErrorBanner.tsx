import { type CSSProperties } from 'react';
import { AlertTriangle, Loader, X } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';

export function ErrorBanner() {
  const error = useWorkspaceStore((s) => s.error);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const raw = useWorkspaceStoreRaw();

  if (!error && !isLoading) return null;

  return (
    <div style={bannerStyle(error !== null)} data-testid="status-banner">
      {isLoading && (
        <span style={loadingStyle}>
          <Loader size={12} /> Loading project…
        </span>
      )}
      {error && (
        <>
          <AlertTriangle size={13} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => raw.getState().setError(null)}
            style={dismissStyle}
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </>
      )}
    </div>
  );
}

const bannerStyle = (isError: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  padding: '6px 14px',
  fontSize: 'var(--cron-font-size-sm)',
  fontFamily: 'var(--cron-font-family)',
  borderBottom: `1px solid ${isError ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.25)'}`,
  background: isError ? 'rgba(127, 29, 29, 0.55)' : 'rgba(8, 47, 73, 0.45)',
  color: isError ? '#fca5a5' : '#7dd3fc',
});

const loadingStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#7dd3fc',
};

const dismissStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  background: 'transparent',
  color: '#fca5a5',
  cursor: 'pointer',
  padding: 2,
};
