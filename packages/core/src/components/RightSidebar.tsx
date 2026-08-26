import { useState, type CSSProperties } from 'react';
import { ClipboardList, Cpu, Gauge, PanelLeftClose, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { useWorkspaceStore } from '../context.js';
import type { ExecutionRecord } from '@cron-code/contracts';
import { ActivityPanel } from './ActivityPanel.js';
import { ChangedFilesReview } from './ChangedFilesReview.js';

// Polish round 2 — the right edge is a slim tab strip with ONE open panel at a
// time (no pinning). Tabs: Build Progress, Engine, Tools, Quick Actions,
// Review. Clicking a tab slides its panel in from the right (~280px); opening
// another tab closes the previous panel, and each panel header has a
// close/drawer icon that collapses it back to a tab. Placeholder panels keep
// the honest "coming next" copy (no fake data). The Review tab shows the real
// Changed Files / Approvals / Evidence content, or a plain empty state when no
// project is open. When `openTab` + `onTabChange` are provided the component is
// controlled (the Layout can open the Review panel from the notification bell);
// without them it manages its own tab state.
export type RightTabId = 'progress' | 'engine' | 'tools' | 'quick' | 'review';

interface RightSidebarProps {
  openTab?: RightTabId | null;
  onTabChange?: (tab: RightTabId | null) => void;
}

interface RightTabDef {
  id: RightTabId;
  label: string;
  icon: LucideIcon;
  note?: string;
}

const RIGHT_TABS: RightTabDef[] = [
  {
    id: 'progress',
    label: 'Build Progress',
    icon: Gauge,
    note: 'This panel will show how far along your app is — the current step, how much is left, and how long it has been building — in plain English.',
  },
  {
    id: 'engine',
    label: 'Engine',
    icon: Cpu,
    note: 'This panel will show the coding engine running underneath, which model is working, and how it is performing.',
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    note: 'This panel will show the tools and integrations your app can use — databases, authentication, payments and more.',
  },
  {
    id: 'quick',
    label: 'Quick Actions',
    icon: Zap,
    note: 'This panel will hold one-tap actions like Preview App, Deploy App, Share and Export Code.',
  },
  {
    id: 'review',
    label: 'Review',
    icon: ClipboardList,
  },
];

export function RightSidebar({ openTab: controlledTab, onTabChange }: RightSidebarProps) {
  const [internalTab, setInternalTab] = useState<RightTabId | null>(null);
  const isControlled = onTabChange !== undefined;
  const openTab = isControlled ? (controlledTab ?? null) : internalTab;

  function toggleTab(id: RightTabId) {
    const next = openTab === id ? null : id;
    if (isControlled) {
      onTabChange(next);
    } else {
      setInternalTab(next);
    }
  }

  const open = openTab ? RIGHT_TABS.find((entry) => entry.id === openTab) ?? null : null;

  return (
    <div style={edgeStyle} data-testid="right-sidebar">
      {open && (
        <aside style={panelStyle} data-testid={`right-panel-${open.id}`}>
          <header style={panelHeaderStyle}>
            <span style={panelTitleStyle}>{open.label}</span>
            <button
              type="button"
              onClick={() => toggleTab(open.id)}
              style={closeButtonStyle}
              aria-label={`Close ${open.label} panel`}
              title="Close panel"
              data-testid={`right-close-${open.id}`}
            >
              <PanelLeftClose size={14} />
            </button>
          </header>
          {open.id === 'review' ? (
            <ReviewPanel />
          ) : (
            <div style={panelBodyStyle}>
              <span style={comingNextStyle}>Coming next</span>
              <p style={panelNoteStyle}>{open.note}</p>
            </div>
          )}
        </aside>
      )}
      <div style={stripStyle} aria-label="Right edge panels" data-testid="right-tab-strip">
        {RIGHT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = openTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => toggleTab(tab.id)}
              style={isActive ? activeTabStyle : tabStyle}
              aria-label={isActive ? `Close ${tab.label} panel` : `Open ${tab.label} panel`}
              title={tab.label}
              data-testid={`right-tab-${tab.id}`}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The Review panel (moved out of the centre; polish round 2): Changed Files /
// Approvals / Evidence driven by the real executions/tasks state. When no
// project is active it shows a plain empty state — no fake data.
function ReviewPanel() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const executions = useWorkspaceStore((s) => s.executions);
  const tasks = useWorkspaceStore((s) => s.tasks);

  if (!activeProjectId) {
    return (
      <div style={reviewEmptyStyle} data-testid="review-empty">
        <ClipboardList size={20} opacity={0.4} color="#5f7392" />
        <span>Open a project to review changes</span>
      </div>
    );
  }

  const projectExecutions = executions.filter((execution) => execution.projectId === activeProjectId);
  // Current task = the most recent governed coding execution (its task owns the trail).
  const latestCoding = [...projectExecutions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .find((execution) => execution.commandId === 'opencode.runner');
  const currentTaskId = latestCoding?.taskId ?? null;
  const currentTaskExecutions = currentTaskId
    ? projectExecutions.filter((execution) => execution.taskId === currentTaskId)
    : [];
  const currentTaskChanges = deriveChangedFiles(currentTaskExecutions);
  const projectChanges = deriveChangedFiles(projectExecutions);
  const currentTaskName = currentTaskId ? tasks.find((task) => task.id === currentTaskId)?.title ?? null : null;

  return (
    <div style={reviewContentStyle}>
      <div style={reviewTabsStyle}>
        <span style={activeReviewTabStyle}>Changed Files</span>
        <span style={reviewTabStyle}>Approvals</span>
        <span style={reviewTabStyle}>Evidence</span>
      </div>
      <div style={reviewScrollStyle}>
        <div style={reviewSectionStyle}>
          <div style={reviewSectionTitleStyle}>
            {currentTaskId ? (currentTaskName ? `Current task: ${currentTaskName}` : 'Current task changes') : 'Current task changes'}
          </div>
          <ChangedFilesReview changes={currentTaskChanges} />
        </div>
        <div style={reviewSectionStyle}>
          <div style={reviewSectionTitleStyle}>Project changes (all time)</div>
          <ChangedFilesReview changes={projectChanges} />
        </div>
        <ActivityPanel />
      </div>
    </div>
  );
}

function deriveChangedFiles(executions: ExecutionRecord[]) {
  const paths = new Set<string>();
  const candidates = executions.filter((execution) => execution.commandId === 'opencode.runner');
  for (const execution of candidates) {
    const text = `${execution.output.stdout}\n${execution.output.stderr}`;
    for (const match of text.matchAll(/\b([\w./\\-]+runtime-test\.txt)\b/g)) {
      paths.add(match[1].replace(/\\/g, '/').replace(/^\.\//, ''));
    }
    for (const match of text.matchAll(/\b(?:changed|created|edited|file(?:\.edited)?):\s*([^\r\n]+)/gi)) {
      const file = match[1]?.trim().split(/\s+/)[0]?.replace(/\\/g, '/');
      if (file && !file.includes(':')) paths.add(file);
    }
  }
  return [...paths].map((file) => ({ path: file, status: 'A' }));
}

const edgeStyle: CSSProperties = {
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  position: 'relative',
  // No overflow clip: the open panel is an absolute overlay that extends LEFT
  // over the centre (past the 44px strip); clipping would cut it off.
};

const stripStyle: CSSProperties = {
  width: 44,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '10px 5px',
  boxSizing: 'border-box',
  background: 'rgba(4, 13, 28, 0.94)',
  borderLeft: '1px solid rgba(100,160,255,.18)',
  overflowY: 'auto',
};

const baseTabStyle: CSSProperties = {
  height: 41,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  border: '1px solid transparent',
  borderRadius: 9,
  background: 'transparent',
  cursor: 'pointer',
};

const tabStyle: CSSProperties = {
  ...baseTabStyle,
  color: '#8da4c7',
};

const activeTabStyle: CSSProperties = {
  ...baseTabStyle,
  color: '#ffffff',
  background: 'rgba(23, 107, 255, 0.18)',
  borderColor: 'rgba(31, 130, 255, 0.55)',
  boxShadow: '0 0 12px rgba(23, 107, 255, 0.28)',
};

// The open panel FLOATS over the centre: absolute, right edge flush against
// the 44px strip's left edge, so the centre never shrinks when it opens.
const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: 44,
  zIndex: 5,
  width: 280,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'rgba(4, 13, 28, 0.98)',
  borderLeft: '1px solid rgba(100,160,255,.18)',
  boxShadow: '-14px 0 40px rgba(0,0,0,.35)',
  boxSizing: 'border-box',
};

const panelHeaderStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '11px 10px 8px 12px',
  borderBottom: '1px solid rgba(100,160,255,.16)',
};

const panelTitleStyle: CSSProperties = {
  color: '#eaf2ff',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// Drawer-close icon (panel-close family, matching the old top-bar review
// toggle's icon family): collapses the panel back to its tab.
const closeButtonStyle: CSSProperties = {
  width: 26,
  height: 26,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  border: '1px solid rgba(100,160,255,.22)',
  borderRadius: 6,
  background: 'rgba(10, 26, 52, .62)',
  color: '#8da4c7',
  cursor: 'pointer',
};

const comingNextStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#5f7392',
  border: '1px solid rgba(100,160,255,.2)',
  borderRadius: 999,
  padding: '2px 8px',
};

const panelBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '0 16px',
  textAlign: 'center',
};

const panelNoteStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.6,
  color: '#8da4c7',
  maxWidth: 210,
  margin: 0,
};

const reviewContentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const reviewTabsStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  gap: 6,
  padding: '8px 10px',
  borderBottom: '1px solid rgba(100,160,255,.16)',
  overflowX: 'auto',
};

const reviewTabStyle: CSSProperties = {
  padding: '4px 8px',
  border: '1px solid rgba(100,160,255,.18)',
  borderRadius: 5,
  color: '#8da4c7',
  fontSize: 11,
  whiteSpace: 'nowrap',
};

const activeReviewTabStyle: CSSProperties = {
  ...reviewTabStyle,
  color: '#eaf2ff',
  borderColor: 'rgba(125,177,255,.48)',
  background: 'rgba(18,63,134,.38)',
};

const reviewScrollStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
};

const reviewSectionStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '0 10px 14px',
};

const reviewSectionTitleStyle: CSSProperties = {
  color: '#86ade8',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const reviewEmptyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '0 16px',
  textAlign: 'center',
  color: '#8da4c7',
  fontSize: 11.5,
};
