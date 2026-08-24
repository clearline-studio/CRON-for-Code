import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { RestartOverlay } from './components/RestartOverlay.js';
import { CronCodeApp } from './components/App.js';
import { createJsonDataService } from '@cron-code/data-service';
import { createMockHostAdapter } from '@cron-code/host-adapter';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

afterEach(cleanup);

function makeDataService() {
  return {
    listCommands: vi.fn().mockResolvedValue([]),
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
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
  } as never;
}

function renderOverlay(store: ReturnType<typeof createWorkspaceStore>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
  );
  return render(<RestartOverlay />, { wrapper });
}

describe('RestartOverlay', () => {
  it('renders nothing when the app is not restarting', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    renderOverlay(store);
    expect(screen.queryByTestId('restart-overlay')).toBeNull();
  });

  it('shows the Claims-style restart screen while restarting', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    store.setState({ isRestarting: true });
    renderOverlay(store);

    const overlay = screen.getByTestId('restart-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('CRON SYSTEM CONTROL')).toBeTruthy();
    expect(screen.getByText('Restarting')).toBeTruthy();
    expect(screen.getByText(/Stopping and restarting CRON services/)).toBeTruthy();
    expect(screen.getByText(/return to the project selection screen/)).toBeTruthy();
  });

  it('holds the restarting state after a successful restart request (overlay stays painted)', async () => {
    const dataService = makeDataService();
    const restart = vi.fn().mockResolvedValue(undefined);
    const hostAdapter = { restartApp: restart } as never;
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await store.getState().restartApp();

    expect(restart).toHaveBeenCalledTimes(1);
    expect(store.getState().isRestarting).toBe(true);
    expect(store.getState().error).toBeNull();
  });

  it('clears the restarting state with a visible error when the restart request fails', async () => {
    const dataService = makeDataService();
    const restart = vi.fn().mockRejectedValue(new Error('restart refused'));
    const hostAdapter = { restartApp: restart } as never;
    const store = createWorkspaceStore({ dataService, hostAdapter });

    await store.getState().restartApp();

    expect(store.getState().isRestarting).toBe(false);
    expect(store.getState().error).toMatch(/restart refused/);
  });

  it('lingers after a restart handoff until the renderer is ready (preparing prop, same panel as restarting)', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
    );
    render(<RestartOverlay preparing />, { wrapper });

    expect(screen.getByTestId('restart-overlay')).toBeTruthy();
    expect(screen.getByText('CRON SYSTEM CONTROL')).toBeTruthy();
    expect(screen.getByText('Restarting')).toBeTruthy();
    expect(screen.getByText(/Stopping and restarting CRON services/)).toBeTruthy();
    expect(screen.getByText(/return to the project selection screen/)).toBeTruthy();
  });

  it('covers the relaunch gap on a restart-handoff launch and lingers until ready (not a flash)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'cron-linger-'));
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    const hostAdapter = createMockHostAdapter();
    render(<CronCodeApp deps={{ dataService, hostAdapter, startupRestartHandoff: true }} />);

    // From first paint the overlay is visible (covers the relaunch gap).
    expect(screen.getByTestId('restart-overlay')).toBeTruthy();

    // Once the app finished loading (Home screen ready UNDER the overlay),
    // the overlay must still be present: it lingers a minimum perceivable time
    // instead of flashing away the instant readiness is reached.
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
    expect(screen.getByTestId('restart-overlay')).toBeTruthy();

    // After the linger floor elapses, the overlay fades out (aria-hidden) and
    // the entry screen is revealed - no sudden snap-away.
    await waitFor(() => expect(screen.getByTestId('restart-overlay').getAttribute('aria-hidden')).toBe('true'), {
      timeout: 5000,
    });

    await dataService.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('does not linger on a normal (non-handoff) launch', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'cron-linger2-'));
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    const hostAdapter = createMockHostAdapter();
    render(<CronCodeApp deps={{ dataService, hostAdapter }} />);

    expect(screen.queryByTestId('restart-overlay')).toBeNull();

    await dataService.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });
});
