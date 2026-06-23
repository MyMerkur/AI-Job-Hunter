import mongoose, { type HydratedDocument } from 'mongoose';

const { Schema, model, models } = mongoose;

export const automationSettingsDefaults = {
  autoAnalyzeJobs: true,
  autoPrepareApplications: false,
  minScoreToPrepare: 70,
  minScoreToAssistant: 85,
  requireHumanReviewBeforeSubmit: true as const,
  autoSubmitEnabled: false,
  blockedKeywords: ['senior', 'native czech', '5+ years'],
  preferredKeywords: ['react', 'node.js', 'typescript', 'junior', 'internship', 'part-time'],
};

export type AutomationSettingsDocument = typeof automationSettingsDefaults & { key: 'default'; };
export type AutomationSettingsHydratedDocument = HydratedDocument<AutomationSettingsDocument>;

const schema = new Schema<AutomationSettingsDocument>({
  key: { type: String, enum: ['default'], default: 'default', unique: true, required: true },
  autoAnalyzeJobs: { type: Boolean, default: automationSettingsDefaults.autoAnalyzeJobs, required: true },
  autoPrepareApplications: { type: Boolean, default: automationSettingsDefaults.autoPrepareApplications, required: true },
  minScoreToPrepare: { type: Number, default: automationSettingsDefaults.minScoreToPrepare, min: 0, max: 100, required: true },
  minScoreToAssistant: { type: Number, default: automationSettingsDefaults.minScoreToAssistant, min: 0, max: 100, required: true },
  requireHumanReviewBeforeSubmit: { type: Boolean, default: true, required: true },
  autoSubmitEnabled: { type: Boolean, default: false, required: true },
  blockedKeywords: { type: [String], default: automationSettingsDefaults.blockedKeywords },
  preferredKeywords: { type: [String], default: automationSettingsDefaults.preferredKeywords },
}, { timestamps: true, collection: 'automationsettings' });

export const AutomationSettingsModel = models.AutomationSettings || model<AutomationSettingsDocument>('AutomationSettings', schema, 'automationsettings');
