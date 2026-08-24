import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Bell, CircleQuestionMark, FolderOpen, Loader2, MessageSquarePlus, Mic, RefreshCw, Settings, X } from 'lucide-react';
import type { DataService } from '@cron-code/data-service';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import type { FolderPickerBridge } from '../folder-picker.js';
import { CronAssistant } from './CronAssistant.js';
import { HomeScreen } from './HomeScreen.js';
import { TemplatesScreen } from './TemplatesScreen.js';
import { MyAppsScreen } from './MyAppsScreen.js';
import { DeploymentsScreen } from './DeploymentsScreen.js';
import { LearnScreen } from './LearnScreen.js';
import { ModelSettings } from './ModelSettings.js';
import { ErrorBanner } from './ErrorBanner.js';
import { RestartOverlay } from './RestartOverlay.js';
import { PickerModal } from './PickerModal.js';
import { LogoHeader } from './LeftNav.js';
import { LeftTabStrip, type LeftTabId } from './LeftTabStrip.js';
import { ProfileAvatar, ProfileFooter } from './ProfileFooter.js';
import { ProjectBrowser } from './ProjectBrowser.js';
import { RightSidebar, type RightTabId } from './RightSidebar.js';
import type { LlmClient, LlmConfig } from '../llm.js';
import type { OpenCodeRunnerClient } from '../opencode-client.js';

interface LayoutProps {
  onSelectProject: () => void;
  dataService?: DataService;
  llm?: LlmClient;
  openCodeRunner?: OpenCodeRunnerClient;
  preparing?: boolean;
  folderPicker?: FolderPickerBridge;
}

// Centre views share the centre area the way Home does today; selecting one
// switches the centre content. The Projects panel opens into the shared left
// slot instead.
const CENTRE_VIEW_TABS: LeftTabId[] = ['home', 'templates', 'my-apps', 'deployments', 'learn'];

// Polish round 2 shell: the left edge is wrapped in a persistent left region
// with the framed logo + "CRON for Code" header at its top (always visible),
// then the icon-only tab rail + shared panel slot, then the profile footer at
// the bottom (always visible, divider above it; panels open above it). The
// right edge is a tab strip with a single open panel (no pinning); Review now
// lives there. The centre is dominant; the top bar is a slim app bar (spec §6).
export function Layout({ onSelectProject, dataService, llm, openCodeRunner, preparing = false, folderPicker }: LayoutProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const approvals = useWorkspaceStore((s) => s.approvals);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const isRestarting = useWorkspaceStore((s) => s.isRestarting);
  const rawStore = useWorkspaceStoreRaw();
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) ?? null : null;
  const pendingApprovalCount = approvals.filter((approval) => approval.status === 'requested').length;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null);
  const [chatSessionId, setChatSessionId] = useState('default');
  // Spec §31 — the left edge is a slim tab strip into a shared panel slot; only
  // one panel is open at a time, and the centre takes freed space. Centre views
  // (home/templates/my-apps/deployments/learn) switch the centre content; the
  // Home view is the default landing.
  const [centreView, setCentreView] = useState<LeftTabId | null>(null);
  const [leftPanel, setLeftPanel] = useState<LeftTabId | null>(null);
  // Right edge: controlled by Layout so the notification bell can open Review.
  const [rightTab, setRightTab] = useState<RightTabId | null>(null);
  const hadProjectRef = useRef(false);

  useEffect(() => { if (llm) void llm.getConfig().then(setLlmConfig).catch(() => undefined); }, [llm]);

  // When a project becomes active (folder picker, host event, recent-project
  // click), leave the Home view and land in the workspace so the conversation
  // and project browser are visible. Runs before paint so there is no flash.
  useLayoutEffect(() => {
    if (activeProjectId && !hadProjectRef.current) {
      setLeftPanel('projects');
      setCentreView(null);
    }
    hadProjectRef.current = !!activeProjectId;
  }, [activeProjectId]);

  async function chooseProject(projectId: string) {
    await selectProject(projectId);
    setChatSessionId('default');
    setDrawerOpen(false);
    setCentreView(null);
    setLeftPanel('projects');
  }

  function startNewSession() {
    if (!activeProjectId) {
      setDrawerOpen(true);
      return;
    }
    setChatSessionId(`session_${Date.now()}`);
    setDrawerOpen(false);
  }

  function handleRestart() {
    if (isRestarting) return;
    void rawStore.getState().restartApp();
  }

  /** Opens a centre view (Home / Templates / My Apps / Deployments / Learn). */
  function openCentreView(view: LeftTabId) {
    setCentreView(view);
    setLeftPanel(null);
  }

  /** Opens the Projects panel (the "Projects view"). */
  function openProjectsView() {
    setCentreView(null);
    setLeftPanel('projects');
  }

  function toggleLeftTab(tab: LeftTabId) {
    // Create New is an ACTION (the existing New-Project flow) and Settings is an
    // ACTION (ModelSettings), never panels. Centre tabs switch the centre
    // content and close any open panel. Projects opens the shared slot.
    if (tab === 'create-new') {
      onSelectProject();
      return;
    }
    if (tab === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (CENTRE_VIEW_TABS.includes(tab)) {
      openCentreView(tab);
      return;
    }
    if (tab === 'projects') {
      if (leftPanel === 'projects') {
        setLeftPanel(null);
      } else {
        openProjectsView();
      }
    }
  }

  const leftActive: LeftTabId | null = leftPanel ?? centreView;

  // Design polish — the oryx/shell background appears only on the Home screen
  // (Home centre view or no project open). Every other screen (Templates, My
  // Apps, Deployments, Learn, project conversation) gets a subtle blue radial
  // glow ambience instead: no oryx image, brighter glow, lighter dim layer.
  const showOryxBackdrop = centreView === 'home' || !activeProjectId;

  function renderCentre() {
    if (centreView === 'templates') {
      return <div style={emptyWrapStyle}><TemplatesScreen onNewProject={onSelectProject} /></div>;
    }
    if (centreView === 'my-apps') {
      return <div style={emptyWrapStyle}><MyAppsScreen dataService={dataService} onSelectProject={(projectId) => void chooseProject(projectId)} /></div>;
    }
    if (centreView === 'deployments') {
      return <div style={emptyWrapStyle}><DeploymentsScreen /></div>;
    }
    if (centreView === 'learn') {
      return <div style={emptyWrapStyle}><LearnScreen /></div>;
    }
    if (centreView === 'home' || !activeProjectId) {
      return <div style={emptyWrapStyle}><HomeScreen onNewProject={onSelectProject} onSelectProject={(projectId) => void chooseProject(projectId)} /></div>;
    }
    return (
      <div style={centreInnerStyle}>
        <section style={conversationPaneStyle} data-testid="main-conversation-pane">
          <CronAssistant dataService={dataService} llm={llm} openCodeRunner={openCodeRunner} config={llmConfig} sessionId={chatSessionId} onConfigureModel={() => setSettingsOpen(true)} />
        </section>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={showOryxBackdrop ? oryxBackdropStyle : glowBackdropStyle} data-testid="app-backdrop" />
      <div style={showOryxBackdrop ? appStyle : glowAppStyle}>
        <ErrorBanner />
        <header style={topBarStyle} data-testid="workspace-topbar">
          <div style={buildModeStyle}>
            <span style={buildModeLabelStyle}>Build mode:</span>
            <div style={buildModePillStyle} role="status" data-testid="cron-online-status">
              <span style={greenDotStyle} />
              OpenCode (local)
            </div>
          </div>
          <div style={sessionTabsStyle} aria-label="Current sessions">
            <span style={activeSessionStyle}>{chatSessionId === 'default' ? activeProject?.name ?? 'No project selected' : 'New session'}</span>
            {activeProject && <span style={sessionMetaStyle}>{activeProject.rootPath}</span>}
          </div>
          <button type="button" onClick={startNewSession} style={sessionButtonStyle}><MessageSquarePlus size={14} /> New Session</button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={isRestarting}
            aria-busy={isRestarting}
            aria-label={isRestarting ? 'Restarting CRON for Code' : 'Restart CRON for Code'}
            title={isRestarting ? 'Restarting…' : 'Restart CRON for Code'}
            style={{ ...iconButtonStyle, color: isRestarting ? '#93c5fd' : '#7ea7e8', cursor: isRestarting ? 'wait' : 'pointer', opacity: isRestarting ? 0.75 : 1 }}
            data-testid="cron-restart-button"
          >
            {isRestarting ? <Loader2 size={16} style={spinnerStyle} /> : <RefreshCw size={16} />}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} style={iconButtonStyle} aria-label="Open settings"><Settings size={16} /></button>
          <button type="button" onClick={() => openCentreView('learn')} style={iconButtonStyle} aria-label="Help" title="Help" data-testid="help-button"><CircleQuestionMark size={16} /></button>
          <button
            type="button"
            onClick={() => setRightTab('review')}
            style={bellButtonStyle}
            aria-label={pendingApprovalCount > 0 ? `Notifications, ${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? '' : 's'}` : 'Notifications'}
            title={pendingApprovalCount > 0 ? `${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? '' : 's'} — review them` : 'Notifications'}
            data-testid="notification-bell"
          >
            <Bell size={16} />
            {pendingApprovalCount > 0 && (
              <span style={bellBadgeStyle} data-testid="notification-badge">{pendingApprovalCount}</span>
            )}
          </button>
          <button type="button" disabled style={speakButtonStyle} title="Speak to CRON — coming soon" aria-disabled="true" aria-label="Speak to CRON — coming soon" data-testid="speak-to-cron"><Mic size={14} /> Speak to CRON</button>
        </header>

        <main style={workspaceStyle} data-testid="opencode-style-workspace">
          <div style={leftRegionStyle}>
            <LogoHeader />
            <div style={leftRegionBodyStyle}>
              <LeftTabStrip active={leftActive} onToggle={toggleLeftTab} onOpenReview={() => setRightTab('review')} />
              {leftPanel === 'projects' && (
                <ProjectBrowser onNewProject={onSelectProject} onSelectProject={(projectId) => void chooseProject(projectId)} onViewAll={openProjectsView} />
              )}
            </div>
            <ProfileAvatar />
          </div>
          <section style={centrePaneStyle} data-testid="centre-pane">
            {renderCentre()}
          </section>
          <RightSidebar openTab={rightTab} onTabChange={setRightTab} />
        </main>

        <ProfileFooter />

        {drawerOpen && <ProjectDrawer activeProjectId={activeProjectId} onClose={() => setDrawerOpen(false)} onNewProject={onSelectProject} onNewSession={startNewSession} onSettings={() => { setDrawerOpen(false); setSettingsOpen(true); }} onSelectProject={(projectId) => void chooseProject(projectId)} />}
        {settingsOpen && <ModelSettings llm={llm} onClose={() => setSettingsOpen(false)} onSaved={setLlmConfig} />}
        <RestartOverlay preparing={preparing} />
        <PickerModal bridge={folderPicker} />
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

const shellStyle: CSSProperties = { height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--cron-app-bg)', color: '#f5f9ff', fontFamily: 'var(--cron-font-family)', WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' };
// Oryx/shell backdrop: only on the Home screen (design polish). Subtle per spec §2.
const oryxBackdropStyle: CSSProperties = { position: 'absolute', inset: 0, backgroundImage: 'var(--cron-shell-bg-image)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.36 };
// Blue radial glow ambience for every non-Home screen: no oryx image, brighter glow.
const glowBackdropStyle: CSSProperties = { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 70% 55% at 50% 34%, rgba(23,107,255,0.22) 0%, rgba(31,130,255,0.10) 46%, transparent 74%), radial-gradient(ellipse 55% 42% at 84% 92%, rgba(31,130,255,0.12) 0%, transparent 68%)', opacity: 1 };
const appBaseStyle: CSSProperties = { position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const appStyle: CSSProperties = { ...appBaseStyle, background: 'linear-gradient(to bottom, rgba(5, 8, 18, 0.88), rgba(5, 8, 18, 0.94))' };
const glowAppStyle: CSSProperties = { ...appBaseStyle, background: 'linear-gradient(to bottom, rgba(5, 8, 18, 0.56), rgba(5, 8, 18, 0.72))' };
const topBarStyle: CSSProperties = { height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', borderBottom: '1px solid rgba(100,160,255,.2)', background: 'rgba(2, 9, 23, 0.9)', boxSizing: 'border-box' };
const buildModeStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 };
const buildModeLabelStyle: CSSProperties = { color: '#8da4c7', fontSize: 10.5, whiteSpace: 'nowrap' };
const buildModePillStyle: CSSProperties = { height: 22, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 9px', border: '1px solid rgba(34,197,94,.32)', borderRadius: 999, background: 'rgba(20,83,45,.2)', color: '#9ee6b2', fontSize: 10.5, whiteSpace: 'nowrap' };
const greenDotStyle: CSSProperties = { width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.7)', flexShrink: 0 };
const iconButtonStyle: CSSProperties = { width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid rgba(100,160,255,.28)', borderRadius: 6, background: 'rgba(10, 26, 52, .62)', color: '#b7cdf0', cursor: 'pointer' };
const bellButtonStyle: CSSProperties = { ...iconButtonStyle, position: 'relative' };
const bellBadgeStyle: CSSProperties = { position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, display: 'grid', placeItems: 'center', padding: '0 3px', borderRadius: 999, background: '#f59e0b', color: '#1a1206', fontSize: 9, fontWeight: 800, boxShadow: '0 0 8px rgba(245,158,11,.6)' };
const sessionButtonStyle: CSSProperties = { height: 26, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 9px', border: '1px solid rgba(100,160,255,.28)', borderRadius: 6, background: 'rgba(18, 63, 134, .38)', color: '#d9e8ff', fontFamily: 'var(--cron-font-family)', fontSize: 10.5, cursor: 'pointer', flexShrink: 0 };
const speakButtonStyle: CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', border: '1px solid rgba(31,130,255,.4)', borderRadius: 6, background: 'linear-gradient(to bottom, #1F82FF, #176BFF)', color: '#ffffff', fontFamily: 'var(--cron-font-family)', fontSize: 11, fontWeight: 600, cursor: 'not-allowed', flexShrink: 0, opacity: 0.45 };
const sessionTabsStyle: CSSProperties = { flex: 1, minWidth: 0, height: 26, display: 'flex', alignItems: 'center', gap: 8, padding: '0 9px', border: '1px solid rgba(100,160,255,.18)', borderRadius: 6, background: 'rgba(3, 12, 28, .72)' };
const activeSessionStyle: CSSProperties = { maxWidth: '42%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f5f9ff', fontSize: 11.5, fontWeight: 700 };
const sessionMetaStyle: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8da4c7', fontSize: 10.5 };
const workspaceStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' };
const leftRegionStyle: CSSProperties = { flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const leftRegionBodyStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' };
const centrePaneStyle: CSSProperties = { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden' };
const centreInnerStyle: CSSProperties = { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden' };
const conversationPaneStyle: CSSProperties = { flex: 1, minWidth: 340, minHeight: 0, display: 'flex', overflow: 'hidden' };
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
const spinnerStyle: CSSProperties = { color: '#93c5fd', animation: 'cron-spin 0.9s linear infinite' };
