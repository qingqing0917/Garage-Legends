import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,SAVE_KEY,loadGame} from './game.js';
import {SAVE_KEYS,exportSaves,parseSaveFile,importSaves} from './save-transfer.js';

function storage(initial={}){const data=new Map(Object.entries(initial));return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}

test('transfers current and alternate projects with exact large balances',()=>{
 const current=createGame('salvage'),build=createGame('scratch');current.money='1'+'0'.repeat(100);current.vehicleModel='ferrari-f40';build.totalHours=123;
 const source=storage({[SAVE_KEYS[1]]:JSON.stringify(build)}),target=storage();
 importSaves(target,parseSaveFile(exportSaves(source,current)));
 assert.equal(loadGame(target).money,current.money);assert.equal(JSON.parse(target.getItem(SAVE_KEYS[1])).totalHours,123);assert.equal(target.getItem(SAVE_KEYS[2]),null);
});

test('missing alternate projects remove stale destination data and invalid files do not alter it',()=>{
 const current=createGame(),target=storage(Object.fromEntries(SAVE_KEYS.map(k=>[k,JSON.stringify(current)])));
 for(const invalid of ['bad','{}',JSON.stringify({format:'garage-legends-save',version:1,saves:{[SAVE_KEY]:{version:1}}})])assert.throws(()=>parseSaveFile(invalid));
 assert.ok(SAVE_KEYS.every(key=>target.getItem(key)));
 importSaves(target,parseSaveFile(exportSaves(storage(),current)));assert.equal(target.getItem(SAVE_KEYS[1]),null);assert.equal(target.getItem(SAVE_KEYS[2]),null);
});

test('storage write failure restores all existing projects',()=>{
 const original=createGame(),source=createGame('scratch'),target=storage(Object.fromEntries(SAVE_KEYS.map(k=>[k,JSON.stringify(original)]))),before=SAVE_KEYS.map(k=>target.getItem(k));
 const set=target.setItem;let failed=false;target.setItem=(key,value)=>{if(key===SAVE_KEYS[1]&&!failed){failed=true;throw Error('full');}set(key,value);};
 assert.throws(()=>importSaves(target,parseSaveFile(exportSaves(storage({[SAVE_KEYS[1]]:JSON.stringify(source)}),source))));assert.deepEqual(SAVE_KEYS.map(k=>target.getItem(k)),before);
});
