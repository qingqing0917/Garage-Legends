import catalog from '../data/vehicle-catalog.json' with {type:'json'};
import familyCatalog from '../data/family-catalog.json' with {type:'json'};
import globalCatalog from '../data/global-catalog.json' with {type:'json'};
import {vehicleDesign,DESIGN_COLORS} from './vehicle-designs.js';
import {bodyFeatures,DOOR_TYPES,matchesBodyFeature} from './body-features.js';

export const BRAND_ALIASES={'Ferrari':'法拉利','Lamborghini':'兰博基尼','Porsche':'保时捷','McLaren':'迈凯伦','Bugatti':'布加迪','Koenigsegg':'科尼赛克 柯尼塞格','Pagani':'帕加尼','Aston Martin':'阿斯顿马丁','Mercedes-Benz':'奔驰','Mercedes-AMG':'奔驰 AMG','BMW':'宝马','Audi':'奥迪','Toyota':'丰田','Nissan':'日产 尼桑','Mazda':'马自达','Honda':'本田','Acura':'讴歌','Lexus':'雷克萨斯 凌志','Chevrolet':'雪佛兰 科尔维特','Ford':'福特','Dodge':'道奇','Lotus':'路特斯 莲花','Alpine':'阿尔派','Maserati':'玛莎拉蒂','Alfa Romeo':'阿尔法罗密欧','Subaru':'斯巴鲁','Mitsubishi':'三菱','Jaguar':'捷豹','Bentley':'宾利','Rimac':'锐马克','Tesla':'特斯拉','MG':'名爵','BYD':'比亚迪 仰望','Yangwang':'仰望','GAC':'广汽','Aion':'广汽 昊铂','Peugeot':'标致','Renault':'雷诺','TVR':'特威尔','KTM':'KTM','RUF':'如虎','Shelby':'谢尔比','SSC':'西尔贝','Hennessey':'轩尼诗'};
Object.assign(BRAND_ALIASES,{'Jeep':'吉普','Land Rover':'路虎','GMC':'通用 GMC','Hyundai':'现代','Kia':'起亚','Volkswagen':'大众','Volvo':'沃尔沃','Honda':'本田','Ford':'福特','Cadillac':'凯迪拉克','Buick':'别克','Hongqi':'红旗','Geely':'吉利','Chery':'奇瑞','Haval':'哈弗','Tank':'坦克','Tesla':'特斯拉'});
export const BODY_TYPES={sport:'运动轿跑',wedge:'楔形超跑',gt:'长车头 GT',round:'圆灯跑车',roadster:'敞篷跑车',classic:'复古跑车',muscle:'肌肉跑车',prototype:'赛道原型车',sedan:'轿车',suv:'SUV',offroad:'越野车'};
const hash=text=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
function bodyType(r){
 if(r.vehicleClass)return r.vehicleClass;
 const text=`${r.brand} ${r.model}`,open=/roadster|spyder|spider|speedster|barchetta|cabriolet|convertible/i.test(r.styles)&&!/coup/i.test(r.styles);
 if(/prototype|racecar/i.test(r.styles)||/^(SC63|963|919 Hybrid\/ Evo|TS040 Hybrid|GR010 Hybrid|Solus GT)$/.test(r.model))return 'prototype';
 if(open)return 'roadster';
 if(r.year<1970)return 'classic';
 if(/Porsche|RUF/.test(r.brand)&&!/924|944|928|968|911 GT1/.test(r.model))return 'round';
 if(/Camaro|Mustang|Challenger|Charger|Viper|Firebird|GTO|Corvette C[1-5]/i.test(text))return 'muscle';
 if(/Lamborghini|Pagani|Koenigsegg|McLaren|Bugatti|Rimac|SSC|Hennessey/.test(r.brand)||/F40|F50|Enzo|LaFerrari|SF90|F8 |488|296|Valkyrie|Valhalla|GT-R|NSX|Corvette C8/.test(r.model))return 'wedge';
 if(/Aston Martin|Jaguar|Maserati|Mercedes|Bentley/.test(r.brand)||/812|599|F12|Roma|Portofino|California|Supra/.test(r.model))return 'gt';
 return 'sport';
}
const baselines={sport:[290,1280,1.17,10],wedge:[570,1320,1.32,11.3],gt:[430,1510,1.20,10.6],round:[380,1310,1.28,10.8],roadster:[210,1060,1.16,10],classic:[170,1040,1.10,9.5],muscle:[360,1540,1.15,10.4],prototype:[610,950,1.45,12],sedan:[210,1500,1.13,10],suv:[260,1900,1.12,10],offroad:[275,2200,1.1,9.8]};
const featuredNames=['Ferrari|F40','Lamborghini|Revuelto','Porsche|918 Spyder','McLaren|720S','Bugatti|Chiron','Koenigsegg|Jesko','Pagani|Huayra','Ferrari|LaFerrari','Lamborghini|Aventador SVJ','Porsche|718 Cayman GT4 RS','McLaren|P1/ P1 GTR','Nissan|GT-R','Toyota|GR Supra','Mazda|MX-5','Audi|R8','Chevrolet|Corvette C8','Aston Martin|Valkyrie','Ferrari|488 GTB','Lotus|Emira','Lexus|LFA'];
// These are deliberately game-balanced tiers, not a manufacturer specification database.
const featuredPerformance={
 'Ferrari|F40':[480,1200,1.28,11], 'Lamborghini|Revuelto':[820,1680,1.42,12], 'Porsche|918 Spyder':[760,1550,1.42,12],
 'McLaren|720S':[720,1420,1.38,11.8], 'Bugatti|Chiron':[920,1850,1.40,12], 'Koenigsegg|Jesko':[900,1420,1.46,12.4],
 'Pagani|Huayra':[720,1350,1.38,11.8], 'Ferrari|LaFerrari':[850,1450,1.44,12.2], 'Lamborghini|Aventador SVJ':[760,1525,1.43,12],
 'Porsche|718 Cayman GT4 RS':[500,1410,1.42,11.8], 'McLaren|P1/ P1 GTR':[790,1450,1.42,12], 'Nissan|GT-R':[560,1680,1.30,11.3],
 'Toyota|GR Supra':[340,1450,1.22,10.7], 'Mazda|MX-5':[180,1030,1.18,10.2], 'Audi|R8':[570,1510,1.31,11.5],
 'Chevrolet|Corvette C8':[500,1480,1.30,11.4], 'Aston Martin|Valkyrie':[880,1180,1.48,12.5], 'Ferrari|488 GTB':[670,1475,1.34,11.6],
 'Lotus|Emira':[400,1400,1.28,11], 'Lexus|LFA':[550,1480,1.32,11.5]
};
function decorate(r){
 const key=`${r.brand}|${r.model}`,seed=hash(key),body=bodyType(r);
 const performanceType=body==='roadster'&&/Ferrari|Lamborghini|McLaren|Pagani|Koenigsegg|Bugatti|Rimac/.test(r.brand)?'wedge':body==='roadster'&&/Aston Martin|Mercedes|Maserati|Jaguar|Bentley/.test(r.brand)?'gt':body;
 const base=baselines[performanceType],preset=featuredPerformance[key];
 const era=r.year==null?1:r.year<1980?.70:r.year<2000?.86:1;
 const hp=preset?.[0]??Math.round((base[0]+(seed%9-4)*15)*era/5)*5,mass=preset?.[1]??base[1]+(seed%7-3)*25;
 const shades=r.brand==='Ferrari'?['#cf2924','#e5bc30','#e0ddd3']:r.brand==='Lamborghini'?['#b3cb30','#e2a02f','#446caa']:r.brand==='McLaren'?['#ef8b27','#d5dde0','#389b98']:r.brand==='Bugatti'?['#315ab1','#216c89','#989b9e']:['#bf3435','#e1ded5','#3c7994','#dbab44','#426d54','#868b92'];
 const wing=body==='prototype'||/GT3|GT2|GT4|GTR|RS|SVJ|STO|Senna|F40|Pista|Performante|NISMO|Agera|Jesko|Huayra|Zonda/i.test(r.model);
 return {...r,name:r.model,badge:body==='sedan'?'SEDAN':body==='suv'?'SUV':body==='offroad'?'4X4':body==='wedge'?'SUPER':body==='prototype'?'TRACK':body==='gt'?'GT':'SPORT',label:BODY_TYPES[body],year:r.years,engine:'游戏动力 · '+BODY_TYPES[body],hp,mass,grip:preset?.[2]??base[2]+(seed%4)*.012,brake:preset?.[3]??base[3],topGear:hp>650?350:body==='classic'?230:body==='prototype'?310:body==='wedge'?340:285,topSpeed:Math.round(190+Math.sqrt(hp)*4.7),color:r.brand==='Porsche'&&preset?'#bbc6ca':shades[preset?0:seed%shades.length],description:`${r.brand} · ${r.years} · ${r.concept?'概念车型':BODY_TYPES[body]}`,gameSpecs:true,featured:featuredNames.indexOf(key),searchText:`${r.brand} ${BRAND_ALIASES[r.brand]||''} ${r.model} ${r.years} ${r.styles||''} ${BODY_TYPES[body]}`.toLowerCase(),design:{body,wing,width:.94+(seed%6)*.018,length:.92+(seed%7)*.025,height:body==='wedge'?.88:body==='muscle'?1.08:body==='round'?1.05:body==='prototype'?.80:1,cabinShift:body==='gt'?.29:body==='muscle'?.18:body==='wedge'?-.16:0,roundLights:['round','classic','roadster'].includes(body),spokes:5+seed%6,brand:r.brand}};
}
const originals = [
  {id:'r86',name:'R-86',badge:'COUPÉ',label:'经典双门轿跑',year:'1986',engine:'1.8L · 直列四缸',hp:118,mass:1180,grip:1.04,brake:9.2,topGear:212,topSpeed:205,color:'#bf5b31',description:'复古方正车身，保留你的修复故事。'},
  {id:'aero',name:'AERO S1',badge:'SPORT',label:'现代运动跑车',year:'2026',engine:'2.0T · 运动引擎',hp:228,mass:1140,grip:1.18,brake:10.2,topGear:265,topSpeed:250,color:'#d83832',description:'流线车身、LED 灯、宽体轮拱与运动轮圈。'}
];
function catalogEntry(row){const v=decorate(row);if(row.id.startsWith('global-')){v.label=row.styles.split(' ')[0];v.badge='AUTO';v.engine=`游戏动力 · ${v.label}`;}return v;}
export const VEHICLES=[...originals.map(v=>({...v,brand:'EMBER',source:'',searchText:`${v.name} 原创 经典 跑车`,design:{body:v.id==='r86'?'classic':'sport',wing:v.id==='aero'},featured:-1})),...[...catalog,...familyCatalog,...globalCatalog].map(catalogEntry)].map(v=>{v={...v,design:vehicleDesign(v),color:DESIGN_COLORS[`${v.brand}|${v.name}`]||v.color};const features=bodyFeatures(v);return {...v,features,searchText:`${v.searchText} ${v.design.label} ${v.design.cues} ${features.interactive?DOOR_TYPES[features.doors]:''} ${features.doors==='gullwing'?'欧翼门 gullwing':''} ${features.convertible?'敞篷 开篷 合篷 可开合车顶':''}`};});
const byId=new Map(VEHICLES.map(v=>[v.id,v]));
export function vehicleInfo(state){return byId.get(state.vehicleModel)||VEHICLES[0];}
export const CATALOG_COUNT=catalog.length+familyCatalog.length+globalCatalog.length;
export const BRANDS=[...new Set([...catalog,...familyCatalog,...globalCatalog].map(v=>v.brand))].sort((a,b)=>a.localeCompare(b));
export function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function filterVehicles({query='',brand='',body='',feature='',sort='featured',lowFast=false}={}){
 const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const list=VEHICLES.filter(v=>(!brand||v.brand===brand)&&(!body||v.design.body===body)&&(!lowFast||['wedge','prototype'].includes(v.design.body))&&matchesBodyFeature(v,feature)&&tokens.every(t=>v.searchText.toLowerCase().includes(t)));
 return list.sort((a,b)=>lowFast?b.topSpeed-a.topSpeed:sort==='power'?b.hp-a.hp:sort==='year'?(parseInt(b.year)||0)-(parseInt(a.year)||0):sort==='name'?`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`):((a.featured<0?9999:a.featured)-(b.featured<0?9999:b.featured))||`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
}
