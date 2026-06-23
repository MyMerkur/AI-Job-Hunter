import { AIOrchestrator, OllamaProvider, type RequestedProvider } from '@ai-job-hunter/ai';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { HttpError } from '../lib/http-error.js';
import { parseOllamaConfig } from '../services/ollama-config.js';

const providerNames: RequestedProvider[] = ['auto', 'ollama', 'rule_based', 'manual_chatgpt'];

function providerFrom(value: unknown): RequestedProvider {
  if (typeof value !== 'string' || !providerNames.includes(value as RequestedProvider)) {
    throw new HttpError(400, `provider şu değerlerden biri olmalıdır: ${providerNames.join(', ')}`);
  }
  return value as RequestedProvider;
}

function createOrchestrator(config: ReturnType<typeof parseOllamaConfig>): { orchestrator: AIOrchestrator; ollama: OllamaProvider } {
  const ollama = new OllamaProvider(config.baseUrl, config.model);
  return { ollama, orchestrator: new AIOrchestrator(ollama) };
}

export const aiRouter: ExpressRouter = Router();

aiRouter.get('/health', async (request, response) => {
  const provider = providerFrom(request.query.provider ?? 'auto');
  const config = parseOllamaConfig({ baseUrl: request.query.ollamaBaseUrl, model: request.query.ollamaModel });
  const { orchestrator } = createOrchestrator(config);
  const selection = await orchestrator.selectProvider(provider);
  response.json({ requestedProvider: provider, providerUsed: selection.resolvedProvider, fallbackActive: provider === 'auto' && selection.resolvedProvider !== 'ollama', warnings: selection.warnings, health: selection.health });
});

aiRouter.post('/test', async (request, response) => {
  const provider = providerFrom(request.body?.provider ?? 'auto');
  const config = parseOllamaConfig({ baseUrl: request.body?.ollamaBaseUrl, model: request.body?.ollamaModel });
  const { orchestrator, ollama } = createOrchestrator(config);
  const run = await orchestrator.runWithProvider(provider, async (selectedProvider) => {
    if (selectedProvider.name === 'ollama') return ollama.testConnection();
    const analysis = await selectedProvider.analyzeJob({ job: { title: 'AI connection test', description: 'Short local provider test.' }, cvRawText: 'Candidate has basic software development experience.' });
    return `Local ${selectedProvider.name} test completed (score: ${analysis.score}).`;
  });
  response.json({ requestedProvider: provider, providerUsed: run.selection.resolvedProvider, fallbackActive: provider === 'auto' && run.selection.resolvedProvider !== 'ollama', warnings: run.selection.warnings, result: run.result });
});
