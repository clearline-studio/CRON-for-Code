import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLM_CONFIG,
  activePlannerProvider,
  buildOpenCodeHandoffPrompt,
  compactContext,
  createChatMessage,
  isGoSignal,
  isPlannerRoute,
  PLANNER_ROLE,
  resolveRouteStatus,
  safeParseMessages,
} from './chat-runtime.js';

describe('chat runtime routing (cloud-first, Ollama fallback)', () => {
  it('defaults to a cloud provider with an Ollama local fallback', () => {
    expect(DEFAULT_LLM_CONFIG.cloud.baseUrl).toBe('https://api.openrouter.ai/api/v1');
    expect(DEFAULT_LLM_CONFIG.cloud.chatModel).toBe('deepseek/deepseek-v4-flash');
    expect(DEFAULT_LLM_CONFIG.cloud.visionModel).toBe('qwen/qwen-2-vl-7b-instruct');
    expect(DEFAULT_LLM_CONFIG.cloud.codingModel).toBe('opencode-go/deepseek-v4-flash-vision-exp');
    expect(DEFAULT_LLM_CONFIG.cloud.escalationModel).toBe('deepseek/deepseek-v4-pro');
    expect(DEFAULT_LLM_CONFIG.ollama.baseUrl).toContain('11434');
    expect(DEFAULT_LLM_CONFIG.ollama.chatModel).not.toHaveLength(0);
  });

  it('picks the cloud as the active planner provider when configured', () => {
    expect(activePlannerProvider(DEFAULT_LLM_CONFIG)).toBe('cloud');
    expect(activePlannerProvider(null)).toBe('cloud');
  });

  it('falls back to Ollama when no cloud endpoint/model is configured', () => {
    const localOnly = {
      cloud: { ...DEFAULT_LLM_CONFIG.cloud, baseUrl: '', chatModel: '' },
      ollama: DEFAULT_LLM_CONFIG.ollama,
    };
    expect(activePlannerProvider(localOnly)).toBe('ollama');
    const status = resolveRouteStatus(localOnly, 'local-chat', false);
    expect(status.detail).toContain('Local AI via Ollama');
    expect(status.model).toBe(DEFAULT_LLM_CONFIG.ollama.chatModel);
  });

  it('reports planner and vision routes with truthful cloud labels (no LM Studio wording)', () => {
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'local-chat', true)).toMatchObject({
      route: 'local-vision',
      model: DEFAULT_LLM_CONFIG.cloud.visionModel,
      label: 'Vision',
    });
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'local-chat', false)).toMatchObject({
      route: 'local-chat',
      model: DEFAULT_LLM_CONFIG.cloud.chatModel,
      label: 'Planner',
    });
    const detail = resolveRouteStatus(DEFAULT_LLM_CONFIG, 'local-chat', false).detail;
    expect(detail).toContain('read-only');
    expect(detail).toContain('Cloud AI');
    expect(detail).toContain('Ollama');
    expect(detail).not.toMatch(/LM Studio/i);
  });

  it('labels the executor routes truthfully from the configured models', () => {
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'opencode-flash', false)).toMatchObject({
      label: 'Coding agent',
      model: DEFAULT_LLM_CONFIG.cloud.codingModel,
    });
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'pro-escalation', false)).toMatchObject({
      label: 'Deeper reasoning',
      model: DEFAULT_LLM_CONFIG.cloud.escalationModel,
    });
    const custom = {
      ...DEFAULT_LLM_CONFIG,
      cloud: { ...DEFAULT_LLM_CONFIG.cloud, codingModel: 'provider/my-coding-model' },
    };
    expect(resolveRouteStatus(custom, 'opencode-flash', false).model).toBe('provider/my-coding-model');
  });

  it('builds governed OpenCode handoff tasks with the configured cloud models', () => {
    const handoff = buildOpenCodeHandoffPrompt({
      prompt: 'Fix the screenshot capture flow',
      project: {
        id: 'proj_1',
        name: 'CRON for Code',
        rootPath: 'C:/repo',
        createdAt: 1,
        updatedAt: 1,
        lastOpenedAt: null,
        availability: 'available',
        archived: false,
      },
      attachments: [],
      config: DEFAULT_LLM_CONFIG,
    });
    expect(handoff.title).toContain('OpenCode handoff');
    expect(handoff.body).toContain('Primary coding model: opencode-go/deepseek-v4-flash-vision-exp');
    expect(handoff.body).toContain('Escalation model: deepseek/deepseek-v4-pro');
    expect(handoff.body).toContain('Do not commit, push, reset, clean');
    expect(handoff.body).not.toMatch(/Flash gets stuck/i);
  });
});

describe('locked agent role model (read-only planner / OpenCode executor)', () => {
  it('marks the planner as read-only and provider-neutral', () => {
    expect(PLANNER_ROLE.readOnly).toBe(true);
    expect(PLANNER_ROLE.model).toBe(DEFAULT_LLM_CONFIG.cloud.chatModel);
    expect(PLANNER_ROLE.description).not.toMatch(/Gemma/i);
    expect(isPlannerRoute('local-chat')).toBe(true);
    expect(isPlannerRoute('local-vision')).toBe(true);
    expect(isPlannerRoute('opencode-flash')).toBe(false);
    expect(isPlannerRoute('pro-escalation')).toBe(false);
  });

  it('keeps the planner chat route free of any mutation capability', () => {
    // The planner transport (local chat/vision) is a pure conversation surface:
    // it has no write/patch/delete/shell operations to invoke. Executor routes
    // (opencode-flash / pro-escalation) are the only ones that create execution tasks.
    const planner = resolveRouteStatus(DEFAULT_LLM_CONFIG, 'local-chat', false);
    expect(planner.detail).toContain('read-only');
    expect(planner.label).toBe('Planner');
  });

  it('recognises explicit go-signals that hand a plan to the executor', () => {
    expect(isGoSignal('Go')).toBe(true);
    expect(isGoSignal('Do it')).toBe(true);
    expect(isGoSignal('Implement it')).toBe(true);
    expect(isGoSignal('Proceed')).toBe(true);
    expect(isGoSignal('Build that')).toBe(true);
    expect(isGoSignal('yes please')).toBe(true);
    expect(isGoSignal('What do you think about the layout?')).toBe(false);
    expect(isGoSignal('Explain the architecture')).toBe(false);
  });

  it('produces a task-handoff contract with goal, scope, constraints, protected areas, and acceptance criteria', () => {
    const handoff = buildOpenCodeHandoffPrompt({
      prompt: 'Add a settings toggle',
      project: {
        id: 'proj_1',
        name: 'CRON for Code',
        rootPath: 'C:/repo',
        createdAt: 1,
        updatedAt: 1,
        lastOpenedAt: null,
        availability: 'available',
        archived: false,
      },
      attachments: [],
      config: DEFAULT_LLM_CONFIG,
    });
    expect(handoff.body).toContain('EXECUTION TASK');
    expect(handoff.body).toMatch(/Goal:/);
    expect(handoff.body).toMatch(/Scope:/);
    expect(handoff.body).toMatch(/Constraints:/);
    expect(handoff.body).toMatch(/Protected areas:/);
    expect(handoff.body).toMatch(/Acceptance criteria:/);
    expect(handoff.body).not.toMatch(/hidden reasoning/i);
  });
});

describe('chat runtime persistence', () => {
  it('keeps compact context in CRON-owned messages', () => {
    const messages = [
      createChatMessage({ role: 'user', text: 'hello', route: 'local-chat' }),
      createChatMessage({ role: 'cron', text: 'hi', route: 'local-chat' }),
    ];
    expect(compactContext(messages)).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
    expect(safeParseMessages(JSON.stringify(messages))).toHaveLength(2);
    expect(safeParseMessages('not json')).toEqual([]);
  });
});
