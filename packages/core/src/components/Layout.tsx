import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Bell, CircleQuestionMark, FolderOpen, Loader2, MessageSquarePlus, RefreshCw, Settings, X } from 'lucide-react';
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
import { AppSidebar, type SidebarViewId } from './AppSidebar.js';
import { ProfileAvatar, ProfileFooter } from './ProfileFooter.js';
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
// NOTE: the left edge is now ONE 288px AppSidebar (Intelligence shell parity):
// a New Project action, a Workspace section of centre-view rows, a Projects
// section (search, sort, project rows), and the code-safety shield pinned at
// the bottom. The old rail + collapse-in-its-own-slot panel is gone.
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
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null);
  const [chatSessionId, setChatSessionId] = useState('default');
  // Spec §31 — the left edge is a slim tab strip into a shared panel slot; only
  // one panel is open at a time, and the centre takes freed space. Centre views
  // (home/templates/my-apps/deployments/learn) switch the centre content; the
  // Home view is the default landing.
  const [centreView, setCentreView] = useState<SidebarViewId | null>(null);
  // Right edge: controlled by Layout so the notification bell can open Review.
  const [rightTab, setRightTab] = useState<RightTabId | null>(null);
  const hadProjectRef = useRef(false);

  useEffect(() => { if (llm) void llm.getConfig().then(setLlmConfig).catch(() => undefined); }, [llm]);

  // When a project becomes active (folder picker, host event, recent-project
  // click), leave the Home view and land in the workspace so the conversation
  // is visible. Runs before paint so there is no flash.
  useLayoutEffect(() => {
    if (activeProjectId && !hadProjectRef.current) {
      setCentreView(null);
    }
    hadProjectRef.current = !!activeProjectId;
  }, [activeProjectId]);

  async function chooseProject(projectId: string) {
    await selectProject(projectId);
    setChatSessionId('default');
    setDrawerOpen(false);
    setCentreView(null);
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
  function openCentreView(view: SidebarViewId) {
    setCentreView(view);
  }

  const leftActiveView: SidebarViewId | null = centreView ?? (!activeProjectId ? 'home' : null);

  // Design polish — the oryx/shell background appears only on the Home screen
  // (Home centre view or no project open). Every other screen (Templates, My
  // Apps, Deployments, Learn, project conversation) gets a subtle blue radial
  // glow ambience instead: no oryx image, brighter glow, lighter dim layer.
  const showOryxBackdrop = true;

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
          <div style={brandBlockStyle} data-testid="topbar-brand">
            <LogoHeader />
            <div style={brandCopyStyle}>
              <span style={brandWordStyle}><span style={brandWordCronStyle}>CRON</span> <span style={brandWordCodeStyle}>for Code</span></span>
              <span style={brandSubtitleStyle}>CODING WORKSPACE</span>
            </div>
          </div>
          <div style={buildModeStyle}>
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
          <div style={settingsWrapStyle}>
            <button
              type="button"
              onClick={() => setSettingsMenuOpen((current) => !current)}
              style={iconButtonStyle}
              aria-expanded={settingsMenuOpen}
              aria-haspopup="true"
              aria-label="Settings"
              title="Settings"
              data-testid="settings-menu-button"
            >
              <Settings size={16} />
            </button>
            {settingsMenuOpen && (
              <div style={settingsMenuStyle} role="menu" data-testid="settings-menu">
                <button type="button" role="menuitem" style={settingsMenuItemStyle} onClick={() => { setSettingsMenuOpen(false); setSettingsOpen(true); }} data-testid="settings-menu-item-settings">
                  <Settings size={15} /> <span>Settings</span>
                </button>
                <button type="button" role="menuitem" style={settingsMenuItemStyle} onClick={() => { setSettingsMenuOpen(false); setCentreView('learn'); }} data-testid="settings-menu-item-help">
                  <CircleQuestionMark size={15} /> <span>Help</span>
                </button>
              </div>
            )}
          </div>
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
          <ProfileAvatar />
        </header>

        <main style={workspaceStyle} data-testid="opencode-style-workspace">
          <div style={leftRegionStyle}>
            <AppSidebar
              onNewProject={onSelectProject}
              onSelectProject={(projectId) => void chooseProject(projectId)}
              onViewAll={() => openCentreView('my-apps')}
              onOpenReview={() => setRightTab('review')}
              onSelectView={(view) => openCentreView(view)}
              activeView={leftActiveView}
            />
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
const topBarStyle: CSSProperties = { height: 74, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px 0 26px', borderBottom: '1px solid #143152', background: '#040b18', boxSizing: 'border-box' };
const brandBlockStyle: CSSProperties = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 };
const brandCopyStyle: CSSProperties = { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 };
const brandSubtitleStyle: CSSProperties = { flexShrink: 0, fontSize: 10, fontWeight: 760, letterSpacing: 0, whiteSpace: 'nowrap', color: '#91b8de', textTransform: 'uppercase', paddingLeft: 1, display: 'block' };
const brandWordStyle: CSSProperties = { flexShrink: 0, fontSize: 15, fontWeight: 800, letterSpacing: 0, whiteSpace: 'nowrap', color: '#ffffff', paddingRight: 2, display: 'flex', alignItems: 'baseline', gap: 5 };
const brandWordCronStyle: CSSProperties = { color: '#2ea8ff' };
const brandWordCodeStyle: CSSProperties = { color: '#ffffff' };
const buildModeStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 };
const buildModePillStyle: CSSProperties = { height: 38, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', border: '1px solid #1c4268', borderRadius: 8, background: '#071427', color: '#d7e9ff', fontSize: 12, whiteSpace: 'nowrap' };
const greenDotStyle: CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.7)', flexShrink: 0 };
const iconButtonStyle: CSSProperties = { width: 38, height: 38, display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid #1c4268', borderRadius: 8, background: '#071427', color: '#d7e9ff', cursor: 'pointer' };
const bellButtonStyle: CSSProperties = { ...iconButtonStyle, position: 'relative' };
// Intelligence-style Settings dropdown (gear + label + chevron -> menu).
const settingsWrapStyle: CSSProperties = { position: 'relative', flexShrink: 0 };
const settingsMenuStyle: CSSProperties = { position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 60, minWidth: 168, display: 'flex', flexDirection: 'column', padding: 6, border: '1px solid rgba(61,114,169,.6)', borderRadius: 10, background: 'rgba(6, 16, 30, 0.98)', boxShadow: '0 14px 40px rgba(0,0,0,.5)' };
const settingsMenuItemStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: 0, borderRadius: 7, background: 'transparent', color: '#d7e9ff', fontSize: 12.5, fontFamily: 'var(--cron-font-family)', cursor: 'pointer', textAlign: 'left' };
const bellBadgeStyle: CSSProperties = { position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, display: 'grid', placeItems: 'center', padding: '0 3px', borderRadius: 999, background: '#f59e0b', color: '#1a1206', fontSize: 9, fontWeight: 800, boxShadow: '0 0 8px rgba(245,158,11,.6)' };
const sessionButtonStyle: CSSProperties = { height: 38, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 14px', border: '1px solid #1c4268', borderRadius: 8, background: '#071427', color: '#d7e9ff', fontFamily: 'var(--cron-font-family)', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 };
const sessionTabsStyle: CSSProperties = { flex: 1, minWidth: 0, height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 13px', border: '1px solid #1c4268', borderRadius: 8, background: '#071427', boxSizing: 'border-box' };
const activeSessionStyle: CSSProperties = { maxWidth: '42%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f5f9ff', fontSize: 12, fontWeight: 700 };
const sessionMetaStyle: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#7e99b8', fontSize: 11 };
// The left Projects panel sits as a fixed column between the rail and the chat
// (Intelligence-style): it flexes the chat wider/narrower, never overlays it.
// The right panels still float over the centre (Code-specific, no right panel
// in Intelligence). workspace stays position:relative for the right overlays.
const workspaceStyle: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', position: 'relative', overflow: 'hidden' };
const leftRegionStyle: CSSProperties = { flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column' };
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
