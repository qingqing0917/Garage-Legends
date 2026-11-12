import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,PARTS,work,carSpecs,buyUpgrade} from './game.js';
import {createTrack,spawnCar,stepCar,trackContact,aiInput,resetCar} from './driving.js';
const makeSpec=()=>{const s=createGame('scratch');for(const p of PARTS)work(s,'install',p.id);return {s,spec:carSpecs(s)};};

test('the player accelerates, steers and brakes through the physical model',()=>{
 const {spec}=makeSpec(),track=createTrack(),car=spawnCar(track);
 for(let i=0;i<600;i++)stepCar(car,{throttle:1,steer:0},spec,1/60);
 const speed=car.speed;assert.ok(speed>15);assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.z));
 for(let i=0;i<120;i++)stepCar(car,{throttle:0,brake:1},spec,1/60);assert.ok(car.speed<speed*.6);
 const oldHeading=car.heading;for(let i=0;i<150;i++)stepCar(car,{throttle:.5,steer:.35},spec,1/60);assert.ok(Math.abs(car.heading-oldHeading)>.1);
});
test('engine upgrade changes acceleration on the same straight and tire damage affects grip',()=>{
 const {s,spec}=makeSpec();s.money=10000;buyUpgrade(s,'engine');buyUpgrade(s,'engine');const tuned=carSpecs(s),track=createTrack(),stockCar=spawnCar(track),modifiedCar=spawnCar(track);
 for(let i=0;i<900;i++){stepCar(stockCar,{throttle:1},spec,1/60);stepCar(modifiedCar,{throttle:1},tuned,1/60);}assert.ok(modifiedCar.speed>stockCar.speed+1);
 s.parts.wheelFL.condition=20;s.parts.wheelFR.condition=20;assert.ok(carSpecs(s).grip<tuned.grip);
});
test('AI completes a two-lap circuit without wall impacts, using the same dynamics',()=>{
 const {spec}=makeSpec(),track=createTrack(),car=spawnCar(track);let impacts=0;
 for(let i=0;i<120*60&&car.lap<2;i++){const p=track.nearest(car.x,car.z);stepCar(car,aiInput(car,track,spec,2,.78),spec,1/60,p.distance>7?.62:1);if(trackContact(car,track,1/60).impact)impacts++;}
 assert.equal(car.lap,2);assert.equal(impacts,0);
});
test('teleporting across the track and resetting cannot award a lap',()=>{
 const track=createTrack(),car=spawnCar(track),far=track.at(track.length*.72);car.x=far.x;car.z=far.z;trackContact(car,track,1/60);assert.equal(car.travel,0);
 resetCar(car,track);assert.equal(car.travel,0);assert.ok(Math.hypot(car.x-track.at(0).x,car.z-track.at(0).z)<.01);
});
test('wall collisions remove normal velocity and issue a bounded impact once',()=>{
 const track=createTrack(),car=spawnCar(track),p=track.at(30,12);car.x=p.x;car.z=p.z;car.vx=-p.tz*18;car.vz=p.tx*18;const result=trackContact(car,track,1/60);
 assert.ok(result.impact>0&&result.impact<=28);assert.ok(track.nearest(car.x,car.z).distance<=track.barrier+.1);assert.equal(trackContact(car,track,1/60).impact,0);
});
