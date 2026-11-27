import { useState } from 'react';
import { useCollection, type Row } from '../lib/store';
import { STROKE_LABEL } from '../lib/format';
import { formatSwimTime } from '../lib/rules';
import type { PersonalPlace, RankGroup, RankLine } from '../lib/nationalRanking';

type Packed = Row & {payload:string};
type Board = {group:RankGroup; ids:string[]; count:number};
type Catalog = {groups:Board[]; updated:number; used:number; total:number};
function label(g: RankGroup) {
  const gender=g.gender === 'K' ? 'Kadınlar' : g.gender === 'E' ? 'Erkekler' : 'Karma';
  return [g.year, gender, g.legs>1 ? g.legs+' × '+g.distance+' m bayrak' : g.distance+' m', STROKE_LABEL[g.stroke], g.pool+' havuz', g.ageGroup].filter(Boolean).join(' · ');
}
export function AthleteRank({studentId}:{studentId:string}) {
  const doc=useCollection<Packed>('studentRanks',{id:studentId}).find(r=>r.id===studentId);
  const places:PersonalPlace[]=doc ? JSON.parse(doc.payload) : [];
  return <section className="card"><h2>Türkiye sıralaması</h2>
    {places.length ? <><p className="muted">İşlenen TYF yarış sonuçlarına göre.</p><ul className="simple-list">{places.map(p=><li key={label(p.group)}><span>{label(p.group)}</span><strong>Türkiye {p.rank}. sırada</strong></li>)}</ul></>
      : <p className="muted">Bu sporcu için eşleşen Türkiye sıralaması henüz yok.</p>}</section>;
}
export default function NationalRanks() {
  const catalogDoc=useCollection<Packed>('rankCatalog',{id:'current'})[0];
  const catalog:Catalog|undefined=catalogDoc && JSON.parse(catalogDoc.payload);
  const [category,setCategory]=useState('');
  const [limit,setLimit]=useState(10);
  const [page,setPage]=useState(0);
  const boards=catalog?.groups ?? [];
  const chosen=boards.find(b=>label(b.group)===category) ?? boards[0];
  const count=Math.min(limit,chosen?.count ?? 0);
  const activePage=Math.min(page,Math.max(0,Math.ceil(count/200)-1));
  const id=chosen?.ids[activePage];
  const doc=useCollection<Packed>('rankPages',id ? {id} : {skip:true}).find(r=>r.id===id);
  const rows:RankLine[]=doc ? JSON.parse(doc.payload) : [];
  return <div className="page"><header className="page-head"><h1>Türkiye sıralamaları</h1></header>
    {catalog && chosen ? <section className="card stack">
      <p className="muted">İşlenen TYF sonuçlarında en iyi dereceye göre. Derece alınan kaynak: {catalog.used} / {catalog.total}. Güncelleme: {new Date(catalog.updated).toLocaleString('tr-TR')}.</p>
      <div className="form-grid"><label>Kategori<select value={label(chosen.group)} onChange={e=>{setCategory(e.target.value);setPage(0);}}>{boards.map(b=><option key={label(b.group)}>{label(b.group)}</option>)}</select></label>
      <label>İlk kaç kayıt?<input type="number" min={1} value={limit} onChange={e=>{setLimit(Math.max(1,Math.floor(Number(e.target.value))));setPage(0);}} /></label></div>
      <div className="table-wrap"><table><thead><tr><th>Sıra</th><th>{chosen.group.legs>1?'Takım':'Sporcu'}</th><th>Kulüp</th><th>Derece</th></tr></thead><tbody>
      {rows.slice(0,count-activePage*200).map((r,i)=><tr key={i}><td>{r.rank}.</td><td>{r.name}</td><td>{r.club}</td><td>{formatSwimTime(r.ms)}</td></tr>)}</tbody></table></div>
      {count>200 && <div className="form-actions"><button disabled={!activePage} onClick={()=>setPage(activePage-1)}>Önceki</button><span>{activePage+1} / {Math.ceil(count/200)}</span><button disabled={(activePage+1)*200>=count} onClick={()=>setPage(activePage+1)}>Sonraki</button></div>}
    </section>:<p className="muted">Türkiye sıralaması henüz hazırlanmamış.</p>}</div>;
}
