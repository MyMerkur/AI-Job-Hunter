import mongoose, { type HydratedDocument } from 'mongoose';

const { Schema, model, models } = mongoose;
export interface WorkerAutomationSettingsDocument { key: 'default'; autoAnalyzeJobs: boolean; autoPrepareApplications: boolean; minScoreToPrepare: number; minScoreToAssistant: number; requireHumanReviewBeforeSubmit: boolean; autoSubmitEnabled: boolean; blockedKeywords: string[]; preferredKeywords: string[]; }
export type WorkerAutomationSettingsHydratedDocument = HydratedDocument<WorkerAutomationSettingsDocument>;
const schema = new Schema<WorkerAutomationSettingsDocument>({
  key: { type: String, required: true }, autoAnalyzeJobs: { type: Boolean, required: true }, autoPrepareApplications: { type: Boolean, required: true },
  minScoreToPrepare: { type: Number, required: true }, minScoreToAssistant: { type: Number, required: true }, requireHumanReviewBeforeSubmit: { type: Boolean, required: true }, autoSubmitEnabled: { type: Boolean, default: false, required: true },
  blockedKeywords: { type: [String], default: [] }, preferredKeywords: { type: [String], default: [] },
}, { timestamps: true, collection: 'automationsettings' });
export const WorkerAutomationSettingsModel = models.WorkerAutomationSettings || model<WorkerAutomationSettingsDocument>('WorkerAutomationSettings', schema, 'automationsettings');
