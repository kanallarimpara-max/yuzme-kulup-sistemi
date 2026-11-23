import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { studentScope } from '../../lib/access';
import { formatSwimTime } from '../../lib/rules';
import { dateTr, STROKE_LABEL } from '../../lib/format';
import { matchAthletes, readResultPdf, resultKey, type TyfEvent, type TyfMatch } from '../../lib/tyf';
import type { Student, SwimResult } from '../../lib/types';

type Found = { event: TyfEvent; match: TyfMatch; key: string; selected: boolean; exists: boolean };

export default function TyfImport() {
  const { club, user } = useSession();
  const clubId = club?.id ?? '';
  const students = useCollection<Student>('students', studentScope(user));
  const results = useCollection<SwimResult>('results', { clubId });
  const [pool, setPool] = useState<'25m' | '50m'>('50m');
  const [found, setFound] = useState<Found[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!club) return null;

  const read = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    setSummary('');
    const next: Found[] = [];
    let events = 0;
    let skipped = 0;
    let rows = 0;
    try {
      for (const file of Array.from(files)) {
        const event = await readResultPdf(await file.arrayBuffer());
        if (!event) {
          skipped += 1;
          continue;
        }
        events += 1;
        rows += event.rows.length;
        matchAthletes(event, club.name, students).forEach((match) => {
          const key = resultKey(match.athlete.id, event);
          const exists = results.some((r) => r.id === key);
          next.push({ event, match, key, exists, selected: match.confidence === 'auto' && !exists });
        });
      }
      setFound(next);
      setSummary(`${events} yarış, ${rows} sonuç okundu. ${next.length} kulüp sporcusu bulundu.${skipped ? ` ${skipped} dosya (bayrak veya farklı biçim) atlandı.` : ''}`);
    } catch {
      setError('PDF okunamadı. TYF sonuç dosyası seçtiğinizden emin olun.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const chosen = found.filter((f) => f.selected);
    await Promise.all(chosen.map(({ event, match, key }) => db.put('results', key, {
      clubId, studentId: match.athlete.id, stroke: event.stroke, distance: event.distance, timeMs: match.row.timeMs,
      date: event.date, pool, source: 'tyf', meet: event.meet, lapsMs: match.row.lapsMs,
    })));
    setFound((list) => list.map((f) => (f.selected ? { ...f, selected: false, exists: true } : f)));
    setSummary(`${chosen.length} derece sporcu profillerine aktarıldı.`);
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">TYF</p><h1>Yarış sonuçlarını aktar</h1></div><a className="button" href="https://www.tyf.gov.tr/canli-sonuc/" target="_blank" rel="noreferrer"><ExternalLink size={15} />Canlı sonuçlar</a></header>
      <section className="card stack">
        <p className="muted">TYF yarış sayfasındaki "Sonuçlar" PDF dosyalarını seçin. Kulübünüz, doğum yılı, cinsiyet ve yıldızlı ad birlikte eşleşirse derece hazırlanır.</p>
        <div className="form-grid">
          <label>Havuz<select value={pool} onChange={(e) => setPool(e.target.value as '25m' | '50m')}><option value="50m">50 m</option><option value="25m">25 m</option></select></label>
          <label>Sonuç PDF dosyaları<input type="file" accept="application/pdf" multiple disabled={busy} onChange={(e) => read(e.target.files)} /></label>
        </div>
        {busy && <p className="muted" role="status">PDF okunuyor…</p>}
        {summary && <p className="ok" role="status">{summary}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      {found.length > 0 && (
        <section className="card stack">
          <div className="table-wrap"><table>
            <thead><tr><th /><th>Sporcu</th><th>TYF adı</th><th>Branş</th><th>Derece</th><th>Lap</th><th>Tarih</th><th>Durum</th></tr></thead>
            <tbody>{found.map((f, i) => (
              <tr key={f.key}>
                <td><input type="checkbox" aria-label={`${f.match.athlete.firstName} derecesini seç`} disabled={f.exists} checked={f.selected} onChange={() => setFound((l) => l.map((x, n) => (n === i ? { ...x, selected: !x.selected } : x)))} /></td>
                <td>{f.match.athlete.firstName} {f.match.athlete.lastName}</td><td>{f.match.row.maskedName}</td>
                <td>{f.event.distance} m {STROKE_LABEL[f.event.stroke]}</td><td>{formatSwimTime(f.match.row.timeMs ?? 0)}</td>
                <td>{f.match.row.lapsMs.map(formatSwimTime).join(' / ') || '—'}</td><td>{dateTr(f.event.date)}</td>
                <td><em className={`badge ${f.exists ? '' : f.match.confidence === 'auto' ? 'good' : 'warn'}`}>{f.exists ? 'Kayıtlı' : f.match.confidence === 'auto' ? 'Kesin' : 'Kontrol et'}</em></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="form-actions"><button className="primary" disabled={!found.some((f) => f.selected)} onClick={save}>Seçilenleri aktar</button></div>
        </section>
      )}
    </div>
  );
}
