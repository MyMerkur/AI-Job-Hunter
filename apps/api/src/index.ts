import { app } from './app.js';
import { env } from './config/env.js';
import { connectToDatabase } from './db/connect.js';

async function start(): Promise<void> {
  await connectToDatabase(env.mongoUri);
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('Failed to start API:', error);
  process.exitCode = 1;
});
