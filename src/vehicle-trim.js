import * as THREE from 'three';

export function addVehicleTrim(c){
 const {car,design:d,profile,at,hood,rearHatch,mesh,box,tube,grid,material,paint,carbon,silver,alloy,lamp,tail}=c;
 const root=new THREE.Group();root.name='designDetails';car.add(root);
 const accent=material(d.accent,.4,.6),black=carbon,nose=profile[0][2],noseWidth=profile[0][1],rearY=profile.at(-1)[2];
 function polygon(name,points,mat=black,parent=root){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap((_,i)=>[i%2,Math.floor(i/2)%2]),2));const indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);g.setIndex(indices);g.computeVertexNormals();const m=mesh(g,mat,parent);m.name=name;mat.side=THREE.DoubleSide;return m;}
 function line(points,r,mat=lamp,parent=root){const group=new THREE.Group();parent.add(group);for(let i=1;i<points.length;i++){const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),delta=b.clone().sub(a),m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),mat,group);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}return group;}
 function ellipse(x,y,z,rx,ry,mat,parent=root){const m=mesh(new THREE.SphereGeometry(1,24,16),mat,parent);m.scale.set(rx,ry,.025);m.position.set(x,y,z);return m;}
 const face=(points,mat=black,z=-2.415)=>polygon('front-design',points.map(([x,y])=>[x,y,z]),mat);
 const rear=(points,mat=black)=>polygon('rear-design',points.map(([x,y])=>[x,y,2.355]),mat);
 const sidePoint=(s,y,z)=>{const p=at(z),t=THREE.MathUtils.clamp((y-p.y)/Math.max(.05,d.roof.height-p.y),0,1);return [s*(THREE.MathUtils.lerp(p.w,d.roof.width,t)+.025),y,z];};
 const sideShape=(s,points,mat=black)=>polygon('side-design',points.map(([z,y])=>sidePoint(s,y,z)),mat);
 const grilleTop=Math.max(.52,nose-.08);
 box(noseWidth*2+.06,.05,.30,black,0,.29,-2.27,root,.012);
 if(['wide','singleframe','smile','oval'].includes(d.grille)){
  const w=d.grille==='singleframe'?.68:d.grille==='smile'?.62:d.grille==='wide'?.74:.61;
  const points=d.grille==='singleframe'?[[-w,.43],[-w*.72,.32],[w*.72,.32],[w,.43],[w*.80,grilleTop],[-w*.80,grilleTop]]:d.grille==='smile'?[[-w,grilleTop],[-w*.83,.38],[-.30,.33],[.30,.33],[w*.83,.38],[w,grilleTop]]:d.grille==='oval'?[[-w,.48],[-w*.82,.34],[w*.82,.34],[w,.48],[w*.75,grilleTop],[-w*.75,grilleTop]]:[[-w,.34],[w,.34],[w,grilleTop],[-w,grilleTop]];
  face(points);if(d.chrome||d.grille==='singleframe')line([...points,points[0]].map(([x,y])=>[x,y,-2.432]),.014,silver);
  for(let i=-5;i<=5;i++)box(.014,Math.max(.08,grilleTop-.40),.013,alloy,i*w/6,(.39+grilleTop)/2,-2.444,root,.002);
 }else if(d.grille==='horseshoe'){
  face([[-.24,.33],[.24,.33],[.28,.51],[.20,nose-.015],[0,nose+.035],[-.20,nose-.015],[-.28,.51]]);
  tube([[-.24,.33,-2.45],[-.28,.51,-2.45],[-.20,nose-.015,-2.45],[0,nose+.035,-2.45],[.20,nose-.015,-2.45],[.28,.51,-2.45],[.24,.33,-2.45]],.025,silver,root);
  for(const s of [-1,1]){face([[s*.37,.34],[s*.89,.38],[s*.86,.62],[s*.38,.62]]);for(let y=.39;y<.62;y+=.06)box(.43,.012,.02,alloy,s*.63,y,-2.44,root,.002);}
 }else if(d.grille==='kidney'){
  for(const s of [-1,1]){face([[s*.06,.38],[s*.36,.38],[s*.40,grilleTop],[s*.06,grilleTop]]);line([[s*.06,.38,-2.44],[s*.36,.38,-2.44],[s*.40,grilleTop,-2.44],[s*.06,grilleTop,-2.44],[s*.06,.38,-2.44]],.012,silver);}
 }else{
  for(const s of [-1,1]){
   const points=d.grille==='hex'?[[s*.19,.37],[s*.31,.31],[s*.86,.34],[s*.99,.43],[s*.84,grilleTop],[s*.33,grilleTop]]:d.grille==='twin'||d.grille==='f1'?[[s*.12,.30],[s*.86,.31],[s*.94,.49],[s*.49,grilleTop],[s*.23,.46]]:[[s*.12,.34],[s*.84,.34],[s*.88,grilleTop],[s*.22,grilleTop-.02]];
   face(points);if(d.grille==='hex')line([...points,points[0]].map(([x,y])=>[x,y,-2.433]),.009,accent);
  }
  if(d.grille==='f1')face([[-.10,.31],[.10,.31],[.23,nose+.06],[-.23,nose+.06]],paint,-2.44);
 }
 for(const s of [-1,1]){
  const x=s*Math.min(.67,noseWidth*.74),y=nose+.025;
  if(d.front==='popup'){
   const pod=box(.39,.12,.38,paint,x,at(-1.99).y+.07,-1.99,root,.007);pod.rotation.x=-.14;
   box(.32,.083,.018,black,x,at(-1.99).y+.08,-2.185,root,.004);box(.28,.057,.022,lamp,x,at(-1.99).y+.08,-2.199,root,.002);
   box(.32,.09,.035,lamp,x,.53,-2.43,root,.004);
  }else if(d.front==='oval'){
   const pod=mesh(new THREE.SphereGeometry(1,32,20),black,root);pod.position.set(x,at(-2.02).y+.015,-2.04);pod.scale.set(.19,.075,.30);pod.rotation.x=.22;
   const lens=mesh(new THREE.SphereGeometry(1,24,16),lamp,root);lens.position.set(x,at(-2.02).y+.052,-2.06);lens.scale.set(.153,.051,.247);lens.rotation.x=.22;
   for(const dx of [-.066,.066])for(const dz of[-.10,.10]){const dot=mesh(new THREE.SphereGeometry(.031,12,8),silver,root);dot.position.set(x+dx,at(-2.02).y+.108,-2.06+dz);}
  }else if(d.front==='quad-pods'){
   for(const dz of [0,.23]){const z=-2.04+dz,p=at(z);const surround=ellipse(x,p.y+.075,z,.115,.13,black);surround.rotation.x=-.30;const lens=ellipse(x,p.y+.075,z-.027,.083,.095,lamp);lens.rotation.x=-.30;}
  }else if(d.front==='round'||d.front==='round-twin'){
   for(const offset of(d.front==='round-twin'?[-.105,.105]:[0])){ellipse(x+offset,y,-2.40,d.front==='round'?.16:.098,d.front==='round'?.16:.098,d.chrome?silver:black);ellipse(x+offset,y,-2.43,d.front==='round'?.127:.078,d.front==='round'?.127:.078,lamp);}
  }else if(d.front==='eye'){
   // The deep lamp housings follow the hood and move with it below.
  }else if(d.front==='swept'||d.front==='hook'){
   const z=-2.13;const pts=[[s*.49,at(z).y-.015,z],[s*.77,at(z).y+.03,z],[s*.83,at(-1.61).y+.02,-1.61],[s*.70,at(-1.61).y+.026,-1.61]];polygon('swept-lamp-housing',pts,black);
   line([[s*.52,at(z).y+.017,z-.015],[s*.72,at(z).y+.055,z],[s*.77,at(-1.66).y+.06,-1.66]],.018,lamp);
   if(d.front==='hook')line([[s*.52,at(z).y+.017,z-.015],[s*.49,at(z).y-.04,z-.03]],.018,lamp);
  }else if(d.front==='quad-led'||d.front==='six-led'){
   const count=d.front==='quad-led'?4:6;box(.46,.11,.055,black,x,y,-2.38,root,.03);
   for(let i=0;i<count;i++)box(.045,.052,.02,lamp,x+(i-(count-1)/2)*.063,y,-2.419,root,.008);
  }else if(d.front==='block'||d.front==='matrix'){
   face([[s*.40,y-.07],[s*.85,y-.065],[s*.80,y+.07],[s*.48,y+.07]],black,-2.39);
   line([[s*.42,y+.04,-2.425],[s*.77,y+.04,-2.425],[s*.83,y-.015,-2.425]],.016,lamp);
   for(let i=0;i<3;i++)box(.07,.035,.015,lamp,s*(.5+i*.09),y-.02,-2.43,root,.004);
  }else if(d.front==='almond'){
   face([[s*.39,y],[s*.60,y+.07],[s*.85,y+.015],[s*.68,y-.065]],black,-2.39);
   tube([[s*.42,y,-2.42],[s*.62,y+.035,-2.42],[s*.81,y+.015,-2.42]],.015,lamp,root);
  }else{
   face([[s*.33,y-.04],[s*.51,y+.085],[s*.86,y+.055],[s*.90,y-.06],[s*.64,y-.09]],black,-2.385);
   const points=d.front==='y'?[[s*.37,y+.04],[s*.61,y-.025],[s*.84,y+.035]]:d.front==='needle'?[[s*.38,y+.015],[s*.84,y+.045]]:[[s*.36,y+.04],[s*.58,y+.04],[s*.75,y-.045],[s*.88,y-.015]];
   line(points.map(([x,y])=>[x,y,-2.42]),.014,lamp);
   if(d.front==='y')line([[s*.61,y-.025,-2.42],[s*.67,y-.09,-2.42]],.014,lamp);
  }
  if(d.chrome){box(.66,.075,.11,silver,s*.55,.36,-2.40,root,.035);box(.68,.075,.1,silver,s*.58,.37,2.38,root,.03);}
  if(d.intake==='c-ring'){
   tube([[-.40,.39],[.30,.37],[1.10,.51],[1.28,.86],[.95,1.30],[.52,d.roof.height-.03]].map(([z,y])=>sidePoint(s,y,z)),.035,silver,root);
  }else if(d.intake==='arc'){
   sideShape(s,[[.62,.53],[1.02,.82],[.99,1.01],[.65,.94]]);
   tube([[s*(at(.64).w+.035),.55,.64],[s*(at(.86).w+.05),.83,.86],[s*(at(1.03).w+.035),1.015,1.03]],.025,paint,root);
  }else if(d.intake==='sideblade'){
   sideShape(s,[[.71,.44],[1.12,.80],[1.03,1.05],[.72,1.03]],black);
   line([[s*(at(.74).w+.025),.46,.74],[s*(at(.74).w+.025),1.03,.74]],.025,accent);
  }else if(d.intake==='hex'||d.intake==='blade'){
   sideShape(s,[[.70,.50],[1.12,.90],[1.00,1.03],[.73,.95]],black);
   line([[s*(at(.72).w+.035),.51,.72],[s*(at(1.10).w+.035),.89,1.10],[s*(at(1.0).w+.035),1.03,1.0]],.014,accent);
  }else if(d.intake==='oval'){
   const vent=mesh(new THREE.SphereGeometry(1,24,16),black,root);vent.scale.set(.03,.16,.20);vent.position.set(s*(at(.94).w+.015),.90,.94);
  }else if(d.intake==='gill'){
   for(let i=0;i<3;i++)line([[s*(at(-.91).w+.015),.87-i*.055,-1.06],[s*(at(-.75).w+.015),.85-i*.055,-.76]],.012,silver);
  }else if(d.intake==='slats'){
   for(let i=0;i<4;i++)sideShape(s,[[1.76,.83+i*.04],[2.14,.83+i*.04],[2.14,.846+i*.04],[1.76,.846+i*.04]]);
  }
  if(d.duotone){const skin=mesh(grid((u,v)=>{const z=.90+u*1.42,p=at(z),dist=Math.abs(z-1.43),bottom=dist<.46?.43+Math.sqrt(.46**2-dist**2):.32;return [s*(p.w+.004),THREE.MathUtils.lerp(bottom,p.y,v),z];}),black,root);skin.name='two-tone-rear-quarter';}
 }
 // Hood decorations are parented to the opening hood, rather than left floating over the engine.
 const bonnet=new THREE.Group();bonnet.position.copy(hood.position).multiplyScalar(-1);hood.add(bonnet);bonnet.name='bonnetDetails';
 function hoodY(x,z){const v=THREE.MathUtils.clamp((z+2.34)/(1.72+(d.cabinShift||0)),0,1),p=at(z),mid=THREE.MathUtils.lerp(nose,.925,v)+(d.hoodArch||0)*Math.sin(v*Math.PI);return THREE.MathUtils.lerp(mid,p.y,Math.abs(x/p.w)**2)+.008;}
 if(d.front==='eye')for(const s of[-1,1]){
  const coords=[[s*.40,-2.26],[s*.72,-2.20],[s*.92,-1.80],[s*.87,-1.49],[s*.73,-1.43],[s*.58,-1.73]];
  polygon('teardrop-lamp-housing',coords.map(([x,z])=>[x,hoodY(x,z)+.012,z]),black,bonnet);
  line([[s*.47,-2.20],[s*.70,-2.14],[s*.86,-1.80],[s*.82,-1.56]].map(([x,z])=>[x,hoodY(x,z)+.032,z]),.017,lamp,bonnet);
 }
 if(d.hoodVents){
  for(const s of [-1,1]){
   const points=d.hoodVents==='channels'?[[s*.18,-2.05],[s*.48,-1.66],[s*.40,-.96],[s*.29,-1.08]]:d.hoodVents==='naca'?[[s*.24,-1.29],[s*.45,-1.13],[s*.44,-.88],[s*.31,-.98]]:[[s*.26,-1.71],[s*.49,-1.62],[s*.45,-1.20],[s*.28,-1.27]];
   if(d.hoodVents==='crease')line([[s*.12,hoodY(s*.12,-2.1),-2.1],[s*.35,hoodY(s*.35,-.96),-.96]],.008,accent,bonnet);
   else polygon('hood-vent',points.map(([x,z])=>[x,hoodY(x,z),z]),black,bonnet);
  }
  if(d.hoodVents==='scoop')box(.48,.10,.60,black,0,hoodY(0,-1.34)+.025,-1.34,bonnet,.025);
 }
 if(d.rearLouvers)for(let i=0;i<7;i++)box(1.19,.022,.045,black,0,1.0-i*.012,1.20+i*.11,root,.003);
 if(d.buttress)for(const s of[-1,1])polygon('flying-buttress',[[s*d.roof.width,d.roof.height-.06,d.roof.rear+(d.cabinShift||0)],[s*.92,at(1.72).y,1.72],[s*.81,at(1.80).y,1.8],[s*(d.roof.width-.09),d.roof.height-.09,d.roof.rear+(d.cabinShift||0)]],paint);
 if(d.fin)polygon('central-fin',[[0,d.roof.height-.06,.53],[0,1.22,1.95],[0,.93,1.95]],black);
 if(d.roofRails)for(const s of[-1,1]){
  const y=d.roof.height+.055;
  tube([[s*(d.roof.width-.07),y-.025,d.roof.front+.08],[s*(d.roof.width-.07),y,d.roof.front+.18],[s*(d.roof.width-.07),y,d.roof.rear-.10],[s*(d.roof.width-.07),y-.025,d.roof.rear]],.022,silver,root);
 }
 if(d.spareTire){const spare=mesh(new THREE.TorusGeometry(.31,.09,16,48),black,root);spare.position.set(0,.87,2.43);const hub=mesh(new THREE.CylinderGeometry(.23,.23,.09,32),alloy,root);hub.rotation.x=Math.PI/2;hub.position.set(0,.87,2.46);}
 if(d.identity==='mclaren'){
  const hatchDetails=new THREE.Group();hatchDetails.position.copy(rearHatch.position).multiplyScalar(-1);rearHatch.add(hatchDetails);
  const deckY=(x,z)=>{const v=(z-1.12-(d.cabinShift||0))/(1.20-(d.cabinShift||0)),p=at(z),center=THREE.MathUtils.lerp(d.deck||.94,profile.at(-1)[2],v);return center+.035*Math.sin(v*Math.PI)+(x/p.w)**2*(p.y-center)+.018;};
  const cover=[[-.49,1.30],[.49,1.30],[.63,1.96],[-.63,1.96]];
  polygon('engine-cover',cover.map(([x,z])=>[x,deckY(x,z),z]),black,hatchDetails);
  for(const s of[-1,1])for(let i=0;i<4;i++){const x=s*.24,z=1.42+i*.14;box(.18,.026,.055,alloy,x,deckY(x,z)+.025,z,hatchDetails,.006);}
  hatchDetails.traverse(o=>{if(o.isMesh)o.userData.trim=true;});
 }
 if(d.mirror==='stalk')for(const s of [-1,1]){tube([[s*.81,.98,-.51],[s*1.12,1.20,-.58],[s*1.30,1.18,-.62]],.021,black,root);box(.11,.09,.25,paint,s*1.32,1.18,-.61,root,.04);}
 // Rear lights, outlets and wings have independent layouts for each design family.
 box(profile.at(-1)[1]*1.94,.16,.13,black,0,.39,2.33,root,.02);
 for(const x of [-.65,-.32,0,.32,.65])box(.024,.13,.32,black,x,.30,2.25,root,.002);
 const ty=Math.max(.70,rearY-.11);
 if(['round-pair','round-single','triple-round','loop'].includes(d.tail)){
  for(const s of [-1,1])for(let i=0;i<(d.tail==='round-pair'?2:d.tail==='triple-round'?3:1);i++){
   const x=s*(d.tail==='round-pair'?.51+i*.23:d.tail==='triple-round'?.51+i*.15:.66),r=d.tail==='triple-round'?.058:d.tail==='round-pair'?.095:.12;
   ellipse(x,ty,2.36,r+.017,r+.017,black);
   const ring=mesh(new THREE.TorusGeometry(r,.018,8,32),tail,root);ring.position.set(x,ty,2.393);
  }
 }else if(d.tail==='bar'){
  box(1.85,.072,.025,black,0,ty,2.36,root,.012);line([[-.89,ty,2.389],[.89,ty,2.389]],.014,tail);
 }else for(const s of [-1,1]){
  if(d.tail==='segments')for(let i=0;i<3;i++)line([[s*(.44+i*.16),ty-.045,2.38],[s*(.44+i*.16),ty+.045,2.38]],.022,tail);
  else if(d.tail==='y')line([[s*.43,ty+.035,2.38],[s*.64,ty-.015,2.38],[s*.88,ty+.035,2.38]],.018,tail);
  else if(d.tail==='arc'||d.tail==='hook')tube([[s*.38,ty+.025,2.38],[s*.68,ty+.025,2.38],[s*.89,ty-.025,2.38],[s*.76,ty-.07,2.38]],.015,tail,root);
  else if(d.tail==='angles')line([[s*.39,ty+.05,2.38],[s*.56,ty+.05,2.38],[s*.70,ty-.035,2.38],[s*.91,ty-.035,2.38]],.018,tail);
  else line([[s*.40,ty,2.38],[s*.87,ty,2.38]],.013,tail);
 }
 let outlets=d.exhaust==='single'?[[.68,.39]]:d.exhaust==='dual'?[[-.70,.40],[.70,.40]]:d.exhaust==='triple'?[[-.14,.41],[0,.41],[.14,.41]]:d.exhaust==='triangle'?[[0,.57],[-.10,.40],[.10,.40]]:d.exhaust==='center-four'?[[-.075,.58],[.075,.58],[-.075,.74],[.075,.74]]:d.exhaust==='high-dual'?[[-.22,.78],[.22,.78]]:d.exhaust==='hex-center'?[[-.12,.61],[.12,.61]]:d.exhaust==='center-wide'?[[-.16,.43],[.16,.43]]:[[-.77,.4],[-.59,.4],[.59,.4],[.77,.4]];
 if(d.exhaust==='top')for(const s of[-1,1]){const pipe=mesh(new THREE.CylinderGeometry(.10,.10,.16,24),silver,root);pipe.position.set(s*.53,1.05,1.20);const hole=mesh(new THREE.CircleGeometry(.079,24),black,root);hole.rotation.x=-Math.PI/2;hole.position.set(s*.53,1.135,1.20);}
 else for(const [x,y] of outlets){
  if(d.exhaust==='square-quad'||d.exhaust==='center-wide'){box(.15,.10,.10,silver,x,y,2.41,root,.015);box(.12,.072,.012,black,x,y,2.467,root,.008);}
  else {const pipe=mesh(new THREE.CylinderGeometry(.065,.07,.17,d.exhaust==='hex-center'?6:24),silver,root);pipe.rotation.x=Math.PI/2;pipe.position.set(x,y,2.42);const hole=mesh(new THREE.CircleGeometry(.051,d.exhaust==='hex-center'?6:24),black,root);hole.position.set(x,y,2.512);}
 }
 const factoryWing=new THREE.Group();factoryWing.name='factoryWing';root.add(factoryWing);
 if(d.wing==='bridge'){
  for(const s of [-1,1])box(.10,.43,.39,paint,s*.95,1.17,1.98,factoryWing,.008);
  box(2.04,.065,.43,paint,0,1.39,1.98,factoryWing,.008);
 }else if(d.wing==='swan'||d.wing==='race'){
  const height=d.wing==='swan'?1.50:1.30;
  for(const s of[-1,1]){if(d.wing==='swan')line([[s*.62,1.01,1.68],[s*.62,height+.07,1.80],[s*.62,height+.07,2.13]],.031,black,factoryWing);else box(.05,height-.95,.13,black,s*.63,(height+.95)/2,1.98,factoryWing,.006);}
  const wing=box(d.wing==='swan'?2.25:2.07,.055,.44,black,0,height,2.02,factoryWing,.012);wing.rotation.x=.08;
  for(const s of[-1,1]){box(.025,.18,.48,accent,s*(d.wing==='swan'?1.12:1.03),height+.025,2.02,factoryWing,.009);}
 }else if(d.wing==='flaps')for(const s of[-1,1]){const flap=box(.57,.05,.34,paint,s*.71,1.08,2.02,factoryWing,.02);flap.rotation.x=-.19;}
 else if(d.wing==='ducktail'){const lip=box(1.84,.12,.22,paint,0,rearY+.045,2.18,factoryWing,.02);lip.rotation.x=-.25;}
 else if(d.wing==='lip')box(1.77,.04,.18,black,0,rearY+.025,2.22,factoryWing,.012);
 root.traverse(o=>{if(o.isMesh)o.userData.trim=true;});bonnet.traverse(o=>{if(o.isMesh)o.userData.trim=true;});
}
