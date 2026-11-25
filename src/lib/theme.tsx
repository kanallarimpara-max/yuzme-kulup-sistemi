import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';
const KEY = 'yuzme-tema';
const listeners = new Set<() => void>();

const saved = (): Theme | null => {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
};
const system = (): Theme => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

let current: Theme = saved() ?? system();

/** Kullanıcı seçim yapana kadar cihazın açık veya koyu ayarı izlenir. */
export function applyTheme(next: Theme = current) {
  current = next;
  document.documentElement.dataset.theme = next;
  listeners.forEach((l) => l());
}

export function startTheme() {
  applyTheme();
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!saved()) applyTheme(system());
  });
}

/** Kullanıcının seçtiği tema hatırlanır. */
export function setTheme(next: Theme) {
  try {
    localStorage.setItem(KEY, next);
  } catch { /* Kayıt tutulamazsa seçim bu oturumda geçerli kalır. */ }
  applyTheme(next);
}

export function toggleTheme() {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export const useTheme = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => current);

export function ThemeToggle({ className = 'ghost icon' }: { className?: string }) {
  const theme = useTheme();
  const label = theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç';
  return <button type="button" className={className} onClick={toggleTheme} aria-label={label} title={label}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>;
}
