import { normalizeName, clubMatchScore, classifyMatch, type Stroke } from './rules.ts';
import { maskedNameMatches } from './tyf.ts';
import type { TopluAthlete } from './tyfToplu.ts';

export type RaceMark = { name: string; club: string; year: number; gender: 'K' | 'E' | 'Karma'; legs: number; distance: number; stroke: Stroke; pool: '25m' | '50m'; date: string; ms: number; ageGroup?: string };
export type RankGroup = Pick<RaceMark, 'gender' | 'legs' | 'distance' | 'stroke' | 'pool'> & { year: number; ageGroup: string };
export type RankLine = { rank: number; name: string; club: string; ms: number };
export type PersonalPlace = { group: RankGroup; rank: number };
const tokens = (s: string) => normalizeName(s).split(' ').sort().join(' ');
const clubKey = (s: string) => normalizeName(s).replace(/\bs k\b|\bspor kulubu\b/g, 'sk');
const personKey = (r: RaceMark) => [r.gender, r.year, clubKey(r.club)].join('|');

export function nationalRanks(marks: RaceMark[], athletes: TopluAthlete[], clubs: Record<string, string>) {
  const known = new Map<string, Set<string>>();
  const buckets = new Map<string, { group: RankGroup; best: Map<string, RaceMark> }>();
  const personal = new Map<string, PersonalPlace[]>();
  for (const r of marks) {
    if (r.legs !== 1 || r.name.includes('*')) continue;
    const k = personKey(r);
    if (!known.has(k)) known.set(k, new Set());
    known.get(k)!.add(r.name);
  }
  for (const r of marks) {
    if (!r.name || !r.club || !Number.isFinite(r.ms) || r.ms <= 0) continue;
    let name = r.name;
    if (r.legs === 1 && name.includes('*')) {
      const matches = [...(known.get(personKey(r)) ?? [])].filter(n => maskedNameMatches(name, n));
      if (matches.length === 1) name = matches[0];
    }
    const group: RankGroup = { year: Number(r.date.slice(0, 4)), gender: r.gender, pool: r.pool, legs: r.legs, distance: r.distance, stroke: r.stroke, ageGroup: r.ageGroup ?? '' };
    const key = JSON.stringify(group);
    if (!buckets.has(key)) buckets.set(key, { group, best: new Map() });
    const best = buckets.get(key)!.best;
    const identity = [personKey(r), name.includes('*') ? name.toLocaleLowerCase('tr') : tokens(name)].join('|');
    if (!best.has(identity) || best.get(identity)!.ms > r.ms) best.set(identity, { ...r, name });
  }
  const boards = [...buckets.values()].map(({group,best}) => {
    const ordered = [...best.values()].sort((a,b) => a.ms-b.ms || a.name.localeCompare(b.name,'tr'));
    let rank = 0;
    const rows = ordered.map((r, i) => {
      if (i === 0 || ordered[i-1].ms !== r.ms) rank = i+1;
      if (r.legs === 1) {
        const matching = athletes.filter(a => a.gender === r.gender && a.birthYear === r.year &&
          classifyMatch(clubMatchScore(r.club, clubs[a.clubId] ?? '')) === 'auto' &&
          (r.name.includes('*') ? maskedNameMatches(r.name, a.firstName+' '+a.lastName) : tokens(r.name) === tokens(a.firstName+' '+a.lastName)));
        if (matching.length === 1) {
          const id = matching[0].id;
          const places = personal.get(id) ?? [];
          if (!places.some(p => p.group === group)) places.push({ group, rank });
          personal.set(id, places);
        }
      }
      return {rank, name:r.name, club:r.club, ms:r.ms};
    });
    return {group, rows};
  });
  return {boards, personal};
}

