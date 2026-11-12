import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VEHICLES,filterVehicles} from './vehicles.js';
import {createGame,switchVehicle,roofIsOpen,setRoofOpen,saveGame,loadGame,carSpecs} from './game.js';
import {createSportsCar,poseVehicleBody} from './sports-car.js';

const find=(brand,name)=>{const model=VEHICLES.find(v=>v.brand===brand&&v.name===name);assert.ok(model,`${brand} ${name}`);return model;};
function build(model){
 const mechanics={},panels=new Map();
 for(const id of ['engine','gearbox','battery','radiator'])mechanics[id]=new THREE.Group();
 const built=createSportsCar({model,mechanics,createPanel:(id,geo,parent)=>{const m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial());m.userData.panel=id;parent.add(m);panels.set(id,m);return m;}});
 return {...built,panels,dispose(){built.dispose();for(const p of panels.values())p.material.dispose();}};
}

test('signature door families and convertible features are discoverable without misclassifying fixed coupe doors',()=>{
 for(const [brand,name,door] of [['Mercedes-Benz','SLS AMG','gullwing'],['Pagani','Huayra','gullwing'],['Lamborghini','Revuelto','scissor'],['McLaren','720S','butterfly'],['Koenigsegg','Jesko','dihedral']]){
  const v=find(brand,name);assert.equal(v.features.doors,door);assert.ok(filterVehicles({brand,feature:door}).includes(v));
 }
 assert.equal(find('Mercedes-Benz','SLS AMG').features.convertible,false);
 assert.equal(find('Porsche','918 Spyder').features.convertible,true);
 assert.equal(find('Lamborghini','Huracán LP610-4').features.doors,'standard');
 assert.ok(filterVehicles({query:'欧翼门'}).length>0);
 assert.ok(filterVehicles({feature:'convertible'}).every(v=>v.features.convertible));
 assert.equal(filterVehicles({brand:'Mercedes-Benz',feature:'scissor'}).length,0);
});

test('each car remembers its roof, preserves career progress and rejects roof changes while driving or running',()=>{
 const s=createGame(),roadster=find('Porsche','918 Spyder');switchVehicle(s,'aero');
 const baseline=structuredClone({money:s.money,parts:s.parts,panels:s.panels,tuning:s.tuning,upgrades:s.upgrades,stats:s.raceStats,hour:s.hour,day:s.day});
 const spec=carSpecs(s);assert.equal(roofIsOpen(s),false);assert.equal(setRoofOpen(s,true).ok,true);assert.equal(roofIsOpen(s),true);assert.deepEqual(carSpecs(s),spec);
 assert.deepEqual({money:s.money,parts:s.parts,panels:s.panels,tuning:s.tuning,upgrades:s.upgrades,stats:s.raceStats,hour:s.hour,day:s.day},baseline);
 switchVehicle(s,roadster.id);assert.equal(roofIsOpen(s),true);setRoofOpen(s,false);
 switchVehicle(s,'aero');assert.equal(roofIsOpen(s),true);switchVehicle(s,roadster.id);assert.equal(roofIsOpen(s),false);
 let raw;const storage={getItem:()=>raw,setItem:(_,value)=>raw=value};saveGame(s,storage);const restored=loadGame(storage);assert.equal(roofIsOpen(restored),false);
 restored.running=true;assert.equal(setRoofOpen(restored,true).ok,false);assert.equal(roofIsOpen(restored),false);restored.running=false;
 restored.raceActive={id:'race'};assert.equal(setRoofOpen(restored,true).ok,false);restored.raceActive=null;
 switchVehicle(restored,'r86');assert.equal(setRoofOpen(restored,true).ok,false);
 delete restored.vehicleRoofs;saveGame(restored,storage);const legacy=loadGame(storage);assert.equal(legacy.money,s.money);assert.deepEqual(legacy.vehicleRoofs,{});
});

test('all door mechanisms open actual paintable panels and glass, then return exactly to their closed geometry',()=>{
 const motions=new Set();
 for(const kind of ['standard','gullwing','scissor','butterfly','dihedral']){
  const model=VEHICLES.find(v=>v.features.interactive&&v.features.doors===kind),built=build(model),{car,panels}=built;
  poseVehicleBody(car,0,0);const door=car.getObjectByName('doorPivot1'),skin=door.children.find(o=>o.userData.panel==='left'),glass=car.getObjectByName('doorGlass1');
  assert.ok(skin&&glass);assert.equal(skin.material,panels.get('left').material);assert.equal(panels.size,7);
  const closed=skin.matrixWorld.clone(),closedGlass=glass.matrixWorld.clone();
  poseVehicleBody(car,1,0);assert.ok(!skin.matrixWorld.equals(closed));assert.ok(!glass.matrixWorld.equals(closedGlass));motions.add(door.rotation.toArray().join(','));
  for(const side of [-1,1]){const d=car.getObjectByName(`doorPivot${side}`);assert.ok(d.rotation.toArray().slice(0,3).some(n=>Math.abs(n)>.5));}
  poseVehicleBody(car,0,0);assert.ok(skin.matrixWorld.equals(closed));assert.ok(glass.matrixWorld.equals(closedGlass));
  for(const amount of [.2,.5,.8]){poseVehicleBody(car,amount,0);car.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
  built.dispose();
 }
 assert.equal(motions.size,5);
});

test('folding roof and windows disappear when stowed, restore when closed and clone correctly for racing',()=>{
 const built=build(find('Porsche','918 Spyder')),{car,panels}=built;
 poseVehicleBody(car,0,0);const roof=car.getObjectByName('roofAssembly'),front=car.getObjectByName('foldingRoofFront'),glass=car.getObjectByName('doorGlass1');
 const closed=front.matrixWorld.clone();assert.ok(roof.visible&&glass.visible);
 const roofMeshes=[];roof.traverse(o=>{if(o.userData.panel==='roof')roofMeshes.push(o);});assert.equal(roofMeshes.length,2);assert.ok(roofMeshes.every(o=>o.material===panels.get('roof').material));
 poseVehicleBody(car,1,.5);assert.ok(roof.visible&&!front.matrixWorld.equals(closed));assert.ok(front.rotation.x>0,'front roof folds upward away from the seats');
 poseVehicleBody(car,1,1);assert.equal(roof.visible,false);assert.equal(glass.visible,false);assert.equal(glass.userData.bodyHidden,true);
 const clone=car.clone(true);poseVehicleBody(clone,0,1);assert.equal(clone.userData.doorsOpen,false);assert.equal(clone.userData.roofOpen,true);assert.equal(car.userData.doorsOpen,true);assert.equal(clone.getObjectByName('roofAssembly').visible,false);
 poseVehicleBody(car,0,0);assert.ok(roof.visible&&glass.visible);assert.ok(front.matrixWorld.equals(closed));assert.equal(glass.userData.bodyHidden,false);
 built.dispose();
});
