// DEPRECATED (2026-08-21): superseded by ModelSettings (Cloud AI + Ollama).
// Kept as a backward-compatible re-export shim only. No active UI imports this.
export { ModelSettings as LlmSettings } from './ModelSettings.js';
export type { LlmClient, LlmConfig } from '../llm.js';
