// Önbellekte yalnız TYF'nin yayımladığı sonuçlar bulunur; uygulamadaki öğrenci listesi bellekte kalır.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { pagesOf, jobClient } from './tyf-is.mjs';
import { parseResultList, RESULT_LIST_URL, poolFor } from '../src/lib/tyfToplu.ts';
import { normalizeMeetUrl, parseMeetPage } from '../src/lib/tyfLinks.ts';
import { liveRankMarks, archiveRankMarks } from '../src/lib/rankingSources.ts';
import { nationalRanks } from '../src/lib/nationalRanking.ts';

const call = await jobClient();
const state = await call('/results/athletes', {});
const year = new Date().getUTCFullYear();
const cacheDir = process.env.RANK_CACHE_DIR;
mkdirSync(cacheDir,{recursive:true});
const path = join(cacheDir, year+'.json.gz');
const cache = existsSync(path) ? JSON.parse(gunzipSync(readFileSync(path)).toString()) : {};
const sources = new Map();
const digest = s => createHash('sha256').update(s).digest('hex');
const get = url => fetch(url,{signal:AbortSignal.timeout(25000)});
const list = await get(RESULT_LIST_URL);
if (!list.ok) throw Error('TYF dosya listesi okunamadı.');
const archive = parseResultList(await list.text()).filter(f=>Number(f.month.slice(0,4))>=year);
for (const f of archive) sources.set(f.url,{archive:f});
const meets = state.meets.filter(m=>m.endDate >= year+'-01-01' || m.startDate >= year+'-01-01');
let missingMeets=0;
meets.sort((a,b)=>b.startDate.localeCompare(a.startDate));
for (const m of meets) {
  const url=normalizeMeetUrl(m.url);
  if (!url) continue;
  let events=cache[url]?.events;
  if (!events || !m.version || cache[url].version!==m.version) {
    try {
      const response=await get(url);
      if (!response.ok) throw Error('TYF');
      const next=parseMeetPage(await response.text(),url).sessions.flatMap(s=>s.events).filter(e=>e.resultUrl);
      if (next.length || !events) { events=next; cache[url]={version:m.version,events}; }
    } catch { missingMeets++; }
  }
  const pool=m.info.match(/\b(25|50)\s*Metre/i)?.[1];
  if (!pool) {missingMeets++;continue;}
  for (const event of events ?? []) sources.set(event.resultUrl.split('?')[0],{event,pool:pool+'m'});
}
const now=Date.now();
const queue=[...sources.entries()].filter(([key,s])=>{
  const prev=cache[key];
  if (!prev || prev.version!==(s.event?.resultUrl ?? 'archive')) return true;
  return now-prev.checked > (s.archive ? 24 : 168)*3600000;
}).sort(([a],[b])=>(cache[a]?.checked??0)-(cache[b]?.checked??0));
let failures=0;
const budget=180;
for(let i=0;i<Math.min(queue.length,budget);i+=3) {
  await Promise.all(queue.slice(i,Math.min(i+3,budget)).map(async ([key,s])=>{
    try {
      const url=s.event?.resultUrl ?? key;
      const response=await get(url);
      if(!response.ok) throw Error('TYF');
      if(Number(response.headers.get('content-length'))>80_000_000) throw Error('PDF boyutu');
      const data=await response.arrayBuffer();
      const hash=digest(Buffer.from(data));
      if(cache[key]?.hash===hash && cache[key]?.rows?.length && !s.archive){cache[key].checked=now;cache[key].version=url;return;}
      const pages=await pagesOf(data);
      const dates=pages.flatMap(page=>page.flatMap(c=>[...c.text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)].map(m=>m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'))));
      const pool=s.pool ?? poolFor(s.archive.title,dates,meets);
      const rows=pool ? (s.event ? liveRankMarks(pages,s.event,pool) : archiveRankMarks(pages,pool)) : [];
      cache[key]={checked:now,version:s.event?.resultUrl ?? 'archive',hash,rows};
    } catch { failures++; }
  }));
}
writeFileSync(path,gzipSync(JSON.stringify(cache)));
const marks=[...sources.keys()].flatMap(k=>cache[k]?.rows ?? []).filter(r=>r.date.startsWith(year+'-'));
if (!marks.length) throw Error('Sıralanabilir sonuç bulunamadı; mevcut yayın korundu.');
const {boards,personal}=nationalRanks(marks,state.athletes,Object.fromEntries(state.clubs.map(c=>[c.id,c.name])));
const pages=[];
const groups=boards.map(({group,rows})=>{
  const ids=[];
  for(let i=0;i<rows.length;i+=200){
    const payload=JSON.stringify(rows.slice(i,i+200));
    const id=digest(payload);
    ids.push(id); pages.push({id,payload});
  }
  return {group,ids,count:rows.length};
});
const publish=async(collection,items)=>{
  for(let i=0;i<items.length;i+=20) await call('/results/ranks',{collection,items:items.slice(i,i+20)});
};
await publish('rankPages',[...new Map(pages.map(p=>[p.id,p])).values()]);
await publish('studentRanks',state.athletes.map(a=>({id:a.id,payload:JSON.stringify(personal.get(a.id)??[])})));
const used=[...sources.keys()].filter(k=>cache[k]?.rows?.length).length;
await publish('rankCatalog',[{id:'current',payload:JSON.stringify({groups,updated:now,used,total:sources.size,missingMeets})}]);
console.log('Sıralama: '+groups.length+' kategori, '+used+'/'+sources.size+' kaynak, '+failures+' geçici hata.');

