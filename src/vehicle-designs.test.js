import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {VEHICLES} from './vehicles.js';
import {PARTS,PANELS} from './game.js';
import {createSportsCar,poseVehicleBody} from './sports-car.js';

const representatives=[...new Map(VEHICLES.filter(v=>v.id!=='r86').map(v=>[v.design.identity,v])).values()];
function build(model){
 const mechanics={},panels=new Map(),shared=new Set();
 // Envelopes of the existing workshop service parts, including their top fittings.
 for(const [id,size,position] of [
  ['engine',[.86,.51,.76],[0,.7175,-1.3]],
  ['gearbox',[.39,.31,.63],[0,.58,-.42]],
  ['battery',[.32,.365,.37],[.62,.7225,-.93]],
  ['radiator',[1.1,.39,.11],[0,.68,-1.98]],
 ]){
  const group=new THREE.Group(),geo=new THREE.BoxGeometry(...size),mat=new THREE.MeshStandardMaterial();
  group.position.set(...position);const mesh=new THREE.Mesh(geo,mat);mesh.userData.originalMaterial=mat;group.add(mesh);mechanics[id]=group;shared.add(geo);shared.add(mat);
 }
 const built=createSportsCar({model,mechanics,createPanel:(id,geo,parent)=>{const mesh=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({side:THREE.DoubleSide}));mesh.userData.panel=id;parent.add(mesh);panels.set(id,mesh);return mesh;}});
 return {...built,panels,shared,cleanup(){built.dispose();for(const p of panels.values())p.material.dispose();for(const resource of shared)resource.dispose();}};
}
function geometryHash(car,predicate){
 const hash=createHash('sha256'),point=new THREE.Vector3();car.updateMatrixWorld(true);
 car.traverse(o=>{if(!o.isMesh||!predicate(o))return;const positions=o.geometry.attributes.position;
  const world=new Float32Array(positions.count*3);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);world.set(point.toArray(),i*3);}
  hash.update(Buffer.from(world.buffer));
 });return hash.digest('hex');
}

test('the twenty featured cars have different body geometry and different trim even with identical paint',()=>{
 const featured=VEHICLES.filter(v=>v.featured>=0),bodies=new Set(),details=new Set();assert.equal(featured.length,20);
 for(const model of featured){const built=build(model);poseVehicleBody(built.car,0,0);
  bodies.add(geometryHash(built.car,o=>Boolean(o.userData.panel)));
  details.add(geometryHash(built.car,o=>Boolean(o.userData.trim)));
  built.cleanup();
 }
 assert.equal(bodies.size,featured.length,'paint changes alone must not distinguish the featured models');
 assert.equal(details.size,featured.length,'headlights, intakes and rear details must vary too');
});

test('all design families keep finite serviceable geometry, return to the closed pose, and clone independently for racing',()=>{
 assert.equal(representatives.length,26);
 for(const model of representatives){const built=build(model),{car,panels,parts}=built;
  assert.deepEqual([...panels.keys()].sort(),[...PANELS].sort());assert.deepEqual(Object.keys(parts).sort(),PARTS.map(p=>p.id).sort());
  poseVehicleBody(car,0,0);const closed=geometryHash(car,()=>true);
  for(const amount of [.5,1]){poseVehicleBody(car,amount,amount);car.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite),model.id);if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),model.id);});}
  const clone=car.clone(true);poseVehicleBody(clone,0,0);assert.equal(geometryHash(clone,()=>true),closed,model.id);assert.equal(car.userData.doorsOpen,true);
  poseVehicleBody(car,0,0);assert.equal(geometryHash(car,()=>true),closed,model.id);
  built.cleanup();
 }
});

test('service parts fit below the actual closed hood on low and high noses',()=>{
 const point=new THREE.Vector3(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const model of representatives){const built=build(model);poseVehicleBody(built.car,0,0);const hood=built.panels.get('hood');let hits=0;
  for(const id of ['engine','battery','radiator'])built.parts[id].traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);ray.set(new THREE.Vector3(point.x,5,point.z),down);
    const hit=ray.intersectObject(hood,false)[0];if(!hit)continue;hits++;assert.ok(point.y<hit.point.y-.015,`${model.name}: ${id} protrudes through the hood`);
   }
  });assert.ok(hits>12,`${model.name}: hood samples missing`);built.cleanup();
 }
});

test('hood vents move with the bonnet and generated resources are released without disposing shared mechanics or paint',()=>{
 const built=build(VEHICLES.find(v=>v.name==='Jesko')),{car,hood,panels}=built;
 const vent=car.getObjectByName('hood-vent');assert.ok(vent);car.updateMatrixWorld(true);const closed=vent.matrixWorld.clone();
 hood.rotation.x=1;car.updateMatrixWorld(true);assert.ok(!vent.matrixWorld.equals(closed));assert.ok(vent.userData.trim,'paint rays must pass through decoration to the paintable hood');
 const external=new Set([...built.shared,...[...panels.values()].map(p=>p.material)]),owned=new Set();
 car.traverse(o=>{if(!o.isMesh)return;for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!external.has(r))owned.add(r);});
 let sharedDisposals=0;const disposals=new Map();for(const r of external)r.addEventListener('dispose',()=>sharedDisposals++);
 for(const r of owned)r.addEventListener('dispose',()=>disposals.set(r,(disposals.get(r)||0)+1));
 built.dispose();assert.equal(sharedDisposals,0);assert.equal(disposals.size,owned.size);assert.ok([...disposals.values()].every(n=>n===1));
 for(const r of external)r.dispose();
});
