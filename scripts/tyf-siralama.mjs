// Önbellekte yalnız TYF'nin yayımladığı sonuçlar bulunur; uygulamadaki öğrenci listesi bellekte kalır.
import { createHash } from 'node:crypto';

import { gzipSync, gunzipSync } from 'node:zlib';
import { pagesOf, jobClient } from './tyf-is.mjs';
import { parseResultList, RESULT_LIST_URL, poolFor } from '../src/lib/tyfToplu.ts';
import { normalizeMeetUrl, parseMeetPage } from '../src/lib/tyfLinks.ts';
import { liveRankMarks, archiveRankMarks } from '../src/lib/rankingSources.ts';
import { nationalRanks } from '../src/lib/nationalRanking.ts';

const call = await jobClient();
let state;
let indexVersion;
let publishPending = true;
let sourceSignature = '';
const watch = process.argv.includes('--watch');
const year = new Date().getUTCFullYear();
// Parçalar pasif yuvaya yazılır. Yalnız son yazım etkin yuvayı değiştirir.
const cacheCall = (id,payload) => call('/results/rank-cache',{id:year+'-'+id,payload});
let manifest = JSON.parse((await cacheCall('current')).payload ?? 'null');
const chunks = [];
for (let i=0;i<(manifest?.count ?? 0);i++) {
  const piece = await cacheCall(manifest.slot+'-'+i);
  if (!piece.payload) throw Error('Sonuç arşivinde parça eksik.');
  chunks.push(Buffer.from(piece.payload,'base64'));
}
const cache = manifest ? JSON.parse(gunzipSync(Buffer.concat(chunks)).toString()) : {};
const archiveVersion = 'archive-2';

const digest = s => createHash('sha256').update(s).digest('hex');
const get = url => fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});

async function scan() {
  const sources = new Map();
  const {version} = await call('/results/rank-version',{});
  if (!state || indexVersion !== version) {
    state = await call('/results/athletes',{});
    indexVersion=version;
  }
  const list = await get(RESULT_LIST_URL);
  if (!list.ok) throw Error('TYF dosya listesi okunamadı.');
  const listed = parseResultList(await list.text());
  if (!listed.length) throw Error('TYF arşiv listesi boş.');
  const archive = listed.filter(f=>Number(f.month.slice(0,4))>=year);
  for (const f of archive) sources.set(f.url,{archive:f});
  const meets = state.meets.filter(m=>m.endDate >= year+'-01-01' || m.startDate >= year+'-01-01');
  let missingMeets=0;
  meets.sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
  for (const m of meets) {
    const url=normalizeMeetUrl(m.url);
    if (!url) continue;
    let events=cache[url]?.events;
    if (!events || !m.version || cache[url].version!==m.version) {
      try {
        const response=await get(url);
        if (!response.ok) throw Error('TYF');
        const detail=parseMeetPage(await response.text(),url);
        const next=detail.sessions.flatMap(s=>s.events).filter(e=>e.resultUrl);
        if (next.length || !events || detail.sessions.length) { events=next; cache[url]={version:m.version,events}; }
      } catch { missingMeets++; }
    }
    const pool=m.info.match(/\b(25|50)\s*Metre/i)?.[1];
    if (!pool) {missingMeets++;continue;}
    for (const event of events ?? []) sources.set(event.resultUrl.split('?')[0],{event,pool:pool+'m',active:m.startDate<=today && (m.endDate||m.startDate)>=today});
  }
  const now=Date.now();
  const all = [...sources.entries()];
  const signature = digest(JSON.stringify(all.map(([key,s])=>[key,s.pool,s.archive?.title]).sort((a,b)=>a[0].localeCompare(b[0]))));
  if (sourceSignature !== signature) publishPending=true;
  const minute = Math.floor(now / 60000);
  const active = all.filter(([,s])=>s.active);
  const old = all.filter(([,s])=>!s.active && !s.archive).sort(([a],[b])=>a.localeCompare(b));
  const archives = all.filter(([,s])=>s.archive).sort(([a],[b])=>a.localeCompare(b));
  const rotating = (list,count) => Array.from({length:Math.min(count,list.length)},(_,i)=>list[(minute*count+i)%list.length]);
  const revised = all.filter(([key,s])=>cache[key]?.version!==(s.event?.resultUrl ?? archiveVersion));
  const queue = [...new Map([...revised,...active,...rotating(archives,2),...rotating(old,32)]).entries()];
  let failures=0;
  let changed=0;
  for(let i=0;i<queue.length;i+=6) {
    await Promise.all(queue.slice(i,i+6).map(async ([key,s])=>{
      try {
        const url=s.event?.resultUrl ?? key;
        const response=await get(url);
        if(!response.ok) throw Error('TYF');
        if(Number(response.headers.get('content-length'))>80_000_000) throw Error('PDF boyutu');
        const data=await response.arrayBuffer();
        const hash=digest(Buffer.from(data));
        const context=s.event ? JSON.stringify([s.pool,s.event.gender,s.event.name]) : JSON.stringify([s.archive.title, meets.map(m=>[m.info,m.startDate,m.endDate])]);
        const parsing=digest(context+archiveVersion);
        if(cache[key]?.hash===hash && cache[key].parsing===parsing) {
          cache[key].version=s.event?.resultUrl ?? archiveVersion;
          return;
        }
        const pages=await pagesOf(data);
        const dates=pages.flatMap(page=>page.flatMap(c=>[...c.text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)].map(m=>m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'))));
        const pool=s.pool ?? poolFor(s.archive.title,dates,meets);
        const rows=pool ? (s.event ? liveRankMarks(pages,s.event,pool) : archiveRankMarks(pages,pool)) : [];
        cache[key]={checked:now,version:s.event?.resultUrl ?? archiveVersion,hash,parsing,rows};
        changed++;
        publishPending=true;
      } catch { failures++; }
    }));
  }
  console.log(new Date().toISOString()+' PDF kontrolü: '+queue.length+' adres, '+changed+' yeni veya değişmiş, '+failures+' geçici hata.');
  if (!publishPending) return;
  const packed=gzipSync(JSON.stringify(cache));
  const partSize=330000;
  const slot=manifest?.slot==='a' ? 'b' : 'a';
  for(let i=0;i<packed.length;i+=partSize) {
    await cacheCall(slot+'-'+(i/partSize),packed.subarray(i,i+partSize).toString('base64'));
  }
  // Yeni arşiv ve yayın özeti, sıralama sayfaları başarıyla yazıldıktan sonra etkinleşir.
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
  const priorPages=new Set(manifest?.pages ?? []);
  const uniquePages=new Map(pages.map(p=>[p.id,p]));
  await publish('rankPages',[...uniquePages.values()].filter(p=>!priorPages.has(p.id)));
  const students=state.athletes.map(a=>({id:a.id,payload:JSON.stringify(personal.get(a.id)??[])}));

  await publish('studentRanks',students);
  const used=[...sources.keys()].filter(k=>cache[k]?.rows?.length).length;
  await publish('rankCatalog',[{id:'current',payload:JSON.stringify({groups,updated:now,used,total:sources.size,missingMeets})}]);
  const nextManifest={slot,count:Math.ceil(packed.length/partSize),pages:[...uniquePages.keys()]};
  await cacheCall('current',JSON.stringify(nextManifest));
  manifest=nextManifest;
  sourceSignature=signature;
  publishPending=false;
  console.log('Sıralama: '+groups.length+' kategori, '+used+'/'+sources.size+' kaynak, '+failures+' geçici hata.');
}

const until=Date.now()+(process.env.RANK_WATCH_MINUTES === '3' ? 3 : 30)*60000;
do {
  try { await scan(); process.exitCode=0; }
  catch(error) { if(!watch) throw error; console.error('Dakika kontrolü tamamlanamadı:',error.message); process.exitCode=1; }
  if (!watch) break;
  await new Promise(resolve=>setTimeout(resolve,60000-Date.now()%60000));
} while(Date.now()<until);

