import { WorkerJobModel, type WorkerJobDocument, type WorkerJobHydratedDocument } from '../models/job.model.js';

const sampleJobs: WorkerJobDocument[] = [
  { title: 'Junior React Developer', company: 'Demo Labs', location: 'Remote', url: 'https://example.test/jobs/junior-react', source: 'mock', description: 'Part-time remote internship for university students. React, Node.js, TypeScript, MongoDB and Express. English required.', remoteType: 'remote', languageRequirement: [{ language: 'English', required: true }], status: 'new' },
  { title: 'Senior Node.js Engineer', company: 'Demo Labs', location: 'Prague', url: 'https://example.test/jobs/senior-node', source: 'mock', description: '5+ years required. Full-time only. Native Czech required. Node.js and TypeScript.', remoteType: 'hybrid', languageRequirement: [{ language: 'Czech', level: 'native', required: true }], status: 'new' },
  { title: 'JavaScript Intern', company: 'Bright Start', location: 'Istanbul', url: 'https://example.test/jobs/javascript-intern', source: 'mock', description: 'Internship for students. Part-time JavaScript and React role. English required.', remoteType: 'onsite', languageRequirement: [{ language: 'English', required: true }], status: 'new' },
  { title: 'MongoDB Support Developer', company: 'Data Garden', location: 'Remote', url: 'https://example.test/jobs/mongodb-support', source: 'mock', description: 'Remote developer position using MongoDB, Express and JavaScript. English required.', remoteType: 'remote', languageRequirement: [{ language: 'English', required: true }], status: 'new' },
  { title: 'Frontend Developer', company: 'Craft Co.', location: 'Brno', url: 'https://example.test/jobs/frontend', source: 'mock', description: 'Full-time only frontend role. Czech required. React and TypeScript experience preferred.', remoteType: 'onsite', languageRequirement: [{ language: 'Czech', required: true }], status: 'new' },
];

/** Mock only: upserts five deterministic records. No external website is contacted. */
export async function saveMockJobs(): Promise<WorkerJobHydratedDocument[]> {
  const results = await Promise.all(sampleJobs.map((job) => WorkerJobModel.findOneAndUpdate(
    { source: job.source, url: job.url },
    { $set: { ...job, status: 'new' }, $unset: { score: 1, decision: 1 } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )));
  const jobs = results.filter((job): job is WorkerJobHydratedDocument => job !== null);
  console.log(`Mock scraper saved ${jobs.length} job records.`);
  return jobs;
}
