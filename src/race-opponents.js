import * as THREE from 'three';
import {createSportsCar} from './sports-car.js';
import {VEHICLES,filterVehicles,escapeHTML} from './vehicles.js';

const byId=new Map(VEHICLES.map(model=>[model.id,model]));
const defaultNames=[['Porsche','718 Cayman GT4 RS'],['Nissan','GT-R'],['Ferrari','F40']];
export const DEFAULT_OPPONENTS=defaultNames.map(([brand,name],i)=>VEHICLES.find(v=>v.brand===brand&&v.name===name)?.id||VEHICLES[i+1].id);
export function normalizeOpponents(ids){return DEFAULT_OPPONENTS.map((fallback,i)=>byId.has(ids?.[i])?ids[i]:fallback);}
export function opponentInfo(id){return byId.get(id)||byId.get(DEFAULT_OPPONENTS[0]);}

// AI performance is scaled into a club-race range while retaining model differences.
export function opponentProfile(model){
 const hp=110+Math.min(900,Math.max(0,model.hp))*0.05;
 return {hp,torque:hp*1.49,mass:1100+Math.max(0,Math.min(1000,model.mass-1000))*.18,grip:Math.max(1.12,Math.min(1.25,model.grip)),brake:Math.max(10,Math.min(11.5,model.brake)),engineHealth:1,steeringResponse:1,finalDrive:4.1,suspension:55,brakeBias:62};
}

export function buildOpponent(model){
 const materials=new Set(),mechanics=Object.fromEntries(['engine','gearbox','battery','radiator'].map(id=>[id,new THREE.Group()]));
 const built=createSportsCar({model,mechanics,createPanel:(id,geometry,parent)=>{const material=new THREE.MeshPhysicalMaterial({color:model.color,metalness:.55,roughness:.35,side:THREE.DoubleSide});materials.add(material);const mesh=new THREE.Mesh(geometry,material);mesh.userData.panel=id;parent.add(mesh);return mesh;}});
 return {model:built.car,dispose(){built.dispose();for(const material of materials)material.dispose();}};
}

export function mountOpponentPicker(entry,state,onChange){
 state.raceOpponents=normalizeOpponents(state.raceOpponents);
 const section=document.createElement('section');section.className='race-opponents';
 section.innerHTML='<label class="opponent-search">搜索对手车型<input type="search" placeholder="品牌或车型，例如 迈凯伦 / 911" autocomplete="off"></label><div class="opponent-selects"></div>';
 entry.querySelector('.entry-facts').before(section);
 const search=section.querySelector('input'),selects=section.querySelector('.opponent-selects');
 function draw(){
  const matches=filterVehicles({query:search.value}).slice(0,60);
  selects.innerHTML=state.raceOpponents.map((id,i)=>{const current=opponentInfo(id),options=matches.some(v=>v.id===id)?matches:[current,...matches];return `<label>对手 ${i+1}<select data-opponent="${i}" aria-label="对手 ${i+1} 车型">${options.map(v=>`<option value="${escapeHTML(v.id)}" ${v.id===id?'selected':''}>${escapeHTML(v.brand+' '+v.name)}</option>`).join('')}</select></label>`;}).join('');
  selects.querySelectorAll('select').forEach(select=>select.onchange=()=>{const slot=Number(select.dataset.opponent);state.raceOpponents[slot]=select.value;onChange(slot,select.value);});
 }
 search.oninput=draw;draw();
}
