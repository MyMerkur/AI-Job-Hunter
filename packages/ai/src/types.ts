import type { LanguageRequirement, RemoteType } from '@ai-job-hunter/shared';
import type { JobScoringResult } from '@ai-job-hunter/scoring';

export interface AIJobInput {
  title: string;
  company?: string;
  description: string;
  location?: string;
  remoteType?: RemoteType;
  languageRequirement?: LanguageRequirement[];
  url?: string;
}

export interface AnalyzeJobInput { job: AIJobInput; cvRawText: string; }
export interface TailorCVInput { job: AIJobInput; cvRawText: string; }
export interface GenerateCoverLetterInput { job: AIJobInput; cvRawText: string; candidateName?: string; }

export interface AIJobAnalysis extends JobScoringResult {
  provider: string;
  isPlaceholder?: boolean;
  manualPrompt?: string;
  promptPath?: string;
}

export interface AIGeneratedText {
  content: string;
  provider: string;
  isPlaceholder?: boolean;
  manualPrompt?: string;
  promptPath?: string;
}

export interface AIProvider {
  readonly name: string;
  analyzeJob(input: AnalyzeJobInput): Promise<AIJobAnalysis>;
  tailorCV(input: TailorCVInput): Promise<AIGeneratedText>;
  generateCoverLetter(input: GenerateCoverLetterInput): Promise<AIGeneratedText>;
}
