import { WorkerApplicationModel } from '../models/application.model.js';
import { WorkerApplicationLogModel } from '../models/application-log.model.js';
import { WorkerAutomationSettingsModel, type WorkerAutomationSettingsDocument } from '../models/automation-settings.model.js';
import { WorkerCVProfileModel } from '../models/cv-profile.model.js';
import type { WorkerJobHydratedDocument } from '../models/job.model.js';
import { env } from '../config/env.js';
import { assistApplication } from './application-assistant.js';

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
    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}/api/applications/prepare`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job._id.toString(), cvProfileId: profile._id.toString(), provider: 'auto' }),
      });
    } catch (error) { messages.push(`${job.title}: otomatik hazırlama API bağlantısı başarısız oldu (${error instanceof Error ? error.message : 'bilinmeyen hata'}).`); continue; }
    if (!response.ok) { messages.push(`${job.title}: otomatik hazırlama başarısız oldu (HTTP ${response.status}).`); continue; }
    const prepared = await response.json() as { application?: { _id?: string; id?: string }; generatedCv?: { _id?: string; id?: string } };
    const applicationId = prepared.application?._id ?? prepared.application?.id;
    const generatedCvId = prepared.generatedCv?._id ?? prepared.generatedCv?.id;
    messages.push(`${job.title}: otomatik application taslağı hazırlandı.`);
    if (!applicationId || !generatedCvId) { messages.push(`${job.title}: PDF export atlandı; API yanıtında kimlik bulunamadı.`); continue; }
    let pdfResponse: Response;
    try { pdfResponse = await fetch(`${env.apiBaseUrl}/api/generated-cv/${generatedCvId}/export-pdf`, { method: 'POST' }); }
    catch (error) {
      messages.push(`${job.title}: PDF export bağlantısı başarısız oldu.`);
      await WorkerApplicationLogModel.create({ applicationId, action: 'cv_pdf_generation_failed', message: 'Otomatik PDF üretimi için API bağlantısı kurulamadı.', metadata: { error: error instanceof Error ? error.message : String(error) } });
      continue;
    }
    if (pdfResponse.ok) messages.push(`${job.title}: uyarlanmış CV PDF’i oluşturuldu.`);
    else {
      messages.push(`${job.title}: PDF export başarısız oldu (HTTP ${pdfResponse.status}).`);
      await WorkerApplicationLogModel.create({ applicationId, action: 'cv_pdf_generation_failed', message: 'Otomatik PDF üretimi başarısız oldu.', metadata: { status: pdfResponse.status } });
    }
    if (env.autoStartApplicationAssistant && score >= settings.minScoreToAssistant) {
      try {
        await WorkerApplicationLogModel.create({ applicationId, action: 'assistant_auto_started', message: 'Açıkça etkinleştirilen yerel ayar nedeniyle application assistant başlatıldı. Submit işlemi devre dışıdır.' });
        await assistApplication(applicationId);
        messages.push(`${job.title}: application assistant submit etmeden durdu.`);
      } catch (error) { messages.push(`${job.title}: application assistant başarısız oldu (${error instanceof Error ? error.message : 'bilinmeyen hata'}).`); }
    }
  }
  return messages;
}

export async function shouldAutoAnalyzeJobs(): Promise<boolean> { return (await getSettings()).autoAnalyzeJobs; }

export async function hasLatestCvProfile(): Promise<boolean> {
  return Boolean(await WorkerCVProfileModel.exists({ rawText: { $type: 'string', $ne: '' } }));
}
