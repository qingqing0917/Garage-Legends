import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,switchVehicle,carSpecs,saveGame,loadGame,prepareCar,buyUpgrade,applyTuning,TUNE_DEFAULT,raceReadiness,applyStroke,PANELS} from './game.js';

test('free sports-car exchange transfers the career and restores each car’s independent body finish',()=>{
 const s=createGame();prepareCar(s);buyUpgrade(s,'tires',2);buyUpgrade(s,'engine',1);applyTuning(s,TUNE_DEFAULT);
 s.panels.hood.paint=.3;s.panels.hood.strokes=[{u:.5,v:.5,r:.12,t:'paint'}];
 const before=structuredClone(s),classic=carSpecs(s);
 assert.equal(switchVehicle(s,'aero').ok,true);
 for(const key of['money','day','hour','totalHours','parts','upgrades','tuning','tuned','raceStats','drivingAssist','claimedDays'])assert.deepEqual(s[key],before[key],key);
 assert.equal(s.paint,'#d83832');assert.ok(Object.values(s.panels).every(p=>p.paint===1));assert.equal(raceReadiness(s).ready,true);
 const sports=carSpecs(s);assert.equal(sports.hp,252);assert.ok(sports.grip>classic.grip);assert.ok(sports.mass<classic.mass);
 s.paint='#245368';s.panels.roof.paint=.5;const sportsFinish=structuredClone(s.panels);
 assert.equal(switchVehicle(s,'r86').ok,true);assert.deepEqual(s.panels,before.panels);assert.equal(s.paint,before.paint);assert.deepEqual(carSpecs(s),classic);
 switchVehicle(s,'aero');assert.deepEqual(s.panels,sportsFinish);assert.equal(s.paint,'#245368');assert.equal(s.money,before.money);
 let data;const storage={setItem:(_,v)=>data=v,getItem:()=>data};saveGame(s,storage);const loaded=loadGame(storage);
 assert.equal(loaded.vehicleModel,'aero');assert.deepEqual(loaded.vehicleFinishes,s.vehicleFinishes);assert.deepEqual(carSpecs(loaded),sports);
});

test('exchanging an invalid or current model and exchanging during driving never spends money or changes progress',()=>{
 const s=createGame();
 for(const id of['missing','r86']){const before=structuredClone(s);assert.equal(switchVehicle(s,id).ok,false);assert.deepEqual(s,before);}
 for(const mode of['running','raceActive','unstarted']){
  const state=createGame();if(mode==='unstarted')state.started=false;else state[mode]=mode==='running'?true:{id:'ongoing'};
  const before=structuredClone(state);assert.equal(switchVehicle(state,'aero').ok,false);assert.deepEqual(state,before);
 }
});

test('old saves retain the classic car and existing repair progress until the player exchanges it',()=>{
 const s=createGame();delete s.vehicleModel;delete s.vehicleFinishes;
 for(const model of[undefined,'unknown']){
  const old={...s,vehicleModel:model},storage={getItem:()=>JSON.stringify(old)};
  const loaded=loadGame(storage);assert.equal(loaded.vehicleModel,'r86');assert.equal(loaded.money,s.money);assert.deepEqual(loaded.parts,s.parts);assert.deepEqual(loaded.panels,s.panels);
 }
});


test('all sports body panels can be repainted after switching colors',()=>{
 const state=createGame();switchVehicle(state,'aero');
 for(const id of PANELS){
  state.panels[id]={rust:1,sand:1,paint:0,strokes:[]};
  for(let y=.02;y<1;y+=.08)for(let x=.02;x<1;x+=.08)applyStroke(state,id,'paint',x,y,.14);
  assert.equal(state.panels[id].paint,1,id);
 }
});
