import type { Application, ApplicationLog, ApplicationStatus, CVProfile, GeneratedCV, HealthResponse, Job, JobStatus } from '@ai-job-hunter/shared';

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
    request.timeout = 45_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error('API ile bağlantı kurulamadı.'));
    request.ontimeout = () => reject(new Error('CV yükleme isteği 45 saniye içinde tamamlanmadı. API terminalindeki [cv-upload] loglarını kontrol edin.'));
    request.onload = () => {
      let payload: { profile?: ApiCvProfile; error?: string } = {};
      try {
        payload = request.responseText ? JSON.parse(request.responseText) as { profile?: ApiCvProfile; error?: string } : {};
      } catch {
        reject(new Error(`API geçerli JSON döndürmedi (HTTP ${request.status}). Doğru API sürecinin 3001 portunda çalıştığını kontrol edin.`));
        return;
      }
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

type ApiApplication = Omit<Application, 'id'> & { id?: string; _id?: string };
type ApiGeneratedCV = Omit<GeneratedCV, 'id'> & { id?: string; _id?: string };
type ApiApplicationLog = Omit<ApplicationLog, 'id'> & { id?: string; _id?: string };
function normalizeApplication(application: ApiApplication): Application { return { ...application, id: application.id ?? application._id ?? '' }; }
function normalizeGeneratedCV(generatedCv: ApiGeneratedCV): GeneratedCV { return { ...generatedCv, id: generatedCv.id ?? generatedCv._id ?? '' }; }
function normalizeLog(log: ApiApplicationLog): ApplicationLog { return { ...log, id: log.id ?? log._id ?? '' }; }

export interface ApplicationListItem { application: Application; job: Pick<Job, 'id' | 'title' | 'company' | 'score'> | null; }
export interface ApplicationDetail extends ApplicationListItem { generatedCv: GeneratedCV | null; logs: ApplicationLog[]; }

export async function getApplications(): Promise<ApplicationListItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/applications`);
  if (!response.ok) throw new Error(`Başvurular alınamadı: ${response.status}`);
  const payload = await response.json() as { applications: Array<{ application: ApiApplication; job: ApiJob | null }> };
  return payload.applications.map((item) => ({ application: normalizeApplication(item.application), job: item.job ? normalizeJob(item.job) : null }));
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const response = await fetch(`${apiBaseUrl}/api/applications/${id}`);
  if (!response.ok) throw new Error(`Başvuru detayı alınamadı: ${response.status}`);
  const payload = await response.json() as { application: ApiApplication; job: ApiJob | null; generatedCv: ApiGeneratedCV | null; logs: ApiApplicationLog[] };
  return { application: normalizeApplication(payload.application), job: payload.job ? normalizeJob(payload.job) : null, generatedCv: payload.generatedCv ? normalizeGeneratedCV(payload.generatedCv) : null, logs: payload.logs.map(normalizeLog) };
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application> {
  const response = await fetch(`${apiBaseUrl}/api/applications/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  const payload = await response.json() as { application?: ApiApplication; error?: string };
  if (!response.ok || !payload.application) throw new Error(payload.error ?? `Başvuru durumu güncellenemedi: ${response.status}`);
  return normalizeApplication(payload.application);
}

export type PreparationProvider = 'rule_based' | 'manual_chatgpt' | 'ollama';
export interface ApplicationPreparation {
  application: Application;
  generatedCv: GeneratedCV;
  analysis: { score: number; decision: 'apply' | 'maybe' | 'ignore'; positiveSignals: string[]; negativeSignals: string[]; risks: string[]; provider: string; manualPrompt?: string; promptPath?: string };
}

export async function prepareApplication(input: { jobId: string; cvProfileId: string; provider: PreparationProvider }): Promise<ApplicationPreparation> {
  const response = await fetch(`${apiBaseUrl}/api/applications/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const payload = await response.json() as { application?: ApiApplication; generatedCv?: ApiGeneratedCV; analysis?: ApplicationPreparation['analysis']; error?: string };
  if (!response.ok || !payload.application || !payload.generatedCv || !payload.analysis) throw new Error(payload.error ?? `Başvuru taslağı hazırlanamadı: ${response.status}`);
  return { application: normalizeApplication(payload.application), generatedCv: normalizeGeneratedCV(payload.generatedCv), analysis: payload.analysis };
}
