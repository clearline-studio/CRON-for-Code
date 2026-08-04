import { useEffect, useState } from 'react';
import { createCodeProject } from '@cron-code/contracts';
import type { DataService } from '@cron-code/data-service';
import type { HostAdapter } from '@cron-code/host-adapter';
import { createWorkspaceStore } from '../store.js';
import { WorkspaceProvider, useWorkspaceStoreRaw } from '../context.js';
import { Layout } from './Layout.js';

export interface AppDeps {
  dataService: DataService;
  hostAdapter: HostAdapter;
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

  useEffect(() => {
    void (async () => {
      await deps.dataService.initialize();
      await raw.getState().loadProjects();
    })();

    return () => {
      void deps.dataService.destroy();
    };
  }, []);

  useEffect(() => {
    const unsub = hostAdapter.onEvent((type, data) => {
      if (type === 'project-selected' && data) {
        void (async () => {
          const sel = data as { rootPath: string; name: string };
          const id = `proj_${Date.now()}`;
          const project = createCodeProject(id, sel.name, sel.rootPath);
          await raw.getState().addProject(project);
        })();
      }
    });
    return unsub;
  }, [hostAdapter]);

  return (
    <Layout
      onSelectProject={() => {
        void (async () => {
          await hostAdapter.selectProject();
        })();
      }}
    />
  );
}
