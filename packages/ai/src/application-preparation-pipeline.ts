import { RuleBasedAIProvider } from './providers/rule-based.provider.js';
import type { AIGeneratedText, AIJobAnalysis, AIProvider, AgentReport, ApplicationDecision, ApplicationPreparationPipelineOutput, AnalyzeJobInput } from './types.js';

type Research = { roleType: string; skills: string[]; seniority: string; languageRequirements: string[]; risks: string[]; stopReasons: string[] };
type Fit = { analysis: AIJobAnalysis; strengths: string[]; gaps: string[]; risks: string[] };

const skillMatchers: Array<[string, RegExp]> = [
  ['React', /\breact(?:\.js)?\b/i], ['Node.js', /\bnode\.?js\b/i], ['TypeScript', /\btypescript\b/i], ['JavaScript', /\bjavascript\b/i],
  ['MongoDB', /\bmongodb\b/i], ['Express', /\bexpress(?:\.js)?\b/i], ['Playwright', /\bplaywright\b/i], ['Python', /\bpython\b/i],
];

function includesAny(text: string, patterns: RegExp[]): boolean { return patterns.some((pattern) => pattern.test(text)); }
function unique(items: string[]): string[] { return [...new Set(items.map((item) => item.trim()).filter(Boolean))]; }
function report(agent: AgentReport['agent'], status: AgentReport['status'], summary: string, data?: Record<string, unknown>): AgentReport { return { agent, status, summary, data }; }

export class JobResearchAgent {
  async run(input: AnalyzeJobInput): Promise<{ research: Research; report: AgentReport }> {
    const text = `${input.job.title}\n${input.job.description}`;
    const lower = text.toLowerCase();
    const skills = skillMatchers.filter(([, matcher]) => matcher.test(text)).map(([skill]) => skill);
    const roleType = includesAny(lower, [/internship/, /intern\b/]) ? 'internship' : includesAny(lower, [/part[- ]time/]) ? 'part-time' : 'full-time or unspecified';
    const seniority = includesAny(lower, [/\bsenior\b/, /\b5\+? years?\b/, /\b5 years?\b/]) ? 'senior' : includesAny(lower, [/\bjunior\b/, /graduate/, /entry[- ]level/]) ? 'junior' : 'unspecified';
    const languageRequirements = unique([...(input.job.languageRequirement?.map((item) => `${item.language}${item.level ? ` (${item.level})` : ''}`) ?? []), ...(lower.includes('english') ? ['English'] : []), ...(lower.includes('czech') ? ['Czech'] : [])]);
    const risks = [
      ...(seniority === 'senior' ? ['İlan kıdemli deneyim bekliyor.'] : []),
      ...(includesAny(lower, [/native czech/, /czech required/]) ? ['Çekçe dil gereksinimi aday uygunluğunu azaltabilir.'] : []),
      ...(includesAny(lower, [/full[- ]time only/]) ? ['İlan yalnızca tam zamanlı çalışma istiyor.'] : []),
    ];
    const stopReasons = includesAny(lower, [/pay (a |an )?(fee|deposit)/, /send (a )?money/, /upfront payment/, /training fee/, /scam/])
      ? ['İlan metninde ödeme/dolandırıcılık riski algılandı; otomatik taslak üretimi durduruldu.'] : [];
    const research = { roleType, skills, seniority, languageRequirements, risks, stopReasons };
    return { research, report: report('JobResearchAgent', 'completed', 'İlan rolü, becerileri, kıdemi ve riskleri çıkarıldı.', research) };
  }
}

export class FitAnalysisAgent {
  async run(input: AnalyzeJobInput, provider: AIProvider, research: Research): Promise<{ fit: Fit; report: AgentReport }> {
    const analysis = await provider.analyzeJob(input);
    const fit = { analysis, strengths: analysis.positiveSignals, gaps: analysis.negativeSignals, risks: unique([...research.risks, ...analysis.risks]) };
    return { fit, report: report('FitAnalysisAgent', 'completed', 'CV ile ilan arasındaki uyum analiz edildi.', { score: analysis.score, strengths: fit.strengths, gaps: fit.gaps, risks: fit.risks }) };
  }
}

function unsupportedYearClaims(content: string, cvRawText: string): string[] {
  const cvLower = cvRawText.toLowerCase();
  return unique((content.match(/\b\d{1,2}\+?\s+years?(?:\s+of)?\s+(?:experience|work experience)?/gi) ?? []).filter((claim) => !cvLower.includes(claim.toLowerCase())));
}

export class CVTailorAgent {
  constructor(private readonly safeProvider = new RuleBasedAIProvider()) {}
  async run(input: AnalyzeJobInput, provider: AIProvider): Promise<{ generated: AIGeneratedText; warnings: string[]; report: AgentReport }> {
    let generated = await provider.tailorCV(input);
    const claims = unsupportedYearClaims(generated.content, input.cvRawText);
    const warnings: string[] = [];
    if (claims.length) {
      generated = await this.safeProvider.tailorCV(input);
      warnings.push(`CV taslağında CV'de doğrulanamayan deneyim iddiası algılandı (${claims.join(', ')}); güvenli rule-based taslak kullanıldı.`);
    }
    return { generated, warnings, report: report('CVTailorAgent', 'completed', 'CV taslağı yalnızca mevcut CV içeriği vurgulanarak üretildi.', { provider: generated.provider, validationWarnings: warnings }) };
  }
}

export class CoverLetterAgent {
  constructor(private readonly safeProvider = new RuleBasedAIProvider()) {}
  async run(input: AnalyzeJobInput, provider: AIProvider): Promise<{ generated: AIGeneratedText; warnings: string[]; report: AgentReport }> {
    let generated = await provider.generateCoverLetter(input);
    const claims = unsupportedYearClaims(generated.content, input.cvRawText);
    const warnings: string[] = [];
    if (claims.length) {
      generated = await this.safeProvider.generateCoverLetter(input);
      warnings.push(`Cover letter'da CV'de doğrulanamayan deneyim iddiası algılandı (${claims.join(', ')}); güvenli rule-based taslak kullanıldı.`);
    }
    return { generated, warnings, report: report('CoverLetterAgent', 'completed', 'Şirkete ve role özel, kısa cover letter taslağı üretildi.', { provider: generated.provider, validationWarnings: warnings }) };
  }
}

export class DecisionAgent {
  run(fit: Fit, research: Research): { decision: ApplicationDecision; report: AgentReport } {
    const score = fit.analysis.score;
    const hasStrongMismatch = research.seniority === 'senior' || fit.risks.some((risk) => /native czech|çekçe/i.test(risk));
    const decision: ApplicationDecision = research.stopReasons.length || hasStrongMismatch || score < 45 ? 'ignore' : score >= 70 ? 'apply' : 'review';
    const reason = decision === 'apply' ? 'Uyum skoru yüksek ve engelleyici risk algılanmadı.' : decision === 'review' ? 'Uyum kısmi; taslaklar manuel inceleme gerektiriyor.' : 'Riskler veya düşük uyum skoru nedeniyle otomatik ilerleme önerilmiyor.';
    return { decision, report: report('DecisionAgent', 'completed', reason, { decision, score, risks: fit.risks }) };
  }
}

export class SupervisorAgent {
  constructor(
    private readonly jobResearch = new JobResearchAgent(), private readonly fitAnalysis = new FitAnalysisAgent(),
    private readonly cvTailor = new CVTailorAgent(), private readonly coverLetter = new CoverLetterAgent(), private readonly decision = new DecisionAgent(),
  ) {}

  async run(input: AnalyzeJobInput, provider: AIProvider): Promise<ApplicationPreparationPipelineOutput> {
    const reports: AgentReport[] = [];
    const warnings: string[] = [];
    const { research, report: researchReport } = await this.jobResearch.run(input); reports.push(researchReport);
    const { fit, report: fitReport } = await this.fitAnalysis.run(input, provider, research); reports.push(fitReport);
    if (research.stopReasons.length) {
      warnings.push(...research.stopReasons);
      reports.push(report('CVTailorAgent', 'stopped', 'Yüksek ilan riski nedeniyle CV üretimi durduruldu.'));
      reports.push(report('CoverLetterAgent', 'stopped', 'Yüksek ilan riski nedeniyle cover letter üretimi durduruldu.'));
      const { decision, report: decisionReport } = this.decision.run(fit, research); reports.push(decisionReport);
      reports.push(report('SupervisorAgent', 'stopped', 'Supervisor yüksek risk nedeniyle pipeline’ı durdurdu.', { stopReasons: research.stopReasons }));
      return { providerUsed: provider.name === 'ollama' ? 'ollama' : 'rule_based', decision, score: fit.analysis.score, risks: fit.risks, warnings, tailoredCvMarkdown: '', coverLetterMarkdown: '', agentReports: reports, stopped: true, analysis: fit.analysis };
    }
    const cv = await this.cvTailor.run(input, provider); reports.push(cv.report); warnings.push(...cv.warnings);
    const cover = await this.coverLetter.run(input, provider); reports.push(cover.report); warnings.push(...cover.warnings);
    const { decision, report: decisionReport } = this.decision.run(fit, research); reports.push(decisionReport);
    reports.push(report('SupervisorAgent', 'completed', 'Tüm agent çıktıları doğrulandı; hiçbir başvuru gönderilmedi.', { decision, validated: true }));
    return { providerUsed: provider.name === 'ollama' ? 'ollama' : 'rule_based', decision, score: fit.analysis.score, risks: fit.risks, warnings, tailoredCvMarkdown: cv.generated.content, coverLetterMarkdown: cover.generated.content, agentReports: reports, stopped: false, analysis: fit.analysis };
  }
}
