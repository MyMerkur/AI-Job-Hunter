import { HttpError } from '../lib/http-error.js';

const allowedLocalHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);

export interface OllamaConfig { baseUrl?: string; model?: string; }

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${name} bir metin olmalıdır.`);
  return value.trim() || undefined;
}

export function parseOllamaConfig(value: { baseUrl?: unknown; model?: unknown }): OllamaConfig {
  const baseUrl = optionalString(value.baseUrl, 'ollamaBaseUrl');
  const model = optionalString(value.model, 'ollamaModel');
  if (baseUrl) {
    let parsed: URL;
    try { parsed = new URL(baseUrl); } catch { throw new HttpError(400, 'ollamaBaseUrl geçerli bir URL olmalıdır.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !allowedLocalHosts.has(parsed.hostname)) {
      throw new HttpError(400, 'Ollama URL’si yalnızca yerel bir HTTP(S) adresi olabilir.');
    }
  }
  if (model && (model.length > 120 || !/^[a-zA-Z0-9_.:/-]+$/.test(model))) {
    throw new HttpError(400, 'ollamaModel geçerli bir Ollama model adı olmalıdır.');
  }
  return { baseUrl, model };
}
