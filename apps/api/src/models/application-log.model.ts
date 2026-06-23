import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema, model, models } = mongoose;

export interface ApplicationLogDocument { applicationId: Types.ObjectId; action: string; message: string; metadata?: Record<string, unknown>; createdAt: Date; }
export type ApplicationLogHydratedDocument = HydratedDocument<ApplicationLogDocument>;

const applicationLogSchema = new Schema<ApplicationLogDocument>({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  action: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ApplicationLogModel = models.ApplicationLog || model<ApplicationLogDocument>('ApplicationLog', applicationLogSchema);
