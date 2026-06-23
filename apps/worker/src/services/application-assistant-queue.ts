import { WorkerApplicationLogModel } from '../models/application-log.model.js';
import { WorkerApplicationAssistantTaskModel } from '../models/application-assistant-task.model.js';
import { assistApplication } from './application-assistant.js';

let processing = false;

export async function processNextApplicationAssistantTask(): Promise<boolean> {
  if (processing) return false;
  const task = await WorkerApplicationAssistantTaskModel.findOneAndUpdate(
    { status: 'queued' }, { $set: { status: 'running', startedAt: new Date(), error: undefined } },
    { sort: { createdAt: 1 }, returnDocument: 'after' },
  );
  if (!task) return false;
  processing = true;
  try {
    await WorkerApplicationLogModel.create({ applicationId: task.applicationId, action: 'assistant_started', message: 'Playwright application assistant başlatıldı. Submit işlemi devre dışıdır.' });
    await assistApplication(task.applicationId.toString());
    task.status = 'completed'; task.completedAt = new Date(); await task.save();
    await WorkerApplicationLogModel.create({ applicationId: task.applicationId, action: 'assistant_completed', message: 'Asistan formu inceleme için bıraktı. Başvuru gönderilmedi.' });
  } catch (error) {
    task.status = 'failed'; task.completedAt = new Date(); task.error = error instanceof Error ? error.message : String(error); await task.save();
  } finally { processing = false; }
  return true;
}

export async function runApplicationAssistantQueue(pollIntervalMs: number): Promise<void> {
  console.log(`Application assistant queue ready (every ${pollIntervalMs}ms).`);
  while (true) {
    const processed = await processNextApplicationAssistantTask();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
