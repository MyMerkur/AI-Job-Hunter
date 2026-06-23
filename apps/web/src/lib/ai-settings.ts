import type { PreparationProvider } from './api.js';

const storageKey = 'ai-job-hunter.ai-settings';

export interface AISettings {
  provider: PreparationProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export const defaultAISettings: AISettings = {
  provider: 'auto',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
};

export function getAISettings(): AISettings {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return defaultAISettings;
    const value = parsed as Partial<AISettings>;
    if (!['auto', 'ollama', 'rule_based', 'manual_chatgpt'].includes(value.provider ?? '')) return defaultAISettings;
    return { provider: value.provider as PreparationProvider, ollamaBaseUrl: typeof value.ollamaBaseUrl === 'string' ? value.ollamaBaseUrl : defaultAISettings.ollamaBaseUrl, ollamaModel: typeof value.ollamaModel === 'string' ? value.ollamaModel : defaultAISettings.ollamaModel };
  } catch { return defaultAISettings; }
}

export function saveAISettings(settings: AISettings): void {
  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}
