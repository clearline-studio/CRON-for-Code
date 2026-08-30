import { type CSSProperties } from 'react';
import {
  Boxes,
  CirclePlus,
  CloudUpload,
  Folder,
  GraduationCap,
  House,
  LayoutTemplate,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { AccountArea } from './AccountArea.js';

export type LeftNavItemId =
  | 'home'
  | 'projects'
  | 'create-new'
  | 'templates'
  | 'my-apps'
  | 'deployments'
  | 'learn'
  | 'settings';

interface NavItem {
  id: LeftNavItemId;
  label: string;
  icon: LucideIcon;
}

// Spec §4 — left application navigation, eight items.
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'create-new', label: 'Create New', icon: CirclePlus },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'my-apps', label: 'My Apps', icon: Boxes },
  { id: 'deployments', label: 'Deployments', icon: CloudUpload },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Every item has a real screen or action. Create New and Settings are actions
// that run flows; every other item selects a real view (Home / Projects /
// Templates / My Apps / Deployments / Learn).

interface LeftNavProps {
  /** Currently selected nav item id. */
  selected: LeftNavItemId;
  onSelect: (id: LeftNavItemId) => void;
  /** Create New -> the existing New-Project (folder picker) flow. */
  onNewProject: () => void;
  /** Settings -> the existing ModelSettings dialog. */
  onOpenSettings: () => void;
}

export function LeftNav({ selected, onSelect, onNewProject, onOpenSettings }: LeftNavProps) {
  function handleClick(item: NavItem) {
    if (item.id === 'create-new') {
      onNewProject();
      return;
    }
    if (item.id === 'settings') {
      onOpenSettings();
      return;
    }
    onSelect(item.id);
  }

  return (
    <aside style={navStyle} data-testid="left-nav">
      <nav style={navListStyle} aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSelected = item.id === selected;
          const isAction = item.id === 'create-new' || item.id === 'settings';
          const itemStyle = isSelected ? selectedItemStyle : isAction ? actionItemStyle : baseItemStyle;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              style={itemStyle}
              data-testid={`nav-item-${item.id}`}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <AccountArea />
    </aside>
  );
}

function unwrapUrl(value: string): string {
  return value.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
}

// Compact brand header for the top bar (Intelligence-style): the animated logo
// loop sits inline against the "CRON for Code" wordmark, so the whole brand
// reads as one unit at the top-left. The video URL flows in via the
// --cron-logo-video-url CSS variable set in main.tsx, falling back to the
// static logo, then the icon.
export function LogoHeader() {
  const logoVideo = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-video-url').trim();
  const logoImage = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasVideo = !!logoVideo && logoVideo !== 'none';
  const hasImage = !!logoImage && logoImage !== 'none';

  return (
    <div style={logoHeaderStyle} data-testid="app-logo-header">
      {hasVideo || hasImage ? (
        <div style={logoFrameStyle} data-testid="menu-logo-frame">
          {hasVideo ? (
            <video
              src={unwrapUrl(logoVideo)}
              autoPlay
              loop
              muted
              playsInline
              style={logoMediaStyle}
              aria-label="CRON animated logo"
            />
          ) : (
            <img src={unwrapUrl(logoImage)} alt="CRON" style={logoMediaStyle} />
          )}
        </div>
      ) : (
        <Boxes size={24} color="#45ccff" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

const navStyle: CSSProperties = {
  width: 190,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'rgba(4, 13, 28, 0.94)',
  borderRight: '1px solid rgba(100,160,255,.18)',
  boxSizing: 'border-box',
};

const logoHeaderStyle: CSSProperties = {
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
};

// Frameless logo (Intelligence-style): no metallic box ring; the animated loop
// sits directly on the top bar's dark background.
const logoFrameStyle: CSSProperties = {
  width: 72,
  height: 72,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  borderRadius: '50%',
  overflow: 'hidden',
};

const logoMediaStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
};

const navListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '6px 8px',
};

const baseItemStyle: CSSProperties = {
  height: 41,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 12px',
  width: '100%',
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
  boxSizing: 'border-box',
  flexShrink: 0,
};

// Electric-blue rounded rect + subtle glow for the selected item.
const selectedItemStyle: CSSProperties = {
  ...baseItemStyle,
  color: '#ffffff',
  background: 'rgba(23, 107, 255, 0.18)',
  borderColor: 'rgba(31, 130, 255, 0.55)',
  boxShadow: '0 0 14px rgba(23, 107, 255, 0.28)',
  fontWeight: 600,
};

const actionItemStyle: CSSProperties = {
  ...baseItemStyle,
  color: '#a9c7f0',
};
