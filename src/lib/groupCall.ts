import { CONFIG, gathered } from './call';
import { serverNow } from './clock';
import { db, newId, type Row } from './store';

// Sunucusuz grup araması: her katılımcı diğerleriyle doğrudan bağlanır, ses veritabanına gitmez.
export const MAX_GROUP_CALL = 6;
const STALE_MS = 60000;
const HEARTBEAT_MS = 20000;

export type GroupPeer = Row & { chatId: string; memberIds: string[]; uid: string; session: string; lastSeen: number };
export type GroupSignal = Row & {
  chatId: string; memberIds: string[]; from: string; to: string; fromSession: string; toSession: string; offer: string; answer?: string;
};
type Link = { pc: RTCPeerConnection; audio: HTMLAudioElement };

export const livePeers = (peers: GroupPeer[], chatId: string, now = serverNow()) =>
  peers.filter((p) => p.chatId === chatId && now - p.lastSeen < STALE_MS);

/** Aynı anda katılan iki kişi çakışmasın diye teklifi her çiftte küçük oturum kimliği yapar. */
export const shouldOffer = (mine: string, theirs: string) => mine < theirs;

export class GroupCall {
  private session = newId();
  private stream: MediaStream | null = null;
  private links = new Map<string, Link>();
  private handled = new Set<string>();
  private stops: Array<() => void> = [];
  private heartbeat = 0;
  private signals: GroupSignal[] = [];
  private peerId: string;

  constructor(private chat: { id: string; memberIds: string[] }, private uid: string, private onCount: (count: number) => void) {
    this.peerId = `${chat.id}_${uid}`;
  }

  async join() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await db.put('groupPeers', this.peerId, {
      chatId: this.chat.id, memberIds: this.chat.memberIds, uid: this.uid, session: this.session, lastSeen: serverNow(),
    });
    this.heartbeat = window.setInterval(() => void db.update('groupPeers', this.peerId, { lastSeen: serverNow() }), HEARTBEAT_MS);
    const scope = { contains: ['memberIds', this.uid] as [string, string] };
    this.stops.push(db.watch('groupPeers', scope, (rows) => this.onPeers(rows as GroupPeer[])));
    this.stops.push(db.watch('groupSignals', scope, (rows) => this.onSignals(rows as GroupSignal[])));
  }

  private link(session: string) {
    const existing = this.links.get(session);
    if (existing) return existing;
    const pc = new RTCPeerConnection(CONFIG);
    const audio = new Audio();
    audio.autoplay = true;
    this.stream?.getTracks().forEach((t) => pc.addTrack(t, this.stream!));
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };
    const created = { pc, audio };
    this.links.set(session, created);
    return created;
  }

  private drop(session: string) {
    const link = this.links.get(session);
    if (!link) return;
    link.pc.close();
    link.audio.srcObject = null;
    this.links.delete(session);
  }

  private onPeers(rows: GroupPeer[]) {
    const others = livePeers(rows, this.chat.id).filter((p) => p.uid !== this.uid).slice(0, MAX_GROUP_CALL - 1);
    const alive = new Set(others.map((p) => p.session));
    [...this.links.keys()].filter((s) => !alive.has(s)).forEach((s) => this.drop(s));
    others.forEach((p) => {
      if (shouldOffer(this.session, p.session) && !this.links.has(p.session)) void this.offer(p);
    });
    this.onCount(others.length + 1);
  }

  private async offer(peer: GroupPeer) {
    const { pc } = this.link(peer.session);
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    await db.put('groupSignals', `${this.session}_${peer.session}`, {
      chatId: this.chat.id, memberIds: [this.uid, peer.uid], from: this.uid, to: peer.uid,
      fromSession: this.session, toSession: peer.session, offer: JSON.stringify(pc.localDescription),
    });
  }

  private onSignals(rows: GroupSignal[]) {
    this.signals = rows.filter((s) => s.chatId === this.chat.id);
    for (const s of this.signals) {
      if (this.handled.has(s.id)) continue;
      if (s.toSession === this.session) {
        this.handled.add(s.id);
        void this.answer(s);
      } else if (s.fromSession === this.session && s.answer) {
        this.handled.add(s.id);
        void this.links.get(s.toSession)?.pc.setRemoteDescription(JSON.parse(s.answer));
      }
    }
  }

  private async answer(signal: GroupSignal) {
    const { pc } = this.link(signal.fromSession);
    await pc.setRemoteDescription(JSON.parse(signal.offer));
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    await db.update('groupSignals', signal.id, { answer: JSON.stringify(pc.localDescription) });
  }

  async leave() {
    window.clearInterval(this.heartbeat);
    this.stops.forEach((stop) => stop());
    this.stops = [];
    [...this.links.keys()].forEach((s) => this.drop(s));
    this.stream?.getTracks().forEach((t) => t.stop());
    const mine = this.signals.filter((s) => s.fromSession === this.session || s.toSession === this.session);
    await Promise.allSettled([db.remove('groupPeers', this.peerId), ...mine.map((s) => db.remove('groupSignals', s.id))]);
  }
}
