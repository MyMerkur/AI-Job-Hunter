/** Shared domain contracts. IDs are serialized MongoDB ObjectIds at API boundaries. */
export type EntityId = string;
export type ISODateString = string;

export type UserStatus = 'active' | 'disabled';
export type CvProfileStatus = 'draft' | 'ready' | 'archived';
export type JobStatus = 'discovered' | 'analyzed' | 'saved' | 'dismissed' | 'applied';
export type JobAnalysisStatus = 'pending' | 'completed' | 'failed';
export type GeneratedCvStatus = 'draft' | 'ready' | 'archived';
export type ApplicationStatus = 'draft' | 'ready_for_review' | 'submitted' | 'withdrawn' | 'rejected' | 'interviewing' | 'offer';
export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export interface User {
  id: EntityId;
  email: string;
  displayName?: string;
  status: UserStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CVProfile {
  id: EntityId;
  userId: EntityId;
  name: string;
  rawText?: string;
  summary?: string;
  skills: string[];
  sourceFileName?: string;
  status: CvProfileStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
  period?: 'hour' | 'month' | 'year' | 'unknown';
  text?: string;
}

export interface LanguageRequirement {
  language: string;
  level?: string;
  required?: boolean;
}

export interface Job {
  id: EntityId;
  userId?: EntityId;
  title: string;
  company: string;
  location?: string;
  url: string;
  source: string;
  description: string;
  salary?: SalaryRange;
  remoteType: RemoteType;
  languageRequirement: LanguageRequirement[];
  score?: number;
  status: JobStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface JobAnalysis {
  id: EntityId;
  jobId: EntityId;
  cvProfileId?: EntityId;
  status: JobAnalysisStatus;
  score?: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  concerns: string[];
  summary?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GeneratedCV {
  id: EntityId;
  cvProfileId: EntityId;
  jobId?: EntityId;
  content: string;
  format: 'text' | 'markdown' | 'pdf' | 'docx';
  status: GeneratedCvStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Application {
  id: EntityId;
  jobId: EntityId;
  cvProfileId: EntityId;
  generatedCvId?: EntityId;
  status: ApplicationStatus;
  appliedAt?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ApplicationLog {
  id: EntityId;
  applicationId: EntityId;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
}

// Backward-compatible first-pass contracts.
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
