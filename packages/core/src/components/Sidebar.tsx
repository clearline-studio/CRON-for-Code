import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  FolderOpen,
  FolderX,
  MessageSquare,
  MoreHorizontal,
  Settings,
  User,
  Shield,
  Activity,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
} from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { ProjectContextMenu, type ProjectMenuAction } from './ProjectContextMenu.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { RenameDialog } from './RenameDialog.js';
import type { CodeProject } from '@cron-code/contracts';

interface SidebarProps {
  onOpenSettings: () => void;
  collapsed?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
  onToggleCollapsed?: () => void;
  onAutoExpand?: () => void;
  onAutoCollapse?: () => void;
}

interface DialogState {
  kind: 'archive' | 'rename' | null;
  project: CodeProject | null;
}

export function Sidebar({
  onOpenSettings,
  collapsed = false,
  pinned = true,
  onTogglePin,
  onToggleCollapsed,
  onAutoExpand,
  onAutoCollapse,
}: SidebarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const copyConfirm = useWorkspaceStore((s) => s.copyConfirm);
  const isRestarting = useWorkspaceStore((s) => s.isRestarting);
  const raw = useWorkspaceStoreRaw();
  const visibleProjects = projects.reduce<typeof projects>((unique, project) => {
    if (project.archived) return unique;
    const existingIndex = unique.findIndex((item) => item.rootPath === project.rootPath);
    if (existingIndex < 0) return [...unique, project];
    if (project.id === activeId) return unique.map((item, index) => index === existingIndex ? project : item);
    return unique;
  }, []);
  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: null, project: null });
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const menuTriggerRefs = useRef(new Map<string, HTMLButtonElement | null>());

  function openProjectMenu(project: CodeProject, event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuOpenFor(project.id);
    setMenuAnchor({ x: rect.right + 4, y: rect.bottom + 2 });
  }

  function closeProjectMenu() {
    setMenuOpenFor(null);
    setMenuAnchor(null);
  }

  function handleMenuAction(project: CodeProject, action: ProjectMenuAction) {
    closeProjectMenu();
    switch (action.kind) {
      case 'reveal':
        void raw.getState().revealProject(project.id);
        return;
      case 'copy-path':
        void raw.getState().copyProjectPath(project.id);
        return;
      case 'refresh':
        void raw.getState().refreshProject(project.id);
        return;
      case 'rename':
        setDialog({ kind: 'rename', project });
        return;
      case 'relink':
        void raw.getState().relinkProject(project.id);
        return;
      case 'archive':
        setDialog({ kind: 'archive', project });
        return;
      default: {
        const _exhaustive: never = action;
        void _exhaustive;
      }
    }
  }

  useEffect(() => {
    if (!copyConfirm) return;
    const handle = setTimeout(() => raw.getState().clearCopyConfirm(), 2400);
    return () => clearTimeout(handle);
  }, [copyConfirm, raw]);

  const menuProject = menuOpenFor ? projects.find((p) => p.id === menuOpenFor) ?? null : null;

  if (collapsed) {
    return (
      <div
        style={collapsedRailStyle}
        data-testid="sidebar"
        onMouseEnter={onAutoExpand}
        onMouseLeave={onAutoCollapse}
      >
        <button type="button" onClick={onToggleCollapsed} style={railIconButtonStyle} aria-label="Open project navigation" title="Open projects">
          <PanelLeftOpen size={17} />
        </button>
        <div style={collapsedProjectStackStyle} data-testid="sidebar-projects">
          {visibleProjects.slice(0, 8).map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => raw.getState().selectProject(p.id)}
                style={collapsedProjectButtonStyle(isActive)}
                title={p.name}
                aria-label={`Open ${p.name}`}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onOpenSettings} style={railIconButtonStyle} aria-label="Settings" title="Settings">
          <Settings size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={railStyle}
      data-testid="sidebar"
      onMouseEnter={onAutoExpand}
      onMouseLeave={onAutoCollapse}
    >
      <div style={sectionHeaderStyle}>
        <button type="button" onClick={onToggleCollapsed} style={headerIconButtonStyle} aria-label="Collapse project navigation" title="Collapse projects">
          <PanelLeftClose size={14} />
        </button>
        <span>PROJECTS</span>
        <button type="button" onClick={onTogglePin} style={headerIconButtonStyle} aria-label={pinned ? 'Unpin project navigation' : 'Pin project navigation'} title={pinned ? 'Pinned' : 'Auto-hide'}>
          {pinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px', minHeight: 0 }} data-testid="sidebar-projects">
        {visibleProjects.map((p) => {
          const isActive = p.id === activeId;
          const availability = p.availability ?? 'available';
          const ProjectIcon = availability === 'available' ? FolderOpen : FolderX;
          return (
            <div key={p.id} style={rowOuterStyle} data-testid={`project-row-${p.id}`}>
              <div
                onClick={() => raw.getState().selectProject(p.id)}
                style={projectItemStyle(isActive, availability)}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void raw.getState().selectProject(p.id);
                  }
                }}
                aria-current={isActive ? 'true' : 'false'}
              >
                <ProjectIcon
                  size={14}
                  style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6, color: availability === 'available' ? undefined : '#f59e0b' }}
                />
                <span
                  style={projectLabelStyle(availability)}
                  title={availability === 'missing' ? `${p.name} (folder missing)` : p.name}
                >
                  {p.name}
                </span>
                {availability !== 'available' && (
                  <span style={availabilityBadgeStyle} aria-label="Folder unavailable">
                    {availability === 'missing' ? 'Missing' : 'Unavail.'}
                  </span>
                )}
                <button
                  ref={(node) => { menuTriggerRefs.current.set(p.id, node); }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuOpenFor === p.id) {
                      closeProjectMenu();
                    } else {
                      openProjectMenu(p, e);
                    }
                  }}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenFor === p.id}
                  aria-label={`Project actions for ${p.name}`}
                  style={menuTriggerStyle}
                  data-testid={`project-menu-trigger-${p.id}`}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
              {isActive && (
                <div style={chatEntryStyle}>
                  <div style={chatItemStyle}>
                    <MessageSquare size={11} />
                    <span>General chat</span><span style={miniDevStyle}>DEV</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visibleProjects.length === 0 && (
          <div style={{ padding: 12, color: 'var(--cron-panel-text-muted)', fontSize: 'var(--cron-font-size-sm)', textAlign: 'center' }}>
            No projects yet
          </div>
        )}
      </div>

      <div style={lowerStackStyle} data-testid="sidebar-lower-stack">
        <div style={blockStyle}>
          <div style={blockHeaderStyle}>CURRENT PROJECT <span style={miniDevStyle}>DEV</span></div>
          <div style={blockBodyStyle}>
            <div>Repo: {activeProject ? activeProject.name : 'Not opened'}</div>
            <div>Branch: —</div>
            <div>Phase: <span style={{ color: '#3b82f6' }}>Plan</span></div>
            <div style={safetyRowStyle}>
              <Shield size={10} color="#22c55e" />
              <span style={{ color: '#22c55e' }}>Safety: Locked</span>
            </div>
            <div>Last Check: —</div>
          </div>
        </div>

        <div style={blockStyle}>
          <div style={blockHeaderStyle}>AGENT STATE <span style={miniDevStyle}>DEV</span></div>
          <div style={blockBodyStyle}>
            <div style={statusRowStyle}>
              <Activity size={9} color="#38bdf8" />
              <span>CC: <span style={{ color: '#38bdf8' }}>{isRestarting ? 'Restarting' : 'Waiting'}</span></span>
            </div>
            <div style={statusRowStyle}>
              <Shield size={9} color="#f59e0b" />
              <span>Review: <span style={{ color: '#f59e0b' }}>Locked</span></span>
            </div>
            <div style={statusRowStyle}>
              <Shield size={9} color="#f59e0b" />
              <span>Release: <span style={{ color: '#f59e0b' }}>Locked</span></span>
            </div>
          </div>
        </div>

        <div style={bottomBlockStyle}>
          {copyConfirm && (
            <div style={copyConfirmStyle} role="status" aria-live="polite" data-testid="copy-confirm">
              <Check size={11} color="#22c55e" />
              <span>Copied</span>
            </div>
          )}
          {confirmationError && (
            <div style={confirmationErrorStyle} role="alert">{confirmationError}</div>
          )}
          <button type="button" onClick={onOpenSettings} style={bottomLinkStyle}>
            <Settings size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={bottomLinkLabelStyle}>Settings</span>
          </button>
          <div style={bottomLinkStyle}>
            <User size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={bottomLinkLabelStyle}>Account</span><span style={miniDevStyle}>DEV</span>
          </div>
          <div style={bottomSpacerStyle} />
        </div>
      </div>

      {menuProject && menuAnchor && (
        <ProjectContextMenu
          key={menuProject.id}
          open
          anchor={menuAnchor}
          projectAvailability={menuProject.availability}
          archived={menuProject.archived}
          onClose={closeProjectMenu}
          onAction={(action) => handleMenuAction(menuProject, action)}
        />
      )}

      <ConfirmDialog
        open={dialog.kind === 'archive' && !!dialog.project}
        title="Remove from CRON"
        description={`This will hide “${dialog.project?.name ?? ''}” from CRON. Your Windows folder and Git repository are not deleted.`}
        details={
          dialog.project
            ? [
                `Project: ${dialog.project.name}`,
                `Stored path: ${dialog.project.rootPath}`,
                'No files are removed. No Git operations run.',
                'Linked tasks, approvals, executions, and audit history remain in the store.',
                'You can re-open the same folder later; history will be restored.',
              ]
            : []
        }
        confirmLabel="Remove from CRON"
        destructive
        onCancel={() => {
          setDialog({ kind: null, project: null });
          setConfirmationError(null);
        }}
        onConfirm={async () => {
          const project = dialog.project;
          setDialog({ kind: null, project: null });
          if (!project) return;
          try {
            await raw.getState().archiveProject(project.id);
            setConfirmationError(null);
          } catch (err) {
            setConfirmationError(err instanceof Error ? err.message : 'Failed to remove project');
          }
        }}
      />

      <RenameDialog
        open={dialog.kind === 'rename' && !!dialog.project}
        currentName={dialog.project?.name ?? ''}
        projectPath={dialog.project?.rootPath ?? ''}
        onCancel={() => setDialog({ kind: null, project: null })}
        onConfirm={async (nextName) => {
          const project = dialog.project;
          setDialog({ kind: null, project: null });
          if (!project) return;
          await raw.getState().renameProject(project.id, nextName);
        }}
      />
    </div>
  );
}

const railStyle: CSSProperties = {
  width: 210,
  background: 'linear-gradient(180deg, #030711 0%, #07111f 45%, #0b1d36 100%)',
  borderRight: '1px solid var(--cron-panel-border)',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--cron-panel-text)',
  fontFamily: 'var(--cron-font-family)',
  userSelect: 'none',
  overflow: 'hidden',
  minHeight: 0,
  transition: 'width .16s ease',
};

const collapsedRailStyle: CSSProperties = {
  width: 48,
  background: 'linear-gradient(180deg, #030711 0%, #07111f 45%, #0b1d36 100%)',
  borderRight: '1px solid var(--cron-panel-border)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  color: 'var(--cron-panel-text)',
  fontFamily: 'var(--cron-font-family)',
  overflow: 'hidden',
  minHeight: 0,
  padding: '8px 5px',
  boxSizing: 'border-box',
  transition: 'width .16s ease',
};

const railIconButtonStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  border: '1px solid rgba(100,160,255,.24)',
  background: 'rgba(18,63,134,.22)',
  color: '#a9c7f0',
  borderRadius: 5,
  cursor: 'pointer',
  flexShrink: 0,
};

const collapsedProjectStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
  alignItems: 'center',
  overflow: 'auto',
  minHeight: 0,
};

const collapsedProjectButtonStyle = (active: boolean): CSSProperties => ({
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  border: active ? '1px solid rgba(125,177,255,.68)' : '1px solid rgba(100,160,255,.22)',
  background: active ? 'rgba(18,63,134,.58)' : 'rgba(4,20,46,.4)',
  color: active ? '#eaf2ff' : '#8da4c7',
  borderRadius: 5,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
  fontFamily: 'var(--cron-font-family)',
  flexShrink: 0,
});

/** Fixed lower stack (current project, agent state, settings/account). Kept
 *  out of the scrolling projects region; never overlaps the taskbar because the
 *  projects list above it absorbs all remaining flex space. `min-height` is
 *  left at its auto default so the stack always keeps its full natural height
 *  (the projects list is the only shrinkable/scrollable region above it). */
const lowerStackStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px 1fr 24px',
  alignItems: 'center',
  gap: 4,
  padding: '9px 14px',
  textAlign: 'center',
  borderBottom: '1px solid var(--cron-panel-border)',
  fontSize: 'var(--cron-font-size-xs)',
  fontWeight: 700,
  color: 'var(--cron-panel-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  flexShrink: 0,
};

const headerIconButtonStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 24,
  height: 24,
  border: '1px solid rgba(100,160,255,.18)',
  background: 'rgba(18,63,134,.18)',
  color: '#8da4c7',
  borderRadius: 4,
  cursor: 'pointer',
  padding: 0,
};

const rowOuterStyle: CSSProperties = { marginBottom: 1, position: 'relative' };

const projectItemStyle = (active: boolean, availability: 'available' | 'missing' | 'unavailable'): CSSProperties => ({
  padding: '5px 8px 5px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  background: active ? 'var(--cron-accent-subtle)' : 'transparent',
  color: active ? '#eaf2ff' : 'var(--cron-panel-text)',
  fontSize: 'var(--cron-font-size-md)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 1,
  border: active ? '1px solid rgba(59, 130, 246, 0.18)' : '1px solid transparent',
  minWidth: 0,
  position: 'relative',
  fontStyle: availability === 'missing' ? 'italic' : 'normal',
  opacity: availability === 'available' ? 1 : 0.85,
});

const projectLabelStyle = (availability: 'available' | 'missing' | 'unavailable'): CSSProperties => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  minWidth: 0,
  textDecoration: availability === 'missing' ? 'line-through' : 'none',
  textDecorationColor: 'rgba(245, 158, 11, 0.6)',
});

const availabilityBadgeStyle: CSSProperties = {
  fontSize: 8,
  letterSpacing: 0.5,
  padding: '1px 5px',
  borderRadius: 6,
  background: 'rgba(245, 158, 11, 0.18)',
  color: '#f59e0b',
  textTransform: 'uppercase',
  flexShrink: 0,
  fontWeight: 700,
};

const menuTriggerStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--cron-panel-text-muted)',
  cursor: 'pointer',
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 4,
  flexShrink: 0,
  opacity: 0.45,
  marginLeft: 'auto',
};

const chatEntryStyle: CSSProperties = {
  paddingLeft: 22,
  fontSize: 'var(--cron-font-size-xs)',
  color: 'var(--cron-panel-text-muted)',
};

const chatItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 8px',
  borderRadius: 5,
  cursor: 'default',
};

const miniDevStyle: CSSProperties = {
  color: '#ff6b6b',
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: 0.7,
  marginLeft: 'auto',
  flexShrink: 0,
};

const blockStyle: CSSProperties = {
  borderTop: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
};

const blockHeaderStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--cron-panel-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
};

const blockBodyStyle: CSSProperties = {
  padding: '2px 12px 6px',
  fontSize: 'var(--cron-font-size-xs)',
  color: 'var(--cron-panel-text-muted)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const safetyRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const copyConfirmStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  color: '#22c55e',
  padding: '2px 6px 4px',
};

const confirmationErrorStyle: CSSProperties = {
  fontSize: 10,
  color: '#fca5a5',
  padding: '0 8px 4px',
};

const bottomLinkStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  color: 'var(--cron-panel-text-muted)',
  fontSize: 'var(--cron-font-size-sm)',
  marginBottom: 1,
  minWidth: 0,
  overflow: 'hidden',
};

const bottomLinkLabelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const bottomBlockStyle: CSSProperties = {
  borderTop: '1px solid var(--cron-panel-border)',
  padding: '4px 4px 0',
  flexShrink: 0,
};

/** Clearance so Settings/Account never sit flush against the Windows taskbar. */
const bottomSpacerStyle: CSSProperties = {
  height: 18,
  flexShrink: 0,
};
