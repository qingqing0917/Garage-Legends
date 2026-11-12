import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_UPGRADE_LEVEL as MAX,UPGRADES,createGame,prepareCar,upgradeQuote,maxAffordableUpgrade,buyUpgrade,carSpecs,saveGame,loadGame,switchVehicle,ensureCareer} from './game.js';
import {VEHICLES} from './vehicles.js';
import {createTrack,spawnCar,stepCar,trackContact,assistedInput,assistedProfile} from './driving.js';
const ready=()=>{const s=createGame();prepareCar(s);return s;};

test('a single purchase reaches exactly 100 million with exact billing and bounded workshop time',()=>{
 for(const item of UPGRADES){
  const s=ready(),original=structuredClone(s),q=upgradeQuote(s,item.id,MAX);
  assert.deepEqual(s,original);assert.equal(q.cost,item.cost.reduce((a,b)=>a+b,0)+(MAX-3)*item.cost[2]);assert.ok(Number.isSafeInteger(q.cost));assert.equal(q.hours,12);
  s.money=q.cost;assert.equal(buyUpgrade(s,item.id,MAX).ok,true);assert.equal(s.upgrades[item.id],100_000_000);assert.equal(s.money,0);assert.equal(s.totalHours,original.totalHours+12);
  const finished=structuredClone(s);assert.equal(buyUpgrade(s,item.id).ok,false);assert.equal(buyUpgrade(s,item.id,MAX+1).ok,false);assert.deepEqual(s,finished);
 }
});

test('bulk pricing equals individual purchases and affordable-level selection honors every boundary',()=>{
 for(const item of UPGRADES){
  const bulk=ready(),single=ready();bulk.money=single.money=1_000_000;
  assert.equal(buyUpgrade(bulk,item.id,25).ok,true);
  for(let i=1;i<=25;i++)assert.equal(buyUpgrade(single,item.id,i).ok,true);
  assert.equal(bulk.money,single.money);assert.deepEqual(carSpecs(bulk),carSpecs(single));
  for(const current of [0,1,2,3,24,MAX-1,MAX])for(const extra of [0,1,8]){
   const s=ready();s.upgrades[item.id]=current;const target=Math.min(MAX,current+extra),cost=upgradeQuote(s,item.id,target).cost;
   s.money=cost;assert.equal(maxAffordableUpgrade(s,item.id),target);
   if(target>current){s.money=cost-1;assert.equal(maxAffordableUpgrade(s,item.id),target-1);}
  }
 }
 assert.equal(maxAffordableUpgrade(ready(),'missing'),null);
});

test('high levels survive save, reload and car exchange while invalid levels are normalized safely',()=>{
 const s=ready();for(const item of UPGRADES)s.upgrades[item.id]=MAX;
 s.money=123456;s.vehicleRoofs.aero=true;const panels=structuredClone(s.panels),parts=structuredClone(s.parts),upgrades={...s.upgrades};
 let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};saveGame(s,storage);const loaded=loadGame(storage);
 assert.deepEqual(loaded.upgrades,upgrades);assert.equal(loaded.money,123456);assert.deepEqual(loaded.panels,panels);assert.deepEqual(loaded.parts,parts);
 switchVehicle(loaded,'aero');assert.deepEqual(loaded.upgrades,upgrades);assert.equal(loaded.vehicleRoofs.aero,true);
 loaded.upgrades={engine:MAX+1,turbo:NaN,tires:Infinity,brakes:-5,suspension:4.9,weight:2};ensureCareer(loaded);
 assert.deepEqual(loaded.upgrades,{engine:MAX,turbo:0,tires:0,brakes:0,suspension:4,weight:2});
 const original=structuredClone(loaded);for(const bad of [-1,NaN,Infinity,4.1,MAX+1])assert.equal(buyUpgrade(loaded,'turbo',bad).ok,false);
 assert.deepEqual(loaded,original);
});

test('all catalog cars retain finite positive performance at 100 million, and reinforcement keeps improving',()=>{
 const s=ready();for(const item of UPGRADES)s.upgrades[item.id]=MAX;
 for(const model of VEHICLES){s.vehicleModel=model.id;for(const [key,value] of Object.entries(carSpecs(s)))assert.ok(Number.isFinite(value)&&value>0,`${model.id}/${key}`);assert.ok(carSpecs(s).mass>400);}
 s.vehicleModel='aero';let previous;
 for(const level of [3,4,10,1000,1_000_000,MAX]){
  for(const item of UPGRADES)s.upgrades[item.id]=level;
  const current=carSpecs(s);if(previous){for(const key of ['hp','torque','grip','brake','steeringResponse'])assert.ok(current[key]>previous[key],key);assert.ok(current.mass<previous.mass);}
  previous=current;
 }
});

test('100-million-level and unbalanced power builds still complete assisted races without walls',()=>{
 const track=createTrack(),chiron=VEHICLES.find(v=>v.brand==='Bugatti'&&v.name==='Chiron');
 for(const model of ['r86','aero',chiron.id])for(const balanced of [true,false]){
  const s=ready();s.vehicleModel=model;
  for(const item of UPGRADES)s.upgrades[item.id]=balanced||['engine','turbo','weight'].includes(item.id)?MAX:0;
  if(!balanced){for(const p of Object.values(s.parts))p.condition=70;s.tuning={finalDrive:4.8,suspension:85,brakeBias:50,tirePressure:36};}
  const profile=assistedProfile(carSpecs(s)),car=spawnCar(track,0,-2.2);let impacts=0;
  for(let i=0;i<240*60&&car.lap<2;i++){const p=track.nearest(car.x,car.z);stepCar(car,assistedInput(car,track,profile),profile,1/60,p.distance>7?.62:1);impacts+=trackContact(car,track,1/60).impact>0?1:0;}
  assert.equal(car.lap,2,`${model}/${balanced}`);assert.equal(impacts,0,`${model}/${balanced}`);
 }
});
