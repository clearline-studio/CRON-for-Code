import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { createWorkspaceStore } from './store.js';
import { WorkspaceProvider } from './context.js';
import { CronFooter } from './components/CronFooter.js';
import { PickerModal } from './components/PickerModal.js';
import { CronAssistant } from './components/CronAssistant.js';
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

function renderWithStore(ui: ReactNode, store: ReturnType<typeof createWorkspaceStore>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WorkspaceProvider store={store}>{children}</WorkspaceProvider>
  );
  return render(ui, { wrapper });
}

describe('footer placeholder tabs are truthfully DEV marked', () => {
  it('shows a red DEV badge on every placeholder tab', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    renderWithStore(<CronFooter />, store);
    for (const tab of ['PowerShell', 'Git', 'Tests', 'Build', 'Verification', 'Logs']) {
      expect(screen.getByText(tab)).toBeTruthy();
      expect(screen.getByLabelText(`${tab} not implemented`)).toBeTruthy();
    }
  });
});

describe('CRON-styled picker flow', () => {
  it('shows the picker modal while the folder picker flow is active', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    store.setState({ pickerActive: true });
    renderWithStore(<PickerModal />, store);
    expect(screen.getByTestId('picker-modal')).toBeTruthy();
    expect(screen.getByText('PROJECT PICKER')).toBeTruthy();
    expect(screen.getByText(/Choosing your project folder/)).toBeTruthy();
  });

  it('hides the picker modal when the flow is not active', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    renderWithStore(<PickerModal />, store);
    expect(screen.queryByTestId('picker-modal')).toBeNull();
  });

  it('wraps the native picker in the app flow (modal shown while selecting)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'cron-picker-flow-'));
    const dataService = createJsonDataService({ storagePath: join(tmp, 'store') });
    let releaseSelection: (value: { rootPath: string; name: string } | null) => void = () => {};
    let pickerInvoked = false;
    const hostAdapter = createMockHostAdapter();
    hostAdapter.selectProject = () =>
      new Promise((resolve) => {
        pickerInvoked = true;
        releaseSelection = resolve;
      });
    render(<CronCodeApp deps={{ dataService, hostAdapter }} />);

    // The Home screen is the "no project selected" entry view; its hero Build
    // button runs the existing New-Project picker flow.
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
    screen.getByRole('button', { name: 'Build' }).click();

    // While the (native) picker is in flight, the CRON modal is visible.
    await waitFor(() => expect(screen.getByTestId('picker-modal')).toBeTruthy());
    await waitFor(() => expect(pickerInvoked).toBe(true));

    releaseSelection(null); // user cancels the native dialog
    await waitFor(() => expect(screen.queryByTestId('picker-modal')).toBeNull());

    await dataService.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe('assistant Model control is wired', () => {
  it('is a real button that opens the model configuration', () => {
    const store = createWorkspaceStore({ dataService: makeDataService(), hostAdapter: {} as never });
    const onConfigureModel = vi.fn();
    renderWithStore(
      <CronAssistant config={null} onConfigureModel={onConfigureModel} />,
      store,
    );
    const selector = screen.getByTestId('assistant-model-selector');
    expect(selector.tagName).toBe('BUTTON');
    selector.click();
    expect(onConfigureModel).toHaveBeenCalledTimes(1);
  });
});
