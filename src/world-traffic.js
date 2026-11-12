import * as THREE from 'three';

export function createWorldTraffic(scene,{geometry,ownMaterial}){
 const mat=color=>ownMaterial(new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.12}));
 const rubber=mat('#22282b'),glass=mat('#527a86'),skin=mat('#d9a47d'),hair=mat('#34302e'),white=mat('#e7e9df'),red=mat('#d34e42'),yellow=mat('#f3c94c');
 const carColors=['#d3d9d7','#4c7f9e','#be6151','#6e8b69','#e4c968'].map(mat),bikeColors=['#d35d4b','#528d9b','#f0c353','#b8c6c4'].map(mat);
 const unitBox=geometry(new THREE.BoxGeometry(1,1,1)),unitSphere=geometry(new THREE.SphereGeometry(1,10,8)),carWheel=geometry(new THREE.CylinderGeometry(.36,.36,.22,12)),bikeWheel=geometry(new THREE.TorusGeometry(.31,.045,8,16)),tube=geometry(new THREE.CylinderGeometry(.035,.035,1,6));
 const items=[];
 function part(parent,geo,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function line(parent,from,to,material){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a),m=part(parent,tube,material,...a.clone().add(b).multiplyScalar(.5).toArray(),1,delta.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 function wheels(parent,zPositions,geo,y,xPositions){const result=[];for(const z of zPositions)for(const x of xPositions){const w=part(parent,geo,rubber,x,y,z);w.rotation.z=geo===carWheel?Math.PI/2:0;if(geo===bikeWheel)w.rotation.y=Math.PI/2;result.push(w);}return result;}
 let taxiSign=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=48;const ctx=canvas.getContext('2d');ctx.fillStyle='#f3d15b';ctx.fillRect(0,0,128,48);ctx.fillStyle='#263834';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('TAXI',64,25);const tex=ownMaterial(new THREE.CanvasTexture(canvas));tex.colorSpace=THREE.SRGBColorSpace;taxiSign=ownMaterial(new THREE.MeshBasicMaterial({map:tex}));
 }
 function car(taxi,index){const g=new THREE.Group();g.name=taxi?'taxi':'traffic-car';const paint=taxi?bikeColors[1]:carColors[index%carColors.length];
  const style=taxi?'sedan':['sedan','suv','sports'][index%3];g.userData.bodyStyle=style;
  const suv=style==='suv',sports=style==='sports',bodyY=suv?.67:sports?.49:.57,bodyHeight=suv?.72:sports?.38:.57,roofY=suv?1.25:sports?.80:1.0,roofHeight=suv?.64:sports?.32:.5,roofLength=suv?2.35:sports?1.45:1.85,roofWidth=suv?1.65:sports?1.36:1.53,halfLength=1.75;
  part(g,unitBox,paint,0,bodyY,0,suv?1.85:1.72,bodyHeight,3.5);part(g,unitBox,paint,0,roofY,.13,roofWidth,roofHeight,roofLength);part(g,unitBox,glass,0,roofY+.05,.13-roofLength/2,roofWidth-.15,roofHeight*.7,.04);part(g,unitBox,glass,0,roofY+.05,.13+roofLength/2,roofWidth-.15,roofHeight*.7,.04);
  for(const x of [-1,1]){part(g,unitBox,glass,x*roofWidth/2,roofY+.05,.12,.03,roofHeight*.65,roofLength-.3);part(g,unitBox,white,x*.58,bodyY+.08,-halfLength-.01,.35,.14,.03);part(g,unitBox,red,x*.58,bodyY+.08,halfLength+.01,.35,.14,.03);}
  part(g,unitSphere,skin,-.37,roofY+.05,-.25,.16,.18,.16);
  if(sports){part(g,unitBox,paint,0,.83,1.58,1.65,.08,.25);for(const x of [-.58,.58])part(g,unitBox,paint,x,.7,1.58,.08,.25,.1);}
  if(suv)for(const x of [-.58,.58])part(g,unitBox,rubber,x,1.62,.1,.07,.07,1.9);
  if(taxi){part(g,unitBox,yellow,0,1.34,.05,.72,.19,.4);if(taxiSign){const label=part(g,geometry(new THREE.PlaneGeometry(.63,.18)),taxiSign,0,1.36,-.16);label.rotation.y=Math.PI;}}
  return {group:g,wheels:wheels(g,[-1.05,1.05],carWheel,.36,[-.85,.85])};
 }
 function cycle(electric,index){const g=new THREE.Group();g.name=electric?'electric-scooter':'bicycle';const paint=bikeColors[index%bikeColors.length],w=wheels(g,[-.66,.66],bikeWheel,.32,[0]);
  if(electric){part(g,unitBox,paint,0,.37,.04,.35,.12,1.1);part(g,unitBox,paint,0,.54,.45,.35,.37,.5);part(g,unitBox,rubber,0,.78,.28,.32,.1,.48);line(g,[0,.38,-.62],[0,1.1,-.52],paint);}
  else{line(g,[0,.34,.66],[0,.8,.15],paint);line(g,[0,.8,.15],[0,.34,-.66],paint);line(g,[0,.34,-.66],[0,.34,.66],paint);line(g,[0,.8,.15],[0,.88,-.48],paint);line(g,[0,.88,-.48],[0,.34,-.66],paint);part(g,unitBox,rubber,0,.91,.2,.25,.08,.38);}
  part(g,unitBox,rubber,0,1.1,-.52,.65,.06,.06);part(g,unitBox,paint,0,.91,.25,.36,.5,.24);part(g,unitBox,skin,0,1.36,.12,.3,.32,.28);part(g,unitBox,hair,0,1.54,.12,.32,.1,.3);
  for(const x of [-.19,.19]){line(g,[x,1.08,.18],[x*.8,1.08,-.52],skin);line(g,[x*.7,.82,.2],[x*.7,.43,electric?-.05:.08],rubber);}
  return {group:g,wheels:w};
 }
 for(const dir of [-1,1]){
  for(let i=0;i<4;i++){const taxi=i===0||i===3,built=car(taxi,i+(dir===1?1:0));items.push({...built,type:taxi?'taxi':'car',dir,speed:5.4,x:dir<0?3.4:-3.4,z:-22-i*31-(dir>0?10:0)});}
  for(let i=0;i<8;i++){const electric=i%2===1,built=cycle(electric,i+(dir===1?1:0));items.push({...built,type:electric?'electric-scooter':'bicycle',dir,speed:3.2,x:dir<0?7:-7,z:-14-i*16-(dir>0?5:0)});}
 }
 for(const item of items){item.group.position.set(item.x,0,item.z);item.group.rotation.y=item.dir<0?0:Math.PI;scene.add(item.group);}
 function update(dt,focus){for(const item of items){const distanceAhead=focus?(focus.z-item.z)*item.dir:Infinity,blocked=focus&&Math.abs(focus.x-item.x)<1.8&&distanceAhead>0&&distanceAhead<7;const distance=blocked?0:item.speed*dt;item.z+=item.dir*distance;if(item.z< -146)item.z+=136;if(item.z> -10)item.z-=136;item.group.position.z=item.z;for(const wheel of item.wheels)wheel.rotation.x-=distance/(item.type==='car'||item.type==='taxi'?.36:.31);}}
 return {items,update};
}
