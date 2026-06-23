import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema, model, models } = mongoose;

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';
interface WorkerApplicationAssistantTaskDocument { applicationId: Types.ObjectId; status: TaskStatus; error?: string; startedAt?: Date; completedAt?: Date; }
export type WorkerApplicationAssistantTaskHydratedDocument = HydratedDocument<WorkerApplicationAssistantTaskDocument>;

const taskSchema = new Schema<WorkerApplicationAssistantTaskDocument>({
  applicationId: { type: Schema.Types.ObjectId, required: true, index: true },
  status: { type: String, required: true, index: true }, error: String, startedAt: Date, completedAt: Date,
}, { timestamps: true, collection: 'applicationassistanttasks' });

export const WorkerApplicationAssistantTaskModel = models.WorkerApplicationAssistantTask || model<WorkerApplicationAssistantTaskDocument>('WorkerApplicationAssistantTask', taskSchema, 'applicationassistanttasks');
