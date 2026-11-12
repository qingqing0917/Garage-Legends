import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTS,PANELS,createGame,work,inspection,advanceTime,claimGrant,applyStroke,progress,saveGame,loadGame,setPaint} from './game.js';

test('salvage can be fully repaired and pass ignition within the initial budget',()=>{
 const s=createGame('salvage');assert.equal(inspection(s).ready,false);
 for(const p of PARTS){assert.equal(work(s,'repair',p.id).ok,false);assert.equal(work(s,'remove',p.id).ok,true);assert.equal(work(s,'repair',p.id).ok,true);assert.equal(work(s,'install',p.id).ok,true);}
 assert.equal(inspection(s).ready,true);assert.equal(s.money,28200-PARTS.reduce((a,p)=>a+p.repair,0));
 s.running=true;assert.equal(work(s,'remove','engine').ok,false);
});
test('scratch route gets more grant, purchases all components once, and can start',()=>{
 const s=createGame('scratch');assert.ok(s.grant>createGame('salvage').grant);
 for(const p of PARTS)assert.equal(work(s,'install',p.id).ok,true);
 assert.equal(inspection(s).ready,true);const balance=s.money;work(s,'remove','engine');work(s,'install','engine');assert.equal(s.money,balance);
});
test('insufficient funds does not mutate inventory and free work allows daily rescue',()=>{
 const s=createGame('scratch');s.money=0;assert.equal(work(s,'install','engine').ok,false);assert.equal(s.parts.engine.owned,false);
 assert.equal(claimGrant(s).ok,false);advanceTime(s,12);assert.equal(s.day,2);assert.equal(s.hour,8);assert.equal(claimGrant(s).ok,true);assert.equal(s.money,100000000);assert.equal(claimGrant(s).ok,false);
 for(let i=0;i<3;i++){advanceTime(s,12);claimGrant(s);}assert.equal(work(s,'install','engine').ok,true);
});
test('surface processes require preparation and repeated strokes do not farm progress',()=>{
 const s=createGame('salvage');assert.equal(applyStroke(s,'hood','paint',.5,.5).ok,false);assert.equal(applyStroke(s,'hood','sand',.5,.5).ok,false);
 assert.equal(applyStroke(s,'hood','rust',.5,.5).ok,true);const progress=s.panels.hood.rust;const time=s.totalHours;for(let i=0;i<20;i++)applyStroke(s,'hood','rust',.5,.5);assert.equal(s.panels.hood.rust,progress);assert.equal(s.totalHours,time);
});
test('all seven body panels, including wheel cutouts, can complete their three stages',()=>{
 const s=createGame('salvage');
 for(const id of PANELS)for(const tool of ['rust','sand','paint']){
  for(let y=.03;y<1;y+=.08)for(let x=.03;x<1;x+=.08)applyStroke(s,id,tool,x,y,.16);
  assert.equal(s.panels[id][tool],1,`${id} ${tool}`);
 }
 for(const p of PARTS){work(s,'remove',p.id);work(s,'repair',p.id);work(s,'install',p.id);}
 assert.equal(progress(s),100);
 setPaint(s,'#245368');assert.equal(s.panels.hood.rust,1);assert.equal(s.panels.hood.sand,1);assert.equal(s.panels.hood.paint,0);
});
test('save/reload restores inventory, surface strokes and economy but stops engine',()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)};
 const s=createGame('salvage');work(s,'remove','engine');applyStroke(s,'hood','rust',.3,.5);advanceTime(s,13);claimGrant(s);s.running=true;
 saveGame(s,storage);const loaded=loadGame(storage);assert.equal(loaded.running,false);assert.deepEqual(loaded.panels,s.panels);assert.deepEqual(loaded.parts,s.parts);assert.equal(loaded.money,s.money);
 assert.equal(loadGame({getItem:()=>'{invalid'}),null);
});
test('rounding cannot award completion before the last panel is finished',()=>{
 const s=createGame('scratch');for(const p of PARTS)work(s,'install',p.id);
 for(const p of Object.values(s.panels))p.paint=1;
 s.panels.hood.paint=.99;assert.equal(progress(s),99);
 s.panels.hood.paint=1;assert.equal(progress(s),100);
});
