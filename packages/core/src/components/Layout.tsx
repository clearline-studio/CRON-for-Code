import { type ReactNode } from 'react';
import { useWorkspaceStore } from '../context.js';
import { CronHeader } from './CronHeader.js';
import { WorkflowStrip } from './WorkflowStrip.js';
import { CronAssistant } from './CronAssistant.js';
import { CronFooter } from './CronFooter.js';
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
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--cron-app-bg)',
    }}>
      <CronHeader />
      <WorkflowStrip />
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--cron-app-bg)',
        backgroundImage: 'var(--cron-shell-bg-image)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(5, 8, 18, 0.78), rgba(5, 8, 18, 0.84))',
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', overflow: 'hidden' }}>
          <Sidebar onSelectProject={onSelectProject} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
            {activeProjectId ? <ActiveLayout /> : <EmptyState onSelectProject={onSelectProject} />}
          </div>
          <CronAssistant />
        </div>
      </div>
      <CronFooter />
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
