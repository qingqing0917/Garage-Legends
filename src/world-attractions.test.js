import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildNeighborhood,WORLD_PLACES} from './world-neighborhood.js';
import {resolveWalls} from './world-collision.js';

test('West Lake, Broken Bridge and Leifeng Pagoda have visible models near their map markers',()=>{
 const scene=new THREE.Scene(),resources=new Set(),own=value=>(resources.add(value),value),material=color=>own(new THREE.MeshStandardMaterial({color}));
 const box=(w,h,d,mat,x,y,z)=>{const part=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),mat);part.position.set(x,y,z);scene.add(part);return part;};
 const sphere=(r,mat,x,y,z)=>{const part=new THREE.Mesh(own(new THREE.SphereGeometry(r,8,6)),mat);part.position.set(x,y,z);scene.add(part);return part;};
 const neighborhood=buildNeighborhood(scene,{box,sphere,material,geometry:own,ownMaterial:own});scene.updateMatrixWorld(true);
 for(const [name,key] of [['west-lake','lake'],['broken-bridge','bridge'],['leifeng-pagoda','pagoda']]){
  const object=scene.getObjectByName(name);assert.ok(object,`${key} has a model`);assert.equal(object.visible,true);
  const bounds=new THREE.Box3().setFromObject(object),position=WORLD_PLACES[key];assert.ok(!bounds.isEmpty());
  assert.ok(bounds.distanceToPoint(new THREE.Vector3(position.x,object.position.y,position.z))<14,`${key} marker is near its model`);
 }
 const path=scene.getObjectByName('pagoda-path');assert.ok(path,'a path reaches the pagoda');const bounds=new THREE.Box3().setFromObject(path);
 assert.ok(bounds.min.z<=-92.5&&bounds.max.z>=-107.5&&bounds.min.x<=97.5&&bounds.max.x>=-97.5,'the pagoda path meets the east-west road');
 const p={x:88,z:-79};resolveWalls(p,{x:88,z:-100},.4,neighborhood.colliders);assert.ok(p.z> -80,'the approach is not blocked by another building');
 for(const resource of resources)resource.dispose();
});
