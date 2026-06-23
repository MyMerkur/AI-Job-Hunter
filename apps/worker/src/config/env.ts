import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDirectory, '../../../../.env') });

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in the repository root .env file.');

export const env = {
  mongoUri: process.env.MONGODB_URI,
  playwrightHeadless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
};
