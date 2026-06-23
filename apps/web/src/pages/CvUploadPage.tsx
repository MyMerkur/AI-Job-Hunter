export function CvUploadPage() { return <Page title="CV yükle" description="CV yükleme ve metin ayrıştırma burada yer alacak. Dosya yükleme henüz etkin değil." />; }
function Page({ title, description }: { title: string; description: string }) { return <><p className="eyebrow">YAKINDA</p><h1>{title}</h1><section><p className="muted">{description}</p></section></>; }
