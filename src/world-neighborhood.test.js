import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildNeighborhood,nearbyShop,PEDESTRIAN_COUNT,WORLD_PLACES} from './world-neighborhood.js';
import {treeHasClearance,resolveWalls} from './world-collision.js';
import {createWorldTraffic} from './world-traffic.js';

test('neighbourhood builds animated crowds and plant life using instancing',()=>{
 const scene=new THREE.Scene(),resources=new Set(),geometry=g=>(resources.add(g),g),ownMaterial=m=>(resources.add(m),m),material=color=>ownMaterial(new THREE.MeshStandardMaterial({color}));
 const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(geometry(new THREE.BoxGeometry(w,h,d)),mat);m.position.set(x,y,z);scene.add(m);return m;};
 const sphere=(r,mat,x,y,z)=>{const m=new THREE.Mesh(geometry(new THREE.SphereGeometry(r,8,6)),mat);m.position.set(x,y,z);scene.add(m);return m;};
 const neighborhood=buildNeighborhood(scene,{box,sphere,material,geometry,ownMaterial}),instances=scene.children.filter(o=>o.isInstancedMesh);
 assert.equal(PEDESTRIAN_COUNT,240);assert.ok(instances.some(o=>o.count===1800));assert.ok(instances.some(o=>o.count===110));
 const people=instances.filter(o=>o.count===PEDESTRIAN_COUNT);assert.ok(people.length>=3);const before=people[0].instanceMatrix.array.slice();neighborhood.update(10);assert.notDeepEqual(people[0].instanceMatrix.array,before);assert.ok(people.every(o=>Array.from(o.instanceMatrix.array).every(Number.isFinite)));
 for(const time of [0,10,25,60]){neighborhood.update(time);const matrix=new THREE.Matrix4(),point=new THREE.Vector3();for(let i=0;i<PEDESTRIAN_COUNT;i++){people[0].getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);for(const wall of neighborhood.colliders)assert.ok(point.x<wall.minX-.2||point.x>wall.maxX+.2||point.z<wall.minZ-.2||point.z>wall.maxZ+.2,'pedestrians remain outside buildings');}}
 for(const tree of neighborhood.trees)assert.ok(treeHasClearance(tree.x,tree.z,tree.radius,neighborhood.buildingBounds));
 const entry={x:-23,z:-10};assert.equal(resolveWalls(entry,{x:-23,z:0},.4,neighborhood.colliders).hitZ,false);const wall={x:-30,z:-10};assert.equal(resolveWalls(wall,{x:-30,z:0},.4,neighborhood.colliders).hitZ,true);
 for(const resource of resources)resource.dispose();
});

test('taxis, cars, bicycles and electric scooters move and slow for someone ahead',()=>{
 const scene=new THREE.Scene(),resources=new Set(),own=r=>(resources.add(r),r),traffic=createWorldTraffic(scene,{geometry:own,ownMaterial:own});
 for(const type of ['taxi','car','bicycle','electric-scooter'])assert.ok(traffic.items.some(item=>item.type===type));
 assert.deepEqual(new Set(traffic.items.filter(item=>item.type==='car').map(item=>item.group.userData.bodyStyle)),new Set(['sedan','suv','sports']));
 const item=traffic.items[0],start=item.z,wheel=item.wheels[0].rotation.x;traffic.update(1);assert.notEqual(item.z,start);assert.notEqual(item.wheels[0].rotation.x,wheel);
 const stopped=item.z;traffic.update(1,{x:item.x,z:item.z+item.dir*4});assert.equal(item.z,stopped);
 assert.equal(traffic.items.length,24);for(const r of resources)r.dispose();
});

test('shop entrances are distinct and all destinations fit inside the accessible world',()=>{
 for(const key of ['cs','repair']){const p=WORLD_PLACES[key];assert.equal(nearbyShop(p.x,p.z+5),key);}
 assert.equal(nearbyShop(0,0),null);for(const p of Object.values(WORLD_PLACES)){assert.ok(Math.abs(p.x)<110);assert.ok(p.z>=-150&&p.z<=38);}
});
