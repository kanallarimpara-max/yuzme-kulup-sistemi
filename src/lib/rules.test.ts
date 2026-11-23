import { describe, expect, it } from 'vitest';
import {
  addMonths, financeSummary, analyzeAthlete, lessonsAt, applyDiscount, buildInstallments, classifyMatch, clubMatchScore, coachFit, creditBalance, formatSwimTime,
  hourSlots, lessonDates, lessonEndDate, normalizeName, parseSwimTime, passedStandards, paymentSummary, redeemKurus, sessionDates, sessionState,
} from './rules';
import { beepsBetween, buildSteps, jumpLane, laneElapsed, pauseLane, startLane, timerView, totalMs, type WorkoutSet } from './timer';

describe('ders takvimi', () => {
  it('seçili günlere göre bitiş tarihini hesaplar', () => {
    expect(lessonDates('2026-11-23', [1, 3], 4)).toEqual(['2026-11-23', '2026-11-25', '2026-11-30', '2026-12-02']);
    expect(lessonEndDate('2026-11-24', [1], 1)).toBe('2026-11-30');
    expect(lessonEndDate('2026-11-24', [], 4)).toBeNull();
  });
});

describe('ödeme', () => {
  it('ay sonu vadesini taşırmaz', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
  it('indirim sıfırın altına inmez', () => {
    expect(applyDiscount(100000, { type: 'percent', value: 15 })).toBe(85000);
    expect(applyDiscount(1000, { type: 'amount', value: 5000 })).toBe(0);
  });
  it('taksit toplamı kuruşu kuruşuna tutar', () => {
    const { totalKurus, installments } = buildInstallments(100000, 3, 10, '2026-12-31');
    expect(totalKurus).toBe(110000);
    expect(installments.reduce((s, i) => s + i.amountKurus, 0)).toBe(110000);
    expect(installments.map((i) => i.dueDate)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
  });
  it('tek çekimde faiz uygulamaz', () => {
    expect(buildInstallments(100000, 1, 10, '2026-12-01').totalKurus).toBe(100000);
  });
});

describe('ödeme özeti', () => {
  const plan = [
    { no: 1, dueDate: '2026-11-01', amountKurus: 1000, paidAt: '2026-11-01', method: 'Nakit' },
    { no: 2, dueDate: '2026-12-01', amountKurus: 1000 },
  ];
  it('kalan borç ve vadeyi hesaplar', () => {
    const s = paymentSummary(plan, '2026-11-23');
    expect([s.paidKurus, s.remainingKurus, s.daysToDue, s.status]).toEqual([1000, 1000, 8, 'bekliyor']);
  });
  it('geciken ve biten planı ayırır', () => {
    expect(paymentSummary(plan, '2026-12-02').status).toBe('gecikti');
    expect(paymentSummary([plan[0]], '2026-12-02').status).toBe('odendi');
  });
});

describe('finans', () => {
  it('ciro, tahsilat, alacak ve kârı ayırır', () => {
    const f = financeSummary({
      plans: [{ installments: [
        { no: 1, dueDate: '2026-11-01', amountKurus: 10000, paidAt: '2026-11-02', method: 'Nakit' },
        { no: 2, dueDate: '2026-12-01', amountKurus: 10000 },
      ] }],
      expenses: [{ date: '2026-11-05', amountKurus: 1500 }],
      salaries: [{ date: '2026-12-01', amountKurus: 3000 }],
    });
    expect([f.revenueKurus, f.collectedKurus, f.receivableKurus, f.profitKurus]).toEqual([20000, 10000, 10000, 5500]);
    expect(f.monthly).toEqual([{ month: '2026-11', collected: 10000, expense: 1500 }, { month: '2026-12', collected: 0, expense: 3000 }]);
  });
});

describe('kredi', () => {
  it('bozdurma tutarını ve bakiyeyi hesaplar', () => {
    expect(redeemKurus(1000, 1000, 5000)).toBe(5000);
    expect(redeemKurus(250, 1000, 5000)).toBe(1250);
    expect(creditBalance([{ delta: 500 }, { delta: -100 }, { delta: 900, status: 'pending' }, { delta: 50, status: 'rejected' }])).toBe(400);
  });
});

describe('TYF eşleştirme', () => {
  it('Türkçe karakter ve kulüp eklerini yok sayar', () => {
    expect(normalizeName('İSTANBUL Yüzme Şöleni')).toBe('istanbul yuzme soleni');
    expect(classifyMatch(clubMatchScore('Mavi Dalga Spor Kulübü', 'MAVİ DALGA SK'))).toBe('auto');
  });
  it('farklı kulübü otomatik eşleştirmez', () => {
    expect(classifyMatch(clubMatchScore('Mavi Dalga Spor Kulübü', 'Kırmızı Yıldız SK'))).toBe('none');
  });
  it('süreleri çevirir', () => {
    expect(parseSwimTime('1:02.34')).toBe(62340);
    expect(parseSwimTime('28,5')).toBe(28500);
    expect(parseSwimTime('00:16:01.20')).toBe(961200);
    expect(parseSwimTime('DSQ')).toBeNull();
    expect(formatSwimTime(62340)).toBe('1:02.34');
    expect(formatSwimTime(28500)).toBe('28.50');
  });
});

describe('barajlar', () => {
  const standard = { title: 'Türkiye Şampiyonası', gender: 'K' as const, age: 12, stroke: 'serbest' as const, distance: 100, timeMs: 70000 };
  it('yaş ve cinsiyete uygun geçilen barajı bulur', () => {
    const results = [{ stroke: 'serbest' as const, distance: 100, timeMs: 69000 }, { stroke: 'serbest' as const, distance: 100, timeMs: 72000 }];
    expect(passedStandards(results, [standard], { gender: 'K', birthYear: 2014 }, 2026)[0].bestMs).toBe(69000);
    expect(passedStandards(results, [standard], { gender: 'E', birthYear: 2014 }, 2026)).toEqual([]);
    expect(passedStandards(results, [standard], { gender: 'K', birthYear: 2013 }, 2026)).toEqual([]);
  });
  it('havuz boyunu, yaş aralığını ve yarış yılını dikkate alır', () => {
    const long = { ...standard, age: 16, maxAge: 18, pool: '50m' as const, when: '14-17 NİSAN 2027' };
    const short = [{ stroke: 'serbest' as const, distance: 100, timeMs: 60000, pool: '25m' as const }];
    const lcm = [{ ...short[0], pool: '50m' as const }];
    expect(passedStandards(short, [long], { gender: 'K', birthYear: 2010 }, 2026)).toEqual([]);
    expect(passedStandards(lcm, [long], { gender: 'K', birthYear: 2010 }, 2026)).toHaveLength(1);
    expect(passedStandards(lcm, [long], { gender: 'K', birthYear: 2012 }, 2026)).toEqual([]);
  });
});

describe('antrenör uygunluğu', () => {
  const lesson = { coachIds: [], weekdays: [1], startTime: '17:30', endTime: '19:00', startDate: '2026-12-01', endDate: '2027-01-31' };
  const slots = [17, 18].map((hour) => ({ coachId: 'c', branchId: 'b', weekday: 1, hour }));
  it('saat dilimlerini kapsar', () => {
    expect(hourSlots('17:30', '19:00')).toEqual([17, 18]);
  });
  it('müsaitlik, şube ve çakışmayı ayırt eder', () => {
    expect(coachFit('c', 'b', lesson, slots, [])).toBe('uygun');
    expect(coachFit('c', 'x', lesson, slots, [])).toBe('musait-degil');
    expect(coachFit('c', 'b', lesson, slots.slice(0, 1), [])).toBe('musait-degil');
    expect(coachFit('c', 'b', lesson, slots, [{ ...lesson, id: 'o', coachIds: ['c'], startTime: '18:30', endTime: '20:00' }])).toBe('cakisiyor');
  });
  it('biten dersle veya bitişik saatle çakışmaz', () => {
    expect(coachFit('c', 'b', lesson, slots, [{ ...lesson, id: 'o', coachIds: ['c'], startDate: '2026-01-01', endDate: '2026-02-01' }])).toBe('uygun');
    expect(coachFit('c', 'b', lesson, slots, [{ ...lesson, id: 'o', coachIds: ['c'], startTime: '19:00', endTime: '20:00' }])).toBe('uygun');
  });
});

describe('yoklama ve analiz', () => {
  const lesson = { id: 'l', weekdays: [1], startTime: '17:00', endTime: '18:00', startDate: '2026-11-01', endDate: '2026-12-31' };
  it('sistem saatine göre aktif dersi bulur', () => {
    expect(lessonsAt([lesson], new Date(2026, 10, 23, 17, 30)).active?.id).toBe('l');
    expect(lessonsAt([lesson], new Date(2026, 10, 23, 18, 0)).active).toBeNull();
    expect(lessonsAt([lesson], new Date(2026, 10, 24, 17, 30)).todays).toEqual([]);
  });
  it('yoklama seanslarını ve girilmeyen dersi ayırır', () => {
    expect(sessionDates({ weekdays: [1, 3], startDate: '2026-11-23', endDate: '2026-12-02' })).toEqual(['2026-11-23', '2026-11-25', '2026-11-30', '2026-12-02']);
    const now = new Date(2026, 10, 25, 17, 30);
    expect(sessionState('2026-11-23', '18:00', true, now)).toBe('kayitli');
    expect(sessionState('2026-11-23', '18:00', false, now)).toBe('girilmedi');
    expect(sessionState('2026-11-25', '18:00', false, now)).toBe('bekliyor');
    expect(sessionState('2026-11-25', '17:00', false, now)).toBe('girilmedi');
    expect(sessionState('2026-11-30', '18:00', false, now)).toBe('bekliyor');
  });
  it('gelişim ve gerilemeyi ölçer', () => {
    const { trends, advice } = analyzeAthlete([
      { stroke: 'serbest', distance: 100, timeMs: 70000, date: '2026-01-01' },
      { stroke: 'serbest', distance: 100, timeMs: 63000, date: '2026-06-01' },
      { stroke: 'sirt', distance: 50, timeMs: 40000, date: '2026-01-01' },
      { stroke: 'sirt', distance: 50, timeMs: 42000, date: '2026-06-01' },
    ]);
    expect(trends[0].changePercent).toBe(10);
    expect(trends[1].changePercent).toBe(-5);
    expect(advice.join(' ')).toContain('geriledi');
  });
});

describe('kronometre', () => {
  const sets: WorkoutSet[] = [
    { name: 'Ana', reps: 2, distance: 100, stroke: 'serbest', intervalMs: 20000, restMs: 10000 },
    { name: 'Çıkış', reps: 1, distance: 50, stroke: 'sırt', intervalMs: 15000, restMs: 0 },
  ];
  it('adımları ve toplam süreyi kurar', () => {
    expect(buildSteps(sets).map((s) => s.kind)).toEqual(['swim', 'swim', 'rest', 'swim']);
    expect(totalMs(sets)).toBe(65000);
  });
  it('renk eşiklerini uygular', () => {
    expect(timerView(sets, 0).color).toBe('green');
    expect(timerView(sets, 10000).color).toBe('orange');
    expect(timerView(sets, 15000).color).toBe('red');
    expect(timerView(sets, 40000).color).toBe('purple');
    expect(timerView(sets, 65000).phase).toBe('done');
  });
  it('sıradaki seti yalnız son 6-3 saniye aralığında gösterir', () => {
    expect(timerView(sets, 43999).showNext).toBe(false);
    expect(timerView(sets, 44000).showNext).toBe(true);
    expect(timerView(sets, 46999).showNext).toBe(true);
    expect(timerView(sets, 47000).showNext).toBe(false);
  });
  it('sesli uyarıları kare atlasa da verir', () => {
    expect(beepsBetween(sets, 14000, 20000)).toEqual(['short', 'short', 'short', 'short', 'short', 'final']);
  });
  it('durdur, devam et ve setten başlat', () => {
    const running = startLane({ status: 'idle', startedAt: null, offsetMs: 0 }, 1000);
    const paused = pauseLane(running, 6000);
    expect(laneElapsed(paused, 99999)).toBe(5000);
    expect(laneElapsed(startLane(paused, 10000), 11000)).toBe(6000);
    expect(laneElapsed(jumpLane(sets, 1, 500), 500)).toBe(50000);
  });
});
