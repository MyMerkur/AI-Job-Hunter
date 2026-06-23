import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CVProfile, Job } from '@ai-job-hunter/shared';
import { getCvProfiles, getJob, prepareApplication, type ApplicationPreparation, type PreparationProvider } from '../lib/api.js';
import { labelForStatus } from './JobsPage.js';

const providers: Array<{ value: PreparationProvider; label: string; description: string }> = [
  { value: 'auto', label: 'Auto (önerilen)', description: 'Ollama kullanılabiliyorsa onu seçer; değilse Rule based sağlayıcıya düşer.' },
  { value: 'rule_based', label: 'Rule based', description: 'Ücretsiz, yerel şablon ve kurallarla taslak üretir.' },
  { value: 'manual_chatgpt', label: 'Manual ChatGPT', description: 'ChatGPT web arayüzüne yapıştırmanız için prompt üretir.' },
  { value: 'ollama', label: 'Ollama', description: 'Yerel Ollama entegrasyonu için güvenli placeholder.' },
];

export function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job>(); const [profiles, setProfiles] = useState<CVProfile[]>([]);
  const [cvProfileId, setCvProfileId] = useState(''); const [provider, setProvider] = useState<PreparationProvider>('auto');
  const [preparation, setPreparation] = useState<ApplicationPreparation>(); const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string>(); const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setIsLoading(true); setError(undefined);
    void Promise.all([getJob(jobId), getCvProfiles()]).then(([loadedJob, loadedProfiles]) => {
      setJob(loadedJob); setProfiles(loadedProfiles); if (loadedProfiles[0]) setCvProfileId(loadedProfiles[0].id);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'İş veya CV profilleri alınamadı.')).finally(() => setIsLoading(false));
  }, [jobId]);

  async function handlePrepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || !cvProfileId) return;
    setIsPreparing(true); setError(undefined); setPreparation(undefined);
    try { setPreparation(await prepareApplication({ jobId: job.id, cvProfileId, provider })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Başvuru taslağı hazırlanamadı.'); }
    finally { setIsPreparing(false); }
  }

  if (isLoading) return <p className="muted">İş detayı yükleniyor…</p>;
  if (error && !job) return <><Link to="/jobs">İşlere dön</Link><p className="form-error">{error}</p></>;
  if (!job) return null;
  return <>
    <Link to="/jobs">← İşlere dön</Link><p className="eyebrow">İŞ DETAYI</p><h1>{job.title}</h1><p className="lede">{job.company} · {job.location ?? 'Konum belirtilmedi'} · {job.remoteType}</p>
    <section><div className="job-tags"><span className="badge">{job.score ?? '—'} puan</span><span className="badge">{job.decision ?? 'puanlanmadı'}</span><span className="badge">{labelForStatus(job.status)}</span></div><p><a href={job.url} target="_blank" rel="noreferrer">Orijinal ilanı aç ↗</a></p><h2>Açıklama</h2><p className="job-description">{job.description}</p></section>
    <section><p className="section-label">PUANLAMA DETAYLARI</p><h2>İşaretler ve riskler</h2><SignalList title="Pozitif sinyaller" values={job.scoreDetails?.positiveSignals} empty="Henüz pozitif sinyal kaydedilmedi." /><SignalList title="Negatif sinyaller" values={job.scoreDetails?.negativeSignals} empty="Negatif sinyal yok." /><SignalList title="Riskler" values={job.scoreDetails?.risks} empty="Risk kaydedilmedi." /></section>
    <section><p className="section-label">PREPARE APPLICATION</p><h2>Başvuru taslağı hazırla</h2><p className="muted">Bu işlem CV ve cover letter taslağı üretir. Hiçbir başvuru gönderilmez.</p>{profiles.length === 0 ? <p className="form-error">Önce CV Upload sayfasından bir CV yükleyin.</p> : <form className="prepare-form" onSubmit={handlePrepare}><label>CV profili<select value={cvProfileId} onChange={(event) => setCvProfileId(event.target.value)} disabled={isPreparing}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label>Sağlayıcı<select value={provider} onChange={(event) => setProvider(event.target.value as PreparationProvider)} disabled={isPreparing}>{providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><p className="muted">{providers.find((item) => item.value === provider)?.description}</p><button type="submit" disabled={isPreparing || !cvProfileId}>{isPreparing ? 'Taslak hazırlanıyor…' : 'Prepare Application'}</button></form>}</section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {preparation && <PreparedApplication preparation={preparation} />}
  </>;
}

function PreparedApplication({ preparation }: { preparation: ApplicationPreparation }) {
  const [copied, setCopied] = useState(false);
  const isManual = preparation.generatedCv.provider === 'manual_chatgpt';
  const prompt = preparation.analysis.manualPrompt ?? `CV prompt:\n${preparation.generatedCv.content}\n\nCover letter prompt:\n${preparation.generatedCv.coverLetterContent}`;
  async function copyPrompt() { try { await navigator.clipboard.writeText(prompt); setCopied(true); } catch { setCopied(false); } }
  return <section><p className="section-label">TASLAK HAZIR</p><h2>Application durumu: {preparation.application.status}</h2><div className="job-tags"><span className="badge">{preparation.pipeline?.score ?? preparation.analysis.score} puan</span><span className="badge">{preparation.pipeline?.decision ?? preparation.analysis.decision}</span><span className="badge">Kullanılan: {preparation.provider}</span></div>{preparation.pipeline && <><h3>Pipeline kararı: {preparation.pipeline.decision}</h3><SignalList title="Pipeline riskleri" values={preparation.pipeline.risks} empty="Pipeline yüksek risk bulmadı." /><p className="muted">{preparation.pipeline.agentReports.map((agent) => `${agent.agent}: ${agent.status}`).join(' · ')}</p></>}{preparation.warnings.map((warning) => <p key={warning} className="provider-warning">{warning}</p>)}{isManual && <><button className="copy-button" onClick={() => void copyPrompt()}>{copied ? 'ChatGPT promptu kopyalandı' : 'ChatGPT promptunu kopyala'}</button><pre className="raw-text-preview">{prompt}</pre></>}<h3>Uyarlanmış CV (Markdown)</h3><pre className="raw-text-preview">{preparation.generatedCv.content}</pre><h3>Cover letter (Markdown)</h3><pre className="raw-text-preview">{preparation.generatedCv.coverLetterContent}</pre><p className="muted">Taslak Applications sayfasına kaydedildi. Göndermeden önce içeriği manuel inceleyin.</p></section>;
}

function SignalList({ title, values, empty }: { title: string; values?: string[]; empty: string }) { return <div className="signal-group"><h3>{title}</h3>{values?.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="muted">{empty}</p>}</div>; }
