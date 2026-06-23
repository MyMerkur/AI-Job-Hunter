import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDirectory, '../../../../.env') });

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in the repository root .env file.');

export const env = {
  mongoUri: process.env.MONGODB_URI,
  playwrightHeadless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  applicationAssistantHeadless: process.env.APPLY_ASSISTANT_HEADLESS === 'true',
  applicationAssistantPollIntervalMs: Number(process.env.APPLICATION_ASSISTANT_POLL_INTERVAL_MS ?? 2_000),
  taskPollIntervalMs: Number(process.env.TASK_POLL_INTERVAL_MS ?? 2_000),
  apiBaseUrl: (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, ''),
  startupJobsBaseUrl: process.env.STARTUPJOBS_BASE_URL ?? 'https://www.startupjobs.cz',
  startupJobsSearchParam: process.env.STARTUPJOBS_SEARCH_PARAM ?? 'search',
  startupJobsRequestDelayMs: Number(process.env.STARTUPJOBS_REQUEST_DELAY_MS ?? 2_500),
  startupJobsMaxJobs: Number(process.env.STARTUPJOBS_MAX_JOBS ?? 20),
};
