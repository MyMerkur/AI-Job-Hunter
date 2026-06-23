import { type FormEvent, useEffect, useState } from 'react';
import { getAIHealth, testAIConnection, type AIHealthResponse, type PreparationProvider } from '../lib/api.js';
import { getAISettings, saveAISettings, type AISettings } from '../lib/ai-settings.js';

const providerOptions: Array<{ value: PreparationProvider; label: string }> = [
  { value: 'auto', label: 'Auto — Ollama, sonra rule-based' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'rule_based', label: 'Rule based' },
  { value: 'manual_chatgpt', label: 'Manual ChatGPT' },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<AISettings>(() => getAISettings());
  const [health, setHealth] = useState<AIHealthResponse>();
  const [testResult, setTestResult] = useState<string>();
  const [error, setError] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);
  const [saved, setSaved] = useState(false);

  async function refreshHealth(nextSettings = settings): Promise<void> {
    setIsChecking(true); setError(undefined);
    try { setHealth(await getAIHealth(nextSettings)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'AI sağlık durumu alınamadı.'); }
    finally { setIsChecking(false); }
  }

  useEffect(() => { void refreshHealth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveAISettings(settings); setSaved(true); setTestResult(undefined);
    await refreshHealth(settings);
  }

  async function testConnection() {
    saveAISettings(settings); setSaved(true); setIsChecking(true); setError(undefined); setTestResult(undefined);
    try {
      const result = await testAIConnection(settings);
      setTestResult(`${result.providerUsed}: ${result.result}`);
      await refreshHealth(settings);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'AI bağlantı testi başarısız.'); setIsChecking(false); }
  }

  return <>
    <p className="eyebrow">AYARLAR</p><h1>AI ayarları</h1><p className="lede">Ayarlar bu tarayıcıda yerel olarak saklanır. Ücretli API kullanılmaz.</p>
    <section>
      <p className="section-label">SAĞLAYICI</p><h2>Yerel AI yapılandırması</h2>
      <form className="settings-form" onSubmit={(event) => void save(event)}>
        <label>Sağlayıcı modu<select value={settings.provider} onChange={(event) => setSettings((current) => ({ ...current, provider: event.target.value as PreparationProvider }))} disabled={isChecking}>{providerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Ollama base URL<input value={settings.ollamaBaseUrl} onChange={(event) => setSettings((current) => ({ ...current, ollamaBaseUrl: event.target.value }))} placeholder="http://localhost:11434" disabled={isChecking} /></label>
        <label>Ollama model<input value={settings.ollamaModel} onChange={(event) => setSettings((current) => ({ ...current, ollamaModel: event.target.value }))} placeholder="qwen2.5:7b" disabled={isChecking} /></label>
        <div className="settings-actions"><button type="submit" disabled={isChecking}>Ayarları kaydet</button><button type="button" className="secondary-button" onClick={() => void testConnection()} disabled={isChecking}>{isChecking ? 'Kontrol ediliyor…' : 'AI Connection Test'}</button></div>
      </form>
      {saved && <p className="settings-success">Ayarlar yerel olarak kaydedildi.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {testResult && <pre className="raw-text-preview">{testResult}</pre>}
    </section>
    <section>
      <p className="section-label">SAĞLIK DURUMU</p><h2>Provider health</h2>
      {!health && !error && <p className="muted">Sağlık durumu kontrol ediliyor…</p>}
      {health && <><div className="job-tags"><span className="badge">Kullanılan: {health.providerUsed}</span>{health.fallbackActive && <span className="badge">Fallback aktif</span>}</div><ul className="provider-health-list">{health.health.map((item) => <li key={item.provider}><span className={`health-state ${item.available ? 'available' : 'unavailable'}`}>{item.available ? 'Available' : 'Unavailable'}</span><div><strong>{item.provider}</strong><span>{item.message}</span></div></li>)}</ul>{health.warnings.map((warning) => <p key={warning} className="provider-warning">{warning}</p>)}</>}
    </section>
  </>;
}
