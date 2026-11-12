import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTS,createGame,work,loadGame,saveGame,carSpecs,buyUpgrade,applyTuning,TUNE_DEFAULT,raceReadiness,beginRace,applyRaceDamage,settleRace,inspection} from './game.js';
const readyCar=()=>{const s=createGame('scratch');for(const p of PARTS)work(s,'install',p.id);return s;};
const racingCar=()=>{const s=readyCar();buyUpgrade(s,'tires');applyTuning(s,TUNE_DEFAULT);return s;};
const storage=()=>{let data;return {setItem:(k,v)=>data=v,getItem:()=>data};};

test('old garage save migrates without losing money, repairs or surface work',()=>{
 const old=readyCar();delete old.tuning;delete old.upgrades;delete old.raceStats;delete old.settledRaces;delete old.tuned;
 old.panels.hood.paint=.42;const mem=storage();mem.setItem('',JSON.stringify(old));const s=loadGame(mem);
 assert.equal(s.money,old.money);assert.deepEqual(s.parts,old.parts);assert.equal(s.panels.hood.paint,.42);assert.deepEqual(s.tuning,TUNE_DEFAULT);assert.equal(s.tuned,false);assert.equal(s.raceStats.finishes,0);
});
test('racing is gated by mechanical readiness, an actual upgrade and applied tuning',()=>{
 const s=readyCar();assert.equal(raceReadiness(s).ready,false);assert.equal(beginRace(s,'early').ok,false);
 assert.equal(buyUpgrade(s,'tires').ok,true);assert.equal(raceReadiness(s).ready,false);
 assert.equal(applyTuning(s,TUNE_DEFAULT).ok,true);assert.equal(raceReadiness(s).ready,true);
 assert.equal(beginRace(s,'race-1').ok,true);assert.equal(beginRace(s,'race-2').ok,false);
});
test('upgrades and tune fees cannot be charged twice for completed purchases',()=>{
 const s=readyCar();s.money=10000;buyUpgrade(s,'engine');buyUpgrade(s,'engine');buyUpgrade(s,'engine');const balance=s.money;
 assert.equal(buyUpgrade(s,'engine',3).ok,false);assert.equal(s.money,balance);assert.ok(carSpecs(s).hp>carSpecs(readyCar()).hp);
 applyTuning(s,TUNE_DEFAULT);const after=s.money;assert.equal(applyTuning(s,TUNE_DEFAULT).ok,false);assert.equal(s.money,after);
 const oldTune={...s.tuning};assert.equal(applyTuning(s,{...TUNE_DEFAULT,finalDrive:900}).ok,false);assert.deepEqual(s.tuning,oldTune);
 s.money=0;assert.equal(buyUpgrade(s,'weight').ok,false);assert.equal(s.upgrades.weight,0);
});
test('finish pays once; race collision damage survives settlement and reload',()=>{
 const s=racingCar();beginRace(s,'race-1');const before=s.money;applyRaceDamage(s,28,'front');applyRaceDamage(s,12,'front');
 assert.equal(inspection(s).ready,false);const damage=s.parts.engine.condition;
 const result=settleRace(s,'race-1',{finished:true,place:2,time:95,bestLap:46});assert.equal(result.reward,6000);assert.equal(s.money,before+6000);
 assert.equal(settleRace(s,'race-1',{finished:true,place:1,time:90}).ok,false);assert.equal(s.money,before+6000);
 const mem=storage();saveGame(s,mem);const restored=loadGame(mem);assert.equal(restored.parts.engine.condition,damage);assert.equal(restored.raceStats.finishes,1);assert.equal(raceReadiness(restored).ready,false);
 work(restored,'remove','engine');work(restored,'repair','engine');work(restored,'install','engine');assert.equal(restored.parts.engine.condition,100);
});
test('abandoning or refreshing an active race never creates prize money or erases damage',()=>{
 const s=racingCar();beginRace(s,'abandoned');applyRaceDamage(s,9,'side');const balance=s.money;const mem=storage();saveGame(s,mem);const restored=loadGame(mem);
 assert.equal(restored.raceActive,null);assert.equal(restored.money,balance);assert.equal(restored.parts.wheelFL.condition,91);assert.equal(restored.raceStats.finishes,0);
 const other=racingCar();beginRace(other,'quit');const prior=other.money;assert.equal(settleRace(other,'quit',{finished:false}).reward,0);assert.equal(other.money,prior);
});
