import { db, firebaseEnabled, inc, newId, useCollection, type BatchOp, type Row } from './store';

/** Karışıklık olmasın diye 1 kredi her yerde 1 TL'dir (100 kuruş). */
export const KURUS_PER_CREDIT = 100;
export const creditsToKurus = (credits: number) => Math.round(credits) * KURUS_PER_CREDIT;
export const kurusToCredits = (kurus: number) => Math.round(kurus / KURUS_PER_CREDIT);

export type LedgerRow = Row & { userId: string; delta: number; reason: string };
export type CreditRequest = Row & {
  userId: string; type: 'yukleme' | 'bozdurma'; credits: number; kurus: number; note?: string; receiptUrl?: string;
  payout?: { method: 'eft' | 'kripto'; name?: string; iban?: string; wallet?: string; network?: string; coin?: string };
  status: 'bekliyor' | 'onaylandi' | 'reddedildi';
};
export type PlatformSettings = Row & { bank: string; holder: string; iban: string; rateCredits: number; rateKurus: number };
export type CreditPackage = Row & { name: string; credits: number; priceKurus: number };
export type Product = Row & { name: string; description: string; imageUrl: string; priceKurus: number; priceCredits: number };

/** Bakiye tek belgede tutulur. Her değişiklik Firestore kurallarında sipariş veya talep belgesiyle doğrulanır. */
export type WalletRow = Row & { balance: number; held: number; op?: string };
export const walletNumbers = (w?: WalletRow) => {
  const balance = w?.balance ?? 0;
  const held = w?.held ?? 0;
  // Bekleyen bozdurma tutarı harcanamaz, böylece aynı kredi iki kez kullanılamaz.
  return { balance, held, available: balance - held };
};

export function useWallet(userId?: string) {
  const wallet = useCollection<WalletRow>('wallets', userId ? { id: userId } : { skip: true })[0];
  const requests = useCollection<CreditRequest>('creditRequests', userId ? { eq: ['userId', userId] } : { skip: true });
  return { requests, ...walletNumbers(wallet) };
}

const ledgerOp = (userId: string, delta: number, reason: string): BatchOp => ({
  name: 'ledger', id: newId(), data: { userId, delta, reason, createdAt: Date.now() },
});

/** Süper admin: elle kredi ekler veya siler. */
export const adjustCredit = (userId: string, delta: number, reason: string) => db.batch([
  ledgerOp(userId, delta, reason),
  { name: 'wallets', id: userId, data: { balance: inc(delta), held: inc(0) } },
]);

/** Süper admin: yükleme veya bozdurma talebini tek işlemde sonuçlandırır. */
export function settleRequest(r: CreditRequest, approve: boolean) {
  const status = { name: 'creditRequests', id: r.id, data: { status: approve ? 'onaylandi' : 'reddedildi' } };
  if (r.type === 'yukleme') {
    return db.batch(approve
      ? [status, ledgerOp(r.userId, r.credits, 'Kredi yükleme'), { name: 'wallets', id: r.userId, data: { balance: inc(r.credits), held: inc(0) } }]
      : [status]);
  }
  return db.batch([
    status,
    ...(approve ? [ledgerOp(r.userId, -r.credits, 'Kredi bozdurma')] : []),
    { name: 'wallets', id: r.userId, data: { balance: inc(approve ? -r.credits : 0), held: inc(-r.credits) } },
  ]);
}

/** Antrenör: bozdurma talebi açar ve tutarı aynı işlemde bloke eder. */
export function requestRedeem(userId: string, credits: number, kurus: number, payout: CreditRequest['payout']) {
  const id = newId();
  return db.batch([
    { name: 'creditRequests', id, data: { userId, type: 'bozdurma', credits, kurus, payout, status: 'bekliyor', createdAt: Date.now() } },
    { name: 'wallets', id: userId, data: { held: inc(credits), op: id } },
  ]);
}

export function buyProductWithCredits(userId: string, product: Product) {
  const id = newId();
  return db.batch([
    { name: 'orders', id, data: { userId, productId: product.id, productName: product.name, pay: 'kredi', credits: product.priceCredits, kurus: 0, status: 'Ödendi', createdAt: Date.now() } },
    { name: 'wallets', id: userId, data: { balance: inc(-product.priceCredits), op: id } },
  ]);
}

/** Alıcıdan düşme, satıcıya ekleme ve satın alma kaydı birlikte yazılır. */
export function buyListing(buyerId: string, listing: { id: string; sellerId: string; priceCredits: number }) {
  const id = `${buyerId}_${listing.id}`;
  return db.batch([
    { name: 'purchases', id, data: { buyerId, listingId: listing.id, sellerId: listing.sellerId, createdAt: Date.now() } },
    { name: 'wallets', id: buyerId, data: { balance: inc(-listing.priceCredits), op: id } },
    { name: 'wallets', id: listing.sellerId, data: { balance: inc(listing.priceCredits), held: inc(0), op: id } },
  ]).then(() => id);
}

const MAX_INLINE = 1_500_000;

/** Canlıda Worker imzasıyla özel olarak yükler. Demo modunda küçük dosyayı tarayıcıda tutar. */
/** Telefon fotoğrafları yüklenmeden küçültülür. Çözülemeyen biçim olduğu gibi gönderilir. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export async function uploadFile(original: File): Promise<string> {
  const file = await shrinkImage(original);
  if (firebaseEnabled) {
    const { signedUpload, workerEnabled } = await import('./worker');
    if (!workerEnabled) throw new Error('Dosya yükleme henüz ayarlanmadı. Yöneticiye bildirin.');
    return signedUpload(file);
  }
  if (file.size > MAX_INLINE) throw new Error('Demo modunda dosya en fazla 1,5 MB olabilir.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}
