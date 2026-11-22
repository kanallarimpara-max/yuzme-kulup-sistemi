import { db } from './store';
import type { CallDoc } from './types';

// Ücretsiz STUN ile doğrudan bağlantı kurulur. Sinyal mesajları veri deposundan geçer, ses sunucuya gitmez.
const CONFIG: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const gathered = (pc: RTCPeerConnection) => new Promise<void>((resolve) => {
  if (pc.iceGatheringState === 'complete') return resolve();
  const timer = window.setTimeout(resolve, 3000);
  pc.addEventListener('icegatheringstatechange', () => {
    if (pc.iceGatheringState === 'complete') {
      window.clearTimeout(timer);
      resolve();
    }
  });
});

export type ActiveCall = { pc: RTCPeerConnection; stream: MediaStream; audio: HTMLAudioElement };

async function prepare(): Promise<ActiveCall> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const pc = new RTCPeerConnection(CONFIG);
  const audio = new Audio();
  audio.autoplay = true;
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };
  return { pc, stream, audio };
}

export async function startCall(chatId: string, callerId: string, calleeId: string) {
  const active = await prepare();
  await active.pc.setLocalDescription(await active.pc.createOffer());
  await gathered(active.pc);
  const id = await db.add('calls', {
    chatId, memberIds: [callerId, calleeId], callerId, calleeId, status: 'caliyor', offer: JSON.stringify(active.pc.localDescription),
  });
  return { id, active };
}

export async function answerCall(call: CallDoc) {
  const active = await prepare();
  await active.pc.setRemoteDescription(JSON.parse(call.offer));
  await active.pc.setLocalDescription(await active.pc.createAnswer());
  await gathered(active.pc);
  await db.update('calls', call.id, { status: 'bagli', answer: JSON.stringify(active.pc.localDescription) });
  return active;
}

export const applyAnswer = (active: ActiveCall, answer: string) => active.pc.setRemoteDescription(JSON.parse(answer));

export function closeCall(active: ActiveCall | null) {
  if (!active) return;
  active.stream.getTracks().forEach((t) => t.stop());
  active.pc.close();
  active.audio.srcObject = null;
}
