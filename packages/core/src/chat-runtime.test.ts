import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLM_CONFIG,
  buildOpenCodeHandoffPrompt,
  compactContext,
  createChatMessage,
  isGoSignal,
  isPlannerRoute,
  PLANNER_ROLE,
  resolveRouteStatus,
  safeParseMessages,
} from './chat-runtime.js';

describe('chat runtime routing', () => {
  it('defaults to the CRON AI stack routes', () => {
    expect(DEFAULT_LLM_CONFIG.textModel).toBe('gemma-4-26b-a4b-qat');
    expect(DEFAULT_LLM_CONFIG.visionModel).toBe('gemma-4-26b-a4b-qat');
    expect(DEFAULT_LLM_CONFIG.codingModel).toBe('deepseek/deepseek-v4-flash');
    expect(DEFAULT_LLM_CONFIG.escalationModel).toBe('deepseek/deepseek-v4-pro');
  });

  it('reports local vision and OpenCode route status without model history ownership', () => {
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'local-chat', true)).toMatchObject({
      route: 'local-vision',
      model: DEFAULT_LLM_CONFIG.visionModel,
    });
    expect(resolveRouteStatus(DEFAULT_LLM_CONFIG, 'opencode-flash', false)).toMatchObject({
      label: 'OpenCode',
      model: DEFAULT_LLM_CONFIG.codingModel,
    });
  });

  it('builds governed OpenCode handoff tasks with Flash primary and Pro fallback', () => {
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
    expect(handoff.body).toContain('Primary coding model: deepseek/deepseek-v4-flash');
    expect(handoff.body).toContain('Escalation model: deepseek/deepseek-v4-pro');
    expect(handoff.body).toContain('Do not commit, push, reset, clean');
  });
});

describe('locked agent role model (Gemma planner / OpenCode executor)', () => {
  it('marks Gemma as the read-only planner companion', () => {
    expect(PLANNER_ROLE.readOnly).toBe(true);
    expect(PLANNER_ROLE.model).toBe('gemma-4-26b-a4b-qat');
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
