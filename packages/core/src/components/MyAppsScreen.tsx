import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Boxes, Folder } from 'lucide-react';
import type { DataService } from '@cron-code/data-service';
import type { ExecutionRecord } from '@cron-code/contracts';
import { useWorkspaceStore } from '../context.js';
import { visibleProjects } from '../store.js';
import { relativeTime } from '../time.js';

// Spec §A.2 — "Your apps": the user's real projects, each with a build-status
// pill derived from real execution data ("Built" when a project has at least one
// execution record, otherwise "Draft") and "Last built X ago" from the latest
// execution. All data is real — no fake builds, no fake apps.
interface MyAppsScreenProps {
  onSelectProject: (projectId: string) => void;
  dataService?: DataService;
}

export function MyAppsScreen({ onSelectProject, dataService }: MyAppsScreenProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const storeExecutions = useWorkspaceStore((s) => s.executions);
  const [allExecutions, setAllExecutions] = useState<ExecutionRecord[] | null>(null);

  // Fetch every execution once when the data service is available, so build
  // status is honest for every project (the store only holds the active
  // project's executions). Without a data service we fall back to the store.
  useEffect(() => {
    if (!dataService) return;
    let cancelled = false;
    void dataService.executions
      .listAll()
      .then((records) => {
        if (!cancelled) setAllExecutions(records);
      })
      .catch(() => {
        if (!cancelled) setAllExecutions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const source = allExecutions ?? (dataService ? [] : storeExecutions);
  const byProject = new Map<string, ExecutionRecord[]>();
  for (const execution of source) {
    const bucket = byProject.get(execution.projectId) ?? [];
    bucket.push(execution);
    byProject.set(execution.projectId, bucket);
  }

  const visible = visibleProjects(projects)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);

  function latestExecution(projectId: string): ExecutionRecord | null {
    const records = byProject.get(projectId);
    if (!records || records.length === 0) return null;
    return (
      records
        .slice()
        .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))[0] ?? null
    );
  }

  if (visible.length === 0) {
    return (
      <div style={wrapperStyle} data-testid="my-apps-screen">
        <div style={emptyStateStyle}>
          <Boxes size={34} opacity={0.4} color="#5f7392" />
          <div style={emptyTitleStyle}>No apps yet</div>
          <div style={emptyHintStyle}>
            When you start a project, your apps will show up here with their build status.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle} data-testid="my-apps-screen">
      <div style={containerStyle}>
        <section style={heroStyle}>
          <h1 style={headingStyle}>Your apps</h1>
          <p style={subtextStyle}>
            Everything CRON has built for you, with its real build status.
          </p>
        </section>

        <div style={listStyle}>
          {visible.map((project) => {
            const latest = latestExecution(project.id);
            const built = (byProject.get(project.id)?.length ?? 0) > 0;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                style={project.id === activeProjectId ? selectedCardStyle : cardStyle}
                data-testid={`my-app-${project.id}`}
              >
                <span style={iconStyle}>
                  <Folder size={16} />
                </span>
                <span style={textStyle}>
                  <span style={nameStyle}>{project.name}</span>
                  <span style={metaStyle}>
                    {built ? `Last built ${relativeTime(latest?.endedAt ?? latest?.startedAt ?? project.updatedAt)}` : 'Not built yet'}
                  </span>
                </span>
                <span style={built ? builtPillStyle : draftPillStyle}>{built ? 'Built' : 'Draft'}</span>
                <ArrowRight size={13} style={{ flexShrink: 0, color: '#5f7392' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  background: 'linear-gradient(to right, rgba(3, 12, 28, 0.40), rgba(3, 12, 28, 0.10) 58%, rgba(3, 12, 28, 0.02))',
  fontFamily: 'var(--cron-font-family)',
};

const containerStyle: CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: 'clamp(24px, 5vh, 48px) clamp(20px, 4vw, 48px) 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  boxSizing: 'border-box',
};

const heroStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.4,
};

const subtextStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: '#8da4c7',
  lineHeight: 1.5,
};

const listStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9 };

const baseCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  width: '100%',
  padding: '12px 13px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 11,
  background: 'rgba(11, 22, 40, 0.72)',
  color: '#d9e8ff',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
};

const cardStyle: CSSProperties = { ...baseCardStyle };

const selectedCardStyle: CSSProperties = {
  ...baseCardStyle,
  borderColor: 'rgba(31, 130, 255, 0.6)',
  background: 'rgba(23, 107, 255, 0.14)',
  boxShadow: '0 0 12px rgba(23, 107, 255, 0.25)',
};

const iconStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 8,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const textStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

const nameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: '#eaf2ff',
};

const metaStyle: CSSProperties = {
  fontSize: 10.5,
  color: '#5f7392',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const pillBaseStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 999,
};

const builtPillStyle: CSSProperties = {
  ...pillBaseStyle,
  color: '#4ade80',
  border: '1px solid rgba(34,197,94,.4)',
  background: 'rgba(22,101,52,.25)',
};

const draftPillStyle: CSSProperties = {
  ...pillBaseStyle,
  color: '#8da4c7',
  border: '1px solid rgba(100,160,255,.28)',
  background: 'rgba(30,58,110,.25)',
};

const emptyStateStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '0 20px',
  textAlign: 'center',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#c6d8f7',
};

const emptyHintStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.6,
  color: '#5f7392',
  maxWidth: 340,
};
