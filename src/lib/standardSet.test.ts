import { describe, expect, it } from 'vitest';
import { packStandards, unpackStandards, validPacked, type TitledStandard } from './standardSet';
import { STANDARDS } from './standardData';

describe('baraj paketi', () => {
  it('uygulamadaki tüm barajları kayıpsız taşır', () => {
    const list = STANDARDS as TitledStandard[];
    const packed = packStandards(list);
    expect(validPacked(packed)).toBe(true);
    expect(unpackStandards(packed)).toEqual(list);
    expect(JSON.stringify(packed).length).toBeLessThan(200000);
  });
  it('bozuk reglaman çıktısını reddeder', () => {
    const packed = packStandards(STANDARDS as TitledStandard[]);
    expect(validPacked({ sources: [], rows: [] })).toBe(false);
    expect(validPacked({ ...packed, rows: packed.rows.slice(0, 50) })).toBe(false);
    expect(validPacked({ ...packed, rows: [[0, 'katilim', '25m', 'K', 12, null, 'serbest', 50, 1], ...packed.rows] })).toBe(false);
    expect(validPacked({ ...packed, sources: [['x', 'y', 'https://evil.test/a.pdf'], ...packed.sources.slice(1)] })).toBe(false);
  });
});
