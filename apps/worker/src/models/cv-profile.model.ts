import mongoose, { type HydratedDocument } from 'mongoose';

const { Schema, model, models } = mongoose;

interface WorkerCVProfileDocument { name: string; rawText?: string; createdAt: Date; updatedAt: Date; }
export type WorkerCVProfileHydratedDocument = HydratedDocument<WorkerCVProfileDocument>;

const cvProfileSchema = new Schema<WorkerCVProfileDocument>({
  name: { type: String, required: true }, rawText: { type: String },
}, { timestamps: true, collection: 'cvprofiles' });

export const WorkerCVProfileModel = models.WorkerCVProfile || model<WorkerCVProfileDocument>('WorkerCVProfile', cvProfileSchema, 'cvprofiles');
