import { type CSSProperties, useState, type FormEvent, useRef, type ChangeEvent } from 'react';
import { Send, Sparkles, FileText, ClipboardPaste, ShieldCheck, Lock, Paperclip, X } from 'lucide-react';

const MOCK_MESSAGES = [
  { role: 'user' as const, text: 'How do I set up the project structure?' },
  { role: 'cron' as const, text: 'A standard monorepo layout works well here. Use pnpm workspaces with packages for frontend, backend, and shared utilities. Keep configuration at the root and tooling per-package.' },
  { role: 'user' as const, text: 'What about testing?' },
  { role: 'cron' as const, text: 'Set up vitest in each package. Place tests next to source files using the .test.ts convention and add a test script that runs vitest run across all packages.' },
];

interface AttachedFile {
  name: string;
  size: number;
  addedAt: number;
}

export function CronAssistant() {
  const [messages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'architect' | 'cc' | 'review'>('architect');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setInput('');
    setAttachments([]);
  }

  function handleAttach() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newFiles: AttachedFile[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      addedAt: Date.now(),
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>
        <Sparkles size={14} />
        <span>CRON Assistant</span>
      </div>

      <div style={tabsStyle}>
        {(['architect', 'cc', 'review'] as const).map((t) => (
          <button
            key={t}
            style={tabStyle(t === activeTab)}
            onClick={() => setActiveTab(t)}
          >
            {t === 'architect' ? 'Architect' : t === 'cc' ? 'CC' : 'Review'}
          </button>
        ))}
      </div>

      <div style={conversationStyle}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'cron' ? 'flex-start' : 'flex-end' }}>
            <div style={msg.role === 'cron' ? cronBubbleStyle : userBubbleStyle}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div style={quickActionsStyle}>
        <button style={quickBtnStyle} disabled>
          <FileText size={10} />
          <span style={{ flex: 1, textAlign: 'left' as const }}>Create CC Prompt</span>
          <Lock size={8} style={lockIconStyle} />
        </button>
        <button style={quickBtnStyle} disabled>
          <ClipboardPaste size={10} />
          <span style={{ flex: 1, textAlign: 'left' as const }}>Paste CC Report</span>
          <Lock size={8} style={lockIconStyle} />
        </button>
        <button style={quickBtnStyle} disabled>
          <ShieldCheck size={10} />
          <span style={{ flex: 1, textAlign: 'left' as const }}>Review Evidence</span>
          <Lock size={8} style={lockIconStyle} />
        </button>
      </div>

      {attachments.length > 0 && (
        <div style={chipsStyle}>
          {attachments.map((f, i) => (
            <div key={`${f.name}-${f.addedAt}`} style={chipStyle} title={`${f.name} (${(f.size / 1024).toFixed(1)} KB)`}>
              <span style={chipTextStyle}>{f.name}</span>
              <button onClick={() => removeAttachment(i)} style={chipRemoveStyle}>
                <X size={10} />
              </button>
            </div>
          ))}
          <div style={attachHintStyle}>Files selected locally. Upload wiring pending.</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={inputAreaStyle}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFilesSelected}
          style={hiddenFileInputStyle}
        />
        <button
          type="button"
          onClick={handleAttach}
          title="Attach file"
          style={attachBtnStyle}
        >
          <Paperclip size={13} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Cron..."
          style={msgInputStyle}
        />
        <button type="submit" disabled={!input.trim()} style={sendBtnStyle}>
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}

const panelStyle: CSSProperties = {
  width: 'clamp(150px, 13vw, 220px)',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(180deg, #030711 0%, #07111f 45%, #0b1d36 100%)',
  borderLeft: '1px solid var(--cron-panel-border)',
  fontFamily: 'var(--cron-font-family)',
  userSelect: 'none',
  overflow: 'hidden',
};

const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '8px 14px',
  color: 'var(--cron-accent)',
  fontSize: 'var(--cron-font-size-sm)',
  fontWeight: 600,
  borderBottom: '1px solid var(--cron-panel-border)',
  letterSpacing: 0.5,
  flexShrink: 0,
};

const tabsStyle: CSSProperties = {
  display: 'flex',
  padding: '4px 10px',
  gap: 2,
  borderBottom: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
};

const tabStyle = (active: boolean): CSSProperties => ({
  padding: '3px 10px',
  borderRadius: 4,
  border: 'none',
  background: active ? 'var(--cron-accent-subtle)' : 'transparent',
  color: active ? '#60a5fa' : 'var(--cron-panel-text-muted)',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
});

const conversationStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minHeight: 0,
};

const baseBubble: CSSProperties = {
  maxWidth: '88%',
  padding: '7px 11px',
  borderRadius: 7,
  fontSize: 'var(--cron-font-size-sm)',
  lineHeight: 1.55,
};

const cronBubbleStyle: CSSProperties = {
  ...baseBubble,
  background: 'rgba(59, 130, 246, 0.08)',
  color: '#eaf2ff',
  border: '1px solid rgba(59, 130, 246, 0.12)',
};

const userBubbleStyle: CSSProperties = {
  ...baseBubble,
  background: '#102244',
  color: '#eaf2ff',
  border: '1px solid rgba(80, 140, 220, 0.15)',
};

const quickActionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '6px 10px',
  borderTop: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
};

const quickBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid rgba(245, 158, 11, 0.18)',
  background: 'transparent',
  color: '#8da4c7',
  fontSize: 'var(--cron-font-size-xs)',
  fontFamily: 'var(--cron-font-family)',
  cursor: 'default',
  opacity: 0.8,
  width: '100%',
};

const lockIconStyle: CSSProperties = {
  opacity: 0.5,
  flexShrink: 0,
  color: '#f59e0b',
};

const chipsStyle: CSSProperties = {
  padding: '4px 14px',
  borderTop: '1px solid var(--cron-panel-border)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  flexShrink: 0,
  maxHeight: 72,
  overflow: 'auto',
};

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid rgba(59, 130, 246, 0.25)',
  background: 'var(--cron-accent-subtle)',
  fontSize: 9,
  color: '#60a5fa',
  fontFamily: 'var(--cron-font-family)',
  whiteSpace: 'nowrap',
};

const chipTextStyle: CSSProperties = {
  maxWidth: 100,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const chipRemoveStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: '#5f7392',
  cursor: 'pointer',
  lineHeight: 1,
};

const attachHintStyle: CSSProperties = {
  width: '100%',
  fontSize: 8,
  color: '#5f7392',
  fontFamily: 'var(--cron-font-family)',
  opacity: 0.5,
  textAlign: 'left',
};

const inputAreaStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  padding: '8px 14px 34px 14px',
  borderTop: '1px solid var(--cron-panel-border)',
  flexShrink: 0,
};

const hiddenFileInputStyle: CSSProperties = {
  display: 'none',
};

const attachBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  minWidth: 30,
  height: 30,
  background: 'transparent',
  border: '1px solid rgba(80, 140, 220, 0.15)',
  borderRadius: 5,
  color: '#5f7392',
  cursor: 'pointer',
  flexShrink: 0,
};

const msgInputStyle: CSSProperties = {
  flex: 1,
  background: '#091730',
  border: '1px solid rgba(80, 140, 220, 0.18)',
  borderRadius: 5,
  padding: '5px 10px',
  color: 'var(--cron-panel-text)',
  fontSize: 'var(--cron-font-size-sm)',
  fontFamily: 'var(--cron-font-family)',
  outline: 'none',
  minWidth: 0,
};

const sendBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  minWidth: 30,
  height: 30,
  background: 'var(--cron-accent-subtle)',
  border: '1px solid rgba(59, 130, 246, 0.15)',
  borderRadius: 5,
  color: 'var(--cron-accent)',
  cursor: 'pointer',
  opacity: 0.8,
  flexShrink: 0,
};
