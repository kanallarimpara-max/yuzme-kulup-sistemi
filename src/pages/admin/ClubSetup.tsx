import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import ImageField from '../../lib/ImageField';
import type { Branch, Lesson, TrainingModel } from '../../lib/types';

const KIND = { grup: 'Grup', ozel: 'Özel', sporcu: 'Sporcu' };

export default function ClubSetup() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const branches = useCollection<Branch>('branches', { clubId });
  const models = useCollection<TrainingModel>('models', { clubId });
  const lessons = useCollection<Lesson>('lessons', { clubId });
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [branch, setBranch] = useState('');
  const [model, setModel] = useState({ name: '', kind: 'grup' as TrainingModel['kind'], perCoach: 5 });

  useEffect(() => {
    setName(club?.name ?? '');
    setLogoUrl(club?.logoUrl ?? '');
  }, [club?.id]);

  if (!club) return null;

  const saveClub = async (e: FormEvent) => {
    e.preventDefault();
    await db.update('clubs', club.id, { name: name.trim(), logoUrl: logoUrl.trim() });
    setSaved(true);
  };
  const addBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!branch.trim()) return;
    await db.add('branches', { clubId, name: branch.trim() });
    setBranch('');
  };
  const addModel = async (e: FormEvent) => {
    e.preventDefault();
    if (!model.name.trim() || model.perCoach < 1) return;
    await db.add('models', { clubId, ...model, name: model.name.trim() });
    setModel({ name: '', kind: 'grup', perCoach: 5 });
  };

  // Ders bağlı şube veya model silinirse kayıt ve yoklama ekranları boş kalır.
  const removeBranch = (b: Branch) => {
    setError('');
    if (lessons.some((l) => l.branchId === b.id)) return setError(`${b.name} şubesinde ders var, önce dersleri kaldırın.`);
    if (window.confirm(`${b.name} şubesi silinsin mi?`)) void db.remove('branches', b.id);
  };
  const removeModel = (m: TrainingModel) => {
    setError('');
    if (lessons.some((l) => l.modelId === m.id)) return setError(`${m.name} modelini kullanan ders var, önce dersleri kaldırın.`);
    if (window.confirm(`${m.name} modeli silinsin mi?`)) void db.remove('models', m.id);
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Kulüp yönetimi</p><h1>Kulüp ayarları</h1></div></header>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="card">
        <h2>Kulüp bilgileri</h2>
        <form className="form-grid" onSubmit={saveClub}>
          <label>Kulüp adı<input required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></label>
          <ImageField label="Kulüp logosu" value={logoUrl} onChange={(url) => { setLogoUrl(url); setSaved(false); }} />
          <div className="form-actions"><button className="primary">Kaydet</button>{saved && <span className="ok" role="status">Kaydedildi</span>}</div>
        </form>
      </section>
      <div className="two-col">
        <section className="card">
          <h2>Şubeler</h2>
          <form className="inline-form" onSubmit={addBranch}>
            <input aria-label="Şube adı" placeholder="Şube adı" value={branch} onChange={(e) => setBranch(e.target.value)} />
            <button className="primary"><Plus size={16} />Ekle</button>
          </form>
          <ul className="simple-list">
            {branches.map((b) => (
              <li key={b.id}><span>{b.name}</span><button className="ghost icon" aria-label={`${b.name} şubesini sil`} onClick={() => removeBranch(b)}><Trash2 size={16} /></button></li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Eğitim modelleri</h2>
          <form className="inline-form wrap" onSubmit={addModel}>
            <input aria-label="Model adı" placeholder="Model adı" value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} />
            <select aria-label="Model türü" value={model.kind} onChange={(e) => setModel({ ...model, kind: e.target.value as TrainingModel['kind'] })}>
              <option value="grup">Grup</option><option value="ozel">Özel</option><option value="sporcu">Sporcu</option>
            </select>
            <input aria-label="Antrenör başına kişi" type="number" min={1} value={model.perCoach} onChange={(e) => setModel({ ...model, perCoach: Number(e.target.value) })} />
            <button className="primary"><Plus size={16} />Ekle</button>
          </form>
          <ul className="simple-list">
            {models.map((m) => (
              <li key={m.id}><span>{m.name}<small>{KIND[m.kind]} · antrenör başına {m.perCoach} kişi</small></span><button className="ghost icon" aria-label={`${m.name} modelini sil`} onClick={() => removeModel(m)}><Trash2 size={16} /></button></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
