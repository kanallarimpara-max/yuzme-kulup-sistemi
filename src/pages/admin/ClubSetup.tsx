import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useConfirm } from '../../lib/confirm';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import ImageField from '../../lib/ImageField';
import type { Branch, Lesson, TrainingModel } from '../../lib/types';

/** Eğitim modeli türleri ve dokununca görünen kısa açıklamaları. */
/** Model adı ve öğrenci sayısı alanlarında türe göre gösterilen örnekler; kullanıcı yazana kadar yalnız ipucudur. */
const EXAMPLE: Record<TrainingModel['kind'], { name: string; perCoach: number }> = {
  minik: { name: 'Örn. Minikler', perCoach: 6 },
  altgrup: { name: 'Örn. Başlangıç', perCoach: 8 },
  grup: { name: 'Örn. Akşam grubu', perCoach: 12 },
  performans: { name: 'Örn. Performans', perCoach: 15 },
  sporcu: { name: 'Örn. Lisanslılar', perCoach: 20 },
  yetiskin: { name: 'Örn. Yetişkinler', perCoach: 10 },
  ozel: { name: 'Örn. Birebir ders', perCoach: 1 },
};
const NAME_MAX = 60;
const PER_COACH_MAX = 100;

const KIND: Record<TrainingModel['kind'], { label: string; help: string }> = {
  minik: { label: 'Minikler', help: 'Suyla tanışan 4-6 yaş çocuklar. Oyunla öğrenme, küçük gruplar.' },
  altgrup: { label: 'Alt grup (başlangıç)', help: 'Yüzmeyi yeni öğrenenler. Temel teknik ve suda güven.' },
  grup: { label: 'Grup', help: 'Dört stili öğrenmiş, düzenli antrenman yapan genel grup.' },
  performans: { label: 'Performans', help: 'Yarışlara hazırlanan, baraj hedefleyen sporcular.' },
  sporcu: { label: 'Sporcu (lisanslı)', help: 'TYF lisanslı, yarış programı olan ileri seviye sporcular.' },
  yetiskin: { label: 'Yetişkin', help: 'Yetişkinler için öğrenme veya kondisyon dersleri.' },
  ozel: { label: 'Özel ders', help: 'Birebir veya çok küçük grup, kişiye özel program.' },
};

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
  // Öğrenci sayısı boş başlar; kullanıcı sayı girene kadar alanda yalnız örnek görünür.
  const [model, setModel] = useState({ name: '', kind: 'grup' as TrainingModel['kind'], perCoach: '' });
  const [modelError, setModelError] = useState('');
  const [editError, setEditError] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [editBranch, setEditBranch] = useState<{ id: string; name: string } | null>(null);
  const [editModel, setEditModel] = useState<{ id: string; name: string; kind: TrainingModel['kind']; perCoach: string } | null>(null);
  const [confirmDialog, confirm] = useConfirm();

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
  // Ad boş, çok uzun ya da aynı adda başka model varsa; sayı tam sayı ve 1-100 arasında değilse kayıt yapılmaz.
  const checkModel = (name: string, perCoach: string, exceptId = '') => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return 'Model adını yazın.';
    if (clean.length > NAME_MAX) return `Model adı en fazla ${NAME_MAX} karakter olabilir.`;
    if (models.some((m) => m.id !== exceptId && m.name.trim().toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'))) return `"${clean}" adında bir model zaten var.`;
    if (!perCoach.trim()) return 'Antrenör başına en fazla öğrenci sayısını yazın.';
    const n = Number(perCoach);
    if (!Number.isInteger(n) || n < 1 || n > PER_COACH_MAX) return `Öğrenci sayısı 1 ile ${PER_COACH_MAX} arasında tam sayı olmalı.`;
    return '';
  };
  const addModel = async (e: FormEvent) => {
    e.preventDefault();
    if (savingModel) return;
    const problem = checkModel(model.name, model.perCoach);
    setModelError(problem);
    if (problem) return;
    setSavingModel(true);
    try {
      await db.add('models', { clubId, kind: model.kind, name: model.name.trim().replace(/\s+/g, ' '), perCoach: Number(model.perCoach) });
      setModel({ name: '', kind: 'grup', perCoach: '' });
    } catch {
      setModelError('Model kaydedilemedi, bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSavingModel(false);
    }
  };

  // Ders bağlı şube veya model silinirse kayıt ve yoklama ekranları boş kalır.
  const removeBranch = async (b: Branch) => {
    setError('');
    if (lessons.some((l) => l.branchId === b.id)) return setError(`${b.name} şubesinde ders var, önce dersleri kaldırın.`);
    if (await confirm({ title: `${b.name} şubesi silinsin mi?`, text: 'Bu işlem geri alınamaz.', ok: 'Evet, sil', danger: true })) await db.remove('branches', b.id);
  };
  const saveBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!editBranch?.name.trim()) return;
    await db.update('branches', editBranch.id, { name: editBranch.name.trim() });
    setEditBranch(null);
  };
  const removeModel = async (m: TrainingModel) => {
    setError('');
    if (lessons.some((l) => l.modelId === m.id)) return setError(`${m.name} modelini kullanan ders var, önce dersleri kaldırın.`);
    if (await confirm({ title: `${m.name} modeli silinsin mi?`, text: 'Bu işlem geri alınamaz.', ok: 'Evet, sil', danger: true })) await db.remove('models', m.id);
  };
  const saveModel = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModel || savingModel) return;
    const problem = checkModel(editModel.name, editModel.perCoach, editModel.id);
    setEditError(problem);
    if (problem) return;
    setSavingModel(true);
    try {
      await db.update('models', editModel.id, { name: editModel.name.trim().replace(/\s+/g, ' '), kind: editModel.kind, perCoach: Number(editModel.perCoach) });
      setEditModel(null);
    } catch {
      setEditError('Değişiklik kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingModel(false);
    }
  };
  // Sayı alanına yalnız rakam yazılabilir; harf, eksi, virgül ve nokta kabul edilmez.
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 3);

  return (
    <div className="page">
      <header className="page-head"><div><h1>Kulüp ayarları</h1></div></header>
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
          <p className="muted">Derslerin yapıldığı havuz veya tesisler. Ders saati açmadan önce en az bir şube ekleyin.</p>
          <form className="inline-form" onSubmit={addBranch}>
            <input aria-label="Şube adı" placeholder="Şube adı" value={branch} onChange={(e) => setBranch(e.target.value)} />
            <button className="primary"><Plus size={16} />Ekle</button>
          </form>
          <ul className="simple-list">
            {branches.map((b) => (
              editBranch?.id === b.id
                ? <li key={b.id}><form className="inline-form grow" onSubmit={saveBranch}><input aria-label="Şube adı" required value={editBranch.name} onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })} /><button className="primary icon" aria-label="Kaydet"><Check size={16} /></button><button type="button" className="icon" aria-label="Vazgeç" onClick={() => setEditBranch(null)}><X size={16} /></button></form></li>
                : <li key={b.id}><span>{b.name}</span><span className="row-actions"><button className="ghost icon" aria-label={`${b.name} şubesini düzenle`} title="Düzenle" onClick={() => setEditBranch({ id: b.id, name: b.name })}><Pencil size={16} /></button><button className="ghost icon" aria-label={`${b.name} şubesini sil`} title="Sil" onClick={() => removeBranch(b)}><Trash2 size={16} /></button></span></li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Eğitim modelleri</h2>
          <p className="muted">Derslerin seviyesi ve bir antrenörün en fazla kaç öğrenciyle çalışacağı.</p>
          <form className="inline-form wrap" onSubmit={addModel} noValidate>
            <input aria-label="Model adı" placeholder={EXAMPLE[model.kind].name} maxLength={NAME_MAX} aria-invalid={Boolean(modelError) && !modelError.includes('sayı')} value={model.name} onChange={(e) => { setModel({ ...model, name: e.target.value }); setModelError(''); }} />
            <select aria-label="Model türü" title={KIND[model.kind].help} value={model.kind} onChange={(e) => { setModel({ ...model, kind: e.target.value as TrainingModel['kind'] }); setModelError(''); }}>
              {(Object.keys(KIND) as TrainingModel['kind'][]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
            </select>
            <input aria-label="Antrenör başına en fazla öğrenci" title="Bir antrenörün bu modelde en fazla kaç öğrenciyle çalışacağı" inputMode="numeric" pattern="[0-9]*" placeholder={`Örn. ${EXAMPLE[model.kind].perCoach} kişi`} aria-invalid={modelError.includes('sayı')} value={model.perCoach} onChange={(e) => { setModel({ ...model, perCoach: digits(e.target.value) }); setModelError(''); }} />
            <button className="primary" disabled={savingModel}><Plus size={16} />Ekle</button>
          </form>
          {modelError && <p className="error" role="alert">{modelError}</p>}
          <ul className="simple-list">
            {models.map((m) => (
              editModel?.id === m.id
                ? <li key={m.id} className="wrap-row"><form className="inline-form wrap grow" onSubmit={saveModel} noValidate>
                  <input aria-label="Model adı" maxLength={NAME_MAX} placeholder={EXAMPLE[editModel.kind].name} value={editModel.name} onChange={(e) => { setEditModel({ ...editModel, name: e.target.value }); setEditError(''); }} />
                  <select aria-label="Model türü" value={editModel.kind} onChange={(e) => setEditModel({ ...editModel, kind: e.target.value as TrainingModel['kind'] })}>{(Object.keys(KIND) as TrainingModel['kind'][]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}</select>
                  <input aria-label="Antrenör başına en fazla öğrenci" inputMode="numeric" pattern="[0-9]*" placeholder={`Örn. ${EXAMPLE[editModel.kind].perCoach} kişi`} value={editModel.perCoach} onChange={(e) => { setEditModel({ ...editModel, perCoach: digits(e.target.value) }); setEditError(''); }} />
                  <button className="primary icon" aria-label="Kaydet" disabled={savingModel}><Check size={16} /></button><button type="button" className="icon" aria-label="Vazgeç" onClick={() => { setEditModel(null); setEditError(''); }}><X size={16} /></button>
                </form>{editError && <p className="error" role="alert">{editError}</p>}</li>
                : <li key={m.id}><span>{m.name}<small>{KIND[m.kind]?.label ?? m.kind} · antrenör başına en fazla {m.perCoach} kişi</small></span><span className="row-actions"><button className="ghost icon" aria-label={`${m.name} modelini düzenle`} title="Düzenle" onClick={() => { setEditModel({ id: m.id, name: m.name, kind: m.kind, perCoach: String(m.perCoach) }); setEditError(''); }}><Pencil size={16} /></button><button className="ghost icon" aria-label={`${m.name} modelini sil`} title="Sil" onClick={() => removeModel(m)}><Trash2 size={16} /></button></span></li>
            ))}
          </ul>
        </section>
      </div>
      {confirmDialog}
    </div>
  );
}
