import mongoose, { type HydratedDocument } from 'mongoose';
import type { TaskStatus, TaskType } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

interface TaskLogDocument { message: string; createdAt: Date; }
export interface TaskDocument { type: TaskType; payload: Record<string, unknown>; status: TaskStatus; attempts: number; error?: string; logs: TaskLogDocument[]; }
export type TaskHydratedDocument = HydratedDocument<TaskDocument>;

const taskLogSchema = new Schema<TaskLogDocument>({ message: { type: String, required: true }, createdAt: { type: Date, required: true } }, { _id: false });
const taskSchema = new Schema<TaskDocument>({
  type: { type: String, enum: ['scrape_jobs', 'score_jobs', 'prepare_application', 'start_application_assistant'], required: true, index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending', required: true, index: true },
  attempts: { type: Number, default: 0, min: 0, required: true },
  error: { type: String }, logs: { type: [taskLogSchema], default: [] },
}, { timestamps: true, collection: 'tasks' });
taskSchema.index({ status: 1, createdAt: 1 });
export const TaskModel = models.Task || model<TaskDocument>('Task', taskSchema, 'tasks');
