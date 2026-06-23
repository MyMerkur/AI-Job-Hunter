import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { HealthResponse } from '@ai-job-hunter/shared';
import { env } from './config/env.js';
import { isDatabaseConnected } from './db/connect.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { cvRouter } from './routes/cv.routes.js';
import { jobRouter } from './routes/job.routes.js';
import { applicationRouter } from './routes/application.routes.js';

export const app: Express = express();

app.use(requestLogger);
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (_request, response) => {
  const database = isDatabaseConnected() ? 'connected' : 'disconnected';
  const payload: HealthResponse = {
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'api',
    database,
  };
  response.status(database === 'connected' ? 200 : 503).json(payload);
});

app.use('/api/cv', cvRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/applications', applicationRouter);

app.use(notFoundHandler);
app.use(errorHandler);
