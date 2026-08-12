export interface LlmConfig {
  baseUrl: string;
  textModel: string;
  visionModel: string;
  codingModel: string;
  escalationModel: string;
}

export type LlmRoute = 'local-chat' | 'local-vision' | 'opencode-flash' | 'pro-escalation';

export interface LlmAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'text' | 'file';
  dataUrl?: string;
  text?: string;
}

export interface LlmClient {
  getConfig(): Promise<LlmConfig>;
  saveConfig(config: LlmConfig): Promise<void>;
  test(config: LlmConfig): Promise<{ ok: boolean; models: string[]; message: string }>;
  chat(input: {
    config: LlmConfig;
    model: string;
    message: string;
    route?: LlmRoute;
    attachments?: LlmAttachment[];
    contextMessages?: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<{ text: string }>;
}
