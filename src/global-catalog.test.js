import test from 'node:test';
import assert from 'node:assert/strict';
import rows from '../data/global-catalog.json' with {type:'json'};
import audit from '../data/global-catalog-audit.json' with {type:'json'};
import {CATALOG_COUNT,VEHICLES,filterVehicles} from './vehicles.js';
import {createGame,switchVehicle,saveGame,loadGame,carSpecs} from './game.js';

test('additional car categories are searchable, deduplicated and retain usable sources',()=>{
 assert.equal(rows.length,audit.included);assert.ok(rows.length>1000);assert.ok(CATALOG_COUNT>=5946);
 assert.equal(new Set(VEHICLES.map(v=>v.id)).size,VEHICLES.length);
 for(const row of rows){assert.ok(row.source.startsWith('https://en.wikipedia.org/wiki/'));assert.equal(row.year,null);assert.ok(VEHICLES.some(v=>v.id===row.id));}
 for(const keyword of ['两厢车','旅行车','皮卡','MPV','厢式车','双门轿跑','敞篷车'])assert.ok(filterVehicles({query:keyword}).some(v=>v.id.startsWith('global-')),keyword);
});
test('new vehicles can be exchanged and restored after saving',()=>{
 const row=rows.find(v=>v.styles.includes('皮卡')),s=createGame(),before=s.money;assert.equal(switchVehicle(s,row.id).ok,true);
 assert.equal(s.money,before);assert.ok(carSpecs(s).hp>0);
 let data;const storage={setItem:(_,v)=>data=v,getItem:()=>data};saveGame(s,storage);assert.equal(loadGame(storage).vehicleModel,row.id);
});
