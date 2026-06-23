import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import type { TaskStatus, TaskType } from '@ai-job-hunter/shared';
import { HttpError } from '../lib/http-error.js';
import { TaskModel } from '../models/task.model.js';

const taskTypes: TaskType[] = ['scrape_jobs', 'score_jobs', 'prepare_application', 'start_application_assistant'];
const taskStatuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed'];
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

export const taskRouter: ExpressRouter = Router();

taskRouter.post('/', async (request, response) => {
  const type = request.body?.type;
  if (typeof type !== 'string' || !taskTypes.includes(type as TaskType)) throw new HttpError(400, `type şu değerlerden biri olmalıdır: ${taskTypes.join(', ')}`);
  const payload = request.body?.payload ?? {};
  if (!isObject(payload)) throw new HttpError(400, 'payload bir nesne olmalıdır.');
  const task = await TaskModel.create({ type, payload, status: 'pending', attempts: 0, logs: [{ message: 'Task oluşturuldu ve worker kuyruğuna eklendi.', createdAt: new Date() }] });
  response.status(201).json({ task });
});

taskRouter.get('/', async (request, response) => {
  const status = request.query.status;
  if (status !== undefined && (typeof status !== 'string' || !taskStatuses.includes(status as TaskStatus))) throw new HttpError(400, `status şu değerlerden biri olmalıdır: ${taskStatuses.join(', ')}`);
  const tasks = await TaskModel.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100);
  response.json({ tasks });
});

taskRouter.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz task kimliği.');
  const task = await TaskModel.findById(request.params.id);
  if (!task) throw new HttpError(404, 'Task bulunamadı.');
  response.json({ task });
});
