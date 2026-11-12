import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createSportsCar} from './sports-car.js';
import {vehicleInfo} from './vehicles.js';

let studio=null,observer=null,queue=[],generation=0,running=false;
const cache=new Map();
function createStudio(){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:true});renderer.setSize(440,240);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3.2,3.2,1.745,-1.745,.1,40);camera.position.set(6.4,3.4,-6.9);camera.lookAt(0,.82,0);
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.06).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight('#ecf5ff','#3f443f',2));const key=new THREE.DirectionalLight('#fff1da',3);key.position.set(2,7,-5);scene.add(key);const fill=new THREE.DirectionalLight('#bbdfff',2);fill.position.set(-4,4,2);scene.add(fill);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(2.3,64),new THREE.MeshBasicMaterial({color:'#080f13',transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(.55,1.1,1);shadow.position.y=-.02;scene.add(shadow);
 return {renderer,scene,camera};
}
function thumbnail(model){
 if(cache.has(model.id))return cache.get(model.id);
 studio??=createStudio();const materials=new Set(),mechanics=Object.fromEntries(['engine','gearbox','battery','radiator'].map(id=>[id,new THREE.Group()]));
 const built=createSportsCar({model,mechanics,createPanel:(id,geometry,parent)=>{const material=new THREE.MeshPhysicalMaterial({color:model.color,metalness:.55,roughness:.35,side:THREE.DoubleSide});materials.add(material);const mesh=new THREE.Mesh(geometry,material);mesh.userData.panel=id;parent.add(mesh);return mesh;}});
 try{studio.scene.add(built.car);studio.renderer.render(studio.scene,studio.camera);const url=studio.renderer.domElement.toDataURL('image/png');cache.set(model.id,url);if(cache.size>96)cache.delete(cache.keys().next().value);return url;}
 finally{studio.scene.remove(built.car);built.dispose();for(const mat of materials)mat.dispose();studio.renderer.renderLists.dispose();}
}
async function drain(){
 if(running)return;running=true;
 try{while(queue.length){await new Promise(requestAnimationFrame);const job=queue.shift();if(!job||job.generation!==generation||!job.image.isConnected)continue;try{job.image.src=thumbnail(vehicleInfo({vehicleModel:job.id}));job.image.parentElement.classList.add('ready');}catch(error){console.warn('Vehicle preview unavailable',error);job.image.remove();}}}
 finally{running=false;}
}
export function stopVehiclePreviews(){generation++;queue=[];observer?.disconnect();observer=null;}
export function attachVehiclePreviews(container){
 stopVehiclePreviews();
 observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const image=entry.target.querySelector('[data-preview-model]');observer?.unobserve(entry.target);if(!image)continue;queue.push({image,id:image.dataset.previewModel,generation});}void drain();},{root:container,rootMargin:'100px'});
 for(const image of container.querySelectorAll('[data-preview-model]')){if(cache.has(image.dataset.previewModel)){image.src=cache.get(image.dataset.previewModel);image.parentElement.classList.add('ready');}else observer.observe(image.parentElement);}
}
