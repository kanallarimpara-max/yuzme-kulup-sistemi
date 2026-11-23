import { describe, expect, it } from 'vitest';
import { toKurus } from './format';
import { laneElapsed, startLane } from './timer';

describe('para girişi', () => {
  it.each([
    ['1500', 150000], ['1.500', 150000], ['1.500,50', 150050], ['12,5', 1250], ['12.5', 1250],
    ['1.250.000', 125000000], ['₺ 2.000', 200000], ['', 0], ['abc', 0], ['-5', 0],
  ])('%s', (text, kurus) => expect(toKurus(text)).toBe(kurus));
});

describe('kronometre', () => {
  it('çalışan kulvara tekrar başlat denince süre geri sarılmaz', () => {
    const running = startLane({ status: 'idle', startedAt: null, offsetMs: 0 }, 1000);
    expect(laneElapsed(startLane(running, 6000), 6000)).toBe(5000);
  });
});
