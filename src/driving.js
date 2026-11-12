export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const CIRCUIT_POINTS=[{x:0,z:0},{x:-65,z:0},{x:-110,z:38},{x:-105,z:100},{x:-55,z:128},{x:0,z:113},{x:42,z:135},{x:105,z:110},{x:120,z:40},{x:70,z:-5}];
export const MOUNTAIN_POINTS=[{x:0,z:0,y:2},{x:-65,z:-8,y:5},{x:-120,z:18,y:13},{x:-145,z:65,y:23},{x:-125,z:115,y:34},{x:-80,z:138,y:45},{x:-28,z:120,y:52},{x:20,z:145,y:47},{x:75,z:135,y:37},{x:115,z:95,y:26},{x:110,z:45,y:15},{x:65,z:5,y:7}];
export const TRACKS={circuit:{id:'circuit',name:'北郊环线',subtitle:'NORTH LOOP / CLUB CIRCUIT',points:CIRCUIT_POINTS},mountain:{id:'mountain',name:'云岭盘山路',subtitle:'CLOUD RIDGE / MOUNTAIN ROAD',points:MOUNTAIN_POINTS}};
export function createRaceTrack(id='circuit'){return createTrack((TRACKS[id]||TRACKS.circuit).points);}
export function createTrack(points=CIRCUIT_POINTS,sampleCount=500){
 const samples=[],n=points.length;
 for(let i=0;i<sampleCount;i++){
  const v=i/sampleCount*n,k=Math.floor(v),t=v-k,ids=[(k-1+n)%n,k%n,(k+1)%n,(k+2)%n],out={};
  for(const axis of ['x','y','z']){const [a,b,c,d]=ids.map(j=>points[j][axis]||0);out[axis]=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
  samples.push(out);
 }
 let length=0;const segments=samples.map((p,i)=>{const q=samples[(i+1)%samples.length],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,len=Math.hypot(dx,dz);const segment={...p,dx,dy,dz,len,s:length,tx:dx/len,tz:dz/len};length+=len;return segment;});
 function at(distance,lateral=0){const s=((distance%length)+length)%length;let lo=0,hi=segments.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(segments[mid].s<=s)lo=mid;else hi=mid-1;}const seg=segments[lo],f=clamp((s-seg.s)/seg.len,0,1);return {x:seg.x+seg.dx*f-seg.tz*lateral,y:seg.y+seg.dy*f,z:seg.z+seg.dz*f+seg.tx*lateral,tx:seg.tx,tz:seg.tz,s,slope:seg.dy/seg.len,heading:Math.atan2(-seg.tx,-seg.tz)};}
 function nearest(x,z){let best=null,bestD=Infinity;for(const seg of segments){const t=clamp(((x-seg.x)*seg.dx+(z-seg.z)*seg.dz)/(seg.len*seg.len),0,1),px=seg.x+seg.dx*t,pz=seg.z+seg.dz*t,dist2=(x-px)**2+(z-pz)**2;if(dist2<bestD){bestD=dist2;best={x:px,y:seg.y+seg.dy*t,z:pz,s:seg.s+t*seg.len,slope:seg.dy/seg.len,tx:seg.tx,tz:seg.tz,lateral:(x-px)*-seg.tz+(z-pz)*seg.tx,distance:Math.sqrt(dist2)};}}return best;}
 return {samples,segments,length,at,nearest,width:14,barrier:10.3};
}
export function spawnCar(track,s=0,lane=0){const p=track.at(s,lane);return {x:p.x,z:p.z,vx:0,vz:0,heading:p.heading,yaw:0,steer:0,rpm:850,gear:1,speed:0,slip:0,travel:s,lastS:p.s,lastValid:s,lap:0,impactCooldown:0,finished:false,finishTime:null};}
export function stepCar(car,input,spec,dt,surface=1,grade=null){
 dt=clamp(dt,0,.025);const fx=-Math.sin(car.heading),fz=-Math.cos(car.heading),rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
 const forward=car.vx*fx+car.vz*fz,lateral=car.vx*rx+car.vz*rz,absSpeed=Math.abs(forward);
 const steerTarget=clamp(input.steer||0,-1,1)*(.50/(1+absSpeed*.025));car.steer+=(steerTarget-car.steer)*Math.min(1,dt*7*spec.steeringResponse);
 const ratios=[3.35,1.95,1.35,1.0,.82];let gear=clamp(car.gear,1,5);let rpm=absSpeed/.32*60/(2*Math.PI)*ratios[gear-1]*spec.finalDrive;
 if(rpm>6100&&gear<5)gear++;else if(rpm<2500&&gear>1)gear--;
 car.gear=gear;car.rpm=clamp(absSpeed/.32*60/(2*Math.PI)*ratios[gear-1]*spec.finalDrive,850,6900);
 const throttle=clamp(input.throttle||0,0,1),brake=clamp(input.brake||0,0,1),handbrake=!!input.handbrake;
 if(input.holdStop&&brake&&!throttle&&car.speed<.5){car.vx=0;car.vz=0;car.speed=0;car.yaw=0;car.rpm=850;return car;}
 let drive=throttle*spec.torque*ratios[gear-1]*spec.finalDrive*.86/.32*(.78+.22*Math.exp(-(((car.rpm-4200)/2300)**2)));
 if(spec.stabilityAssist)drive*=clamp(1-Math.abs(car.steer)*.8-Math.max(0,(car.slip||0)-.12)*1.8,.30,1);
 if(car.rpm>=6750)drive*=.12;
 if(brake&&forward<.5&&!throttle&&!input.holdStop){drive=-brake*2200;car.gear=1;}
 let braking=(forward>.4||forward<-.4)?Math.sign(forward)*(brake*spec.brake*spec.mass+(handbrake?spec.mass*3.5:0)):0;
 if(forward<-.4&&brake&&!throttle&&!input.holdStop)braking=0;
 if(forward< -6)drive=Math.max(0,drive);
 const downforce=spec.mass*9.81*(spec.fanDownforce||0)*(.6+.4*clamp(absSpeed/30,0,1));
 const mu=spec.grip*surface,frontLoad=(spec.mass*9.81+downforce)*.54,rearLoad=(spec.mass*9.81+downforce)*.46;
 const maxDrive=mu*rearLoad;drive=clamp(drive,-maxDrive,maxDrive);
 const rearBudget=Math.sqrt(Math.max(.18,1-(drive/(maxDrive+1))**2));
 const lowSpeed=clamp(absSpeed/3,0,1),stiffness=spec.suspension;
 const frontSlip=Math.atan2(lateral-1.25*car.yaw,Math.max(3,absSpeed))-car.steer*Math.sign(forward||1);
 const rearSlip=Math.atan2(lateral+1.32*car.yaw,Math.max(3,absSpeed));
 const frontLimit=mu*frontLoad*(1-brake*.12),rearLimit=mu*rearLoad*(handbrake?.22:Math.max(spec.stabilityAssist?.75:.50,rearBudget))*(stiffness>65?1-(stiffness-65)*.003:1);
 let front=-frontLimit*Math.tanh(frontSlip*(7+(stiffness-55)*.025))*lowSpeed;
 let rear=-rearLimit*Math.tanh(rearSlip*8)*lowSpeed;
 if(brake&&spec.brakeBias<58)rear*=1-(58-spec.brakeBias)*.026;
 const resistance=forward*(.43*absSpeed+spec.mass*.011)+(surface<.8?forward*spec.mass*.22:0);
 const acceleration=(drive-braking-resistance)/spec.mass;
 car.vx+=(fx*acceleration+rx*(front+rear)/spec.mass)*dt;car.vz+=(fz*acceleration+rz*(front+rear)/spec.mass)*dt;
 if(grade){const gravity=9.81*grade.slope/Math.sqrt(1+grade.slope**2);car.vx-=grade.tx*gravity*dt;car.vz-=grade.tz*gravity*dt;}
 car.yaw+=((-1.25*front+1.32*rear)/(spec.mass*1.6)-car.yaw*(spec.stabilityAssist?.95:.55))*dt;car.yaw=clamp(car.yaw,-2,2);
 if(absSpeed<.4&&!throttle&&!brake){car.vx*=Math.exp(-4*dt);car.vz*=Math.exp(-4*dt);car.yaw*=Math.exp(-5*dt);}
 car.heading=wrapAngle(car.heading+car.yaw*dt);car.x+=car.vx*dt;car.z+=car.vz*dt;car.speed=Math.hypot(car.vx,car.vz);car.slip=Math.max(Math.abs(frontSlip),Math.abs(rearSlip));car.impactCooldown=Math.max(0,car.impactCooldown-dt);
 return car;
}
export function trackContact(car,track,dt){
 const n=track.nearest(car.x,car.z);let impact=0;
 if(n.distance>track.barrier){const nx=(car.x-n.x)/n.distance,nz=(car.z-n.z)/n.distance,vn=car.vx*nx+car.vz*nz;car.x=n.x+nx*track.barrier;car.z=n.z+nz*track.barrier;if(vn>0){car.vx-=nx*vn*1.3;car.vz-=nz*vn*1.3;car.vx*=.84;car.vz*=.84;car.yaw*=.5;if(vn>2&&car.impactCooldown<=0){impact=clamp((vn-1.5)*1.6,1,28);car.impactCooldown=.9;}}}
 const p=track.nearest(car.x,car.z);let ds=p.s-car.lastS;if(ds>track.length/2)ds-=track.length;if(ds< -track.length/2)ds+=track.length;
 if(p.distance<9.3&&Math.abs(ds)<Math.max(4,car.speed*dt*3)){car.travel+=ds;car.lastValid=car.travel;}
 car.lastS=p.s;car.lap=Math.max(0,Math.floor(car.travel/track.length));return {impact,projection:p};
}
export function resetCar(car,track){const travel=car.lastValid,p=spawnCar(track,travel);Object.assign(car,p,{travel,lastValid:travel});}
export function aiInput(car,track,spec,lane=0,skill=.78){
 const here=track.nearest(car.x,car.z),look=clamp(8+car.speed*.7,9,26),target=track.at(here.s+look,lane);
 const angle=wrapAngle(Math.atan2(-(target.x-car.x),-(target.z-car.z))-car.heading);
 let curvature=0;for(const ahead of [8,18,30]){const a=track.at(here.s+ahead-5),b=track.at(here.s+ahead+5);curvature=Math.max(curvature,Math.abs(wrapAngle(b.heading-a.heading))/10);}
 const desired=Math.min(29,Math.sqrt(spec.grip*9.81/Math.max(.003,curvature))*skill);
 return {steer:clamp(-angle*2.4,-1,1),throttle:car.speed<desired?clamp((desired-car.speed)*.4,.15,1):0,brake:car.speed>desired+1?clamp((car.speed-desired-1)*.18,0,.85):0};
}

// Assistance changes forces and driver inputs; distance, laps and collisions still use normal physics.
export function assistedProfile(spec,enabled=true){return enabled?{...spec,grip:spec.grip*1.18,stabilityAssist:true}:spec;}
export function trafficInput(car,track,input,cars){
 const here=track.nearest(car.x,car.z);let speedLimit=Infinity;
 for(const other of cars){
  if(other===car||other.finished)continue;
  const p=track.nearest(other.x,other.z),ahead=((p.s-here.s+track.length)%track.length);
  if(ahead<.1||ahead>Math.max(14,car.speed*2)||Math.abs(p.lateral-here.lateral)>3.4)continue;
  const forwardSpeed=Math.max(0,other.vx*p.tx+other.vz*p.tz);
  speedLimit=Math.min(speedLimit,Math.max(0,forwardSpeed+(ahead-6.5)*.7));
 }
 if(car.speed>speedLimit)return {...input,throttle:0,brake:Math.max(input.brake||0,clamp((car.speed-speedLimit)*.3,0,1)),traffic:true,holdStop:speedLimit<.5};
 return input;
}
export function assistedInput(car,track,spec,manual={},cars=[]){
 const here=track.nearest(car.x,car.z),look=clamp(8+car.speed*.65,9,25),target=track.at(here.s+look);
 const angle=wrapAngle(Math.atan2(-(target.x-car.x),-(target.z-car.z))-car.heading);
 const headingError=Math.abs(wrapAngle(car.heading-track.at(here.s).heading));
 let desired=31,nearCurve=0;
 // Plan far enough ahead to brake even a fully upgraded car before a tight corner.
 for(let ahead=0;ahead<=90;ahead+=6){
  const a=track.at(here.s+ahead-4),b=track.at(here.s+ahead+4),curvature=Math.abs(wrapAngle(b.heading-a.heading))/8;
  if(ahead<=24)nearCurve=Math.max(nearCurve,curvature);
  const cornerSpeed=Math.sqrt(spec.grip*9.81/Math.max(.002,curvature))*.70;
  desired=Math.min(desired,Math.sqrt(cornerSpeed**2+2*spec.brake*.48*Math.max(0,ahead-8)));
 }
 if(here.distance>4.5)desired=Math.min(desired,Math.max(6,17-(here.distance-4.5)*3));
 if(headingError>.65)desired=Math.min(desired,Math.max(4,12-headingError*3));
 let input={steer:clamp(-angle*2.4,-1,1),throttle:car.speed<desired?clamp((desired-car.speed)*.45,.08,1):0,brake:car.speed>desired+.25?clamp((car.speed-desired)*.35,0,1):0,handbrake:false,holdStop:true,status:car.speed>desired+1?'入弯减速':nearCurve>.012?'自动循迹过弯':'自动巡航',targetSpeed:desired};
 input=trafficInput(car,track,input,cars);
 if(input.traffic)input.status='前车减速跟随';
 if(manual.steer){input.steer=manual.steer;input.status='手动转向 · 松开继续辅助';}
 if(manual.brake){input.throttle=0;input.brake=Math.max(input.brake,manual.brake);input.status='手动刹车';}
 if(manual.handbrake){input.throttle=0;input.handbrake=true;input.status='手刹 · 松开继续辅助';}
 return input;
}
export function collideCars(cars){
 const impacts=[];
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
  const a=cars[i],b=cars[j];if(a.finished||b.finished)continue;
  const dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);
  if(d>0&&d<2.65){const nx=dx/d,nz=dz/d,overlap=(2.65-d)/2;a.x+=nx*overlap;a.z+=nz*overlap;b.x-=nx*overlap;b.z-=nz*overlap;
   const closing=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
   if(closing<0){const impulse=-closing*.55;a.vx+=nx*impulse;a.vz+=nz*impulse;b.vx-=nx*impulse;b.vz-=nz*impulse;
    if(i===0&&-closing>3&&a.impactCooldown<=0){impacts.push(clamp(-closing,2,18));a.impactCooldown=1;}
   }
  }
 }
 return impacts;
}
export function rankCars(cars){return [...cars].sort((a,b)=>{if(a.finished&&b.finished)return a.finishTime-b.finishTime;if(a.finished)return -1;if(b.finished)return 1;return b.travel-a.travel;});}
