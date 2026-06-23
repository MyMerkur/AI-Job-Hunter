import { WorkerApplicationModel } from '../models/application.model.js';
import { WorkerAutomationSettingsModel, type WorkerAutomationSettingsDocument } from '../models/automation-settings.model.js';
import { WorkerCVProfileModel } from '../models/cv-profile.model.js';
import type { WorkerJobHydratedDocument } from '../models/job.model.js';
import { env } from '../config/env.js';

const defaults: WorkerAutomationSettingsDocument = {
  key: 'default', autoAnalyzeJobs: true, autoPrepareApplications: false, minScoreToPrepare: 70, minScoreToAssistant: 85,
  requireHumanReviewBeforeSubmit: true, blockedKeywords: ['senior', 'native czech', '5+ years'], preferredKeywords: ['react', 'node.js', 'typescript', 'junior', 'internship', 'part-time'],
};

async function getSettings(): Promise<WorkerAutomationSettingsDocument> {
  return await WorkerAutomationSettingsModel.findOne({ key: 'default' }).lean() ?? defaults;
}

function containsKeyword(text: string, keyword: string): boolean { return text.includes(keyword.trim().toLowerCase()); }

/** Creates only preparation drafts through the local API. It never queues an assistant or submits anything. */
export async function autoPrepareScrapedJobs(jobs: WorkerJobHydratedDocument[]): Promise<string[]> {
  const settings = await getSettings();
  if (!settings.autoPrepareApplications) return ['Otomatik hazırlama ayarlardan kapalı.'];
  const profile = await WorkerCVProfileModel.findOne({ rawText: { $type: 'string', $ne: '' } }).sort({ createdAt: -1 });
  if (!profile) return ['Otomatik hazırlama atlandı: kullanılabilir CV profili bulunamadı.'];
  const messages: string[] = [];
  for (const job of jobs) {
    const score = job.score ?? 0;
    const searchableText = `${job.title}\n${job.description}`.toLowerCase();
    const blocked = settings.blockedKeywords.find((keyword) => containsKeyword(searchableText, keyword));
    const preferred = settings.preferredKeywords.length === 0 || settings.preferredKeywords.some((keyword) => containsKeyword(searchableText, keyword));
    if (score < settings.minScoreToPrepare) { messages.push(`${job.title}: skor ${score}, hazırlama eşiği ${settings.minScoreToPrepare}; atlandı.`); continue; }
    if (blocked) { messages.push(`${job.title}: engellenen kelime bulundu (${blocked}); atlandı.`); continue; }
    if (!preferred) { messages.push(`${job.title}: tercih edilen kelime bulunamadı; atlandı.`); continue; }
    const exists = await WorkerApplicationModel.exists({ jobId: job._id, cvProfileId: profile._id });
    if (exists) { messages.push(`${job.title}: bu CV ile application kaydı zaten var; atlandı.`); continue; }
    const response = await fetch(`${env.apiBaseUrl}/api/applications/prepare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job._id.toString(), cvProfileId: profile._id.toString(), provider: 'auto' }),
    });
    if (response.ok) messages.push(`${job.title}: otomatik application taslağı hazırlandı.`);
    else messages.push(`${job.title}: otomatik hazırlama başarısız oldu (HTTP ${response.status}).`);
  }
  return messages;
}

export async function shouldAutoAnalyzeJobs(): Promise<boolean> { return (await getSettings()).autoAnalyzeJobs; }
