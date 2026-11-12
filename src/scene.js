import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PARTS, PANELS, vehicleInfo,roofIsOpen } from './game.js';
import {createSportsCar,poseVehicleBody} from './sports-car.js';
import {visualMods,applyVisualMods,disposeVisualMods,poseActiveWing,rotateDownforceFans} from './visual-mods.js';

const panelNames={hood:'引擎盖',trunk:'后备厢',left:'左侧车身',right:'右侧车身',roof:'车顶',front:'前围',rear:'后围'};
const metal=(color,roughness=.5,metalness=.6)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function random(seed){let v=seed;return ()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};}
function noiseTexture(color1,color2,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),r=random(52),a=new THREE.Color(color1),b=new THREE.Color(color2),im=x.createImageData(size,size);
 for(let i=0;i<im.data.length;i+=4){let n=r();im.data[i]=(a.r+(b.r-a.r)*n)*255;im.data[i+1]=(a.g+(b.g-a.g)*n)*255;im.data[i+2]=(a.b+(b.b-a.b)*n)*255;im.data[i+3]=255;}x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function quad(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;}
function labelTexture(text,width=512,height=128,bg='#263032',fg='#b8bab1'){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,width,height);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font=`600 ${height*.40}px Arial`;x.fillText(text,width/2,height/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createGarage(container,{onSelect,onBrush,onHover,onMessage}){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#1b2225');scene.fog=new THREE.FogExp2('#20282b',.025);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','交互式三维修复车库');
 const camera=new THREE.PerspectiveCamera(36,1,.1,75);camera.position.set(6.2,3.45,-6.6);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.85,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=3.3;controls.maxDistance=13;controls.minPolarAngle=.025;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=false;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
 const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.05).texture;env.dispose();pmrem.dispose();scene.environmentIntensity=.48;
 scene.add(new THREE.HemisphereLight('#cbdde0','#4b4035',1.2));
 const key=new THREE.DirectionalLight('#fff0d7',3.3);key.position.set(3,7,-3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.0005;key.shadow.normalBias=.025;scene.add(key);
 const cool=new THREE.RectAreaLight('#8dbbcc',7,5,3);cool.position.set(-4,3,0);cool.lookAt(0,1,0);scene.add(cool);
 const warm=new THREE.PointLight('#ffbd73',28,9,2);warm.position.set(3.7,2.6,2.6);scene.add(warm);
 const soft=new THREE.DirectionalLight('#c6dfea',1.2);soft.position.set(-3,3,5);scene.add(soft);
 const materials={black:metal('#171b1d',.8,.25),rubber:metal('#141617',.92,.05),chrome:metal('#a0a8a9',.25,.95),steel:metal('#60686b',.55,.8),dark:metal('#293338',.6,.7),orange:metal('#c47832',.6,.3),red:metal('#70362b',.55,.65)};
 function box(w,h,d,mat,x=0,y=0,z=0,parent=scene,round=0){const g=round?new RoundedBoxGeometry(w,h,d,2,round):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cylinder(r1,r2,h,mat,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,32),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function pipe(points,r,mat,parent=scene){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,8,false),mat);m.castShadow=true;parent.add(m);return m;}
 // A physically lit workshop, modelled locally: concrete, workbench, cabinets and service equipment.
 const concrete=metal('#727a78',.96,.02);concrete.map=noiseTexture('#424847','#555d5a');concrete.map.repeat.set(12,12);
 box(24,.12,24,concrete,0,-.08,0);const wall=metal('#58605d',.97,.05);wall.map=noiseTexture('#3a4140','#4f5755');wall.map.repeat.set(6,3);
 box(20,7,.18,wall,0,3.4,5.8);box(.18,7,18,wall,-7,3.4,0);
 box(20,1,.21,metal('#293b3c',.8,.12),0,.5,5.67);
 for(let i=-6;i<7;i+=2.4){box(.08,5,.2,materials.dark,i,2.5,5.6);}
 const floorMark=metal('#bd9b58',.85,.1);
 for(const x of [-1.7,1.7])box(.055,.008,6,floorMark,x,-.014,0);
 for(const z of [-3,3])box(3.45,.008,.055,floorMark,0,-.014,z);
 const platform=box(3.05,.045,5.65,metal('#363c3d',.9,.25),0,-.005,0);platform.receiveShadow=true;
 for(let i=-2;i<=2;i++){box(2.9,.006,.012,materials.black,0,.02,i);}
 const stands=new THREE.Group();stands.name='assemblyStands';scene.add(stands);stands.visible=false;
 for(const x of[-.65,.65])for(const z of[-1.15,1.15]){
  box(.38,.06,.40,materials.black,x,.055,z,stands,.015);
  box(.19,.25,.20,materials.orange,x,.20,z,stands,.015);
  box(.35,.05,.28,materials.steel,x,.35,z,stands,.01);
 }
 // Back workbench.
 box(4.8,.16,.85,metal('#6b6250',.75,.05),-.3,1.05,4.8);
 for(const x of [-2.4,1.8])box(.12,1,.6,materials.dark,x,.5,4.8);
 box(4.5,.08,.65,materials.steel,-.3,.34,4.8);
 box(3.6,1.65,.07,metal('#293030',.8,.3),-.2,2.22,5.65);
 for(let x=-1.8;x<1.6;x+=.14)for(let y=1.6;y<2.9;y+=.14){const dot=cylinder(.011,.011,.015,materials.black,x,y,5.6);dot.rotation.x=Math.PI/2;}
 for(let i=0;i<8;i++){
   const x=-1.45+i*.38;const h=.3+(i%3)*.07;
   box(.035,h,.025,materials.chrome,x,2.35-h/2,5.54);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,6,18),materials.chrome);ring.position.set(x,2.35,5.54);scene.add(ring);
 }
 box(.45,.1,.24,materials.red,1.2,1.2,4.8,scene,.04);
 // Rolling tool cabinet.
 const cabinet=new THREE.Group();cabinet.position.set(3.1,0,3.8);cabinet.rotation.y=-.15;scene.add(cabinet);
 box(1.4,1.04,.72,materials.red,0,.65,0,cabinet,.045);box(1.48,.09,.78,materials.black,0,1.21,0,cabinet,.02);
 for(let y=.28;y<1.1;y+=.17){box(1.25,.14,.03,metal('#8b4334',.5,.7),0,y,-.37,cabinet,.01);box(.92,.025,.05,materials.chrome,0,y+.035,-.4,cabinet);}
 for(const x of [-.5,.5])for(const z of [-.22,.22]){const wheel=cylinder(.105,.105,.08,materials.rubber,x,.11,z,cabinet);wheel.rotation.z=Math.PI/2;}
 for(let i=0;i<4;i++){const can=cylinder(.07,.07,.22,metal(['#a89462','#5b737b','#a05a3e','#d7cbb0'][i],.5,.4),-.9+i*.25,1.24,4.6);box(.035,.03,.04,materials.black,can.position.x,1.37,4.6);}
 // Roller door on left wall.
 box(.04,3.2,4.6,metal('#454f50',.75,.6),-6.85,1.6,-1.8);
 for(let i=0;i<15;i++)box(.06,.025,4.65,materials.dark,-6.8,.15+i*.21,-1.8);
 for(const z of [-4.2,.6])box(.2,3.6,.16,materials.steel,-6.7,1.8,z);
 // Wall signs and overhead fixtures.
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.75),new THREE.MeshStandardMaterial({map:labelTexture('EMBER / MOTOR WORKS',1024,160),roughness:.9}));sign.position.set(-.3,3.65,5.67);scene.add(sign);
 const bay=new THREE.Mesh(new THREE.PlaneGeometry(.7,.75),new THREE.MeshStandardMaterial({map:labelTexture('01',256,256,'#b1864e','#222a2c')}));bay.position.set(-3.6,2.45,5.67);scene.add(bay);
 for(const x of [-2.3,2.3]){box(.18,.12,4.2,materials.dark,x,4.8,.2);box(.105,.035,3.9,new THREE.MeshStandardMaterial({color:'#f2e5cb',emissive:'#fff4df',emissiveIntensity:4}),x,4.71,.2);}
 for(let i=0;i<3;i++){const tire=new THREE.Mesh(new THREE.TorusGeometry(.36,.12,12,32),materials.rubber);tire.rotation.x=Math.PI/2;tire.position.set(-3.9,.16+i*.24,4.7);tire.castShadow=true;scene.add(tire);}
 box(.9,.11,.6,materials.dark,3.3,.15,-1.7,scene,.035);pipe([[3.3,.2,-1.6],[3.3,.25,-.8],[3.3,1.0,-.4]],.035,materials.orange);
 // Vehicle body. No remote models or images are needed.
 const workshopObjects=scene.children.filter(o=>o.position.z>4||o.position.x< -6);
 let car=new THREE.Group();car.name='R-86';car.userData.cockpitHeight=1.39;scene.add(car);
 let bodyPanels={},partGroups={};
 let paused=false;let currentState=null,currentTool='inspect',selected='engine',hovered=null,hoodOpen=false,isPainting=false,lastBrush=0,running=false;
 const canvasSize=256;
 function noise2(x,y){
  const hash=(a,b)=>{const q=Math.sin(a*127.1+b*311.7+73.4)*43758.5453;return q-Math.floor(q);};
  const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
  return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
 }
 function baseSurface(id,type,color){
  const c=document.createElement('canvas');c.width=c.height=canvasSize;const ctx=c.getContext('2d'),rand=random(id.length*19+type.length*101),im=ctx.createImageData(canvasSize,canvasSize);
  const base=new THREE.Color(color||({old:'#4b6871',rust:'#6a6b62',sand:'#a0a49e'}[type]));
  const rgb=[parseInt(base.getHexString().slice(0,2),16),parseInt(base.getHexString().slice(2,4),16),parseInt(base.getHexString().slice(4,6),16)];
  for(let y=0;y<canvasSize;y++)for(let x=0;x<canvasSize;x++){
    const i=(y*canvasSize+x)*4,n=(rand()-.5)*(type==='paint'?5:20);
    const corrosion=noise2(x*.03,y*.03)*.5+noise2(x*.09,y*.09)*.27+noise2(x*.22,y*.22)*.15+rand()*.08;let rust=type==='old'&&corrosion>.50;
    const rcol=corrosion>.60?[87,46,29]:[132,78,43];for(let k=0;k<3;k++)im.data[i+k]=(rust?rcol[k]:rgb[k])+n;im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);
  if(type!=='paint')for(let i=0;i<100;i++){ctx.strokeStyle=type==='old'?'rgba(22,28,29,.14)':'rgba(255,255,255,.11)';ctx.lineWidth=.5;const x=rand()*256,y=rand()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*55,y+rand()*2);ctx.stroke();}
  return c;
 }
 function createPanel(id,geometry,parent=car){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=canvasSize;const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const mat=new THREE.MeshPhysicalMaterial({map:texture,metalness:.65,roughness:.74,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.panel=id;parent.add(mesh);
  bodyPanels[id]={mesh,canvas,ctx,texture,mat,layers:{old:baseSurface(id,'old'),rust:baseSurface(id,'rust'),sand:baseSurface(id,'sand')},color:null};
  return mesh;
 }
 function paintPanel(id,panel,color){
  const b=bodyPanels[id],ctx=b.ctx;ctx.clearRect(0,0,256,256);ctx.drawImage(b.layers.old,0,0);
  if(b.color!==color){b.layers.paint=baseSurface(id,'paint',color);b.color=color;}
  for(const type of ['rust','sand','paint']){
    if(panel[type]>=.999){ctx.drawImage(b.layers[type],0,0);continue;}
    const strokes=panel.strokes.filter(s=>s.t===type);if(!strokes.length)continue;
    const mask=document.createElement('canvas');mask.width=mask.height=256;const m=mask.getContext('2d');
    for(const s of strokes){const x=s.u*256,y=(1-s.v)*256,r=s.r*256;const grad=m.createRadialGradient(x,y,r*.77,x,y,r);grad.addColorStop(0,'white');grad.addColorStop(1,'rgba(255,255,255,0)');m.fillStyle=grad;m.beginPath();m.arc(x,y,r,0,Math.PI*2);m.fill();}
    m.globalCompositeOperation='source-in';m.drawImage(b.layers[type],0,0);ctx.drawImage(mask,0,0);
  }
  if(panel.damage==='crash'&&panel.paint<1){
   ctx.save();ctx.globalAlpha=.72*(1-panel.paint);const dent=ctx.createRadialGradient(135,135,8,135,135,95);dent.addColorStop(0,'#141b1d');dent.addColorStop(.55,'#596163');dent.addColorStop(1,'transparent');ctx.fillStyle=dent;ctx.fillRect(0,0,256,256);
   ctx.strokeStyle='#d3c8ad';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(58+i*12,91+i*12);ctx.lineTo(160+i*9,115+i*11);ctx.stroke();}ctx.restore();
  }else if(panel.damage==='flood'&&panel.paint<1){
   ctx.save();ctx.globalAlpha=.55*(1-panel.paint);ctx.fillStyle='#283c32';ctx.fillRect(0,140,256,116);ctx.fillStyle='#9a8b5d';ctx.fillRect(0,138,256,5);ctx.restore();
  }
  b.mat.roughness=.81-panel.sand*.2-panel.paint*.18;b.mat.metalness=.35+panel.rust*.25-panel.paint*.38;b.texture.needsUpdate=true;
 }
 // Underframe and distinct wheel-well cutouts.
 box(1.62,.16,3.9,materials.dark,0,.38,0,car,.04);
 for(const x of [-.62,.62])box(.12,.16,4,materials.black,x,.44,0,car);
 for(const side of [-1,1]){
   const shape=new THREE.Shape();shape.moveTo(-2.23,.44);shape.lineTo(-2.23,.84);shape.quadraticCurveTo(-2.12,.97,-1.5,1.01);shape.lineTo(-.76,1.05);shape.lineTo(.95,1.05);shape.lineTo(1.9,.97);shape.lineTo(2.2,.84);shape.lineTo(2.2,.44);shape.lineTo(1.90,.44);shape.absarc(1.43,.44,.47,0,Math.PI,false);shape.lineTo(-.96,.44);shape.absarc(-1.43,.44,.47,0,Math.PI,false);shape.lineTo(-2.23,.44);
   const geo=new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:28});geo.computeBoundingBox();const pos=geo.attributes.position;const uv=[];for(let i=0;i<pos.count;i++)uv.push((pos.getX(i)+2.25)/4.5,(pos.getY(i)-.45)/.65);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
   const m=createPanel(side===1?'left':'right',geo);m.rotation.y=Math.PI/2;m.position.x=side===1?.88:-.97;
   // Side lower rails, door gap, chrome handle and mirror.
   box(.075,.10,1.72,materials.black,side*.94,.48,.04,car,.025);
   pipe([[side*.973,1.06,-.70],[side*.973,.79,-.67],[side*.973,.62,-.62],[side*.973,.58,.60],[side*.973,1.02,.70]],.008,materials.black,car);
   box(.05,.037,.18,materials.chrome,side*.985,.95,.49,car,.012);
   box(.15,.12,.23,materials.dark,side*1.035,1.14,-.73,car,.04);
   const mirror=box(.015,.08,.15,materials.chrome,side*1.12,1.15,-.72,car,.015);
 }
 let hoodPivot=new THREE.Group();hoodPivot.name='hoodPivot';hoodPivot.position.set(0,1.045,-.73);car.add(hoodPivot);
 createPanel('hood',quad([[-.87,-.095,-1.46],[.87,-.095,-1.46],[.88,0,0],[-.88,0,0]]),hoodPivot);
 createPanel('trunk',quad([[-.89,1.045,1.03],[.89,1.045,1.03],[.82,.94,2.17],[-.82,.94,2.17]]));
 createPanel('front',quad([[-.84,.57,-2.255],[.84,.57,-2.255],[.86,.95,-2.255],[-.86,.95,-2.255]]));
 createPanel('rear',quad([[.84,.56,2.225],[-.84,.56,2.225],[-.86,.94,2.225],[.86,.94,2.225]]));
 // Cabin and glass, with the interior actually present.
 createPanel('roof',quad([[-.72,1.62,-.30],[.72,1.62,-.30],[.73,1.63,.64],[-.73,1.63,.64]]));
 const glass=new THREE.MeshPhysicalMaterial({color:'#152931',metalness:0,roughness:.22,transparent:true,opacity:.86,side:THREE.DoubleSide,clearcoat:.4,envMapIntensity:.45});
 const addGlass=pts=>{const m=new THREE.Mesh(quad(pts),glass);m.userData.window=true;car.add(m);return m;};
 const windshield=addGlass([[-.85,1.07,-.76],[.85,1.07,-.76],[.71,1.59,-.30],[-.71,1.59,-.30]]);windshield.material=glass.clone();windshield.userData.windshield=true;
 addGlass([[.73,1.60,.66],[-.73,1.60,.66],[-.87,1.07,1.09],[.87,1.07,1.09]]);
 for(const side of [-1,1]){
   addGlass([[side*.86,1.075,-.70],[side*.73,1.57,-.27],[side*.735,1.58,.62],[side*.87,1.08,1.03]]);
   pipe([[side*.86,1.06,-.76],[side*.73,1.62,-.3],[side*.74,1.63,.65],[side*.9,1.05,1.11]],.022,materials.steel,car);
   pipe([[side*.76,1.61,.31],[side*.89,1.06,.38]],.032,materials.black,car);
   pipe([[side*.86,1.06,-.76],[side*.9,1.05,1.11]],.018,materials.chrome,car);
 }
 pipe([[-.73,1.62,-.3],[0,1.64,-.3],[.73,1.62,-.3]],.018,materials.steel,car);
 pipe([[-.74,1.63,.65],[0,1.65,.65],[.74,1.63,.65]],.018,materials.steel,car);
 box(1.57,.20,.36,materials.black,0,.97,-.57,car,.07);
 for(const x of [-.40,.40]){box(.57,.15,.57,materials.black,x,.67,.05,car,.09);const back=box(.57,.6,.14,materials.black,x,.99,.33,car,.08);back.rotation.x=-.13;box(.32,.18,.11,materials.black,x,1.33,.38,car,.04);}
 const steering=new THREE.Mesh(new THREE.TorusGeometry(.16,.021,10,24),materials.black);steering.position.set(.41,1.10,-.31);steering.rotation.x=-.4;car.add(steering);
 pipe([[-.7,1.09,-.75],[-.15,1.12,-.7]],.012,materials.black,car);
 pipe([[.05,1.09,-.75],[.55,1.12,-.7]],.012,materials.black,car);
 // Bumpers, rectangular headlamps, grille, rear lights, plate, exhaust.
 box(1.94,.17,.18,materials.black,0,.52,-2.26,car,.045);box(1.94,.17,.17,materials.black,0,.52,2.24,car,.045);
 let lampMat=new THREE.MeshPhysicalMaterial({color:'#d6d6ba',roughness:.18,metalness:.15,clearcoat:1,emissive:'#ffe6ae',emissiveIntensity:0});
 lampMat.userData.headlight=true;
 for(const x of [-.61,.61]){
  box(.49,.23,.07,materials.black,x,.78,-2.28,car,.03);box(.42,.17,.08,lampMat,x,.79,-2.32,car,.02);
  for(let i=0;i<7;i++)box(.008,.15,.012,materials.chrome,x-.18+i*.06,.79,-2.366,car);
  box(.14,.08,.06,metal('#bd7425',.25,.1),x<0?-.77:.77,.59,-2.37,car,.01);
  box(.57,.17,.05,new THREE.MeshPhysicalMaterial({color:'#a52e20',roughness:.24,metalness:.05,clearcoat:1}),x,.77,2.26,car,.02);
 }
 box(.56,.17,.055,materials.black,0,.78,-2.29,car);
 for(let i=0;i<5;i++)box(.52,.012,.012,materials.chrome,0,.72+i*.029,-2.328,car);
 const plateMat=new THREE.MeshStandardMaterial({map:labelTexture('R  ·  86',512,160,'#cac7b3','#30393b'),roughness:.6});
 box(.38,.12,.015,plateMat,0,.55,-2.365,car);box(.38,.12,.015,plateMat,0,.72,2.29,car);
 const exhaust=cylinder(.055,.055,.21,materials.chrome,-.62,.39,2.23,car);exhaust.rotation.x=Math.PI/2;
 for(const z of [-1.43,1.43]){const axle=cylinder(.055,.055,1.9,materials.steel,0,.44,z,car);axle.rotation.z=Math.PI/2;}
 // Each functional component has a matching selectable group and an installation ghost.
 function registerPart(id,group){group.name=id;group.userData.part=id;group.traverse(m=>{if(m.isMesh){m.userData.part=id;m.userData.originalMaterial=m.material;}});partGroups[id]=group;car.add(group);}
 const engine=new THREE.Group();engine.position.set(0,.66,-1.3);
 box(.62,.29,.76,materials.steel,0,0,0,engine,.06);box(.48,.14,.65,materials.dark,0,.21,0,engine,.04);
 for(let i=0;i<5;i++)box(.025,.02,.57,materials.chrome,-.17+i*.085,.29,0,engine);
 for(let i=0;i<4;i++)pipe([[.18,.18,-.25+i*.16],[.42,.12,-.25+i*.16],[.4,-.18,-.25+i*.16]],.045,materials.chrome,engine);
 const cap=cylinder(.055,.055,.025,materials.orange,-.13,.30,.21,engine);
 registerPart('engine',engine);
 const gearbox=new THREE.Group();gearbox.position.set(0,.58,-.42);box(.35,.29,.63,materials.steel,0,0,0,gearbox,.07);for(let i=0;i<5;i++)box(.39,.31,.02,materials.dark,0,0,-.2+i*.1,gearbox);registerPart('gearbox',gearbox);
 const battery=new THREE.Group();battery.position.set(.62,.68,-.93);box(.31,.28,.36,materials.black,0,0,0,battery,.025);box(.32,.04,.37,materials.dark,0,.16,0,battery);box(.05,.05,.07,materials.red,.08,.2,-.08,battery);box(.05,.05,.07,materials.chrome,-.08,.2,-.08,battery);box(.26,.12,.005,materials.orange,0,.01,-.184,battery);registerPart('battery',battery);
 const radiator=new THREE.Group();radiator.position.set(0,.68,-1.98);box(1.10,.39,.09,materials.black,0,0,0,radiator,.025);for(let i=0;i<20;i++)box(.016,.34,.11,materials.steel,-.50+i*.052,0,0,radiator);registerPart('radiator',radiator);
 for(const [id,x,z] of [['wheelFL',1,-1.43],['wheelFR',-1,-1.43],['wheelRL',1,1.43],['wheelRR',-1,1.43]]){
  const group=new THREE.Group();group.position.set(x,.44,z);group.scale.setScalar(.84);
  const tire=new THREE.Mesh(new THREE.TorusGeometry(.355,.145,18,48),materials.rubber);tire.rotation.y=Math.PI/2;tire.castShadow=true;group.add(tire);
  const rim=cylinder(.285,.285,.23,materials.chrome,0,0,0,group);rim.rotation.z=Math.PI/2;
  const face=cylinder(.245,.245,.24,materials.dark,0,0,0,group);face.rotation.z=Math.PI/2;
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3;const spoke=box(.255,.047,.25,materials.chrome,0,Math.sin(angle)*.115,Math.cos(angle)*.115,group,.008);spoke.rotation.x=-angle;
  }
  const hub=cylinder(.08,.08,.28,materials.chrome,0,0,0,group);hub.rotation.z=Math.PI/2;
  for(let i=0;i<40;i++){const a=i*Math.PI*2/40;const tread=box(.205,.008,.025,materials.black,0,Math.sin(a)*.488,Math.cos(a)*.488,group,.005);tread.rotation.x=-a;}
  registerPart(id,group);
 }
 const models={r86:{car,panels:bodyPanels,parts:partGroups,hood:hoodPivot,lamp:lampMat}};
 let activeModel='r86',generatedId=null;
 let doorsOpen=false,doorAmount=0,roofAmount=0;
 function releaseGenerated(){
  if(!generatedId)return;
  const previous=models[generatedId];scene.remove(previous.car);disposeVisualMods(previous.car);previous.dispose();
  for(const panel of Object.values(previous.panels)){panel.texture.dispose();panel.mat.dispose();}
  delete models[generatedId];generatedId=null;
 }
 function getModel(info){
  if(models[info.id])return models[info.id];
  releaseGenerated();bodyPanels={};
  const generated=createSportsCar({createPanel,mechanics:models.r86.parts,model:info});
  models[info.id]={...generated,panels:bodyPanels};generatedId=info.id;scene.add(generated.car);
  return models[info.id];
 }
 const ghostMat=new THREE.MeshBasicMaterial({color:'#e5b875',transparent:true,opacity:.18,wireframe:true,depthWrite:false});
 const highlightMat=new THREE.MeshStandardMaterial({color:'#d2944f',metalness:.5,roughness:.4,emissive:'#a36a24',emissiveIntensity:.28});
 // Installation points and markers are projected into the HTML layer.
 const markerPositions={engine:[0,.99,-1.32],gearbox:[0,.7,-.3],radiator:[0,.83,-2],battery:[.64,.91,-.9],wheelFL:[1.15,.46,-1.43],wheelFR:[-1.15,.46,-1.43],wheelRL:[1.15,.46,1.43],wheelRR:[-1.15,.46,1.43]};
 const markerLayer=document.createElement('div');markerLayer.className='markers';container.appendChild(markerLayer);
 const markers={};for(const spec of PARTS){const el=document.createElement('button');el.className='part-marker';el.title=spec.name;el.setAttribute('aria-label',`选择${spec.name}`);el.innerHTML='<span></span>';el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('click',()=>onSelect(spec.id));markerLayer.appendChild(el);markers[spec.id]=el;}
 const brushCursor=document.createElement('div');brushCursor.className='brush-cursor';container.appendChild(brushCursor);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDownAt=null,moved=false;
 function hitAt(event,surfacesOnly=false){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(car,true).find(h=>{if(h.object.material===ghostMat||surfacesOnly&&h.object.userData.trim)return false;for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});return surfacesOnly&&!hit?.object.userData.panel?undefined:hit;}
 function brush(event){
  const hit=hitAt(event,true);if(!hit?.uv)return;
  if(performance.now()-lastBrush<28)return;lastBrush=performance.now();
  onBrush(hit.object.userData.panel,currentTool,Math.max(0,Math.min(1,hit.uv.x)),Math.max(0,Math.min(1,hit.uv.y)));
 }
 renderer.domElement.addEventListener('pointerdown',event=>{
  pointerDownAt={x:event.clientX,y:event.clientY};moved=false;
  if(event.button===0&&['rust','sand','paint'].includes(currentTool)&&!event.shiftKey){isPainting=true;controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);brush(event);}
 });
 renderer.domElement.addEventListener('pointermove',event=>{
  if(pointerDownAt&&Math.hypot(event.clientX-pointerDownAt.x,event.clientY-pointerDownAt.y)>5)moved=true;
  const rect=container.getBoundingClientRect();brushCursor.style.left=`${event.clientX-rect.left}px`;brushCursor.style.top=`${event.clientY-rect.top}px`;
  if(isPainting){brush(event);return;}
  const hit=hitAt(event,['rust','sand','paint'].includes(currentTool));
  const id=hit?.object.userData.panel||hit?.object.userData.part||null;
  if(id!==hovered){hovered=id;onHover(id?panelNames[id]||PARTS.find(p=>p.id===id)?.name:null);}
  brushCursor.classList.toggle('visible',!!hit&&['rust','sand','paint'].includes(currentTool));
 });
 function release(event){if(isPainting){isPainting=false;controls.enabled=true;onMessage?.('save');}else if(!moved&&pointerDownAt&&event.button===0&&currentTool==='inspect'){const hit=hitAt(event);if(hit?.object.userData.part)onSelect(hit.object.userData.part);}pointerDownAt=null;}
 renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',()=>{isPainting=false;controls.enabled=true;pointerDownAt=null;});
 renderer.domElement.addEventListener('pointerleave',()=>{brushCursor.classList.remove('visible');onHover(null);});
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(18))*Math.max(1,1.2/camera.aspect)));camera.updateProjectionMatrix();renderer.setSize(w,h);}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 let animationId;const animationStart=performance.now();let lastPanelUpdate=0;
 function animate(){animationId=requestAnimationFrame(animate);if(paused)return;const t=(performance.now()-animationStart)/1000;controls.update();for(const object of workshopObjects)object.visible=!(object.position.z>4&&camera.position.z>4.3)&&!(object.position.x< -6&&camera.position.x< -6.3);hoodPivot.rotation.x=THREE.MathUtils.lerp(hoodPivot.rotation.x,hoodOpen?1.03:0,.12);const rearHatch=car.getObjectByName('engineHatch');if(rearHatch)rearHatch.rotation.x=THREE.MathUtils.lerp(rearHatch.rotation.x,hoodOpen?-1.03:0,.12);car.position.y=-(car.userData.visualLowering||0)+(running?Math.sin(t*47)*.0014:0);const activeWing=car.getObjectByName('activeWing');if(activeWing)poseActiveWing(car,THREE.MathUtils.lerp(activeWing.userData.wingLift||0,wingPreview&&currentLocation==='upgrades'?1:0,.1));lampMat.emissiveIntensity=activeModel!=='r86'?(running?3:1.5):(running?.6:currentLocation==='upgrades'?1.5:0);
  rotateDownforceFans(car,t*9);doorAmount=THREE.MathUtils.lerp(doorAmount,doorsOpen?1:0,.075);roofAmount=THREE.MathUtils.lerp(roofAmount,currentState&&roofIsOpen(currentState)?1:0,.045);poseVehicleBody(car,doorAmount,roofAmount);
  const rect=container.getBoundingClientRect();
  for(const [id,coords] of Object.entries(markerPositions)){
    const visible=currentTool==='inspect'&&currentState?.started&&(hoodOpen||id.startsWith('wheel'));
    markers[id].style.display=visible?'grid':'none';if(!visible)continue;
    car.updateMatrixWorld();const position=id==='engine'&&car.userData.engineLocation?car.userData.engineLocation:id.startsWith('wheel')&&car.userData.wheelTrack?[Math.sign(coords[0])*(car.userData.wheelTrack[id.includes('F')?'front':'rear']+.135),coords[1],coords[2]]:coords;const p=car.localToWorld(new THREE.Vector3(...position)).project(camera);markers[id].style.transform=`translate(${(p.x*.5+.5)*rect.width}px,${(-p.y*.5+.5)*rect.height}px)`;markers[id].classList.toggle('selected',selected===id);markers[id].classList.toggle('missing',!currentState.parts[id].installed);
    markers[id].style.opacity=p.z>1?'0':'1';
  }
  renderer.render(scene,camera);
 }
 const dyno=new THREE.Group();scene.add(dyno);dyno.visible=false;
 box(2.85,.05,4.4,materials.dark,0,-.005,0,dyno,.02);
 for(const x of [-1,1])for(const z of [-1.43,1.43])for(const offset of [-.22,.22]){const roller=cylinder(.13,.13,.58,materials.chrome,x,-.07,z+offset,dyno);roller.rotation.z=Math.PI/2;}
 const shopSign=labelTexture('CS / PERFORMANCE LAB',1024,160,'#183239','#8dc5c5');const originalSign=sign.material.map;const modSign=labelTexture('EMBER WORKS / UPGRADE BAY',1024,160,'#302920','#dfb47b');let currentLocation='garage',wingPreview=false;
 animate();
 return {
  update(state,full=true){currentState=state;running=state.running;selected=state.selected;
   const info=vehicleInfo(state),model=info.id;renderer.domElement.setAttribute('aria-label',`交互式三维车库 · ${info.brand} ${info.name}`);
   if(model!==activeModel){car.visible=false;const next=getModel(info);car=next.car;car.visible=true;bodyPanels=next.panels;partGroups=next.parts;hoodPivot=next.hood;lampMat=next.lamp;activeModel=model;hoodOpen=false;doorsOpen=false;doorAmount=0;roofAmount=roofIsOpen(state)?1:0;poseVehicleBody(car,0,roofAmount);full=true;}
   if(running)doorsOpen=false;
   applyVisualMods(car,visualMods(state),state.paint);
   stands.visible=currentLocation==='garage'&&['wheelFL','wheelFR','wheelRL','wheelRR'].some(id=>!state.parts[id].installed);

   for(const spec of PARTS){const group=partGroups[spec.id],part=state.parts[spec.id];group.traverse(m=>{if(!m.isMesh)return;const orig=m.userData.originalMaterial;m.material=!part.installed?ghostMat:(selected===spec.id&&currentTool==='inspect'?highlightMat:orig);});}
   if(full)for(const id of PANELS)paintPanel(id,state.panels[id],state.paint);
  },
  updatePanel(state,id){currentState=state;paintPanel(id,state.panels[id],state.paint);},
  setTool(tool){currentTool=tool;controls.mouseButtons.LEFT=['rust','sand','paint'].includes(tool)?null:THREE.MOUSE.ROTATE;renderer.domElement.style.cursor=['rust','sand','paint'].includes(tool)?'crosshair':'grab';brushCursor.dataset.tool=tool;brushCursor.classList.remove('visible');if(currentState)this.update(currentState,false);},
  toggleHood(){hoodOpen=!hoodOpen;return hoodOpen;},
  setHood(value){hoodOpen=value;},
  toggleDoors(){if(!currentState?.started||running||currentState?.raceActive||activeModel==='r86')return false;doorsOpen=!doorsOpen;return doorsOpen;},
  closeDoors(){doorsOpen=false;},
  get doorsOpen(){return doorsOpen;},
  home(){camera.position.set(6.2,3.45,-6.6);controls.target.set(0,.85,0);},
  view(which){const positions={front:[.3,2,-7.6],left:[7,2.5,.1],right:[-7,2.5,.1],rear:[.3,2.5,7],top:[0,10.5,.351]};camera.position.set(...(positions[which]||positions.front));controls.target.set(0,.8,which==='top'?.35:0);},
  exportImage(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  dispose(){releaseGenerated();disposeVisualMods(models.r86.car);cancelAnimationFrame(animationId);observer.disconnect();controls.dispose();renderer.dispose();},
  setPaused(value){paused=value;},
  setLocation(location){currentLocation=location;wingPreview=false;stands.visible=location==='garage'&&!!currentState&&['wheelFL','wheelFR','wheelRL','wheelRR'].some(id=>!currentState.parts[id].installed);doorsOpen=false;dyno.visible=location==='tuning';sign.material.map=location==='tuning'?shopSign:location==='upgrades'?modSign:originalSign;warm.color.set(location==='tuning'?'#8ccbd2':'#ffbd73');sign.material.needsUpdate=true;},
  setWingPreview(value){wingPreview=!!value;},
  getVehicle(){this.setTool('driving');doorsOpen=false;const clone=car.clone(true);clone.position.set(0,-(car.userData.visualLowering||0),0);for(const name of ['hoodPivot','engineHatch']){const lid=clone.getObjectByName(name);if(lid)lid.rotation.x=0;}poseActiveWing(clone,0);poseVehicleBody(clone,0,roofIsOpen(currentState)?1:0);return clone;},
  getInfo(){return {triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,panels:Object.keys(bodyPanels).length};}
 };
}
