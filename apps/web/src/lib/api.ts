import type { CVProfile, HealthResponse, Job, JobStatus } from '@ai-job-hunter/shared';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) throw new Error(`API yanıtı: ${response.status}`);
  return response.json() as Promise<HealthResponse>;
}

type ApiCvProfile = Omit<CVProfile, 'id'> & { id?: string; _id?: string };

function normalizeCvProfile(profile: ApiCvProfile): CVProfile {
  return { ...profile, id: profile.id ?? profile._id ?? '' };
}

export async function getCvProfiles(): Promise<CVProfile[]> {
  const response = await fetch(`${apiBaseUrl}/api/cv`);
  if (!response.ok) throw new Error(`CV listesi alınamadı: ${response.status}`);
  const payload = await response.json() as { profiles: ApiCvProfile[] };
  return payload.profiles.map(normalizeCvProfile);
}

export function uploadCv(file: File, name: string, onProgress: (percent: number) => void): Promise<CVProfile> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name.trim()) formData.append('name', name.trim());

    const request = new XMLHttpRequest();
    request.open('POST', `${apiBaseUrl}/api/cv/upload`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error('API ile bağlantı kurulamadı.'));
    request.onload = () => {
      const payload = request.responseText ? JSON.parse(request.responseText) as { profile?: ApiCvProfile; error?: string } : {};
      if (request.status >= 200 && request.status < 300 && payload.profile) resolve(normalizeCvProfile(payload.profile));
      else reject(new Error(payload.error ?? `Yükleme başarısız: ${request.status}`));
    };
    request.send(formData);
  });
}

type ApiJob = Omit<Job, 'id'> & { id?: string; _id?: string };
function normalizeJob(job: ApiJob): Job { return { ...job, id: job.id ?? job._id ?? '' }; }

export interface JobFilters { status?: JobStatus; minScore?: number; }

export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.minScore !== undefined) query.set('minScore', String(filters.minScore));
  const response = await fetch(`${apiBaseUrl}/api/jobs${query.size ? `?${query}` : ''}`);
  if (!response.ok) throw new Error(`İş listesi alınamadı: ${response.status}`);
  const payload = await response.json() as { jobs: ApiJob[] };
  return payload.jobs.map(normalizeJob);
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`${apiBaseUrl}/api/jobs/${id}`);
  if (!response.ok) throw new Error(`İş detayı alınamadı: ${response.status}`);
  const payload = await response.json() as { job: ApiJob };
  return normalizeJob(payload.job);
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  const response = await fetch(`${apiBaseUrl}/api/jobs/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  const payload = await response.json() as { job?: ApiJob; error?: string };
  if (!response.ok || !payload.job) throw new Error(payload.error ?? `İş durumu güncellenemedi: ${response.status}`);
  return normalizeJob(payload.job);
}
