export function wallBounds(x,z,width,depth){return {minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2};}
export function treeHasClearance(x,z,radius,buildings){return buildings.every(b=>{const dx=Math.max(b.minX-x,0,x-b.maxX),dz=Math.max(b.minZ-z,0,z-b.maxZ);return Math.hypot(dx,dz)>radius;});}

// Sweep a circle against wall rectangles and keep the remaining motion along the wall.
export function resolveWalls(position,previous,radius,walls){
 const radiusX=typeof radius==='number'?radius:radius.x,radiusZ=typeof radius==='number'?radius:radius.z;
 let x=previous.x,z=previous.z,dx=position.x-x,dz=position.z-z,hitX=false,hitZ=false;
 for(let iteration=0;iteration<3&&(Math.abs(dx)>1e-9||Math.abs(dz)>1e-9);iteration++){
  let earliest=1,axis=null;
  for(const wall of walls){
   const minX=wall.minX-radiusX,maxX=wall.maxX+radiusX,minZ=wall.minZ-radiusZ,maxZ=wall.maxZ+radiusZ;
   if((Math.abs(dx)<1e-9&&(x<=minX||x>=maxX))||(Math.abs(dz)<1e-9&&(z<=minZ||z>=maxZ)))continue;
   const tx1=dx?(minX-x)/dx:-Infinity,tx2=dx?(maxX-x)/dx:Infinity,tz1=dz?(minZ-z)/dz:-Infinity,tz2=dz?(maxZ-z)/dz:Infinity;
   const nearX=Math.min(tx1,tx2),nearZ=Math.min(tz1,tz2),entry=Math.max(nearX,nearZ),exit=Math.min(Math.max(tx1,tx2),Math.max(tz1,tz2));
   if(entry>=-1e-9&&entry<=earliest&&entry<=exit&&exit>=0){earliest=Math.max(0,entry);axis=nearX>nearZ?'x':'z';}
  }
  if(!axis){x+=dx;z+=dz;break;}
  const safe=Math.max(0,earliest-1e-6);x+=dx*safe;z+=dz*safe;const remaining=1-earliest;
  if(axis==='x'){dx=0;dz*=remaining;hitX=true;}else{dz=0;dx*=remaining;hitZ=true;}
 }
 position.x=x;position.z=z;return {hitX,hitZ};
}
