import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ModelSettings } from './components/ModelSettings.js';
import { DEFAULT_LLM_CONFIG } from './chat-runtime.js';
import type { LlmClient } from './llm.js';

afterEach(cleanup);

function mockLlm(overrides: Partial<LlmClient> = {}): LlmClient {
  return {
    getConfig: vi.fn().mockResolvedValue(DEFAULT_LLM_CONFIG),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    test: vi.fn().mockResolvedValue({ ok: true, models: ['deepseek/deepseek-v4-flash'], message: 'Connected.' }),
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    ...overrides,
  };
}

describe('ModelSettings (Cloud AI + Local AI via Ollama)', () => {
  it('shows Cloud AI and Local AI (Ollama) sections with no LM Studio wording', () => {
    render(<ModelSettings llm={mockLlm()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('AI Settings')).toBeTruthy();
    expect(screen.getByText('Cloud AI')).toBeTruthy();
    expect(screen.getByText('Local AI (Ollama)')).toBeTruthy();
    expect(screen.getByText(/falls back to Ollama/)).toBeTruthy();
    expect(screen.queryByText(/LM Studio/i)).toBeNull();
    expect(screen.queryByText(/1234/)).toBeNull();
    expect(screen.getByPlaceholderText('http://127.0.0.1:11434/v1')).toBeTruthy();
  });

  it('loads the saved provider config when available', async () => {
    const llm = mockLlm();
    render(<ModelSettings llm={llm} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByDisplayValue('https://api.openrouter.ai/api/v1')).toBeTruthy();
    expect(await screen.findByDisplayValue('http://127.0.0.1:11434/v1')).toBeTruthy();
  });

  it('Save & Test persists the config and reports the provider status', async () => {
    const llm = mockLlm();
    render(<ModelSettings llm={llm} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByText('Save & Test'));
    expect(await screen.findByText(/Connected/)).toBeTruthy();
    expect(llm.saveConfig).toHaveBeenCalledTimes(1);
    expect(llm.test).toHaveBeenCalledTimes(1);
  });
});
