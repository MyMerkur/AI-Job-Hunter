import type { HealthResponse } from '@ai-job-hunter/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) throw new Error(`API yanıtı: ${response.status}`);
  return response.json() as Promise<HealthResponse>;
}
