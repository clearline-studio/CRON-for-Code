import { useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Folder, ListFilter, Plus, Search } from 'lucide-react';
import { useWorkspaceStore } from '../context.js';
import { visibleProjects } from '../store.js';
import { relativeTime } from '../time.js';

// Spec §7 — project browser panel. Driven entirely by the real `projects`
// store state; no sample data. Selected card = active project. The filter
// button toggles a simple sort (Recently updated / Name A–Z) and the footer
// "View all projects" switches to the Projects view.
type SortMode = 'recent' | 'name';

interface ProjectBrowserProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  /** "View all projects" — switches to the Projects view. */
  onViewAll: () => void;
}

export function ProjectBrowser({ onNewProject, onSelectProject, onViewAll }: ProjectBrowserProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [sortOpen, setSortOpen] = useState(false);

  const all = visibleProjects(projects);
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed === '' ? all : all.filter((p) => p.name.toLowerCase().includes(trimmed));
  const visible = [...filtered].sort((a, b) =>
    sortMode === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt,
  );

  function pickSort(mode: SortMode) {
    setSortMode(mode);
    setSortOpen(false);
  }

  return (
    <aside style={browserStyle} data-testid="project-browser">
      <header style={browserHeaderStyle}>
        <div style={browserTitleStyle}>Your Projects</div>
        <button type="button" onClick={onNewProject} style={newProjectStyle} data-testid="new-project-button">
          <Plus size={13} />
          New Project
        </button>
      </header>

      <div style={searchRowStyle}>
        <div style={searchBoxStyle}>
          <Search size={13} style={{ color: '#5f7392', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects..."
            style={searchInputStyle}
            aria-label="Search projects"
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
          <Folder size={26} opacity={0.4} color="#5f7392" />
          <div style={emptyTitleStyle}>No projects yet</div>
          <div style={emptyHintStyle}>
            Click + New Project to start building your first app. Your projects will appear here.
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div style={emptyStateStyle}>
          <Search size={22} opacity={0.4} color="#5f7392" />
          <div style={emptyTitleStyle}>No matches</div>
          <div style={emptyHintStyle}>No projects match your search. Try a different name.</div>
        </div>
      ) : (
        <div style={cardListStyle}>
          {visible.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                style={isActive ? selectedCardStyle : cardStyle}
                data-testid={`project-card-${project.id}`}
              >
                <span style={cardIconStyle}>
                  <Folder size={15} />
                </span>
                <span style={cardTextStyle}>
                  <span style={cardNameStyle}>{project.name}</span>
                  <span style={cardMetaStyle}>Updated {relativeTime(project.updatedAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <footer style={browserFooterStyle}>
        <button type="button" onClick={onViewAll} style={viewAllStyle} title="View all projects" data-testid="view-all-projects">
          View all projects <ArrowRight size={13} />
        </button>
      </footer>
    </aside>
  );
}

const browserStyle: CSSProperties = {
  width: 245,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'rgba(5, 14, 30, 0.9)',
  borderRight: '1px solid rgba(100,160,255,.18)',
  boxSizing: 'border-box',
};

const browserHeaderStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '12px 10px 6px',
};

const browserTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#eaf2ff',
};

const newProjectStyle: CSSProperties = {
  height: 26,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '0 9px',
  border: '1px solid rgba(31,130,255,.55)',
  borderRadius: 6,
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 10.5,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 0 12px rgba(23,107,255,.3)',
  flexShrink: 0,
};

const searchRowStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 10px 8px',
};

const searchBoxStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 26,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 8px',
  border: '1px solid rgba(100,160,255,.22)',
  borderRadius: 6,
  background: 'rgba(9, 18, 34, 0.85)',
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#eaf2ff',
  fontSize: 11,
  fontFamily: 'var(--cron-font-family)',
};

const filterWrapStyle: CSSProperties = {
  position: 'relative',
  flexShrink: 0,
};

const filterButtonStyle: CSSProperties = {
  width: 26,
  height: 26,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  border: '1px solid rgba(100,160,255,.22)',
  borderRadius: 6,
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
  top: 30,
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
  fontSize: 11,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: active ? 600 : 400,
});

const cardListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  padding: '0 10px 8px',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 9px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 9,
  background: 'rgba(9, 18, 34, 0.6)',
  color: '#d9e8ff',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
  flexShrink: 0,
};

const selectedCardStyle: CSSProperties = {
  ...cardStyle,
  borderColor: 'rgba(31, 130, 255, 0.6)',
  background: 'rgba(23, 107, 255, 0.14)',
  boxShadow: '0 0 12px rgba(23, 107, 255, 0.25)',
};

const cardIconStyle: CSSProperties = {
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

const cardTextStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const cardNameStyle: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: '#eaf2ff',
};

const cardMetaStyle: CSSProperties = {
  fontSize: 9.5,
  color: '#5f7392',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const browserFooterStyle: CSSProperties = {
  flexShrink: 0,
  padding: '8px 10px',
  borderTop: '1px solid rgba(100,160,255,.16)',
};

const viewAllStyle: CSSProperties = {
  width: '100%',
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  border: '1px solid rgba(100,160,255,.24)',
  borderRadius: 7,
  background: 'rgba(10, 26, 52, .5)',
  color: '#8da4c7',
  fontFamily: 'var(--cron-font-family)',
  fontSize: 10.5,
  cursor: 'pointer',
};

const emptyStateStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '0 14px',
  textAlign: 'center',
  color: '#8da4c7',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#c6d8f7',
};

const emptyHintStyle: CSSProperties = {
  fontSize: 10.5,
  lineHeight: 1.5,
  color: '#5f7392',
  maxWidth: 190,
};
