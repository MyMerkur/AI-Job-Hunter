import type { JobListing } from '@ai-job-hunter/shared';

export interface AiProvider {
  name: string;
  generateCoverLetter(input: { job: JobListing; cvText: string }): Promise<string>;
  tailorCv(input: { job: JobListing; cvText: string }): Promise<string>;
}

export class UnconfiguredAiProvider implements AiProvider {
  name = 'unconfigured';
  async generateCoverLetter(): Promise<string> { throw new Error('Configure a local AI provider (for example Ollama) first.'); }
  async tailorCv(): Promise<string> { throw new Error('Configure a local AI provider (for example Ollama) first.'); }
}
