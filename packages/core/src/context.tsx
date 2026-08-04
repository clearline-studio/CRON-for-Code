import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { WorkspaceStoreApi, WorkspaceStoreType } from './store.js';

export const WorkspaceStoreContext = createContext<WorkspaceStoreApi | null>(null);

export function useWorkspaceStore<T>(selector: (state: WorkspaceStoreType) => T): T {
  const store = useContext(WorkspaceStoreContext);
  if (!store) throw new Error('Missing WorkspaceStoreContext.Provider');
  return useStore(store, selector);
}

export function useWorkspaceStoreRaw(): WorkspaceStoreApi {
  const store = useContext(WorkspaceStoreContext);
  if (!store) throw new Error('Missing WorkspaceStoreContext.Provider');
  return store;
}

export function WorkspaceProvider(props: {
  store: WorkspaceStoreApi;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceStoreContext.Provider value={props.store}>
      {props.children}
    </WorkspaceStoreContext.Provider>
  );
}
