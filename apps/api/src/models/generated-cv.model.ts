import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { AIProviderName, GeneratedCvStatus } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

export interface GeneratedCVDocument { cvProfileId: Types.ObjectId; jobId?: Types.ObjectId; content: string; coverLetterContent: string; provider?: AIProviderName; filePath?: string; pdfPath?: string; format: 'text' | 'markdown' | 'pdf' | 'docx'; status: GeneratedCvStatus; }
export type GeneratedCVHydratedDocument = HydratedDocument<GeneratedCVDocument>;

const generatedCvSchema = new Schema<GeneratedCVDocument>({
  cvProfileId: { type: Schema.Types.ObjectId, ref: 'CVProfile', required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
  content: { type: String, required: true },
  coverLetterContent: { type: String, required: true },
  provider: { type: String, enum: ['rule_based', 'manual_chatgpt', 'ollama'] },
  filePath: { type: String },
  pdfPath: { type: String },
  format: { type: String, enum: ['text', 'markdown', 'pdf', 'docx'], default: 'markdown', required: true },
  status: { type: String, enum: ['draft', 'ready', 'archived'], default: 'draft', required: true },
}, { timestamps: true });

export const GeneratedCVModel = models.GeneratedCV || model<GeneratedCVDocument>('GeneratedCV', generatedCvSchema);
