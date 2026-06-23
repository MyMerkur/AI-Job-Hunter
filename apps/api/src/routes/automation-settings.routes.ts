import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AutomationSettingsModel, automationSettingsDefaults } from '../models/automation-settings.model.js';
import { HttpError } from '../lib/http-error.js';

function asBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new HttpError(400, `${name} true veya false olmalıdır.`);
  return value;
}
function asScore(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new HttpError(400, `${name} 0-100 arasında bir sayı olmalıdır.`);
  return value;
}
function asKeywords(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new HttpError(400, `${name} metin dizisi olmalıdır.`);
  const keywords = [...new Set(value.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  if (keywords.length > 30 || keywords.some((item) => item.length > 80)) throw new HttpError(400, `${name} çok uzun.`);
  return keywords;
}
async function settings() {
  return AutomationSettingsModel.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { key: 'default', ...automationSettingsDefaults } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
}

export const automationSettingsRouter: ExpressRouter = Router();
automationSettingsRouter.get('/', async (_request, response) => { response.json({ settings: await settings() }); });
automationSettingsRouter.put('/', async (request, response) => {
  const body = request.body ?? {};
  const update = {
    autoAnalyzeJobs: asBoolean(body.autoAnalyzeJobs, 'autoAnalyzeJobs'), autoPrepareApplications: asBoolean(body.autoPrepareApplications, 'autoPrepareApplications'),
    minScoreToPrepare: asScore(body.minScoreToPrepare, 'minScoreToPrepare'), minScoreToAssistant: asScore(body.minScoreToAssistant, 'minScoreToAssistant'),
    requireHumanReviewBeforeSubmit: true,
    autoSubmitEnabled: false,
    blockedKeywords: asKeywords(body.blockedKeywords, 'blockedKeywords'), preferredKeywords: asKeywords(body.preferredKeywords, 'preferredKeywords'),
  };
  const updated = await AutomationSettingsModel.findOneAndUpdate({ key: 'default' }, { $set: update, $setOnInsert: { key: 'default' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  response.json({ settings: updated });
});
