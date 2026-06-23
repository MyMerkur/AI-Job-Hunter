import { scoreJob } from '@ai-job-hunter/scoring';
import { WorkerCVProfileModel } from '../models/cv-profile.model.js';
import { WorkerJobModel, type WorkerJobHydratedDocument } from '../models/job.model.js';

const fallbackCvText = 'Computer science student with React, Node.js, TypeScript, JavaScript, MongoDB, Express and English skills.';

async function getCvRawText(): Promise<string> {
  const latestProfile = await WorkerCVProfileModel.findOne({ rawText: { $type: 'string', $ne: '' } }).sort({ createdAt: -1 });
  if (latestProfile?.rawText) return latestProfile.rawText;
  console.warn('No uploaded CV profile found; scoring with the built-in mock CV text.');
  return fallbackCvText;
}

export async function scoreJobs(jobs?: WorkerJobHydratedDocument[]): Promise<void> {
  const cvRawText = await getCvRawText();
  const records = jobs ?? await WorkerJobModel.find();
  for (const job of records) {
    const result = scoreJob({
      title: job.title, description: job.description, location: job.location,
      languageRequirement: job.languageRequirement, remoteType: job.remoteType, cvRawText,
    });
    await WorkerJobModel.updateOne({ _id: job._id }, { $set: { score: result.score, status: 'analyzed' } });
    console.log(`${job.title}: ${result.score}/100 (${result.decision})`);
  }
  console.log(`Scored ${records.length} job records.`);
}
