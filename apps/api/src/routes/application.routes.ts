import { ManualChatGPTProvider, OllamaProvider, RuleBasedAIProvider, type AIProvider } from '@ai-job-hunter/ai';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../lib/http-error.js';
import { ApplicationLogModel } from '../models/application-log.model.js';
import { ApplicationModel } from '../models/application.model.js';
import { CVProfileModel } from '../models/cv-profile.model.js';
import { GeneratedCVModel } from '../models/generated-cv.model.js';
import { JobModel } from '../models/job.model.js';

type ProviderName = 'rule_based' | 'manual_chatgpt' | 'ollama';
const providerNames: ProviderName[] = ['rule_based', 'manual_chatgpt', 'ollama'];

function createProvider(name: ProviderName): AIProvider {
  if (name === 'manual_chatgpt') return new ManualChatGPTProvider();
  if (name === 'ollama') return new OllamaProvider();
  return new RuleBasedAIProvider();
}

function requiredObjectId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) throw new HttpError(400, `${name} geçerli bir MongoDB kimliği olmalıdır.`);
  return value;
}

export const applicationRouter: ExpressRouter = Router();

applicationRouter.post('/prepare', async (request, response) => {
  const jobId = requiredObjectId(request.body?.jobId, 'jobId');
  const cvProfileId = requiredObjectId(request.body?.cvProfileId, 'cvProfileId');
  const providerName = request.body?.provider;
  if (typeof providerName !== 'string' || !providerNames.includes(providerName as ProviderName)) {
    throw new HttpError(400, `provider şu değerlerden biri olmalıdır: ${providerNames.join(', ')}`);
  }

  const [job, cvProfile] = await Promise.all([JobModel.findById(jobId), CVProfileModel.findById(cvProfileId)]);
  if (!job) throw new HttpError(404, 'Job bulunamadı.');
  if (!cvProfile) throw new HttpError(404, 'CV profili bulunamadı.');
  if (!cvProfile.rawText?.trim()) throw new HttpError(422, 'CV profilinde analiz edilecek ham metin bulunamadı.');

  const provider = createProvider(providerName as ProviderName);
  const providerInput = {
    job: { title: job.title, company: job.company, description: job.description, location: job.location, remoteType: job.remoteType, languageRequirement: job.languageRequirement, url: job.url },
    cvRawText: cvProfile.rawText,
  };
  const [analysis, tailoredCv, coverLetter] = await Promise.all([
    provider.analyzeJob(providerInput),
    provider.tailorCV(providerInput),
    provider.generateCoverLetter(providerInput),
  ]);

  const generatedCv = await GeneratedCVModel.create({
    cvProfileId: cvProfile._id, jobId: job._id, content: tailoredCv.content, coverLetterContent: coverLetter.content,
    format: 'markdown', status: 'ready',
  });
  const application = await ApplicationModel.create({
    jobId: job._id, cvProfileId: cvProfile._id, generatedCvId: generatedCv._id, status: 'prepared',
  });
  const promptPaths = [analysis.promptPath, tailoredCv.promptPath, coverLetter.promptPath].filter((path): path is string => Boolean(path));
  await ApplicationLogModel.insertMany([
    { applicationId: application._id, action: 'job_analyzed', message: `Job ${provider.name} sağlayıcısıyla analiz edildi.`, metadata: { provider: provider.name, score: analysis.score, decision: analysis.decision, isPlaceholder: analysis.isPlaceholder ?? false, promptPaths } },
    { applicationId: application._id, action: 'cv_generated', message: 'Uyarlanmış CV markdown taslağı oluşturuldu.', metadata: { provider: tailoredCv.provider, isPlaceholder: tailoredCv.isPlaceholder ?? false, promptPath: tailoredCv.promptPath } },
    { applicationId: application._id, action: 'cover_letter_generated', message: 'Cover letter markdown taslağı oluşturuldu.', metadata: { provider: coverLetter.provider, isPlaceholder: coverLetter.isPlaceholder ?? false, promptPath: coverLetter.promptPath } },
    { applicationId: application._id, action: 'application_prepared', message: 'Başvuru taslağı hazırlandı; hiçbir başvuru gönderilmedi.', metadata: { status: 'prepared' } },
  ]);

  response.status(201).json({ application, generatedCv, analysis });
});

applicationRouter.get('/', async (_request, response) => {
  const applications = await ApplicationModel.find().sort({ createdAt: -1 });
  response.json({ applications });
});

applicationRouter.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz application kimliği.');
  const application = await ApplicationModel.findById(request.params.id);
  if (!application) throw new HttpError(404, 'Application bulunamadı.');
  const [generatedCv, logs] = await Promise.all([
    application.generatedCvId ? GeneratedCVModel.findById(application.generatedCvId) : null,
    ApplicationLogModel.find({ applicationId: application._id }).sort({ createdAt: 1 }),
  ]);
  response.json({ application, generatedCv, logs });
});
