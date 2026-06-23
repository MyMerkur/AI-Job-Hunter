import { connectToDatabase, disconnectFromDatabase } from './db/connect.js';
import { env } from './config/env.js';
import { saveMockJobs } from './services/mock-scraper.js';
import { scoreJobs } from './services/job-scorer.js';
import { scrapeStartupJobs } from './services/startupjobs-scraper.js';
import { assistApplication } from './services/application-assistant.js';

type WorkerCommand = 'scrape:startupjobs' | 'scrape:jobs' | 'scrape:mock' | 'score:jobs' | 'assist:application';

async function run(command: WorkerCommand | undefined, argument?: string): Promise<void> {
  if (!command) {
    console.log('Worker ready. Run a scrape, score, or assist:application command when needed.');
    await new Promise<void>(() => undefined);
    return;
  }
  if (!['scrape:startupjobs', 'scrape:jobs', 'scrape:mock', 'score:jobs', 'assist:application'].includes(command)) {
    throw new Error('Usage: scrape:startupjobs | scrape:jobs | scrape:mock | score:jobs | assist:application <applicationId>');
  }
  await connectToDatabase(env.mongoUri);
  try {
    if (command === 'score:jobs') await scoreJobs();
    else if (command === 'assist:application') {
      if (!argument) throw new Error('assist:application requires an application ID.');
      await assistApplication(argument);
    }
    else {
      const jobs = command === 'scrape:mock' ? await saveMockJobs() : await scrapeStartupJobs();
      await scoreJobs(jobs);
    }
  } finally {
    await disconnectFromDatabase();
  }
}

run(process.argv[2] as WorkerCommand | undefined, process.argv[3]).catch((error: unknown) => {
  console.error('Worker failed:', error);
  process.exitCode = 1;
});
