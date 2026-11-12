import * as THREE from 'three';

export const DEFAULT_VISUAL_MODS={lip:'stock',rearLip:'stock',wing:'stock',wingColor:'original',wingMaterial:'original',tires:'street',fan:'none',fenderColor:'body',headlightColor:'#e6fbff',windshieldColor:'#142730',lowering:0,camber:0};
export function visualMods(state){
 if(!state.visualModsByVehicle||typeof state.visualModsByVehicle!=='object'||Array.isArray(state.visualModsByVehicle))state.visualModsByVehicle={};
 const raw=state.visualModsByVehicle[state.vehicleModel]||{};
 const number=(v,max)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):0;
 const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
 return state.visualModsByVehicle[state.vehicleModel]={lip:['stock','sport'].includes(raw.lip)?raw.lip:'stock',rearLip:['stock','sport'].includes(raw.rearLip)?raw.rearLip:'stock',wing:['stock','fixed','active'].includes(raw.wing)?raw.wing:'stock',wingColor:color(raw.wingColor,'original'),wingMaterial:['original','gloss','matte','metal','carbon'].includes(raw.wingMaterial)?raw.wingMaterial:'original',tires:['street','race'].includes(raw.tires)?raw.tires:'street',fan:['none','race'].includes(raw.fan)?raw.fan:'none',fenderColor:color(raw.fenderColor,'body'),headlightColor:color(raw.headlightColor,DEFAULT_VISUAL_MODS.headlightColor),windshieldColor:color(raw.windshieldColor,DEFAULT_VISUAL_MODS.windshieldColor),lowering:number(raw.lowering,16),camber:number(raw.camber,8)};
}
const factoryMaterials=new WeakMap();
const carbonPixels=new Uint8Array(8*8*4);
for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=(y*8+x)*4,v=((x+y)%8<4?210:145)+(x%2===y%2?25:0);carbonPixels.set([v,v,v,255],i);}
const carbonTexture=new THREE.DataTexture(carbonPixels,8,8,THREE.RGBAFormat);
carbonTexture.wrapS=carbonTexture.wrapT=THREE.RepeatWrapping;carbonTexture.repeat.set(12,4);carbonTexture.colorSpace=THREE.SRGBColorSpace;carbonTexture.needsUpdate=true;
function styleWing(mesh,mods){
 let entry=factoryMaterials.get(mesh);
 if(!entry){entry={original:mesh.material,custom:mesh.material.clone()};factoryMaterials.set(mesh,entry);}
 const mat=entry.custom;mat.copy(entry.original);
 if(mods.wingColor&&mods.wingColor!=='original')mat.color.set(mods.wingColor);
 if(mods.wingMaterial==='gloss'){mat.metalness=.2;mat.roughness=.12;}
 if(mods.wingMaterial==='matte'){mat.metalness=.05;mat.roughness=.9;}
 if(mods.wingMaterial==='metal'){mat.metalness=1;mat.roughness=.22;}
 if(mods.wingMaterial==='carbon'){mat.metalness=.35;mat.roughness=.36;mat.map=carbonTexture;}
 mat.needsUpdate=true;mesh.material=mat;
}
export function activeWingTarget(speed){return speed*3.6>80?1:0;}

export function poseActiveWing(car,amount){
 const wing=car.getObjectByName('activeWing');if(!wing)return;
 const lift=THREE.MathUtils.clamp(amount,0,1)*.24;wing.userData.wingLift=lift/.24;
 wing.getObjectByName('activeWingBlade').position.y=lift+.0425;
 for(const support of wing.children.filter(child=>child.name==='activeWingSupport')){support.scale.y=lift+.01;support.position.y=(lift+.01)/2;}
}

export function rotateDownforceFans(car,angle){
 const fans=car.getObjectByName('downforceFans');if(!fans?.visible)return;
 fans.traverse(part=>{if(part.name==='rearFanRotor')part.rotation.z=angle;else if(part.name==='floorFanRotor')part.rotation.y=angle;});
}

function addWheelArch(parent,wheel,side,material,linerMaterial){
 const arch=new THREE.Group();arch.name=`wheelArch-${wheel.name}`;arch.position.set(wheel.position.x,wheel.position.y,wheel.position.z);parent.add(arch);
 const shape=new THREE.Shape(),segments=40,inner=.46,outer=.55;
 for(let i=0;i<=segments;i++){const a=i*Math.PI/segments,x=Math.cos(a)*outer,y=Math.sin(a)*outer;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}
 for(let i=segments;i>=0;i--){const a=i*Math.PI/segments;shape.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);}shape.closePath();
 const flare=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false,curveSegments:40}),material);flare.name='fenderFlare';flare.rotation.y=side*Math.PI/2;flare.position.x=-side*.10;flare.castShadow=true;arch.add(flare);
 const liner=new THREE.Mesh(new THREE.CircleGeometry(.55,40,0,Math.PI),linerMaterial);liner.name='wheelWellLiner';liner.rotation.y=Math.PI/2;liner.position.x=-side*.18;arch.add(liner);
 return arch;
}

// Attachments belong to one car and are cloned along with it for the race.
export function applyVisualMods(car,mods,bodyColor='#777777'){
 let root=car.getObjectByName('customParts');
 if(!root){
  root=new THREE.Group();root.name='customParts';car.add(root);
  const carbon=new THREE.MeshStandardMaterial({color:0x171b1d,metalness:.55,roughness:.35});
  const linerMaterial=new THREE.MeshStandardMaterial({color:0x202326,metalness:.12,roughness:.82,side:THREE.DoubleSide});
  const fenderMaterial=new THREE.MeshStandardMaterial({color:bodyColor,metalness:.35,roughness:.42,side:THREE.DoubleSide});
  const red=new THREE.MeshStandardMaterial({color:0xd52d2d,metalness:.5,roughness:.28});
  const accent=new THREE.MeshStandardMaterial({color:0xe6c34a,metalness:.15,roughness:.6});
  const slick=new THREE.MeshStandardMaterial({color:0x101214,metalness:.02,roughness:.9});
  const box=(parent,w,h,d,x,y,z,material=carbon)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  const lip=new THREE.Group();lip.name='customLip';root.add(lip);box(lip,2.05,.065,.42,0,.27,-2.38);for(const x of [-.91,.91])box(lip,.1,.11,.37,x,.31,-2.37);
  const rearLip=new THREE.Group();rearLip.name='customRearLip';root.add(rearLip);box(rearLip,1.96,.075,.38,0,.28,2.31);for(const x of [-.78,-.39,0,.39,.78])box(rearLip,.04,.14,.32,x,.23,2.33);
  const wing=new THREE.Group();wing.name='customWing';root.add(wing);for(const x of [-.65,.65])box(wing,.065,.37,.13,x,1.18,1.99);box(wing,2.15,.07,.43,0,1.39,2.02);for(const x of [-1.06,1.06])box(wing,.04,.18,.47,x,1.42,2.02);
  const active=new THREE.Group();active.name='activeWing';root.add(active);for(const x of [-.62,.62]){const support=box(active,.065,1,.12,x,0,0,red);support.name='activeWingSupport';}const blade=box(active,1.9,.065,.32,0,0,0,red);blade.name='activeWingBlade';active.position.set(0,(car.userData.wingDeckHeight??.96)+.005,2.05);poseActiveWing(car,0);
  if(car.getObjectByName('central-fin')){
   const deck=box(root,1.76,.16,.56,0,(car.userData.wingDeckHeight??.96)-.08,2.37,new THREE.MeshStandardMaterial({color:bodyColor,metalness:.5,roughness:.35}));deck.name='extendedWingDeck';
   wing.position.set(0,(car.userData.wingDeckHeight??.96)-.995,.42);active.position.z+=.42;
   const factory=car.getObjectByName('factoryWing');if(factory)factory.position.z+=.42;
  }
  const fanSystem=new THREE.Group();fanSystem.name='downforceFans';root.add(fanSystem);
  const steel=new THREE.MeshStandardMaterial({color:0x8d9c9d,metalness:.8,roughness:.35});
  box(fanSystem,1.65,.055,3.25,0,.25,.12);for(const x of [-.8,.8])box(fanSystem,.07,.14,3.25,x,.29,.12);
  box(fanSystem,1.34,.56,.13,0,.65,2.35);
  for(const x of [-.33,.33]){
   const duct=new THREE.Group();duct.position.set(x,.65,2.43);fanSystem.add(duct);
   const housing=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.10,40),carbon);housing.rotation.x=Math.PI/2;duct.add(housing);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,10,48),steel);ring.position.z=.06;duct.add(ring);
   const rotor=new THREE.Group();rotor.name='rearFanRotor';rotor.position.z=.065;duct.add(rotor);
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9,blade=box(rotor,.17,.075,.022,Math.cos(a)*.12,Math.sin(a)*.12,0,steel);blade.rotation.z=a+.75;}
   const hub=new THREE.Mesh(new THREE.SphereGeometry(.045,16,12),accent);rotor.add(hub);
   for(const y of [-.13,0,.13])box(duct,.38,.012,.012,0,y,.085,carbon);
  }
  for(const z of [-.85,.65]){
   const floor=new THREE.Group();floor.position.set(0,.205,z);fanSystem.add(floor);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.32,.035,8,40),steel);rim.rotation.x=Math.PI/2;floor.add(rim);
   const rotor=new THREE.Group();rotor.name='floorFanRotor';floor.add(rotor);
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7,blade=box(rotor,.24,.022,.07,Math.cos(a)*.16,0,Math.sin(a)*.16,steel);blade.rotation.y=-a+.3;}
  }
  for(const id of ['wheelFL','wheelFR','wheelRL','wheelRR']){const wheel=car.getObjectByName(id);if(!wheel)continue;wheel.userData.visualBaseY=wheel.position.y;wheel.userData.visualBaseScaleY=wheel.scale.y;wheel.rotation.order='YZX';const side=id.endsWith('L')?1:-1;addWheelArch(root,wheel,side,fenderMaterial,linerMaterial);const spin=new THREE.Group();spin.name='wheelSpin';while(wheel.children.length)spin.add(wheel.children[0]);wheel.add(spin);const tire=new THREE.Mesh(new THREE.TorusGeometry(.35,.11,16,64),slick);tire.name='raceTire';tire.rotation.y=Math.PI/2;tire.userData.originalMaterial=slick;spin.add(tire);const ring=new THREE.Mesh(new THREE.TorusGeometry(.37,.012,8,48),accent);ring.name='raceTireStripe';ring.rotation.y=Math.PI/2;ring.position.x=side*.115;ring.userData.originalMaterial=accent;spin.add(ring);}
 }
 root.getObjectByName('customLip').visible=mods.lip==='sport';root.getObjectByName('customRearLip').visible=mods.rearLip==='sport';root.getObjectByName('customWing').visible=mods.wing==='fixed';root.getObjectByName('activeWing').visible=mods.wing==='active';root.getObjectByName('downforceFans').visible=mods.fan==='race';
 const headlightColor=mods.headlightColor||DEFAULT_VISUAL_MODS.headlightColor,windshieldColor=mods.windshieldColor||DEFAULT_VISUAL_MODS.windshieldColor;car.userData.headlightColor=headlightColor;
 car.traverse(part=>{if(!part.isMesh)return;if(part.material?.userData.headlight){part.material.color.set(headlightColor);part.material.emissive.set(headlightColor);}if(part.userData.windshield)part.material.color.set(windshieldColor);});
 const factory=car.getObjectByName('factoryWing');if(factory)factory.visible=mods.wing==='stock';
 for(const wing of [factory,root.getObjectByName('customWing'),root.getObjectByName('activeWing')])wing?.traverse(part=>{if(part.isMesh)styleWing(part,mods);});
 const deck=root.getObjectByName('extendedWingDeck');if(deck)deck.material.color.set(bodyColor);
 const drop=mods.lowering/100;car.userData.visualLowering=drop;
 for(const id of ['wheelFL','wheelFR','wheelRL','wheelRR']){const wheel=car.getObjectByName(id);if(!wheel)continue;const lift=drop/car.scale.y;wheel.position.y=wheel.userData.visualBaseY+lift/2;wheel.scale.y=wheel.userData.visualBaseScaleY-lift/(2*.46);wheel.rotation.z=(id.endsWith('L')?1:-1)*mods.camber*Math.PI/180;wheel.getObjectByName('raceTire').visible=mods.tires==='race';wheel.getObjectByName('raceTireStripe').visible=mods.tires==='race';const arch=root.getObjectByName(`wheelArch-${id}`);arch.getObjectByName('fenderFlare').material.color.set(mods.fenderColor&&mods.fenderColor!=='body'?mods.fenderColor:bodyColor);}
}
export function disposeVisualMods(car){
 for(const name of ['factoryWing','customWing','activeWing'])car.getObjectByName(name)?.traverse(part=>{const entry=factoryMaterials.get(part);if(entry){part.material=entry.original;entry.custom.dispose();factoryMaterials.delete(part);}});
 const factory=car.getObjectByName('factoryWing');if(factory&&car.getObjectByName('extendedWingDeck'))factory.position.z-=.42;
 const objects=[car.getObjectByName('customParts'),...['wheelFL','wheelFR','wheelRL','wheelRR'].flatMap(id=>['raceTire','raceTireStripe'].map(name=>car.getObjectByName(id)?.getObjectByName(name)))];
 const geometries=new Set(),materials=new Set();for(const obj of objects){if(!obj)continue;obj.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});obj.removeFromParent();}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
