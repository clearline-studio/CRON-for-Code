import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  CloudUpload,
  Folder,
  FolderPlus,
  GraduationCap,
  House,
  LayoutTemplate,
  ListFilter,
  Search,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../context.js';
import { visibleProjects } from '../store.js';
import { relativeTime } from '../time.js';

// App sidebar (Intelligence shell parity): ONE 288px column that carries
// everything the old rail + project panel did — a primary "New Project" action
// at the top, a sectioned navigation list (Home / Templates / My Apps /
// Deployments / Learn), then a Projects section that lists the real projects
// (search + sort, active highlighting, "View all projects"), and the code
// safety shield pinned at the bottom. Rows match Intelligence's look: 14px,
// icon + label, blue left-edge accent + glow when active, glowing divider
// between sections.

export type SidebarViewId = 'home' | 'templates' | 'my-apps' | 'deployments' | 'learn';

const VIEW_ROWS: { id: SidebarViewId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'my-apps', label: 'My Apps', icon: Boxes },
  { id: 'deployments', label: 'Deployments', icon: CloudUpload },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
];

type SortMode = 'recent' | 'name';

interface AppSidebarProps {
  /** Runs the existing New-Project (folder picker) flow. */
  onNewProject: () => void;
  /** Selects a project (opens it in the workspace). */
  onSelectProject: (projectId: string) => void;
  /** "View all projects" — switches to the full Projects (My Apps) view. */
  onViewAll: () => void;
  /** Opens the Review panel (code-safety shield / approvals). */
  onOpenReview: () => void;
  /** Selects a centre view (Home / Templates / My Apps / Deployments / Learn). */
  onSelectView: (view: SidebarViewId) => void;
  /** Currently active centre view; null = workspace/chat focus. */
  activeView: SidebarViewId | null;
}

export function AppSidebar({ onNewProject, onSelectProject, onViewAll, onOpenReview, onSelectView, activeView }: AppSidebarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const approvals = useWorkspaceStore((s) => s.approvals);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [sortOpen, setSortOpen] = useState(false);

  const all = visibleProjects(projects);
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed === '' ? all : all.filter((p) => p.name.toLowerCase().includes(trimmed));
  const visible = [...filtered].sort((a, b) =>
    sortMode === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt,
  );

  const pendingApprovalCount = approvals.filter((approval) => approval.status === 'requested').length;
  const hasPendingApprovals = pendingApprovalCount > 0;
  const ShieldIcon = hasPendingApprovals ? ShieldAlert : ShieldCheck;
  const shieldLabel = hasPendingApprovals
    ? `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? '' : 's'} pending — review them`
    : 'Code safety active — approvals on';

  function pickSort(mode: SortMode) {
    setSortMode(mode);
    setSortOpen(false);
  }

  return (
    <aside style={sidebarStyle} data-testid="app-sidebar" aria-label="App navigation">
      <style>{appSidebarStyles}</style>

      <button
        type="button"
        onClick={onNewProject}
        style={newProjectStyle}
        className="cron-sidebar-new"
        data-testid="sidebar-new-project"
      >
        <FolderPlus size={15} className="cron-sidebar-new-icon" />
        <span>New Project</span>
      </button>

      <nav style={navStyle} aria-label="Sections">
        <section style={sectionStyle}>
          <div style={sectionHeadStyle}>Workspace</div>
          {VIEW_ROWS.map((row) => {
            const Icon = row.icon;
            const isActive = activeView === row.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelectView(row.id)}
                style={isActive ? navRowActiveStyle : navRowStyle}
                className={isActive ? 'cron-sidebar-row is-active' : 'cron-sidebar-row'}
                data-testid={`nav-row-${row.id}`}
              >
                <Icon size={15} className="cron-sidebar-row-icon" />
                <span>{row.label}</span>
              </button>
            );
          })}
        </section>

        <div style={dividerStyle} />

        <section style={sectionStyle}>
          <div style={projectSectionHeadStyle}>
            <span style={sectionHeadStyle}>Projects</span>
            <small style={sectionCountStyle}>{all.length}</small>
          </div>

          <div style={searchRowStyle}>
            <div style={searchBoxStyle}>
              <Search size={13} style={{ color: '#5f7392', flexShrink: 0 }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects..."
                style={searchInputStyle}
                aria-label="Search projects"
                data-testid="sidebar-projects-search"
              />
            </div>
            <div style={filterWrapStyle}>
              <button
                type="button"
                style={sortMode === 'name' ? filterActiveStyle : filterButtonStyle}
                title={sortMode === 'name' ? 'Sorted by Name (A–Z)' : 'Sorted by Recently updated'}
                aria-label="Sort projects"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((open) => !open)}
                data-testid="project-sort-toggle"
              >
                <ListFilter size={14} />
              </button>
              {sortOpen && (
                <div style={sortMenuStyle} role="menu" data-testid="project-sort-menu">
                  <button
                    type="button"
                    role="menuitem"
                    style={sortOptionStyle(sortMode === 'recent')}
                    onClick={() => pickSort('recent')}
                    data-testid="sort-option-recent"
                  >
                    <span>Recently updated</span>
                    {sortMode === 'recent' && <Check size={12} />}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={sortOptionStyle(sortMode === 'name')}
                    onClick={() => pickSort('name')}
                    data-testid="sort-option-name"
                  >
                    <span>Name (A–Z)</span>
                    {sortMode === 'name' && <Check size={12} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {all.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyTitleStyle}>Nothing here yet</div>
              <div style={emptyHintStyle}>Start a project and it will appear in this list.</div>
            </div>
          ) : visible.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyTitleStyle}>No matches</div>
              <div style={emptyHintStyle}>No projects match your search.</div>
            </div>
          ) : (
            <div style={projectListStyle}>
              {visible.map((project) => {
                const isActive = project.id === activeProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    style={isActive ? projectRowActiveStyle : projectRowStyle}
                    className={isActive ? 'cron-sidebar-row is-active' : 'cron-sidebar-row'}
                    data-testid={`sidebar-project-row-${project.id}`}
                  >
                    <span style={projectIconStyle}>
                      <Folder size={15} />
                    </span>
                    <span style={projectTextStyle}>
                      <span style={projectNameStyle}>{project.name}</span>
                      <span style={projectMetaStyle}>Updated {relativeTime(project.updatedAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button type="button" onClick={onViewAll} style={viewAllStyle} title="View all projects" data-testid="view-all-projects">
            View all projects <ArrowRight size={13} />
          </button>
        </section>
      </nav>

      <div style={shieldDividerStyle} />
      <button
        type="button"
        onClick={onOpenReview}
        style={shieldButtonStyle}
        aria-label={shieldLabel}
        title={shieldLabel}
        data-testid="code-safety-shield"
      >
        <ShieldIcon size={17} color={hasPendingApprovals ? '#f59e0b' : '#22c55e'} />
        <span style={shieldLabelStyle}>{hasPendingApprovals ? `${pendingApprovalCount} pending` : 'Code safety on'}</span>
        {hasPendingApprovals && (
          <span style={shieldBadgeStyle} data-testid="code-safety-badge">{pendingApprovalCount}</span>
        )}
      </button>
    </aside>
  );
}

// NOTE: section-labelled rows and the Projects list are the two navigation
// surfaces; everything else in the old rail/panel (Create New as a tab, the
// collapsed Projects panel) moved into the single New Project button and the
// always-visible Projects section.

const sidebarStyle: CSSProperties = {
  width: 256,
  height: '100%',
  minHeight: 0,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '0 12px 12px',
  boxSizing: 'border-box',
  background: '#000307',
  borderRight: '1px solid rgba(34, 132, 255, 0.28)',
  overflow: 'hidden',
};

const newProjectStyle: CSSProperties = {
  flexShrink: 0,
  width: '100%',
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  margin: '12px 0 14px',
  border: '1px solid rgba(48, 166, 255, 0.75)',
  borderRadius: 9,
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 0 14px rgba(23, 107, 255, 0.35)',
};

const navStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flexShrink: 0,
};

const sectionHeadStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: '#86ade8',
  padding: '0 2px 2px',
};

const projectSectionHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '0 2px 0',
};

const sectionCountStyle: CSSProperties = {
  fontSize: 10,
  color: '#5f7392',
};

// Glowing divider line between sections (Intelligence shell look).
const dividerStyle: CSSProperties = {
  flexShrink: 0,
  height: 2,
  margin: '14px 0 10px',
  borderRadius: 2,
  background: 'linear-gradient(90deg, transparent 2%, rgba(64, 176, 255, 0.95) 18%, rgba(140, 216, 255, 1) 50%, rgba(64, 176, 255, 0.95) 82%, transparent 98%)',
  boxShadow: '0 0 6px rgba(64, 176, 255, 0.7), 0 0 14px rgba(64, 176, 255, 0.35)',
};

const navRowBase: CSSProperties = {
  width: '100%',
  height: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 11px',
  border: '1px solid rgba(36, 137, 240, 0.5)',
  borderRadius: 9,
  background: 'rgba(10, 22, 44, 0.45)',
  color: '#d9e8ff',
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: 'var(--cron-font-family)',
  cursor: 'pointer',
  boxSizing: 'border-box',
  textAlign: 'left',
  flexShrink: 0,
  transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease',
};

const navRowStyle: CSSProperties = { ...navRowBase };

const navRowActiveStyle: CSSProperties = {
  ...navRowBase,
  color: '#ffffff',
  borderColor: 'rgba(48, 166, 255, 0.9)',
  background: 'rgba(23, 107, 255, 0.18)',
  boxShadow: 'inset 3px 0 0 #2ea8ff, 0 0 16px rgba(35, 143, 255, 0.18)',
};

const searchRowStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
};

const searchBoxStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 8px',
  border: '1px solid rgba(100,160,255,.22)',
  borderRadius: 7,
  background: 'rgba(9, 18, 34, 0.85)',
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#eaf2ff',
  fontSize: 11.5,
  fontFamily: 'var(--cron-font-family)',
};

const filterWrapStyle: CSSProperties = { position: 'relative', flexShrink: 0 };

const filterButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  border: '1px solid rgba(100,160,255,.22)',
  borderRadius: 7,
  background: 'rgba(9, 18, 34, 0.85)',
  color: '#8da4c7',
  cursor: 'pointer',
};

const filterActiveStyle: CSSProperties = {
  ...filterButtonStyle,
  color: '#7fb0ff',
  borderColor: 'rgba(31, 130, 255, 0.5)',
  background: 'rgba(23, 107, 255, 0.14)',
};

const sortMenuStyle: CSSProperties = {
  position: 'absolute',
  top: 32,
  right: 0,
  zIndex: 30,
  width: 170,
  display: 'flex',
  flexDirection: 'column',
  padding: 4,
  border: '1px solid rgba(100,160,255,.3)',
  borderRadius: 8,
  background: '#0d1b31',
  boxShadow: '0 8px 22px rgba(0,0,0,.5)',
};

const sortOptionStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  padding: '7px 9px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: active ? '#eaf2ff' : '#8da4c7',
  fontSize: 11.5,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: active ? 600 : 400,
});

const projectListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const projectRowStyle: CSSProperties = {
  ...navRowBase,
  height: 46,
};

const projectRowActiveStyle: CSSProperties = {
  ...navRowActiveStyle,
  height: 46,
};

const projectIconStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 6,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const projectTextStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
};

const projectNameStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 650,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: '#eaf2ff',
};

const projectMetaStyle: CSSProperties = {
  fontSize: 10,
  color: '#5f7392',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const viewAllStyle: CSSProperties = {
  flexShrink: 0,
  width: '100%',
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  marginTop: 6,
  border: '1px solid rgba(100,160,255,.24)',
  borderRadius: 7,
  background: 'rgba(10, 26, 52, .5)',
  color: '#8da4c7',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 11,
  cursor: 'pointer',
};

const emptyStateStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '8px 4px',
  color: '#8da4c7',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#c6d8f7',
};

const emptyHintStyle: CSSProperties = {
  fontSize: 10.5,
  lineHeight: 1.45,
  color: '#5f7392',
};

const shieldDividerStyle: CSSProperties = {
  flexShrink: 0,
  height: 1,
  margin: '10px 0 8px',
  background: 'rgba(100,160,255,.16)',
};

const shieldButtonStyle: CSSProperties = {
  flexShrink: 0,
  width: '100%',
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 10px',
  border: '1px solid transparent',
  borderRadius: 9,
  background: 'transparent',
  color: '#c9d9f0',
  fontSize: 12,
  fontFamily: 'var(--cron-font-family)',
  cursor: 'pointer',
  position: 'relative',
};

const shieldLabelStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const shieldBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: 2,
  left: 26,
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

const appSidebarStyles = `
  .cron-sidebar-row:hover:not(.is-active) { background: rgba(23, 107, 255, 0.10); border-color: rgba(48, 166, 255, 0.65); }
  .cron-sidebar-row.is-active .cron-sidebar-row-icon { color: #9fc6ff; filter: drop-shadow(0 0 6px rgba(31,130,255,.75)); }
  .cron-sidebar-row-icon { color: #c9d9f0; transition: color .15s ease, filter .15s ease; }
  .cron-sidebar-row:not(.is-active):hover .cron-sidebar-row-icon { color: #bcd4ff; filter: drop-shadow(0 0 5px rgba(31,130,255,.5)); }
  .cron-sidebar-new { transition: filter .15s ease, box-shadow .15s ease; }
  .cron-sidebar-new:hover { filter: brightness(1.12); box-shadow: 0 0 18px rgba(23, 107, 255, 0.5); }
`;
