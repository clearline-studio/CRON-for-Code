import { useState, type FormEvent } from 'react';
import { ClipboardList } from 'lucide-react';
import { useWorkspaceStoreRaw } from '../context.js';

export function TaskComposer() {
  const raw = useWorkspaceStoreRaw();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const p = prompt.trim();
    if (!p) return;
    raw.getState().createDraftTask(t || 'Untitled', p);
    setTitle('');
    setPrompt('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={formStyle}
      data-testid="task-composer"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (optional)"
        aria-label="Task title (optional)"
        style={fieldStyle}
      />
      <div style={rowStyle}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your task..."
          aria-label="Task description"
          rows={2}
          style={{ ...fieldStyle, resize: 'vertical' as const, flex: 1, padding: '8px 10px', marginBottom: 0 }}
        />
        <button type="submit" disabled={!prompt.trim()} style={createBtnStyle} title="Create a new task draft">
          <ClipboardList size={15} />
          Create Task
        </button>
      </div>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  borderTop: '1px solid var(--cron-surface-border)',
  background: 'rgba(4, 16, 36, 0.94)',
  padding: 'var(--cron-space-md)',
  fontFamily: 'var(--cron-font-family)',
  flexShrink: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--cron-space-sm)',
  alignItems: 'flex-end',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--cron-surface-border)',
  borderRadius: 5,
  padding: '6px 10px',
  fontSize: 'var(--cron-font-size-md)',
  marginBottom: 'var(--cron-space-sm)',
  background: 'var(--cron-surface-bg)',
  color: 'var(--cron-text-primary)',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
  outline: 'none',
};

const createBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 16px',
  background: 'var(--cron-accent)',
  color: 'var(--cron-text-inverse)',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  opacity: 1,
  fontFamily: 'var(--cron-font-family)',
  fontSize: 'var(--cron-font-size-md)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 18px rgba(59, 130, 246, 0.28)',
};
