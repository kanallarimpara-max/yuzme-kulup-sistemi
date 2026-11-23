import { describe, expect, it } from 'vitest';
import { clockOffset, laneElapsed } from './timer';

describe('kronometre saat eşitleme', () => {
  it('ağ gecikmesinin yarısını düşerek cihaz farkını bulur', () => {
    expect(clockOffset(1000, 6100, 1200)).toBe(5000);
    expect(clockOffset(9000, 4100, 9200)).toBe(-5000);
  });

  it('saatleri farklı iki cihaz aynı kulvar süresini gösterir', () => {
    const lane = { status: 'running' as const, startedAt: 100000, offsetMs: 0 };
    const trueNow = 130000;
    const fastDevice = trueNow + 7000 + clockOffset(trueNow + 7000, trueNow, trueNow + 7000);
    const slowDevice = trueNow - 4000 + clockOffset(trueNow - 4000, trueNow, trueNow - 4000);
    expect(laneElapsed(lane, fastDevice)).toBe(30000);
    expect(laneElapsed(lane, slowDevice)).toBe(30000);
  });
});
