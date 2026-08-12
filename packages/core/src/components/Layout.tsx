import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { CheckCircle2, FolderOpen, Menu, MessageSquarePlus, PanelRightClose, PanelRightOpen, Plus, Settings, X } from 'lucide-react';
import type { DataService } from '@cron-code/data-service';
import type { ExecutionRecord } from '@cron-code/contracts';
import { useWorkspaceStore } from '../context.js';
import { CronAssistant } from './CronAssistant.js';
import { EmptyState } from './EmptyState.js';
import { LlmSettings } from './LlmSettings.js';
import { ActivityPanel } from './ActivityPanel.js';
import { ChangedFilesReview } from './ChangedFilesReview.js';
import { ErrorBanner } from './ErrorBanner.js';
import { RestartOverlay } from './RestartOverlay.js';
import { PickerModal } from './PickerModal.js';
import type { LlmClient, LlmConfig } from '../llm.js';
import type { OpenCodeRunnerClient } from '../opencode-client.js';

interface LayoutProps {
  onSelectProject: () => void;
  dataService?: DataService;
  llm?: LlmClient;
  openCodeRunner?: OpenCodeRunnerClient;
  preparing?: boolean;
}

export function Layout({ onSelectProject, dataService, llm, openCodeRunner, preparing = false }: LayoutProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) ?? null : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [reviewWidth, setReviewWidth] = useState(380);
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null);
  const [chatSessionId, setChatSessionId] = useState('default');
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (llm) void llm.getConfig().then(setLlmConfig).catch(() => undefined); }, [llm]);

  function beginReviewResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const container = workspaceRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(pointerEvent: globalThis.PointerEvent) {
      setReviewWidth(Math.min(560, Math.max(300, rect.right - pointerEvent.clientX)));
    }

    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  async function chooseProject(projectId: string) {
    await selectProject(projectId);
    setChatSessionId('default');
    setDrawerOpen(false);
  }

  function startNewSession() {
    if (!activeProjectId) {
      setDrawerOpen(true);
      return;
    }
    setChatSessionId(`session_${Date.now()}`);
    setDrawerOpen(false);
  }

  return (
    <div style={shellStyle}>
      <div style={backdropStyle} />
      <div style={appStyle}>
        <ErrorBanner />
        <header style={topBarStyle} data-testid="workspace-topbar">
          <button type="button" onClick={() => setDrawerOpen(true)} style={iconButtonStyle} aria-label="Open navigation drawer"><Menu size={18} /></button>
          <button type="button" onClick={onSelectProject} style={topActionStyle}><FolderOpen size={15} /> New Project</button>
          <button type="button" onClick={startNewSession} style={sessionButtonStyle}><MessageSquarePlus size={15} /> New Session</button>
          <div style={sessionTabsStyle} aria-label="Current sessions">
            <span style={activeSessionStyle}>{chatSessionId === 'default' ? activeProject?.name ?? 'No project selected' : 'New session'}</span>
            {activeProject && <span style={sessionMetaStyle}>{activeProject.rootPath}</span>}
          </div>
          <button type="button" onClick={startNewSession} style={iconButtonStyle} aria-label="Add session" title="Add session"><Plus size={17} /></button>
          <div style={statusPillStyle}><CheckCircle2 size={13} /> CRON ready</div>
          <button type="button" onClick={() => setReviewOpen((current) => !current)} style={iconButtonStyle} aria-label={reviewOpen ? 'Close review pane' : 'Open review pane'} data-testid="review-toggle">
            {reviewOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} style={iconButtonStyle} aria-label="Open settings"><Settings size={18} /></button>
        </header>

        <main ref={workspaceRef} style={workspaceStyle} data-testid="opencode-style-workspace">
          {activeProjectId ? (
            <>
              <section style={conversationPaneStyle} data-testid="main-conversation-pane">
                <CronAssistant dataService={dataService} llm={llm} openCodeRunner={openCodeRunner} config={llmConfig} sessionId={chatSessionId} onConfigureModel={() => setSettingsOpen(true)} />
              </section>
              {reviewOpen && (
                <>
                  <div role="separator" aria-orientation="vertical" aria-label="Resize review pane" title="Drag to resize" style={reviewResizerStyle} onPointerDown={beginReviewResize} data-testid="review-resizer">
                    <span style={reviewGripStyle} />
                  </div>
                  <aside style={{ ...reviewPaneStyle, width: reviewWidth }} data-testid="review-pane">
                    <ReviewPane onClose={() => setReviewOpen(false)} />
                  </aside>
                </>
              )}
            </>
          ) : (
            <div style={emptyWrapStyle}><EmptyState onSelectProject={onSelectProject} /></div>
          )}
        </main>

        {drawerOpen && <ProjectDrawer activeProjectId={activeProjectId} onClose={() => setDrawerOpen(false)} onNewProject={onSelectProject} onNewSession={startNewSession} onSettings={() => { setDrawerOpen(false); setSettingsOpen(true); }} onSelectProject={(projectId) => void chooseProject(projectId)} />}
        {settingsOpen && <LlmSettings llm={llm} onClose={() => setSettingsOpen(false)} onSaved={setLlmConfig} />}
        <RestartOverlay preparing={preparing} />
        <PickerModal />
      </div>
    </div>
  );
}

function ProjectDrawer({ activeProjectId, onClose, onNewProject, onNewSession, onSettings, onSelectProject }: { activeProjectId: string | null; onClose: () => void; onNewProject: () => void; onNewSession: () => void; onSettings: () => void; onSelectProject: (projectId: string) => void }) {
  const projects = useWorkspaceStore((s) => s.projects);
  return (
    <div style={drawerOverlayStyle} data-testid="project-session-drawer">
      <aside style={drawerStyle}>
        <header style={drawerHeaderStyle}>
          <div><strong>Projects &amp; Sessions</strong><span style={drawerSubtleStyle}>Choose where CRON should work.</span></div>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Close project drawer"><X size={18} /></button>
        </header>
        <div style={drawerBodyStyle}>
          <section style={drawerSectionStyle}>
            <div style={drawerSectionTitleStyle}>Projects</div>
            <div style={projectListStyle}>
              {projects.length === 0 ? <div style={drawerEmptyStyle}>No projects yet.</div> : projects.map((project) => (
                <button key={project.id} type="button" onClick={() => onSelectProject(project.id)} style={project.id === activeProjectId ? activeProjectButtonStyle : projectButtonStyle}>
                  <span style={projectNameStyle}>{project.name}</span>
                  <span style={projectPathStyle}>{project.rootPath}</span>
                </button>
              ))}
            </div>
          </section>
          <section style={drawerSectionStyle}>
            <div style={drawerSectionTitleStyle}>Sessions</div>
            <button type="button" onClick={onNewSession} style={drawerActionStyle}><MessageSquarePlus size={15} /> New Session</button>
          </section>
        </div>
        <footer style={drawerFooterStyle}>
          <button type="button" onClick={onNewProject} style={drawerActionStyle}><FolderOpen size={15} /> New Project</button>
          <button type="button" onClick={onSettings} style={drawerActionStyle}><Settings size={15} /> Settings</button>
        </footer>
      </aside>
      <button type="button" aria-label="Close project drawer backdrop" onClick={onClose} style={drawerBackdropButtonStyle} />
    </div>
  );
}

function ReviewPane({ onClose }: { onClose: () => void }) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const executions = useWorkspaceStore((s) => s.executions);
  const tasks = useWorkspaceStore((s) => s.tasks);
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
    <section style={reviewContentStyle}>
      <header style={reviewHeaderStyle}>
        <div><strong>Review</strong><span style={reviewSubtleStyle}>Files, approvals, evidence, and verification.</span></div>
        <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Close review pane"><X size={18} /></button>
      </header>
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
    </section>
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

const shellStyle: CSSProperties = { height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--cron-app-bg)', color: '#eaf2ff', fontFamily: 'var(--cron-font-family)' };
const backdropStyle: CSSProperties = { position: 'absolute', inset: 0, backgroundImage: 'var(--cron-shell-bg-image)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.36 };
const appStyle: CSSProperties = { position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(to bottom, rgba(5, 8, 18, 0.88), rgba(5, 8, 18, 0.94))' };
const topBarStyle: CSSProperties = { height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', borderBottom: '1px solid rgba(100,160,255,.2)', background: 'rgba(2, 9, 23, 0.86)', boxSizing: 'border-box' };
const iconButtonStyle: CSSProperties = { width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid rgba(100,160,255,.28)', borderRadius: 5, background: 'rgba(10, 26, 52, .62)', color: '#b7cdf0', cursor: 'pointer' };
const topActionStyle: CSSProperties = { height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', border: '1px solid rgba(100,160,255,.28)', borderRadius: 5, background: 'rgba(10, 26, 52, .62)', color: '#d9e8ff', fontFamily: 'var(--cron-font-family)', fontSize: 12, cursor: 'pointer' };
const sessionButtonStyle: CSSProperties = { ...topActionStyle, background: 'rgba(18, 63, 134, .38)' };
const sessionTabsStyle: CSSProperties = { flex: 1, minWidth: 0, height: 32, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid rgba(100,160,255,.18)', borderRadius: 5, background: 'rgba(3, 12, 28, .72)' };
const activeSessionStyle: CSSProperties = { maxWidth: '42%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#eaf2ff', fontSize: 12, fontWeight: 700 };
const sessionMetaStyle: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8da4c7', fontSize: 11 };
const statusPillStyle: CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', border: '1px solid rgba(34,197,94,.32)', borderRadius: 5, background: 'rgba(20,83,45,.22)', color: '#9ee6b2', fontSize: 11, whiteSpace: 'nowrap' };
const workspaceStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' };
const conversationPaneStyle: CSSProperties = { flex: 1, minWidth: 420, minHeight: 0, display: 'flex', overflow: 'hidden' };
const reviewResizerStyle: CSSProperties = { width: 10, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'col-resize', background: 'rgba(2, 9, 23, .88)', borderLeft: '1px solid rgba(100,160,255,.16)', borderRight: '1px solid rgba(100,160,255,.16)', touchAction: 'none' };
const reviewGripStyle: CSSProperties = { width: 2, height: 62, borderRadius: 2, background: 'rgba(141,164,199,.7)', boxShadow: '4px 0 0 rgba(141,164,199,.32)' };
const reviewPaneStyle: CSSProperties = { minWidth: 300, maxWidth: 560, minHeight: 0, flexShrink: 0, display: 'flex', overflow: 'hidden', background: 'rgba(4, 16, 36, 0.92)' };
const reviewContentStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const reviewHeaderStyle: CSSProperties = { flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '12px', borderBottom: '1px solid rgba(100,160,255,.2)' };
const reviewSubtleStyle: CSSProperties = { display: 'block', marginTop: 3, color: '#8da4c7', fontSize: 11, lineHeight: 1.35 };
const reviewTabsStyle: CSSProperties = { flexShrink: 0, display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid rgba(100,160,255,.16)', overflowX: 'auto' };
const reviewTabStyle: CSSProperties = { padding: '4px 8px', border: '1px solid rgba(100,160,255,.18)', borderRadius: 5, color: '#8da4c7', fontSize: 11, whiteSpace: 'nowrap' };
const activeReviewTabStyle: CSSProperties = { ...reviewTabStyle, color: '#eaf2ff', borderColor: 'rgba(125,177,255,.48)', background: 'rgba(18,63,134,.38)' };
const reviewScrollStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' };
const reviewSectionStyle: CSSProperties = { display: 'grid', gap: 8, padding: '0 10px 14px' };
const reviewSectionTitleStyle: CSSProperties = { color: '#86ade8', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' };
const emptyWrapStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex' };
const drawerOverlayStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 20, display: 'flex' };
const drawerStyle: CSSProperties = { position: 'relative', zIndex: 2, width: 340, maxWidth: '86vw', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(3, 12, 28, .98)', borderRight: '1px solid rgba(100,160,255,.26)', boxShadow: '18px 0 50px rgba(0,0,0,.38)' };
const drawerBackdropButtonStyle: CSSProperties = { flex: 1, border: 0, padding: 0, background: 'rgba(0,0,0,.42)', cursor: 'default' };
const drawerHeaderStyle: CSSProperties = { flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: 14, borderBottom: '1px solid rgba(100,160,255,.2)' };
const drawerSubtleStyle: CSSProperties = { display: 'block', marginTop: 3, color: '#8da4c7', fontSize: 11 };
const drawerBodyStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 };
const drawerSectionStyle: CSSProperties = { display: 'grid', gap: 8, marginBottom: 18 };
const drawerSectionTitleStyle: CSSProperties = { color: '#86ade8', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' };
const projectListStyle: CSSProperties = { display: 'grid', gap: 6 };
const projectButtonStyle: CSSProperties = { display: 'grid', gap: 3, width: '100%', padding: '9px 10px', border: '1px solid rgba(100,160,255,.18)', borderRadius: 5, background: 'rgba(10, 26, 52, .42)', color: '#d9e8ff', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--cron-font-family)' };
const activeProjectButtonStyle: CSSProperties = { ...projectButtonStyle, borderColor: 'rgba(125,177,255,.58)', background: 'rgba(18,63,134,.42)' };
const projectNameStyle: CSSProperties = { fontSize: 12, fontWeight: 700 };
const projectPathStyle: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8da4c7', fontSize: 10 };
const drawerEmptyStyle: CSSProperties = { padding: '12px 10px', color: '#8da4c7', border: '1px dashed rgba(100,160,255,.22)', borderRadius: 5, fontSize: 12 };
const drawerFooterStyle: CSSProperties = { flexShrink: 0, display: 'grid', gap: 8, padding: 12, borderTop: '1px solid rgba(100,160,255,.2)' };
const drawerActionStyle: CSSProperties = { height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1px solid rgba(100,160,255,.28)', borderRadius: 5, background: 'rgba(10, 26, 52, .62)', color: '#d9e8ff', fontFamily: 'var(--cron-font-family)', fontSize: 12, cursor: 'pointer' };
