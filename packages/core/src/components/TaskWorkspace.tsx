import { useState, type CSSProperties } from 'react';
import { Play, Square, ListChecks, ClipboardList, FolderGit2, FileText } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { TaskCard } from './TaskCard.js';

export function TaskWorkspace() {
  const tasks = useWorkspaceStore((s) => s.tasks);

  return (
    <div style={workspaceStyle} data-testid="task-workspace">
      <div style={listStyle}>
        <div style={barStyle}>
          <span style={titleStyle}>
            <ListChecks size={13} />
            Tasks ({tasks.length})
          </span>
        </div>
        {tasks.length === 0 ? (
          <div style={emptyStateWrapStyle}>
            <ClipboardList size={28} style={emptyIconStyle} />
            <div style={emptyTitleStyle}>No tasks yet</div>
            <div style={emptyDescStyle}>Describe a task below to plan and execute code changes.</div>
            <div style={emptyHintsStyle}>
              <div style={emptyHintItemStyle}>
                <FolderGit2 size={12} />
                <span>Check changed files in the review panel below</span>
              </div>
              <div style={emptyHintItemStyle}>
                <FileText size={12} />
                <span>Create a task to run safe commands on your project</span>
              </div>
            </div>
          </div>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} taskId={task.id} />)
        )}
      </div>
    </div>
  );
}

function TaskRow({ taskId }: { taskId: string }) {
  const task = useWorkspaceStore((s) => s.tasks.find((t) => t.id === taskId));
  const executions = useWorkspaceStore((s) => s.executions);
  const commands = useWorkspaceStore((s) => s.commands);
  const raw = useWorkspaceStoreRaw();
  const [running, setRunning] = useState(false);
  const [commandId, setCommandId] = useState('repo.status');

  if (!task) return null;

  const taskExecutions = executions
    .filter((e) => e.taskId === task.id)
    .sort((a, b) => b.startedAt - a.startedAt);
  const activeExecution = taskExecutions.find((e) => e.status === 'running');
  const lastExecution = taskExecutions[0];

  function doRun() {
    setRunning(true);
    void raw
      .getState()
      .runTaskNow(taskId, commandId)
      .finally(() => setRunning(false));
  }

  function doQueue() {
    setRunning(true);
    void raw
      .getState()
      .queueDraftTask(taskId)
      .finally(() => setRunning(false));
  }

  const canRun = ['draft', 'queued', 'approval_required', 'failed'].includes(task.status);

  return (
    <div style={rowWrapStyle}>
      <TaskCard task={task} />
      <div style={actionsStyle}>
        <label style={commandLabelStyle} title="Safe command to run for this task">
          <span style={commandLabelTextStyle}>Run</span>
          <select
            value={commandId}
            onChange={(e) => setCommandId(e.target.value)}
            aria-label={`Safe command for task ${task.title || 'untitled'}`}
            style={selectStyle}
          >
            {commands.length === 0 && <option value="repo.status">repo.status</option>}
            {commands.map((command) => (
              <option key={command.id} value={command.id}>
                {command.displayCommand}
              </option>
            ))}
          </select>
        </label>
        {canRun && (
          <button type="button" onClick={doRun} disabled={running} style={runBtnStyle}>
            <Play size={11} /> {running ? 'Working…' : 'Run'}
          </button>
        )}
        {task.status === 'draft' && (
          <button type="button" onClick={doQueue} disabled={running} style={queueBtnStyle}>
            Queue
          </button>
        )}
        {activeExecution && (
          <button
            type="button"
            onClick={() => raw.getState().cancelExecution(activeExecution.id)}
            style={cancelBtnStyle}
          >
            <Square size={10} /> Cancel
          </button>
        )}
        {task.status === 'approval_required' && (
          <span style={awaitNoteStyle}>Awaiting approval</span>
        )}
        {lastExecution && lastExecution.exitCode !== null && (
          <span style={exitNoteStyle(lastExecution.exitCode)}>exit {lastExecution.exitCode}</span>
        )}
      </div>
    </div>
  );
}

const workspaceStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(6, 20, 42, 0.92)',
  color: 'var(--cron-text-primary)',
  fontFamily: 'var(--cron-font-family)',
  borderBottom: '1px solid var(--cron-surface-border)',
  overflow: 'hidden',
};

const listStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 'var(--cron-space-sm) var(--cron-space-md)',
};

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '4px 0 8px',
};

const titleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--cron-text-secondary)',
  fontSize: 'var(--cron-font-size-sm)',
  fontWeight: 700,
};

const emptyStateWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '36px 24px',
  textAlign: 'center',
  gap: 10,
  minHeight: 200,
};

const emptyIconStyle: CSSProperties = {
  opacity: 0.3,
  color: '#5f7392',
};

const emptyTitleStyle: CSSProperties = {
  color: '#8da4c7',
  fontSize: 'var(--cron-font-size-md)',
  fontWeight: 600,
};

const emptyDescStyle: CSSProperties = {
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-sm)',
  maxWidth: 320,
  lineHeight: 'var(--cron-line-height)',
};

const emptyHintsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 8,
};

const emptyHintItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#5f7392',
  fontSize: 'var(--cron-font-size-xs)',
};

const rowWrapStyle: CSSProperties = {
  marginBottom: 'var(--cron-space-sm)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '2px 0 4px',
};

const commandLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const commandLabelTextStyle: CSSProperties = {
  color: 'var(--cron-text-tertiary)',
  fontSize: 'var(--cron-font-size-xs)',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
};

const selectStyle: CSSProperties = {
  background: 'var(--cron-surface-bg)',
  color: 'var(--cron-text-primary)',
  border: '1px solid var(--cron-surface-border)',
  borderRadius: 4,
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-mono)',
  padding: '4px 6px',
  maxWidth: 260,
};

const runBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  border: '1px solid rgba(59, 130, 246, 0.5)',
  background: 'rgba(30, 64, 175, 0.4)',
  color: '#93c5fd',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const queueBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  border: '1px solid rgba(100, 160, 255, 0.3)',
  background: 'transparent',
  color: '#b7cdf0',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const cancelBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  border: '1px solid rgba(239, 68, 68, 0.5)',
  background: 'rgba(127, 29, 29, 0.3)',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 600,
};

const awaitNoteStyle: CSSProperties = {
  color: '#f59e0b',
  fontSize: 'var(--cron-font-size-xs)',
};

const exitNoteStyle = (exitCode: number): CSSProperties => ({
  color: exitCode === 0 ? '#22c55e' : '#ef4444',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-mono)',
});
