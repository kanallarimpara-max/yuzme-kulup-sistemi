export const WEEKDAYS = [
  { value: 1, short: 'Pzt', long: 'Pazartesi' },
  { value: 2, short: 'Sal', long: 'Salı' },
  { value: 3, short: 'Çar', long: 'Çarşamba' },
  { value: 4, short: 'Per', long: 'Perşembe' },
  { value: 5, short: 'Cum', long: 'Cuma' },
  { value: 6, short: 'Cmt', long: 'Cumartesi' },
  { value: 0, short: 'Paz', long: 'Pazar' },
];

export const STROKE_LABEL = { serbest: 'Serbest', kelebek: 'Kelebek', sirt: 'Sırt', kurbaga: 'Kurbağa', karisik: 'Karışık' } as const;

export const money =(kurus: number) =>
  (kurus / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

/** Türkçe yazımı anlar: 1.500 = bin beş yüz, 1.500,50 ve 12,5 ondalıklıdır. */
export const toKurus = (value: string) => {
  const raw = value.replace(/[\s₺]/g, '');
  const plain = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  const n = Number(plain);
  return plain && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};

export const dateTr = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export const dayNames = (days: number[]) =>
  WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.short).join(', ');

/** E-posta biçimi: boşluk yok, tek @, alan adında nokta ve en az iki harfli uzantı. */
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim()) && !/\.\./.test(email);

/** Hesap açarken Firebase'in döndürdüğü hatayı Türkçe açıklar. */
export function accountError(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('email-already-in-use')) return 'Bu e-posta ile açılmış bir hesap zaten var.';
  if (code.includes('invalid-email')) return 'E-posta adresi geçersiz.';
  if (code.includes('weak-password')) return 'Şifre çok zayıf, en az 8 karakterli daha güçlü bir şifre seç.';
  if (code.includes('network')) return 'Bağlantı kurulamadı, internetini kontrol et.';
  return '';
}
