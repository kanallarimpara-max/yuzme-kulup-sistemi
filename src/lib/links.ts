const project = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Windows ve Android uygulamasının kendi adresi dışarıdan açılamaz; paylaşılan bağlantı her zaman web adresidir.
const webBase = import.meta.env.PROD && project ? `https://${project}.web.app/` : `${location.origin}${location.pathname}`;

export const preRegLink = (slug: string) => `${webBase}#/on-kayit/${slug}`;
