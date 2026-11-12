import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,loadGame,saveGame,switchBuildProject} from './game.js';

function memory(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}

test('build project and original vehicle preserve independent progress across switches and reloads',()=>{
 const storage=memory(),original=createGame('salvage');original.money=123456789;original.parts.engine.condition=35;saveGame(original,storage);
 const first=switchBuildProject(original,storage);assert.equal(first.ok,true);assert.equal(first.state.route,'scratch');assert.equal(first.state.parts.engine.installed,false);
 first.state.money=9876;first.state.parts.engine.installed=true;saveGame(first.state,storage);
 const back=switchBuildProject(loadGame(storage),storage);assert.equal(back.ok,true);assert.equal(back.state.money,123456789);assert.equal(back.state.parts.engine.condition,35);
 back.state.money=123;saveGame(back.state,storage);
 const again=switchBuildProject(loadGame(storage),storage);assert.equal(again.ok,true);assert.equal(again.state.money,9876);assert.equal(again.state.parts.engine.installed,true);
 assert.equal(switchBuildProject(again.state,storage).state.money,123);
});

test('project switching refuses an active race and storage failure without replacing the current save',()=>{
 const storage=memory(),state=createGame();saveGame(state,storage);state.raceActive='race';assert.equal(switchBuildProject(state,storage).ok,false);state.raceActive=null;
 const before=loadGame(storage);const failing={getItem:key=>storage.getItem(key),setItem:()=>{throw Error('full');}};
 assert.equal(switchBuildProject(state,failing).ok,false);assert.deepEqual(loadGame(storage),before);
});
