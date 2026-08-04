import { useWorkspaceStore } from '../context.js';
import { TaskCard } from './TaskCard.js';

export function TaskWorkspace() {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--cron-surface-bg)',
        color: 'var(--cron-text-primary)',
        fontFamily: 'var(--cron-font-family)',
      }}
    >
      {selectedTask ? (
        <div style={{ padding: 'var(--cron-space-lg)' }}>
          <h2
            style={{
              fontSize: 'var(--cron-font-size-xl)',
              margin: 0,
              marginBottom: 'var(--cron-space-sm)',
            }}
          >
            {selectedTask.title}
          </h2>
          <div
            style={{
              fontSize: 'var(--cron-font-size-sm)',
              color: 'var(--cron-text-tertiary)',
              marginBottom: 'var(--cron-space-md)',
            }}
          >
            Status:{' '}
            <StatusBadge status={selectedTask.status} />
          </div>
          {selectedTask.error && (
            <div
              style={{
                background: '#fff1f0',
                border: '1px solid #ffa39e',
                borderRadius: 'var(--cron-border-radius-sm)',
                padding: 'var(--cron-space-md)',
                marginBottom: 'var(--cron-space-md)',
                color: '#cf1322',
                fontSize: 'var(--cron-font-size-md)',
              }}
            >
              {selectedTask.error}
            </div>
          )}
          <div
            style={{
              background: 'var(--cron-surface-secondary)',
              border: '1px solid var(--cron-surface-border)',
              borderRadius: 'var(--cron-border-radius-md)',
              padding: 'var(--cron-space-md)',
              fontFamily: 'var(--cron-font-mono)',
              fontSize: 'var(--cron-font-size-sm)',
              whiteSpace: 'pre-wrap',
              lineHeight: 'var(--cron-line-height)',
            }}
          >
            {selectedTask.prompt}
          </div>
          <div
            style={{
              fontSize: 'var(--cron-font-size-xs)',
              color: 'var(--cron-text-tertiary)',
              marginTop: 'var(--cron-space-md)',
            }}
          >
            Created {new Date(selectedTask.createdAt).toLocaleString()}
          </div>
        </div>
      ) : tasks.length > 0 ? (
        <div style={{ padding: 'var(--cron-space-lg)' }}>
          <h3
            style={{
              fontSize: 'var(--cron-font-size-lg)',
              color: 'var(--cron-text-secondary)',
              marginBottom: 'var(--cron-space-md)',
            }}
          >
            Tasks ({tasks.length})
          </h3>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--cron-text-tertiary)',
            fontSize: 'var(--cron-font-size-lg)',
          }}
        >
          No tasks yet. Create one below.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'var(--cron-status-draft)',
    queued: 'var(--cron-status-warning)',
    running: 'var(--cron-status-running)',
    completed: 'var(--cron-status-completed)',
    failed: 'var(--cron-status-error)',
    cancelled: 'var(--cron-text-tertiary)',
  };

  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 'var(--cron-border-radius-sm)',
        background: (colors[status] ?? 'var(--cron-text-tertiary)') + '22',
        color: colors[status] ?? 'var(--cron-text-tertiary)',
        fontWeight: 500,
        fontSize: 'var(--cron-font-size-xs)',
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  );
}
