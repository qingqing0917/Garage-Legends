import test from 'node:test';
import assert from 'node:assert/strict';
import {wallBounds,resolveWalls} from './world-collision.js';

test('walls block movement from either side, including fast movement, and allow sliding',()=>{
 const walls=[wallBounds(0,0,10,.25)];
 for(const [start,end,side] of [[{x:0,z:5},{x:0,z:-30},1],[{x:0,z:-5},{x:0,z:30},-1]]){
  const result=resolveWalls(end,start,.4,walls);assert.ok(result.hitZ);assert.ok(side*end.z>=.525-1e-6);
 }
 const start={x:0,z:2},end={x:2,z:-2},result=resolveWalls(end,start,.4,walls);assert.ok(result.hitZ);assert.ok(end.x>1.9);assert.ok(end.z>=.525-1e-6);
 const away={x:0,z:2};assert.deepEqual(resolveWalls(away,{x:0,z:.525},.4,walls),{hitX:false,hitZ:false});assert.equal(away.z,2);
});

test('doorways permit people but prevent wider vehicles crossing solid walls',()=>{
 const walls=[wallBounds(-5.65,0,8.7,.25),wallBounds(5.65,0,8.7,.25)];
 const pedestrian={x:0,z:-2};assert.equal(resolveWalls(pedestrian,{x:0,z:2},.4,walls).hitZ,false);assert.equal(pedestrian.z,-2);
 const wallApproach={x:3,z:-2};assert.equal(resolveWalls(wallApproach,{x:3,z:2},.4,walls).hitZ,true);assert.ok(wallApproach.z>0);
 const car={x:.2,z:-2};assert.equal(resolveWalls(car,{x:.2,z:2},1.3,walls).hitZ,true);assert.ok(car.z>0);
 const longCar={x:0,z:-8};resolveWalls(longCar,{x:0,z:8},{x:1.1,z:2.35},[wallBounds(0,0,10,.25)]);assert.ok(longCar.z>=2.475-1e-6);
});
