import { useEffect } from 'react';
import { useCollection, type Row } from './store';
import { useTheme } from './theme';

export type AppDesign = Row & { appName: string; logoUrl: string; accent: string; background: string; panel: string; supportEmail?: string };
export type Ad = Row & { title: string; imageUrl: string; linkUrl: string; slot: string; active: boolean };

export const DEFAULT_DESIGN = { appName: 'Kulvar360', logoUrl: '', accent: '#27c4d8', background: '#07182b', panel: '#0e2439', supportEmail: '' };

/** Açık renkli vurguda koyu, koyu vurguda açık yazı kullanılır. */
const inkFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const light = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return light > 0.55 ? '#04202a' : '#ffffff';
};

/** Süper adminin belirlediği tasarımı tüm uygulamaya uygular. */
export function useAppDesign() {
  const saved = useCollection<AppDesign>('appDesign', { id: 'main' })[0];
  const design = { ...DEFAULT_DESIGN, ...saved };
  const theme = useTheme();
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', design.accent);
    root.setProperty('--accent-ink', inkFor(design.accent));
    // Süper adminin zemin renkleri karanlık moda aittir; aydınlık mod okunabilir kendi zeminini kullanır.
    if (theme === 'dark') {
      root.setProperty('--bg', design.background);
      root.setProperty('--panel', design.panel);
    } else {
      root.removeProperty('--bg');
      root.removeProperty('--panel');
    }
    document.title = design.appName;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? design.background : '#eff5f9');
  }, [design.accent, design.background, design.panel, design.appName, theme]);
  return design;
}

const safeUrl = (url: string) => (/^https:\/\//i.test(url) ? url : undefined);

export function AdSlot({ slot }: { slot: string }) {
  const ad = useCollection<Ad>('ads').find((a) => a.active && a.slot === slot);
  const image = ad && safeUrl(ad.imageUrl);
  if (!ad || !image) return null;
  const banner = <><img src={image} alt={ad.title} /><small>Reklam · {ad.title}</small></>;
  const link = safeUrl(ad.linkUrl);
  return link
    ? <a className="ad-slot" href={link} target="_blank" rel="noreferrer sponsored">{banner}</a>
    : <div className="ad-slot">{banner}</div>;
}
