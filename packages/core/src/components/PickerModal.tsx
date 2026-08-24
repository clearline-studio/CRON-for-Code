import { ArrowLeft, ChevronRight, File, Folder, FolderOpen, Loader2, X } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useWorkspaceStore } from '../context.js';
import { settleFolderSelection, type FolderEntry, type FolderListing, type FolderPickerBridge } from '../folder-picker.js';

const SLASH = String.fromCharCode(92);

interface PickerModalProps {
  bridge?: FolderPickerBridge;
}

function buildSegments(path: string): { label: string; path: string }[] {
  const parts = path.split(new RegExp('[' + SLASH + '/]+')).filter(Boolean);
  const separator = path.includes(SLASH) ? SLASH : '/';
  const segments: { label: string; path: string }[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const prefix = parts.slice(0, i + 1).join(separator);
    const isDriveRoot = i === 0 && /^[a-z]:$/i.test(parts[0] ?? '');
    segments.push({ label: parts[i] ?? '', path: isDriveRoot ? prefix + SLASH : prefix });
  }
  return segments;
}

// CRON-styled folder browser. Replaces the raw OS folder dialog with an in-app
// dark-navy picker so the user never drops out of CRON context. Navigation is
// driven by the host bridge (main-process fs listing); the picked folder is
// returned through settleFolderSelection for the awaited selectFolder().
export function PickerModal({ bridge }: PickerModalProps) {
  const pickerActive = useWorkspaceStore((s) => s.pickerActive);
  const [path, setPath] = useState('');
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  // Reset on each open. This runs during render (React's documented pattern for
  // adjusting state when a tracked prop changes), NOT inside the effect, so the
  // effect only performs the async listing.
  if (pickerActive && !sessionActive) {
    setSessionActive(true);
    setLoading(true);
    setPath('');
    setListing(null);
    setError(null);
    setConfirming(false);
  }
  if (!pickerActive && sessionActive) {
    setSessionActive(false);
  }

  useEffect(() => {
    if (!pickerActive || !bridge) return;
    let cancelled = false;
    bridge
      .list('')
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        setPath(result.path);
        setListing(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Could not read this folder');
      });
    return () => {
      cancelled = true;
    };
  }, [pickerActive, bridge]);

  if (!pickerActive) return null;

  async function load(dir: string) {
    if (!bridge) return;
    setLoading(true);
    setError(null);
    try {
      const result = await bridge.list(dir);
      setPath(result.path);
      setListing(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this folder');
      setListing(null);
    } finally {
      setLoading(false);
    }
  }

  function navigate(entry: FolderEntry) {
    if (entry.isDirectory) void load(entry.path);
  }

  async function handleSelect() {
    if (!bridge || !path || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const resolved = await bridge.confirm(path);
      if (resolved) settleFolderSelection(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this folder');
    } finally {
      setConfirming(false);
    }
  }

  function handleCancel() {
    settleFolderSelection(null);
  }

  const segments = buildSegments(path);
  const showBrowser = !!bridge;

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Choosing your project folder"
      data-testid="picker-modal"
    >
      <div style={panelStyle}>
        <header style={headerStyle}>
          <div style={headerTextStyle}>
            <div style={eyebrowStyle}>PROJECT PICKER</div>
            <div style={titleStyle}>Choosing your project folder</div>
          </div>
          <button type="button" style={closeButtonStyle} onClick={handleCancel} aria-label="Cancel project picker" title="Cancel"><X size={16} /></button>
        </header>

        {showBrowser ? (
          <>
            <div style={toolbarStyle}>
              <button
                type="button"
                style={listing?.parent ? toolButtonStyle : toolButtonDisabledStyle}
                onClick={() => listing?.parent ? void load(listing.parent) : undefined}
                disabled={!listing?.parent}
                aria-label="Go up one folder"
                title="Up"
              >
                <ArrowLeft size={14} />
              </button>
              <div style={breadcrumbStyle} aria-label="Current folder">
                {segments.map((segment, index) => (
                  <span key={segment.path + '-' + index} style={breadcrumbItemStyle}>
                    <button
                      type="button"
                      style={breadcrumbButtonStyle}
                      onClick={() => void load(segment.path)}
                      disabled={segment.path === path}
                    >
                      {segment.label}
                    </button>
                    {index < segments.length - 1 && <ChevronRight size={12} style={{ color: '#3d547a', flexShrink: 0 }} />}
                  </span>
                ))}
              </div>
            </div>

            <div style={bodyStyle} data-testid="folder-picker-body">
              {loading ? (
                <div style={emptyRowStyle}>
                  <Loader2 size={15} style={spinnerStyle} />
                  <span>Reading folder…</span>
                </div>
              ) : error ? (
                <div style={errorRowStyle} role="alert">{error}</div>
              ) : listing && listing.entries.length === 0 ? (
                <div style={emptyRowStyle}>This folder is empty.</div>
              ) : (
                <div style={entryListStyle}>
                  {listing?.entries.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      style={entry.isDirectory ? entryButtonStyle : fileButtonStyle}
                      onClick={() => navigate(entry)}
                      aria-label={entry.isDirectory ? 'Open folder ' + entry.name : undefined}
                      title={entry.path}
                    >
                      {entry.isDirectory
                        ? <Folder size={14} style={{ color: '#60a5fa', flexShrink: 0 }} />
                        : <File size={14} style={{ color: '#48618a', flexShrink: 0 }} />}
                      <span style={entryLabelStyle}>{entry.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <footer style={footerStyle}>
              <span style={currentPathStyle} title={path}>{path || 'Select a folder'}</span>
              <div style={footerActionsStyle}>
                <button type="button" style={secondaryButtonStyle} onClick={handleCancel}>Cancel</button>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => void handleSelect()}
                  disabled={!path || confirming}
                >
                  {confirming ? <Loader2 size={14} style={spinnerStyle} /> : <FolderOpen size={14} />}
                  Select this folder
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div style={fallbackStyle}>
            <div style={messageStyle}>
              The folder browser is not available in this host. CRON cannot open a project without
              a folder to scan.
            </div>
          </div>
        )}
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
  width: 'min(640px, 92vw)',
  maxHeight: 'min(560px, 84vh)',
  background: 'rgba(7, 20, 42, 0.98)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 14,
  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 10,
  padding: '18px 20px 12px',
  borderBottom: '1px solid rgba(80, 140, 220, 0.2)',
};

const headerTextStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#5f7392',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.5,
};

const closeButtonStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  border: '1px solid rgba(100,160,255,.24)',
  borderRadius: 6,
  background: 'rgba(10, 26, 52, .6)',
  color: '#8da4c7',
  cursor: 'pointer',
  flexShrink: 0,
};

const toolbarStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid rgba(80, 140, 220, 0.14)',
};

const toolButtonStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  flexShrink: 0,
  border: '1px solid rgba(100,160,255,.24)',
  borderRadius: 6,
  background: 'rgba(10, 26, 52, .6)',
  color: '#a9c7f0',
  cursor: 'pointer',
};
const toolButtonDisabledStyle: CSSProperties = { ...toolButtonStyle, opacity: 0.4, cursor: 'default' };

const breadcrumbStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  overflowX: 'auto',
  padding: '2px 4px',
};

const breadcrumbItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  flexShrink: 0,
};

const breadcrumbButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#8da4c7',
  fontSize: 12,
  fontFamily: 'var(--cron-font-family)',
  cursor: 'pointer',
  padding: '3px 5px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const bodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 220,
  overflowY: 'auto',
  padding: '8px 10px',
};

const entryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
};

const entryButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  padding: '7px 10px',
  border: '1px solid transparent',
  borderRadius: 6,
  background: 'transparent',
  color: '#d9e8ff',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
  minWidth: 0,
};

const fileButtonStyle: CSSProperties = {
  ...entryButtonStyle,
  color: '#5f7392',
  cursor: 'default',
  opacity: 0.75,
};

const entryLabelStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const emptyRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '26px 12px',
  color: '#8da4c7',
  fontSize: 12,
};

const errorRowStyle: CSSProperties = {
  padding: '14px 12px',
  color: '#fca5a5',
  fontSize: 12,
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 6,
  background: 'rgba(239, 68, 68, 0.08)',
};

const footerStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '12px 14px',
  borderTop: '1px solid rgba(80, 140, 220, 0.2)',
};

const currentPathStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#5f7392',
  fontSize: 11,
};

const footerActionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const secondaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  border: '1px solid rgba(100,160,255,.28)',
  borderRadius: 7,
  background: 'rgba(10, 26, 52, .6)',
  color: '#c6d8f7',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 13,
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  border: '1px solid rgba(59, 130, 246, 0.6)',
  borderRadius: 7,
  background: 'rgba(37, 99, 235, 0.85)',
  color: '#ffffff',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const fallbackStyle: CSSProperties = {
  padding: '26px 20px',
  textAlign: 'center',
};

const messageStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: '#9ab6de',
};

const spinnerStyle: CSSProperties = {
  color: '#60a5fa',
  animation: 'cron-spin 0.9s linear infinite',
};
