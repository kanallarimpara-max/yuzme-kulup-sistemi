import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { createParentAccount } from '../lib/session';
import { db, useCollection } from '../lib/store';
import type { Branch, Club, Lesson, PreReg, PreRegLook, TrainingModel } from '../lib/types';

export function videoEmbed(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
}

export function PreRegHeader({ club, look }: { club: Club; look: Partial<PreRegLook> }) {
  const logo = look.logoUrl || club.logoUrl;
  const video = look.videoUrl ? videoEmbed(look.videoUrl) : null;
  return (
    <header className="prereg-head">
      {logo && <img src={logo} alt={`${club.name} logosu`} />}
      <p className="eyebrow">{look.eyebrow || 'Ön kayıt formu'}</p>
      <h1>{look.title || club.name}</h1>
      <p className="muted">{look.description || 'Bilgilerinizi gönderin. Kulüp ekibi başvurunuzu inceleyip sizinle iletişime geçecektir.'}</p>
      {video && <iframe src={video} title="Tanıtım videosu" allowFullScreen loading="lazy" />}
    </header>
  );
}

const blank = {
  modelId: '', branchId: '', firstName: '', lastName: '', birthYear: '', gender: '' as '' | 'K' | 'E', studentPhone: '',
  parentName: '', parentEmail: '', parentPhone: '', password: '', password2: '', address: '', paymentMethod: '',
};

export default function PreRegister() {
  const { slug } = useParams();
  const clubs = useCollection<Club>('clubs');
  const club = clubs.find((c) => c.slug === slug);
  const clubId = club?.id ?? '__none__';
  const models = useCollection<TrainingModel>('models', { clubId });
  const lessons = useCollection<Lesson>('lessons', { clubId });
  const branches = useCollection<Branch>('branches', { clubId });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof blank, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const branchOptions = useMemo(() => {
    const ids = new Set(lessons.filter((l) => l.modelId === form.modelId).map((l) => l.branchId));
    return branches.filter((b) => ids.has(b.id));
  }, [lessons, branches, form.modelId]);

  if (!club) return <div className="center-screen">Ön kayıt sayfası bulunamadı.</div>;
  const methods = club.paymentMethods ?? [];
  const look = club.preRegLook ?? {};
  const year = new Date().getFullYear();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const birthYear = Number(form.birthYear);
    if (birthYear < year - 80 || birthYear > year) return setError('Doğum yılını kontrol edin.');
    if (form.password.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    if (form.password !== form.password2) return setError('Şifreler aynı değil.');
    setBusy(true);
    try {
      const { password: _p, password2: _p2, ...safe } = form;
      await createParentAccount(club.id, form.parentName.trim(), form.parentEmail.trim(), form.password, (parentId) => {
        const record: Omit<PreReg, 'id'> = { ...safe, gender: form.gender as 'K' | 'E', birthYear, clubId: club.id, parentId, status: 'yeni' };
        return db.add('prereg', record);
      });
      setForm(blank);
      setDone(true);
    } catch {
      setError('Başvuru gönderilemedi. Bu e-posta kayıtlı olabilir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="prereg" style={{ '--accent': look.color || club.color } as CSSProperties}>
      <section className="prereg-card">
        <PreRegHeader club={club} look={look} />
        {done ? <p className="ok" role="status">Başvurunuz alındı. Kulüp ekibi sizinle iletişime geçecek.</p> : (
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <label>Ders türü *<select required value={form.modelId} onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value, branchId: '' }))}><option value="">Seçin</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label>Şube *<select required disabled={!form.modelId} value={form.branchId} onChange={(e) => set('branchId', e.target.value)}><option value="">{form.modelId && !branchOptions.length ? 'Bu türde açık ders yok' : 'Seçin'}</option>{branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label>Öğrenci adı *<input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
              <label>Öğrenci soyadı *<input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
              <label>Doğum yılı *<input required type="number" min={year - 80} max={year} value={form.birthYear} onChange={(e) => set('birthYear', e.target.value)} /></label>
              <label>Cinsiyet *<select required value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Seçin</option><option value="K">Kız</option><option value="E">Erkek</option></select></label>
              <label>Öğrenci telefonu<input type="tel" value={form.studentPhone} onChange={(e) => set('studentPhone', e.target.value)} /></label>
              <label>Veli adı soyadı *<input required value={form.parentName} onChange={(e) => set('parentName', e.target.value)} /></label>
              <label>Veli e-posta *<input required type="email" autoComplete="email" value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)} /></label>
              <label>Veli telefonu *<input required type="tel" value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} /></label>
              <label>Veli şifresi *<input required type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} /></label>
              <label>Veli şifresi tekrar *<input required type="password" autoComplete="new-password" minLength={8} value={form.password2} onChange={(e) => set('password2', e.target.value)} /></label>
              <label>Ödeme tercihi *<select required value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}><option value="">Seçin</option>{methods.map((m) => <option key={m}>{m}</option>)}</select></label>
            </div>
            <label>Adres *<textarea required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Başvuruyu gönder'}</button>
          </form>
        )}
      </section>
    </div>
  );
}
