import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { SessionProvider } from './lib/session';
import { startTheme } from './lib/theme';
import './styles.css';

// Service worker yalnız yayındaki web sürümünde çalışır; Electron ve Capacitor kendi dosyalarını yükler.
if (import.meta.env.PROD && location.protocol === 'https:' && location.hostname !== 'localhost' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js');
}

startTheme();

// HashRouter web, Electron dosya yolu ve Capacitor'da aynı şekilde çalışır.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </HashRouter>
  </StrictMode>,
);
