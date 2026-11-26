// Yeni kulübün açılış rehberi: hangi kurulum adımı tamam, sıradaki iş hangisi ve hangi ekranda yapılır.
export type SetupStep = { key: string; label: string; done: boolean; to: string; cta: string; help: string };

type Counts = { logo: boolean; branches: number; models: number; coaches: number; lessons: number; students: number };

export function clubSetupSteps(c: Counts): SetupStep[] {
  return [
    { key: 'logo', label: 'Kulüp logosunu ekle', done: c.logo, to: '/kulup', cta: 'Logoyu ekle', help: 'Logo ön kayıt formunda, menüde ve makbuzlarda görünür.' },
    { key: 'sube', label: 'Şube ekle', done: c.branches > 0, to: '/kulup', cta: 'Şube ekle', help: 'Derslerin yapıldığı havuz veya tesis.' },
    { key: 'model', label: 'Eğitim modeli ekle', done: c.models > 0, to: '/kulup', cta: 'Eğitim modeli ekle', help: 'Minikler, grup, performans gibi seviyeler.' },
    { key: 'antrenor', label: 'Antrenör ekle', done: c.coaches > 0, to: '/personel', cta: 'Antrenör ekle', help: 'Antrenör kendi hesabıyla yoklama ve derece girer.' },
    { key: 'ders', label: 'İlk dersi oluştur', done: c.lessons > 0, to: '/dersler', cta: 'İlk dersi oluştur', help: 'Şube, model ve antrenör seçilerek ders saati açılır.' },
    { key: 'ogrenci', label: 'İlk öğrenciyi kaydet', done: c.students > 0, to: '/ogrenciler', cta: 'Öğrencilere git', help: 'Ön kayıt bağlantısı paylaşılır, sekreter kesin kayda çevirir.' },
  ];
}

/** Sıradaki adım: önce zorunlu adımlar sırayla, logo en sona bırakılır. */
export function nextSetupStep(steps: SetupStep[]) {
  return steps.find((s) => !s.done && s.key !== 'logo') ?? steps.find((s) => !s.done) ?? null;
}
