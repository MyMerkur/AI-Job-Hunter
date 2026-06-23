import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { ApplicationStatus } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

export interface ApplicationDocument { jobId: Types.ObjectId; cvProfileId: Types.ObjectId; generatedCvId?: Types.ObjectId; status: ApplicationStatus; appliedAt?: Date; notes?: string; }
export type ApplicationHydratedDocument = HydratedDocument<ApplicationDocument>;

const applicationSchema = new Schema<ApplicationDocument>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  cvProfileId: { type: Schema.Types.ObjectId, ref: 'CVProfile', required: true, index: true },
  generatedCvId: { type: Schema.Types.ObjectId, ref: 'GeneratedCV' },
  status: { type: String, enum: ['draft', 'ready_for_review', 'submitted', 'withdrawn', 'rejected', 'interviewing', 'offer'], default: 'draft', required: true },
  appliedAt: { type: Date }, notes: { type: String },
}, { timestamps: true });
applicationSchema.index({ jobId: 1, cvProfileId: 1 });

export const ApplicationModel = models.Application || model<ApplicationDocument>('Application', applicationSchema);
