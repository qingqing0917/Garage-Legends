import {loadGame, SAVE_KEY} from './game.js';

export const SAVE_KEYS=[SAVE_KEY,'ember-garage-build-project-v1','ember-garage-previous-project-v1'];
const FORMAT='garage-legends-save';
const MAX_BYTES=10*1024*1024;

function validateSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 if(!Number.isInteger(value.day)||value.day<1||!Number.isFinite(value.totalHours)||value.totalHours<0||typeof value.paint!=='string'||typeof value.selected!=='string'||!Array.isArray(value.history)||!value.history.every(s=>typeof s==='string'))return false;
 try{return !!loadGame({getItem:()=>JSON.stringify(value),setItem:()=>{}});}catch{return false;}
}

export function exportSaves(storage,currentState){
 const saves={};
 for(const key of SAVE_KEYS){const raw=key===SAVE_KEY&&currentState?JSON.stringify({...currentState,running:false}):storage.getItem(key);if(raw!==null){const parsed=JSON.parse(raw);if(!validateSave(parsed))throw new Error('存档数据无法读取，请先检查当前游戏进度。');saves[key]=parsed;}}
 if(!saves[SAVE_KEY])throw new Error('当前没有可导出的游戏存档。');
 return JSON.stringify({format:FORMAT,version:1,saves},null,2);
}

export function parseSaveFile(text){
 if(typeof text!=='string'||text.length>MAX_BYTES)throw new Error('存档文件过大或格式不正确。');
 let bundle;try{bundle=JSON.parse(text);}catch{throw new Error('无法读取这个文件，请选择游戏导出的存档。');}
 if(!bundle||bundle.format!==FORMAT||bundle.version!==1||!bundle.saves||typeof bundle.saves!=='object'||Array.isArray(bundle.saves))throw new Error('这不是受支持的游戏存档文件。');
 const keys=Object.keys(bundle.saves);
 if(!keys.includes(SAVE_KEY)||keys.some(key=>!SAVE_KEYS.includes(key))||keys.some(key=>!validateSave(bundle.saves[key])))throw new Error('存档数据不完整或已损坏，原有进度未更改。');
 return Object.fromEntries(keys.map(key=>[key,JSON.stringify({...bundle.saves[key],running:false,raceActive:null})]));
}

export function importSaves(storage,saves){
 const previous=Object.fromEntries(SAVE_KEYS.map(key=>[key,storage.getItem(key)]));
 try{for(const key of SAVE_KEYS){if(Object.hasOwn(saves,key))storage.setItem(key,saves[key]);else storage.removeItem(key);}}
 catch(error){for(const key of SAVE_KEYS){try{if(previous[key]===null)storage.removeItem(key);else storage.setItem(key,previous[key]);}catch{}}throw new Error('无法写入存档，请检查浏览器存储空间。');}
}
