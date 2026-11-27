import { it, expect } from 'vitest';
import { nationalRanks, type RaceMark } from './nationalRanking';
import { archiveRankMarks, liveRankMarks } from './rankingSources';

const base: RaceMark={ name:'Ada Kurgu',club:'Kurgu SK',date:'2026-11-20',year:2014,gender:'K',pool:'25m',distance:50,legs:1,stroke:'serbest',ms:30000 };
it('en iyi dereceyi tek sayar, eşit dereceleri aynı sıraya koyar ve havuzları ayırır',()=>{
  const marks=[base,{...base,ms:31000},{...base,name:'Bir Sporcu'},{...base,name:'Son Sporcu',ms:32000},{...base,pool:'50m' as const}];
  const {boards,personal}=nationalRanks(marks,[{id:'s',clubId:'c',firstName:'Son',lastName:'Sporcu',birthYear:2014,gender:'K'}],{c:'Kurgu SK'});
  expect(boards.map(b=>b.rows.map(r=>r.rank))).toEqual([[1,1,3],[1]]);
  expect(personal.get('s')?.[0].rank).toBe(3);
});
it('tekil olmayan kayıtlı sporcuya rozet vermez',()=>{
  const a={id:'s',clubId:'c',firstName:'Ada',lastName:'Kurgu',birthYear:2014,gender:'K' as const};
  expect(nationalRanks([{...base,name:'A** K***u'}],[a,{...a,id:'t'}],{c:'Kurgu SK'}).personal.size).toBe(0);
});
it('canlı bayrakta takım derecesini alır, bireysel ara süreyi almaz',()=>{
  const p=[[{x:220,y:800,text:'26.11.2026'},{x:42,y:679,text:'1'},{x:119,y:683,text:'Kurgu SK'},{x:454,y:679,text:'2:14.48'},{x:454,y:655,text:'33.22'}]];
  expect(liveRankMarks(p,{gender:'Karma',name:'4 x 50m Karışık',no:'1',age:'Açık',round:'Final',startUrl:'',resultUrl:''},'50m')).toEqual([expect.objectContaining({name:'Kurgu SK',ms:134480,legs:4,gender:'Karma'})]);
});
it('toplu dosyada bayrak takımını okur',()=>{
  const p=[[{x:40,y:750,text:'Yarış 2, Erkekler 4 x 50m Serbest'},{x:40,y:730,text:'5.07.2026'},{x:40,y:690,text:'1.'},{x:75,y:690,text:'Kurgu 1'},{x:270,y:690,text:'Kurgu'},{x:450,y:690,text:'2:11.15'}]];
  for (const pages of [p,[p[0].filter(c=>c.text!=='1.')]]) {
    expect(archiveRankMarks(pages,'25m')).toEqual([expect.objectContaining({name:'Kurgu 1',ms:131150,legs:4,stroke:'serbest'})]);
  }
});
