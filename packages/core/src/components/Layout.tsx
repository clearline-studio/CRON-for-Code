import { type ReactNode } from 'react';
import { useWorkspaceStore } from '../context.js';
import { Sidebar } from './Sidebar.js';
import { ProjectArea } from './ProjectArea.js';
import { TaskWorkspace } from './TaskWorkspace.js';
import { TaskComposer } from './TaskComposer.js';
import { EmptyState } from './EmptyState.js';

interface LayoutProps {
  onSelectProject: () => void;
}

export function Layout({ onSelectProject }: LayoutProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--cron-shell-bg)',
      backgroundImage: 'var(--cron-shell-bg-image)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(13, 17, 23, 0.82), rgba(13, 17, 23, 0.88))',
        zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%' }}>
        <Sidebar onSelectProject={onSelectProject} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeProjectId ? <ActiveLayout /> : <EmptyState onSelectProject={onSelectProject} />}
        </div>
      </div>
    </div>
  );
}

function ActiveLayout(): ReactNode {
  return (
    <>
      <ProjectArea />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TaskWorkspace />
        <TaskComposer />
      </div>
    </>
  );
}
