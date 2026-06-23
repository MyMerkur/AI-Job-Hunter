export interface JobListing {
  title: string;
  description: string;
  source: string;
  url: string;
  company?: string;
  location?: string;
}

export interface CandidateProfile { skills: string[]; summary?: string; }
export interface JobScore { score: number; matchedSkills: string[]; missingSkills: string[]; reasons: string[]; }
export interface HealthResponse { status: 'ok'; service: 'api'; }
