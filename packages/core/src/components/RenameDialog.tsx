import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';

export interface RenameDialogProps {
  open: boolean;
  currentName: string;
  projectPath: string;
  onConfirm: (nextName: string) => void;
  onCancel: () => void;
}

export function RenameDialogContents({ currentName, projectPath, onConfirm, onCancel }: Omit<RenameDialogProps, 'open'>) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') {
      setError('Project name cannot be empty');
      return;
    }
    if (trimmed.length > 120) {
      setError('Project name is too long');
      return;
    }
    if (trimmed === currentName) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      const order: (HTMLButtonElement | null)[] = [cancelRef.current, confirmRef.current];
      const active = document.activeElement as HTMLElement | null;
      const idx = order.findIndex((el) => el === active);
      if (idx >= 0) {
        event.preventDefault();
        const next = order[(idx + 1) % order.length];
        next?.focus();
      }
    }
  }

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Rename project"
      onKeyDown={handleKey}
      data-testid="rename-dialog"
    >
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={titleStyle}>Rename display name</div>
        <p style={descStyle}>The Windows folder and Git repository are never renamed.</p>
        <label style={labelStyle}>
          <span style={labelTextStyle}>CRON display name</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            maxLength={120}
            style={inputStyle}
            data-testid="rename-dialog-input"
            aria-label="Project display name"
          />
        </label>
        <div style={pathStyle} title={projectPath}>Folder: {projectPath}</div>
        {error && <div style={errorStyle} role="alert">{error}</div>}
        <div style={actionsStyle}>
          <button ref={cancelRef} type="button" onClick={onCancel} style={buttonStyle(false)}>Cancel</button>
          <button
            ref={confirmRef}
            type="submit"
            style={buttonStyle(true)}
            data-testid="rename-dialog-confirm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export function RenameDialog(props: RenameDialogProps) {
  if (!props.open) return null;
  return <RenameDialogContents key={props.currentName} currentName={props.currentName} projectPath={props.projectPath} onConfirm={props.onConfirm} onCancel={props.onCancel} />;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 8, 18, 0.65)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 1100,
  fontFamily: 'var(--cron-font-family)',
};
const cardStyle: CSSProperties = {
  width: 480,
  maxWidth: '92vw',
  background: 'rgba(8, 20, 38, 0.98)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 12,
  padding: 22,
  color: 'var(--cron-panel-text)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 18px 50px rgba(0,0,0,.55)',
};
const titleStyle: CSSProperties = { fontSize: 17, fontWeight: 600 };
const descStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-sm)',
  color: 'var(--cron-panel-text-muted)',
  margin: 0,
};
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelTextStyle: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  color: 'var(--cron-panel-text-muted)',
};
const inputStyle: CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--cron-panel-border)',
  background: 'rgba(2, 9, 23, 0.9)',
  color: 'var(--cron-panel-text)',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 'var(--cron-font-size-md)',
  borderRadius: 6,
  outline: 'none',
};
const pathStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-xs)',
  color: 'var(--cron-panel-text-muted)',
  fontFamily: 'var(--cron-font-mono)',
  wordBreak: 'break-all',
};
const errorStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-sm)',
  color: '#fca5a5',
};
const actionsStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
const buttonStyle = (primary: boolean): CSSProperties => ({
  padding: '8px 16px',
  border: `1px solid ${primary ? 'rgba(59, 130, 246, 0.7)' : 'var(--cron-panel-border)'}`,
  background: primary ? 'rgba(30, 64, 175, 0.55)' : 'transparent',
  color: primary ? '#eaf2ff' : 'var(--cron-panel-text)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 'var(--cron-font-size-md)',
  fontWeight: 500,
});
