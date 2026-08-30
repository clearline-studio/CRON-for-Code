import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, cleanup, within, waitFor, act } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { TaskComposer } from './components/TaskComposer.js';
import { TaskWorkspace } from './components/TaskWorkspace.js';
import { ActivityPanel } from './components/ActivityPanel.js';
import { CronAssistant } from './components/CronAssistant.js';
import { CronCodeApp } from './components/App.js';
import { Sidebar } from './components/Sidebar.js';
import { Layout } from './components/Layout.js';
import { LeftNav, LogoHeader } from './components/LeftNav.js';
import { ProjectBrowser } from './components/ProjectBrowser.js';
import { AccountArea } from './components/AccountArea.js';
import { RightSidebar } from './components/RightSidebar.js';
import { createCodeProject, createTask, createApproval, createExecutionApproval, createExecutionRecord } from '@cron-code/contracts';

afterEach(cleanup);

const COMMANDS = [
  { id: 'repo.status', displayCommand: 'git status --short', category: 'repo', risk: 'low', readOnly: true, requiresApproval: true, timeoutMs: 120000 },
  { id: 'repo.diff-check', displayCommand: 'git diff --check', category: 'repo', risk: 'low', readOnly: true, requiresApproval: true, timeoutMs: 120000 },
];

function createTestStore() {
  const dataService = {
    config: { storagePath: '/tmp' },
    initialize: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    listCommands: vi.fn().mockResolvedValue(COMMANDS),
    projects: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(null),
      unarchive: vi.fn().mockResolvedValue(null),
      setRootPath: vi.fn().mockResolvedValue(null),
      setName: vi.fn().mockResolvedValue(null),
      setAvailability: vi.fn().mockResolvedValue(null),
    },
    tasks: {
      list: vi.fn().mockResolvedValue([]),
      listAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      queue: vi.fn().mockResolvedValue(undefined),
      runNow: vi.fn().mockResolvedValue(undefined),
    },
    approvals: {
      list: vi.fn().mockResolvedValue([]),
      listAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      resolve: vi.fn().mockResolvedValue(undefined),
    },
    executions: {
      list: vi.fn().mockResolvedValue([]),
      listAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
    },
    audit: {
      append: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
    },
    preferences: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
  const hostAdapter = {
    context: {
      hostId: 'test',
      hostName: 'Test',
      activeProjectId: null,
      theme: 'dark' as const,
      capabilities: { canSelectProject: true, canNavigate: true, supportsTheming: true, supportsMultiProject: false },
      contextualRefs: {},
    },
    selectProject: vi.fn(),
    updateContext: vi.fn(),
    onEvent: vi.fn(() => () => {}),
    destroy: vi.fn(),
    performProjectAction: vi.fn().mockResolvedValue({ status: 'ok' }),
    restartApp: vi.fn().mockResolvedValue(undefined),
  };
  const store = createWorkspaceStore({ dataService, hostAdapter });
  return { store, dataService, hostAdapter };
}

function renderWithStore(node: ReactNode, store: ReturnType<typeof createTestStore>['store']) {
  return render(<WorkspaceProvider store={store}>{node}</WorkspaceProvider>);
}

describe('TaskComposer', () => {
  it('renders a distinct Create Task action (not a send-style Draft)', () => {
    const { store } = createTestStore();
    renderWithStore(<TaskComposer />, store);
    expect(screen.getByRole('button', { name: /Create Task/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Draft$/i })).toBeNull();
  });

  it('keeps title optional and description required', async () => {
    const { store, dataService } = createTestStore();
    store.setState({ activeProjectId: 'p1' });
    renderWithStore(<TaskComposer />, store);
    const createButton = screen.getByRole('button', { name: /Create Task/i }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Task description'), { target: { value: 'Do the thing' } });
    expect(createButton.disabled).toBe(false);
    fireEvent.click(createButton);
    // Title omitted -> creates with 'Untitled'. (Store tasks.list is mocked empty,
    // so the persisted task is observed through the data-service save call.)
    await waitFor(() => expect(dataService.tasks.save).toHaveBeenCalled());
    const saved = dataService.tasks.save.mock.calls[0]?.[0] as { title: string; prompt: string } | undefined;
    expect(saved?.title).toBe('Untitled');
    expect(saved?.prompt).toBe('Do the thing');
  });
});

describe('TaskWorkspace', () => {
  it('attaches the safe-command selector to each task action row (not the workspace header)', () => {
    const { store } = createTestStore();
    store.setState({
      tasks: [
        createTask('task_a', 'p1', 'A', 'do a'),
        createTask('task_b', 'p1', 'B', 'do b'),
      ],
      commands: COMMANDS,
      activeProjectId: 'p1',
    });
    renderWithStore(<TaskWorkspace />, store);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2); // one per task row, none in a floating header
    expect(screen.getAllByLabelText(/Safe command for task/i)).toHaveLength(2);
  });

  it('shows a useful empty state', () => {
    const { store } = createTestStore();
    renderWithStore(<TaskWorkspace />, store);
    expect(screen.getByText(/No tasks yet/)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('ActivityPanel', () => {
  it('shows approval and execution evidence in a dedicated panel', () => {
    const { store } = createTestStore();
    store.setState({
      activeProjectId: 'p1',
      approvals: [
        createExecutionApproval('appr_1', 'task_a', 'p1', 'Run git status', {
          commandId: 'repo.status',
          cwd: 'C:/repo',
          commandSummary: 'git status --short',
          requester: 'cron',
          riskCategory: 'low',
        }),
      ],
      executions: [
        createExecutionRecord({
          id: 'exe_1',
          status: 'completed',
          commandId: 'repo.status',
          taskId: 'task_a',
          projectId: 'p1',
          approvalId: 'appr_1',
          cwd: 'C:/repo',
          executable: 'git',
          args: ['status', '--short'],
          displayCommand: 'git status --short',
          startedAt: 1000,
          endedAt: 1200,
          exitCode: 0,
          output: { stdout: 'M file.txt', stderr: '', truncated: false, redacted: false, stdoutBytes: 10, stderrBytes: 0, stdoutLines: 1, stderrLines: 0 },
        }),
      ],
    });
    renderWithStore(<ActivityPanel />, store);
    expect(screen.getByText(/Approval & Evidence/)).toBeTruthy();
    expect(screen.getAllByText('1 pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('git status --short').length).toBeGreaterThan(0);
    expect(screen.getByText('COMPLETED')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Expand execution'));
    expect(screen.getByText(/M file.txt/)).toBeTruthy();
  });

  it('collapses to a header-only strip without hiding critical controls permanently', () => {
    const { store } = createTestStore();
    store.setState({
      activeProjectId: 'p1',
      approvals: [
        createApproval('appr_2', 'task_a', 'p1', 'execute', 'Run git status'),
      ],
    });
    renderWithStore(<ActivityPanel />, store);
    expect(screen.getByText('Approve')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Collapse approval and evidence/i));
    expect(screen.queryByText('Approve')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Expand approval and evidence/i));
    expect(screen.getByText('Approve')).toBeTruthy();
  });
});

describe('CronAssistant', () => {
  it('renders the assistant as the main conversation surface', () => {
    renderWithStore(<CronAssistant config={null} />, createTestStore().store);
    expect(screen.getByText(/read-only\) — Cloud AI/)).toBeTruthy();
    expect(screen.getByTestId('chat-message-list')).toBeTruthy();
    expect(screen.queryByLabelText('Collapse assistant')).toBeNull();
    expect(screen.queryByText('Code')).toBeNull();
  });

  it('updates one compact OpenCode execution card in the conversation', async () => {
    const { store } = createTestStore();
    store.setState({
      activeProjectId: 'p1',
      projects: [createCodeProject('p1', 'Repo', 'C:/repo')],
    });
    const openCodeRunner = {
      runTask: vi.fn().mockResolvedValue({
        taskId: 'task_1',
        status: 'blocked',
        model: 'deepseek/deepseek-v4-flash',
        runner: 'opencode',
        runnerInterface: 'unavailable',
        events: [{ taskId: 'task_1', status: 'blocked', message: 'OpenCode unavailable', timestamp: 1, model: 'deepseek/deepseek-v4-flash', runner: 'opencode' }],
        summary: 'OpenCode unavailable',
        blocker: 'OpenCode unavailable',
        executionId: 'exe_1',
        record: null,
      }),
      replyToApproval: vi.fn().mockResolvedValue({}),
    };
    renderWithStore(<CronAssistant config={null} openCodeRunner={openCodeRunner} />, store);
    fireEvent.change(screen.getByPlaceholderText('Write your message…'), { target: { value: 'Fix tests' } });
    fireEvent.click(screen.getByTitle('Send'));
    await waitFor(() => expect(screen.getByTestId('opencode-execution-card')).toBeTruthy());
    expect(screen.getAllByTestId('opencode-execution-card')).toHaveLength(1);
    expect(screen.getAllByText(/Fix tests/).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByText('Needs attention').length).toBeGreaterThan(0));
    expect(screen.getAllByTestId('opencode-execution-card')).toHaveLength(1);
    expect(screen.getByText('Executor: DeepSeek V4 Flash')).toBeTruthy();
    expect(screen.getAllByText('OpenCode unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Runner interface:/)).toBeNull();
    // The duplicate technical Details list was removed from the normal surface (Part 9):
    // technical evidence lives in Review, never duplicated in the conversational card.
    expect(screen.queryByText('Details')).toBeNull();
    expect(screen.queryByText(/No runner events yet\./)).toBeNull();
    expect(openCodeRunner.runTask).toHaveBeenCalledWith(expect.objectContaining({ model: 'deepseek/deepseek-v4-flash' }));
  });

  it('publishes live activity incrementally as runner events arrive (no bulk dump)', async () => {
    const { store } = createTestStore();
    store.setState({
      activeProjectId: 'p1',
      projects: [createCodeProject('p1', 'Repo', 'C:/repo')],
    });
    let subscriber: ((event: {
      taskId: string;
      status: string;
      message: string;
      timestamp: number;
      model: string;
      runner: string;
      approval?: unknown;
    }) => void) | undefined;
    let resolveRun!: (result: unknown) => void;
    const runTask = new Promise((resolve) => { resolveRun = resolve; });
    const openCodeRunner = {
      runTask: vi.fn().mockReturnValue(runTask),
      replyToApproval: vi.fn().mockResolvedValue({}),
      onEvent: vi.fn((callback) => {
        subscriber = callback;
        return () => { subscriber = undefined; };
      }),
    };
    renderWithStore(<CronAssistant config={null} openCodeRunner={openCodeRunner} />, store);
    fireEvent.change(screen.getByPlaceholderText('Write your message…'), { target: { value: 'Fix tests' } });
    fireEvent.click(screen.getByTitle('Send'));
    await waitFor(() => expect(openCodeRunner.onEvent).toHaveBeenCalled());
    await waitFor(() => expect(openCodeRunner.runTask).toHaveBeenCalled());
    const taskId = (openCodeRunner.runTask.mock.calls[0]?.[0] as { taskId: string })?.taskId;
    expect(taskId).toBeTruthy();

    // First stage arrives while the task is still running.
    subscriber?.({
      taskId,
      status: 'running',
      message: 'OpenCode server session ses_00c81648abcd created',
      timestamp: 1,
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
    });
    await waitFor(() => expect(screen.getByText('Coding session started.')).toBeTruthy());
    expect(screen.getByText('Working')).toBeTruthy();
    // Raw internal IDs must not appear in the normal surface.
    expect(screen.queryByText(/ses_/)).toBeNull();

    // Approval stage appears inline while still running.
    subscriber?.({
      taskId,
      status: 'awaiting_approval',
      message: 'OpenCode permission requested: edit (runtime-test.txt)',
      timestamp: 2,
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
      approval: {
        approvalId: 'appr_1',
        sessionId: 'ses_1',
        permissionId: 'per_1',
        messageId: 'msg_1',
        callId: 'call_1',
        permission: 'edit',
        target: 'runtime-test.txt',
        reason: 'Required to complete your request.',
        patterns: ['runtime-test.txt'],
      },
    });
    await waitFor(() => expect(screen.getByText(/Waiting for your approval/)).toBeTruthy());
    expect(screen.getAllByText('Approve').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reject').length).toBeGreaterThan(0);

    // Completion only after the runner resolves.
    resolveRun({
      taskId,
      status: 'completed',
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
      runnerInterface: 'headless',
      events: [{ taskId, status: 'verifying', message: 'Verifying OpenCode result after approval', timestamp: 3, model: 'deepseek/deepseek-v4-flash', runner: 'opencode' }],
      summary: 'OpenCode server session completed',
      blocker: null,
      executionId: 'exe_1',
      record: { output: { stdout: 'Changed: runtime-test.txt', stderr: '' } },
      approval: null,
    });
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy());
    expect(screen.getByText('Verifying the requested change.')).toBeTruthy();
    expect(screen.getByTestId('final-summary')).toBeTruthy();
    expect(screen.getAllByText(/runtime-test\.txt/).length).toBeGreaterThan(0);
  });

  it('reveals fast bursts of live steps with a presentation-only stagger (no backend delay)', async () => {
    const { store } = createTestStore();
    store.setState({
      activeProjectId: 'p1',
      projects: [createCodeProject('p1', 'Repo', 'C:/repo')],
    });
    let subscriber: ((event: { taskId: string; status: string; message: string; timestamp: number; model: string; runner: string }) => void) | undefined;
    let resolveRun!: (result: unknown) => void;
    const runTask = new Promise((resolve) => { resolveRun = resolve; });
    const openCodeRunner = {
      runTask: vi.fn().mockReturnValue(runTask),
      replyToApproval: vi.fn().mockResolvedValue({}),
      onEvent: vi.fn((callback) => {
        subscriber = callback;
        return () => { subscriber = undefined; };
      }),
    };
    renderWithStore(<CronAssistant config={null} openCodeRunner={openCodeRunner} />, store);
    fireEvent.change(screen.getByPlaceholderText('Write your message…'), { target: { value: 'Fix tests' } });
    fireEvent.click(screen.getByTitle('Send'));
    await waitFor(() => expect(openCodeRunner.runTask).toHaveBeenCalled());
    const taskId = (openCodeRunner.runTask.mock.calls[0]?.[0] as { taskId: string })?.taskId;

    subscriber?.({
      taskId,
      status: 'running',
      message: 'OpenCode server session ses_1 created',
      timestamp: 1,
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
    });
    subscriber?.({
      taskId,
      status: 'running',
      message: 'OpenCode is reading the project files.',
      timestamp: 2,
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
    });
    await waitFor(() => expect(screen.getAllByTestId('activity-step').length).toBeGreaterThanOrEqual(2));

    const steps = screen.getAllByTestId('activity-step');
    expect(steps[0]?.style.animationDelay).toBe('0ms');
    expect(steps[1]?.style.animationDelay).toBe('240ms');
    expect(steps[1]?.style.animation).toContain('cron-trail-reveal');
    resolveRun({
      taskId,
      status: 'completed',
      model: 'deepseek/deepseek-v4-flash',
      runner: 'opencode',
      runnerInterface: 'headless',
      events: [],
      summary: 'OpenCode server session completed',
      blocker: null,
      executionId: 'exe_2',
      record: { output: { stdout: 'Changed: runtime-test.txt', stderr: '' } },
      approval: null,
    });
  });
});

describe('Sidebar shell fit', () => {
  it('keeps Settings and Account inside the fixed lower stack (never clipped by the taskbar)', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Repo', 'C:/repo')], activeProjectId: 'p1' });
    renderWithStore(<Sidebar onOpenSettings={() => undefined} />, store);
    const lowerStack = screen.getByTestId('sidebar-lower-stack');
    expect(within(lowerStack).getByText('Settings')).toBeTruthy();
    expect(within(lowerStack).getByText('Account')).toBeTruthy();
    expect(lowerStack.style.flexShrink).toBe('0');
    // The lower stack keeps its natural height; only the projects list shrinks
    // and scrolls, so the lower stack never gets pushed below the viewport.
    expect(lowerStack.style.minHeight).not.toBe('0px');
    const projects = screen.getByTestId('sidebar-projects');
    expect(projects.style.overflow).toBe('auto');
    expect(projects.style.minHeight).toBe('0px');
  });
});

describe('Layout workspace hierarchy', () => {
  it('renders the edge-tab shell (persistent logo header | left strip | shared slot | centre | right strip), home is the launch default and projects open once a project is active', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.getByTestId('opencode-style-workspace')).toBeTruthy();
    // The icon-only logo header is persistent above the left rail; the
    // "CRON for Code" wordmark lives in the top bar.
    expect(screen.getByTestId('app-logo-header')).toBeTruthy();
    expect(screen.getByTestId('topbar-brand')).toBeTruthy();
    expect(screen.getByText('CRON')).toBeTruthy();
    expect(screen.getByText('for Code')).toBeTruthy();
    expect(screen.getByTestId('left-tab-strip')).toBeTruthy();
    // All seven labelled edge tabs are present, top to bottom.
    for (const id of ['home', 'projects', 'create-new', 'templates', 'my-apps', 'deployments', 'learn']) {
      expect(screen.getByTestId(`left-tab-${id}`)).toBeTruthy();
    }
    // No Menu tab and no "Files" tab.
    expect(screen.queryByTestId('left-tab-menu')).toBeNull();
    expect(screen.queryByTestId('left-tab-files')).toBeNull();
    // Settings moved to the top bar (not a rail tab).
    expect(screen.queryByTestId('left-tab-settings')).toBeNull();
    expect(screen.getByTestId('settings-menu-button')).toBeTruthy();
    // Labeled rail: text labels are visible (Intelligence-style), not icon-only.
    expect(screen.getByText('Create New')).toBeTruthy();
    expect(screen.getByTestId('right-tab-strip')).toBeTruthy();
    // Projects panel is the default open left panel; the Menu/nav panel is gone.
    expect(screen.getByTestId('project-browser')).toBeTruthy();
    expect(screen.queryByTestId('left-nav')).toBeNull();
    // The profile avatar is always visible at the bottom of the left rail and
    // the slim global footer spans the full app width below it.
    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
    expect(screen.getByTestId('profile-footer')).toBeTruthy();
    expect(screen.getByTestId('main-conversation-pane')).toBeTruthy();
    expect(screen.getByTestId('chat-panel')).toBeTruthy();
    expect(screen.queryByTestId('task-composer')).toBeNull();
    expect(screen.queryByRole('button', { name: /Create Task/i })).toBeNull();
    // No right panel open until a tab is clicked.
    expect(screen.queryByTestId('right-panel-progress')).toBeNull();
    // No top-bar review toggle and no inline review pane/resizer in the centre.
    expect(screen.queryByTestId('review-toggle')).toBeNull();
    expect(screen.queryByTestId('review-pane')).toBeNull();
    expect(screen.queryByTestId('review-resizer')).toBeNull();
  });

  it('left rail: Projects opens/closes in the shared slot; the profile avatar and global footer stay visible', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Default: projects open, no Menu/nav panel (the labeled nav list is gone).
    expect(screen.getByTestId('project-browser')).toBeTruthy();
    expect(screen.queryByTestId('left-nav')).toBeNull();
    // The profile avatar and the global footer are always present, independent
    // of panel state.
    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
    expect(screen.getByTestId('profile-footer')).toBeTruthy();
    // Clicking the active Projects tab again closes the panel; centre takes the space.
    fireEvent.click(screen.getByTestId('left-tab-projects'));
    expect(screen.queryByTestId('project-browser')).toBeNull();
    // The profile avatar and global footer stay visible even when the panel is closed.
    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
    expect(screen.getByTestId('profile-footer')).toBeTruthy();
    // Projects tab re-opens the project browser.
    fireEvent.click(screen.getByTestId('left-tab-projects'));
    expect(screen.getByTestId('project-browser')).toBeTruthy();
  });

  it('code-safety shield: green ShieldCheck by default, amber with a count when approvals are pending, and opens Review on click', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Default governed state: green shield, no badge, "approvals on" tooltip.
    const shield = screen.getByTestId('code-safety-shield') as HTMLButtonElement;
    expect(shield.querySelector('svg')?.getAttribute('stroke')).toBe('#22c55e');
    expect(shield.getAttribute('aria-label')).toMatch(/approvals on/i);
    expect(screen.queryByTestId('code-safety-badge')).toBeNull();
    // Pending approval -> amber shield + count badge.
    act(() => {
      store.setState({
        approvals: [createExecutionApproval('appr_1', 'task_a', 'p1', 'Run git status', { commandId: 'repo.status', cwd: 'C:/repo' })],
      });
    });
    const shieldNow = screen.getByTestId('code-safety-shield') as HTMLButtonElement;
    expect(screen.getByTestId('code-safety-badge').textContent).toBe('1');
    expect(shieldNow.querySelector('svg')?.getAttribute('stroke')).toBe('#f59e0b');
    expect(shieldNow.getAttribute('aria-label')).toMatch(/1 approval pending/i);
    // Clicking opens the Review panel (approvals).
    fireEvent.click(shieldNow);
    expect(screen.getByTestId('right-panel-review')).toBeTruthy();
  });

  it('oryx background is consistent on every screen (Intelligence-style uniform backdrop)', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')] });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Home (no project open): oryx shell background image.
    let backdrop = screen.getByTestId('app-backdrop');
    expect(backdrop.style.backgroundImage).toContain('--cron-shell-bg-image');
    // Project conversation (active project, no centre view): same oryx backdrop.
    act(() => {
      store.setState({ activeProjectId: 'p1' });
    });
    backdrop = screen.getByTestId('app-backdrop');
    expect(backdrop.style.backgroundImage).toContain('--cron-shell-bg-image');
    // Templates is a non-Home centre view: still the same oryx backdrop.
    fireEvent.click(screen.getByTestId('left-tab-templates'));
    backdrop = screen.getByTestId('app-backdrop');
    expect(backdrop.style.backgroundImage).toContain('--cron-shell-bg-image');
  });

  it('profile avatar: compact avatar in the top-right and clicking opens the browser-style profile card', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Compact form: just a clickable avatar button (no full card visible yet).
    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
    expect(screen.getByTestId('profile-avatar-button')).toBeTruthy();
    expect(screen.queryByTestId('profile-popover')).toBeNull();
    // The slim global footer is always present with status + version.
    const footer = screen.getByTestId('profile-footer');
    expect(within(footer).getByText('All Systems Operational')).toBeTruthy();
    expect(within(footer).getByText('v1.0.0')).toBeTruthy();
    // Clicking the avatar opens the account modal with the full account card content.
    fireEvent.click(screen.getByTestId('profile-avatar-button'));
    const popover = screen.getByTestId('profile-popover');
    expect(popover).toBeTruthy();
    expect(within(popover).getByText('Alex Smith')).toBeTruthy();
    expect(within(popover).getByText('Creator Plan')).toBeTruthy();
    expect(within(popover).getByText('OpenCode Credits')).toBeTruthy();
    expect(within(popover).getByText('1,250 / 2,000')).toBeTruthy();
    expect(within(popover).getByText('v1.0.0')).toBeTruthy();
    expect(within(popover).getByText('All Systems Operational')).toBeTruthy();
    // Closing the modal uses the modal's close button.
    fireEvent.click(screen.getByTestId('account-modal-close'));
    expect(screen.queryByTestId('profile-popover')).toBeNull();
  });

  it('Create New left tab runs the New-Project flow and never opens a panel', () => {
    const { store } = createTestStore();
    const onSelectProject = vi.fn();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={onSelectProject} />, store);
    // All seven edge tabs are present.
    for (const id of ['home', 'projects', 'create-new', 'templates', 'my-apps', 'deployments', 'learn']) {
      expect(screen.getByTestId(`left-tab-${id}`)).toBeTruthy();
    }
    // No "Files" tab anywhere on the left edge.
    expect(screen.queryByTestId('left-tab-files')).toBeNull();
    // Clicking Create New triggers the existing New-Project flow and leaves the
    // shared panel slot untouched (Projects stays open; no panel is opened).
    fireEvent.click(screen.getByTestId('left-tab-create-new'));
    expect(onSelectProject).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('project-browser')).toBeTruthy();
    expect(screen.queryByTestId('left-nav')).toBeNull();
  });

  it('left tabs show persistent labels (Intelligence-style), and Settings opens ModelSettings from the top bar', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Labels are visible directly on the rail (no hover needed).
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Templates')).toBeTruthy();
    expect(screen.getByText('Learn')).toBeTruthy();
    expect(screen.getByText('Create New')).toBeTruthy();
    fireEvent.click(screen.getByTestId('left-tab-home'));
    // The hover flyout still reveals the plain section name (labelled rail).
    fireEvent.mouseEnter(screen.getByTestId('left-tab-wrap-learn'));
    expect(screen.getByTestId('left-tab-label-learn').textContent).toBe('Learn');
    fireEvent.mouseLeave(screen.getByTestId('left-tab-wrap-learn'));
    // Home is a centre view: clicking it shows the Home screen and closes the
    // left panel slot (no panel is opened).
    fireEvent.click(screen.getByTestId('left-tab-home'));
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByTestId('project-browser')).toBeNull();
    expect(screen.queryByTestId('left-nav')).toBeNull();
    // Settings moved to the top bar: the gear menu's Settings item opens ModelSettings.
    fireEvent.click(screen.getByTestId('settings-menu-button'));
    fireEvent.click(screen.getByTestId('settings-menu-item-settings'));
    expect(screen.getByRole('dialog', { name: 'AI settings' })).toBeTruthy();
    expect(screen.queryByTestId('left-nav')).toBeNull();
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('New Session still opens the project/session drawer when no project is selected', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')] });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.queryByTestId('project-session-drawer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /New Session/i }));
    expect(screen.getByTestId('project-session-drawer')).toBeTruthy();
    expect(screen.getByText('Projects & Sessions')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close project drawer'));
    expect(screen.queryByTestId('project-session-drawer')).toBeNull();
  });

  it('right edge: tabs open a single panel, the close icon collapses it, no pin', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.queryByTestId('right-panel-progress')).toBeNull();
    fireEvent.click(screen.getByTestId('right-tab-progress'));
    expect(screen.getByTestId('right-panel-progress')).toBeTruthy();
    expect(screen.getByText('Build Progress')).toBeTruthy();
    expect(screen.getAllByText('Coming next').length).toBeGreaterThan(0);
    // The pin is gone.
    expect(screen.queryByTestId('right-pin-progress')).toBeNull();
    // Opening another tab closes the previous panel.
    fireEvent.click(screen.getByTestId('right-tab-engine'));
    expect(screen.queryByTestId('right-panel-progress')).toBeNull();
    expect(screen.getByTestId('right-panel-engine')).toBeTruthy();
    // Clicking the active tab closes it too.
    fireEvent.click(screen.getByTestId('right-tab-engine'));
    expect(screen.queryByTestId('right-panel-engine')).toBeNull();
    // The panel header's drawer-close icon collapses the panel.
    fireEvent.click(screen.getByTestId('right-tab-tools'));
    expect(screen.getByTestId('right-panel-tools')).toBeTruthy();
    fireEvent.click(screen.getByTestId('right-close-tools'));
    expect(screen.queryByTestId('right-panel-tools')).toBeNull();
  });

  it('Review lives on the right edge: Changed Files / Approvals / Evidence, no top-bar toggle or centre pane', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // The old top-bar review toggle and the centre inline review pane are gone.
    expect(screen.queryByTestId('review-toggle')).toBeNull();
    expect(screen.queryByTestId('review-pane')).toBeNull();
    expect(screen.queryByTestId('review-resizer')).toBeNull();
    // Review is now a right-edge tab with the full Changed Files/Approvals/Evidence content.
    fireEvent.click(screen.getByTestId('right-tab-review'));
    expect(screen.getByTestId('right-panel-review')).toBeTruthy();
    expect(screen.getByText('Evidence')).toBeTruthy();
    expect(screen.getAllByText('Changed Files').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Approvals').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('changed-files-review').length).toBeGreaterThan(0);
    expect(screen.getByTestId('activity-panel')).toBeTruthy();
    // The drawer-close icon closes it again.
    fireEvent.click(screen.getByTestId('right-close-review'));
    expect(screen.queryByTestId('right-panel-review')).toBeNull();
    expect(screen.getByTestId('chat-composer')).toBeTruthy();
  });

  it('Review tab shows a plain empty state when no project is open', () => {
    const { store } = createTestStore();
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('right-tab-review'));
    expect(screen.getByTestId('right-panel-review')).toBeTruthy();
    expect(screen.getByText('Open a project to review changes')).toBeTruthy();
    // No fake review content when there is no project.
    expect(screen.queryByTestId('changed-files-review')).toBeNull();
    expect(screen.queryByTestId('activity-panel')).toBeNull();
  });
});

describe('Slice 1 shell components', () => {
  it('LeftNav shows all eight items; Create New and Settings wire to their actions', () => {
    const { store } = createTestStore();
    const onNewProject = vi.fn();
    const onOpenSettings = vi.fn();
    renderWithStore(
      <LeftNav selected="projects" onSelect={() => undefined} onNewProject={onNewProject} onOpenSettings={onOpenSettings} />,
      store,
    );
    for (const id of ['home', 'projects', 'create-new', 'templates', 'my-apps', 'deployments', 'learn', 'settings']) {
      expect(screen.getByTestId(`nav-item-${id}`)).toBeTruthy();
    }
    fireEvent.click(screen.getByTestId('nav-item-create-new'));
    expect(onNewProject).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('nav-item-settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    // The wordmark now lives in the persistent LogoHeader, not the nav panel.
    expect(screen.queryByText('CRON')).toBeNull();
    expect(screen.queryByText('for Code')).toBeNull();
  });

  it('LogoHeader shows the animated logo loop inside the chrome frame when the video URL is set', () => {
    document.documentElement.style.setProperty('--cron-logo-video-url', 'url("video.mp4")');
    try {
      const { store } = createTestStore();
      renderWithStore(<LogoHeader />, store);
      const frame = screen.getByTestId('menu-logo-frame');
      expect(frame).toBeTruthy();
      const video = frame.querySelector('video');
      expect(video).toBeTruthy();
      expect(video?.getAttribute('src')).toBe('video.mp4');
      expect(video?.autoplay).toBe(true);
      expect(video?.loop).toBe(true);
      expect(video?.muted).toBe(true);
      expect(video?.hasAttribute('playsinline')).toBe(true);
      // The wordmark lives in the top bar now; the logo header is icon-only.
    } finally {
      document.documentElement.style.removeProperty('--cron-logo-video-url');
    }
  });

  it('ProjectBrowser lists real projects, highlights the active one, and has a friendly empty state', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'TaskFlow Dashboard', 'C:/apps/taskflow'), createCodeProject('p2', 'Expense Tracker', 'C:/apps/expense')],
      activeProjectId: 'p1',
    });
    const onSelectProject = vi.fn();
    const onNewProject = vi.fn();
    renderWithStore(<ProjectBrowser onNewProject={onNewProject} onSelectProject={onSelectProject} onViewAll={() => undefined} />, store);
    expect(screen.getByText('Your Projects')).toBeTruthy();
    expect(screen.getByText('TaskFlow Dashboard')).toBeTruthy();
    expect(screen.getByText('Expense Tracker')).toBeTruthy();
    fireEvent.click(screen.getByTestId('project-card-p2'));
    expect(onSelectProject).toHaveBeenCalledWith('p2');
    fireEvent.click(screen.getByTestId('new-project-button'));
    expect(onNewProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No projects yet')).toBeNull();
  });

  it('ProjectBrowser shows a friendly empty state when there are no projects', () => {
    const { store } = createTestStore();
    renderWithStore(<ProjectBrowser onNewProject={() => undefined} onSelectProject={() => undefined} onViewAll={() => undefined} />, store);
    expect(screen.getByText('No projects yet')).toBeTruthy();
    expect(screen.getByText(/Click \+ New Project/)).toBeTruthy();
  });

  it('ProjectBrowser filter toggles a real sort and "View all projects" fires onViewAll', () => {
    const { store } = createTestStore();
    const onViewAll = vi.fn();
    store.setState({
      projects: [
        createCodeProject('p1', 'Zebra App', 'C:/apps/zebra'),
        createCodeProject('p2', 'Alpha App', 'C:/apps/alpha'),
      ],
    });
    renderWithStore(<ProjectBrowser onNewProject={() => undefined} onSelectProject={() => undefined} onViewAll={onViewAll} />, store);
    // Default sort is "Recently updated" (createdAt order here); switch to A–Z.
    fireEvent.click(screen.getByTestId('project-sort-toggle'));
    expect(screen.getByTestId('project-sort-menu')).toBeTruthy();
    fireEvent.click(screen.getByTestId('sort-option-name'));
    const cards = screen.getAllByTestId(/project-card-/);
    expect(cards[0]?.textContent).toContain('Alpha App');
    expect(cards[1]?.textContent).toContain('Zebra App');
    // Back to recently updated.
    fireEvent.click(screen.getByTestId('project-sort-toggle'));
    fireEvent.click(screen.getByTestId('sort-option-recent'));
    // View all is a real action now.
    fireEvent.click(screen.getByTestId('view-all-projects'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('RightSidebar is a tab strip with placeholder panels, and AccountArea shows the fixed account/status values', () => {
    const { store } = createTestStore();
    renderWithStore(<RightSidebar />, store);
    expect(screen.getByTestId('right-sidebar')).toBeTruthy();
    expect(screen.getByTestId('right-tab-strip')).toBeTruthy();
    // Panels open on tab click; content is the honest placeholder.
    expect(screen.queryByText('Build Progress')).toBeNull();
    fireEvent.click(screen.getByTestId('right-tab-progress'));
    expect(screen.getByText('Build Progress')).toBeTruthy();
    expect(screen.getByText('Coming next')).toBeTruthy();

    renderWithStore(<AccountArea />, store);
    expect(screen.getByText('Alex Smith')).toBeTruthy();
    expect(screen.getByText('Creator Plan')).toBeTruthy();
    expect(screen.getByText('OpenCode Credits')).toBeTruthy();
    expect(screen.getByText('1,250 / 2,000')).toBeTruthy();
    expect(screen.getByText('Resets in 12 days')).toBeTruthy();
    expect(screen.getByText('v1.0.0')).toBeTruthy();
    expect(screen.getByText('All Systems Operational')).toBeTruthy();
  });

  it('Layout: Create New runs the existing New-Project flow and Settings opens ModelSettings (top bar)', () => {
    const { store } = createTestStore();
    const onSelectProject = vi.fn();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={onSelectProject} />, store);
    // No Menu tab / nav panel anymore: Create New is a direct tab, Settings is in the top bar.
    expect(screen.queryByTestId('left-tab-menu')).toBeNull();
    fireEvent.click(screen.getByTestId('left-tab-create-new'));
    expect(onSelectProject).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('settings-menu-button'));
    fireEvent.click(screen.getByTestId('settings-menu-item-settings'));
    expect(screen.getByRole('dialog', { name: 'AI settings' })).toBeTruthy();
  });
});

describe('Home screen', () => {
  it('shows the hero, real recent projects, and starter templates when no project is selected', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'TaskFlow Dashboard', 'C:/apps/taskflow'), createCodeProject('p2', 'Expense Tracker', 'C:/apps/expense')],
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText('What do you want to build?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe what you want to build...')).toBeTruthy();
    expect(screen.getByText('Recent projects')).toBeTruthy();
    expect(screen.getByText('TaskFlow Dashboard')).toBeTruthy();
    expect(screen.getByText('Expense Tracker')).toBeTruthy();
    expect(screen.getByText('Start from a template')).toBeTruthy();
    expect(screen.getByText('Task dashboard')).toBeTruthy();
    expect(screen.getByText('Invoicing app')).toBeTruthy();
    expect(screen.getByText('Portfolio site')).toBeTruthy();
    expect(screen.getByText('Internal tool')).toBeTruthy();
    // The old EmptyState welcome card is no longer the default view.
    expect(screen.queryByText('Resume a project')).toBeNull();
    expect(screen.queryByText(/Planner: CRON/)).toBeNull();
    // No chat until a project is open.
    expect(screen.queryByTestId('main-conversation-pane')).toBeNull();
  });

  it('is the default landing: the Home tab is selected and shows Home', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')] });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    // Home screen is the centre view; Home is a centre view (not a panel), so
    // the left panel slot is closed by default.
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByTestId('project-browser')).toBeNull();
    // Opening the Projects panel keeps the centre on Home (no project yet).
    fireEvent.click(screen.getByTestId('left-tab-projects'));
    expect(screen.getByTestId('project-browser')).toBeTruthy();
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    // The Home tab returns to the Home view and closes the panel.
    fireEvent.click(screen.getByTestId('left-tab-home'));
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByTestId('project-browser')).toBeNull();
  });

  it('hero submit and template clicks both open the New-Project picker flow', () => {
    const { store } = createTestStore();
    const onSelectProject = vi.fn();
    renderWithStore(<Layout onSelectProject={onSelectProject} />, store);
    fireEvent.change(screen.getByPlaceholderText('Describe what you want to build...'), { target: { value: 'Build me an invoicing app' } });
    fireEvent.click(screen.getByTitle('Build'));
    expect(onSelectProject).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('home-template-invoicing-app'));
    expect(onSelectProject).toHaveBeenCalledTimes(2);
  });

  it('recent project cards open the project and land in the workspace', async () => {
    const { store, dataService } = createTestStore();
    dataService.projects.get.mockResolvedValue(createCodeProject('p1', 'TaskFlow Dashboard', 'C:/apps/taskflow'));
    dataService.tasks.list.mockResolvedValue([]);
    dataService.approvals.listAll.mockResolvedValue([]);
    dataService.executions.list.mockResolvedValue([]);
    store.setState({ projects: [createCodeProject('p1', 'TaskFlow Dashboard', 'C:/apps/taskflow')] });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('home-project-p1'));
    await waitFor(() => expect(screen.getByTestId('main-conversation-pane')).toBeTruthy());
    expect(screen.getByTestId('project-browser')).toBeTruthy();
    expect(screen.queryByTestId('home-screen')).toBeNull();
  });

  it('shows a friendly empty state when there are no projects', () => {
    const { store } = createTestStore();
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText(/No projects yet/)).toBeTruthy();
  });
});

describe('complete screens + buttons', () => {
  it('Templates tab opens the Templates screen with 6 starter cards; cards run the New-Project flow', () => {
    const { store } = createTestStore();
    const onSelectProject = vi.fn();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={onSelectProject} />, store);
    fireEvent.click(screen.getByTestId('left-tab-templates'));
    expect(screen.getByTestId('templates-screen')).toBeTruthy();
    for (const id of ['task-dashboard', 'invoicing-app', 'portfolio-site', 'internal-tool', 'expense-tracker', 'customer-list']) {
      expect(screen.getByTestId(`template-card-${id}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('project-browser')).toBeNull();
    fireEvent.click(screen.getByTestId('template-card-task-dashboard'));
    expect(onSelectProject).toHaveBeenCalledTimes(1);
  });

  it('My Apps tab shows real projects with honest build-status pills', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [
        createCodeProject('p1', 'TaskFlow Dashboard', 'C:/apps/taskflow'),
        createCodeProject('p2', 'Expense Tracker', 'C:/apps/expense'),
      ],
      activeProjectId: 'p1',
      executions: [
        createExecutionRecord({
          id: 'exe_1',
          status: 'completed',
          commandId: 'opencode.runner',
          taskId: 'task_a',
          projectId: 'p1',
          approvalId: null,
          cwd: 'C:/apps/taskflow',
          executable: 'opencode',
          args: [],
          displayCommand: 'opencode',
          startedAt: Date.now() - 7200000,
          endedAt: Date.now() - 7200000,
          exitCode: 0,
        }),
      ],
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('left-tab-my-apps'));
    expect(screen.getByTestId('my-apps-screen')).toBeTruthy();
    expect(screen.getAllByText('Built').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Draft').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Last built 2 hours ago/)).toBeTruthy();
  });

  it('My Apps tab shows a friendly empty state when there are no projects', () => {
    const { store } = createTestStore();
    store.setState({ projects: [], commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('left-tab-my-apps'));
    expect(screen.getByTestId('my-apps-screen')).toBeTruthy();
    expect(screen.getByText('No apps yet')).toBeTruthy();
  });

  it('Deployments tab is an honest empty state with a disabled publish button', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('left-tab-deployments'));
    expect(screen.getByTestId('deployments-screen')).toBeTruthy();
    expect(screen.getByText('Nothing deployed yet')).toBeTruthy();
    expect(screen.getByText(/it'll show up here/)).toBeTruthy();
    const publish = screen.getByRole('button', { name: /Publish an app/i }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
  });

  it('Learn tab shows real help content (the help entry point)', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('left-tab-learn'));
    expect(screen.getByTestId('learn-screen')).toBeTruthy();
    expect(screen.getByText('How it works')).toBeTruthy();
    expect(screen.getByText('Prompt tips')).toBeTruthy();
    expect(screen.getByText('Example prompts')).toBeTruthy();
    // Help is reached from the Learn tab (no separate top-bar Help button).
    expect(screen.queryByTestId('help-button')).toBeNull();
  });

  it('the notification bell shows a real pending-approval badge and opens the Review panel', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      approvals: [createExecutionApproval('appr_1', 'task_a', 'p1', 'Run git status', { commandId: 'repo.status', cwd: 'C:/repo' })],
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    const badge = screen.getByTestId('notification-badge');
    expect(badge.textContent).toBe('1');
    fireEvent.click(screen.getByTestId('notification-bell'));
    expect(screen.getByTestId('right-panel-review')).toBeTruthy();
  });

  it('the bell has no badge when there are no pending approvals', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('Speak to CRON is absent from the top bar (voice not decided; removed to declutter)', () => {
    const { store } = createTestStore();
    store.setState({ projects: [createCodeProject('p1', 'Meds', 'C:/repo')], activeProjectId: 'p1', commands: COMMANDS });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.queryByRole('button', { name: /Speak to CRON/ })).toBeNull();
  });
});

describe('startup readiness signal', () => {
  it('fires onUsable only after data hydration completes (entry screen usable)', async () => {
    const { dataService, hostAdapter } = createTestStore();
    const onUsable = vi.fn();
    renderWithStore(
      <CronCodeApp
        deps={{
          dataService,
          hostAdapter,
          onUsable,
        }}
      />,
      createTestStore().store,
    );
    await waitFor(() => expect(onUsable).toHaveBeenCalledTimes(1));
  });
});

