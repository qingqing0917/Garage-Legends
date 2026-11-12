import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,saveGame,loadGame} from './game.js';
import {DEFAULT_OPPONENTS,normalizeOpponents,opponentInfo,opponentProfile,buildOpponent} from './race-opponents.js';
import {filterVehicles} from './vehicles.js';
import {createTrack,spawnCar,stepCar,trackContact,aiInput} from './driving.js';

test('opponent choices default to distinct real models, tolerate invalid saves and persist',()=>{
 assert.equal(new Set(DEFAULT_OPPONENTS).size,3);
 assert.deepEqual(normalizeOpponents(['invalid']),DEFAULT_OPPONENTS);
 const chosen=filterVehicles({query:'McLaren 720S'})[0];assert.ok(chosen);
 const state=createGame('salvage');state.raceOpponents=[chosen.id,...DEFAULT_OPPONENTS.slice(1)];
 const storage={data:new Map(),setItem(k,v){this.data.set(k,v);},getItem(k){return this.data.get(k)||null;}};
 saveGame(state,storage);assert.deepEqual(normalizeOpponents(loadGame(storage).raceOpponents),state.raceOpponents);
});

test('default opponents can complete two laps using their individual profiles',()=>{
 for(const id of DEFAULT_OPPONENTS){const spec=opponentProfile(opponentInfo(id)),track=createTrack(),car=spawnCar(track);let impacts=0;
  for(let i=0;i<180*60&&car.lap<2;i++){const near=track.nearest(car.x,car.z);stepCar(car,aiInput(car,track,spec,2,.78),spec,1/60,near.distance>7?.62:1);if(trackContact(car,track,1/60).impact)impacts++;}
  assert.equal(car.lap,2,id);assert.equal(impacts,0,id);
 }
});

test('chosen opponent models produce distinct 3D bodies and bounded, model-specific performance',()=>{
 const a=opponentInfo(DEFAULT_OPPONENTS[0]),b=opponentInfo(DEFAULT_OPPONENTS[1]);
 const first=buildOpponent(a),second=buildOpponent(b);
 try{assert.notEqual(first.model.userData.designIdentity,second.model.userData.designIdentity);assert.ok(first.model.getObjectByName('wheelFL'));assert.notDeepEqual(opponentProfile(a),opponentProfile(b));
  for(const id of DEFAULT_OPPONENTS){const spec=opponentProfile(opponentInfo(id));for(const value of Object.values(spec))assert.ok(Number.isFinite(value));assert.ok(spec.grip>=1.08&&spec.grip<=1.35);}
 }finally{first.dispose();second.dispose();}
});
