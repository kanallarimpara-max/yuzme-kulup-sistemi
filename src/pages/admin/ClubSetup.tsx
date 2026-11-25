import { useEffect, useState, type FormEvent } from 'react';
import { Check, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useConfirm } from '../../lib/confirm';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import ImageField from '../../lib/ImageField';
import type { Branch, Lesson, TrainingModel } from '../../lib/types';

/** Eğitim modeli türleri ve dokununca görünen kısa açıklamaları. */
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
  const [model, setModel] = useState({ name: '', kind: 'grup' as TrainingModel['kind'], perCoach: 5 });
  const [editBranch, setEditBranch] = useState<{ id: string; name: string } | null>(null);
  const [editModel, setEditModel] = useState<{ id: string; name: string; kind: TrainingModel['kind']; perCoach: number } | null>(null);
  const [help, setHelp] = useState('');
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
  const addModel = async (e: FormEvent) => {
    e.preventDefault();
    if (!model.name.trim() || model.perCoach < 1) return;
    await db.add('models', { clubId, ...model, name: model.name.trim() });
    setModel({ name: '', kind: 'grup', perCoach: 5 });
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
    if (!editModel?.name.trim() || editModel.perCoach < 1) return;
    await db.update('models', editModel.id, { name: editModel.name.trim(), kind: editModel.kind, perCoach: editModel.perCoach });
    setEditModel(null);
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
          <p className="muted">Derslerin seviyesi ve bir antrenörün en fazla kaç öğrenciyle çalışacağı. Türe dokunarak açıklamasını görebilirsiniz.</p>
          <div className="chips">{(Object.keys(KIND) as TrainingModel['kind'][]).map((k) => <button type="button" key={k} className={help === k ? 'chip on' : 'chip'} aria-pressed={help === k} onClick={() => setHelp(help === k ? '' : k)}><Info size={13} />{KIND[k].label}</button>)}</div>
          {help && <p className="help-note" role="status"><strong>{KIND[help as TrainingModel['kind']].label}:</strong> {KIND[help as TrainingModel['kind']].help}</p>}
          <form className="inline-form wrap" onSubmit={addModel}>
            <input aria-label="Model adı" placeholder="Model adı" value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} />
            <select aria-label="Model türü" title={KIND[model.kind].help} value={model.kind} onChange={(e) => setModel({ ...model, kind: e.target.value as TrainingModel['kind'] })}>
              {(Object.keys(KIND) as TrainingModel['kind'][]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
            </select>
            <input aria-label="Antrenör başına en fazla öğrenci" title="Bir antrenörün bu modelde en fazla kaç öğrenciyle çalışacağı" type="number" min={1} value={model.perCoach} onChange={(e) => setModel({ ...model, perCoach: Number(e.target.value) })} />
            <button className="primary"><Plus size={16} />Ekle</button>
          </form>
          <ul className="simple-list">
            {models.map((m) => (
              editModel?.id === m.id
                ? <li key={m.id}><form className="inline-form wrap grow" onSubmit={saveModel}>
                  <input aria-label="Model adı" required value={editModel.name} onChange={(e) => setEditModel({ ...editModel, name: e.target.value })} />
                  <select aria-label="Model türü" value={editModel.kind} onChange={(e) => setEditModel({ ...editModel, kind: e.target.value as TrainingModel['kind'] })}>{(Object.keys(KIND) as TrainingModel['kind'][]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}</select>
                  <input aria-label="Antrenör başına en fazla öğrenci" type="number" min={1} value={editModel.perCoach} onChange={(e) => setEditModel({ ...editModel, perCoach: Number(e.target.value) })} />
                  <button className="primary icon" aria-label="Kaydet"><Check size={16} /></button><button type="button" className="icon" aria-label="Vazgeç" onClick={() => setEditModel(null)}><X size={16} /></button>
                </form></li>
                : <li key={m.id}><span>{m.name}<small>{KIND[m.kind]?.label ?? m.kind} · antrenör başına en fazla {m.perCoach} kişi</small></span><span className="row-actions"><button className="ghost icon" aria-label={`${m.name} modelini düzenle`} title="Düzenle" onClick={() => setEditModel({ id: m.id, name: m.name, kind: m.kind, perCoach: m.perCoach })}><Pencil size={16} /></button><button className="ghost icon" aria-label={`${m.name} modelini sil`} title="Sil" onClick={() => removeModel(m)}><Trash2 size={16} /></button></span></li>
            ))}
          </ul>
        </section>
      </div>
      {confirmDialog}
    </div>
  );
}
