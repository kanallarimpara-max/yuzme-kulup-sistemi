import { db, useCollection, type Row, type Scope } from './store';
import { creditBalance } from './rules';

export type LedgerRow = Row & { userId: string; delta: number; reason: string };
export type CreditRequest = Row & {
  userId: string; type: 'yukleme' | 'bozdurma'; credits: number; kurus: number; note?: string; receiptUrl?: string;
  payout?: { method: 'eft' | 'kripto'; name?: string; iban?: string; wallet?: string; network?: string; coin?: string };
  status: 'bekliyor' | 'onaylandi' | 'reddedildi';
};
export type PlatformSettings = Row & { bank: string; holder: string; iban: string; rateCredits: number; rateKurus: number };
export type CreditPackage = Row & { name: string; credits: number; priceKurus: number };
export type Product = Row & { name: string; description: string; imageUrl: string; priceKurus: number; priceCredits: number };

/** Bekleyen bozdurma tutarı harcanamaz, böylece aynı kredi iki kez kullanılamaz. */
export const spendable = (ledger: LedgerRow[], requests: CreditRequest[], userId: string) => {
  const balance = creditBalance(ledger.filter((l) => l.userId === userId));
  const held = requests.filter((r) => r.userId === userId && r.type === 'bozdurma' && r.status === 'bekliyor').reduce((s, r) => s + r.credits, 0);
  return { balance, held, available: balance - held };
};

export function useWallet(userId?: string) {
  const scope: Scope = userId ? { eq: ['userId', userId] } : { skip: true };
  const ledger = useCollection<LedgerRow>('ledger', scope);
  const requests = useCollection<CreditRequest>('creditRequests', scope);
  return { ledger, requests, ...spendable(ledger, requests, userId ?? '') };
}

export const postCredit = (userId: string, delta: number, reason: string) => db.add('ledger', { userId, delta, reason });

const MAX_INLINE = 1_500_000;

/** Cloudinary ayarlıysa oraya yükler. Demo modunda küçük dosyayı tarayıcıda tutar. */
export async function uploadFile(file: File): Promise<string> {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (cloud && preset) {
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: 'POST', body });
    if (!res.ok) throw new Error('Dosya yüklenemedi');
    return (await res.json()).secure_url as string;
  }
  if (file.size > MAX_INLINE) throw new Error('Demo modunda dosya en fazla 1,5 MB olabilir.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}
