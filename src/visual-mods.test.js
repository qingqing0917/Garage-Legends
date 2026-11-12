import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGame,switchVehicle,saveGame,loadGame,carSpecs,prepareCar,applyTuning,TUNE_DEFAULT,raceReadiness} from './game.js';
import {visualMods,applyVisualMods,disposeVisualMods,activeWingTarget,poseActiveWing,rotateDownforceFans} from './visual-mods.js';
import {createTrack,spawnCar,stepCar,trackContact,assistedInput,assistedProfile} from './driving.js';
import {filterVehicles,VEHICLES} from './vehicles.js';
import {createSportsCar} from './sports-car.js';

test('wing color and material persist per car without changing shared parts',()=>{
 const state=createGame(),mods=visualMods(state);assert.equal(mods.wingColor,'original');assert.equal(mods.wingMaterial,'original');
 Object.assign(mods,{wing:'active',wingColor:'#2870b2',wingMaterial:'carbon'});switchVehicle(state,'aero');assert.equal(visualMods(state).wingColor,'original');switchVehicle(state,'r86');
 let saved;const storage={setItem:(_,value)=>saved=value,getItem:()=>saved};saveGame(state,storage);const loaded=loadGame(storage);assert.equal(visualMods(loaded).wingColor,'#2870b2');assert.equal(visualMods(loaded).wingMaterial,'carbon');
 const car=new THREE.Group(),shared=new THREE.MeshStandardMaterial({color:'#eeeeee'}),factory=new THREE.Group(),wing=new THREE.Mesh(new THREE.BoxGeometry(),shared),body=new THREE.Mesh(new THREE.BoxGeometry(),shared);factory.name='factoryWing';factory.add(wing);car.add(factory,body);
 applyVisualMods(car,visualMods(loaded));assert.equal(wing.material.color.getHexString(),'2870b2');assert.equal(body.material.color.getHexString(),'eeeeee');assert.ok(wing.material.map?.isDataTexture);
 const active=car.getObjectByName('activeWingBlade'),lip=car.getObjectByName('customLip').children[0];assert.equal(active.material.color.getHexString(),'2870b2');assert.equal(lip.material.color.getHexString(),'171b1d');
 const clone=car.clone(true);poseActiveWing(clone,1);assert.equal(clone.getObjectByName('activeWingBlade').material.color.getHexString(),'2870b2');
 Object.assign(visualMods(loaded),{wing:'stock',wingColor:'original',wingMaterial:'original'});applyVisualMods(car,visualMods(loaded));assert.equal(wing.material.color.getHexString(),'eeeeee');assert.equal(wing.material.map,null);disposeVisualMods(car);assert.equal(wing.material,shared);
});

test('fin cars extend the rear deck and keep both custom wings behind the fin',()=>{
 for(const name of ['Valkyrie','P1/ P1 GTR']){
  const model=VEHICLES.find(v=>v.name===name&&v.design.fin);assert.ok(model,name);
  const mechanics={};for(const id of ['engine','gearbox','battery','radiator']){const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());mesh.userData.originalMaterial=mesh.material;group.add(mesh);mechanics[id]=group;}
  const panels=[];const built=createSportsCar({model,mechanics,createPanel:(id,geometry,parent)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial());parent.add(mesh);panels.push(mesh);return mesh;}}),car=built.car;
  const mods={wing:'fixed',lowering:0,camber:0};applyVisualMods(car,mods,'#d52d2d');applyVisualMods(car,mods,'#d52d2d');
  const fin=car.getObjectByName('central-fin'),fixed=car.getObjectByName('customWing'),active=car.getObjectByName('activeWing'),deck=car.getObjectByName('extendedWingDeck');assert.ok(fin&&deck);
  car.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(car.matrixWorld).invert();const bounds=obj=>new THREE.Box3().setFromObject(obj).applyMatrix4(inverse);
  const finEnd=bounds(fin).max.z;assert.ok(bounds(fixed).min.z>finEnd);assert.ok(bounds(active).min.z>finEnd);assert.ok(bounds(deck).min.z<2.32&&bounds(deck).max.z>2.32);assert.ok(Math.abs(fixed.position.z-.42)<1e-8);
  mods.wing='active';applyVisualMods(car,mods);poseActiveWing(car,1);assert.ok(bounds(active).min.z>finEnd);
  disposeVisualMods(car);built.dispose();for(const panel of panels)panel.material.dispose();for(const group of Object.values(mechanics))group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 }
});

test('visual modifications persist per car and racing tires improve grip',()=>{
 const s=createGame();prepareCar(s);const grip=carSpecs(s).grip;
 Object.assign(visualMods(s),{lip:'sport',wing:'active',tires:'race',fenderColor:'#cf3030',lowering:12,camber:6});
 assert.ok(carSpecs(s).grip>grip);applyTuning(s,TUNE_DEFAULT);assert.equal(raceReadiness(s).ready,true);switchVehicle(s,'aero');assert.equal(visualMods(s).wing,'stock');assert.equal(raceReadiness(s).ready,false);
 visualMods(s).wing='fixed';switchVehicle(s,'r86');assert.equal(visualMods(s).wing,'active');
 let data;const storage={setItem:(_,value)=>data=value,getItem:()=>data};saveGame(s,storage);const loaded=loadGame(storage);
 assert.equal(visualMods(loaded).lowering,12);assert.equal(visualMods(loaded).fenderColor,'#cf3030');switchVehicle(loaded,'aero');assert.equal(visualMods(loaded).wing,'fixed');assert.equal(visualMods(loaded).fenderColor,'body');
});
test('rear lip and light and windshield colors persist by vehicle along with race time',()=>{
 const s=createGame();Object.assign(visualMods(s),{rearLip:'sport',headlightColor:'#61bcff',windshieldColor:'#54849a'});s.raceTimeOfDay='night';switchVehicle(s,'aero');
 assert.equal(visualMods(s).rearLip,'stock');switchVehicle(s,'r86');let data;const storage={setItem:(_,value)=>data=value,getItem:()=>data};saveGame(s,storage);const loaded=loadGame(storage);
 assert.equal(loaded.raceTimeOfDay,'night');assert.equal(visualMods(loaded).rearLip,'sport');assert.equal(visualMods(loaded).headlightColor,'#61bcff');assert.equal(visualMods(loaded).windshieldColor,'#54849a');
 const car=new THREE.Group(),lamp=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({emissive:0})),windshield=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),sideWindow=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#112233'}));lamp.material.userData.headlight=true;windshield.userData.windshield=true;car.add(lamp,windshield,sideWindow);
 applyVisualMods(car,visualMods(loaded));const clone=car.clone(true);assert.equal(clone.getObjectByName('customRearLip').visible,true);assert.equal(lamp.material.color.getHexString(),'61bcff');assert.equal(lamp.material.emissive.getHexString(),'61bcff');assert.equal(windshield.material.color.getHexString(),'54849a');assert.equal(sideWindow.material.color.getHexString(),'112233');
 visualMods(loaded).rearLip='stock';applyVisualMods(car,visualMods(loaded));assert.equal(car.getObjectByName('customRearLip').visible,false);disposeVisualMods(car);
});
test('visual parts, stance, wheel stripes and active wing survive a race clone',()=>{
 const car=new THREE.Group();for(const [id,x] of [['wheelFL',1],['wheelFR',-1],['wheelRL',1],['wheelRR',-1]]){const wheel=new THREE.Group();wheel.name=id;wheel.position.set(x,.43,0);car.add(wheel);}
 applyVisualMods(car,{lip:'sport',wing:'active',tires:'race',lowering:12,camber:6});
 const clone=car.clone(true);assert.equal(clone.getObjectByName('customLip').visible,true);assert.equal(clone.getObjectByName('activeWing').visible,true);assert.equal(clone.getObjectByName('wheelFL').getObjectByName('raceTireStripe').visible,true);
 assert.equal(clone.userData.visualLowering,.12);assert.ok(clone.getObjectByName('wheelFL').rotation.z>0);assert.ok(clone.getObjectByName('wheelFR').rotation.z<0);
 const wing=clone.getObjectByName('activeWing'),blade=wing.getObjectByName('activeWingBlade'),support=wing.getObjectByName('activeWingSupport');
 assert.equal(blade.material.color.getHex(),0xd52d2d);assert.ok(Math.abs(blade.position.y-.065/2-(support.position.y+support.scale.y/2))<1e-10);
 poseActiveWing(clone,1);assert.ok(Math.abs(blade.position.y-.065/2-(support.position.y+support.scale.y/2))<1e-10);assert.equal(activeWingTarget(80/3.6),0);assert.equal(activeWingTarget(81/3.6),1);poseActiveWing(clone,0);assert.equal(blade.position.y,.0425);disposeVisualMods(car);
});
test('wheel arches stay fixed while cambered wheels roll and survive a race clone',()=>{
 const car=new THREE.Group();
 for(const [id,x,z] of [['wheelFL',1,-1],['wheelFR',-1,-1],['wheelRL',1,1],['wheelRR',-1,1]]){
  const wheel=new THREE.Group();wheel.name=id;wheel.position.set(x,.43,z);const original=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());original.name='originalWheel';wheel.add(original);car.add(wheel);
 }
 const mods={lip:'stock',wing:'stock',tires:'race',fan:'none',lowering:16,camber:8};
 applyVisualMods(car,mods);applyVisualMods(car,mods);
 const clone=car.clone(true);
 for(const id of ['wheelFL','wheelFR','wheelRL','wheelRR']){
  const wheel=clone.getObjectByName(id),spin=wheel.getObjectByName('wheelSpin'),arch=clone.getObjectByName(`wheelArch-${id}`);
  assert.equal(arch.parent.name,'customParts');assert.ok(arch.getObjectByName('fenderFlare'));assert.ok(arch.getObjectByName('wheelWellLiner'));
  assert.equal(spin.getObjectByName('originalWheel').parent,spin);assert.equal(spin.getObjectByName('raceTire').visible,true);
  const camber=wheel.rotation.z;spin.rotation.x=10;assert.equal(wheel.rotation.z,camber);assert.ok(Math.abs(wheel.rotation.y)<1e-10);
  assert.equal(car.getObjectByName(id).children.filter(child=>child.name==='wheelSpin').length,1);
 }
 disposeVisualMods(car);
});
test('fenders have a closed top, cover lowered wheels, and use the selected color',()=>{
 const car=new THREE.Group();const wheel=new THREE.Group();wheel.name='wheelFL';wheel.position.set(1,.43,-1.43);car.add(wheel);
 const mods={lip:'stock',wing:'stock',tires:'street',fan:'none',fenderColor:'body',lowering:0,camber:0};
 applyVisualMods(car,mods,'#eeeeee');const arch=car.getObjectByName('wheelArch-wheelFL'),flare=arch.getObjectByName('fenderFlare');
 assert.equal(flare.material.color.getHexString(),'eeeeee');assert.equal(flare.geometry.type,'ExtrudeGeometry');assert.ok(flare.geometry.parameters.options.depth>.2);
 mods.lowering=16;mods.camber=8;mods.fenderColor='#cf3030';applyVisualMods(car,mods,'#eeeeee');
 assert.equal(flare.material.color.getHexString(),'cf3030');
 const top=arch.position.y+.46*arch.scale.y;assert.ok(top>=wheel.position.y+.46*wheel.scale.y-1e-9);
 assert.ok(Math.abs((wheel.position.y-.46*wheel.scale.y-mods.lowering/100)-(wheel.userData.visualBaseY-.46))<1e-9,'the tire stays on the ground');
 assert.equal(arch.position.y,wheel.userData.visualBaseY,'the fender stays attached to the body');
 assert.equal(car.clone(true).getObjectByName('fenderFlare').material.color.getHexString(),'cf3030');disposeVisualMods(car);
});
test('low and fast recommendations combine with search and sort by game speed',()=>{
 const cars=filterVehicles({lowFast:true,query:'McLaren'});assert.ok(cars.length>0);assert.ok(cars.every(c=>['wedge','prototype'].includes(c.design.body)));assert.ok(cars.every((c,i)=>!i||cars[i-1].topSpeed>=c.topSpeed));
});
test('fan kit persists per car, turns in 3D, and adds usable tire load',()=>{
 const s=createGame();prepareCar(s);const stock=carSpecs(s);visualMods(s).fan='race';const modified=carSpecs(s);assert.ok(modified.fanDownforce>0);
 const track=createTrack(),ordinary=spawnCar(track),fanCar=spawnCar(track);for(const car of [ordinary,fanCar]){car.heading=0;car.vx=4;car.vz=-20;car.speed=Math.hypot(car.vx,car.vz);}
 stepCar(ordinary,{},stock,1/60);stepCar(fanCar,{},modified,1/60);assert.ok(fanCar.vx<ordinary.vx);
 const driver=spawnCar(track,0,-2.2),assisted=assistedProfile(modified);let impacts=0;for(let i=0;i<150*60&&driver.lap<2;i++){const nearest=track.nearest(driver.x,driver.z);stepCar(driver,assistedInput(driver,track,assisted),assisted,1/60,nearest.distance>7?.62:1);if(trackContact(driver,track,1/60).impact)impacts++;}assert.equal(driver.lap,2);assert.equal(impacts,0);
 let saved;const storage={setItem:(_,value)=>saved=value,getItem:()=>saved};saveGame(s,storage);const loaded=loadGame(storage);assert.equal(visualMods(loaded).fan,'race');switchVehicle(loaded,'aero');assert.equal(visualMods(loaded).fan,'none');
 const model=new THREE.Group();applyVisualMods(model,{...visualMods(s)});const kit=model.getObjectByName('downforceFans');assert.equal(kit.visible,true);rotateDownforceFans(model,1.5);assert.equal(model.getObjectByName('rearFanRotor').rotation.z,1.5);assert.equal(model.getObjectByName('floorFanRotor').rotation.y,1.5);assert.equal(model.clone(true).getObjectByName('downforceFans').visible,true);disposeVisualMods(model);
});
