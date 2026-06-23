import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AIJobAnalysis, AIGeneratedText, AIProvider, AnalyzeJobInput, GenerateCoverLetterInput, TailorCVInput } from '../types.js';
import { RuleBasedAIProvider } from './rule-based.provider.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const promptsDirectory = resolve(currentDirectory, '../../../../generated/prompts');

async function savePrompt(kind: string, prompt: string): Promise<string> {
  await mkdir(promptsDirectory, { recursive: true });
  const filePath = resolve(promptsDirectory, `${Date.now()}-${randomUUID()}-${kind}.md`);
  await writeFile(filePath, prompt, { encoding: 'utf8', mode: 0o600 });
  return filePath;
}

function jobContext(input: { job: AnalyzeJobInput['job']; cvRawText: string }): string {
  const { job } = input;
  return [`Job title: ${job.title}`, `Company: ${job.company ?? 'Not specified'}`, `Location: ${job.location ?? 'Not specified'}`, `Remote type: ${job.remoteType ?? 'Not specified'}`, `Language requirements: ${job.languageRequirement?.map((item) => item.language).join(', ') ?? 'Not specified'}`, '', 'Job description:', job.description, '', 'CV raw text:', input.cvRawText].join('\n');
}

export class ManualChatGPTProvider implements AIProvider {
  readonly name = 'manual-chatgpt';
  private readonly fallback = new RuleBasedAIProvider();

  async analyzeJob(input: AnalyzeJobInput): Promise<AIJobAnalysis> {
    const prompt = ['Analyze this job against the supplied CV. Return a score from 0–100, decision (apply/maybe/ignore), positive signals, negative signals, and risks. Do not invent facts.', '', jobContext(input)].join('\n');
    const promptPath = await savePrompt('analyze-job', prompt);
    return { ...await this.fallback.analyzeJob(input), provider: this.name, manualPrompt: prompt, promptPath };
  }

  async tailorCV(input: TailorCVInput): Promise<AIGeneratedText> {
    const prompt = ['Tailor the CV below for this job. Preserve facts exactly; do not invent skills, employers, education, or experience. Return Markdown only.', '', jobContext(input)].join('\n');
    const promptPath = await savePrompt('tailor-cv', prompt);
    return { content: prompt, provider: this.name, manualPrompt: prompt, promptPath };
  }

  async generateCoverLetter(input: GenerateCoverLetterInput): Promise<AIGeneratedText> {
    const prompt = ['Write a concise, honest cover letter for this job using only facts in the CV. Do not claim unverified skills or experience. Include no placeholders except the candidate signature.', '', jobContext(input), '', `Candidate name: ${input.candidateName ?? '[Your name]'}`].join('\n');
    const promptPath = await savePrompt('cover-letter', prompt);
    return { content: prompt, provider: this.name, manualPrompt: prompt, promptPath };
  }
}
