import { useEffect, useState, type CSSProperties } from 'react';
import { useSession } from '../../lib/session';
import { db } from '../../lib/store';
import type { PreRegLook } from '../../lib/types';
import { PreRegHeader } from '../PreRegister';

const blank: PreRegLook = {
  eyebrow: 'Ön kayıt formu', color: '#19b5c9', title: '',
  description: 'Bilgilerinizi gönderin. Kulüp ekibi başvurunuzu inceleyip sizinle iletişime geçecektir.', logoUrl: '', videoUrl: '',
};

export default function PreRegDesign() {
  const { club } = useSession();
  const [look, setLook] = useState<PreRegLook>(blank);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (club) setLook({ ...blank, color: club.color, ...club.preRegLook });
  }, [club?.id]);
  if (!club) return null;

  const link = `${location.origin}${location.pathname}#/on-kayit/${club.slug}`;
  const set = (key: keyof PreRegLook, value: string) => {
    setLook((l) => ({ ...l, [key]: value }));
    setStatus('');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus('Link kopyalandı.');
    } catch {
      setStatus('Kopyalanamadı, linki elle seçin.');
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Sekreter</p><h1>Ön kayıt sayfası görünümü</h1><p className="muted">Velilerin gördüğü formu özelleştirin.</p></div></header>
      <section className="card inline-form"><input aria-label="Ön kayıt linki" readOnly value={link} /><button onClick={copy}>Kopyala</button></section>
      <div className="two-col">
        <section className="card stack">
          <label>Üst etiket<input value={look.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></label>
          <label>Tema rengi<input type="color" value={look.color} onChange={(e) => set('color', e.target.value)} /></label>
          <label>Başlık (boşsa kulüp adı)<input value={look.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label>Açıklama metni<textarea rows={3} value={look.description} onChange={(e) => set('description', e.target.value)} /></label>
          <label>Form logosu (isteğe bağlı)<input type="url" placeholder="https://" value={look.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} /></label>
          <label>Tanıtım videosu (YouTube/Vimeo)<input type="url" placeholder="https://www.youtube.com/watch?v=..." value={look.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} /></label>
          <div className="form-actions">
            <button className="primary" onClick={async () => { await db.update('clubs', club.id, { preRegLook: look }); setStatus('Görünüm kaydedildi.'); }}>Görünümü Kaydet</button>
            <a className="button" href={link} target="_blank" rel="noreferrer">Önizle</a>
            {status && <span className="ok" role="status">{status}</span>}
          </div>
        </section>
        <section className="card" style={{ '--accent': look.color } as CSSProperties}><PreRegHeader club={club} look={look} /></section>
      </div>
    </div>
  );
}
