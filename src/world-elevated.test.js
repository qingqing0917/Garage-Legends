import test from 'node:test';
import assert from 'node:assert/strict';
import {ELEVATED_ROAD as road,buildElevatedRoad,elevatedHeight,updateElevatedPosition} from './world-elevated.js';
import {stepCar} from './driving.js';

test('both continuous ramps connect the ground to a seven-metre bridge',()=>{
 assert.equal(elevatedHeight(road.southEntry),0);assert.equal(elevatedHeight(road.southDeck),road.height);assert.equal(elevatedHeight(road.northDeck),road.height);assert.equal(elevatedHeight(road.northEntry),0);
 assert.equal(elevatedHeight(-10),3.5);assert.equal(elevatedHeight(-130),3.5);
 const boxes=[];buildElevatedRoad({material:color=>color,box:(...args)=>{const item={args,rotation:{x:0}};boxes.push(item);return item;}});
 assert.ok(boxes.some(b=>b.args[0]===road.width&&b.args[5]>6));assert.ok(boxes.filter(b=>Math.abs(b.rotation.x)>.2).length>=4);assert.ok(boxes.filter(b=>b.args[0]===.85).length>=6);
});

test('drivers climb and descend through either end and are held by bridge rails',()=>{
 for(const [start,steps] of [[8,[6,4,-10,-30,-70,-120,-140,-146,-148]],[-148,[-146,-140,-120,-70,-30,-10,4,6,8]]]){
  const state={onBridge:false},pos={x:road.x,z:start};let sawTop=false;
  for(const z of steps){const previous={...pos};pos.z=z;const result=updateElevatedPosition(pos,previous,state,{x:1.1,z:1});if(state.onBridge&&result.height===road.height)sawTop=true;if(z===-70){const previousSide={...pos};pos.x=road.x+20;const collision=updateElevatedPosition(pos,previousSide,state,{x:1.1,z:1});assert.equal(collision.hitX,true);assert.equal(pos.x,road.x+road.width/2-1.1);pos.x=road.x;}}
  assert.ok(sawTop);assert.equal(state.onBridge,false);assert.equal(state.height,0);
 }
});

test('side and underside cannot enter ramps, while crossroads below bridge remain open',()=>{
 const side={x:road.x,z:-10},sideState={onBridge:false},sideHit=updateElevatedPosition(side,{x:road.x+20,z:-10},sideState,.4);assert.equal(sideState.onBridge,false);assert.equal(sideHit.hitX,true);assert.ok(side.x>road.x+road.width/2);
 const beneath={x:road.x,z:-20},underState={onBridge:false},underHit=updateElevatedPosition(beneath,{x:road.x,z:-35},underState,.4);assert.equal(underState.onBridge,false);assert.equal(underHit.hitZ,true);
 const crossing={x:road.x-15,z:-42},groundState={onBridge:false};updateElevatedPosition(crossing,{x:road.x+15,z:-42},groundState,.4);assert.equal(groundState.onBridge,false);assert.equal(crossing.x,road.x-15);assert.equal(groundState.height,0);
});

test('the existing driving model can climb the full bridge and return to ground',()=>{
 const car={x:road.x,z:18,vx:0,vz:0,heading:0,yaw:0,steer:0,rpm:850,gear:1,speed:0,slip:0,impactCooldown:0},state={onBridge:false};
 const spec={torque:400,grip:1.3,steeringResponse:1,brake:8,mass:1400,finalDrive:3.4,suspension:55,brakeBias:60};let max=0,entered=false,exited=false;
 for(let i=0;i<1000&&car.z>road.northEntry-5;i++){const previous={x:car.x,z:car.z};stepCar(car,{throttle:1},spec,1/60);updateElevatedPosition(car,previous,state,{x:1.1,z:2.35});entered||=state.onBridge;max=Math.max(max,state.height);if(entered&&!state.onBridge)exited=true;}
 assert.ok(entered&&exited);assert.equal(max,road.height);assert.ok(car.z<road.northEntry);
});
