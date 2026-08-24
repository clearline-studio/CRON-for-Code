import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup, waitFor, act, within, fireEvent } from '@testing-library/react';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWorkspaceStore, visibleProjects, reconcileProjects } from './store.js';
import { WorkspaceProvider } from './context.js';
import { Sidebar } from './components/Sidebar.js';
import { Layout } from './components/Layout.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { createJsonDataService } from '@cron-code/data-service';
import { createStandaloneHostAdapter } from '@cron-code/host-adapter';
import { createCodeProject, createTask } from '@cron-code/contracts';

afterEach(cleanup);

function makeGitRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
  mkdirSync(join(dir, '.git', 'refs', 'tags'), { recursive: true });
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(
    join(dir, '.git', 'config'),
    '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n',
  );
  writeFileSync(join(dir, 'README.md'), 'project management test\n');
}

function renderWithStore(node: ReactNode, store: ReturnType<typeof createWorkspaceStore>) {
  return render(<WorkspaceProvider store={store}>{node}</WorkspaceProvider>);
}

describe('CRON Restart', () => {
  it('restart button invokes the host restart bridge and sets isRestarting', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-restart-' + Date.now()) });
    const restart = vi.fn().mockResolvedValue(undefined);
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: {
        perform: vi.fn().mockResolvedValue({ status: 'ok' }),
        restart,
      },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );

    await act(async () => {
      render(<ErrorBanner />, { wrapper });
    });

    await act(async () => {
      await store.getState().restartApp();
    });

    expect(restart).toHaveBeenCalledTimes(1);
    expect(store.getState().isRestarting).toBe(true);

    await dataService.destroy();
  });

  it('a failed restart surfaces the error and clears isRestarting', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-restart-fail-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: {
        perform: vi.fn().mockResolvedValue({ status: 'ok' }),
        restart: vi.fn().mockRejectedValue(new Error('restart refused')),
      },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await act(async () => {
      await store.getState().restartApp();
    });

    expect(store.getState().isRestarting).toBe(false);
    expect(store.getState().error).toMatch(/restart refused/);

    await dataService.destroy();
  });

  it('a duplicate restart request is coalesced while one is in progress', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-restart-dup-' + Date.now()) });
    const restart = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await act(async () => {
      void store.getState().restartApp();
      void store.getState().restartApp();
      void store.getState().restartApp();
    });
    await waitFor(() => expect(store.getState().isRestarting).toBe(true));
    expect(restart).toHaveBeenCalledTimes(1);

    await dataService.destroy();
  });

  it('renders the restart button in the top bar and wires it to restartApp', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-restart-btn-' + Date.now()) });
    const restart = vi.fn().mockResolvedValue(undefined);
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );

    await act(async () => {
      render(<Layout onSelectProject={() => undefined} />, { wrapper });
    });

    const button = screen.getByTestId('cron-restart-button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    await waitFor(() => expect(restart).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(store.getState().isRestarting).toBe(true));
    expect((screen.getByTestId('cron-restart-button') as HTMLButtonElement).disabled).toBe(true);

    await dataService.destroy();
  });
});

describe('Project archive / Remove from CRON', () => {
  let tmp: string;
  let repoA: string;
  let repoB: string;
  let dataService: ReturnType<typeof createJsonDataService>;
  let hostAdapter: ReturnType<typeof createStandaloneHostAdapter>;
  let store: ReturnType<typeof createWorkspaceStore>;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'cron-pm-test-'));
    repoA = join(tmp, 'Repo A');
    repoB = join(tmp, 'Repo B');
    makeGitRepo(repoA);
    makeGitRepo(repoB);
    dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart: vi.fn() },
    });
    store = createWorkspaceStore({ dataService, hostAdapter });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('archives a non-active project and excludes it from the sidebar', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    const b = createCodeProject('proj_b', 'Repo B', repoB);
    await dataService.projects.save(a);
    await dataService.projects.save(b);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_b');

    expect(store.getState().projects).toHaveLength(2);

    await store.getState().archiveProject('proj_a');

    const visible = store.getState().projects;
    expect(visible.find((p) => p.id === 'proj_a')).toBeUndefined();
    expect(store.getState().activeProjectId).toBe('proj_b');

    const stored = await dataService.projects.list();
    const archived = stored.find((p) => p.id === 'proj_a');
    expect(archived?.archived).toBe(true);

    const tasks = await dataService.tasks.listAll();
    void tasks;
  });

  it('archives the active project and falls back to a remaining available project', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    const b = createCodeProject('proj_b', 'Repo B', repoB);
    await dataService.projects.save(a);
    await dataService.projects.save(b);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    expect(store.getState().activeProjectId).toBe('proj_a');

    await store.getState().archiveProject('proj_a');

    expect(store.getState().activeProjectId).toBe('proj_b');
    expect(store.getState().projects.find((p) => p.id === 'proj_a')).toBeUndefined();
  });

  it('archives the only project and leaves activeProjectId as null', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');

    await store.getState().archiveProject('proj_a');

    expect(store.getState().activeProjectId).toBeNull();
    expect(store.getState().tasks).toEqual([]);
  });

  it('preserves linked task/approval/execution history when archiving', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    const task = createTask('task_1', 'proj_a', 'T', 'do thing');
    await dataService.tasks.save(task);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    expect(store.getState().tasks.find((t) => t.id === 'task_1')).toBeTruthy();

    await store.getState().archiveProject('proj_a');

    const persistedTask = await dataService.tasks.get('task_1');
    expect(persistedTask?.projectId).toBe('proj_a');
  });

  it('archived project does not reappear after restart (re-load)', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().archiveProject('proj_a');

    const reloaded = createJsonDataService({ storagePath: join(tmp, 'store') });
    await reloaded.initialize();
    const freshStore = createWorkspaceStore({ dataService: reloaded, hostAdapter });
    await freshStore.getState().loadProjects();
    // Archived projects are persisted (for history) but excluded from visible navigation.
    expect(visibleProjects(freshStore.getState().projects).find((p) => p.id === 'proj_a')).toBeUndefined();
    await reloaded.destroy();
  });

  it('re-adding the same canonical path unarchives the existing record (no duplicate)', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().archiveProject('proj_a');

    await store.getState().openProjectPath(repoA, 'Repo A');

    const stored = await dataService.projects.list();
    expect(stored).toHaveLength(1);
    expect(stored[0].archived).toBe(false);
    expect(store.getState().activeProjectId).toBe('proj_a');
  });
});

describe('Project menu wiring', () => {
  let tmp: string;
  let repoA: string;
  let dataService: ReturnType<typeof createJsonDataService>;
  let perform: ReturnType<typeof vi.fn>;
  let hostAdapter: ReturnType<typeof createStandaloneHostAdapter>;
  let store: ReturnType<typeof createWorkspaceStore>;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'cron-menu-test-'));
    repoA = join(tmp, 'Repo A');
    makeGitRepo(repoA);
    dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    perform = vi.fn().mockResolvedValue({ status: 'ok' });
    hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform, restart: vi.fn() },
    });
    store = createWorkspaceStore({ dataService, hostAdapter });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('reveal action routes through the host bridge using the project id', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();

    await store.getState().revealProject('proj_a');
    expect(perform).toHaveBeenCalledWith({ kind: 'reveal', projectId: 'proj_a' });
  });

  it('copy-path action routes through the host bridge and shows a brief confirm', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();

    await store.getState().copyProjectPath('proj_a');
    expect(perform).toHaveBeenCalledWith({ kind: 'copy-path', projectId: 'proj_a' });
    expect(store.getState().copyConfirm?.path).toBe(repoA);
  });

  it('rename action changes the display name only (rootPath unchanged)', async () => {
    const a = createCodeProject('proj_a', 'Old', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().renameProject('proj_a', 'New');
    const updated = store.getState().projects.find((p) => p.id === 'proj_a');
    expect(updated?.name).toBe('New');
    expect(updated?.rootPath).toBe(repoA);
    const persisted = await dataService.projects.get('proj_a');
    expect(persisted?.name).toBe('New');
  });

  it('rename rejects empty/whitespace input', async () => {
    const a = createCodeProject('proj_a', 'Original', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().renameProject('proj_a', '   ');
    expect(store.getState().error).toMatch(/empty/);
    expect(store.getState().projects.find((p) => p.id === 'proj_a')?.name).toBe('Original');
  });

  it('refresh action updates availability through the host bridge', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().refreshProject('proj_a');
    expect(perform).toHaveBeenCalledWith({ kind: 'refresh', projectId: 'proj_a' });
  });
});

describe('Sidebar clipping + lower-stack visibility', () => {
  it('keeps Account and DEV marker inside the fixed lower stack with no clipping', () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-sidebar-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart: vi.fn() },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    store.setState({
      projects: [createCodeProject('proj_a', 'Repo A', 'C:/repos/Repo A')],
      activeProjectId: 'proj_a',
    });
    renderWithStore(<Sidebar onOpenSettings={() => undefined} />, store);

    const lowerStack = screen.getByTestId('sidebar-lower-stack');
    expect(within(lowerStack).getByText('Settings')).toBeTruthy();
    const accountRow = within(lowerStack).getByText('Account');
    expect(accountRow).toBeTruthy();
    expect(lowerStack.style.flexShrink).toBe('0');
    // The lower stack must keep its full natural height (never shrink/clip); the
    // projects list above it is the only shrinkable+scrollable region.
    expect(lowerStack.style.minHeight).not.toBe('0px');
    const projects = screen.getByTestId('sidebar-projects');
    expect(projects.style.overflow).toBe('auto');
    expect(projects.style.minHeight).toBe('0px');
    const devBadges = within(lowerStack).getAllByText('DEV');
    expect(devBadges.length).toBeGreaterThan(0);
  });

  it('renders the project menu trigger button on each project row', () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-sidebar-trigger-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart: vi.fn() },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    store.setState({
      projects: [
        createCodeProject('proj_a', 'Repo A', 'C:/repos/A'),
        createCodeProject('proj_b', 'Repo B', 'C:/repos/B'),
      ],
      activeProjectId: 'proj_a',
    });
    renderWithStore(<Sidebar onOpenSettings={() => undefined} />, store);
    expect(screen.getByTestId('project-menu-trigger-proj_a')).toBeTruthy();
    expect(screen.getByTestId('project-menu-trigger-proj_b')).toBeTruthy();
  });

  it('hides archived projects from the sidebar', () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-sidebar-archived-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart: vi.fn() },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const a = createCodeProject('proj_a', 'Repo A', 'C:/repos/A');
    const b = { ...createCodeProject('proj_b', 'Repo B', 'C:/repos/B'), archived: true };
    store.setState({ projects: [a, b], activeProjectId: 'proj_a' });
    renderWithStore(<Sidebar onOpenSettings={() => undefined} />, store);
    expect(screen.getByTestId('project-row-proj_a')).toBeTruthy();
    expect(screen.queryByTestId('project-row-proj_b')).toBeNull();
  });
});

describe('Last-active project restoration', () => {
  let tmp: string;
  let repoA: string;
  let dataService: ReturnType<typeof createJsonDataService>;
  let hostAdapter: ReturnType<typeof createStandaloneHostAdapter>;
  let store: ReturnType<typeof createWorkspaceStore>;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'cron-last-active-'));
    repoA = join(tmp, 'Repo A');
    makeGitRepo(repoA);
    dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform: vi.fn().mockResolvedValue({ status: 'ok' }), restart: vi.fn() },
    });
    store = createWorkspaceStore({ dataService, hostAdapter });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('persists lastActiveProjectId on selection and restores it on a fresh store', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    const stored = await dataService.preferences.get('lastActiveProjectId');
    expect(stored).toBe('proj_a');

    const reloaded = createJsonDataService({ storagePath: join(tmp, 'store') });
    await reloaded.initialize();
    const freshStore = createWorkspaceStore({ dataService: reloaded, hostAdapter });
    await freshStore.getState().loadProjects();
    await freshStore.getState().restoreLastActiveProject();
    expect(freshStore.getState().activeProjectId).toBe('proj_a');
    await reloaded.destroy();
  });

  it('clears the preference when the last-active project is archived and does not restore it', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    await store.getState().archiveProject('proj_a');

    const reloaded = createJsonDataService({ storagePath: join(tmp, 'store') });
    await reloaded.initialize();
    const freshStore = createWorkspaceStore({ dataService: reloaded, hostAdapter });
    await freshStore.getState().loadProjects();
    await freshStore.getState().restoreLastActiveProject();
    expect(freshStore.getState().activeProjectId).toBeNull();
    const stored = await reloaded.preferences.get('lastActiveProjectId');
    expect(stored).toBe('');
    await reloaded.destroy();
  });

  it('does not restore when the stored id does not exist', async () => {
    await dataService.preferences.set('lastActiveProjectId', 'proj_ghost');
    const freshStore = createWorkspaceStore({ dataService, hostAdapter });
    await freshStore.getState().loadProjects();
    await freshStore.getState().restoreLastActiveProject();
    expect(freshStore.getState().activeProjectId).toBeNull();
  });
});

describe('Re-link cancellation and project-list preservation', () => {
  let tmp: string;
  let repoA: string;
  let repoB: string;
  let dataService: ReturnType<typeof createJsonDataService>;
  let perform: ReturnType<typeof vi.fn>;
  let hostAdapter: ReturnType<typeof createStandaloneHostAdapter>;
  let store: ReturnType<typeof createWorkspaceStore>;

  function makeStore(bridgePerform: () => unknown) {
    perform = vi.fn(bridgePerform);
    hostAdapter = createStandaloneHostAdapter({
      selectFolder: vi.fn().mockResolvedValue(null),
      hostActionBridge: { perform, restart: vi.fn() },
    });
    store = createWorkspaceStore({ dataService, hostAdapter });
    return { perform, hostAdapter, store };
  }

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'cron-relink-cancel-'));
    repoA = join(tmp, 'Repo A');
    repoB = join(tmp, 'Repo B');
    makeGitRepo(repoA);
    makeGitRepo(repoB);
    dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    makeStore(async () => ({ status: 'cancelled' }));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('cancel is an exact no-op: no error, list unchanged, active unchanged, loading clear, preference unchanged', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    const b = createCodeProject('proj_b', 'Repo B', repoB);
    await dataService.projects.save(a);
    await dataService.projects.save(b);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    const projectsBefore = store.getState().projects.map((p) => p.id).sort();
    const activeBefore = store.getState().activeProjectId;
    const prefBefore = await dataService.preferences.get('lastActiveProjectId');
    const rootPathBefore = (await dataService.projects.get('proj_a'))?.rootPath;
    const availabilityBefore = (await dataService.projects.get('proj_a'))?.availability;

    await store.getState().relinkProject('proj_a');

    expect(store.getState().error).toBeNull();
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().activeProjectId).toBe(activeBefore);
    expect(store.getState().projects.map((p) => p.id).sort()).toEqual(projectsBefore);
    expect(await dataService.preferences.get('lastActiveProjectId')).toBe(prefBefore);
    expect((await dataService.projects.get('proj_a'))?.rootPath).toBe(rootPathBefore);
    expect((await dataService.projects.get('proj_a'))?.availability).toBe(availabilityBefore);
    expect((await dataService.projects.get('proj_a'))?.archived).toBe(false);
    const audit = await dataService.audit.list();
    expect(audit.some((entry) => entry.eventType === 'project.relinked')).toBe(false);
    expect(audit.some((entry) => entry.eventType === 'project.archived')).toBe(false);
  });

  it('cancel produces no red error banner and no loading strip in the UI', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');

    renderWithStore(<ErrorBanner />, store);
    expect(screen.queryByTestId('status-banner')).toBeNull();

    await act(async () => {
      await store.getState().relinkProject('proj_a');
    });

    expect(screen.queryByTestId('status-banner')).toBeNull();
    expect(screen.queryByText(/Loading project/)).toBeNull();
  });

  it('successful relink keeps the same id, updates rootPath, keeps the active project and the list', async () => {
    const repoC = join(tmp, 'Repo C');
    makeGitRepo(repoC);
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    const b = createCodeProject('proj_b', 'Repo B', repoB);
    await dataService.projects.save(a);
    await dataService.projects.save(b);
    makeStore(async () => {
      const current = (await dataService.projects.get('proj_a'))!;
      const next = { ...current, rootPath: repoC, updatedAt: Date.now() };
      await dataService.projects.save(next);
      return { status: 'ok', project: next };
    });
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    await store.getState().relinkProject('proj_a');

    expect(store.getState().error).toBeNull();
    expect(store.getState().activeProjectId).toBe('proj_a');
    expect(store.getState().projects.find((p) => p.id === 'proj_a')?.rootPath).toBe(repoC);
    expect(store.getState().projects).toHaveLength(2);
    expect((await dataService.projects.get('proj_a'))?.rootPath).toBe(repoC);
    expect((await dataService.projects.get('proj_a'))?.id).toBe('proj_a');
  });

  it('conflict shows a concise visible error and leaves the list intact', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    const b = createCodeProject('proj_b', 'Repo B', repoB);
    await dataService.projects.save(a);
    await dataService.projects.save(b);
    makeStore(async () => ({
      status: 'conflict',
      conflictProjectId: 'proj_b',
      conflictRootPath: repoB,
    }));
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    const idsBefore = store.getState().projects.map((p) => p.id).sort();

    await store.getState().relinkProject('proj_a');

    expect(store.getState().error).toMatch(/Re-link blocked/);
    expect(store.getState().projects.map((p) => p.id).sort()).toEqual(idsBefore);
    expect(store.getState().activeProjectId).toBe('proj_a');
    expect((await dataService.projects.get('proj_a'))?.rootPath).toBe(repoA);
  });

  it('genuine host failure shows an error, clears loading, and never wipes the list', async () => {
    const a = createCodeProject('proj_a', 'Repo A', repoA);
    await dataService.projects.save(a);
    makeStore(async () => {
      throw new Error('PATH_REJECTED: invalid folder');
    });
    await store.getState().loadProjects();
    await store.getState().selectProject('proj_a');
    const idsBefore = store.getState().projects.map((p) => p.id).sort();

    await store.getState().relinkProject('proj_a');

    expect(store.getState().error).toMatch(/Re-link failed: PATH_REJECTED/);
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().projects.map((p) => p.id).sort()).toEqual(idsBefore);
    expect(store.getState().activeProjectId).toBe('proj_a');
  });

  it('openProjectPath on an archived existing project unarchives it without any picker and clears loading', async () => {
    const archived = { ...createCodeProject('proj_a', 'Repo A', repoA), archived: true };
    await dataService.projects.save(archived);
    await store.getState().loadProjects();
    store.setState({ isLoading: true });

    await store.getState().openProjectPath(repoA, 'Repo A');

    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().activeProjectId).toBe('proj_a');
    const persisted = await dataService.projects.get('proj_a');
    expect(persisted?.archived).toBe(false);
    expect(perform).not.toHaveBeenCalled();
  });

  it('reconcileProjects keeps an active duplicate visible even when the older record of the path is archived', () => {
    const older = {
      ...createCodeProject('proj_old', 'CRON for Claims', repoB),
      archived: true,
      createdAt: 100,
    };
    const newer = { ...createCodeProject('proj_new', 'CRON for Claims', repoB), createdAt: 200 };
    const reconciliation = reconcileProjects([older, newer], null);
    const visible = reconciliation.projects.filter((p) => !p.archived);
    expect(visible.map((p) => p.id)).toEqual(['proj_new']);
    expect(reconciliation.projects.map((p) => p.id)).toEqual(['proj_new']);
  });

  it('restoreLastActiveProject falls back to the next available project when the last active is archived', async () => {
    const archived = { ...createCodeProject('proj_meds', 'CRON for Meds', repoA), archived: true };
    const available = createCodeProject('proj_claims', 'CRON for Claims', repoB);
    await dataService.projects.save(archived);
    await dataService.projects.save(available);
    await dataService.preferences.set('lastActiveProjectId', 'proj_meds');
    const freshStore = createWorkspaceStore({ dataService, hostAdapter });
    await freshStore.getState().loadProjects();
    await freshStore.getState().restoreLastActiveProject();

    expect(freshStore.getState().activeProjectId).toBe('proj_claims');
    expect(freshStore.getState().projects.map((p) => p.id).sort()).toEqual(['proj_claims', 'proj_meds']);
    expect(await dataService.preferences.get('lastActiveProjectId')).toBe('proj_claims');
  });

  it('restoreLastActiveProject with no available project clears the preference without corrupting the list', async () => {
    const archived = { ...createCodeProject('proj_meds', 'CRON for Meds', repoA), archived: true };
    await dataService.projects.save(archived);
    await dataService.preferences.set('lastActiveProjectId', 'proj_meds');
    const freshStore = createWorkspaceStore({ dataService, hostAdapter });
    await freshStore.getState().loadProjects();
    await freshStore.getState().restoreLastActiveProject();

    expect(freshStore.getState().activeProjectId).toBeNull();
    expect(freshStore.getState().projects.map((p) => p.id)).toEqual(['proj_meds']);
    expect(await dataService.preferences.get('lastActiveProjectId')).toBe('');
  });
});

