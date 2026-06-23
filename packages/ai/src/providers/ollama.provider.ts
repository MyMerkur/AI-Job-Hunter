import type { AIJobAnalysis, AIGeneratedText, AIProvider, AnalyzeJobInput, GenerateCoverLetterInput, ProviderHealth, TailorCVInput } from '../types.js';
import { RuleBasedAIProvider } from './rule-based.provider.js';

type OllamaGenerateResponse = { response?: string; error?: string };

export class OllamaProviderError extends Error {
  readonly statusCode = 503;
  constructor(message: string) { super(message); this.name = 'OllamaProviderError'; }
}

function jobContext(input: AnalyzeJobInput): string {
  const { job } = input;
  const cvText = input.cvRawText.slice(0, 25_000);
  return [
    `Job title: ${job.title}`, `Company: ${job.company ?? 'Not specified'}`, `Location: ${job.location ?? 'Not specified'}`,
    `Remote type: ${job.remoteType ?? 'Not specified'}`, `Language requirements: ${job.languageRequirement?.map((item) => item.language).join(', ') ?? 'Not specified'}`,
    '', 'Job description:', job.description, '', 'CV raw text:', cvText,
  ].join('\n');
}

function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  const candidates = [raw.trim(), raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()];
  const firstBrace = raw.indexOf('{'); const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(raw.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* Try the next JSON-shaped candidate. */ }
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  private readonly fallback = new RuleBasedAIProvider();

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
    timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 60_000),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs >= 1_000 ? timeoutMs : 60_000;
  }

  private get generateUrl(): string {
    return `${this.baseUrl.endsWith('/api') ? this.baseUrl : `${this.baseUrl}/api`}/generate`;
  }

  private get tagsUrl(): string {
    return `${this.baseUrl.endsWith('/api') ? this.baseUrl : `${this.baseUrl}/api`}/tags`;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 10_000));
    try {
      const response = await fetch(this.tagsUrl, { signal: controller.signal });
      if (!response.ok) return { provider: 'ollama', available: false, message: `Ollama model listesi HTTP ${response.status} döndürdü.` };
      const body: unknown = await response.json();
      const models = body && typeof body === 'object' && Array.isArray((body as { models?: unknown }).models) ? (body as { models: unknown[] }).models : [];
      const configuredModelExists = models.some((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const model = entry as { name?: unknown; model?: unknown };
        return model.name === this.model || model.model === this.model;
      });
      return configuredModelExists
        ? { provider: 'ollama', available: true, message: `Ollama ve ${this.model} kullanılabilir.` }
        : { provider: 'ollama', available: false, message: `Ollama çalışıyor fakat ${this.model} modeli bulunamadı. "ollama pull ${this.model}" çalıştırın.` };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError' ? 'Ollama sağlık kontrolü zaman aşımına uğradı.' : `Ollama'ya bağlanılamadı (${this.tagsUrl}).`;
      return { provider: 'ollama', available: false, message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generate(prompt: string, json = false): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.generateUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ model: this.model, prompt, stream: false, ...(json ? { format: 'json' } : {}) }),
      });
      const rawBody = await response.text();
      const body = parseJsonObject(rawBody) as OllamaGenerateResponse | undefined;
      if (!response.ok) {
        const detail = typeof body?.error === 'string' ? body.error : rawBody.slice(0, 300);
        throw new OllamaProviderError(`Ollama isteği başarısız oldu (HTTP ${response.status}): ${detail || 'Bilinmeyen hata'}`);
      }
      if (!body || typeof body.response !== 'string' || !body.response.trim()) throw new OllamaProviderError('Ollama boş veya geçersiz bir yanıt döndürdü.');
      return body.response.trim();
    } catch (error) {
      if (error instanceof OllamaProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new OllamaProviderError(`Ollama ${Math.round(this.timeoutMs / 1000)} saniye içinde yanıt vermedi.`);
      throw new OllamaProviderError(`Ollama'ya bağlanılamadı (${this.generateUrl}). Ollama'nın çalıştığını ve modelin indirildiğini kontrol edin.`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<string> {
    return this.generate('Reply with exactly: AI connection successful. Do not add anything else.');
  }

  async analyzeJob(input: AnalyzeJobInput): Promise<AIJobAnalysis> {
    const prompt = [
      'Analyze the job against the CV. Return JSON only, with exactly these fields:',
      '{"score": number from 0 to 100, "decision": "apply" | "maybe" | "ignore", "positiveSignals": string[], "negativeSignals": string[], "risks": string[]}.',
      'Use only evidence in the supplied job and CV. Do not invent facts.', '', jobContext(input),
    ].join('\n');
    const raw = await this.generate(prompt, true);
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      const fallback = await this.fallback.analyzeJob(input);
      return { ...fallback, provider: this.name, isPlaceholder: true };
    }
    const score = typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : undefined;
    const decision = parsed.decision === 'apply' || parsed.decision === 'maybe' || parsed.decision === 'ignore' ? parsed.decision : undefined;
    if (score === undefined || !decision) {
      const fallback = await this.fallback.analyzeJob(input);
      return { ...fallback, provider: this.name, isPlaceholder: true };
    }
    return { score, decision, positiveSignals: stringArray(parsed.positiveSignals), negativeSignals: stringArray(parsed.negativeSignals), risks: stringArray(parsed.risks), provider: this.name };
  }

  async tailorCV(input: TailorCVInput): Promise<AIGeneratedText> {
    const prompt = ['Create a tailored CV draft in Markdown for this job. Preserve facts from the CV exactly; do not invent skills, employers, education, or experience. Return JSON only: {"content":"markdown"}.', '', jobContext(input)].join('\n');
    const raw = await this.generate(prompt, true);
    const content = parseJsonObject(raw)?.content;
    return { content: typeof content === 'string' && content.trim() ? content.trim() : raw, provider: this.name };
  }

  async generateCoverLetter(input: GenerateCoverLetterInput): Promise<AIGeneratedText> {
    const prompt = ['Write a concise, honest cover letter in Markdown. Use only facts from the CV. Do not invent skills or experience. Return JSON only: {"content":"markdown"}.', '', jobContext(input), '', `Candidate name: ${input.candidateName ?? '[Your name]'}`].join('\n');
    const raw = await this.generate(prompt, true);
    const content = parseJsonObject(raw)?.content;
    return { content: typeof content === 'string' && content.trim() ? content.trim() : raw, provider: this.name };
  }
}
