import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema, model, models } = mongoose;

export type ApplicationAssistantTaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export interface ApplicationAssistantTaskDocument { applicationId: Types.ObjectId; status: ApplicationAssistantTaskStatus; error?: string; startedAt?: Date; completedAt?: Date; }
export type ApplicationAssistantTaskHydratedDocument = HydratedDocument<ApplicationAssistantTaskDocument>;

const applicationAssistantTaskSchema = new Schema<ApplicationAssistantTaskDocument>({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued', required: true, index: true },
  error: { type: String }, startedAt: { type: Date }, completedAt: { type: Date },
}, { timestamps: true, collection: 'applicationassistanttasks' });

applicationAssistantTaskSchema.index({ applicationId: 1, status: 1 });
export const ApplicationAssistantTaskModel = models.ApplicationAssistantTask || model<ApplicationAssistantTaskDocument>('ApplicationAssistantTask', applicationAssistantTaskSchema, 'applicationassistanttasks');
