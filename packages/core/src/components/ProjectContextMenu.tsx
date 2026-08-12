import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  ClipboardCopy,
  ExternalLink,
  FolderEdit,
  FolderSearch,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export type ProjectMenuAction =
  | { kind: 'reveal' }
  | { kind: 'copy-path' }
  | { kind: 'refresh' }
  | { kind: 'rename' }
  | { kind: 'relink' }
  | { kind: 'archive' };

interface ProjectContextMenuProps {
  open: boolean;
  anchor: { x: number; y: number } | null;
  projectAvailability: 'available' | 'missing' | 'unavailable';
  archived: boolean;
  onClose: () => void;
  onAction: (action: ProjectMenuAction) => void;
}

interface MenuItem {
  kind: ProjectMenuAction['kind'];
  label: string;
  description: string;
  icon: typeof ClipboardCopy;
  disabled?: boolean;
}

export function ProjectContextMenu({
  open,
  anchor,
  projectAvailability,
  archived,
  onClose,
  onAction,
}: ProjectContextMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) onClose();
    }
    function onDocumentKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onDocumentKey);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKey);
    };
  }, [onClose]);

  if (!open || !anchor) return null;

  const folderAvailable = projectAvailability === 'available';

  const items: MenuItem[] = [
    {
      kind: 'reveal',
      label: 'Open in File Explorer',
      description: folderAvailable
        ? 'Open the project folder in Windows File Explorer'
        : 'Folder is missing or inaccessible',
      icon: ExternalLink,
      disabled: !folderAvailable,
    },
    {
      kind: 'copy-path',
      label: 'Copy project path',
      description: 'Copy the stored project path to the clipboard',
      icon: ClipboardCopy,
    },
    {
      kind: 'refresh',
      label: 'Refresh project',
      description: 'Re-check the folder availability and metadata',
      icon: RefreshCw,
      disabled: archived,
    },
    {
      kind: 'rename',
      label: 'Rename display name',
      description: 'Rename the CRON display name (folder name is unchanged)',
      icon: FolderEdit,
      disabled: archived,
    },
    {
      kind: 'relink',
      label: 'Re-link folder',
      description: archived
        ? 'Restore this project and point it at a new folder'
        : 'Point this project at a new folder (history preserved)',
      icon: FolderSearch,
    },
    {
      kind: 'archive',
      label: archived ? 'Archived' : 'Remove from CRON',
      description: archived
        ? 'This project is already archived'
        : 'Hide from CRON. The Windows folder and Git repository are not deleted.',
      icon: Trash2,
      disabled: archived,
    },
  ];

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + items.length) % items.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        onAction({ kind: item.kind } as ProjectMenuAction);
      }
    }
  }

  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label="Project actions"
      tabIndex={-1}
      onKeyDown={handleKey}
      style={menuStyle(anchor)}
      data-testid="project-context-menu"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const focused = index === activeIndex;
        return (
          <button
            key={item.kind}
            type="button"
            role="menuitem"
            aria-label={item.label}
            aria-disabled={item.disabled ?? false}
            disabled={item.disabled ?? false}
            tabIndex={focused ? 0 : -1}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              if (item.disabled) return;
              onAction({ kind: item.kind } as ProjectMenuAction);
            }}
            style={itemStyle(focused, item.disabled ?? false)}
            data-testid={`project-menu-${item.kind}`}
          >
            <span style={iconStyle}>
              <Icon size={13} />
            </span>
            <span style={textStyle}>
              <span style={labelStyle}>{item.label}</span>
              <span style={descriptionStyle}>{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const menuStyle = (anchor: { x: number; y: number }): CSSProperties => ({
  position: 'fixed',
  top: Math.min(anchor.y, window.innerHeight - 320),
  left: Math.min(anchor.x, window.innerWidth - 280),
  width: 256,
  background: 'rgba(7, 18, 36, 0.98)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 8,
  boxShadow: '0 16px 40px rgba(0,0,0,.45)',
  padding: 4,
  zIndex: 1000,
  fontFamily: 'var(--cron-font-family)',
  color: 'var(--cron-panel-text)',
  fontSize: 'var(--cron-font-size-sm)',
  outline: 'none',
});

const itemStyle = (focused: boolean, disabled: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  width: '100%',
  padding: '7px 9px',
  border: 'none',
  borderRadius: 6,
  background: focused ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
  color: disabled ? 'var(--cron-panel-text-muted)' : 'var(--cron-panel-text)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  textAlign: 'left',
  opacity: disabled ? 0.55 : 1,
});

const iconStyle: CSSProperties = { paddingTop: 2, opacity: 0.85 };
const textStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 };
const labelStyle: CSSProperties = { fontSize: 'var(--cron-font-size-md)', fontWeight: 600 };
const descriptionStyle: CSSProperties = {
  fontSize: 10,
  color: 'var(--cron-panel-text-muted)',
  lineHeight: 1.35,
};
