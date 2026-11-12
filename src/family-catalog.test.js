import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import rows from '../data/family-catalog.json' with {type:'json'};
import audit from '../data/family-catalog-audit.json' with {type:'json'};
import {VEHICLES,filterVehicles} from './vehicles.js';
import {createGame,switchVehicle,saveGame,loadGame,prepareCar,PARTS,PANELS} from './game.js';
import {createSportsCar,poseVehicleBody} from './sports-car.js';

const find=(brand,name)=>{const v=VEHICLES.find(v=>v.brand===brand&&v.name===name);assert.ok(v,`${brand} ${name}`);return v;};
function build(model){
 const panels=new Map(),mechanics=Object.fromEntries(['engine','gearbox','battery','radiator'].map(id=>[id,new THREE.Group()]));
 const built=createSportsCar({model,mechanics,createPanel:(id,geometry,parent)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial());mesh.userData.panel=id;parent.add(mesh);panels.set(id,mesh);return mesh;}});
 return {...built,panels,cleanup(){built.dispose();for(const p of panels.values())p.material.dispose();}};
}

test('supplementary sources have unique stable IDs, valid links, honest unknown years, and all three playable classes',()=>{
 assert.equal(rows.length,audit.included);assert.equal(new Set(VEHICLES.map(v=>v.id)).size,VEHICLES.length);
 for(const row of rows){assert.ok(row.source.startsWith('https://en.wikipedia.org/wiki/'));assert.ok(['sedan','suv','offroad'].includes(row.vehicleClass));assert.ok(row.year===null||row.year<=2026);assert.ok(VEHICLES.some(v=>v.id===row.id));}
 for(const [brand,name,body] of [['Toyota','Camry','sedan'],['Toyota','RAV4','suv'],['Toyota','Land Cruiser','offroad'],['Tesla','Model 3','sedan']]){
  const model=find(brand,name);assert.equal(model.design.body,body);assert.ok(filterVehicles({brand,body}).includes(model));
 }
 assert.equal(find('Toyota','Camry').year,'年代未核实');
 assert.ok(filterVehicles({query:'吉普 Wrangler',body:'offroad'}).length>0);
});

test('new body styles retain paint, mechanics, roof and door motion, and distinguish their proportions',()=>{
 const models=[find('Toyota','Camry'),find('Toyota','RAV4'),find('Toyota','Land Cruiser')],heights=[];
 for(const model of models){const built=build(model),{car,panels,parts}=built;
  assert.deepEqual([...panels.keys()].sort(),[...PANELS].sort());assert.deepEqual(Object.keys(parts).sort(),PARTS.map(p=>p.id).sort());
  poseVehicleBody(car,0,0);const closed=car.getObjectByName('doorPivot1').matrixWorld.clone();
  poseVehicleBody(car,1,0);assert.ok(!car.getObjectByName('doorPivot1').matrixWorld.equals(closed));poseVehicleBody(car,0,0);assert.ok(car.getObjectByName('doorPivot1').matrixWorld.equals(closed));
  car.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
  heights.push(new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3()).y);built.cleanup();
 }
 assert.ok(heights[1]>heights[0]+.1);assert.ok(heights[2]>heights[1]);
});

test('a sedan, SUV and off-roader exchange without losing career progress and survive save/load',()=>{
 const state=createGame();prepareCar(state);const before=structuredClone({money:state.money,parts:state.parts,upgrades:state.upgrades,tuning:state.tuning});
 for(const model of [find('Toyota','Camry'),find('Toyota','RAV4'),find('Toyota','Land Cruiser')]){
  assert.equal(switchVehicle(state,model.id).ok,true);assert.deepEqual({money:state.money,parts:state.parts,upgrades:state.upgrades,tuning:state.tuning},before);
  let saved;const store={setItem:(_,v)=>saved=v,getItem:()=>saved};saveGame(state,store);assert.equal(loadGame(store).vehicleModel,model.id);
 }
});

test('720S teardrop lamps follow the hood, and electric cars and V8 sports cars have distinct powertrain geometry',()=>{
 const mclaren=build(find('McLaren','720S')),electric=build(find('Tesla','Model 3'));
 const lamp=mclaren.car.getObjectByName('teardrop-lamp-housing'),cover=mclaren.car.getObjectByName('engine-cover'),hatch=mclaren.car.getObjectByName('engineHatch');assert.ok(lamp&&cover&&hatch);
 mclaren.car.updateMatrixWorld(true);const before=lamp.matrixWorld.clone();mclaren.hood.rotation.x=1;mclaren.car.updateMatrixWorld(true);assert.ok(!lamp.matrixWorld.equals(before));
 assert.ok(mclaren.parts.engine.position.z>1,'the 720S powertrain belongs behind the cabin');const closedCover=cover.matrixWorld.clone();hatch.rotation.x=-1;mclaren.car.updateMatrixWorld(true);assert.ok(!cover.matrixWorld.equals(closedCover));
 assert.notEqual(mclaren.parts.engine.children.length,electric.parts.engine.children.length);
 const electrics=[];electric.parts.engine.traverse(o=>{if(o.isMesh)electrics.push(o.geometry.type);});assert.ok(electrics.length>0);
 mclaren.cleanup();electric.cleanup();
});
