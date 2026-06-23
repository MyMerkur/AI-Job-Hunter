import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Job } from '@ai-job-hunter/shared';
import { getJob } from '../lib/api.js';
import { labelForStatus } from './JobsPage.js';

export function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job>(); const [error, setError] = useState<string>();
  useEffect(() => { if (jobId) void getJob(jobId).then(setJob).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'İş detayı alınamadı.')); }, [jobId]);
  if (error) return <><Link to="/jobs">İşlere dön</Link><p className="form-error">{error}</p></>;
  if (!job) return <p className="muted">İş detayı yükleniyor…</p>;
  return <>
    <Link to="/jobs">← İşlere dön</Link><p className="eyebrow">İŞ DETAYI</p><h1>{job.title}</h1><p className="lede">{job.company} · {job.location ?? 'Konum belirtilmedi'} · {job.remoteType}</p>
    <section><div className="job-tags"><span className="badge">{job.score ?? '—'} puan</span><span className="badge">{job.decision ?? 'puanlanmadı'}</span><span className="badge">{labelForStatus(job.status)}</span></div><p><a href={job.url} target="_blank" rel="noreferrer">Orijinal ilanı aç ↗</a></p><h2>Açıklama</h2><p className="job-description">{job.description}</p></section>
    <section><p className="section-label">PUANLAMA DETAYLARI</p><h2>İşaretler ve riskler</h2><SignalList title="Pozitif sinyaller" values={job.scoreDetails?.positiveSignals} empty="Henüz pozitif sinyal kaydedilmedi." /><SignalList title="Negatif sinyaller" values={job.scoreDetails?.negativeSignals} empty="Negatif sinyal yok." /><SignalList title="Riskler" values={job.scoreDetails?.risks} empty="Risk kaydedilmedi." /></section>
  </>;
}

function SignalList({ title, values, empty }: { title: string; values?: string[]; empty: string }) { return <div className="signal-group"><h3>{title}</h3>{values?.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="muted">{empty}</p>}</div>; }
