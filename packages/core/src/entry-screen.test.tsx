import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { EmptyState } from './components/EmptyState.js';
import { createCodeProject } from '@cron-code/contracts';

afterEach(cleanup);

function renderEntry(withProjects = true) {
  const dataService = {
    config: { storagePath: '/tmp' },
    initialize: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    listCommands: vi.fn().mockResolvedValue([]),
    projects: {
      list: vi.fn().mockResolvedValue(withProjects ? [createCodeProject('p1', 'CRON for Code', 'C:/repo')] : []),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(null),
      unarchive: vi.fn().mockResolvedValue(null),
      setRootPath: vi.fn().mockResolvedValue(null),
      setName: vi.fn().mockResolvedValue(null),
      setAvailability: vi.fn().mockResolvedValue(null),
    },
    tasks: { list: vi.fn().mockResolvedValue([]), listAll: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), updateStatus: vi.fn().mockResolvedValue(undefined), queue: vi.fn().mockResolvedValue(undefined), runNow: vi.fn().mockResolvedValue(undefined) },
    approvals: { list: vi.fn().mockResolvedValue([]), listAll: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), resolve: vi.fn().mockResolvedValue(undefined) },
    executions: { list: vi.fn().mockResolvedValue([]), listAll: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined), cancel: vi.fn().mockResolvedValue(undefined) },
    audit: { append: vi.fn().mockResolvedValue(undefined), list: vi.fn().mockResolvedValue([]) },
    preferences: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined) },
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
  store.setState({
    projects: withProjects ? [createCodeProject('p1', 'CRON for Code', 'C:/repo')] : [],
  });
  return render(<WorkspaceProvider store={store}><EmptyState onSelectProject={vi.fn()} /></WorkspaceProvider>);
}

describe('entry screen (balance + role chips)', () => {
  it('renders Open Project, resume list, and plain-language role chips', () => {
    renderEntry(true);
    expect(screen.getByRole('button', { name: /Open Project/i })).toBeTruthy();
    expect(screen.getAllByText('CRON for Code').length).toBeGreaterThan(0);
    expect(screen.getByText('Resume a project')).toBeTruthy();
    expect(screen.getByText(/Planner: Gemma/)).toBeTruthy();
    expect(screen.getByText(/Executor: OpenCode/)).toBeTruthy();
    expect(screen.getByText(/Release Gate: Locked/)).toBeTruthy();
    // Plain-language composition: the entry screen explains the roles instead of
    // exposing model/endpoint internals.
    expect(screen.queryByText(/localhost/)).toBeNull();
  });

  it('stays balanced without a resume list (no dead-zone content)', () => {
    renderEntry(false);
    expect(screen.getByRole('button', { name: /Open Project/i })).toBeTruthy();
    expect(screen.queryByText('Resume a project')).toBeNull();
    expect(screen.getByText(/Planner: Gemma/)).toBeTruthy();
  });
});
