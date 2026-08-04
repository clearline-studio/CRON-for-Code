import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
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
      style={{
        borderTop: '1px solid var(--cron-surface-border)',
        background: 'var(--cron-panel-bg)',
        padding: 'var(--cron-space-md)',
        fontFamily: 'var(--cron-font-family)',
        flexShrink: 0,
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (optional)"
        style={fieldStyle}
      />
      <div style={{ display: 'flex', gap: 'var(--cron-space-sm)' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your task..."
          rows={3}
          style={{ ...fieldStyle, resize: 'vertical' as const, flex: 1, padding: '8px 10px' }}
        />
        <button type="submit" disabled={!prompt.trim()} style={draftBtnStyle}>
          <Send size={14} />
          Draft
        </button>
      </div>
    </form>
  );
}

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

const draftBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  padding: '6px 14px',
  background: 'var(--cron-accent)',
  color: 'var(--cron-text-inverse)',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  opacity: 1,
  fontFamily: 'var(--cron-font-family)',
  fontSize: 'var(--cron-font-size-md)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontWeight: 500,
};
