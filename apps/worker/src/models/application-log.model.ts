import mongoose, { type Types } from 'mongoose';

const { Schema, model, models } = mongoose;

interface WorkerApplicationLogDocument { applicationId: Types.ObjectId; action: string; message: string; metadata?: Record<string, unknown>; }
const applicationLogSchema = new Schema<WorkerApplicationLogDocument>({
  applicationId: { type: Schema.Types.ObjectId, required: true, index: true }, action: { type: String, required: true },
  message: { type: String, required: true }, metadata: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'applicationlogs' });

export const WorkerApplicationLogModel = models.WorkerApplicationLog || model<WorkerApplicationLogDocument>('WorkerApplicationLog', applicationLogSchema, 'applicationlogs');
