import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import type { CVProfile } from '@ai-job-hunter/shared';
import { getCvProfiles, uploadCv } from '../lib/api.js';

const acceptedTypes = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function CvUploadPage() {
  const [profiles, setProfiles] = useState<CVProfile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [name, setName] = useState('');
  const [progress, setProgress] = useState<number>();
  const [uploadedProfile, setUploadedProfile] = useState<CVProfile>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    void getCvProfiles().then(setProfiles).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'CV listesi alınamadı.');
    }).finally(() => setIsLoading(false));
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(undefined);
    if (!file) return setSelectedFile(undefined);
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      setSelectedFile(undefined);
      setError('Yalnızca PDF veya DOCX dosyası seçin.');
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return setError('Önce bir CV dosyası seçin.');
    setIsUploading(true); setProgress(0); setError(undefined); setUploadedProfile(undefined);
    try {
      const profile = await uploadCv(selectedFile, name, setProgress);
      setUploadedProfile(profile);
      setProfiles((current) => [profile, ...current]);
      setSelectedFile(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CV yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  }

  return <>
    <p className="eyebrow">CV PROFİLİ</p><h1>CV’nizi yükleyin</h1>
    <p className="lede">PDF veya DOCX dosyanız metne dönüştürülür ve iş eşleştirmesi için bir CV profili oluşturulur.</p>
    <section>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label htmlFor="cv-name">Profil adı <span className="muted">(isteğe bağlı)</span></label>
        <input id="cv-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Yazılım Geliştirici CV" disabled={isUploading} />
        <label className="file-picker" htmlFor="cv-file"><strong>{selectedFile ? selectedFile.name : 'PDF veya DOCX seçin'}</strong><span>{selectedFile ? formatFileSize(selectedFile.size) : 'En fazla 10 MB'}</span></label>
        <input id="cv-file" className="visually-hidden" type="file" accept={acceptedTypes} onChange={handleFileChange} disabled={isUploading} />
        {isUploading && <div className="progress" aria-label={`Yükleme: ${progress ?? 0}%`}><span style={{ width: `${progress ?? 0}%` }} /></div>}
        {isUploading && <p className="muted">{progress === 100 ? 'Dosya yüklendi. Sunucuda metin çıkarılıyor ve profil kaydediliyor…' : `Dosya yükleniyor… %${progress ?? 0}`}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={!selectedFile || isUploading}>{isUploading ? 'Yükleniyor…' : 'CV yükle'}</button>
      </form>
    </section>

    {uploadedProfile && <section><p className="section-label">YÜKLEME TAMAMLANDI</p><h2>{uploadedProfile.name}</h2><RawTextPreview text={uploadedProfile.rawText} /></section>}

    <section><div className="section-heading"><div><p className="section-label">KAYITLI PROFİLLER</p><h2>Yüklenen CV’ler</h2></div><span className="muted">{profiles.length}</span></div>
      {isLoading ? <p className="muted">CV’ler yükleniyor…</p> : profiles.length === 0 ? <p className="muted">Henüz CV yüklenmedi.</p> : <ul className="cv-list">{profiles.map((profile) => <li key={profile.id}><div><strong>{profile.name}</strong><span>{profile.sourceFileName ?? 'Dosya adı yok'} · {formatDate(profile.createdAt)}</span></div><span className="badge">{profile.status}</span></li>)}</ul>}
    </section>
  </>;
}

function RawTextPreview({ text }: { text?: string }) {
  if (!text) return <p className="muted">Bu dosyadan metin çıkarılamadı.</p>;
  const preview = text.length > 3_000 ? `${text.slice(0, 3_000)}…` : text;
  return <pre className="raw-text-preview">{preview}</pre>;
}

function formatFileSize(bytes: number): string { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatDate(value: string): string { return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)); }
