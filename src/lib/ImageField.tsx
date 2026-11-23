import { useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadFile } from './credits';

/** Görsel cihazdan yüklenir; hazır bağlantısı olan kullanıcı adresi de yapıştırabilir. */
export default function ImageField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (url: string) => void; required?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      setError((err as Error).message || 'Görsel yüklenemedi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="image-field">
      <label>{label}<input type="url" required={required} placeholder="https://" value={value} onChange={(e) => onChange(e.target.value)} /></label>
      <label className="button">
        <Upload size={16} />{busy ? 'Yükleniyor…' : 'Cihazdan seç'}
        <input className="sr-only" type="file" accept="image/*" disabled={busy} aria-label={`${label} dosyası`} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {value && <img src={value} alt="" />}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
