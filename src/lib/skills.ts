// Yüzme beceri karnesi: antrenörün gözlemine göre her beceri üç düzeyden biriyle işaretlenir.
import type { Row } from './store';

export type SkillLevel = 'calisiyor' | 'destekle' | 'bagimsiz';
export const LEVELS: Array<{ id: SkillLevel; label: string; short: string }> = [
  { id: 'calisiyor', label: 'Çalışılıyor', short: 'Çalışılıyor' },
  { id: 'destekle', label: 'Destekle yapıyor', short: 'Destekle' },
  { id: 'bagimsiz', label: 'Bağımsız yapıyor', short: 'Bağımsız' },
];

export const SKILL_GROUPS: Array<{ title: string; skills: Array<{ id: string; label: string }> }> = [
  { title: 'Suya uyum', skills: [
    { id: 'yuz-sokma', label: 'Suya yüzünü sokma' },
    { id: 'nefes-verme', label: 'Su altında nefes verme (baloncuk)' },
    { id: 'yuzustu-suzulme', label: 'Yardımsız yüzüstü süzülme' },
    { id: 'sirtustu-durma', label: 'Yardımsız sırtüstü durma' },
    { id: 'kenardan-atlama', label: 'Havuz kenarından suya atlama' },
  ] },
  { title: 'Temel yüzme', skills: [
    { id: 'bacak-vurusu', label: 'Serbest bacak vuruşu' },
    { id: 'yan-nefes', label: 'Yana nefes alma' },
    { id: '25m-kesintisiz', label: '25 m kesintisiz yüzme' },
    { id: '25m-sirt', label: '25 m sırtüstü' },
    { id: '25m-kurbaga', label: '25 m kurbağalama' },
  ] },
  { title: 'İleri teknik', skills: [
    { id: '25m-kelebek', label: '25 m kelebek' },
    { id: 'takla-donus', label: 'Taklalı dönüş' },
    { id: 'start-dalis', label: 'Bloktan start (dalış)' },
    { id: '100m-karisik', label: '100 m karışık' },
    { id: '400m-kesintisiz', label: '400 m kesintisiz serbest' },
  ] },
];
export const ALL_SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);

export type SkillCard = Row & { clubId: string; studentId: string; parentId: string; coachId: string; marks: Record<string, SkillLevel>; updatedAt: number; updatedBy: string };

export const skillProgress = (marks: Record<string, SkillLevel> = {}) => {
  const independent = ALL_SKILLS.filter((s) => marks[s.id] === 'bagimsiz').length;
  return { independent, total: ALL_SKILLS.length, percent: Math.round((independent / ALL_SKILLS.length) * 100) };
};
