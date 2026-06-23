import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// pnpm runs this app from apps/api; load the repository-level .env explicitly.
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDirectory, '../../../../.env');
config({ path: envPath });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Add it to ${envPath}`);
  }
  return value;
}

const parsedPort = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
  throw new Error('API_PORT must be a valid TCP port number.');
}

const parsedCvUploadMaxBytes = Number(process.env.CV_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
if (!Number.isSafeInteger(parsedCvUploadMaxBytes) || parsedCvUploadMaxBytes < 1) {
  throw new Error('CV_UPLOAD_MAX_BYTES must be a positive integer.');
}

export const env = {
  port: parsedPort,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongoUri: required('MONGODB_URI'),
  cvUploadMaxBytes: parsedCvUploadMaxBytes,
  cvUploadDirectory: resolve(currentDirectory, '../../../../uploads/cv'),
};
