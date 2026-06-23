import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { AIProviderName, GeneratedCvStatus } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

interface WorkerGeneratedCVDocument { cvProfileId: Types.ObjectId; jobId?: Types.ObjectId; content: string; coverLetterContent: string; provider?: AIProviderName; filePath?: string; pdfPath?: string; format: 'text' | 'markdown' | 'pdf' | 'docx'; status: GeneratedCvStatus; }
export type WorkerGeneratedCVHydratedDocument = HydratedDocument<WorkerGeneratedCVDocument>;

const generatedCvSchema = new Schema<WorkerGeneratedCVDocument>({
  cvProfileId: { type: Schema.Types.ObjectId, required: true }, jobId: { type: Schema.Types.ObjectId },
  content: { type: String, required: true }, coverLetterContent: { type: String, required: true },
  provider: String, filePath: String, pdfPath: String, format: { type: String, required: true }, status: { type: String, required: true },
}, { timestamps: true, collection: 'generatedcvs' });

export const WorkerGeneratedCVModel = models.WorkerGeneratedCV || model<WorkerGeneratedCVDocument>('WorkerGeneratedCV', generatedCvSchema, 'generatedcvs');
