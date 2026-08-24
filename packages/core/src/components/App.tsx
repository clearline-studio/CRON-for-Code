import { useEffect, useRef, useState } from 'react';
import type { DataService } from '@cron-code/data-service';
import type { HostAdapter } from '@cron-code/host-adapter';
import { createWorkspaceStore } from '../store.js';
import { WorkspaceProvider, useWorkspaceStoreRaw } from '../context.js';
import { Layout } from './Layout.js';
import type { LlmClient } from '../llm.js';
import type { OpenCodeRunnerClient } from '../opencode-client.js';
import type { TrayClient } from '../tray.js';
import type { FolderPickerBridge } from '../folder-picker.js';

// The post-restart Restarting overlay must be perceivable: even when init is
// fast, it stays up for at least this long so the transition never reads as a
// flash. Conservative ~3s floor (design polish); the overlay only clears once
// the app is ALSO ready.
const RESTART_LINGER_MIN_MS = 3000;

export interface AppDeps {
  dataService: DataService;
  hostAdapter: HostAdapter;
  llm?: LlmClient;
  openCodeRunner?: OpenCodeRunnerClient;
  /** Tray menu events from the host (window focus is handled host-side). */
  tray?: TrayClient;
  /** CRON-styled folder browser bridge. When omitted the modal falls back to a
   *  host-unavailable notice instead of opening a raw OS dialog. */
  folderPicker?: FolderPickerBridge;
  /** True when this instance was relaunched by dev.mjs after an in-app restart.
   *  Keeps the Restarting overlay visible from first paint until the app is ready. */
  startupRestartHandoff?: boolean;
  /** Fired once the entry screen is usable (data hydrated, no blocking waits). */
  onUsable?: () => void;
}

export function CronCodeApp({ deps }: { deps: AppDeps }) {
  const [store] = useState(() => createWorkspaceStore(deps));

  return (
    <WorkspaceProvider store={store}>
      <AppInner deps={deps} />
    </WorkspaceProvider>
  );
}

function AppInner({ deps }: { deps: AppDeps }) {
  const raw = useWorkspaceStoreRaw();
  const { hostAdapter } = deps;
  const [restartHandoff, setRestartHandoff] = useState(!!deps.startupRestartHandoff);
  const lingerFloorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handoffMountedAt = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    if (deps.startupRestartHandoff && handoffMountedAt.current === 0) {
      // The overlay rendered in this commit; the linger floor is measured from
      // here so the Restarting screen is perceivable, not a flash.
      handoffMountedAt.current = Date.now();
    }
    void (async () => {
      try {
        await deps.dataService.initialize();
        if (cancelled) return;
        await raw.getState().loadCommands();
        if (cancelled) return;
        await raw.getState().loadProjects();
        if (cancelled) return;
        // Deliberately NO auto-restore of the last-active project here: launch
        // lands on the entry/project-selection screen, and the working canvas
        // appears only after the user explicitly opens or resumes a project.
      } catch (err) {
        if (cancelled) return;
        // A failed init (e.g. a stale main process without the current IPC
        // handlers) must be visible, never silent.
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'CRON for Code started with an incomplete host connection. Restart the dev app.';
        raw.getState().setError(message);
      } finally {
        // The app is now ready (entry screen or a visible error). Report the
        // usable-moment so the main process can record entry-screen latency.
        if (!cancelled) {
          deps.onUsable?.();
        }
        // Drop the restart-handoff overlay only after the minimum linger floor
        // has elapsed, so the Restarting screen is perceivable, not a flash.
        if (!cancelled) {
          const elapsed = Date.now() - handoffMountedAt.current;
          const remaining = RESTART_LINGER_MIN_MS - elapsed;
          if (remaining > 0) {
            lingerFloorTimer.current = setTimeout(() => {
              if (!cancelled) setRestartHandoff(false);
            }, remaining);
          } else {
            setRestartHandoff(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (lingerFloorTimer.current) clearTimeout(lingerFloorTimer.current);
      void deps.dataService.destroy();
    };
  }, []);

  useEffect(() => {
    const unsub = hostAdapter.onEvent((type, data) => {
      if (type === 'project-selected' && data) {
        const sel = data as { rootPath: string; name: string };
        void raw.getState().openProjectPath(sel.rootPath, sel.name);
      }
    });
    return unsub;
  }, [hostAdapter]);

  useEffect(() => {
    const tray = deps.tray;
    if (!tray) return;
    const unsubscribers = [
      tray.onShowTasks(() => raw.getState().trayShowTasks()),
      tray.onPauseTask(() => raw.getState().trayPauseTask()),
      tray.onStopTask(() => void raw.getState().trayStopTask()),
    ];
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [deps.tray]);

  return (
    <Layout
      dataService={deps.dataService}
      llm={deps.llm}
      openCodeRunner={deps.openCodeRunner}
      folderPicker={deps.folderPicker}
      preparing={restartHandoff}
      onSelectProject={() => {
        void (async () => {
          try {
            // CRON-styled picker flow: the dark-navy folder browser modal opens
            // immediately and stays open while `selectProject()` awaits the
            // user's choice, so the user is never dropped into raw Windows.
            raw.getState().setPickerActive(true);
            const selection = await hostAdapter.selectProject();
            if (selection) {
              // Use the authoritative returned selection directly so the open is
              // awaited and cannot be silently lost to async event timing.
              await raw.getState().openProjectPath(selection.rootPath, selection.name);
            }
          } catch (err) {
            raw
              .getState()
              .setError(err instanceof Error ? err.message : 'Project selection failed');
          } finally {
            raw.getState().setPickerActive(false);
          }
        })();
      }}
    />
  );
}
