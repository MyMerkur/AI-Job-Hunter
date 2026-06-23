import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import type { HealthResponse } from '@ai-job-hunter/shared';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_request, response) => {
  const payload: HealthResponse = { status: 'ok', service: 'api' };
  response.json(payload);
});

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
