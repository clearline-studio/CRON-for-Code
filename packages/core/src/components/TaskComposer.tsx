import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useWorkspaceStoreRaw } from '../context.js';

export function TaskComposer() {
  const raw = useWorkspaceStoreRaw();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    raw.getState().createDraftTask(trimmedTitle || 'Untitled', trimmedPrompt);
    setTitle('');
    setPrompt('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderTop: '1px solid var(--cron-surface-border)',
        background: 'var(--cron-surface-bg)',
        padding: 'var(--cron-space-md)',
        fontFamily: 'var(--cron-font-family)',
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (optional)"
        style={{
          width: '100%',
          border: '1px solid var(--cron-surface-border)',
          borderRadius: 'var(--cron-border-radius-sm)',
          padding: 'var(--cron-space-sm)',
          fontSize: 'var(--cron-font-size-md)',
          marginBottom: 'var(--cron-space-sm)',
          background: 'var(--cron-surface-bg)',
          color: 'var(--cron-text-primary)',
          fontFamily: 'var(--cron-font-family)',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 'var(--cron-space-sm)' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your task... (Draft — not sent)"
          rows={3}
          style={{
            flex: 1,
            border: '1px solid var(--cron-surface-border)',
            borderRadius: 'var(--cron-border-radius-sm)',
            padding: 'var(--cron-space-sm)',
            fontSize: 'var(--cron-font-size-md)',
            resize: 'vertical',
            background: 'var(--cron-surface-bg)',
            color: 'var(--cron-text-primary)',
            fontFamily: 'var(--cron-font-family)',
          }}
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          style={{
            alignSelf: 'flex-end',
            padding: 'var(--cron-space-sm) var(--cron-space-md)',
            background: 'var(--cron-accent)',
            color: 'var(--cron-text-inverse)',
            border: 'none',
            borderRadius: 'var(--cron-border-radius-sm)',
            cursor: prompt.trim() ? 'pointer' : 'not-allowed',
            opacity: prompt.trim() ? 1 : 0.5,
            fontFamily: 'var(--cron-font-family)',
            fontSize: 'var(--cron-font-size-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Send size={14} />
          Draft
        </button>
      </div>
    </form>
  );
}
