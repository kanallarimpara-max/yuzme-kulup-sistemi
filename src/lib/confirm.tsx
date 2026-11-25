import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Ask = { title: string; text?: string; ok?: string; danger?: boolean };
type Pending = Ask & { resolve: (yes: boolean) => void };

/**
 * Önemli işlemlerden önce kullanıcıdan onay alır.
 * Kullanım: const [confirmDialog, confirm] = useConfirm(); if (await confirm({ title: 'Silinsin mi?' })) ...
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const confirm = useCallback((ask: Ask) => new Promise<boolean>((resolve) => setPending({ ...ask, resolve })), []);
  const close = (yes: boolean) => {
    pending?.resolve(yes);
    setPending(null);
  };
  useEffect(() => {
    if (!pending) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const dialog = pending ? createPortal(
    <div className="modal-backdrop" onClick={() => close(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="onay-baslik" onClick={(e) => e.stopPropagation()}>
        <h2 id="onay-baslik">{pending.title}</h2>
        {pending.text && <p className="muted">{pending.text}</p>}
        <div className="form-actions">
          <button ref={okRef} className={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{pending.ok ?? 'Onayla'}</button>
          <button onClick={() => close(false)}>Vazgeç</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;
  return [dialog, confirm] as const;
}
