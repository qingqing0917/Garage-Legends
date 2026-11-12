import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildNeighborhood,WORLD_PLACES} from './world-neighborhood.js';
import {treeHasClearance} from './world-collision.js';

test('school, police and fire stations are built at distinct mapped locations with solid walls',()=>{
 const scene=new THREE.Scene(),resources=new Set(),own=o=>(resources.add(o),o);
 const material=color=>own(new THREE.MeshStandardMaterial({color}));
 const box=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);scene.add(mesh);return mesh;};
 const sphere=(r,mat,x,y,z)=>{const mesh=new THREE.Mesh(own(new THREE.SphereGeometry(r,8,6)),mat);mesh.position.set(x,y,z);scene.add(mesh);return mesh;};
 const neighborhood=buildNeighborhood(scene,{box,sphere,material,geometry:own,ownMaterial:own});
 for(const key of ['school','police','fire']){const place=WORLD_PLACES[key],building=scene.getObjectByName(`civic-${key}`);assert.ok(building);assert.equal(building.position.x,place.x);assert.equal(building.position.z,place.z);const bounds=neighborhood.colliders.find(b=>place.x>b.minX&&place.x<b.maxX&&place.z>b.minZ&&place.z<b.maxZ);assert.ok(bounds,`${key} has a collision boundary`);assert.ok(neighborhood.trees.every(tree=>treeHasClearance(tree.x,tree.z,tree.radius,[bounds])));const approach=scene.getObjectByName(`${key}-approach`);assert.ok(approach,`${key} has an access road`);const approachBounds=new THREE.Box3().setFromObject(approach);assert.ok(approachBounds.max.x>=bounds.minX&&approachBounds.min.x<=bounds.minX&&approachBounds.min.z<bounds.maxZ&&approachBounds.max.z>bounds.minZ,`${key} access road reaches the facility`);assert.ok(approachBounds.min.x<=(key==='school'?-48:9),'access road connects to a main street');for(const other of neighborhood.buildingBounds){if(other===bounds)continue;assert.ok(bounds.maxX<=other.minX||bounds.minX>=other.maxX||bounds.maxZ<=other.minZ||bounds.minZ>=other.maxZ,`${key} does not overlap another building`);}}
 const civic=['school','police','fire'].map(key=>new THREE.Box3().setFromObject(scene.getObjectByName(`civic-${key}`)));for(let i=0;i<civic.length;i++)for(let j=i+1;j<civic.length;j++)assert.equal(civic[i].intersectsBox(civic[j]),false);
 for(const resource of resources)resource.dispose();
});
