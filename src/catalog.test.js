import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import source from '../data/vehicle-catalog.json' with {type:'json'};
import audit from '../data/catalog-audit.json' with {type:'json'};
import {VEHICLES,BRANDS,BODY_TYPES,filterVehicles} from './vehicles.js';
import {createGame,switchVehicle,carSpecs,prepareCar,PARTS,PANELS,saveGame,loadGame} from './game.js';
import {createSportsCar} from './sports-car.js';
import {createTrack,spawnCar,stepCar,trackContact,assistedInput,assistedProfile} from './driving.js';

test('the complete imported sports directory has unique persistent IDs, sources and playable profiles',()=>{
 assert.equal(source.length,audit.includedRows);assert.equal(source.length+audit.excluded.length,audit.sourceRows);
 assert.equal(new Set(source.map(v=>v.brand)).size,audit.brands);assert.ok(source.every(v=>BRANDS.includes(v.brand)));assert.equal(new Set(VEHICLES.map(v=>v.id)).size,VEHICLES.length);
 const state=createGame();prepareCar(state);const money=state.money,parts=structuredClone(state.parts);
 for(const row of source){
  assert.ok(row.source.startsWith('https://en.wikipedia.org/wiki/'));assert.ok(row.year<=2026);
  assert.equal(switchVehicle(state,row.id).ok,true,row.id);const spec=carSpecs(state);
  for(const key of ['hp','mass','torque','grip','brake','estimatedTop'])assert.ok(Number.isFinite(spec[key])&&spec[key]>0,`${row.id}/${key}`);
 }
 assert.equal(state.money,money);assert.deepEqual(state.parts,parts);
 let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};saveGame(state,storage);const restored=loadGame(storage);
 assert.equal(restored.vehicleModel,state.vehicleModel);assert.equal(Object.keys(restored.vehicleFinishes).length,Object.keys(state.vehicleFinishes).length);
});

test('Chinese/English search, combined filters and sorting return all matches without changing the catalog',()=>{
 const before=VEHICLES.map(v=>v.id);
 assert.ok(filterVehicles({query:'法拉利 F40'}).some(v=>v.brand==='Ferrari'&&v.name==='F40'));
 assert.ok(filterVehicles({query:'兰博基尼 Revuelto'}).some(v=>v.name==='Revuelto'));
 assert.ok(filterVehicles({query:'保时捷 718'}).length>0);
 assert.deepEqual(filterVehicles({query:'nonexistent-model-000000'}),[]);
 const ferraris=filterVehicles({brand:'Ferrari',sort:'power'});assert.equal(ferraris.length,VEHICLES.filter(v=>v.brand==='Ferrari').length);
 assert.ok(ferraris.every((v,i)=>v.brand==='Ferrari'&&(!i||v.hp<=ferraris[i-1].hp)));
 assert.ok(filterVehicles({brand:'Ferrari',body:'roadster'}).every(v=>v.design.body==='roadster'));
 assert.deepEqual(VEHICLES.map(v=>v.id),before);
});

test('every body family builds a finite paintable model with all service points and distinct proportions',()=>{
 const bounds=new Set();
 for(const body of Object.keys(BODY_TYPES)){
  const model=VEHICLES.find(v=>v.gameSpecs&&v.design.body===body),panels=new Map(),mechanics={};
  for(const id of PARTS.filter(p=>!p.id.startsWith('wheel')).map(p=>p.id)){
   const group=new THREE.Group(),material=new THREE.MeshStandardMaterial(),m=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),material);m.userData.originalMaterial=material;group.add(m);mechanics[id]=group;
  }
  const generated=createSportsCar({model,mechanics,createPanel:(id,geo,parent)=>{const m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial());m.userData.panel=id;parent.add(m);panels.set(id,m);return m;}});
  assert.deepEqual([...panels.keys()].sort(),[...PANELS].sort());assert.deepEqual(Object.keys(generated.parts).sort(),PARTS.map(p=>p.id).sort());
  generated.car.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),`${body}: nonfinite mesh`);});
  const size=new THREE.Box3().setFromObject(generated.car).getSize(new THREE.Vector3());assert.ok(size.x>1.5&&size.x<3);assert.ok(size.z>3.5&&size.z<6);bounds.add(size.toArray().map(n=>n.toFixed(3)).join(','));
  assert.equal(generated.car.name,model.name);generated.dispose();for(const p of panels.values())p.material.dispose();
 }
 assert.equal(bounds.size,Object.keys(BODY_TYPES).length);
});

test('catalog performance extremes and all body families finish two assisted laps without walls',()=>{
 const candidates=new Map();for(const body of Object.keys(BODY_TYPES)){const list=VEHICLES.filter(v=>v.gameSpecs&&v.design.body===body).sort((a,b)=>a.hp/a.mass-b.hp/b.mass);for(const v of [list[0],list.at(-1)])candidates.set(v.id,v);}
 const track=createTrack();
 for(const model of candidates.values())for(const full of [false,true]){
  const state=createGame();prepareCar(state);state.vehicleModel=model.id;
  for(const p of Object.values(state.parts))p.condition=full?100:70;
  if(full)for(const key of Object.keys(state.upgrades))state.upgrades[key]=3;
  const profile=assistedProfile(carSpecs(state)),car=spawnCar(track,0,-2.2);let impacts=0;
  for(let i=0;i<240*60&&car.lap<2;i++){const p=track.nearest(car.x,car.z);stepCar(car,assistedInput(car,track,profile),profile,1/60,p.distance>7?.62:1);impacts+=trackContact(car,track,1/60).impact>0?1:0;}
  assert.equal(car.lap,2,`${model.brand} ${model.name} / ${full}`);assert.equal(impacts,0,model.id);
 }
});
