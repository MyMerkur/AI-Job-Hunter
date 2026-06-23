import { AIOrchestrator, OllamaProvider, SupervisorAgent, type ApplicationPreparationPipelineOutput, type RequestedProvider } from '@ai-job-hunter/ai';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import type { ApplicationStatus } from '@ai-job-hunter/shared';
import { HttpError } from '../lib/http-error.js';
import { ApplicationLogModel } from '../models/application-log.model.js';
import { ApplicationModel } from '../models/application.model.js';
import { CVProfileModel } from '../models/cv-profile.model.js';
import { GeneratedCVModel } from '../models/generated-cv.model.js';
import { JobModel } from '../models/job.model.js';
import { parseOllamaConfig } from '../services/ollama-config.js';

const providerNames: RequestedProvider[] = ['auto', 'rule_based', 'manual_chatgpt', 'ollama'];
const editableStatuses: ApplicationStatus[] = ['prepared', 'reviewed', 'applied', 'rejected', 'failed'];

function requiredObjectId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) throw new HttpError(400, `${name} geçerli bir MongoDB kimliği olmalıdır.`);
  return value;
}

export const applicationRouter: ExpressRouter = Router();

applicationRouter.post('/prepare', async (request, response) => {
  const jobId = requiredObjectId(request.body?.jobId, 'jobId');
  const cvProfileId = requiredObjectId(request.body?.cvProfileId, 'cvProfileId');
  const providerName = request.body?.provider;
  if (typeof providerName !== 'string' || !providerNames.includes(providerName as RequestedProvider)) {
    throw new HttpError(400, `provider şu değerlerden biri olmalıdır: ${providerNames.join(', ')}`);
  }

  const [job, cvProfile] = await Promise.all([JobModel.findById(jobId), CVProfileModel.findById(cvProfileId)]);
  if (!job) throw new HttpError(404, 'Job bulunamadı.');
  if (!cvProfile) throw new HttpError(404, 'CV profili bulunamadı.');
  if (!cvProfile.rawText?.trim()) throw new HttpError(422, 'CV profilinde analiz edilecek ham metin bulunamadı.');

  const providerInput = {
    job: { title: job.title, company: job.company, source: job.source, description: job.description, location: job.location, remoteType: job.remoteType, languageRequirement: job.languageRequirement, url: job.url },
    cvRawText: cvProfile.rawText,
  };
  const requestedProvider = providerName as RequestedProvider;
  const usePipeline = requestedProvider === 'auto' || requestedProvider === 'ollama';
  const ollamaConfig = parseOllamaConfig({ baseUrl: request.body?.ollamaBaseUrl, model: request.body?.ollamaModel });
  const orchestrator = new AIOrchestrator(new OllamaProvider(ollamaConfig.baseUrl, ollamaConfig.model));
  const orchestrationRun = await orchestrator.runWithProvider(requestedProvider, async (provider) => {
    if (usePipeline) return new SupervisorAgent().run(providerInput, provider);
    const [analysis, tailoredCv, coverLetter] = await Promise.all([
      provider.analyzeJob(providerInput), provider.tailorCV(providerInput), provider.generateCoverLetter(providerInput),
    ]);
    return { analysis, tailoredCvMarkdown: tailoredCv.content, coverLetterMarkdown: coverLetter.content, warnings: [], agentReports: [] };
  });
  const orchestration = orchestrationRun.selection;
  const result = orchestrationRun.result;
  const pipeline = usePipeline ? result as ApplicationPreparationPipelineOutput : undefined;
  if (pipeline?.stopped) {
    response.status(422).json({ error: 'Yüksek risk nedeniyle application preparation pipeline durduruldu.', pipeline: { ...pipeline, providerUsed: orchestration.resolvedProvider, warnings: [...orchestration.warnings, ...pipeline.warnings] } });
    return;
  }
  const analysis = result.analysis;
  const tailoredCvMarkdown = result.tailoredCvMarkdown;
  const coverLetterMarkdown = result.coverLetterMarkdown;
  const warnings = [...orchestration.warnings, ...result.warnings];
  const provider = orchestration.provider;

  const generatedCv = await GeneratedCVModel.create({
    cvProfileId: cvProfile._id, jobId: job._id, content: tailoredCvMarkdown, coverLetterContent: coverLetterMarkdown,
    provider: orchestration.resolvedProvider, format: 'markdown', status: 'ready',
  });
  const application = await ApplicationModel.create({
    jobId: job._id, cvProfileId: cvProfile._id, generatedCvId: generatedCv._id, status: 'prepared',
  });
  const promptPaths = [analysis.promptPath].filter((path): path is string => Boolean(path));
  await ApplicationLogModel.insertMany([
    { applicationId: application._id, action: 'job_analyzed', message: `Job ${provider.name} sağlayıcısıyla analiz edildi.`, metadata: { requestedProvider: orchestration.requestedProvider, provider: orchestration.resolvedProvider, score: analysis.score, decision: analysis.decision, isPlaceholder: analysis.isPlaceholder ?? false, promptPaths } },
    { applicationId: application._id, action: 'cv_generated', message: 'Uyarlanmış CV markdown taslağı oluşturuldu.', metadata: { provider: orchestration.resolvedProvider } },
    { applicationId: application._id, action: 'cover_letter_generated', message: 'Cover letter markdown taslağı oluşturuldu.', metadata: { provider: orchestration.resolvedProvider } },
    { applicationId: application._id, action: 'application_prepared', message: 'Başvuru taslağı hazırlandı; hiçbir başvuru gönderilmedi.', metadata: { status: 'prepared', requestedProvider: orchestration.requestedProvider, resolvedProvider: orchestration.resolvedProvider, warnings, agentReports: pipeline?.agentReports ?? [] } },
  ]);

  response.status(201).json({ application, generatedCv, analysis, provider: orchestration.resolvedProvider, warnings, pipeline: pipeline ? { ...pipeline, providerUsed: orchestration.resolvedProvider, warnings } : undefined });
});

applicationRouter.get('/', async (_request, response) => {
  const applications = await ApplicationModel.find().sort({ createdAt: -1 });
  const jobs = await JobModel.find({ _id: { $in: applications.map((application) => application.jobId) } }).select('title company score');
  const jobsById = new Map(jobs.map((job) => [job._id.toString(), job]));
  response.json({ applications: applications.map((application) => ({ application, job: jobsById.get(application.jobId.toString()) ?? null })) });
});

applicationRouter.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz application kimliği.');
  const application = await ApplicationModel.findById(request.params.id);
  if (!application) throw new HttpError(404, 'Application bulunamadı.');
  const [generatedCv, logs, job] = await Promise.all([
    application.generatedCvId ? GeneratedCVModel.findById(application.generatedCvId) : null,
    ApplicationLogModel.find({ applicationId: application._id }).sort({ createdAt: 1 }),
    JobModel.findById(application.jobId).select('title company score'),
  ]);
  response.json({ application, generatedCv, logs, job });
});

applicationRouter.patch('/:id/status', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz application kimliği.');
  const status = request.body?.status;
  if (typeof status !== 'string' || !editableStatuses.includes(status as ApplicationStatus)) {
    throw new HttpError(400, `status şu değerlerden biri olmalıdır: ${editableStatuses.join(', ')}`);
  }
  const application = await ApplicationModel.findByIdAndUpdate(request.params.id, { $set: { status } }, { returnDocument: 'after' });
  if (!application) throw new HttpError(404, 'Application bulunamadı.');
  await ApplicationLogModel.create({ applicationId: application._id, action: 'application_status_updated', message: `Application durumu ${status} olarak güncellendi.`, metadata: { status } });
  response.json({ application });
});
