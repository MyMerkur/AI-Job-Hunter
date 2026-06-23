import type { TaskType } from '@ai-job-hunter/shared';
import { env } from '../config/env.js';
import { WorkerTaskModel, type WorkerTaskHydratedDocument } from '../models/task.model.js';
import { assistApplication } from './application-assistant.js';
import { scoreJobs } from './job-scorer.js';
import { saveMockJobs } from './mock-scraper.js';
import { scrapeStartupJobs } from './startupjobs-scraper.js';

let processing = false;

async function runPrepareApplicationTask(task: WorkerTaskHydratedDocument): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/api/applications/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task.payload) });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`prepare_application API isteği başarısız oldu (HTTP ${response.status}): ${body.slice(0, 400)}`);
  }
}

async function dispatchTask(task: WorkerTaskHydratedDocument): Promise<void> {
  const type: TaskType = task.type;
  if (type === 'scrape_jobs') {
    const jobs = task.payload.source === 'mock' ? await saveMockJobs() : await scrapeStartupJobs();
    await scoreJobs(jobs);
    return;
  }
  if (type === 'score_jobs') { await scoreJobs(); return; }
  if (type === 'prepare_application') { await runPrepareApplicationTask(task); return; }
  if (type === 'start_application_assistant') {
    const applicationId = task.payload.applicationId;
    if (typeof applicationId !== 'string') throw new Error('start_application_assistant payload.applicationId gerekli.');
    await assistApplication(applicationId);
    return;
  }
  throw new Error(`Desteklenmeyen task türü: ${type}`);
}

export async function processNextTask(): Promise<boolean> {
  if (processing) return false;
  const now = new Date();
  const task = await WorkerTaskModel.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'running', error: undefined }, $inc: { attempts: 1 }, $push: { logs: { message: 'Worker görevi kilitledi ve çalıştırmaya başladı.', createdAt: now } } },
    { sort: { createdAt: 1 }, returnDocument: 'after' },
  );
  if (!task) return false;
  processing = true;
  try {
    await dispatchTask(task);
    await WorkerTaskModel.updateOne({ _id: task._id, status: 'running' }, { $set: { status: 'completed' }, $push: { logs: { message: 'Task başarıyla tamamlandı.', createdAt: new Date() } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await WorkerTaskModel.updateOne({ _id: task._id, status: 'running' }, { $set: { status: 'failed', error: message }, $push: { logs: { message: `Task başarısız oldu: ${message}`, createdAt: new Date() } } });
  } finally { processing = false; }
  return true;
}

export async function runTaskQueue(pollIntervalMs: number): Promise<void> {
  console.log(`Task queue ready (every ${pollIntervalMs}ms).`);
  while (true) {
    const processed = await processNextTask();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
