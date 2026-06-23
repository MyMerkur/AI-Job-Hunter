import { Schema, model, models, type HydratedDocument, type Types } from 'mongoose';
import type { JobAnalysisStatus } from '@ai-job-hunter/shared';

export interface JobAnalysisDocument { jobId: Types.ObjectId; cvProfileId?: Types.ObjectId; status: JobAnalysisStatus; score?: number; matchedSkills: string[]; missingSkills: string[]; strengths: string[]; concerns: string[]; summary?: string; }
export type JobAnalysisHydratedDocument = HydratedDocument<JobAnalysisDocument>;

const jobAnalysisSchema = new Schema<JobAnalysisDocument>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  cvProfileId: { type: Schema.Types.ObjectId, ref: 'CVProfile', index: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', required: true },
  score: { type: Number, min: 0, max: 100 },
  matchedSkills: { type: [String], default: [] }, missingSkills: { type: [String], default: [] },
  strengths: { type: [String], default: [] }, concerns: { type: [String], default: [] }, summary: String,
}, { timestamps: true });

export const JobAnalysisModel = models.JobAnalysis || model<JobAnalysisDocument>('JobAnalysis', jobAnalysisSchema);
