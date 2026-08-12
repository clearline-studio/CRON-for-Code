import type { CodeProject } from '@cron-code/contracts';
import type { LlmAttachment, LlmConfig, LlmRoute } from './llm.js';

export type ChatRole = 'user' | 'cron';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  route: LlmRoute;
  attachments?: Array<Pick<LlmAttachment, 'id' | 'name' | 'mimeType' | 'size' | 'kind'>>;
  handoffTaskId?: string;
}

export interface RouteStatus {
  route: LlmRoute;
  label: string;
  model: string;
  detail: string;
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  textModel: 'gemma-4-26b-a4b-qat',
  visionModel: 'gemma-4-26b-a4b-qat',
  codingModel: 'deepseek/deepseek-v4-flash',
  escalationModel: 'deepseek/deepseek-v4-pro',
};

/**
 * LOCKED agent role model (Architect-approved):
 * GEMMA = planner / architect / read-only project companion.
 * The planner transport (this chat surface) has NO mutation operations —
 * it only chats. File-mutating work routes exclusively through the OpenCode
 * executor (coding model). Venessa remains the final approval authority.
 */
export const PLANNER_ROLE = Object.freeze({
  id: 'gemma-planner',
  label: 'Planner',
  model: DEFAULT_LLM_CONFIG.textModel,
  readOnly: true as const,
  description: 'Gemma plans, explains, and reviews. It never changes files.',
});

/** Routing prefixes that hand work to the file-mutating executor (never the planner). */
export const EXECUTOR_ROUTE_IDS: ReadonlyArray<LlmRoute> = Object.freeze(['opencode-flash', 'pro-escalation']);

export function isPlannerRoute(route: LlmRoute): boolean {
  return route === 'local-chat' || route === 'local-vision';
}

export function createChatMessage(input: {
  role: ChatRole;
  text: string;
  route: LlmRoute;
  attachments?: LlmAttachment[];
  handoffTaskId?: string;
}): ChatMessage {
  return {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: input.role,
    text: input.text,
    route: input.route,
    createdAt: Date.now(),
    attachments: input.attachments?.map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size,
      kind: item.kind,
    })),
    handoffTaskId: input.handoffTaskId,
  };
}

export function chatPreferenceKey(projectId: string, sessionId = 'default'): string {
  return `cron.chat.${projectId}.${sessionId}`;
}

export function compactContext(messages: ChatMessage[], limit = 10): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .slice(-limit)
    .filter((message) => message.text.trim() !== '')
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));
}

export function safeParseMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChatMessage =>
      item &&
      typeof item.id === 'string' &&
      (item.role === 'user' || item.role === 'cron') &&
      typeof item.text === 'string' &&
      typeof item.createdAt === 'number',
    );
  } catch {
    return [];
  }
}

export function resolveRouteStatus(config: LlmConfig | null, route: LlmRoute, hasImages: boolean): RouteStatus {
  const cfg = config ?? DEFAULT_LLM_CONFIG;
  if (route === 'opencode-flash') {
    return {
      route,
      label: 'OpenCode',
      model: cfg.codingModel,
      detail: 'DeepSeek V4 Flash coding handoff',
    };
  }
  if (route === 'pro-escalation') {
    return {
      route,
      label: 'Escalation',
      model: cfg.escalationModel,
      detail: 'DeepSeek V4 Pro optional fallback',
    };
  }
  return {
    route: hasImages ? 'local-vision' : 'local-chat',
    label: hasImages ? 'Vision' : 'Planner',
    model: hasImages ? cfg.visionModel : cfg.textModel,
    detail: hasImages ? 'Gemma planner (read-only) via LM Studio vision route' : 'Gemma planner (read-only) via LM Studio chat route',
  };
}

export function buildOpenCodeHandoffPrompt(input: {
  prompt: string;
  project: CodeProject | null;
  attachments: LlmAttachment[];
  config: LlmConfig | null;
}): { title: string; body: string } {
  const cfg = input.config ?? DEFAULT_LLM_CONFIG;
  const firstLine = input.prompt.split(/\r?\n/).find((line) => line.trim())?.trim() ?? 'Coding task';
  const title = `OpenCode handoff: ${firstLine.slice(0, 72)}`;
  const attachmentLines = input.attachments.length
    ? input.attachments.map((file) => `- ${file.name} (${file.kind}, ${file.size} bytes)`).join('\n')
    : '- none';
  const projectLine = input.project ? `${input.project.name} (${input.project.rootPath})` : 'No project selected';
  return {
    title,
    body: [
      'EXECUTION TASK — for the coding executor only (DeepSeek V4 Flash through OpenCode).',
      '',
      'Goal:',
      input.prompt,
      '',
      'Scope:',
      '- Apply the change described above inside the selected project repository.',
      '- Keep the change scoped to what the goal requires.',
      '',
      'Constraints:',
      '- Preserve existing wiring and shell unless required.',
      '- Do not commit, push, reset, clean, or run destructive commands.',
      '- Do not touch other repositories, system configuration, credentials, or unrelated applications.',
      '',
      'Protected areas:',
      '- Git history and remotes (no mutation).',
      '- Files outside the selected project repository.',
      '- Anything requiring Venessa approval must ask through the CRON permission flow.',
      '',
      'Acceptance criteria:',
      '- The requested result exists.',
      '- Verification confirms the result.',
      '- Report the changed files and verification evidence.',
      '',
      'Context:',
      `Project: ${projectLine}`,
      `Primary coding model: ${cfg.codingModel}`,
      `Escalation model: ${cfg.escalationModel} (only if Flash gets stuck; requires explicit escalation approval)`,
      `Attachments:`,
      attachmentLines,
    ].join('\n'),
  };
}

/** Explicit go-signals: after planning, these hand the task to the executor. */
export function isGoSignal(prompt: string): boolean {
  return /\b(go|do it|implement it|proceed|build that|make it happen|yes please|yes,? do (?:it|that)|please (?:do|implement|build|make))\b/i.test(prompt);
}

export async function fileToLlmAttachment(file: File): Promise<LlmAttachment> {
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = file.type || 'application/octet-stream';
  if (mimeType.startsWith('image/')) {
    return {
      id,
      name: file.name,
      mimeType,
      size: file.size,
      kind: 'image',
      dataUrl: await readFileAsDataUrl(file),
    };
  }
  if (mimeType.startsWith('text/') || /\.(md|txt|json|ts|tsx|js|jsx|css|html|mjs|cjs)$/i.test(file.name)) {
    return {
      id,
      name: file.name,
      mimeType,
      size: file.size,
      kind: 'text',
      text: await file.text(),
    };
  }
  return {
    id,
    name: file.name,
    mimeType,
    size: file.size,
    kind: 'file',
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read attachment'));
    reader.readAsDataURL(file);
  });
}
