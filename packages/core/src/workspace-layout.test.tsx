import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { TaskComposer } from './components/TaskComposer.js';
import { TaskWorkspace } from './components/TaskWorkspace.js';
import { ActivityPanel } from './components/ActivityPanel.js';
import { CronAssistant } from './components/CronAssistant.js';
import { CronCodeApp } from './components/App.js';
import { Sidebar } from './components/Sidebar.js';
import { Layout } from './components/Layout.js';
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
    expect(screen.getByText(/Gemma planner \(read-only\) via LM Studio chat route/)).toBeTruthy();
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
  });
});

describe('Layout workspace hierarchy', () => {
  it('renders an OpenCode-style workspace with one conversation canvas and a review pane', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.getByTestId('opencode-style-workspace')).toBeTruthy();
    expect(screen.getByTestId('main-conversation-pane')).toBeTruthy();
    expect(screen.getByTestId('review-pane')).toBeTruthy();
    expect(screen.getByTestId('review-resizer')).toBeTruthy();
    expect(screen.getByTestId('activity-panel')).toBeTruthy();
    expect(screen.getByTestId('chat-panel')).toBeTruthy();
    expect(screen.queryByTestId('task-composer')).toBeNull();
    expect(screen.queryByRole('button', { name: /Create Task/i })).toBeNull();
  });

  it('opens project and session navigation in a drawer instead of a permanent sidebar', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    expect(screen.queryByTestId('project-session-drawer')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open navigation drawer'));
    expect(screen.getByTestId('project-session-drawer')).toBeTruthy();
    expect(screen.getByText('Projects & Sessions')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close project drawer'));
    expect(screen.queryByTestId('project-session-drawer')).toBeNull();
  });

  it('can close and reopen the review pane without affecting the composer', () => {
    const { store } = createTestStore();
    store.setState({
      projects: [createCodeProject('p1', 'Meds', 'C:/repo')],
      activeProjectId: 'p1',
      commands: COMMANDS,
    });
    renderWithStore(<Layout onSelectProject={() => undefined} />, store);
    fireEvent.click(screen.getByTestId('review-toggle'));
    expect(screen.queryByTestId('review-pane')).toBeNull();
    expect(screen.getByTestId('chat-composer')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Open review pane'));
    expect(screen.getByTestId('review-pane')).toBeTruthy();
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

