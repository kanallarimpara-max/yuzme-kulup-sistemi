import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';

const KEY = 'yuzme-gecici-sifre-kapatildi';

/** Geçici şifreyle açılan hesaba şifre değiştirmeyi önerir. Zorunlu değildir; kapatılınca bu cihazda bir daha gösterilmez. */
export default function TempPasswordNotice({ uid }: { uid: string }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === uid; } catch { return false; }
  });
  if (hidden) return null;
  const close = () => {
    try { localStorage.setItem(KEY, uid); } catch { /* Kaydedilemezse yalnız bu oturumda kapanır. */ }
    setHidden(true);
  };
  return (
    <div className="temp-notice" role="status">
      <span>Hesabın geçici bir şifreyle açıldı. Güvenliğin için kendi şifreni belirlemeni öneririz (zorunlu değil).</span>
      <div>
        <NavLink className="button primary" to="/ayarlar">Şifremi değiştir</NavLink>
        <button className="ghost icon" aria-label="Bildirimi kapat" title="Kapat" onClick={close}><X size={18} /></button>
      </div>
    </div>
  );
}
