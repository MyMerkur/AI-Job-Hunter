import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { ApplicationStatus } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

interface WorkerApplicationDocument { jobId: Types.ObjectId; cvProfileId: Types.ObjectId; generatedCvId?: Types.ObjectId; status: ApplicationStatus; appliedAt?: Date; notes?: string; }
export type WorkerApplicationHydratedDocument = HydratedDocument<WorkerApplicationDocument>;

const applicationSchema = new Schema<WorkerApplicationDocument>({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  cvProfileId: { type: Schema.Types.ObjectId, ref: 'CVProfile', required: true, index: true },
  generatedCvId: { type: Schema.Types.ObjectId, ref: 'GeneratedCV' },
  status: { type: String, required: true }, appliedAt: Date, notes: String,
}, { timestamps: true, collection: 'applications' });

export const WorkerApplicationModel = models.WorkerApplication || model<WorkerApplicationDocument>('WorkerApplication', applicationSchema, 'applications');
