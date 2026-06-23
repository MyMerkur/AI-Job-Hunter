import mongoose, { type HydratedDocument } from 'mongoose';
import type { TaskStatus, TaskType } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

interface WorkerTaskLogDocument { message: string; createdAt: Date; }
interface WorkerTaskDocument { type: TaskType; payload: Record<string, unknown>; status: TaskStatus; attempts: number; error?: string; logs: WorkerTaskLogDocument[]; createdAt: Date; updatedAt: Date; }
export type WorkerTaskHydratedDocument = HydratedDocument<WorkerTaskDocument>;
const logSchema = new Schema<WorkerTaskLogDocument>({ message: { type: String, required: true }, createdAt: { type: Date, required: true } }, { _id: false });
const taskSchema = new Schema<WorkerTaskDocument>({
  type: { type: String, required: true, index: true }, payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, required: true, index: true }, attempts: { type: Number, required: true }, error: String, logs: { type: [logSchema], default: [] },
}, { timestamps: true, collection: 'tasks' });
taskSchema.index({ status: 1, createdAt: 1 });
export const WorkerTaskModel = models.WorkerTask || model<WorkerTaskDocument>('WorkerTask', taskSchema, 'tasks');
