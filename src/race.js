import * as THREE from 'three';
import {activeWingTarget,poseActiveWing,rotateDownforceFans} from './visual-mods.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildOpponent,normalizeOpponents,opponentInfo,opponentProfile} from './race-opponents.js';
import {createRaceTrack,TRACKS,spawnCar,stepCar,trackContact,resetCar,aiInput,rankCars,clamp,assistedProfile,assistedInput,trafficInput,collideCars} from './driving.js';

export function createRace(container,{vehicle,getProfile,onHUD,onFinish,onDamage,onPause,onNotice,onAssistChange,assistEnabled=true,sound=true,timeOfDay='day',opponentModels,trackId='circuit'}){
 const track=createRaceTrack(trackId),mountain=trackId==='mountain',trackInfo=TRACKS[trackId]||TRACKS.circuit,scene=new THREE.Scene();scene.background=new THREE.Color('#b8c8c4');scene.fog=new THREE.Fog('#b8c8c4',100,420);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',`可驾驶的${trackInfo.name}三维赛道 · ${vehicle.name||'R-86'}`);
 const camera=new THREE.PerspectiveCamera(62,1,.06,850);
 const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.08).texture;scene.environment=environment;scene.environmentIntensity=.28;env.dispose();pmrem.dispose();
 const ambient=new THREE.HemisphereLight('#d5e2df','#65704c',2);scene.add(ambient);const sun=new THREE.DirectionalLight('#ffedd3',2.7);sun.position.set(-35,70,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-40;sun.shadow.camera.right=40;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;sun.shadow.camera.near=1;sun.shadow.camera.far=150;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
 const ownedMaterials=new Set(),ownedGeometries=new Set(),ownedTextures=new Set();
 function mat(color,roughness=.85,metalness=.05){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});ownedMaterials.add(m);return m;}
 function geometry(g){ownedGeometries.add(g);return g;}
 function mesh(g,m,parent=scene){const obj=new THREE.Mesh(geometry(g),m);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
 function box(w,h,d,m,x,y,z,parent=scene){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
 function texture(text,bg='#17282c',fg='#e7b775',width=1024,height=180){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle=fg;ctx.font=`600 ${height*.42}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(t);return t;}
 const ground=mat('#78836a'),asphalt=mat('#333a3c'),white=mat('#d8d8c4'),red=mat('#a84c3b'),steel=mat('#748480',.48,.65),dark=mat('#273536'),orange=mat('#d59b4f');
 const terrain=mesh(new THREE.PlaneGeometry(1800,1800),ground);terrain.rotation.x=-Math.PI/2;terrain.position.y=-.03;terrain.castShadow=false;
 function ribbon(inner,outer,material,height=.03,filter=()=>true,outerDrop=0){const pos=[],uv=[],indices=[];for(let i=0;i<track.segments.length;i++){if(!filter(i))continue;const a=track.at(track.segments[i].s),b=track.at(track.segments[i].s+track.segments[i].len);const base=pos.length/3;for(const [p,d,drop]of [[a,inner,0],[a,outer,outerDrop],[b,inner,0],[b,outer,outerDrop]]){pos.push(p.x-p.tz*d,Math.max(-.02,p.y+height-drop*p.y),p.z+p.tx*d);uv.push(d/14,p.s/18);}indices.push(base,base+2,base+1,base+1,base+2,base+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const o=mesh(geo,material);o.material.side=THREE.DoubleSide;o.castShadow=false;return o;}
 if(mountain){const mountainside=mat('#687e60');ribbon(-10.5,-33,mountainside,0,()=>true,1);ribbon(10.5,33,mountainside,0,()=>true,1);}
 ribbon(-10.5,10.5,mat('#9b9b83'),.005);ribbon(-7,7,asphalt,.025);ribbon(-6.88,-6.72,white,.033);ribbon(6.72,6.88,white,.033);
 for(const side of [-1,1]){ribbon(side*7,side*7.8,white,.035);ribbon(side*7,side*7.8,red,.038,i=>Math.floor(i/4)%2===0);}
 const guide=ribbon(-.055,.055,mat('#b5b681'),.04,i=>i%10<5);
 // Continuous physical boundary, using instanced barriers to keep racing responsive.
 const barrierGeo=geometry(new THREE.BoxGeometry(.32,.72,track.length/500+0.1));const barriers=new THREE.InstancedMesh(barrierGeo,steel,1000),dummy=new THREE.Object3D();barriers.castShadow=true;barriers.receiveShadow=true;
 for(let i=0;i<500;i++)for(let side=0;side<2;side++){const p=track.at(i/500*track.length,(side?1:-1)*11.4);dummy.position.set(p.x,p.y+.36,p.z);dummy.rotation.order='YXZ';dummy.rotation.set(Math.atan(p.slope),p.heading,0);dummy.updateMatrix();barriers.setMatrixAt(i*2+side,dummy.matrix);}scene.add(barriers);
 const gate=new THREE.Group(),start=track.at(0);gate.position.set(start.x,start.y,start.z);gate.rotation.y=start.heading;scene.add(gate);
 box(.35,6,.35,steel,-8.5,3,0,gate);box(.35,6,.35,steel,8.5,3,0,gate);const bannerMat=mat('#ffffff');bannerMat.map=texture('EMBER / CLUB CIRCUIT');box(17.5,1.25,.26,bannerMat,0,5.6,0,gate);
 const checker=document.createElement('canvas');checker.width=256;checker.height=32;const cx=checker.getContext('2d');for(let x=0;x<16;x++)for(let y=0;y<2;y++){cx.fillStyle=(x+y)%2?'#e4e2d5':'#30393a';cx.fillRect(x*16,y*16,16,16);}const finishTexture=new THREE.CanvasTexture(checker);finishTexture.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(finishTexture);const finishMat=mat('#ffffff');finishMat.map=finishTexture;box(14,.012,1,finishMat,0,.048,0,gate);
 for(let i=0;i<4;i++){const p=track.at(-i*5-1,i%2?2.5:-2.5),g=new THREE.Group();g.position.set(p.x,p.y+.052,p.z);g.rotation.order='YXZ';g.rotation.set(Math.atan(p.slope),p.heading,0);scene.add(g);box(2.1,.012,.1,white,0,0,1.6,g);for(const side of[-1,1])box(.1,.012,1,white,side*1.05,0,1.15,g);}
 // Paddock, signage and low hills frame a closed circuit.
 box(36,5,12,dark,-14,2.5,-31);box(37,.3,13,steel,-14,5.2,-31);for(let i=0;i<6;i++)box(4,3,.05,mat('#596e70'),-29+i*6,1.6,-24.94);
 const paddockSign=mat('#ffffff');paddockSign.map=texture('CS PERFORMANCE / PIT LANE','#283c3e','#d4cbbb');box(22,1.1,.08,paddockSign,-14,4.2,-24.88);
 for(let i=0;i<3;i++){const p=track.at(track.length*(.24+i*.24),17),board=new THREE.Group();board.position.set(p.x,p.y,p.z);board.rotation.y=p.heading;scene.add(board);for(const x of[-4,4])box(.15,3,.15,steel,x,1.5,0,board);const m=mat('#fff');m.map=texture(i===0?'BRAKE / TURN / ACCELERATE':i===1?'BUILT BY YOU':mountain?'CLOUD RIDGE':'NORTH LOOP  ·  638 M');box(10,1.7,.13,m,0,2.8,0,board);}
 const treeMat=mat('#456356'),trunkMat=mat('#675843');const leaves=new THREE.InstancedMesh(geometry(new THREE.ConeGeometry(3.4,10,7)),treeMat,150),trunks=new THREE.InstancedMesh(geometry(new THREE.CylinderGeometry(.25,.4,5,5)),trunkMat,150);let planted=0,seed=17;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 while(planted<150){const x=rnd()*400-200,z=rnd()*320-90;if(track.nearest(x,z).distance<(mountain?38:21)||Math.abs(x+14)<28&&Math.abs(z+31)<15)continue;const size=.7+rnd()*.8;dummy.rotation.set(0,rnd()*6.28,0);dummy.scale.setScalar(size);dummy.position.set(x,8*size,z);dummy.updateMatrix();leaves.setMatrixAt(planted,dummy.matrix);dummy.position.set(x,2.5*size,z);dummy.updateMatrix();trunks.setMatrixAt(planted,dummy.matrix);planted++;}leaves.castShadow=true;scene.add(leaves,trunks);
 for(let i=0;i<17;i++){const angle=i/17*Math.PI*2;const hill=mesh(new THREE.ConeGeometry(65+i%3*20,50+i%4*16,7),mat(i%2?'#84918a':'#8c9890'));hill.position.set(Math.cos(angle)*380,15,55+Math.sin(angle)*340);hill.castShadow=false;}
 const playerModel=new THREE.Group();vehicle.position.set(0,-(vehicle.userData.visualLowering||0),0);playerModel.add(vehicle);scene.add(playerModel);const glassMeshes=[],lampCopies=new Map();vehicle.traverse(m=>{if(m.userData.window)glassMeshes.push(m);if(m.isMesh&&m.material?.userData.headlight){if(!lampCopies.has(m.material)){const copy=m.material.clone();lampCopies.set(m.material,copy);ownedMaterials.add(copy);}m.material=lampCopies.get(m.material);}});const headlights=[];for(const x of [-.65,.65]){const light=new THREE.SpotLight(vehicle.userData.headlightColor||'#e6fbff',0,75,.42,.65,2);light.position.set(x,.68,-2.3);light.target.position.set(x,.08,-22);vehicle.add(light,light.target);headlights.push(light);}const wheels=['wheelFL','wheelFR','wheelRL','wheelRR'].map(id=>vehicle.getObjectByName(id)),wheelHeights=wheels.map(w=>w?.position.y);let fanAngle=0;
 function setTimeOfDay(value){const night=value==='night';scene.background.set(night?'#18242e':'#b8c8c4');scene.fog.color.copy(scene.background);ambient.intensity=night?.65:2;sun.intensity=night?.45:2.7;sun.color.set(night?'#a5c4db':'#ffedd3');scene.environmentIntensity=night?.12:.28;renderer.toneMappingExposure=night?.95:1.05;for(const light of headlights)light.intensity=night?500:0;for(const lamp of lampCopies.values())lamp.emissiveIntensity=night?2.5:1.2;}
 setTimeOfDay(timeOfDay);
 // A camera-mounted footwell gives every vehicle an opaque cabin, independent of its engine layout.
 const cockpit=new THREE.Group();cockpit.visible=false;camera.add(cockpit);scene.add(camera);
 const cabinPanel=mat('#283132',.93),cabinTrim=mat('#495354',.8),pedalMetal=mat('#a8b0a8',.48,.55),pedalGrip=mat('#293333',.9);
 for(const m of [cabinPanel,cabinTrim,pedalMetal,pedalGrip])m.depthTest=false;
 function cockpitBox(w,h,d,m,x,y,z,order=10){const part=box(w,h,d,m,x,y,z,cockpit);part.renderOrder=order;part.castShadow=false;part.receiveShadow=false;return part;}
 cockpitBox(4,.65,.05,cabinPanel,0,-.53,-.70);
 cockpitBox(4,.025,.025,cabinTrim,0,-.20,-.665,11);
 cockpitBox(4,.035,.025,cabinTrim,0,-.76,-.665,11);
 const accelerator=new THREE.Group();accelerator.name='acceleratorPedal';cockpit.add(accelerator);
 function pedalBox(w,h,d,m,x,y,z){const part=box(w,h,d,m,x,y,z,accelerator);part.renderOrder=12;part.castShadow=false;part.receiveShadow=false;return part;}
 pedalBox(.13,.25,.025,pedalMetal,0,0,0);
 for(let i=0;i<4;i++)pedalBox(.105,.012,.01,pedalGrip,0,-.075+i*.05,.019);
 accelerator.position.set(.40,-.37,-.65);
 const colors=['#c78c4f','#7da3af','#b0b4a1','#af6460'],names=['你','林 · 07','周 · 24','陈 · 61'];
 const selections=normalizeOpponents(opponentModels);
 const cars=[spawnCar(track,0,-2.2),spawnCar(track,-5,2.2),spawnCar(track,-10,-2.2),spawnCar(track,-15,2.2)].map((c,i)=>({...c,id:i,name:names[i],color:colors[i],model:i===0?playerModel:null,lane:i%2?2:-2,skill:.73+i*.025,lapStart:0,bestLap:null}));
 function setOpponent(slot,id){const car=cars[slot+1];if(!car)return;if(car.model){scene.remove(car.model);car.built.dispose();}const info=opponentInfo(id);car.built=buildOpponent(info);car.model=car.built.model;car.profile=opponentProfile(info);car.name=`${names[slot+1]} · ${info.name}`;scene.add(car.model);}
 selections.forEach((id,i)=>setOpponent(i,id));
 let active=false,paused=false,ended=false,elapsed=0,countdown=3,accumulator=0,lastFrame=performance.now(),lastHUD=0,view='chase',animation=0,muted=!sound,resetCooldown=0,previousLap=0;
 let assist=assistEnabled,assistStatus='准备自动过弯',pedalTarget=0;
 const keys=new Set(),held=new Set();let audioContext,audioGain,oscillator;
 function makeAudio(){try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();oscillator=audioContext.createOscillator();oscillator.type='sawtooth';const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=200;audioGain=audioContext.createGain();audioGain.gain.value=0;oscillator.connect(filter);filter.connect(audioGain);audioGain.connect(audioContext.destination);oscillator.start();}audioContext.resume();}catch{}}
 function soundLevel(){if(audioGain)audioGain.gain.setTargetAtTime(active&&!paused&&!ended&&!muted?.017:0,audioContext.currentTime,.08);}
 function setPaused(value){if(!active||ended)return;paused=value;keys.clear();held.clear();accumulator=0;soundLevel();onPause?.(paused);}
 function switchView(){view=view==='chase'?'cockpit':'chase';cockpit.visible=view==='cockpit';if(view==='chase'){const p=cars[0],height=track.nearest(p.x,p.z).y;camera.position.set(p.x+Math.sin(p.heading)*8.5,height+3.9,p.z+Math.cos(p.heading)*8.5);}for(const m of glassMeshes)m.visible=view!=='cockpit'&&!m.userData.bodyHidden;onNotice?.(view==='cockpit'?'驾驶舱视角 · C 切回车后':'车后跟随视角 · C 切换驾驶舱');}
 function toggleAssist(){assist=!assist;keys.clear();held.clear();assistStatus=assist?'准备自动过弯':'手动驾驶';onAssistChange?.(assist);onNotice?.(assist?'自动过弯已开启：自动减速、转向与加速。':'已切回手动驾驶：W/S 油门刹车，A/D 转向。');return assist;}
 function recover(){if(!active||ended||paused||countdown>0||resetCooldown>0)return;resetCar(cars[0],track);elapsed+=5;resetCooldown=2;onNotice?.('车辆已回到赛道，计时增加 5 秒。');}
 function keydown(e){if(document.querySelector('#modal-root')?.children.length)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.repeat)return;if(e.code==='KeyF'){e.preventDefault();toggleAssist();}if(e.code==='KeyC')switchView();if(e.code==='KeyR')recover();if(e.code==='Escape'){e.preventDefault();setPaused(!paused);}}
 function keyup(e){keys.delete(e.code);}function blur(){keys.clear();held.clear();if(active&&!ended)setPaused(true);}function visibility(){if(document.hidden)blur();}
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
 function playerInput(){const has=(...k)=>k.some(v=>keys.has(v)||held.has(v));return {throttle:has('KeyW','ArrowUp')?1:0,brake:has('KeyS','ArrowDown')?1:0,steer:(has('KeyD','ArrowRight')?1:0)-(has('KeyA','ArrowLeft')?1:0),handbrake:has('Space')};}
 function finish(finished){if(ended)return;ended=true;active=false;soundLevel();const standing=rankCars(cars),place=finished?standing.indexOf(cars[0])+1:null;onFinish?.({finished,place,time:elapsed,bestLap:cars[0].bestLap,results:standing.map(c=>({name:c.name,id:c.id,time:c.finishTime,lap:Math.min(2,c.lap)}))});}
 function tick(dt){
  if(countdown>0){countdown=Math.max(0,countdown-dt);return;}
  elapsed+=dt;resetCooldown=Math.max(0,resetCooldown-dt);const base=getProfile(),spec=assistedProfile(base,assist);
  for(const c of cars){if(c.finished)continue;const cs=c.id?c.profile:spec;
   let input=c.id?trafficInput(c,track,aiInput(c,track,cs,c.lane,c.skill),cars):assist?assistedInput(c,track,cs,playerInput(),cars):playerInput();if(!c.id){assistStatus=assist?input.status:'手动驾驶';pedalTarget=input.throttle||0;}const before=track.nearest(c.x,c.z);stepCar(c,input,cs,dt,before.distance>7?.62:1,before);const contact=trackContact(c,track,dt);
   if(contact.impact&&!c.id){const f={x:-Math.sin(c.heading),z:-Math.cos(c.heading)},outx=c.x-contact.projection.x,outz=c.z-contact.projection.z;const frontal=f.x*outx+f.z*outz;onDamage?.(contact.impact,frontal>2?'front':frontal< -2?'rear':'side');}
   if(c.lap>previousLap&&!c.id){const lapTime=elapsed-c.lapStart;c.bestLap=Math.min(c.bestLap??Infinity,lapTime);c.lapStart=elapsed;previousLap=c.lap;onNotice?.(c.lap<2?`第 ${c.lap} 圈完成 · ${lapTime.toFixed(2)} 秒`:'冲线！');}
   if(c.travel>=track.length*2){c.finished=true;c.finishTime=elapsed;c.vx*=.9;c.vz*=.9;}
  }
  for(const impact of collideCars(cars))onDamage?.(impact,'side');
  if(cars[0].finished)finish(true);else if(getProfile().engineHealth<.22||getProfile().health<15)finish(false);else if(elapsed>600)finish(false);
 }
 const look=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),forward=new THREE.Vector3();
 function renderFrame(dt){
  for(const c of cars){const surface=track.nearest(c.x,c.z),forwardSlope=surface.slope*Math.cos(c.heading-track.at(surface.s).heading);c.model.position.set(c.x,surface.y+.04,c.z);c.model.rotation.order='YXZ';c.model.rotation.set(Math.atan(forwardSlope),c.heading,0);if(!c.id){vehicle.rotation.z=clamp(-c.steer*c.speed*.008,-.045,.045);for(const wheel of wheels){const spin=wheel?.getObjectByName('wheelSpin');if(spin)spin.rotation.x-=c.speed/.42*dt;}}}
  const p=cars[0];const activeWing=vehicle.getObjectByName('activeWing');if(activeWing?.visible)poseActiveWing(vehicle,THREE.MathUtils.lerp(activeWing.userData.wingLift||0,activeWingTarget(p.speed),1-Math.exp(-dt*4)));const fan=vehicle.getObjectByName('downforceFans'),squat=fan?.visible ? .02*clamp(p.speed/30,0,1) : 0;vehicle.position.y=-(vehicle.userData.visualLowering||0)-squat;wheels.forEach((wheel,i)=>{if(wheel)wheel.position.y=wheelHeights[i]+squat/vehicle.scale.y;});fanAngle+=dt*(9+Math.min(18,p.speed*.5));rotateDownforceFans(vehicle,fanAngle);forward.set(-Math.sin(p.heading),0,-Math.cos(p.heading));const right=new THREE.Vector3(Math.cos(p.heading),0,-Math.sin(p.heading));
  const surface=track.nearest(p.x,p.z),forwardSlope=surface.slope*Math.cos(p.heading-track.at(surface.s).heading);if(view==='cockpit'){camera.position.set(p.x,surface.y+(vehicle.userData.cockpitHeight||1.39),p.z);camera.position.addScaledVector(right,.39).addScaledVector(forward,-.12);look.set(p.x,surface.y+(vehicle.userData.cockpitHeight||1.39)-.14+forwardSlope*35,p.z).addScaledVector(forward,35).addScaledVector(right,.39);camera.fov=76;camera.lookAt(look);}else{desiredCamera.set(p.x,surface.y+3.9-forwardSlope*8.5,p.z).addScaledVector(forward,-8.5);camera.position.lerp(desiredCamera,1-Math.exp(-dt*6));look.set(p.x,surface.y+1.05+forwardSlope*5,p.z).addScaledVector(forward,5);camera.fov=60+Math.min(8,p.speed*.20);camera.lookAt(look);}camera.updateProjectionMatrix();
  accelerator.rotation.x=THREE.MathUtils.lerp(accelerator.rotation.x,pedalTarget*.32,1-Math.exp(-dt*10));
  sun.position.set(p.x-35,surface.y+70,p.z-20);sun.target.position.set(p.x,surface.y,p.z);sun.target.updateMatrixWorld();renderer.render(scene,camera);
  if(oscillator)oscillator.frequency.setTargetAtTime(35+p.rpm/70,audioContext.currentTime,.05);
 }
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;const narrow=camera.aspect<.9;accelerator.position.x=narrow?-.015:Math.min(.40,camera.aspect*.35);accelerator.position.y=narrow?-.31:-.37;accelerator.scale.set(narrow?.55:1,narrow?.72:1,1);camera.updateProjectionMatrix();renderer.setSize(w,h);}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 const p=cars[0];camera.position.set(p.x+8,track.nearest(p.x,p.z).y+4,p.z+8);
 function frame(now){animation=requestAnimationFrame(frame);const dt=Math.min(.06,(now-lastFrame)/1000);lastFrame=now;if(active&&!paused&&!ended){accumulator+=dt;while(accumulator>=1/60){tick(1/60);accumulator-=1/60;if(ended)break;}}renderFrame(paused?0:dt);if(now-lastHUD>90){lastHUD=now;const standing=rankCars(cars);onHUD?.({speed:Math.round(cars[0].speed*3.6),gear:cars[0].gear,rpm:cars[0].rpm,time:elapsed,lap:Math.min(2,cars[0].lap+1),position:standing.indexOf(cars[0])+1,countdown,active,paused,ended,view,assist,assistStatus,slip:cars[0].slip,health:getProfile().health,wrongWay:Math.abs(Math.atan2(Math.sin(cars[0].heading-track.at(cars[0].lastS).heading),Math.cos(cars[0].heading-track.at(cars[0].lastS).heading)))>1.8,cars:cars.map(c=>({id:c.id,x:c.x,z:c.z,travel:c.travel,name:c.name})),order:standing.map(c=>c.id)});}}
 animation=requestAnimationFrame(frame);
 return {track,start(){if(active||ended)return;active=true;paused=false;countdown=3;makeAudio();soundLevel();},isActive:()=>active&&!ended,isPaused:()=>paused,setPaused,setTimeOfDay,switchView,recover,toggleAssist,setOpponent(slot,id){if(!active&&!ended)setOpponent(slot,id);},
  hold(code,value){value?held.add(code):held.delete(code);},setSound(on){muted=!on;soundLevel();},toggleGuide(){guide.visible=!guide.visible;return guide.visible;},
  destroy(){active=false;ended=true;cancelAnimationFrame(animation);observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);audioContext?.close();for(const c of cars)if(c.built)c.built.dispose();for(const g of ownedGeometries)g.dispose();for(const m of ownedMaterials)m.dispose();for(const t of ownedTextures)t.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
 };
}
