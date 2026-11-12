import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,carSpecs,PARTS,UPGRADES,TUNE_PRESETS,saveGame,loadGame} from './game.js';
import {createTrack,spawnCar,stepCar,trackContact,assistedProfile,assistedInput,aiInput,trafficInput,collideCars} from './driving.js';
const track=createTrack();
const readyCar=(health=100)=>{const s=createGame('scratch');for(const p of PARTS){s.parts[p.id].installed=true;s.parts[p.id].condition=health;}return s;};

test('auto cornering completes two laps without wall contact across all presets, wear and upgrade levels',()=>{
 for(const model of ['r86','aero'])for(const upgraded of [false,true])for(const health of [70,100])for(const preset of TUNE_PRESETS){
  const s=readyCar(health);s.vehicleModel=model;if(upgraded)for(const u of UPGRADES)s.upgrades[u.id]=3;s.tuning={...preset.values};
  const spec=assistedProfile(carSpecs(s)),car=spawnCar(track,0,-2.2);let impacts=0,maxDistance=0;
  for(let step=0;step<150*60&&car.lap<2;step++){
   const p=track.nearest(car.x,car.z);stepCar(car,assistedInput(car,track,spec,{throttle:1}),spec,1/60,p.distance>7?.62:1);
   impacts+=trackContact(car,track,1/60).impact>0?1:0;maxDistance=Math.max(maxDistance,p.distance);
  }
  assert.equal(car.lap,2,`${model}/${upgraded}/${health}/${preset.id}`);assert.equal(impacts,0);assert.ok(maxDistance<track.width/2);assert.ok(car.travel>=2*track.length);
 }
});

test('four-car assisted races finish without player collisions, including a high-power poor-grip build',()=>{
 for(const model of ['r86','aero'])for(const mode of ['stock','full','power-only','worn']){
  const s=readyCar(mode==='worn'?70:100);s.vehicleModel=model;
  if(mode==='full')for(const u of UPGRADES)s.upgrades[u.id]=3;
  if(mode==='power-only'){s.upgrades.engine=3;s.upgrades.turbo=3;s.tuning={finalDrive:4.8,suspension:85,brakeBias:50,tirePressure:36};}
  const base=carSpecs(s),spec=assistedProfile(base),aiSpec={...base,hp:128,torque:190,mass:1140,grip:1.12,brake:10,engineHealth:1,steeringResponse:1,finalDrive:4.1,suspension:55,brakeBias:62};
  const cars=[0,1,2,3].map(i=>({...spawnCar(track,-i*5,i%2?2.2:-2.2),id:i,lane:i%2?2:-2,skill:.73+i*.025}));let impacts=0;
  for(let step=0;step<150*60&&!cars[0].finished;step++){
   for(const c of cars){if(c.finished)continue;const cs=c.id?aiSpec:spec;
    const input=c.id?trafficInput(c,track,aiInput(c,track,cs,c.lane,c.skill),cars):assistedInput(c,track,cs,{},cars);
    const p=track.nearest(c.x,c.z);stepCar(c,input,cs,1/60,p.distance>7?.62:1);const contact=trackContact(c,track,1/60);
    if(!c.id&&contact.impact)impacts++;if(c.travel>=track.length*2)c.finished=true;
   }
   impacts+=collideCars(cars).length;
  }
  assert.equal(cars[0].finished,true,mode);assert.equal(impacts,0,mode);
 }
});

test('manual brake stops auto drive without reversing, steering overrides temporarily, disabled assist leaves profile unchanged',()=>{
 const base=carSpecs(readyCar()),spec=assistedProfile(base),car=spawnCar(track);
 assert.equal(assistedProfile(base,false),base);assert.ok(spec.grip>base.grip);assert.equal(base.stabilityAssist,undefined);
 for(let i=0;i<240;i++)stepCar(car,assistedInput(car,track,spec),spec,1/60);
 const speed=car.speed;assert.ok(speed>5);
 for(let i=0;i<300;i++){const input=assistedInput(car,track,spec,{brake:1});assert.equal(input.throttle,0);stepCar(car,input,spec,1/60);}
 assert.equal(car.speed,0);const stopped={x:car.x,z:car.z};
 for(let i=0;i<120;i++)stepCar(car,assistedInput(car,track,spec,{brake:1}),spec,1/60);
 assert.equal(car.x,stopped.x);assert.equal(car.z,stopped.z);
 assert.equal(assistedInput(car,track,spec,{steer:-1}).steer,-1);
 assert.notEqual(assistedInput(car,track,spec).status,'手动转向 · 松开继续辅助');
 assert.equal(assistedInput(car,track,spec,{handbrake:true}).throttle,0);
 for(let i=0;i<120;i++)stepCar(car,assistedInput(car,track,spec),spec,1/60);assert.ok(car.speed>2);
});

test('old saves enable assist by default, and opting into manual mode persists without changing progress',()=>{
 const s=readyCar();delete s.drivingAssist;let data=JSON.stringify(s);const storage={getItem:()=>data,setItem:(_,v)=>data=v};
 const migrated=loadGame(storage);assert.equal(migrated.drivingAssist,true);assert.equal(migrated.money,s.money);assert.deepEqual(migrated.parts,s.parts);
 migrated.drivingAssist=false;saveGame(migrated,storage);assert.equal(loadGame(storage).drivingAssist,false);
});

test('assistance slows for a stopped car ahead without awarding travel or laps',()=>{
 const spec=assistedProfile(carSpecs(readyCar())),car=spawnCar(track,10),leader=spawnCar(track,18);car.speed=15;
 const initial={travel:car.travel,lap:car.lap},input=assistedInput(car,track,spec,{throttle:1},[car,leader]);
 assert.equal(input.throttle,0);assert.ok(input.brake>0);assert.equal(input.status,'前车减速跟随');assert.equal(car.travel,initial.travel);assert.equal(car.lap,initial.lap);
});
