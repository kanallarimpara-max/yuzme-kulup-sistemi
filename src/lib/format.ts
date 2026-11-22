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

export const toKurus = (value: string) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};

export const dateTr = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export const dayNames = (days: number[]) =>
  WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.short).join(', ');
