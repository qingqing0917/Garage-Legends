import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaceTrack,spawnCar,stepCar,trackContact,assistedInput,assistedProfile,aiInput} from './driving.js';
import {createGame,carSpecs} from './game.js';

test('mountain road climbs and descends continuously around a distinct circuit',()=>{
 const mountain=createRaceTrack('mountain'),flat=createRaceTrack('circuit');
 const heights=mountain.samples.map(p=>p.y);
 assert.ok(Math.max(...heights)-Math.min(...heights)>45);
 assert.ok(mountain.segments.some(p=>p.dy>0)&&mountain.segments.some(p=>p.dy<0));
 assert.ok(Math.abs(mountain.length-flat.length)>30);
 for(const segment of mountain.segments){const p=mountain.at(segment.s),near=mountain.nearest(p.x,p.z);assert.ok(Math.abs(p.y-near.y)<.1);assert.ok(Math.abs(p.slope)<.5);}
});

test('assisted player and AI can each complete the mountain course',()=>{
 const track=createRaceTrack('mountain'),spec=carSpecs(createGame('salvage'));
 for(const assisted of [true,false]){
  const profile=assisted?assistedProfile(spec):spec,car=spawnCar(track,0,assisted?-2.2:2.2);let impacts=0;
  for(let i=0;i<240*60&&car.lap<2;i++){
   const near=track.nearest(car.x,car.z),input=assisted?assistedInput(car,track,profile):aiInput(car,track,profile,2,.78);
   stepCar(car,input,profile,1/60,near.distance>7?.62:1,near);if(trackContact(car,track,1/60).impact)impacts++;
  }
  assert.equal(car.lap,2);assert.equal(impacts,0);
 }
});
