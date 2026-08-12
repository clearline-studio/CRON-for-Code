import { type CSSProperties, useEffect, useState } from 'react';
import { Check, Server, X } from 'lucide-react';
import type { LlmClient, LlmConfig } from '../llm.js';
import { DEFAULT_LLM_CONFIG } from '../chat-runtime.js';

export function LlmSettings({ llm, onClose, onSaved }: {
  llm?: LlmClient;
  onClose: () => void;
  onSaved: (config: LlmConfig) => void;
}) {
  const [config, setConfig] = useState<LlmConfig>(DEFAULT_LLM_CONFIG);
  const [message, setMessage] = useState('Enter your mini PC address, then test it.');
  const [messageTone, setMessageTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (llm) void llm.getConfig().then(setConfig).catch(() => undefined); }, [llm]);

  async function test() {
    if (!llm) return;
    setBusy(true);
    try {
      await llm.saveConfig(config);
      const result = await llm.test(config);
      setMessage(result.ok ? result.message : friendlyLmStudioError(config.baseUrl, result.message));
      setMessageTone(result.ok ? 'success' : 'error');
      onSaved(config);
    } catch (error) {
      setMessage(friendlyLmStudioError(config.baseUrl, error instanceof Error ? error.message : 'Connection failed.'));
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-label="LM Studio settings">
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Server size={17} /><span>LM Studio</span></div>
          <button onClick={onClose} style={closeStyle} aria-label="Close settings"><X size={18} /></button>
        </header>
        <p style={helpStyle}>CRON Chat connects to Gemma through LM Studio on your mini. Coding handoffs keep DeepSeek inside OpenCode.</p>
        <label style={labelStyle}>Mini PC address</label>
        <input value={config.baseUrl} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} style={fieldStyle} placeholder="http://192.168.x.x:1234/v1" />
        <label style={labelStyle}>Local chat model</label>
        <input value={config.textModel} onChange={(e) => setConfig({ ...config, textModel: e.target.value })} style={fieldStyle} />
        <label style={labelStyle}>Vision model</label>
        <input value={config.visionModel} onChange={(e) => setConfig({ ...config, visionModel: e.target.value })} style={fieldStyle} />
        <label style={labelStyle}>OpenCode coding model</label>
        <input value={config.codingModel} onChange={(e) => setConfig({ ...config, codingModel: e.target.value })} style={fieldStyle} />
        <label style={labelStyle}>Escalation model</label>
        <input value={config.escalationModel} onChange={(e) => setConfig({ ...config, escalationModel: e.target.value })} style={fieldStyle} />
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

function friendlyLmStudioError(baseUrl: string, detail: string): string {
  const localAddress = /\b(?:127\.0\.0\.1|localhost)\b/i.test(baseUrl);
  const target = baseUrl.trim() || 'the configured address';
  const prefix = `Cannot reach LM Studio at ${target}.`;
  const miniHint = localAddress
    ? ' 127.0.0.1 points to this PC; for the mini, enter its LAN address such as http://192.168.x.x:1234/v1.'
    : '';
  return `${prefix}${miniHint} Check that LM Studio is running, listening on the LAN, Windows Firewall allows the port, and the address is correct. ${detail}`.trim();
}

const backdropStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', background: 'rgba(1, 5, 14, 0.62)', backdropFilter: 'blur(4px)' };
const panelStyle: CSSProperties = { width: 430, maxWidth: 'calc(100% - 48px)', background: '#07142a', border: '1px solid #28518b', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', fontFamily: 'var(--cron-font-family)', color: '#eaf2ff' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--cron-panel-border)', color: '#79adff', fontWeight: 700 };
const closeStyle: CSSProperties = { display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: '#8da4c7', cursor: 'pointer' };
const helpStyle: CSSProperties = { margin: '14px 16px', color: '#8da4c7', fontSize: 12, lineHeight: 1.5 };
const labelStyle: CSSProperties = { display: 'block', margin: '12px 16px 5px', color: '#b7cdf0', fontSize: 12, fontWeight: 600 };
const fieldStyle: CSSProperties = { display: 'block', width: 'calc(100% - 32px)', boxSizing: 'border-box', margin: '0 16px', padding: '9px 10px', border: '1px solid #234777', background: '#041024', color: '#eaf2ff', outline: 'none', fontSize: 13 };
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
