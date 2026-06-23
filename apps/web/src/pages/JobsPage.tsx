import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Job, JobStatus } from '@ai-job-hunter/shared';
import { getJobs, updateJobStatus } from '../lib/api.js';

const statuses: Array<{ value: JobStatus; label: string }> = [
  { value: 'new', label: 'Yeni' }, { value: 'saved', label: 'Kaydedildi' }, { value: 'ignored', label: 'Yoksayıldı' },
  { value: 'ready_to_apply', label: 'Başvuruya hazır' }, { value: 'applied', label: 'Başvuruldu' }, { value: 'failed', label: 'Başarısız' },
];

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [minScore, setMinScore] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const loadJobs = (filters = { status, minScore }) => {
    setIsLoading(true); setError(undefined);
    const score = filters.minScore === '' ? undefined : Number(filters.minScore);
    void getJobs({ status: filters.status || undefined, minScore: score }).then(setJobs).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'İşler alınamadı.')).finally(() => setIsLoading(false));
  };
  useEffect(() => { loadJobs({ status: '', minScore: '' }); }, []);
  function applyFilters(event: FormEvent) { event.preventDefault(); loadJobs(); }
  async function changeStatus(id: string, nextStatus: JobStatus) {
    try { const updated = await updateJobStatus(id, nextStatus); setJobs((current) => current.map((job) => job.id === id ? updated : job)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Durum güncellenemedi.'); }
  }
  return <>
    <p className="eyebrow">İŞLER</p><h1>İş fırsatları</h1>
    <section><form className="job-filters" onSubmit={applyFilters}><label>Durum<select value={status} onChange={(event) => setStatus(event.target.value as JobStatus | '')}><option value="">Tümü</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Minimum puan<input type="number" min="0" max="100" value={minScore} onChange={(event) => setMinScore(event.target.value)} placeholder="0–100" /></label><button type="submit">Filtrele</button></form></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section><div className="section-heading"><div><p className="section-label">SONUÇLAR</p><h2>İş listesi</h2></div><span className="muted">{jobs.length}</span></div>
      {isLoading ? <p className="muted">İşler yükleniyor…</p> : jobs.length === 0 ? <p className="muted">Bu filtrelerle eşleşen iş yok.</p> : <ul className="job-list">{jobs.map((job) => <li key={job.id}><div className="job-summary"><Link to={`/jobs/${job.id}`}><strong>{job.title}</strong></Link><span>{job.company} · {job.location ?? 'Konum belirtilmedi'} · {job.source}</span><div className="job-tags"><span className="badge">{job.score ?? '—'} puan</span><span className="badge">{job.decision ?? 'puanlanmadı'}</span><span className="badge">{labelForStatus(job.status)}</span></div></div><div className="job-actions"><button onClick={() => void changeStatus(job.id, 'saved')}>Kaydet</button><button onClick={() => void changeStatus(job.id, 'ignored')}>Yoksay</button><button onClick={() => void changeStatus(job.id, 'ready_to_apply')}>Başvuruya hazır</button></div></li>)}</ul>}
    </section>
  </>;
}

export function labelForStatus(status: JobStatus): string { return statuses.find((item) => item.value === status)?.label ?? status; }
