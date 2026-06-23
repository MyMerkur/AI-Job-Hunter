import { ManualChatGPTProvider } from './providers/manual-chatgpt.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { RuleBasedAIProvider } from './providers/rule-based.provider.js';
import type { ProviderHealth, ProviderSelection, RequestedProvider } from './types.js';

export class AIOrchestrator {
  constructor(
    private readonly ollama = new OllamaProvider(),
    private readonly ruleBased = new RuleBasedAIProvider(),
    private readonly manualChatGpt = new ManualChatGPTProvider(),
  ) {}

  async checkProviderHealth(): Promise<ProviderHealth[]> {
    const ollamaHealth = await this.ollama.healthCheck();
    return [
      ollamaHealth,
      { provider: 'rule_based', available: true, message: 'Rule-based provider her zaman yerel olarak kullanılabilir.' },
      { provider: 'manual_chatgpt', available: true, message: 'Manual ChatGPT provider yalnızca açıkça seçildiğinde kullanılır.' },
    ];
  }

  async selectProvider(requestedProvider: RequestedProvider): Promise<ProviderSelection> {
    const health = await this.checkProviderHealth();
    const ollamaHealth = health[0];
    let resolvedProvider: ProviderSelection['resolvedProvider'];
    let provider: ProviderSelection['provider'];
    const warnings: string[] = [];

    if (requestedProvider === 'manual_chatgpt') {
      resolvedProvider = 'manual_chatgpt'; provider = this.manualChatGpt;
    } else if (requestedProvider === 'rule_based') {
      resolvedProvider = 'rule_based'; provider = this.ruleBased;
    } else if (requestedProvider === 'ollama') {
      resolvedProvider = 'ollama'; provider = this.ollama;
      if (!ollamaHealth.available) warnings.push(ollamaHealth.message);
    } else if (ollamaHealth.available) {
      resolvedProvider = 'ollama'; provider = this.ollama;
    } else {
      resolvedProvider = 'rule_based'; provider = this.ruleBased;
      warnings.push(`Ollama kullanılamadı; RuleBasedAIProvider kullanıldı. ${ollamaHealth.message}`);
    }

    console.info(JSON.stringify({ event: 'ai.provider.selected', requestedProvider, resolvedProvider, fallback: requestedProvider === 'auto' && resolvedProvider !== 'ollama', warnings }));
    return { requestedProvider, resolvedProvider, provider, warnings, health };
  }

  async runWithProvider<T>(requestedProvider: RequestedProvider, operation: (provider: ProviderSelection['provider']) => Promise<T>): Promise<{ selection: ProviderSelection; result: T }> {
    const selection = await this.selectProvider(requestedProvider);
    try {
      return { selection, result: await operation(selection.provider) };
    } catch (error) {
      if (requestedProvider !== 'auto' || selection.resolvedProvider !== 'ollama') throw error;
      const warning = `Ollama üretim isteği başarısız oldu; RuleBasedAIProvider kullanıldı. ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`;
      const fallbackSelection: ProviderSelection = {
        ...selection,
        resolvedProvider: 'rule_based',
        provider: this.ruleBased,
        warnings: [...selection.warnings, warning],
      };
      console.info(JSON.stringify({ event: 'ai.provider.fallback', requestedProvider, from: 'ollama', to: 'rule_based', warning }));
      return { selection: fallbackSelection, result: await operation(this.ruleBased) };
    }
  }
}
