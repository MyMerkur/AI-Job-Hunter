import { connectToDatabase, disconnectFromDatabase } from './db/connect.js';
import { env } from './config/env.js';
import { saveMockJobs } from './services/mock-scraper.js';
import { scoreJobs } from './services/job-scorer.js';
import { scrapeStartupJobs } from './services/startupjobs-scraper.js';

type WorkerCommand = 'scrape:startupjobs' | 'scrape:jobs' | 'scrape:mock' | 'score:jobs';

async function run(command: WorkerCommand | undefined): Promise<void> {
  if (!command || !['scrape:startupjobs', 'scrape:jobs', 'scrape:mock', 'score:jobs'].includes(command)) {
    throw new Error('Usage: scrape:startupjobs | scrape:jobs | scrape:mock | score:jobs');
  }
  await connectToDatabase(env.mongoUri);
  try {
    if (command === 'score:jobs') await scoreJobs();
    else {
      const jobs = command === 'scrape:mock' ? await saveMockJobs() : await scrapeStartupJobs();
      await scoreJobs(jobs);
    }
  } finally {
    await disconnectFromDatabase();
  }
}

run(process.argv[2] as WorkerCommand | undefined).catch((error: unknown) => {
  console.error('Worker failed:', error);
  process.exitCode = 1;
});
