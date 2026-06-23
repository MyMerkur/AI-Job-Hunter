import type { CandidateProfile } from '@ai-job-hunter/shared';

export interface ParsedCv { rawText: string; profile: CandidateProfile; }

/** Placeholder: connect a PDF/DOCX text extractor before relying on this in production. */
export async function parseCv(rawText: string): Promise<ParsedCv> {
  return { rawText, profile: { skills: [] } };
}

/** Placeholder: later render a validated DOCX/PDF, preserving the original CV facts. */
export async function generateTailoredCv(cv: ParsedCv, tailoredText: string): Promise<string> {
  return `${cv.rawText}\n\n${tailoredText}`;
}
