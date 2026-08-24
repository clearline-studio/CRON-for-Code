import { type CSSProperties, useEffect, useState } from 'react';
import { Check, Cloud, Server, X } from 'lucide-react';
import type { LlmClient, LlmConfig } from '../llm.js';
import { DEFAULT_LLM_CONFIG } from '../chat-runtime.js';

export function ModelSettings({ llm, onClose, onSaved }: {
  llm?: LlmClient;
  onClose: () => void;
  onSaved: (config: LlmConfig) => void;
}) {
  const [config, setConfig] = useState<LlmConfig>(DEFAULT_LLM_CONFIG);
  const [message, setMessage] = useState('Enter your providers, then test them.');
  const [messageTone, setMessageTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (llm) void llm.getConfig().then(setConfig).catch(() => undefined); }, [llm]);

  const setCloud = (patch: Partial<LlmConfig['cloud']>) => setConfig((current) => ({ ...current, cloud: { ...current.cloud, ...patch } }));
  const setOllama = (patch: Partial<LlmConfig['ollama']>) => setConfig((current) => ({ ...current, ollama: { ...current.ollama, ...patch } }));

  async function test() {
    if (!llm) return;
    setBusy(true);
    try {
      await llm.saveConfig(config);
      const result = await llm.test(config);
      setMessage(result.ok ? result.message : result.message);
      setMessageTone(result.ok ? 'success' : 'error');
      onSaved(config);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connection failed.');
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-label="AI settings">
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Cloud size={17} /><span>AI Settings</span></div>
          <button onClick={onClose} style={closeStyle} aria-label="Close settings"><X size={18} /></button>
        </header>
        <p style={helpStyle}>CRON uses a cloud AI by default and falls back to Ollama running on this machine if the cloud is unavailable. OpenCode does the actual coding.</p>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}><Cloud size={13} /> Cloud AI</div>
          <label style={labelStyle}>Cloud address</label>
          <input value={config.cloud.baseUrl} onChange={(e) => setCloud({ baseUrl: e.target.value })} style={fieldStyle} placeholder="https://api.openrouter.ai/api/v1" />
          <label style={labelStyle}>API key (optional, kept on this PC)</label>
          <input value={config.cloud.apiKey} onChange={(e) => setCloud({ apiKey: e.target.value })} style={fieldStyle} type="password" placeholder="sk-…" />
          <label style={labelStyle}>Chat model</label>
          <input value={config.cloud.chatModel} onChange={(e) => setCloud({ chatModel: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Vision model</label>
          <input value={config.cloud.visionModel} onChange={(e) => setCloud({ visionModel: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Coding model (through OpenCode)</label>
          <input value={config.cloud.codingModel} onChange={(e) => setCloud({ codingModel: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Deeper-reasoning model (with approval)</label>
          <input value={config.cloud.escalationModel} onChange={(e) => setCloud({ escalationModel: e.target.value })} style={fieldStyle} />
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}><Server size={13} /> Local AI (Ollama)</div>
          <label style={labelStyle}>Local address</label>
          <input value={config.ollama.baseUrl} onChange={(e) => setOllama({ baseUrl: e.target.value })} style={fieldStyle} placeholder="http://127.0.0.1:11434/v1" />
          <label style={labelStyle}>Local chat model</label>
          <input value={config.ollama.chatModel} onChange={(e) => setOllama({ chatModel: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Local vision model</label>
          <input value={config.ollama.visionModel} onChange={(e) => setOllama({ visionModel: e.target.value })} style={fieldStyle} />
        </div>

        <div style={messageStyle(messageTone)}>
          {messageTone === 'error' ? <X size={13} color="#ff6b7a" /> : <Check size={13} color={messageTone === 'success' ? '#22c55e' : '#8da4c7'} />}
          <span>{message}</span>
        </div>
        <div style={actionsStyle}>
          <button onClick={onClose} style={cancelStyle}>Close</button>
          <button onClick={() => void test()} disabled={busy || !llm} style={testStyle}>{busy ? 'Testing…' : 'Save & Test'}</button>
        </div>
      </section>
    </div>
  );
}

const backdropStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', background: 'rgba(1, 5, 14, 0.62)', backdropFilter: 'blur(4px)' };
const panelStyle: CSSProperties = { width: 430, maxWidth: 'calc(100% - 48px)', maxHeight: '92vh', overflowY: 'auto', background: '#07142a', border: '1px solid #28518b', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', fontFamily: 'var(--cron-font-family)', color: '#eaf2ff' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--cron-panel-border)', color: '#79adff', fontWeight: 700 };
const closeStyle: CSSProperties = { display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: '#8da4c7', cursor: 'pointer' };
const helpStyle: CSSProperties = { margin: '14px 16px', color: '#8da4c7', fontSize: 12, lineHeight: 1.5 };
const sectionStyle: CSSProperties = { margin: '0 16px 14px', padding: '10px 12px', border: '1px solid rgba(100,160,255,.22)', background: 'rgba(3, 12, 28, .5)' };
const sectionTitleStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: '#b7cdf0', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 };
const labelStyle: CSSProperties = { display: 'block', margin: '10px 0 4px', color: '#b7cdf0', fontSize: 11, fontWeight: 600 };
const fieldStyle: CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 9px', border: '1px solid #234777', background: '#041024', color: '#eaf2ff', outline: 'none', fontSize: 12 };
function messageStyle(tone: 'neutral' | 'success' | 'error'): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    margin: '14px 16px',
    minHeight: 18,
    color: tone === 'success' ? '#9ee6b2' : tone === 'error' ? '#ffc1c8' : '#8da4c7',
    fontSize: 11,
    lineHeight: 1.45,
  };
}
const actionsStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 16px', borderTop: '1px solid var(--cron-panel-border)' };
const cancelStyle: CSSProperties = { padding: '8px 12px', border: '1px solid #234777', background: 'transparent', color: '#b7cdf0', cursor: 'pointer' };
const testStyle: CSSProperties = { padding: '8px 12px', border: '1px solid #2974e6', background: '#123f86', color: '#eaf2ff', cursor: 'pointer', fontWeight: 600 };
