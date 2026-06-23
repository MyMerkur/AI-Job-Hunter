import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CVProfile, Job } from '@ai-job-hunter/shared';
import { ApplicationPreparationStoppedError, getCvProfiles, getJob, prepareApplication, type ApplicationPreparation, type PreparationPipeline, type PreparationProvider } from '../lib/api.js';
import { getAISettings } from '../lib/ai-settings.js';
import { labelForStatus } from './JobsPage.js';

const agentNames = ['JobResearchAgent', 'FitAnalysisAgent', 'CVTailorAgent', 'CoverLetterAgent', 'DecisionAgent', 'SupervisorAgent'] as const;
const providers: Array<{ value: PreparationProvider; label: string; description: string }> = [
  { value: 'auto', label: 'Auto (önerilen)', description: 'Önce Ollama denenir; kullanılamazsa güvenli rule-based fallback çalışır.' },
  { value: 'rule_based', label: 'Rule based', description: 'Ücretsiz yerel kurallarla taslak üretir.' },
  { value: 'manual_chatgpt', label: 'Manual ChatGPT', description: 'ChatGPT web arayüzüne yapıştırmanız için prompt üretir.' },
  { value: 'ollama', label: 'Ollama', description: 'Yerel Ollama modeliyle pipeline çalıştırır.' },
];

export function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job>(); const [profiles, setProfiles] = useState<CVProfile[]>([]);
  const [cvProfileId, setCvProfileId] = useState(''); const [provider, setProvider] = useState<PreparationProvider>('auto');
  const [preparation, setPreparation] = useState<ApplicationPreparation>(); const [stoppedPipeline, setStoppedPipeline] = useState<PreparationPipeline>();
  const [isPreparing, setIsPreparing] = useState(false); const [activeAgent, setActiveAgent] = useState(0);
  const [error, setError] = useState<string>(); const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setIsLoading(true); setError(undefined);
    void Promise.all([getJob(jobId), getCvProfiles()]).then(([loadedJob, loadedProfiles]) => {
      setJob(loadedJob); setProfiles(loadedProfiles); if (loadedProfiles[0]) setCvProfileId(loadedProfiles[0].id);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'İş veya CV profilleri alınamadı.')).finally(() => setIsLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (!isPreparing) return;
    setActiveAgent(0);
    const interval = window.setInterval(() => setActiveAgent((current) => Math.min(current + 1, agentNames.length - 1)), 700);
    return () => window.clearInterval(interval);
  }, [isPreparing]);

  async function startPreparation(selectedProvider: PreparationProvider) {
    if (!job || !cvProfileId) return;
    setProvider(selectedProvider); setIsPreparing(true); setError(undefined); setPreparation(undefined); setStoppedPipeline(undefined);
    try {
      const settings = getAISettings();
      setPreparation(await prepareApplication({ jobId: job.id, cvProfileId, provider: selectedProvider, ollamaBaseUrl: settings.ollamaBaseUrl, ollamaModel: settings.ollamaModel }));
    } catch (cause) {
      if (cause instanceof ApplicationPreparationStoppedError) setStoppedPipeline(cause.pipeline);
      else setError(cause instanceof Error ? cause.message : 'Başvuru taslağı hazırlanamadı.');
    } finally { setIsPreparing(false); }
  }

  function handlePrepare(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void startPreparation(provider); }

  if (isLoading) return <p className="muted">İş detayı yükleniyor…</p>;
  if (error && !job) return <><Link to="/jobs">İşlere dön</Link><p className="form-error">{error}</p></>;
  if (!job) return null;
  return <>
    <Link to="/jobs">← İşlere dön</Link><p className="eyebrow">İŞ DETAYI</p><h1>{job.title}</h1><p className="lede">{job.company} · {job.location ?? 'Konum belirtilmedi'} · {job.remoteType}</p>
    <section><div className="job-tags"><span className="badge">{job.score ?? '—'} puan</span><span className="badge">{job.decision ?? 'puanlanmadı'}</span><span className="badge">{labelForStatus(job.status)}</span></div><p><a href={job.url} target="_blank" rel="noreferrer">Orijinal ilanı aç ↗</a></p><h2>Açıklama</h2><p className="job-description">{job.description}</p></section>
    <section><p className="section-label">PUANLAMA DETAYLARI</p><h2>İşaretler ve riskler</h2><SignalList title="Pozitif sinyaller" values={job.scoreDetails?.positiveSignals} empty="Henüz pozitif sinyal kaydedilmedi." /><SignalList title="Negatif sinyaller" values={job.scoreDetails?.negativeSignals} empty="Negatif sinyal yok." /><SignalList title="Riskler" values={job.scoreDetails?.risks} empty="Risk kaydedilmedi." /></section>
    <section><p className="section-label">AI PREPARATION</p><h2>AI ile başvuru taslağı hazırla</h2><p className="muted">CV ve cover letter üretilir; hiçbir başvuru asla gönderilmez.</p>{profiles.length === 0 ? <p className="form-error">Önce CV Upload sayfasından bir CV yükleyin.</p> : <form className="prepare-form" onSubmit={handlePrepare}><label>CV profili<select value={cvProfileId} onChange={(event) => setCvProfileId(event.target.value)} disabled={isPreparing}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label>Sağlayıcı<select value={provider} onChange={(event) => setProvider(event.target.value as PreparationProvider)} disabled={isPreparing}>{providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><p className="muted">{providers.find((item) => item.value === provider)?.description}</p><button type="button" onClick={() => void startPreparation('auto')} disabled={isPreparing || !cvProfileId}>{isPreparing ? 'AI hazırlanıyor…' : 'Auto Prepare with AI'}</button><button type="submit" className="secondary-button" disabled={isPreparing || !cvProfileId}>Seçili sağlayıcıyla hazırla</button></form>}{isPreparing && <AgentProgress activeAgent={activeAgent} />}</section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {stoppedPipeline && <StoppedPipeline pipeline={stoppedPipeline} />}
    {preparation && <PreparedApplication preparation={preparation} />}
  </>;
}

function AgentProgress({ activeAgent, reports }: { activeAgent?: number; reports?: PreparationPipeline['agentReports'] }) {
  return <div className="agent-progress"><h3>Agent ilerlemesi</h3><ol>{agentNames.map((name, index) => {
    const report = reports?.find((item) => item.agent === name);
    const status = report?.status ?? (activeAgent === undefined ? 'completed' : index < activeAgent ? 'completed' : index === activeAgent ? 'running' : 'queued');
    return <li key={name} className={status}><span>{status === 'completed' ? '✓' : status === 'running' ? '…' : status === 'stopped' ? '!' : '○'}</span><div><strong>{name}</strong>{report && <small>{report.summary}</small>}</div></li>;
  })}</ol></div>;
}

function StoppedPipeline({ pipeline }: { pipeline: PreparationPipeline }) {
  return <section><p className="section-label">PIPELINE DURDURULDU</p><h2>Karar: {pipeline.decision}</h2><p className="provider-warning">Yüksek risk nedeniyle taslak oluşturulmadı ve application kaydı yaratılmadı.</p><SignalList title="Riskler" values={pipeline.risks} empty="Risk detayı yok." />{pipeline.warnings.map((warning) => <p key={warning} className="provider-warning">{warning}</p>)}<AgentProgress reports={pipeline.agentReports} /></section>;
}

function PreparedApplication({ preparation }: { preparation: ApplicationPreparation }) {
  const [copied, setCopied] = useState(false);
  const isManual = preparation.generatedCv.provider === 'manual_chatgpt';
  const prompt = preparation.analysis.manualPrompt ?? `CV prompt:\n${preparation.generatedCv.content}\n\nCover letter prompt:\n${preparation.generatedCv.coverLetterContent}`;
  async function copyPrompt() { try { await navigator.clipboard.writeText(prompt); setCopied(true); } catch { setCopied(false); } }
  const pipeline = preparation.pipeline;
  return <section><p className="section-label">TASLAK HAZIR</p><h2>Application durumu: {preparation.application.status}</h2><div className="job-tags"><span className="badge">{pipeline?.score ?? preparation.analysis.score} puan</span><span className="badge">Karar: {pipeline?.decision ?? preparation.analysis.decision}</span><span className="badge">Kullanılan sağlayıcı: {preparation.provider}</span><span className="badge">Application record oluşturuldu</span></div>{preparation.warnings.map((warning) => <p key={warning} className="provider-warning">{warning}</p>)}{pipeline && <><SignalList title="Pipeline riskleri" values={pipeline.risks} empty="Pipeline yüksek risk bulmadı." /><AgentProgress reports={pipeline.agentReports} /></>}{isManual && <><button className="copy-button" onClick={() => void copyPrompt()}>{copied ? 'ChatGPT promptu kopyalandı' : 'ChatGPT promptunu kopyala'}</button><pre className="raw-text-preview">{prompt}</pre></>}<h3>Uyarlanmış CV (Markdown)</h3><pre className="raw-text-preview">{preparation.generatedCv.content}</pre><h3>Cover letter (Markdown)</h3><pre className="raw-text-preview">{preparation.generatedCv.coverLetterContent}</pre><p className="muted">Application record otomatik oluşturuldu. <Link to="/applications">Applications sayfasında incele</Link>. Göndermeden önce içeriği manuel inceleyin.</p></section>;
}

function SignalList({ title, values, empty }: { title: string; values?: string[]; empty: string }) { return <div className="signal-group"><h3>{title}</h3>{values?.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="muted">{empty}</p>}</div>; }
