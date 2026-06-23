import type { AIJobAnalysis, AIGeneratedText, AIProvider, AnalyzeJobInput, GenerateCoverLetterInput, TailorCVInput } from '../types.js';
import { RuleBasedAIProvider } from './rule-based.provider.js';

/**
 * Local-model integration boundary. It intentionally makes no HTTP calls until
 * a model name, availability check, and response validation are implemented.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly baseUrl: string;
  private readonly fallback = new RuleBasedAIProvider();

  constructor(baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async analyzeJob(input: AnalyzeJobInput): Promise<AIJobAnalysis> {
    // TODO: call `${baseUrl}/api/generate` after an explicit model configuration and health check.
    return { ...await this.fallback.analyzeJob(input), provider: this.name, isPlaceholder: true };
  }

  async tailorCV(input: TailorCVInput): Promise<AIGeneratedText> {
    // TODO: call Ollama and validate that generated content does not invent CV facts.
    return { ...await this.fallback.tailorCV(input), provider: this.name, isPlaceholder: true };
  }

  async generateCoverLetter(input: GenerateCoverLetterInput): Promise<AIGeneratedText> {
    // TODO: call Ollama and keep the output in a user-review state.
    return { ...await this.fallback.generateCoverLetter(input), provider: this.name, isPlaceholder: true };
  }
}
