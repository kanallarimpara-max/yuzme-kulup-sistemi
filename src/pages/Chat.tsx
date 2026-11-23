import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Image as ImageIcon, Mic, Phone, PhoneOff, Search, Send, Square, Users as UsersIcon } from 'lucide-react';
import { useSession } from '../lib/session';
import { db, useCollection } from '../lib/store';
import { uploadFile } from '../lib/credits';
import { answerCall, applyAnswer, closeCall, isRinging, startCall, type ActiveCall } from '../lib/call';
import { GroupCall, livePeers, MAX_GROUP_CALL, type GroupPeer } from '../lib/groupCall';
import { contactId, directChatId, findByTag, usePeople } from '../lib/people';
import { ROLE_LABEL, type CallDoc, type Chat as ChatRow, type Contact, type Message } from '../lib/types';

export default function Chat() {
  const { user } = useSession();
  const uid = user?.id ?? '';
  const chats = useCollection<ChatRow>('chats', { contains: ['memberIds', uid] });
  const contacts = useCollection<Contact>('contacts', { contains: ['memberIds', uid] });
  const users = usePeople(user, [...chats, ...contacts].flatMap((c) => c.memberIds));
  const messages = useCollection<Message>('messages', { contains: ['memberIds', uid] });
  const calls = useCollection<CallDoc>('calls', { contains: ['memberIds', uid] });
  const [openId, setOpenId] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [text, setText] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const activeCall = useRef<ActiveCall | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const answered = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const groupPeers = useCollection<GroupPeer>('groupPeers', { contains: ['memberIds', uid] });
  const groupCall = useRef<GroupCall | null>(null);
  const [groupChatId, setGroupChatId] = useState<string | null>(null);
  const [groupCount, setGroupCount] = useState(0);

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? 'Kullanıcı';
  const title = (c: ChatRow) => (c.direct ? nameOf(c.memberIds.find((m) => m !== uid) ?? '') : c.name);
  const open = chats.find((c) => c.id === openId) ?? null;
  const thread = messages.filter((m) => m.chatId === openId).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const incoming = calls.find((c) => isRinging(c, uid) && c.id !== callId);
  const current = calls.find((c) => c.id === callId);
  const liveCallId = useRef<string | null>(null);
  liveCallId.current = callId;

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.length, openId]);

  useEffect(() => {
    if (!current || !activeCall.current) return;
    if (current.callerId === uid && current.answer && !answered.current) {
      answered.current = true;
      applyAnswer(activeCall.current, current.answer).catch(() => setError('Arama bağlanamadı.'));
    }
    if (current.status === 'bitti') {
      closeCall(activeCall.current);
      activeCall.current = null;
      setCallId(null);
    }
  }, [current?.status, current?.answer]);

  useEffect(() => () => {
    // Ekrandan çıkınca karşı taraf açık hatta kalmasın.
    if (activeCall.current && liveCallId.current) void db.update('calls', liveCallId.current, { status: 'bitti' }).catch(() => undefined);
    closeCall(activeCall.current);
    void groupCall.current?.leave();
  }, []);
  if (!user) return null;

  const findPerson = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const person = await findByTag(tag).catch(() => null);
    if (!person) return setError('Bu etikette kullanıcı yok.');
    if (person.id === uid) return setError('Kendi etiketini ekleyemezsin.');
    if (contacts.some((c) => c.memberIds.includes(person.id))) return setError('Bu kişiyle zaten bir istek veya bağlantı var.');
    try {
      await db.put('contacts', contactId(uid, person.id), { fromId: uid, toId: person.id, memberIds: [uid, person.id], status: 'bekliyor', createdAt: Date.now() });
    } catch {
      return setError('Bu kişiyle zaten bir istek veya bağlantı var.');
    }
    setTag('');
    setInfo(`${person.name} kişisine istek gönderildi.`);
  };
  const accept = async (c: Contact) => {
    // Sohbet, kabul ile aynı işlemde açılır.
    await db.batch([
      { name: 'contacts', id: c.id, data: { status: 'kabul' } },
      { name: 'chats', id: directChatId(c.fromId, c.toId), data: { name: '', direct: true, memberIds: [...c.memberIds].sort(), createdAt: Date.now() } },
    ]);
  };
  // Süper admin tüm profillerle istek beklemeden iletişim kurar.
  const openDirect = async (personId: string) => {
    if (!personId) return;
    const memberIds = [uid, personId].sort();
    const id = directChatId(uid, personId);
    await db.put('chats', id, { name: '', direct: true, memberIds, createdAt: Date.now() });
    setOpenId(id);
  };
  const send = async (payload: Pick<Message, 'kind' | 'text' | 'url'>) => {
    if (!open) return;
    await db.add('messages', { chatId: open.id, memberIds: open.memberIds, senderId: uid, ...payload });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await send({ kind: 'text', text: text.trim() });
    setText('');
  };
  const sendFile = async (file: File | undefined, kind: 'image' | 'audio') => {
    if (!file) return;
    try {
      setError('');
      await send({ kind, url: await uploadFile(file) });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const toggleRecord = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        sendFile(new File(parts, 'ses.webm', { type: rec.mimeType || 'audio/webm' }), 'audio');
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      setError('Mikrofon izni alınamadı.');
    }
  };
  const call = async () => {
    const peer = open?.memberIds.find((m) => m !== uid);
    if (!open?.direct || !peer) return;
    try {
      setError('');
      answered.current = false;
      const { id, active } = await startCall(open.id, uid, peer);
      activeCall.current = active;
      setCallId(id);
    } catch {
      setError('Arama başlatılamadı. Mikrofon iznini kontrol edin.');
    }
  };
  const pickUp = async (c: CallDoc) => {
    try {
      setError('');
      activeCall.current = await answerCall(c);
      setCallId(c.id);
    } catch {
      setError('Arama açılamadı. Mikrofon iznini kontrol edin.');
    }
  };
  const hangUp = async (id: string) => {
    await db.update('calls', id, { status: 'bitti' });
    closeCall(activeCall.current);
    activeCall.current = null;
    setCallId(null);
  };

  const joinGroup = async () => {
    if (!open || open.direct || groupCall.current) return;
    if (livePeers(groupPeers, open.id).length >= MAX_GROUP_CALL) return setError(`Grup aramasına en fazla ${MAX_GROUP_CALL} kişi katılabilir.`);
    const session = new GroupCall(open, uid, setGroupCount);
    try {
      setError('');
      await session.join();
      groupCall.current = session;
      setGroupChatId(open.id);
      setGroupCount(1);
    } catch {
      await session.leave();
      setError('Grup aramasına katılınamadı. Mikrofon iznini kontrol edin.');
    }
  };
  const leaveGroup = async () => {
    const session = groupCall.current;
    groupCall.current = null;
    setGroupChatId(null);
    await session?.leave();
  };

  const requests = contacts.filter((c) => c.toId === uid && c.status === 'bekliyor');
  const liveGroup = open && !open.direct ? livePeers(groupPeers, open.id).length : 0;
  const lastOf = (id: string) => messages.filter((m) => m.chatId === id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
  return (
    <div className="page chat-page">
      <header className="page-head"><div><p className="eyebrow">İletişim</p><h1>Mesajlar</h1></div><span className="badge">{user.tag}</span></header>
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="ok" role="status">{info}</p>}
      {incoming && <section className="card call-bar"><strong>{nameOf(incoming.callerId)} arıyor</strong><span className="form-actions"><button className="primary" onClick={() => pickUp(incoming)}><Phone size={16} />Aç</button><button onClick={() => db.update('calls', incoming.id, { status: 'bitti' })}><PhoneOff size={16} />Reddet</button></span></section>}
      {current && current.status !== 'bitti' && <section className="card call-bar"><strong>{current.status === 'bagli' ? 'Görüşme sürüyor' : 'Aranıyor…'} · {nameOf(current.callerId === uid ? current.calleeId : current.callerId)}</strong><button onClick={() => hangUp(current.id)}><PhoneOff size={16} />Kapat</button></section>}
      {groupChatId && <section className="card call-bar"><strong>Grup araması · {chats.find((c) => c.id === groupChatId)?.name} · {groupCount} kişi</strong><button onClick={leaveGroup}><PhoneOff size={16} />Ayrıl</button></section>}
      <div className={open ? 'chat-layout has-open' : 'chat-layout'}>
        <aside className="card chat-list">
          <form className="inline-form" onSubmit={findPerson}><input aria-label="Etiketle kişi ara" placeholder="@etiket" value={tag} onChange={(e) => setTag(e.target.value)} /><button className="icon" aria-label="İstek gönder"><Search size={16} /></button></form>
          {user.role === 'super' && <label>Tüm profiller<select value="" onChange={(e) => openDirect(e.target.value)}><option value="">Kişi seçin</option>{users.filter((u) => u.id !== uid).map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role]}</option>)}</select></label>}
          {requests.map((c) => <div className="request" key={c.id}><span>{nameOf(c.fromId)}<small>Bağlantı isteği</small></span><button className="primary icon" aria-label={`${nameOf(c.fromId)} isteğini kabul et`} onClick={() => accept(c)}><Check size={16} /></button></div>)}
          {chats.length === 0 && <p className="muted">Henüz sohbet yok.</p>}
          {chats.map((c) => (
            <button key={c.id} className={c.id === openId ? 'chat-item on' : 'chat-item'} onClick={() => setOpenId(c.id)}>
              {!c.direct && <UsersIcon size={15} />}<span><strong>{title(c)}</strong><small>{lastOf(c.id)?.text ?? (lastOf(c.id) ? 'Medya' : c.direct ? 'Özel sohbet' : `${c.memberIds.length} üye`)}</small></span>
            </button>
          ))}
        </aside>
        <section className="card chat-thread">
          {!open ? <p className="muted">Bir sohbet seçin.</p> : <>
            <header className="thread-head">
              <button className="ghost icon back" aria-label="Sohbet listesine dön" onClick={() => setOpenId(null)}><ArrowLeft size={18} /></button>
              <strong>{title(open)}</strong>
              {open.direct && <small>{ROLE_LABEL[users.find((u) => u.id === open.memberIds.find((m) => m !== uid))?.role ?? 'parent']}</small>}
              {open.direct && !current && <button className="icon" aria-label="Sesli ara" title="Sesli ara" onClick={call}><Phone size={16} /></button>}
              {!open.direct && !groupChatId && <button onClick={joinGroup} title="Grup araması"><Phone size={16} />{liveGroup ? `Aramaya katıl (${liveGroup})` : 'Grubu ara'}</button>}
            </header>
            <div className="messages">
              {thread.map((m) => (
                <div key={m.id} className={m.senderId === uid ? 'bubble mine' : 'bubble'}>
                  {m.senderId !== uid && !open.direct && <small>{nameOf(m.senderId)}</small>}
                  {m.kind === 'text' && m.text}
                  {m.kind === 'image' && <img src={m.url} alt="Gönderilen fotoğraf" />}
                  {m.kind === 'audio' && <audio controls src={m.url} />}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="composer" onSubmit={submit}>
              <label className="button icon" title="Fotoğraf gönder"><ImageIcon size={17} /><input className="sr-only" type="file" accept="image/*" aria-label="Fotoğraf gönder" onChange={(e) => { sendFile(e.target.files?.[0], 'image'); e.target.value = ''; }} /></label>
              <button type="button" className={recording ? 'icon recording' : 'icon'} aria-label={recording ? 'Kaydı bitir ve gönder' : 'Sesli mesaj kaydet'} onClick={toggleRecord}>{recording ? <Square size={16} /> : <Mic size={17} />}</button>
              <input aria-label="Mesaj" placeholder="Mesaj yaz" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="primary icon" aria-label="Gönder"><Send size={16} /></button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
