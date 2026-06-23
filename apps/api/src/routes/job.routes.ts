import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import type { JobDecision, JobStatus } from '@ai-job-hunter/shared';
import { HttpError } from '../lib/http-error.js';
import { JobModel } from '../models/job.model.js';

const jobStatuses: JobStatus[] = ['new', 'saved', 'ignored', 'ready_to_apply', 'applied', 'failed'];
const decisions: JobDecision[] = ['apply', 'maybe', 'ignore'];

function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export const jobRouter: ExpressRouter = Router();

jobRouter.get('/', async (request, response) => {
  const source = queryValue(request.query.source);
  const status = queryValue(request.query.status);
  const decision = queryValue(request.query.decision);
  const minScoreValue = queryValue(request.query.minScore);
  if (status && !jobStatuses.includes(status as JobStatus)) throw new HttpError(400, 'Geçersiz job status filtresi.');
  if (decision && !decisions.includes(decision as JobDecision)) throw new HttpError(400, 'Geçersiz decision filtresi.');

  const filter: Record<string, unknown> = {};
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (decision) filter.decision = decision;
  if (minScoreValue !== undefined) {
    const minScore = Number(minScoreValue);
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) throw new HttpError(400, 'minScore 0 ile 100 arasında bir sayı olmalıdır.');
    filter.score = { $gte: minScore };
  }

  const jobs = await JobModel.find(filter).sort({ score: -1, createdAt: -1 });
  response.json({ jobs });
});

jobRouter.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz job kimliği.');
  const job = await JobModel.findById(request.params.id);
  if (!job) throw new HttpError(404, 'Job bulunamadı.');
  response.json({ job });
});

jobRouter.patch('/:id/status', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz job kimliği.');
  const status = request.body?.status;
  if (typeof status !== 'string' || !jobStatuses.includes(status as JobStatus)) {
    throw new HttpError(400, `status şu değerlerden biri olmalıdır: ${jobStatuses.join(', ')}`);
  }
  const job = await JobModel.findByIdAndUpdate(request.params.id, { $set: { status } }, { returnDocument: 'after' });
  if (!job) throw new HttpError(404, 'Job bulunamadı.');
  response.json({ job });
});
