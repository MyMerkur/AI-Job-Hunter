import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { JobStatus, RemoteType } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

export interface WorkerJobDocument {
  userId?: Types.ObjectId;
  title: string;
  company: string;
  location?: string;
  url: string;
  source: string;
  description: string;
  salary?: { min?: number; max?: number; currency?: string; period?: string; text?: string };
  remoteType: RemoteType;
  languageRequirement: { language: string; level?: string; required?: boolean }[];
  score?: number;
  status: JobStatus;
}
export type WorkerJobHydratedDocument = HydratedDocument<WorkerJobDocument>;

const jobSchema = new Schema<WorkerJobDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true, trim: true }, company: { type: String, required: true, trim: true },
  location: { type: String, trim: true }, url: { type: String, required: true, trim: true },
  source: { type: String, required: true, trim: true }, description: { type: String, required: true },
  salary: { min: Number, max: Number, currency: String, period: String, text: String },
  remoteType: { type: String, enum: ['remote', 'hybrid', 'onsite', 'unknown'], default: 'unknown', required: true },
  languageRequirement: { type: [{ language: { type: String, required: true }, level: String, required: Boolean }], default: [] },
  score: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['discovered', 'analyzed', 'saved', 'dismissed', 'applied'], default: 'discovered', required: true },
}, { timestamps: true, collection: 'jobs' });

export const WorkerJobModel = models.WorkerJob || model<WorkerJobDocument>('WorkerJob', jobSchema, 'jobs');
