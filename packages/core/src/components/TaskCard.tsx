import type { Task } from '@cron-code/contracts';
import { useWorkspaceStoreRaw } from '../context.js';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const raw = useWorkspaceStoreRaw();

  return (
    <div
      onClick={() => raw.getState().selectTask(task.id)}
      style={{
        padding: 'var(--cron-space-md)',
        border: '1px solid var(--cron-surface-border)',
        borderRadius: 'var(--cron-border-radius-md)',
        marginBottom: 'var(--cron-space-sm)',
        cursor: 'pointer',
        background:
          raw.getState().selectedTaskId === task.id
            ? 'var(--cron-accent-subtle)'
            : 'var(--cron-surface-secondary)',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ fontSize: 'var(--cron-font-size-md)', fontWeight: 500, marginBottom: 4 }}>
        {task.title || 'Untitled Task'}
      </div>
      <div
        style={{
          fontSize: 'var(--cron-font-size-sm)',
          color: 'var(--cron-text-tertiary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {task.prompt.substring(0, 100)}
      </div>
      <div
        style={{
          fontSize: 'var(--cron-font-size-xs)',
          color: 'var(--cron-text-tertiary)',
          marginTop: 'var(--cron-space-xs)',
        }}
      >
        {task.status} · {new Date(task.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
