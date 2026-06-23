import type { LanguageRequirement, RemoteType } from '@ai-job-hunter/shared';
import type { JobScoringResult } from '@ai-job-hunter/scoring';

export interface AIJobInput {
  title: string;
  company?: string;
  source?: string;
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

export type RequestedProvider = 'auto' | 'rule_based' | 'manual_chatgpt' | 'ollama';
export type ResolvedProvider = Exclude<RequestedProvider, 'auto'>;

export interface ProviderHealth {
  provider: ResolvedProvider;
  available: boolean;
  message: string;
}

export interface ProviderSelection {
  requestedProvider: RequestedProvider;
  resolvedProvider: ResolvedProvider;
  provider: AIProvider;
  warnings: string[];
  health: ProviderHealth[];
}

export type ApplicationDecision = 'apply' | 'review' | 'ignore';
export type ApplicationAgentName = 'JobResearchAgent' | 'FitAnalysisAgent' | 'CVTailorAgent' | 'CoverLetterAgent' | 'DecisionAgent' | 'SupervisorAgent';

export interface AgentReport {
  agent: ApplicationAgentName;
  status: 'completed' | 'skipped' | 'stopped';
  summary: string;
  data?: Record<string, unknown>;
}

export interface ApplicationPreparationPipelineOutput {
  providerUsed: ResolvedProvider;
  decision: ApplicationDecision;
  score: number;
  risks: string[];
  warnings: string[];
  tailoredCvMarkdown: string;
  coverLetterMarkdown: string;
  agentReports: AgentReport[];
  stopped: boolean;
  analysis: AIJobAnalysis;
}
