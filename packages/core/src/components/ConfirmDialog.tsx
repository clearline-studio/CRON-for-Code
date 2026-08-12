import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Visible bulleted details (e.g. the project path + an explicit non-delete statement). */
  details?: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialogContents({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  details,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, 'open'>) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [focus, setFocus] = useState<'confirm' | 'cancel'>('cancel');

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
    onConfirm();
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      const order = focus === 'confirm' ? [cancelRef.current, confirmRef.current] : [confirmRef.current, cancelRef.current];
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const idx = order.findIndex((el) => el === active);
      if (idx >= 0) {
        event.preventDefault();
        const next = order[(idx + 1) % order.length];
        next?.focus();
        if (next === confirmRef.current) setFocus('confirm');
        else setFocus('cancel');
      }
    }
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title} onKeyDown={handleKey}>
      <form onSubmit={handleSubmit} style={cardStyle} data-testid="confirm-dialog">
        <div style={headerStyle}>
          {destructive && <AlertTriangle size={18} color="#f59e0b" />}
          <span style={titleStyle}>{title}</span>
        </div>
        <p style={descStyle}>{description}</p>
        {details && details.length > 0 && (
          <ul style={detailsListStyle}>
            {details.map((detail) => (
              <li key={detail} style={detailItemStyle}>{detail}</li>
            ))}
          </ul>
        )}
        <div style={actionsStyle}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={buttonStyle(false, focus === 'cancel')}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            style={buttonStyle(destructive, focus === 'confirm')}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return (
    <ConfirmDialogContents
      title={props.title}
      description={props.description}
      confirmLabel={props.confirmLabel}
      cancelLabel={props.cancelLabel}
      destructive={props.destructive}
      details={props.details}
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
    />
  );
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
  width: 440,
  maxWidth: '92vw',
  background: 'rgba(8, 20, 38, 0.98)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 12,
  padding: 22,
  color: 'var(--cron-panel-text)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  boxShadow: '0 18px 50px rgba(0,0,0,.55)',
};
const headerStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const titleStyle: CSSProperties = { fontSize: 17, fontWeight: 600 };
const descStyle: CSSProperties = { fontSize: 'var(--cron-font-size-md)', color: 'var(--cron-panel-text)', margin: 0 };
const detailsListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 'var(--cron-font-size-sm)',
  color: 'var(--cron-panel-text-muted)',
};
const detailItemStyle: CSSProperties = { lineHeight: 1.4 };
const actionsStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
const buttonStyle = (destructive: boolean, focused: boolean): CSSProperties => ({
  padding: '8px 16px',
  border: focused
    ? `1px solid ${destructive ? '#ef4444' : 'rgba(59, 130, 246, 0.7)'}`
    : '1px solid var(--cron-panel-border)',
  background: focused
    ? destructive
      ? 'rgba(127, 29, 29, 0.6)'
      : 'rgba(30, 64, 175, 0.55)'
    : 'transparent',
  color: destructive ? '#fca5a5' : '#eaf2ff',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 'var(--cron-font-size-md)',
  fontWeight: 500,
});
