import { describe, expect, it } from 'vitest';
import { dueReminders, reminderStage, reminderText, tl } from './reminders';

describe('taksit hatırlatma', () => {
  it('vadeye göre doğru aşamayı seçer', () => {
    expect(reminderStage('2026-11-30', '2026-11-26')).toBeNull();
    expect(reminderStage('2026-11-29', '2026-11-26')).toBe('yaklasan');
    expect(reminderStage('2026-11-27', '2026-11-26')).toBe('yaklasan');
    expect(reminderStage('2026-11-26', '2026-11-26')).toBe('bugun');
    expect(reminderStage('2026-11-25', '2026-11-26')).toBe('gecikti');
    expect(reminderStage('2026-11-20', '2026-11-26')).toBe('gecikti');
    expect(reminderStage('2026-11-19', '2026-11-26')).toBe('gecikti2');
    expect(reminderStage('2026-10-27', '2026-11-26')).toBe('gecikti2');
    expect(reminderStage('2026-10-26', '2026-11-26')).toBeNull();
  });
  it('ay ve yıl geçişinde gün farkı doğru', () => {
    expect(reminderStage('2027-01-01', '2026-12-29')).toBe('yaklasan');
  });
  it('ödenmiş, velisiz ve kapalı kulüp taksiti atlanır', () => {
    const base = { studentId: 's', installments: [{ no: 1, dueDate: '2026-11-26', amountKurus: 100 }] };
    const list = dueReminders([
      { id: 'a', clubId: 'c', parentId: 'p', ...base },
      { id: 'b', clubId: 'c', parentId: '', ...base },
      { id: 'c', clubId: 'kapali', parentId: 'p', ...base },
      { id: 'd', clubId: 'c', parentId: 'p', studentId: 's', installments: [{ no: 1, dueDate: '2026-11-26', amountKurus: 100, paidAt: '2026-11-20' }] },
    ], '2026-11-26', ['kapali']);
    expect(list.map((r) => r.id)).toEqual(['odeme-a-1-bugun']);
  });
  it('tutarı Türkçe yazar ve metin gecikme gününü söyler', () => {
    expect(tl(150000)).toBe('1.500,00 TL');
    expect(tl(123456789)).toBe('1.234.567,89 TL');
    expect(tl(5)).toBe('0,05 TL');
    const t = reminderText({ no: 2, count: 4, dueDate: '2026-11-20', amountKurus: 250050, stage: 'gecikti', days: -6 }, 'Ali Kaya');
    expect(t.title).toBe('Taksit ödemesi gecikti');
    expect(t.body).toContain('Ali Kaya · 2/4. taksit · 2.500,50 TL · vade 20.11.2026');
    expect(t.body).toContain('6 gün geçti');
  });
});
