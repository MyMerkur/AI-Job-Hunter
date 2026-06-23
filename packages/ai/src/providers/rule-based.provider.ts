import { scoreJob } from '@ai-job-hunter/scoring';
import type { AIJobAnalysis, AIGeneratedText, AIProvider, AnalyzeJobInput, GenerateCoverLetterInput, TailorCVInput } from '../types.js';

const keywordPatterns: Array<[string, RegExp]> = [
  ['React', /\breact(?:\.js)?\b/i], ['Node.js', /\bnode\.?js\b/i], ['TypeScript', /\btypescript\b/i],
  ['JavaScript', /\bjavascript\b/i], ['MongoDB', /\bmongodb\b/i], ['Express', /\bexpress(?:\.js)?\b/i],
];

function jobKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`;
  return keywordPatterns.filter(([, pattern]) => pattern.test(text)).map(([keyword]) => keyword);
}

export class RuleBasedAIProvider implements AIProvider {
  readonly name = 'rule-based';

  async analyzeJob(input: AnalyzeJobInput): Promise<AIJobAnalysis> {
    const result = scoreJob({
      title: input.job.title, description: input.job.description, location: input.job.location,
      languageRequirement: input.job.languageRequirement, remoteType: input.job.remoteType, cvRawText: input.cvRawText,
    });
    return { ...result, provider: this.name };
  }

  async tailorCV(input: TailorCVInput): Promise<AIGeneratedText> {
    const keywords = jobKeywords(input.job.title, input.job.description);
    const content = [
      '# Tailored CV Draft', '', `## Target role`, `${input.job.title}${input.job.company ? ` — ${input.job.company}` : ''}`,
      '', '## Relevant keywords', keywords.length ? keywords.map((keyword) => `- ${keyword}`).join('\n') : '- Review job-specific keywords manually.',
      '', '## Original CV text', input.cvRawText.trim(), '',
      '> Review this draft before use. It preserves the original CV text and does not invent experience.',
    ].join('\n');
    return { content, provider: this.name };
  }

  async generateCoverLetter(input: GenerateCoverLetterInput): Promise<AIGeneratedText> {
    const keywords = jobKeywords(input.job.title, input.job.description);
    const content = [
      'Dear Hiring Team,', '',
      `I am interested in the ${input.job.title} position${input.job.company ? ` at ${input.job.company}` : ''}.`,
      keywords.length ? `My CV includes experience and interest in ${keywords.join(', ')}.` : 'I believe my background may be relevant to this opportunity.',
      'I would welcome the opportunity to discuss how my skills and goals align with the role.', '',
      'Kind regards,', input.candidateName ?? '[Your name]', '',
      '> Review and personalize this template. Do not claim skills or experience that are not in your CV.',
    ].join('\n');
    return { content, provider: this.name };
  }
}
