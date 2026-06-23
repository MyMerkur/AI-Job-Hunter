import { Link, useParams } from 'react-router-dom';
export function JobDetailPage() { const { jobId } = useParams(); return <><p className="eyebrow">İŞ DETAYI</p><h1>İş kaydı</h1><section><p className="muted">İş kimliği: {jobId}</p><p>İlan, analiz ve CV eşleştirme bilgileri bu sayfada gösterilecek.</p><Link to="/jobs">İşlere dön</Link></section></>; }
