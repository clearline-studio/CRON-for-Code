import { useState, type CSSProperties, type MouseEvent } from 'react';
import {
  Boxes,
  CirclePlus,
  CloudUpload,
  Folder,
  GraduationCap,
  House,
  LayoutTemplate,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../context.js';

// Polish round 2 + complete screens — the left edge is a strip of EIGHT
// icon-only book-tabs: Home (centre view), Projects (project browser), Create
// New (ACTION: runs the New-Project flow), Templates / My Apps / Deployments /
// Learn (centre views). Settings moved to the top bar. The Menu tab / nav panel
// footer lives below the rail (ProfileFooter). Tabs show only their icon; the
// section name reveals on hover as a small flyout label. There is deliberately
// no "Files" tab.
export type LeftTabId =
  | 'home'
  | 'projects'
  | 'create-new'
  | 'templates'
  | 'my-apps'
  | 'deployments'
  | 'learn';

interface LeftTabDef {
  id: LeftTabId;
  label: string;
  icon: LucideIcon;
  /** Action tabs trigger a flow instead of opening a panel. */
  action?: boolean;
}

const LEFT_TABS: LeftTabDef[] = [
  // Home is a centre view (the Home screen), not a left panel.
  { id: 'home', label: 'Home', icon: House },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'create-new', label: 'Create New', icon: CirclePlus, action: true },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'my-apps', label: 'My Apps', icon: Boxes },
  { id: 'deployments', label: 'Deployments', icon: CloudUpload },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
];

interface LeftTabStripProps {
  /** Currently open left panel tab (null = strip only, centre takes the space). */
  active: LeftTabId | null;
  onToggle: (tab: LeftTabId) => void;
  /** Code-safety shield click: opens the Review panel (approvals). */
  onOpenReview?: () => void;
}

interface Flyout {
  id: LeftTabId;
  label: string;
  x: number;
  y: number;
}

export function LeftTabStrip({ active, onToggle, onOpenReview }: LeftTabStripProps) {
  const [flyout, setFlyout] = useState<Flyout | null>(null);

  // Code-safety shield (design polish): read-only indicator of the real
  // execution-governance state. Green ShieldCheck by default; amber
  // ShieldAlert + a count badge while approvals are pending (status
  // "requested"). Clicking opens the Review panel. Does NOT touch OpenCode
  // wiring — it only reads `approvals` from the store.
  const approvals = useWorkspaceStore((s) => s.approvals);
  const pendingApprovalCount = approvals.filter((approval) => approval.status === 'requested').length;
  const hasPendingApprovals = pendingApprovalCount > 0;
  const ShieldIcon = hasPendingApprovals ? ShieldAlert : ShieldCheck;
  const shieldLabel = hasPendingApprovals
    ? `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? '' : 's'} pending — review them`
    : 'Code safety active — approvals on';

  function showFlyout(tab: LeftTabDef, event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setFlyout({
      id: tab.id,
      label: tab.label,
      x: rect.right + 8,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <div style={stripStyle} aria-label="Left navigation" data-testid="left-tab-strip">
      <style>{leftTabStyles}</style>
      {LEFT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isAction = !!tab.action;
        const isActive = !isAction && tab.id === active;
        const buttonStyle = isActive ? activeTabStyle : isAction ? actionTabStyle : tabStyle;
        return (
          <div
            key={tab.id}
            style={tabWrapStyle}
            onMouseEnter={(event) => showFlyout(tab, event)}
            onMouseLeave={() => setFlyout(null)}
            data-testid={`left-tab-wrap-${tab.id}`}
          >
            <button
              type="button"
              onClick={() => onToggle(tab.id)}
              style={buttonStyle}
              className={isActive ? 'cron-left-tab is-active' : isAction ? 'cron-left-tab is-action' : 'cron-left-tab'}
              aria-label={isAction ? tab.label : isActive ? `Close ${tab.label} panel` : `Open ${tab.label} panel`}
              data-testid={`left-tab-${tab.id}`}
            >
              <Icon size={16} className="cron-left-tab-icon" />
              <span style={tabLabelStyle}>{tab.label}</span>
            </button>
          </div>
        );
      })}
      {flyout && (
        <div style={{ ...flyoutStyle, left: flyout.x, top: flyout.y }} role="tooltip" data-testid={`left-tab-label-${flyout.id}`}>
          {flyout.label}
        </div>
      )}

      <div style={shieldSpacerStyle} />
      <div style={shieldDividerStyle} />
      <div style={shieldWrapStyle}>
        <button
          type="button"
          onClick={onOpenReview}
          style={shieldButtonStyle}
          aria-label={shieldLabel}
          title={shieldLabel}
          data-testid="code-safety-shield"
        >
          <ShieldIcon size={17} color={hasPendingApprovals ? '#f59e0b' : '#22c55e'} />
          {hasPendingApprovals && (
            <span style={shieldBadgeStyle} data-testid="code-safety-badge">{pendingApprovalCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

const stripStyle: CSSProperties = {
  width: 172,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '10px 8px 16px',
  boxSizing: 'border-box',
  background: 'rgba(4, 13, 28, 0.94)',
  borderRight: '1px solid rgba(100,160,255,.18)',
  overflowY: 'auto',
};

const tabWrapStyle: CSSProperties = {
  position: 'relative',
  flexShrink: 0,
  width: '100%',
};

const baseTabStyle: CSSProperties = {
  width: '100%',
  height: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 11px',
  flexShrink: 0,
  border: '1px solid transparent',
  borderRadius: 9,
  background: 'transparent',
  color: '#e8f0fb',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 12,
  boxSizing: 'border-box',
  textAlign: 'left',
};

const tabLabelStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tabStyle: CSSProperties = {
  ...baseTabStyle,
  color: '#e8f0fb',
};

// Active panel tab: electric-blue treatment, a blue left-edge accent line, and a
// subtle glow (spec §31). Text is bright white; the icon carries a blue halo.
const activeTabStyle: CSSProperties = {
  ...baseTabStyle,
  color: '#ffffff',
  background: 'rgba(23, 107, 255, 0.18)',
  borderColor: 'rgba(31, 130, 255, 0.55)',
  boxShadow: 'inset 3px 0 0 #1F82FF, 0 0 12px rgba(23, 107, 255, 0.28)',
};

// Create New / Settings read as primary actions: electric-blue tint, no panel state.
const actionTabStyle: CSSProperties = {
  ...baseTabStyle,
  color: '#a9c7f0',
  background: 'rgba(23, 107, 255, 0.08)',
  borderColor: 'rgba(31, 130, 255, 0.3)',
};

// Hover flyout: fixed-position so it escapes the strip's scroll clip; it always
// appears just right of the tab and never intercepts the pointer.
const flyoutStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 60,
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  padding: '5px 10px',
  borderRadius: 6,
  background: '#0d1b31',
  border: '1px solid rgba(100,160,255,.28)',
  boxShadow: '0 6px 18px rgba(0,0,0,.45)',
  color: '#f5f9ff',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

// --- Code-safety shield: pinned to the bottom of the strip, just above the
// profile avatar, separated by a subtle divider. ---
const shieldSpacerStyle: CSSProperties = {
  flexShrink: 0,
  marginTop: 'auto',
  minHeight: 6,
};

const shieldDividerStyle: CSSProperties = {
  flexShrink: 0,
  height: 1,
  margin: '0 8px',
  background: 'rgba(100,160,255,.16)',
};

const shieldWrapStyle: CSSProperties = {
  position: 'relative',
  flexShrink: 0,
  padding: '8px 0 4px',
  display: 'grid',
  placeItems: 'center',
};

const shieldButtonStyle: CSSProperties = {
  width: '100%',
  height: 38,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  position: 'relative',
  border: '1px solid transparent',
  borderRadius: 9,
  background: 'transparent',
  cursor: 'pointer',
};

const shieldBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: -3,
  right: 2,
  minWidth: 15,
  height: 15,
  display: 'grid',
  placeItems: 'center',
  padding: '0 3px',
  borderRadius: 999,
  background: '#f59e0b',
  color: '#1a1206',
  fontSize: 9,
  fontWeight: 800,
  boxShadow: '0 0 8px rgba(245,158,11,.6)',
};

// Scoped styles: a blue halo glow on the tab icons, brighter white text on the
// active tab, and a gentle hover lift so the whole rail reads as interactive.
const leftTabStyles = `
  .cron-left-tab { transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease; }
  .cron-left-tab:hover { background: rgba(23, 107, 255, 0.10); border-color: rgba(31, 130, 255, 0.35); }
  .cron-left-tab.is-active { color: #ffffff; }
  .cron-left-tab.is-active .cron-left-tab-icon { color: #9fc6ff; filter: drop-shadow(0 0 6px rgba(31,130,255,.75)); }
  .cron-left-tab-icon { color: #c9d9f0; transition: color .15s ease, filter .15s ease; }
  .cron-left-tab:not(.is-active):hover .cron-left-tab-icon { color: #bcd4ff; filter: drop-shadow(0 0 5px rgba(31,130,255,.5)); }
`;
