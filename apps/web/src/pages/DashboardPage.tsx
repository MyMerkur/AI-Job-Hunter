import { useEffect, useState } from 'react';
import type { HealthResponse } from '@ai-job-hunter/shared';
import { getHealth } from '../lib/api.js';

export function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse>();
  const [error, setError] = useState<string>();

  useEffect(() => { void getHealth().then(setHealth).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'API durumuna ulaşılamadı.')); }, []);
  const label = error ? 'Bağlanılamıyor' : health ? health.status === 'ok' ? 'Çalışıyor' : 'Kısmi erişim' : 'Kontrol ediliyor';

  return <>
    <p className="eyebrow">GENEL BAKIŞ</p><h1>İş aramanız için sakin bir kontrol merkezi.</h1>
    <p className="lede">CV’nizi hazırlayın, uygun işleri değerlendirin ve başvuru taslaklarını göndermeden önce inceleyin.</p>
    <section className="health-card"><div><p className="section-label">API DURUMU</p><h2>{label}</h2><p className="muted">{error ?? (health ? `Veritabanı: ${health.database}` : 'Yerel API kontrol ediliyor…')}</p></div><span className={`status-dot ${health?.status === 'ok' ? 'ok' : 'pending'}`} aria-label={label} /></section>
    <section><h2>Sıradaki adımlar</h2><ol className="checklist"><li>CV profilinizi yükleyin.</li><li>İş kaynaklarını ekleyin ve uygunluğu değerlendirin.</li><li>Başvuru taslaklarını inceleyin.</li></ol></section>
  </>;
}
