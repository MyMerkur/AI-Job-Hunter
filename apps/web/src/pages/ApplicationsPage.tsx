import { useEffect, useState } from 'react';
import type { ApplicationStatus } from '@ai-job-hunter/shared';
import { exportGeneratedCvPdf, generatedCvMarkdownDownloadUrl, generatedCvPdfDownloadUrl, getApplication, getApplicationLogs, getApplications, startApplicationAssistant, type ApplicationAssistantTask, type ApplicationDetail, type ApplicationListItem, updateApplicationStatus } from '../lib/api.js';

const statuses: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'prepared', label: 'Hazırlandı' }, { value: 'reviewed', label: 'İncelendi' }, { value: 'applied', label: 'Başvuruldu' }, { value: 'rejected', label: 'Reddedildi' }, { value: 'failed', label: 'Başarısız' },
];

export function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [selected, setSelected] = useState<ApplicationDetail>();
  const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string>();
  useEffect(() => { void getApplications().then(setApplications).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Başvurular alınamadı.')).finally(() => setIsLoading(false)); }, []);
  async function openApplication(id: string) { try { setSelected(await getApplication(id)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Başvuru detayı alınamadı.'); } }
  async function changeStatus(id: string, status: ApplicationStatus) { try { const updated = await updateApplicationStatus(id, status); setApplications((items) => items.map((item) => item.application.id === id ? { ...item, application: updated } : item)); setSelected((current) => current?.application.id === id ? { ...current, application: updated } : current); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Durum güncellenemedi.'); } }
  return <>
    <p className="eyebrow">BAŞVURULAR</p><h1>Hazırlanan başvurular</h1><p className="lede">Taslakları inceleyin ve durumlarını takip edin. Bu sayfa hiçbir başvuruyu otomatik olarak göndermez.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section><div className="section-heading"><div><p className="section-label">TASLAKLAR</p><h2>Başvuru listesi</h2></div><span className="muted">{applications.length}</span></div>{isLoading ? <p className="muted">Başvurular yükleniyor…</p> : applications.length === 0 ? <p className="muted">Henüz hazırlanmış başvuru yok.</p> : <ul className="application-list">{applications.map((item) => <li key={item.application.id}><button className="application-select" onClick={() => void openApplication(item.application.id)}><strong>{item.job?.title ?? 'İş bulunamadı'}</strong><span>{item.job?.company ?? 'Şirket bulunamadı'} · {item.job?.score ?? '—'} puan</span></button><select value={item.application.status} onChange={(event) => void changeStatus(item.application.id, event.target.value as ApplicationStatus)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></li>)}</ul>}</section>
    {selected && <ApplicationDraft detail={selected} />}
  </>;
}

function ApplicationDraft({ detail }: { detail: ApplicationDetail }) {
  const [copied, setCopied] = useState(false);
  const [generatedCv, setGeneratedCv] = useState(detail.generatedCv);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string>();
  const [logs, setLogs] = useState(detail.logs);
  const [assistantTask, setAssistantTask] = useState<ApplicationAssistantTask>();
  const [isStartingAssistant, setIsStartingAssistant] = useState(false);
  const [assistantError, setAssistantError] = useState<string>();
  const isManual = generatedCv?.provider === 'manual_chatgpt';
  useEffect(() => { setGeneratedCv(detail.generatedCv); setLogs(detail.logs); }, [detail.generatedCv, detail.logs]);
  async function refreshLogs() { const result = await getApplicationLogs(detail.application.id); setLogs(result.logs); setAssistantTask(result.task ?? undefined); return result.task; }
  useEffect(() => {
    if (!assistantTask || !['pending', 'running'].includes(assistantTask.status)) return;
    const interval = window.setInterval(() => { void refreshLogs().catch((cause: unknown) => setAssistantError(cause instanceof Error ? cause.message : 'Loglar yenilenemedi.')); }, 3_000);
    return () => window.clearInterval(interval);
  }, [assistantTask?.status, detail.application.id]);
  async function copyPrompt() { if (!generatedCv) return; await navigator.clipboard.writeText(`CV prompt:\n${generatedCv.content}\n\nCover letter prompt:\n${generatedCv.coverLetterContent}`); setCopied(true); }
  async function createPdf() { if (!generatedCv) return; setIsExportingPdf(true); setExportError(undefined); try { setGeneratedCv(await exportGeneratedCvPdf(generatedCv.id)); } catch (cause) { setExportError(cause instanceof Error ? cause.message : 'PDF oluşturulamadı.'); } finally { setIsExportingPdf(false); } }
  async function startAssistant() { setIsStartingAssistant(true); setAssistantError(undefined); try { setAssistantTask(await startApplicationAssistant(detail.application.id)); await refreshLogs(); } catch (cause) { setAssistantError(cause instanceof Error ? cause.message : 'Asistan başlatılamadı.'); } finally { setIsStartingAssistant(false); } }
  return <section><p className="section-label">BAŞVURU TASLAĞI</p><h2>{detail.job?.title ?? 'İş kaydı'}</h2>{generatedCv && <div className="download-actions"><a className="copy-button" href={generatedCvMarkdownDownloadUrl(generatedCv.id)}>Markdown indir</a>{generatedCv.pdfPath ? <a className="copy-button" href={generatedCvPdfDownloadUrl(generatedCv.id)}>PDF indir</a> : <button className="copy-button" onClick={() => void createPdf()} disabled={isExportingPdf}>{isExportingPdf ? 'PDF oluşturuluyor…' : 'PDF oluştur'}</button>}</div>}{exportError && <p className="form-error">{exportError}</p>}<div className="assistant-panel"><h3>Application Assistant</h3><p className="muted">Playwright formu açmayı ve alanları doldurmayı dener. CAPTCHA’yı aşmaz ve submit düğmesine tıklamaz.</p><div className="download-actions"><button className="copy-button" onClick={() => void startAssistant()} disabled={isStartingAssistant || assistantTask?.status === 'pending' || assistantTask?.status === 'running'}>{isStartingAssistant ? 'Asistan kuyruğa ekleniyor…' : 'Start Assistant'}</button><button className="copy-button secondary-button" onClick={() => void refreshLogs().catch((cause: unknown) => setAssistantError(cause instanceof Error ? cause.message : 'Loglar yenilenemedi.'))}>Logları yenile</button></div>{assistantTask && <p className="muted">Görev durumu: <strong>{assistantTask.status}</strong>{assistantTask.error ? ` — ${assistantTask.error}` : ''}</p>}{assistantError && <p className="form-error">{assistantError}</p>}<p className="assistant-notice">Review manually. The assistant did not submit.</p>{logs.length > 0 && <ul className="assistant-log-list">{logs.map((log) => <li key={log.id}><strong>{log.action}</strong><span>{log.message}</span></li>)}</ul>}</div>{isManual && <button className="copy-button" onClick={() => void copyPrompt()}>{copied ? 'Kopyalandı' : 'ChatGPT promptunu kopyala'}</button>}<h3>Uyarlanmış CV (Markdown)</h3><pre className="raw-text-preview">{generatedCv?.content ?? 'Üretilen CV bulunamadı.'}</pre><h3>Cover letter (Markdown)</h3><pre className="raw-text-preview">{generatedCv?.coverLetterContent ?? 'Üretilen cover letter bulunamadı.'}</pre></section>;
}
