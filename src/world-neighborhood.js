import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {wallBounds,treeHasClearance} from './world-collision.js';

export const WORLD_PLACES={home:{x:-23,z:-20,label:'我的家'},cs:{x:25,z:-23,label:'CS 性能调校店'},repair:{x:25,z:-59,label:'汽车修理铺'},lake:{x:64,z:-129,label:'西湖'},bridge:{x:44,z:-111,label:'断桥'},pagoda:{x:78,z:-72,label:'雷峰塔'},school:{x:-28,z:-82,label:'学校'},police:{x:25,z:-80,label:'警察局'},fire:{x:25,z:-126,label:'消防局'}};
export const PEDESTRIAN_COUNT=240;
export function nearbyShop(x,z){return ['cs','repair'].find(key=>{const place=WORLD_PLACES[key];return Math.hypot(x-place.x,z-place.z-5)<8;})||null;}

// A deterministic layout keeps the neighbourhood stable between visits.
export function buildNeighborhood(scene,{box,sphere,material,geometry,ownMaterial}){
 const colliders=[];
 const road=material('#424b4e'),stripe=material('#f3efe3'),yellow=material('#eccb68'),concrete=material('#aab4ad'),white=material('#edf0e8'),glass=material('#658f9b',.25),dark=material('#384d50'),wood=material('#987253'),roof=material('#5e6e6a');
 const roadBox=(w,d,x,z)=>box(w,.06,d,road,x,.015,z);
 roadBox(18,145,0,-76);roadBox(195,15,0,-42);roadBox(195,15,0,-100);roadBox(20,190,-58,-56);
 for(let z=-12;z>-150;z-=9){box(.16,.02,4,stripe,0,.055,z);for(const x of [-63,-53])box(.14,.02,4,stripe,x,.055,z);}
 for(let x=-90;x<=90;x+=9){box(4,.02,.16,stripe,x,.055,-42);box(4,.02,.16,stripe,x,.055,-100);}
 for(const x of [-67,-49])box(.12,.03,190,yellow,x,.06,-56);
 const sign=(label,x,z)=>{
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#244b47';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#e4eee2';ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#ffffff';ctx.font='bold 50px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,64);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;ownMaterial(texture);const mat=ownMaterial(new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  const panel=new THREE.Mesh(geometry(new THREE.PlaneGeometry(6,1.5)),mat);panel.position.set(x,4.8,z);scene.add(panel);
  box(.15,4.2,.15,dark,x-2.5,2.1,z);box(.15,4.2,.15,dark,x+2.5,2.1,z);
 };
 function building(x,z,w,d,color,title){
  colliders.push(wallBounds(x,z,w,d));
  const walls=material(color);box(w,.14,d,concrete,x,.08,z);const body=box(w,5.3,d,walls,x,2.72,z);box(w+.7,.3,d+.7,roof,x,5.5,z);
  for(let dx=-w/2+2;dx<w/2-1;dx+=3.3)for(const y of [1.9,3.8])box(1.8,1.05,.06,glass,x+dx,y,z+d/2+.04);
  box(2.3,2.8,.08,dark,x,1.5,z+d/2+.08);if(title)sign(title,x,z+d/2+.2);return body;
 }
 building(25,-23,14,10,'#d9ded5','CS 性能调校');building(25,-59,14,10,'#d1d0c5','汽车修理铺');
 for(const [x,z,c] of [[-42,-23,'#e4d8c5'],[-42,-12,'#d2dfd6'],[-80,-23,'#ceded9'],[-82,-69,'#e7ddcf'],[-32,-69,'#d9e1d8'],[46,-22,'#e1d9d4'],[48,-62,'#d6e1d6'],[-82,-125,'#e4d9cc'],[-27,-125,'#cbdedb']])building(x,z,11,9,c);
 const civic=[['school',16,10,'#efdfcf','#c77d5b'],['police',12,10,'#e2e8e5','#397598'],['fire',14,10,'#e8ded5','#c5483c']];
 for(const [key,w,d,color,accentColor] of civic){const {x,z,label}=WORLD_PLACES[key],body=building(x,z,w,d,color,label),accent=material(accentColor);body.name=`civic-${key}`;
  box(w,.5,.12,accent,x,3.3,z+d/2+.08);box(w+.4,.15,d+.4,accent,x,5.68,z);
  if(key==='school'){box(2,.55,.1,accent,x,4.25,z+d/2+.15);box(.14,2,.14,dark,x-w/2+1,6.6,z);box(1,.5,.06,accent,x-w/2+1.5,7.25,z);}
  if(key==='police'){box(.85,1.05,.1,accent,x,4.25,z+d/2+.16);box(.17,.68,.11,white,x,4.25,z+d/2+.22);box(.58,.17,.11,white,x,4.25,z+d/2+.22);}
  if(key==='fire')for(const offset of [-4,0,4]){box(3.1,2.5,.12,accent,x+offset,1.4,z+d/2+.16);for(const y of [.6,1.15,1.7,2.25])box(2.9,.035,.14,white,x+offset,y,z+d/2+.23);}
 }
 // Short access streets join the public facilities to the existing road network.
 roadBox(17,5,-44,-82).name='school-approach';roadBox(11,5,13.5,-80).name='police-approach';roadBox(11,5,13.5,-126).name='fire-approach';
 const buildingBounds=[...colliders,wallBounds(WORLD_PLACES.home.x,WORLD_PLACES.home.z,20,16)],trees=[];
 // A residential compound with two open pedestrian and vehicle entrances.
 function fence(x,z,w,d){colliders.push(wallBounds(x,z,w,d));box(w,1.05,d,dark,x,.58,z);box(w+.05,.12,d+.05,white,x,1.14,z);}
 fence(-52,-20,.2,28);fence(-12,-24.5,.2,19);fence(-12,-7.5,.2,3);fence(-47,-34,10,.2);fence(-24,-34,24,.2);fence(-39,-6,26,.2);fence(-16,-6,8,.2);
 box(3,.04,10,concrete,-23,.045,-8);box(15,.04,2,concrete,-15,.045,-3);sign('湖畔花园小区',-23,-6);
 // A stylised West Lake waterfront, causeway, and tiered Leifeng Pagoda.
 const water=material('#72b6bb',.24);const lake=new THREE.Mesh(geometry(new THREE.CircleGeometry(1,64)),water);lake.name='west-lake';lake.rotation.x=-Math.PI/2;lake.scale.set(30,19,1);lake.position.set(68,.07,-129);lake.receiveShadow=true;scene.add(lake);
 const bridge=box(29,.08,3.4,concrete,49,.09,-111);bridge.name='broken-bridge';for(const z of [-112.7,-109.3]){box(29,.1,.12,white,49,1,z);for(let x=35;x<=63;x+=3)box(.12,.9,.12,white,x,.58,z);}box(3,.07,12,concrete,37,.055,-105.5);
 sign('西湖 · 断桥',37,-98);
 const pagodaX=78,pagodaZ=-72;const pagoda=box(11,.5,11,concrete,pagodaX,.25,pagodaZ);pagoda.name='leifeng-pagoda';const brick=material('#c8895d');
 for(let floor=0;floor<4;floor++){const size=8-floor*1.15,y=.5+floor*2.05;box(size,1.7,size,brick,pagodaX,y+.85,pagodaZ);box(size+1.2,.24,size+1.2,roof,pagodaX,y+1.85,pagodaZ);for(const dx of [-1,1])box(.7,1,.08,dark,pagodaX+dx*(size*.27),y+.85,pagodaZ+size/2+.05);}
 const spire=new THREE.Mesh(geometry(new THREE.ConeGeometry(.65,2,8)),yellow);spire.position.set(pagodaX,9.5,pagodaZ);scene.add(spire);sign('雷峰塔',pagodaX,-65);
 const pagodaPath=box(3,.07,23,concrete,88,.06,-89);pagodaPath.name='pagoda-path';box(10,.07,3,concrete,83,.06,-79);
 const treeLeaf=[material('#4a8054'),material('#668d59'),material('#3d775f')],bark=material('#765d47');
 for(const [x,z] of [[-36,-34],[-42,-8],[-76,-36],[-83,-88],[-25,-89],[15,-79],[39,-80],[92,-88],[96,-126],[45,-135],[-15,-145]]){if(!treeHasClearance(x,z,2.8,buildingBounds))continue;trees.push({x,z,radius:2.8});box(.55,3.5,.55,bark,x,1.75,z);const crown=sphere(2.4,treeLeaf[Math.abs(x)%3],x,4,z);crown.scale.set(1,1.15,1);}
 // Instancing keeps hundreds of people and thousands of plants affordable.
 const dummy=new THREE.Object3D();let seed=84217;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function instances(geo,mat,count){const m=new THREE.InstancedMesh(geometry(geo),mat,count);m.castShadow=false;m.receiveShadow=false;scene.add(m);return m;}
 const grass=instances(new THREE.ConeGeometry(.13,.65,3),material('#4b8850'),1800);
 const clearArea=(x,z)=>Math.abs(x)<12||Math.abs(z+42)<10||Math.abs(z+100)<10||Math.abs(x+58)<13||(x>32&&z< -100)||buildingBounds.some(b=>x>b.minX-2&&x<b.maxX+2&&z>b.minZ-2&&z<b.maxZ+2)||Math.abs(z+82)<4&&x>-54&&x<-35||Math.abs(z+80)<4&&x>8&&x<20||Math.abs(z+126)<4&&x>8&&x<20;
 for(let i=0;i<1800;i++){let x,z;do{x=-105+random()*210;z=-150+random()*185;}while(clearArea(x,z));dummy.position.set(x,.27,z);dummy.rotation.set(0,random()*Math.PI,random()*.2);dummy.scale.setScalar(.6+random()*.8);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
 const stems=instances(new THREE.CylinderGeometry(.06,.09,.3,6),white,110),caps=instances(new THREE.SphereGeometry(.22,8,5,0,Math.PI*2,0,Math.PI/2),material('#c75d4f'),110);
 for(let i=0;i<110;i++){let x,z;do{x=-100+random()*200;z=-150+random()*180;}while(clearArea(x,z));dummy.rotation.set(0,0,0);dummy.scale.setScalar(.7+random()*.7);dummy.position.set(x,.15,z);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);dummy.position.y=.3;dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);}
 const skin=material('#d9a681'),hair=material('#38302b'),pants=material('#394b55');const shirts=['#db8b71','#78a5ae','#e6c477','#91aa83','#c1a0a0','#dfddd2'].map(c=>material(c));
 const bodyParts=[new THREE.CapsuleGeometry(.19,.42,3,6),new THREE.CapsuleGeometry(.075,.3,3,6).translate(-.28,-.08,0),new THREE.CapsuleGeometry(.075,.3,3,6).translate(.28,-.08,0)],bodyShape=mergeGeometries(bodyParts);bodyParts.forEach(g=>g.dispose());
 const legParts=[new THREE.BoxGeometry(.12,.5,.2).translate(-.08,0,0),new THREE.BoxGeometry(.12,.5,.2).translate(.08,0,0)],legShape=mergeGeometries(legParts);legParts.forEach(g=>g.dispose());
 const heads=instances(new THREE.SphereGeometry(.2,8,6),skin,PEDESTRIAN_COUNT),hairs=instances(new THREE.SphereGeometry(.205,8,6,0,Math.PI*2,0,Math.PI/2),hair,PEDESTRIAN_COUNT),bodies=shirts.map(mat=>instances(bodyShape,mat,PEDESTRIAN_COUNT)),legs=instances(legShape,pants,PEDESTRIAN_COUNT);
 const people=Array.from({length:PEDESTRIAN_COUNT},(_,i)=>{const row=i%6,along=random()*175-87;return {x:row<3?along:([-73.8,-70.5,11][row-3]+random()*2),z:row<3?([-51,-37,-109][row]+random()*2):-140+random()*165,phase:random()*Math.PI*2,axis:row<3?'x':'z',speed:.35+random()*.65,shirt:i%shirts.length};});
 function update(time){for(let i=0;i<people.length;i++){const p=people[i],offset=Math.sin(time*p.speed*.18+p.phase)*3,x=p.x+(p.axis==='x'?offset:0),z=p.z+(p.axis==='z'?offset:0),bob=Math.abs(Math.sin(time*p.speed*3+p.phase))*.035;dummy.rotation.set(0,p.axis==='x'?Math.PI/2:0,0);dummy.scale.setScalar(1);for(const [part,y] of [[heads,1.47],[hairs,1.54],[legs,.27]]){dummy.position.set(x,y+bob,z);dummy.updateMatrix();part.setMatrixAt(i,dummy.matrix);}for(let j=0;j<bodies.length;j++){dummy.position.set(x,j===p.shirt?.94+bob:-100,z);dummy.updateMatrix();bodies[j].setMatrixAt(i,dummy.matrix);}}
  for(const part of [heads,hairs,legs,...bodies])part.instanceMatrix.needsUpdate=true;
 }
 update(0);return {update,colliders,buildingBounds,trees};
}
