import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Şifre alanı: yanındaki göz düğmesiyle yazılan şifre gösterilir veya gizlenir. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <span className="password-field">
      <input {...props} type={shown ? 'text' : 'password'} />
      <button type="button" className="ghost icon" aria-label={shown ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={shown} title={shown ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setShown((s) => !s)}>
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
