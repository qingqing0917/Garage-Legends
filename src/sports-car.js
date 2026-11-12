import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bodyFeatures} from './body-features.js';
import {vehicleDesign} from './vehicle-designs.js';
import {addVehicleTrim} from './vehicle-trim.js';

const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
// Named pivots also work on the independent car clone used by the race scene.
export function poseVehicleBody(car,doorAmount=0,roofAmount=0){
 const f=car.userData.bodyFeatures;if(!f)return;
 const d=THREE.MathUtils.clamp(doorAmount,0,1),r=f.convertible?THREE.MathUtils.clamp(roofAmount,0,1):0;
 for(const side of [-1,1]){
  const door=car.getObjectByName(`doorPivot${side}`);if(!door)continue;
  door.rotation.set(0,0,0);
  if(f.doors==='gullwing')door.rotation.z=side*d*1.82;
  else if(f.doors==='scissor')door.rotation.set(-d*1.30,0,side*d*.16);
  else if(f.doors==='butterfly')door.rotation.set(-d*.62,side*d*.70,side*d*1.02);
  else if(f.doors==='dihedral')door.rotation.set(-smooth((d-.2)/.8)*1.35,side*smooth(d/.65)*.90,side*d*.52);
  else door.rotation.y=side*d*1.12;
  const glass=car.getObjectByName(`doorGlass${side}`);
  if(glass){glass.position.y=glass.userData.closedY-r*.40;glass.visible=r<.98;glass.userData.bodyHidden=r>=.98;}
 }
 const roof=car.getObjectByName('roofAssembly');
 if(roof){
  const base=roof.userData.closedPosition||[0,1.31,.58+(car.userData.cabinShift||0)];
  roof.position.set(base[0],base[1]+Math.sin(Math.PI*r)*.22-r*.38,base[2]+r*.96);
  roof.rotation.x=r*.26;roof.scale.y=1-r*.34;roof.visible=r<.995;
  const front=car.getObjectByName('foldingRoofFront');if(front)front.rotation.x=Math.PI*smooth(r/.8);
 }
 const hoops=car.getObjectByName('rollHoops');if(hoops)hoops.visible=f.convertible&&r>.35;
 car.userData.roofOpen=r>=.995;car.userData.doorsOpen=d>.001;
 car.updateMatrixWorld(true);
}

// A separate, paintable sports body; it uses the same service points as the classic car.
export function createSportsCar({createPanel,mechanics,model={id:'aero',name:'AERO S1',design:{body:'sport',wing:true}}}){
 const design=model.design?.identity?model.design:vehicleDesign({...model,brand:model.brand||'EMBER',featured:-1,design:model.design||{body:'sport'}}),body=design.body||'sport',features=model.features||bodyFeatures(model),cabinShift=design.cabinShift||0;
 const car=new THREE.Group();car.name=model.name;car.userData.model=model.id;car.userData.cockpitHeight=(design.roof.height-.18)*(design.height||1);car.userData.designIdentity=design.identity;car.userData.designLabel=design.label;
 car.userData.bodyFeatures={...features};car.userData.cabinShift=cabinShift;
 const ownedGeometries=new Set(),ownedMaterials=new Set();

 const parts={},panelMaterials={};
 const material=(color,roughness=.4,metalness=.55)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});ownedMaterials.add(m);return m;};
 const carbon=material('#15191d',.42,.3),rubber=material('#111315',.8,.05),alloy=material('#333c44',.27,.9),silver=material('#b7bec4',.24,.85),red=material('#b6231d',.36,.5);
 const lamp=new THREE.MeshStandardMaterial({color:'#e6fbff',emissive:'#c6f4ff',emissiveIntensity:2,roughness:.18});
 lamp.userData.headlight=true;
 const tail=new THREE.MeshStandardMaterial({color:'#fb3426',emissive:'#ed1a0a',emissiveIntensity:1.6});
 const glass=new THREE.MeshPhysicalMaterial({color:'#142730',roughness:.13,metalness:.18,clearcoat:1,transparent:true,opacity:.88,side:THREE.DoubleSide});
 for(const mat of [lamp,tail,glass])ownedMaterials.add(mat);
 function mesh(geo,mat,parent=car){ownedGeometries.add(geo);const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,mat,x,y,z,parent=car,r=.015){const m=mesh(new RoundedBoxGeometry(w,h,d,2,r),mat,parent);m.position.set(x,y,z);return m;}
 function tube(points,r,mat,parent=car){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),mat,parent);}
 function grid(fn,columns=40,rows=12,minU=0,maxU=1){
  const positions=[],uv=[],indices=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const u=minU+(maxU-minU)*i/columns,v=j/rows;positions.push(...fn(u,v));uv.push(u,v);}
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function panel(id,geometry,parent=car){ownedGeometries.add(geometry);const m=createPanel(id,geometry,parent);m.material.clearcoat=1;m.material.clearcoatRoughness=.15;panelMaterials[id]=m.material;return m;}
 function surface(id,fn,parent=car){return panel(id,grid(fn),parent);}
 function sharedPanel(id,geometry,mat,parent=car){const m=mesh(geometry,mat,parent);m.userData.panel=id;return m;}
 function window(points,parent=car){const m=mesh(grid((u,v)=>{const a=new THREE.Vector3(...points[0]).lerp(new THREE.Vector3(...points[1]),u),b=new THREE.Vector3(...points[3]).lerp(new THREE.Vector3(...points[2]),u);return a.lerp(b,v).toArray();},12,6),glass,parent);m.userData.window=true;return m;}
 function pivot(group,position){for(const child of group.children)child.position.sub(position);group.position.copy(position);}
 const profiles={
  wedge:[[-2.34,.88,.64],[-2.02,1.02,.78],[-1.43,1.07,.98],[-.65,.95,.91],[.4,.96,.88],[1.43,1.10,1.01],[2.05,1.04,.96],[2.32,.97,.88]],
  gt:[[-2.34,.81,.76],[-2.02,.96,.91],[-1.43,1.035,1.04],[-.65,.97,.94],[.4,.98,.94],[1.43,1.04,1.02],[2.05,.98,.90],[2.32,.91,.81]],
  round:[[-2.34,.76,.77],[-2.02,.91,.92],[-1.43,1.015,1.06],[-.65,.94,.93],[.4,.97,.95],[1.43,1.10,1.09],[2.05,1.01,1.0],[2.32,.87,.88]],
  classic:[[-2.34,.73,.79],[-2.02,.89,.92],[-1.43,.99,1.04],[-.65,.92,.94],[.4,.91,.92],[1.43,.99,1.05],[2.05,.90,.91],[2.32,.76,.78]],
  muscle:[[-2.34,.94,.89],[-2.02,1.04,.98],[-1.43,1.08,1.09],[-.65,1.02,1.0],[.4,1.02,1.0],[1.43,1.09,1.10],[2.05,1.06,1.03],[2.32,1.01,.95]],
  prototype:[[-2.34,.94,.64],[-2.02,1.10,.78],[-1.43,1.10,1.02],[-.65,1.0,.89],[.4,1.0,.86],[1.43,1.12,1.02],[2.05,1.09,.86],[2.32,1.02,.74]]
 };
 const profile=design.profile||profiles[body]||[[-2.34,.84,.70],[-2.02,.99,.85],[-1.43,1.045,1.015],[-.65,.98,.93],[.40,.99,.91],[1.43,1.075,1.025],[2.05,1.025,.93],[2.32,.95,.82]];
 function at(z){let k=1;while(k<profile.length-1&&z>profile[k][0])k++;const a=profile[k-1],b=profile[k],t=body==='wedge'?THREE.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1):THREE.MathUtils.smoothstep(z,a[0],b[0]);return {w:THREE.MathUtils.lerp(a[1],b[1],t),y:THREE.MathUtils.lerp(a[2],b[2],t)};}
 // Match the spoiler to the highest point of the rear deck beneath its footprint.
 car.userData.wingDeckHeight=Math.max(...[1.89,2.05,2.21].flatMap(z=>{const p=at(z),v=THREE.MathUtils.clamp((z-1.12-cabinShift)/(1.20-cabinShift),0,1),center=THREE.MathUtils.lerp(design.deck||.94,profile.at(-1)[2],v)+.035*Math.sin(v*Math.PI),edge=center+(.65/p.w)**2*(p.y-THREE.MathUtils.lerp(design.deck||.94,profile.at(-1)[2],v));return [center,edge];}));
 box(1.72,.13,3.92,carbon,0,.31,0);
 const doors=new Map();
 for(const side of[-1,1]){
  const door=new THREE.Group();door.name=`doorPivot${side}`;doors.set(side,door);car.add(door);
  const id=side===1?'left':'right',start=(-.64+cabinShift+2.34)/4.66,end=(.73+cabinShift+2.34)/4.66;
  const arch=design.offroadTires?.50:.46;
  const sideSurface=(u,v)=>{
   const z=-2.34+u*4.66,p=at(z),d=Math.min(Math.abs(z-1.43),Math.abs(z+1.43));
   const bottom=d<arch?.43+Math.sqrt(arch**2-d**2):.32;
   if(v<.8)return [side*(p.w-.018*Math.sin(v/.8*Math.PI)),THREE.MathUtils.lerp(bottom,p.y,v/.8),z];
   const t=(v-.8)/.2;return [side*THREE.MathUtils.lerp(p.w,p.w-.19,t),p.y-.04*t,z];
  };
  // Cut the door aperture out of the body, retaining the original continuous paint UVs.
  const fixed=panel(id,grid(sideSurface,18,12,0,start));
  sharedPanel(id,grid(sideSurface,18,12,end,1),fixed.material);
  sharedPanel(id,grid(sideSurface,18,12,start,end),fixed.material,door);
  const doorWidth=Math.min(...Array.from({length:17},(_,i)=>at(-.64+cabinShift+i*1.37/16).w));
  box(.045,.39,1.22,carbon,side*(doorWidth-.075),.62,.045+cabinShift,door,.03);
  box(.065,.055,.38,silver,side*(doorWidth-.12),.75,.18+cabinShift,door,.015);
  // Rocker blades, recessed door seams, flush handles and cooling scoops.
  box(.10,.09,1.88,carbon,side*1.0,.32,0,car,.025);
  tube([[.92,-.64],[.40,-.64],[.38,.73],[.92,.73]].map(([y,z])=>[side*(at(z+cabinShift).w+.004),y,z+cabinShift]),.007,carbon,door);
  box(.022,.025,.17,carbon,side*(at(.46+cabinShift).w+.012),.84,.46+cabinShift,door);
  if(design.mirror!=='stalk'){tube([[side*.77,.99,-.52+cabinShift],[side*.98,1.03,-.55+cabinShift],[side*1.10,1.04,-.51+cabinShift]],.022,carbon,door);
  box(.18,.075,.24,carbon,side*1.12,1.05,-.53+cabinShift,door,.03);
  box(.012,.052,.16,silver,side*1.205,1.055,-.50+cabinShift,door);}
 }
 const hood=new THREE.Group();hood.name='hoodPivot';hood.position.set(0,.91,-.62+cabinShift);car.add(hood);
 surface('hood',(u,v)=>{
  const z=THREE.MathUtils.lerp(-2.34,-.62+cabinShift,v),x=(u*2-1),p=at(z);
  const middle=THREE.MathUtils.lerp(profile[0][2],.925,v)+(design.hoodArch??.025)*Math.sin(v*Math.PI);
  const y=THREE.MathUtils.lerp(middle,p.y,Math.abs(x)**2);
  return [x*p.w,y-.91,z+.62-cabinShift];
 },hood);
 const rearHatch=design.identity==='mclaren'?new THREE.Group():null;
 if(rearHatch){rearHatch.name='engineHatch';rearHatch.position.set(0,.94,1.12+cabinShift);car.add(rearHatch);car.userData.engineLocation=[0,.91,1.58];}
 surface('trunk',(u,v)=>{const z=1.12+cabinShift+v*(1.20-cabinShift),p=at(z),x=u*2-1,y=THREE.MathUtils.lerp(design.deck||.94,profile.at(-1)[2],v)+.035*Math.sin(v*Math.PI)+Math.abs(x)**2*(p.y-THREE.MathUtils.lerp(design.deck||.94,profile.at(-1)[2],v));return rearHatch?[x*p.w,y-.94,z-1.12-cabinShift]:[x*p.w,y,z];},rearHatch||car);
 surface('front',(u,v)=>{const x=u*2-1;return [x*profile[0][1],.32+v*(profile[0][2]-.32+.02*Math.abs(x)),-2.34-.05*(1-x*x)*Math.sin(v*Math.PI)];});
 surface('rear',(u,v)=>[(u*2-1)*profile.at(-1)[1],.32+v*(profile.at(-1)[2]-.32),2.32+.015*Math.sin(u*Math.PI)]);
 const shape=design.roof;
 function cp([x,y,z]){const t=THREE.MathUtils.clamp((y-.94)/.37,0,1),frontRoofRear=shape.rear-(design.extraWindows?.48:0),topZ=shape.front+(z+.05)/.63*(frontRoofRear-shape.front),baseZ=z<0?z:z/1.13*shape.back;return [x*THREE.MathUtils.lerp(1,shape.width/.65,t),.94+(y-.94)*(shape.height-.94)/.37,THREE.MathUtils.lerp(baseZ,topZ,t)];}
 const world=point=>{const p=cp(point);p[2]+=cabinShift;return p;};
 const rearTop=side=>[side*shape.width,shape.height,shape.rear+cabinShift];
 const cabin=new THREE.Group();cabin.position.z=cabinShift;car.add(cabin);
 const roof=new THREE.Group();roof.name='roofAssembly';car.add(roof);
 const roofSurface=(u,v)=>[(u*2-1)*(shape.width+.012*Math.sin(v*Math.PI)),shape.height+shape.arch*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)+(design.bubbleRoof?.022*Math.sin(u*2*Math.PI)**2*Math.sin(v*Math.PI):0),shape.front+v*(shape.rear-shape.front)+cabinShift];
 if(features.doors==='gullwing'){
  // The roof edges belong to the gullwing doors; only the center spine stays fixed.
  const center=panel('roof',grid(roofSurface,10,12,.33,.67),roof);
  for(const side of[-1,1])sharedPanel('roof',grid(roofSurface,12,12,side===1?.67:0,side===1?1:.33),center.material,doors.get(side));
 }else if(features.convertible){
  const front=new THREE.Group();front.name='foldingRoofFront';roof.add(front);
  const rear=panel('roof',grid(roofSurface,32,6,0,1),roof);
  // Split front/rear along V without changing the texture coordinates used for painting.
  function roofSection(from,to){const geo=grid((u,v)=>roofSurface(u,from+(to-from)*v),32,6);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,from+(to-from)*uv.getY(i));return geo;}
  ownedGeometries.delete(rear.geometry);rear.geometry.dispose();rear.geometry=roofSection(.52,1);ownedGeometries.add(rear.geometry);
  sharedPanel('roof',roofSection(0,.52),rear.material,front);
  pivot(front,new THREE.Vector3(0,shape.height,shape.front+.52*(shape.rear-shape.front)+cabinShift));
 }else surface('roof',roofSurface,roof);
 const windshield=window([[-.80,.94,-.64],[.80,.94,-.64],[.65,1.31,-.05],[-.65,1.31,-.05]].map(cp),cabin);windshield.material=glass.clone();ownedMaterials.add(windshield.material);windshield.userData.windshield=true;
 window(design.extraWindows?[rearTop(1),rearTop(-1),world([-.83,.95,1.13]),world([.83,.95,1.13])]:[[.65,1.31,.58],[-.65,1.31,.58],[-.83,.95,1.13],[.83,.95,1.13]].map(world),roof);
 if(design.extraWindows)for(const side of[-1,1]){
  const z1=.72+cabinShift,z2=shape.back+cabinShift-.06;
  window([[side*(at(z1).w-.12),at(z1).y+.015,z1],[side*(shape.width-.01),shape.height-.035,shape.rear+cabinShift-.46],[side*(shape.width-.01),shape.height-.035,shape.rear+cabinShift-.035],[side*(at(z2).w-.12),at(z2).y+.015,z2]],car);
  const rearDoorZ=1.48+cabinShift;
  tube([[.40,.73],[.38,1.40],[.82,1.48],[at(rearDoorZ).y,1.48]].map(([y,z])=>[side*(at(z+cabinShift).w+.008),y,z+cabinShift]),.009,carbon,car);
  box(.025,.025,.16,carbon,side*(at(1.12+cabinShift).w+.02),.88,1.12+cabinShift,car);
 }
 for(const side of[-1,1]){
  const door=doors.get(side),points=[[side*.81,.945,-.60],[side*.63,1.28,-.025],[side*.64,1.29,.56],[side*.91,.95,.73]].map(world);
  const pane=window(points,door);pane.name=`doorGlass${side}`;
  tube([[side*.81,.94,-.64],[side*.65,1.31,-.05]].map(cp),.021,carbon,cabin);
  tube(design.extraWindows?[rearTop(side),world([side*.85,.95,1.13])]:[[side*.65,1.31,.58],[side*.85,.95,1.13]].map(world),.024,carbon,roof);
  tube([[side*.81,.94,-.64+cabinShift],[side*.91,.935,.73+cabinShift]],.015,carbon,door);
  if(!features.convertible)tube([[side*.64,1.30,-.025],[side*.65,1.31,.56],[side*.91,.95,.73]].map(world),.015,carbon,door);
 }
 tube([[-.65,1.31,-.05],[0,1.31,-.05],[.65,1.31,-.05]].map(cp),.018,carbon,cabin);
 tube(design.extraWindows?[rearTop(-1),rearTop(0),rearTop(1)]:[[-.65,1.31,.58],[0,1.31,.58],[.65,1.31,.58]].map(world),.014,carbon,roof);
 const hoops=new THREE.Group();hoops.name='rollHoops';cabin.add(hoops);
 for(const side of[-1,1])tube([[side*.18,.89,.55],[side*.20,1.13,.55],[side*.53,1.13,.55],[side*.55,.89,.55]],.028,silver,hoops);
 const leather=material(design.interior,.82,.05);
 // Visible cockpit and inner door panels make the open doors reveal a real aperture.
 box(1.46,.15,.32,carbon,0,.85,-.47,cabin,.04);
 box(1.7,.07,1.65,carbon,0,.37,.10,cabin,.02);
 box(.18,.21,.80,carbon,0,.51,.03,cabin,.025);
 for(const x of[-.36,.36]){box(.48,.10,.52,leather,x,.51,.15,cabin,.05);const seat=box(.48,.48,.13,leather,x,.76,.45,cabin,.05);seat.rotation.x=-.14;box(.24,.15,.10,leather,x,1.06,.50,cabin,.03);box(.07,.34,.14,red,x-.18,.77,.43,cabin);}
 const steering=mesh(new THREE.TorusGeometry(.135,.018,10,32),alloy,cabin);steering.position.set(.36,.94,-.24);steering.rotation.x=-.35;
 for(const [side,door] of doors){
  const hinge=features.doors==='gullwing'?new THREE.Vector3(...world([side*.21,1.31,.28])):new THREE.Vector3(side*.94,.91,-.64+cabinShift);
  pivot(door,hinge);const pane=door.getObjectByName(`doorGlass${side}`);pane.userData.closedY=pane.position.y;
 }
 pivot(roof,new THREE.Vector3(0,shape.height,shape.rear+cabinShift));roof.userData.closedPosition=roof.position.toArray();
 addVehicleTrim({car,design,profile,at,hood,rearHatch,doors,mesh,box,tube,grid,material,paint:panelMaterials.hood,carbon,silver,alloy,lamp,tail});
 function register(id,group){group.name=id;group.userData.part=id;group.traverse(m=>{if(m.isMesh){m.userData.part=id;m.userData.originalMaterial=m.material;}});parts[id]=group;car.add(group);}
 function fitUnderHood(group){
  // Service parts share their original geometry, but must fit each car's lower nose.
  group.updateMatrixWorld(true);let shift=0;const point=new THREE.Vector3();
  group.traverse(m=>{if(!m.isMesh)return;const positions=m.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(m.matrixWorld);
    if(point.z< -2.34||point.z>-.62+cabinShift)continue;
    const p=at(point.z),v=(point.z+2.34)/(1.72+cabinShift),middle=THREE.MathUtils.lerp(profile[0][2],.925,v)+(design.hoodArch??.025)*Math.sin(v*Math.PI);
    const ceiling=THREE.MathUtils.lerp(middle,p.y,Math.abs(point.x/p.w)**2);
    shift=Math.min(shift,ceiling-.045-point.y);
   }
  });
  group.position.y+=shift;
 }
 function engineVariant(){
  const text=`${model.brand||''} ${model.name||''} ${model.styles||''}`;
  if(/electric|battery|Tesla|\bEV\b|\bi[3457x]\b/i.test(text))return 'electric';
  if(/McLaren|Ferrari|Lamborghini|Corvette|AMG|Mustang|Koenigsegg|Pagani/i.test(text))return 'v8';
  return 'inline';
 }
 function buildPowertrain(type){
  const group=new THREE.Group();group.position.set(0,.66,-1.30);group.name=`powertrain-${type}`;
  if(type==='electric'){
   box(.62,.22,.58,alloy,0,0,0,group,.05);box(.54,.10,.53,carbon,0,.16,0,group,.035);
   for(const x of[-.22,.22])tube([[x,.12,-.25],[x,.25,-.34],[x,.19,-.44]],.028,red,group);
   box(.23,.025,.18,silver,0,.225,0,group,.01);
  }else{
   box(.58,.24,.68,alloy,0,-.015,0,group,.04);
   for(const side of[-1,1]){const bank=box(.25,.15,.65,carbon,side*.18,.17,0,group,.025);bank.rotation.z=side*.22;
    for(let i=0;i<4;i++){box(.23,.018,.032,silver,side*.18,.265,-.22+i*.145,group,.004);tube([[side*.24,.06,-.22+i*.145],[side*.38,.02,-.22+i*.145],[side*.39,-.12,-.22+i*.145]],.023,silver,group);}
   }
   box(.20,.06,.56,red,0,.25,0,group,.02);
  }
  return group;
 }
 for(const id of['engine','gearbox','battery','radiator']){
  const type=engineVariant(),group=id==='engine'&&type!=='inline'?buildPowertrain(type):mechanics[id].clone(true),sourceMeshes=[];
  if(id!=='engine'||type==='inline'){mechanics[id].traverse(m=>{if(m.isMesh)sourceMeshes.push(m);});let index=0;group.traverse(m=>{if(m.isMesh){const source=sourceMeshes[index++];m.material=source.userData.originalMaterial||source.material;}});}
  group.scale.y=.78;group.position.y-=.11;
  if(id==='engine'&&rearHatch)group.position.z=1.58;else fitUnderHood(group);
  register(id,group);
 }
 for(const [id,side,z] of[['wheelFL',1,-1.43],['wheelFR',-1,-1.43],['wheelRL',1,1.43],['wheelRR',-1,1.43]]){
  const g=new THREE.Group();g.position.set(side*(at(z).w-.035),.43,z);
  const tire=mesh(new THREE.TorusGeometry(design.offroadTires?.35:.335,design.offroadTires?.12:.092,20,64),rubber,g);tire.rotation.y=Math.PI/2;
  if(design.offroadTires)for(let i=0;i<16;i++){const a=i*Math.PI/8,tread=box(.27,.055,.085,carbon,0,Math.sin(a)*.462,Math.cos(a)*.462,g,.006);tread.rotation.x=-a;}
  const rim=mesh(new THREE.CylinderGeometry(.322,.322,.21,48),alloy,g);rim.rotation.z=Math.PI/2;
  const face=mesh(new THREE.CylinderGeometry(.288,.288,.224,48),carbon,g);face.rotation.z=Math.PI/2;
  const disc=mesh(new THREE.CylinderGeometry(.235,.235,.10,48),silver,g);disc.rotation.z=Math.PI/2;
  box(.12,.20,.075,red,side*.07,.02,-.19,g);
  const spokeCount=design.spokes||7,split=design.rim==='split',rimMat=design.rim==='carbon'?carbon:silver;
  for(let i=0;i<spokeCount;i++)for(const offset of(split?[-.07,.07]:[0])){
   const angle=i*Math.PI*2/spokeCount+offset,wide=design.rim==='carbon'?.11:design.rim==='mesh'?.021:.055;
   const spoke=box(.032,wide,.29,rimMat,side*.13,Math.sin(angle)*.145,Math.cos(angle)*.145,g,.005);spoke.rotation.x=-angle+(design.rim==='carbon'?.22:0);
  }
  const lip=mesh(new THREE.TorusGeometry(.294,design.rim==='mesh'?.014:.008,8,48),silver,g);lip.rotation.y=Math.PI/2;lip.position.x=side*.129;
  const hub=mesh(new THREE.CylinderGeometry(.064,.064,.26,24),alloy,g);hub.rotation.z=Math.PI/2;
  register(id,g);
 }
 car.userData.wheelTrack={front:at(-1.43).w-.035,rear:at(1.43).w-.035};
 car.scale.set(design.width||1,design.height||1,design.length||1);
 poseVehicleBody(car,0,features.defaultRoofOpen?1:0);
 return {car,parts,hood,lamp,dispose(){for(const g of ownedGeometries)g.dispose();for(const m of ownedMaterials)m.dispose();}};
}
