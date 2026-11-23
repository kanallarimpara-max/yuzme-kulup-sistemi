import { useState, type FormEvent } from 'react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useSession } from '../lib/session';
import { db, useCollection, useMerged } from '../lib/store';
import { uploadFile } from '../lib/credits';
import { usePeople } from '../lib/people';
import { ROLE_LABEL, type Contact, type Post } from '../lib/types';

type Tab = 'akis' | 'kesfet' | 'profil';
const KIND = { foto: 'Fotoğraf', derece: 'Derece', madalya: 'Madalya' };

export default function Social() {
  const { user } = useSession();
  const uid = user?.id ?? '';
  const posts = useMerged<Post>('posts', uid ? { eq: ['isPublic', true] } : { skip: true }, uid ? { contains: ['audience', uid] } : { skip: true });
  const contacts = useCollection<Contact>('contacts', { contains: ['memberIds', uid] });
  const users = usePeople(user, [...posts.map((p) => p.authorId), ...posts.flatMap((p) => p.comments.map((c) => c.userId))]);
  const [tab, setTab] = useState<Tab>('akis');
  const [form, setForm] = useState({ caption: '', kind: 'foto' as Post['kind'] });
  const [file, setFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const friends = contacts.filter((c) => c.status === 'kabul').flatMap((c) => c.memberIds).filter((id) => id !== uid);
  const authorOf = (id: string) => users.find((u) => u.id === id);
  const canSee = (p: Post) => p.authorId === uid || friends.includes(p.authorId) || !!authorOf(p.authorId)?.isPublic;
  const newest = (a: Post, b: Post) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
  const list = (tab === 'akis'
    ? posts.filter((p) => p.authorId === uid || friends.includes(p.authorId))
    : tab === 'kesfet'
      ? posts.filter((p) => p.authorId !== uid && !!authorOf(p.authorId)?.isPublic)
      : posts.filter((p) => p.authorId === uid)).filter(canSee).sort(newest);

  const share = async (e: FormEvent) => {
    e.preventDefault();
    if (!file && !form.caption.trim()) return setError('Fotoğraf veya açıklama ekleyin.');
    setBusy(true);
    setError('');
    try {
      let imageUrl = '';
      if (file) {
        try {
          imageUrl = await uploadFile(file);
        } catch (err) {
          const reason = (err as Error).message;
          throw new Error(/[ıİğşçöü]/i.test(reason) ? `Fotoğraf yüklenemedi: ${reason}` : 'Fotoğraf yüklenemedi. Tekrar dene veya başka bir fotoğraf seç.');
        }
      }
      await db.add('posts', { authorId: uid, imageUrl, caption: form.caption.trim().slice(0, 2000), kind: form.kind, isPublic: user.isPublic === true, audience: [...new Set([uid, ...friends])], likes: [], comments: [] })
        .catch(() => { throw new Error('Paylaşım kaydedilemedi. Bağlantını kontrol edip tekrar dene.'); });
      setForm({ caption: '', kind: 'foto' });
      setFile(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const like = (p: Post) => db.update('posts', p.id, { likes: p.likes.includes(uid) ? p.likes.filter((x) => x !== uid) : [...p.likes, uid] });
  const comment = async (e: FormEvent, p: Post) => {
    e.preventDefault();
    const text = drafts[p.id]?.trim();
    if (!text) return;
    await db.update('posts', p.id, { comments: [...p.comments, { userId: uid, text, at: Date.now() }] });
    setDrafts({ ...drafts, [p.id]: '' });
  };
  const setPublic = async (isPublic: boolean) => {
    await db.update('users', uid, { isPublic });
    await Promise.all(posts.filter((p) => p.authorId === uid).map((p) => db.update('posts', p.id, { isPublic })));
  };

  return (
    <div className="page social">
      <header className="page-head"><div><p className="eyebrow">Sosyal</p><h1>Kulüp akışı</h1></div></header>
      <div className="chips" role="tablist">
        {([['akis', 'Akış'], ['kesfet', 'Keşfet'], ['profil', 'Profilim']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'chip on' : 'chip'} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {tab === 'profil' && (
        <section className="card profile-card">
          <span className="avatar large">{user.name[0]}</span>
          <div><h2>{user.name}</h2><p className="muted">{user.tag} · {ROLE_LABEL[user.role]}</p><p className="muted">{list.length} gönderi · {friends.length} bağlantı</p></div>
          <label className="check"><input type="checkbox" checked={user.isPublic} onChange={(e) => setPublic(e.target.checked)} /><span>Profilim açık, keşfette görünsün</span></label>
        </section>
      )}
      {tab !== 'kesfet' && (
        <form className="card stack" onSubmit={share}>
          <label>Paylaşım<textarea rows={2} placeholder="Ne paylaşmak istersin?" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></label>
          <div className="form-grid">
            <label>Tür<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Post['kind'] })}><option value="foto">Fotoğraf</option><option value="derece">Derece</option><option value="madalya">Madalya</option></select></label>
            <label>Fotoğraf<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          </div>
          <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Paylaşılıyor…' : 'Paylaş'}</button></div>
        </form>
      )}
      {list.length === 0 && <section className="card"><p className="muted">{tab === 'kesfet' ? 'Keşfedilecek açık profil gönderisi yok.' : 'Henüz gönderi yok.'}</p></section>}
      <div className="feed">{list.map((p) => {
        const author = authorOf(p.authorId);
        return (
          <article className="card post" key={p.id}>
            <header><span className="avatar">{author?.name[0] ?? '?'}</span><span><strong>{author?.name}</strong><small>{author?.tag} · {KIND[p.kind]}</small></span>{p.authorId === uid && <button className="ghost icon" aria-label="Gönderiyi sil" onClick={() => db.remove('posts', p.id)}><Trash2 size={16} /></button>}</header>
            {p.imageUrl && <img src={p.imageUrl} alt={p.caption || 'Paylaşılan fotoğraf'} />}
            {p.caption && <p>{p.caption}</p>}
            <div className="post-actions"><button className={p.likes.includes(uid) ? 'ghost liked' : 'ghost'} aria-pressed={p.likes.includes(uid)} onClick={() => like(p)}><Heart size={17} />{p.likes.length}</button><span className="muted"><MessageCircle size={16} /> {p.comments.length}</span></div>
            {p.comments.map((c) => <p className="comment" key={c.at}><strong>{authorOf(c.userId)?.name}</strong> {c.text}</p>)}
            <form className="inline-form" onSubmit={(e) => comment(e, p)}><input aria-label="Yorum yaz" placeholder="Yorum yaz" value={drafts[p.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })} /><button>Gönder</button></form>
          </article>
        );
      })}</div>
    </div>
  );
}
