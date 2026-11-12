import test from 'node:test';
import assert from 'node:assert/strict';
import {ECONOMY,REST_REWARD,credits,PARTS,UPGRADES,createGame,prepareCarQuote,prepareCar,restToNextDay,claimGrant,loadGame,saveGame,migrateEconomy,buyUpgrade,applyTuning,TUNE_DEFAULT,raceReadiness,beginRace,settleRace,maxAffordableUpgrade,MAX_UPGRADE_LEVEL} from './game.js';

test('both opening routes can immediately prepare, buy every level-two upgrade and qualify for racing',()=>{
 for(const route of ['salvage','scratch']){
  const s=createGame(route);assert.equal(s.grant,route==='salvage'?30000:50000);
  assert.equal(prepareCar(s).ok,true);for(const item of UPGRADES)assert.equal(buyUpgrade(s,item.id,2).ok,true,item.id);
  assert.equal(applyTuning(s,TUNE_DEFAULT).ok,true);assert.equal(raceReadiness(s).ready,true);assert.ok(s.money>5000);
 }
});

test('old saves receive the starting-fund difference exactly once, preserving spent money and vehicle progress',()=>{
 for(const route of ['salvage','scratch']){
  const old=createGame(route);delete old.economyVersion;old.grant=route==='salvage'?8000:18000;old.money=37;old.upgrades.turbo=1;old.panels.hood.paint=.42;old.parts.engine.condition=55;
  let data=JSON.stringify(old);const storage={getItem:()=>data,setItem:(_,v)=>data=v};
  const migrated=loadGame(storage),bonus=route==='salvage'?22000:32000;
  assert.equal(migrated.money,37+bonus);assert.deepEqual(migrated.parts,old.parts);assert.deepEqual(migrated.panels,old.panels);assert.deepEqual(migrated.upgrades,old.upgrades);
  assert.equal(loadGame(storage).money,37+bonus);assert.equal(migrateEconomy(migrated),0);
  migrated.money-=1000;saveGame(migrated,storage);assert.equal(loadGame(storage).money,37+bonus-1000);
 }
});

test('new saves never receive a duplicate top-up and unusually generous old grants are not reduced',()=>{
 const s=createGame();const balance=s.money;assert.equal(migrateEconomy(s),0);assert.equal(s.money,balance);
 delete s.economyVersion;s.grant=100000;assert.equal(migrateEconomy(s),0);assert.equal(s.money,balance);assert.equal(s.grant,100000);
});

test('one click advances to the next morning, pays exactly one googol and does not count rest as work',()=>{
 const s=createGame(),balance=s.money;s.hour=19.75;const hours=s.totalHours;
 const result=restToNextDay(s);assert.equal(result.reward,REST_REWARD);assert.equal(s.day,2);assert.equal(s.hour,8);assert.equal(credits(s.money),BigInt(balance)+10n**100n);assert.equal(s.totalHours,hours);
 assert.equal(claimGrant(s).ok,true);assert.equal(credits(s.money),BigInt(balance)+10n**100n+100000000n);
 restToNextDay(s);assert.equal(s.day,3);assert.equal(credits(s.money),BigInt(balance)+2n*10n**100n+100000000n);
});

test('rest pays one googol even with an unclaimed grant and cannot advance an active race or running engine',()=>{
 const s=createGame();s.day=3;s.hour=12;const balance=s.money;
 assert.equal(restToNextDay(s).reward,REST_REWARD);assert.equal(credits(s.money),BigInt(balance)+10n**100n);assert.equal(s.claimedDays.includes(4),false);
 s.running=true;const before=structuredClone(s);assert.equal(restToNextDay(s).ok,false);assert.deepEqual(s,before);
 s.running=false;s.raceActive={id:'active'};const racing=structuredClone(s);assert.equal(restToNextDay(s).ok,false);assert.deepEqual(s,racing);
});

test('googol balances survive save and exact spending, tuning, upgrades and prizes',()=>{
 const s=createGame(),start=BigInt(s.money);restToNextDay(s);let expected=start+10n**100n;
 let data;const storage={getItem:()=>data,setItem:(_,value)=>data=value};saveGame(s,storage);const loaded=loadGame(storage);assert.equal(credits(loaded.money),expected);
 const quote=prepareCarQuote(loaded);assert.equal(prepareCar(loaded).ok,true);expected-=BigInt(quote.cost);assert.equal(credits(loaded.money),expected);
 assert.equal(maxAffordableUpgrade(loaded,'tires'),MAX_UPGRADE_LEVEL);assert.equal(buyUpgrade(loaded,'tires',1).ok,true);expected-=900n;assert.equal(credits(loaded.money),expected);
 assert.equal(applyTuning(loaded,TUNE_DEFAULT).ok,true);expected-=200n;assert.equal(credits(loaded.money),expected);
 beginRace(loaded,'big-balance');settleRace(loaded,'big-balance',{finished:true,place:1,time:80});expected+=8000n;assert.equal(credits(loaded.money),expected);
 saveGame(loaded,storage);assert.equal(credits(loadGame(storage).money),expected);
});

test('quick preparation buys missing parts, repairs owned parts, installs loose parts and charges atomically',()=>{
 const s=createGame('salvage');s.parts.engine.condition=100;s.parts.gearbox.installed=false;s.parts.gearbox.condition=100;s.parts.battery.owned=false;s.parts.battery.installed=false;
 const quote=prepareCarQuote(s);assert.equal(quote.count,7);assert.equal(quote.cost,PARTS.find(p=>p.id==='battery').price+200+4*140);
 s.money=quote.cost-1;const before=structuredClone(s);assert.equal(prepareCar(s).ok,false);assert.deepEqual(s,before);
 s.money=quote.cost+100;assert.equal(prepareCar(s).ok,true);assert.equal(s.money,100);assert.ok(Object.values(s.parts).every(p=>p.owned&&p.installed&&p.condition===100));
 const after=structuredClone(s);assert.equal(prepareCar(s).ok,false);assert.deepEqual(s,after);
});

test('all four increased race prizes are paid once',()=>{
 for(let place=1;place<=4;place++){
  const s=createGame('scratch');prepareCar(s);buyUpgrade(s,'tires');applyTuning(s,TUNE_DEFAULT);beginRace(s,'prize');const balance=s.money;
  assert.equal(settleRace(s,'prize',{finished:true,place,time:80}).reward,ECONOMY.racePrizes[place-1]);assert.equal(s.money,balance+ECONOMY.racePrizes[place-1]);
  assert.equal(settleRace(s,'prize',{finished:true,place,time:80}).ok,false);
 }
});
