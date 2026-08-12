import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { EmptyState } from './components/EmptyState.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { createJsonDataService } from '@cron-code/data-service';
import { createStandaloneHostAdapter } from '@cron-code/host-adapter';
import { createCodeProject } from '@cron-code/contracts';

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
  writeFileSync(join(dir, 'README.md'), 'picker test repo\n');
}

/** Replicates the repaired App `onSelectProject` handler exactly. */
async function onSelectProject(store: ReturnType<typeof createWorkspaceStore>, hostAdapter: { selectProject: () => Promise<{ rootPath: string; name: string } | null> }) {
  try {
    const selection = await hostAdapter.selectProject();
    if (selection) {
      await store.getState().openProjectPath(selection.rootPath, selection.name);
    }
    return selection;
  } catch (err) {
    store.getState().setError(err instanceof Error ? err.message : 'Project selection failed');
    return null;
  }
}

describe('project picker load flow (real data-service + real host adapter)', () => {
  let tmp: string;
  let repoA: string;
  let repoB: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cron-picker-test-'));
    repoA = join(tmp, 'CRON for Meds');
    repoB = join(tmp, 'Repo B');
    makeGitRepo(repoA);
    makeGitRepo(repoB);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('activates a valid new selection immediately and persists it', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => repoA });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await onSelectProject(store, hostAdapter);

    expect(store.getState().activeProjectId).not.toBeNull();
    expect(store.getState().projects).toHaveLength(1);
    expect(store.getState().projects[0].rootPath).toBe(repoA);
    expect(store.getState().error).toBeNull();
    expect((await dataService.projects.list()).length).toBe(1);

    // Reopening the same store persists + reloads correctly.
    await dataService.destroy();
    const reloaded = createJsonDataService({ storagePath: join(tmp, 'store') });
    await reloaded.initialize();
    expect((await reloaded.projects.list()).length).toBe(1);
    await reloaded.destroy();
  });

  it('dedupes the same folder across case / slash style / trailing slash', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await store.getState().openProjectPath('C:/Repos/A', 'A');
    await store.getState().openProjectPath('c:\\repos\\a\\', 'A');
    await store.getState().openProjectPath('C:/repos/a', 'A');

    expect(store.getState().projects).toHaveLength(1);
    expect((await dataService.projects.list()).length).toBe(1);
    expect(store.getState().activeProjectId).toBe(store.getState().projects[0].id);
  });

  it('reusing a persisted folder re-activates the canonical project without a duplicate', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => repoA });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await onSelectProject(store, hostAdapter);
    const firstId = store.getState().activeProjectId;
    await onSelectProject(store, hostAdapter);

    expect(store.getState().projects).toHaveLength(1);
    expect(store.getState().activeProjectId).toBe(firstId);
    expect((await dataService.projects.list()).length).toBe(1);
  });

  it('switching to another valid folder loads and activates it', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    let picker = repoA;
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => picker });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await onSelectProject(store, hostAdapter);
    picker = repoB;
    await onSelectProject(store, hostAdapter);

    expect(store.getState().projects).toHaveLength(2);
    expect(store.getState().activeProjectId).toBe(
      store.getState().projects.find((p) => p.rootPath === repoB)?.id,
    );
  });

  it('cancelled picker is a safe no-op', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    const selection = await onSelectProject(store, hostAdapter);

    expect(selection).toBeNull();
    expect(store.getState().activeProjectId).toBeNull();
    expect(store.getState().projects).toHaveLength(0);
    expect(store.getState().error).toBeNull();
  });

  it('surfaces a visible error when the picker fails', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({
      selectFolder: async () => {
        throw new Error('picker exploded');
      },
    });
    const store = createWorkspaceStore({ dataService, hostAdapter });

    const selection = await onSelectProject(store, hostAdapter);

    expect(selection).toBeNull();
    expect(store.getState().error).toBe('picker exploded');
    expect(store.getState().activeProjectId).toBeNull();
  });
});

describe('project picker component integration', () => {
  it('EmptyState Open Project button invokes the select handler', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-open-' + Date.now()) });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const handler = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<EmptyState onSelectProject={handler} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Open Project/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('entry screen shows resume cards for known available projects', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-entry-' + Date.now()) });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const repo = join(tmpdir(), 'cron-entry-repo-' + Date.now());
    makeGitRepo(repo);
    await store.getState().openProjectPath(repo, 'Entry Repo');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<EmptyState onSelectProject={vi.fn()} />, { wrapper });

    expect(screen.getByText('Resume a project')).toBeTruthy();
    expect(screen.getByText('Entry Repo')).toBeTruthy();
    expect(screen.getByText(repo)).toBeTruthy();
  });

  it('entry screen resume card enters the working canvas (selects the project)', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-resume-' + Date.now()) });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const repo = join(tmpdir(), 'cron-resume-repo-' + Date.now());
    makeGitRepo(repo);
    // Persist + load WITHOUT activating (openProjectPath activates immediately;
    // launch-time state must be the entry screen, active project null).
    await dataService.projects.save(createCodeProject('proj_entry', 'Resume Repo', repo));
    await store.getState().loadProjects();
    expect(store.getState().activeProjectId).toBeNull();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<EmptyState onSelectProject={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Resume Repo/ }));

    await waitFor(() => expect(store.getState().activeProjectId).not.toBeNull());
    expect(store.getState().projects.find((p) => p.id === store.getState().activeProjectId)?.name).toBe('Resume Repo');
  });

  it('launch does not auto-enter the canvas (active project stays null after load)', async () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-launch-' + Date.now()) });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    const repo = join(tmpdir(), 'cron-launch-repo-' + Date.now());
    makeGitRepo(repo);
    await store.getState().openProjectPath(repo, 'Launch Repo');
    await store.getState().selectProject(store.getState().projects[0].id);
    expect(store.getState().activeProjectId).not.toBeNull();
    const lastActive = await dataService.preferences.get('lastActiveProjectId');
    expect(lastActive).toBe(store.getState().projects[0].id);

    // Fresh launch: App init runs loadProjects only (no restoreLastActiveProject).
    const fresh = createWorkspaceStore({ dataService, hostAdapter });
    await fresh.getState().loadProjects();
    expect(fresh.getState().activeProjectId).toBeNull();
    expect(fresh.getState().projects.length).toBeGreaterThan(0);
  });

  it('ErrorBanner renders a store error visibly and dismisses it', () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-banner-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    store.getState().setError('picker exploded');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<ErrorBanner />, { wrapper });

    expect(screen.getByTestId('status-banner')).toBeTruthy();
    expect(screen.getByText('picker exploded')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(screen.queryByTestId('status-banner')).toBeNull();
  });

  it('ErrorBanner shows a loading note while a project opens', () => {
    const dataService = createJsonDataService({ storagePath: join(tmpdir(), 'cron-banner2-' + Date.now()) });
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => null });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    store.setState({ isLoading: true });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<ErrorBanner />, { wrapper });
    expect(screen.getByText(/Loading project/)).toBeTruthy();
  });

  it('keeps persisted project records across a fresh store on the same storage', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'cron-persist-test-'));
    const repo = join(tmp, 'Repo');
    makeGitRepo(repo);
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    await dataService.initialize();
    const hostAdapter = createStandaloneHostAdapter({ selectFolder: async () => repo });
    const store = createWorkspaceStore({ dataService, hostAdapter });
    await onSelectProject(store, hostAdapter);
    await dataService.destroy();

    const reloaded = createJsonDataService({ storagePath: join(tmp, 'store') });
    await reloaded.initialize();
    const projects = await reloaded.projects.list();
    expect(projects).toHaveLength(1);
    expect(projects[0].rootPath).toBe(repo);
    // No duplicate is created on reload.
    const store2 = createWorkspaceStore({ dataService: reloaded, hostAdapter });
    await store2.getState().loadProjects();
    expect(store2.getState().projects).toHaveLength(1);
    await reloaded.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });
});
