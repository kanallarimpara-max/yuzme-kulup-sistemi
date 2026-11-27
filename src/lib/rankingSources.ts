import { parseEventTitle, parseResultPages, type PdfItem } from './tyf.ts';
import { parseTopluPages } from './tyfToplu.ts';
import { parseSwimTime } from './rules.ts';
import type { RaceMark } from './nationalRanking.ts';
import type { LiveEvent } from './tyfLinks.ts';

type Pool = RaceMark['pool'];
const duration = /^(?:\d+:)?\d{1,2}[.,]\d{2}$/;
function relay(title: string) {
  const match = title.match(/(\d+)\s*[x×]\s*(\d+)\s*m/i);
  if (!match) return null;
  const gender = /erkek/i.test(title) ? 'E' : /kad[ıi]n|k[ıi]z|bayan/i.test(title) ? 'K' : /karma|mix/i.test(title) ? 'Karma' : null;
  const stroke = /serbest/i.test(title) ? 'serbest' : /kar[ıi][şs][ıi]k/i.test(title) ? 'karisik' : null;
  return gender && stroke ? {gender, stroke, legs:Number(match[1]), distance:Number(match[2])} as const : null;
}
const dateOf = (text: string) => {
  const m = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  return m ? m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0') : '';
};
export function liveRankMarks(pages: PdfItem[][], event: LiveEvent, pool: Pool): RaceMark[] {
  const title = event.gender+' '+event.name;
  const team = relay(title);
  const date = pages[0]?.map(c => dateOf(c.text)).find(Boolean);
  if (!date) return [];
  if (!team) {
    if (!parseEventTitle(title)) return [];
    const parsed = parseResultPages(pages);
    if (!parsed) return [];
    return parsed.rows.flatMap(r => r.rank && r.timeMs && r.club ? [{ name:r.maskedName, club:r.club, year:r.birthYear, gender:parsed.gender, distance:parsed.distance, stroke:parsed.stroke, legs:1, date, pool, ms:r.timeMs }] : []);
  }
  return pages.flatMap(page => page.flatMap(cell => {
    if (cell.x < 420 || !duration.test(cell.text.trim())) return [];
    const ranked = page.some(c => c.x < 70 && Math.abs(c.y-cell.y)<2 && /^\d+$/.test(c.text.trim()));
    const club = page.filter(c => c.x>100 && c.x<320 && c.y >=cell.y-1 && c.y<cell.y+10 && c.text.trim()).sort((a,b)=>b.y-a.y)[0]?.text.trim();
    const ms = parseSwimTime(cell.text);
    return ranked && club && ms ? [{...team, name:club, club, year:0, date, pool, ms}] : [];
  }));
}

export function archiveRankMarks(pages: PdfItem[][], pool: Pool): RaceMark[] {
  const marks: RaceMark[] = parseTopluPages(pages).flatMap(e => e.rows.flatMap(r => r.timeMs ? [{name:r.name, club:r.club, year:r.birthYear, gender:e.gender, distance:e.distance, stroke:e.stroke, legs:1, date:e.date, pool, ms:r.timeMs}] : []));
  let team: ReturnType<typeof relay> = null;
  let date = '';
  for (const page of pages) {
    const lines = new Map<number,PdfItem[]>();
    for (const c of page) {
      if (!c.text.trim()) continue;
      const y = Math.round(c.y);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(c);
    }
    for (const [,cells] of [...lines].sort((a,b)=>b[0]-a[0])) {
      cells.sort((a,b)=>a.x-b.x);
      const text = cells.map(c=>c.text.trim()).join(' ');
      if (/^Yarış\s+\d+/i.test(text)) { team = relay(text); continue; }
      if (!team) continue;
      if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(text)) { date=dateOf(text); continue; }
      if (!date || /\b(?:DSQ|DNS|DNF|DQ)\b/i.test(text)) continue;
      const first = /^\d+\.?$/.test(cells[0].text.trim()) ? 1 : 0;
      const time = cells.findIndex(c=>duration.test(c.text.trim()));
      if (time < first+1 || cells[first].x > 160 || !/\p{L}/u.test(cells[first].text)) continue;
      if (first===0 && (time<2 || cells[time].x<300)) continue;
      const name = cells[first].text.trim();
      const club = time>first+1 ? cells[time-1].text.trim() : name;
      const ms = parseSwimTime(cells[time].text);
      if (ms) marks.push({...team,name,club,year:0,date,pool,ms});
    }
  }
  return marks;
}

