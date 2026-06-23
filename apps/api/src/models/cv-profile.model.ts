import { Schema, model, models, type HydratedDocument, type Types } from 'mongoose';
import type { CvProfileStatus } from '@ai-job-hunter/shared';

export interface CVProfileDocument { userId: Types.ObjectId; name: string; rawText?: string; summary?: string; skills: string[]; sourceFileName?: string; status: CvProfileStatus; }
export type CVProfileHydratedDocument = HydratedDocument<CVProfileDocument>;

const cvProfileSchema = new Schema<CVProfileDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  rawText: { type: String },
  summary: { type: String },
  skills: { type: [String], default: [] },
  sourceFileName: { type: String },
  status: { type: String, enum: ['draft', 'ready', 'archived'], default: 'draft', required: true },
}, { timestamps: true });

export const CVProfileModel = models.CVProfile || model<CVProfileDocument>('CVProfile', cvProfileSchema);
