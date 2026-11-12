import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,makeSalvageProject,switchVehicle,PARTS,PANELS,saveGame,loadGame} from './game.js';

test('repair mode keeps the selected model and generates each salvage condition',()=>{
 for(const [roll,type] of [[0,'intact'],[.009999,'intact'],[.01,'crash'],[.339999,'crash'],[.34,'aged'],[.67,'flood']]){
  const state=createGame('scratch');switchVehicle(state,'aero');const money=state.money;
  const result=makeSalvageProject(state,()=>roll);assert.equal(result.type,type);assert.equal(state.vehicleModel,'aero');assert.equal(state.money,money);assert.equal(state.route,'salvage');
  assert.ok(PARTS.some(part=>!state.parts[part.id].installed||state.parts[part.id].condition<70));
  if(type==='intact'){assert.ok(PANELS.every(id=>state.panels[id].paint===1));assert.equal(state.parts.engine.owned,false);assert.equal(state.parts.engine.installed,false);}
  else assert.ok(PANELS.some(id=>state.panels[id].damage===type));
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};saveGame(state,storage);assert.equal(loadGame(storage).salvageType,type);
 }
});

test('repair mode cannot change a running or racing vehicle',()=>{
 for(const field of ['running','raceActive']){const state=createGame();state[field]=true;const before=structuredClone(state);assert.equal(makeSalvageProject(state,()=>0).ok,false);assert.deepEqual(state,before);}
});
