import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTS,UPGRADES,MAX_UPGRADE_LEVEL,createGame,work,carSpecs,upgradeQuote,buyUpgrade,saveGame,loadGame,beginRace,applyTuning,TUNE_DEFAULT} from './game.js';
import {createTrack,spawnCar,stepCar} from './driving.js';
const readyCar=()=>{const s=createGame('scratch');for(const p of PARTS)work(s,'install',p.id);s.money=50000;return s;};

test('preview is read-only and cumulative purchase charges only unowned levels',()=>{
 const s=readyCar();buyUpgrade(s,'turbo',1);const original=structuredClone(s),q=upgradeQuote(s,'turbo',3);
 assert.deepEqual(s,original);assert.equal(q.cost,7000);assert.equal(q.hours,3);assert.equal(q.after.hp-q.before.hp,65);
 assert.equal(buyUpgrade(s,'turbo',3).ok,true);assert.equal(s.money,original.money-q.cost);assert.equal(s.totalHours,original.totalHours+q.hours);assert.equal(carSpecs(s).hp,q.after.hp);
 const balance=s.money;assert.equal(buyUpgrade(s,'turbo',3).ok,false);assert.equal(s.money,balance);
});
test('invalid, unaffordable and mid-race upgrades cannot partially spend money or change equipment',()=>{
 const s=readyCar();s.money=2000;const original=structuredClone(s);
 for(const target of [0,2,MAX_UPGRADE_LEVEL+1,NaN,Infinity,1.5])assert.equal(buyUpgrade(s,'turbo',target).ok,false);
 assert.equal(s.money,original.money);assert.deepEqual(s.upgrades,original.upgrades);assert.equal(s.totalHours,original.totalHours);
 buyUpgrade(s,'tires');applyTuning(s,TUNE_DEFAULT);beginRace(s,'upgrade-lock');s.money=50000;
 assert.equal(buyUpgrade(s,'turbo',1).ok,false);assert.equal(s.money,50000);assert.equal(s.upgrades.turbo,0);
});
test('old level-two hardware survives migration; new hardware survives save and reload',()=>{
 const s=readyCar();s.careerVersion=2;s.upgrades={engine:2,tires:2,brakes:1,weight:1};
 let data=JSON.stringify(s);const storage={getItem:()=>data,setItem:(_,value)=>data=value};const migrated=loadGame(storage);
 assert.equal(migrated.upgrades.engine,2);assert.equal(migrated.upgrades.turbo,0);assert.equal(migrated.upgrades.suspension,0);assert.equal(migrated.money,s.money);
 buyUpgrade(migrated,'turbo',3);buyUpgrade(migrated,'suspension',3);saveGame(migrated,storage);const restored=loadGame(storage);
 assert.deepEqual(restored.upgrades,migrated.upgrades);assert.deepEqual(carSpecs(restored),carSpecs(migrated));assert.equal(restored.money,migrated.money);
});
test('turbo increases measured straight-line speed; brakes reduce stopping distance',()=>{
 const s=readyCar(),base=carSpecs(s),track=createTrack(),stock=spawnCar(track),boosted=spawnCar(track);
 buyUpgrade(s,'turbo',3);buyUpgrade(s,'tires',3);const power=carSpecs(s);
 for(let i=0;i<900;i++){stepCar(stock,{throttle:1},base,1/60);stepCar(boosted,{throttle:1},power,1/60);}
 assert.ok(boosted.speed>stock.speed*1.2,`${boosted.speed} vs ${stock.speed}`);
 const distance=spec=>{const car=spawnCar(track);car.vx=-Math.sin(car.heading)*25;car.vz=-Math.cos(car.heading)*25;let d=0;for(let i=0;i<600;i++){stepCar(car,{brake:1},spec,1/60);d+=car.speed/60;if(car.speed<.5)break;}return d;};
 buyUpgrade(s,'brakes',3);assert.ok(distance(carSpecs(s))<distance(power)*.8);
});
test('level-three build has 293 hp and suspension upgrades affect effective grip and response',()=>{
 const s=readyCar(),before=carSpecs(s);buyUpgrade(s,'suspension',3);const suspension=carSpecs(s);
 assert.ok(suspension.grip>before.grip);assert.ok(suspension.steeringResponse>before.steeringResponse);
 for(const item of UPGRADES)if(s.upgrades[item.id]<3)assert.equal(buyUpgrade(s,item.id,3).ok,true);
 assert.equal(carSpecs(s).hp,293);assert.equal(carSpecs(s).mass,955);
});
