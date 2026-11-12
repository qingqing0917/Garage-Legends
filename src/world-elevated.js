import {resolveWalls,wallBounds} from './world-collision.js';

export const ELEVATED_ROAD={x:-58,width:16,height:7,southEntry:5,southDeck:-25,northDeck:-115,northEntry:-145};
const road=ELEVATED_ROAD;
const rampWalls=[wallBounds(road.x,(road.southEntry+road.southDeck)/2,road.width,road.southEntry-road.southDeck),wallBounds(road.x,(road.northEntry+road.northDeck)/2,road.width,road.northDeck-road.northEntry)];

export function elevatedHeight(z){
 if(z>road.southEntry||z<road.northEntry)return 0;
 if(z>road.southDeck)return (road.southEntry-z)*road.height/(road.southEntry-road.southDeck);
 if(z<road.northDeck)return (z-road.northEntry)*road.height/(road.northDeck-road.northEntry);
 return road.height;
}

export function elevatedSlope(z){
 if(z>road.southDeck&&z<road.southEntry)return -road.height/(road.southEntry-road.southDeck);
 if(z>road.northEntry&&z<road.northDeck)return road.height/(road.northDeck-road.northEntry);
 return 0;
}

// State keeps the upper deck separate from the ground roads directly underneath it.
export function updateElevatedPosition(position,previous,state,radius){
 const rx=typeof radius==='number'?radius:radius.x,rz=typeof radius==='number'?radius:radius.z,limit=road.width/2-rx;
 const dx=position.x-previous.x,dz=position.z-previous.z;
 let hitX=false,hitZ=false;
 if(!state.onBridge&&limit>0&&dz){
  const south=road.southEntry+rz,north=road.northEntry-rz;
  for(const [line,crosses] of [[south,previous.z>=south&&position.z<south],[north,previous.z<=north&&position.z>north]]){
   if(!crosses)continue;const t=(line-previous.z)/dz,x=previous.x+dx*t;
   if(Math.abs(x-road.x)<=limit){state.onBridge=true;break;}
  }
 }
 if(state.onBridge){
  const clamped=Math.max(road.x-limit,Math.min(road.x+limit,position.x));hitX=clamped!==position.x;position.x=clamped;
  if(position.z>road.southEntry+rz||position.z<road.northEntry-rz)state.onBridge=false;
 }else{
  const hit=resolveWalls(position,previous,{x:rx,z:rz},rampWalls);hitX=hit.hitX;hitZ=hit.hitZ;
 }
 state.height=state.onBridge?elevatedHeight(position.z):0;
 return {onBridge:!!state.onBridge,height:state.height,slope:state.onBridge?elevatedSlope(position.z):0,hitX,hitZ};
}

export function buildElevatedRoad({box,material}){
 const deck=material('#505b5f'),barrier=material('#a6b0ab'),mark=material('#f1f0dd'),pillar=material('#858f8b'),slope=Math.atan(road.height/(road.southEntry-road.southDeck));
 function span(z1,z2,y1,y2){
  const z=(z1+z2)/2,y=(y1+y2)/2,angle=Math.atan2(y1-y2,z2-z1),length=Math.hypot(z2-z1,y2-y1);
  const slab=box(road.width,.36,length,deck,road.x,y-.18*Math.cos(angle),z);slab.rotation.x=angle;
  for(const side of [-1,1]){const rail=box(.32,.85,length,barrier,road.x+side*(road.width/2-.16),y+.43,z);rail.rotation.x=angle;}
  const count=Math.floor(length/8);for(let i=0;i<count;i++){const t=(i+.5)/count,marking=box(.18,.03,3.5,mark,road.x,y1+(y2-y1)*t+.025,z1+(z2-z1)*t);marking.rotation.x=angle;}
 }
 span(road.southDeck,road.southEntry,road.height,0);span(road.northDeck,road.southDeck,road.height,road.height);span(road.northEntry,road.northDeck,0,road.height);
 for(const z of [-32,-70,-110])for(const side of [-1,1])box(.85,road.height-.4,.85,pillar,road.x+side*(road.width/2+.55),(road.height-.4)/2,z);
 return {slope};
}
