import {VEHICLES,vehicleInfo} from './vehicles.js';
import {visualMods} from './visual-mods.js';
export {VEHICLES,vehicleInfo} from './vehicles.js';
export const SAVE_KEY = 'ember-garage-v1';
export const ECONOMY = {version:1,startingGrant:{salvage:30000,scratch:50000},dailyGrant:100000000,racePrizes:[8000,6000,4000,2500]};
export const REST_REWARD='1'+'0'.repeat(100);
export function credits(value){return BigInt(value);}
export function formatCredits(value){
 const n=credits(value),negative=n<0n,digits=(negative?-n:n).toString();
 if(digits.length<=15)return n.toLocaleString('en-US');
 const tail=digits.slice(1,7).replace(/0+$/,'');
 return `${digits.slice(7).includes('1')||/[2-9]/.test(digits.slice(7))?'≈':''}${negative?'-':''}${digits[0]}${tail?'.'+tail:''}e${digits.length-1}`;
}
export function adjustCredits(state,amount){
 const result=credits(state.money)+credits(amount);
 state.money=result<=BigInt(Number.MAX_SAFE_INTEGER)&&result>=BigInt(Number.MIN_SAFE_INTEGER)?Number(result):result.toString();
}
export const PARTS = [
  { id:'engine', name:'动力总成', short:'发动机', category:'动力', price:3200, repair:720, initial:28 },
  { id:'gearbox', name:'五速手动变速箱', short:'变速箱', category:'传动', price:1800, repair:420, initial:46 },
  { id:'radiator', name:'铝制散热器', short:'散热器', category:'冷却', price:680, repair:200, initial:32 },
  { id:'battery', name:'12V 启动蓄电池', short:'蓄电池', category:'电气', price:480, repair:160, initial:0 },
  { id:'wheelFL', name:'左前轮组', short:'左前轮', category:'行走', price:620, repair:140, initial:38 },
  { id:'wheelFR', name:'右前轮组', short:'右前轮', category:'行走', price:620, repair:140, initial:25 },
  { id:'wheelRL', name:'左后轮组', short:'左后轮', category:'行走', price:620, repair:140, initial:52 },
  { id:'wheelRR', name:'右后轮组', short:'右后轮', category:'行走', price:620, repair:140, initial:40 },
];
export const PANELS = ['hood','trunk','left','right','roof','front','rear'];
export const COLORS = [
  {name:'熔岩红',hex:'#d83832'},
  {name:'火山橙',hex:'#bf5b31'}, {name:'深海蓝',hex:'#245368'},
  {name:'松针绿',hex:'#3a6659'}, {name:'象牙白',hex:'#ddd7c6'},
  {name:'石墨灰',hex:'#50575b'}, {name:'莓果红',hex:'#872f3e'},
];
export function createGame(route='salvage') {
  const salvage=route==='salvage',grant=ECONOMY.startingGrant[route],purchase=salvage?1800:5500;
  return ensureCareer({version:1,economyVersion:ECONOMY.version, route, money:grant-purchase, grant, purchase,
    day:1,hour:8,totalHours:0,started:true,claimedDays:[1],paint:'#bf5b31',selected:'engine',
    parts:Object.fromEntries(PARTS.map(p=>[p.id,{installed:salvage,owned:salvage,condition:salvage?p.initial:100}])),
    panels:Object.fromEntries(PANELS.map(id=>[id,{rust:salvage?0:1,sand:salvage?0:1,paint:0,strokes:[]}])),
    history:[salvage?'支付 1,800 CR，R-86 废车已入库。':'支付 5,500 CR，R-86 底盘与白车身已入库。'],
    finished:false, running:false});
}
export function log(state,message) {state.history.unshift(message);state.history=state.history.slice(0,24);}
export const SALVAGE_LABELS={crash:'事故车',aged:'老旧车',flood:'泡水车',intact:'外观完整 · 缺少零件'};
export function makeSalvageProject(state,random=Math.random){
 if(!state.started||state.running||state.raceActive)return {ok:false,message:'请先结束比赛并关闭发动机，再开始修车。'};
 const roll=random(),type=roll<.01?'intact':roll<.34?'crash':roll<.67?'aged':'flood';
 const conditions={crash:[24,40,18,60,20,42,70,64],aged:[34,38,29,14,40,38,42,35],flood:[20,32,36,8,58,52,60,55],intact:[0,78,85,0,90,90,90,90]}[type];
 state.parts=Object.fromEntries(PARTS.map((spec,i)=>{
  const missing=type==='intact'&&(spec.id==='engine'||spec.id==='battery');
  return [spec.id,{owned:!missing,installed:!missing,condition:conditions[i]}];
 }));
 state.panels=Object.fromEntries(PANELS.map(id=>{
  const clean=type==='intact'||type==='crash'&&!['hood','front','left'].includes(id);
  return [id,{rust:clean?1:0,sand:clean?1:0,paint:clean?1:0,strokes:[],damage:clean?'':type}];
 }));
 state.route='salvage';state.salvageType=type;state.selected='engine';state.finished=false;
 log(state,`废车场找到 ${vehicleInfo(state).name}：${SALVAGE_LABELS[type]}，等待修复。`);
 return {ok:true,type,message:`已找到${SALVAGE_LABELS[type]}，开始修复当前车型。`};
}
export function switchVehicle(state,id){
 const next=VEHICLES.find(v=>v.id===id);
 if(!next)return {ok:false,message:'未找到这个车型。'};
 if(!state.started||state.raceActive||state.running)return {ok:false,message:'请先结束比赛并关闭发动机，再更换车型。'};
 ensureCareer(state);
 if(state.vehicleModel===id)return {ok:false,message:'已经在驾驶这辆车。'};
 state.vehicleFinishes[state.vehicleModel]={paint:state.paint,panels:structuredClone(state.panels),finished:state.finished};
 const finish=state.vehicleFinishes[id];
 state.vehicleModel=id;
 state.paint=finish?.paint||next.color;
 state.panels=finish?structuredClone(finish.panels):Object.fromEntries(PANELS.map(panel=>[panel,{rust:1,sand:1,paint:1,strokes:[]}]));
 state.finished=finish?.finished||false;
 log(state,`免费换上 ${next.name}，资金、机械部件、改装与调校已保留。`);
 return {ok:true,message:`已换上 ${next.name}！原有改装和调校已转移。`};
}
export function roofIsOpen(state){
 const model=vehicleInfo(state),saved=state.vehicleRoofs?.[model.id];
 return model.features.convertible&&(typeof saved==='boolean'?saved:model.features.defaultRoofOpen);
}
export function setRoofOpen(state,open){
 if(!state.started||state.running||state.raceActive)return {ok:false,message:'请先停车并关闭发动机，再开合车顶。'};
 const model=vehicleInfo(state);
 if(!model.features.convertible)return {ok:false,message:'这辆车采用固定车顶，可在收藏馆选择可开合车顶车型。'};
 ensureCareer(state);state.vehicleRoofs[model.id]=!!open;
 return {ok:true,message:open?'车顶收起，切换为敞篷。':'车顶展开，切换为有顶篷。'};
}
export function advanceTime(state,hours) {
  state.hour+=hours;state.totalHours+=hours;
  while(state.hour>=20){state.hour-=12;state.day++;}
}
export function claimGrant(state) {
  if(!state.started||state.raceActive)return {ok:false,message:'请在工坊或性能店领取补助。'};
  if(state.claimedDays.includes(state.day)) return {ok:false,message:'今天的补助已经领取。完成工作会推进游戏时间。'};
  adjustCredits(state,ECONOMY.dailyGrant);state.claimedDays.push(state.day);log(state,`第 ${state.day} 天，领取工坊补助 +${ECONOMY.dailyGrant.toLocaleString('en-US')} CR。`);
  return {ok:true,reward:ECONOMY.dailyGrant,message:`今日补助 +${ECONOMY.dailyGrant.toLocaleString('en-US')} CR 已到账。`};
}
export function restToNextDay(state){
 if(!state.started||state.raceActive||state.running)return {ok:false,message:'请先结束比赛并关闭发动机，再休息到次日。'};
 state.day++;state.hour=8;adjustCredits(state,REST_REWARD);
 log(state,`休息到第 ${state.day} 天 08:00，获得 1 古戈尔 CR。`);
 return {ok:true,reward:REST_REWARD,message:`已到第 ${state.day} 天，1 古戈尔 CR 已到账。`};
}
export function prepareCarQuote(state){
 const jobs=PARTS.filter(p=>!state.parts[p.id].owned||!state.parts[p.id].installed||state.parts[p.id].condition<100);
 let cost=0,hours=0;
 for(const spec of jobs){const p=state.parts[spec.id];
  if(!p.owned){cost+=spec.price;hours+=.75;}
  else if(p.condition<100){cost+=spec.repair;hours+=(p.installed?.5:0)+2+.75;}
  else hours+=.75;
 }
 return {count:jobs.length,cost,hours};
}
export function prepareCar(state){
 if(!state.started||state.running||state.raceActive)return {ok:false,message:'请先结束比赛并关闭发动机，再进行整备。'};
 const quote=prepareCarQuote(state);
 if(!quote.count)return {ok:false,message:'全部机械部件已经装齐且状态完好。'};
 if(credits(state.money)<BigInt(quote.cost))return {ok:false,message:'整备资金不足，点击「休息到次日」即可领取奖励。'};
 adjustCredits(state,-quote.cost);for(const p of Object.values(state.parts)){p.owned=true;p.installed=true;p.condition=100;}
 advanceTime(state,quote.hours);log(state,`一键整备完成：${quote.count} 个机械部件已修好装齐，支出 ${quote.cost.toLocaleString('en-US')} CR。`);
 return {ok:true,message:'机械部件已全部装齐、恢复至 100%。可以点火，或前往改装与调校。'};
}
export function migrateEconomy(state){
 if(state.economyVersion>=ECONOMY.version)return 0;
 const previous=Number.isFinite(state.grant)?state.grant:(state.route==='salvage'?8000:18000),grant=ECONOMY.startingGrant[state.route];
 const bonus=Math.max(0,grant-previous);adjustCredits(state,bonus);state.grant=Math.max(previous,grant);state.economyVersion=ECONOMY.version;
 if(bonus)log(state,`启动资金补发 +${bonus.toLocaleString('en-US')} CR，原有车辆和改装进度已保留。`);
 return bonus;
}
export function work(state,action,id) {
  const spec=PARTS.find(p=>p.id===id),p=state.parts[id];
  if(!p||!spec)return {ok:false,message:'先选择一个车辆部件。'};
  if(state.running)return {ok:false,message:'请先关闭发动机，再进行拆装。'};
  if(action==='remove') {
    if(!p.installed)return {ok:false,message:'这个部件已经拆下。'};
    p.installed=false;advanceTime(state,.5);log(state,`拆下${spec.short}，已放到工作台。`);
    return {ok:true,message:`${spec.short}已拆下。可以检修后重新安装。`};
  }
  if(action==='repair') {
    if(!p.owned)return {ok:false,message:'工作台还没有这个部件，请先购买。'};
    if(p.installed)return {ok:false,message:'先拆下部件，才能在工作台上检修。'};
    if(p.condition===100)return {ok:false,message:'这个部件状态完好，无需维修。'};
    if(credits(state.money)<BigInt(spec.repair))return {ok:false,message:'余额不足。可点击「休息到次日」立即领取奖励。'};
    adjustCredits(state,-spec.repair);p.condition=100;advanceTime(state,2);log(state,`检修${spec.short}，支出 ${spec.repair} CR。`);
    return {ok:true,message:`${spec.short}检修完成，状态恢复至 100%。`};
  }
  if(action==='install') {
    if(p.installed)return {ok:false,message:'这个部件已经装在车上。'};
    if(!p.owned){
      if(credits(state.money)<BigInt(spec.price))return {ok:false,message:'余额不足。可点击「休息到次日」立即领取奖励。'};
      adjustCredits(state,-spec.price);p.owned=true;p.condition=100;
    }
    p.installed=true;advanceTime(state,.75);log(state,`安装${spec.short}。`);
    return {ok:true,message:`${spec.short}已安装到固定接口。`};
  }
  return {ok:false,message:'未知操作。'};
}
export function panelStats(state) {
  const all=Object.values(state.panels);
  return Object.fromEntries(['rust','sand','paint'].map(k=>[k,all.reduce((s,p)=>s+p[k],0)/all.length]));
}
export function progress(state){
  const mechanical=PARTS.reduce((s,p)=>s+(state.parts[p.id].installed?state.parts[p.id].condition/100:0),0)/PARTS.length;
  const b=panelStats(state);const complete=mechanical===1&&['rust','sand','paint'].every(k=>b[k]===1);return complete?100:Math.min(99,Math.round((mechanical*.55+(b.rust+b.sand+b.paint)/3*.45)*100));
}
export function inspection(state) {
  const faults=[];
  for(const spec of PARTS){const p=state.parts[spec.id];if(!p.installed)faults.push(`${spec.short}尚未安装`);else if(p.condition<70)faults.push(`${spec.short}需要检修（${p.condition}%）`);}
  return {ready:faults.length===0,faults};
}
export function surfaceAllowed(state,panel,tool){
  if(state.running)return '先关闭发动机，再进行车身作业。';
  if(tool==='sand'&&panel.rust<1)return '这块面板还有锈迹，先使用除锈工具。';
  if(tool==='paint'&&panel.sand<1)return '这块面板还没打磨好，先完成除锈和打磨。';
  return '';
}
export function applyStroke(state,panelId,tool,u,v,radius=.12){
  const panel=state.panels[panelId];
  if(!panel||!['rust','sand','paint'].includes(tool))return {ok:false,message:'把工具移到车身面板上。'};
  const blocked=surfaceAllowed(state,panel,tool);if(blocked)return {ok:false,message:blocked};
  if(panel[tool]>=1)return {ok:false,complete:true,message:'这块面板已完成当前工序。'};
  const size=16,covered=new Set(),eligible=new Set();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    // The sports body's lower fascias are covered by fixed intake/diffuser trim.
    if(state.vehicleModel&&state.vehicleModel!=='r86'&&panelId==='front'&&v<.64)continue;
    if(state.vehicleModel&&state.vehicleModel!=='r86'&&panelId==='rear'&&(v<.45||v>.85))continue;
    if((!state.vehicleModel||state.vehicleModel==='r86')&&['left','right'].includes(panelId)){
      const px=u*4.5-2.25,py=v*.65+.45;
      const arch=Math.min(Math.abs(px-1.43),Math.abs(px+1.43));
      const bottom=arch<.47?.44+Math.sqrt(.47*.47-arch*arch):.44;
      const top=Math.abs(px)>1.9?.94:1.045;
      if(py<bottom||py>top||Math.abs(px)>2.2)continue;
    }
    if((!state.vehicleModel||state.vehicleModel==='r86')&&panelId==='front'){
      const px=Math.abs(u*1.68-.84),py=.57+v*.38;
      if(py<.61||(px>.365&&py>.665)||(px<.28&&py>.695)||(px>.70&&py<.63))continue;
    }
    if((!state.vehicleModel||state.vehicleModel==='r86')&&panelId==='rear'){
      const px=Math.abs(u*1.68-.84),py=.56+v*.38;
      if(py<.61||(px>.325&&py>.685)||(px<.19&&py>.66&&py<.78))continue;
    }
    eligible.add(y*size+x);
  }
  const strokes=panel.strokes.filter(s=>s.t===tool);
  for(const s of [...strokes,{u,v,r:radius}])for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    if(eligible.has(y*size+x)&&Math.hypot((x+.5)/size-s.u,(y+.5)/size-s.v)<=s.r)covered.add(y*size+x);
  }
  const coverage=Math.min(1,covered.size/(eligible.size*.85));
  if(coverage<=panel[tool]+.0001)return {ok:false,quiet:true};
  panel.strokes.push({t:tool,u,v,r:radius});
  const previous=panel[tool];panel[tool]=coverage;
  if(tool==='paint'&&coverage===1)delete panel.damage;
  advanceTime(state,(coverage-previous)*.7);
  if(coverage===1)log(state,`${{hood:'引擎盖',trunk:'后备厢',left:'左侧车身',right:'右侧车身',roof:'车顶',front:'前围',rear:'后围'}[panelId]}${{rust:'除锈',sand:'打磨',paint:'喷漆'}[tool]}完成。`);
  return {ok:true,complete:coverage===1};
}
export function setPaint(state,color){
  if(state.paint===color)return;
  state.paint=color;
  for(const p of Object.values(state.panels)){p.paint=0;p.strokes=p.strokes.filter(s=>s.t!=='paint');}
  log(state,'更换车漆颜色，重新开始喷漆工序。');
}
export function saveGame(state,storage=localStorage){storage.setItem(SAVE_KEY,JSON.stringify({...state,running:false}));}
export function loadGame(storage=localStorage){
  try {const s=JSON.parse(storage.getItem(SAVE_KEY));
    if(s?.version!==1||!['salvage','scratch'].includes(s.route)||!(Number.isInteger(s.money)&&s.money>=0||typeof s.money==='string'&&/^\d+$/.test(s.money))||!Number.isFinite(s.hour)||!Array.isArray(s.claimedDays)||!Array.isArray(s.history))return null;
    if(!PARTS.every(p=>s.parts?.[p.id]&&Number.isFinite(s.parts[p.id].condition)))return null;
    if(!PANELS.every(id=>s.panels?.[id]&&Array.isArray(s.panels[id].strokes)&&['rust','sand','paint'].every(k=>Number.isFinite(s.panels[id][k]))))return null;
    adjustCredits(s,0);s.running=false;ensureCareer(s);if(s.raceActive){log(s,'上次比赛已中断，已发生的车辆损伤保留，未发放奖金。');s.raceActive=null;}
    if(!(s.economyVersion>=ECONOMY.version)){migrateEconomy(s);try{saveGame(s,storage);}catch{}}
    return s;
  }catch{return null;}
}

const BUILD_PROJECT_KEY='ember-garage-build-project-v1', PREVIOUS_PROJECT_KEY='ember-garage-previous-project-v1';
export function switchBuildProject(state,storage=localStorage){
 if(!state.started||state.running||state.raceActive)return {ok:false,message:'请先结束比赛并关闭发动机，再切换项目。'};
 const returning=state.projectSlot==='build',sourceKey=returning?BUILD_PROJECT_KEY:PREVIOUS_PROJECT_KEY,targetKey=returning?PREVIOUS_PROJECT_KEY:BUILD_PROJECT_KEY;
 try{
  const raw=storage.getItem(targetKey);
  const target=raw===null&&!returning?createGame('scratch'):loadGame({getItem:()=>raw,setItem:()=>{}});
  if(!target)return {ok:false,message:'无法读取另一个项目，当前进度未更改。'};
  if(!returning)target.projectSlot='build';
  storage.setItem(sourceKey,JSON.stringify({...state,running:false}));
  saveGame(target,storage);
  return {ok:true,state:target,returning};
 }catch{return {ok:false,message:'无法保存项目，当前进度未更改。请检查浏览器存储空间。'};}
}

export const TUNE_DEFAULT = { finalDrive:4.1, suspension:55, brakeBias:62, tirePressure:29 };
export const TUNE_LIMITS = {
 finalDrive:{min:3.2,max:4.8,step:.05,label:'终传齿比',unit:'',hint:'短齿比起步更快，长齿比保留高速余量。'},
 suspension:{min:25,max:85,step:1,label:'悬挂硬度',unit:'%',hint:'偏硬响应更快，但颠簸路面和极限过弯更挑操作。'},
 brakeBias:{min:50,max:75,step:1,label:'前轮制动力',unit:'%',hint:'向后分配更灵活，重刹时也更容易甩尾。'},
 tirePressure:{min:24,max:36,step:1,label:'轮胎气压',unit:'PSI',hint:'适中的胎压获得更好的接地与抓地力。'}
};
export const TUNE_PRESETS = [
 {id:'balanced',name:'均衡街道',desc:'稳定、渐进，适合第一次上赛道。',values:TUNE_DEFAULT},
 {id:'acceleration',name:'加速优先',desc:'缩短齿比，把动力用在出弯加速。',values:{finalDrive:4.65,suspension:58,brakeBias:64,tirePressure:28}},
 {id:'corners',name:'弯道优先',desc:'强化转向响应，保留后轮稳定性。',values:{finalDrive:4.2,suspension:70,brakeBias:60,tirePressure:28}},
 {id:'speed',name:'高速巡航',desc:'拉长齿比，减少高速行驶的转速。',values:{finalDrive:3.5,suspension:45,brakeBias:65,tirePressure:31}}
];
export const MAX_UPGRADE_LEVEL = 100_000_000;
export const UPGRADES = [
 {id:'engine',name:'进排气与 ECU',tag:'ENGINE',cost:[1400,2200,3200],stages:['街道进排气','高流量 ECU','锻造引擎套件'],desc:'提升发动机基础输出，三级累计增加 80 hp。'},
 {id:'turbo',name:'涡轮增压',tag:'BOOST',cost:[1800,2800,4200],stages:['低增压涡轮','中冷增压套件','赛用高增压'],desc:'三级分别增加 30 / 60 / 95 hp，可与引擎改装叠加。建议搭配运动轮胎。'},
 {id:'tires',name:'运动轮胎',tag:'GRIP',cost:[900,1500,2300],stages:['运动街胎','半热熔轮胎','赛道热熔胎'],desc:'增加抓地力，让动力更有效地落地，提升出弯加速和弯速。'},
 {id:'brakes',name:'高温刹车套件',tag:'BRAKING',cost:[700,1100,1800],stages:['高摩擦刹车片','大尺寸刹车盘','赛用多活塞卡钳'],desc:'三级分别提高 10% / 20% / 35% 制动力，缩短制动距离。'},
 {id:'suspension',name:'赛用悬挂',tag:'HANDLING',cost:[800,1300,2000],stages:['运动弹簧','绞牙避震','赛道悬挂套件'],desc:'同时提升轮胎有效抓地和转向响应，帮助车辆更快进入弯道。'},
 {id:'weight',name:'轻量化套件',tag:'WEIGHT',cost:[1000,1600,2400],stages:['轻量电池与座椅','轻量车身附件','赛道轻量化'],desc:'三级累计减重 75 / 150 / 225 kg，改善推重比与加速。'}
];
const upgradeLevel=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(MAX_UPGRADE_LEVEL,Math.floor(Number(value)))):0;
// Three original kits, followed by progressively finer reinforcement up to level 100 million.
const reinforcement=level=>Math.log10(1+Math.max(0,level-3))/Math.log10(MAX_UPGRADE_LEVEL-2);
function totalUpgradeCost(item,level){return item.cost.slice(0,Math.min(3,level)).reduce((sum,cost)=>sum+cost,0)+Math.max(0,level-3)*item.cost[2];}
export function maxAffordableUpgrade(state,id){
 const item=UPGRADES.find(u=>u.id===id);if(!item)return null;
 let level=upgradeLevel(state.upgrades?.[id]),budget=Number(credits(state.money)>BigInt(Number.MAX_SAFE_INTEGER)?BigInt(Number.MAX_SAFE_INTEGER):credits(state.money));
 while(level<3&&budget>=item.cost[level]){budget-=item.cost[level];level++;}
 if(level>=3)level=Math.min(MAX_UPGRADE_LEVEL,level+Math.floor(budget/item.cost[2]));
 return level;
}
export function ensureCareer(s){
 s.careerVersion=6;
 s.vehicleModel=vehicleInfo(s).id;
 visualMods(s);
 if(!s.vehicleFinishes||typeof s.vehicleFinishes!=='object'||Array.isArray(s.vehicleFinishes))s.vehicleFinishes={};
 if(!s.vehicleRoofs||typeof s.vehicleRoofs!=='object'||Array.isArray(s.vehicleRoofs))s.vehicleRoofs={};
 s.drivingAssist=s.drivingAssist!==false;
 s.raceTimeOfDay=s.raceTimeOfDay==='night'?'night':'day';
 s.tuning={...TUNE_DEFAULT,...s.tuning};
 for(const [key,range] of Object.entries(TUNE_LIMITS))s.tuning[key]=Number.isFinite(s.tuning[key])?Math.max(range.min,Math.min(range.max,s.tuning[key])):TUNE_DEFAULT[key];
 s.upgrades=Object.fromEntries(UPGRADES.map(u=>[u.id,upgradeLevel(s.upgrades?.[u.id])]));
 s.tuned=!!s.tuned;s.raceStats={starts:0,finishes:0,wins:0,bestTime:null,bestLap:null,...s.raceStats};
 s.settledRaces=Array.isArray(s.settledRaces)?s.settledRaces:[];
 s.raceActive=s.raceActive||null;
 return s;
}
export function carSpecs(s,tuning=s.tuning){
 ensureCareer(s);const t={...s.tuning,...tuning},u=s.upgrades,model=vehicleInfo(s);
 const engine=s.parts.engine.condition/100,gearbox=s.parts.gearbox.condition/100;
 const wheels=PARTS.filter(p=>p.id.startsWith('wheel')).reduce((n,p)=>n+s.parts[p.id].condition,0)/400;
 const hp=(model.hp+[0,24,48,80][Math.min(3,u.engine)]+[0,30,60,95][Math.min(3,u.turbo)]+240*reinforcement(u.engine)+360*reinforcement(u.turbo))*(.48+.52*engine)*(.85+.15*gearbox);
 const visual=visualMods(s);
 const grip=(model.grip+Math.min(3,u.tires)*.125+Math.min(3,u.suspension)*.025+.4*reinforcement(u.tires)+.1*reinforcement(u.suspension)+(visual.tires==='race'?.12:0))*(1-.0022*(t.tirePressure-29)**2)*(.60+.40*wheels);
 const mass=(model.mass-Math.min(3,u.weight)*75)*(1-.18*reinforcement(u.weight));
 return {hp,mass,torque:hp*1.49,grip,...(visual.fan==='race'?{fanDownforce:.18}:{}),brake:model.brake*(1+[0,.1,.2,.35][Math.min(3,u.brakes)]+.45*reinforcement(u.brakes))*(1-Math.abs(t.brakeBias-62)*.007),finalDrive:t.finalDrive,suspension:t.suspension,brakeBias:t.brakeBias,tirePressure:t.tirePressure,
  steeringResponse:1+(t.suspension-55)*.005+Math.min(3,u.suspension)*.1+.25*reinforcement(u.suspension),engineHealth:engine,estimatedTop:Math.round(Math.min(model.topGear*(4.1/t.finalDrive),model.topSpeed*Math.cbrt(hp/model.hp))),health:Math.min(...PARTS.map(p=>s.parts[p.id].condition))};
}
export function upgradeQuote(state,id,target){
 const s=ensureCareer(structuredClone(state)),item=UPGRADES.find(u=>u.id===id);
 if(!item)return null;
 const level=s.upgrades[id];target=target??Math.min(MAX_UPGRADE_LEVEL,level+1);
 if(!Number.isInteger(target)||target<level||target>MAX_UPGRADE_LEVEL)return null;
 const before=carSpecs(s),cost=totalUpgradeCost(item,target)-totalUpgradeCost(item,level);
 s.upgrades[id]=target;
 return {level,target,cost,hours:Math.min(12,(target-level)*1.5),before,after:carSpecs(s)};
}
export function buyUpgrade(s,id,target){
 ensureCareer(s);const item=UPGRADES.find(u=>u.id===id);if(!item)return {ok:false,message:'未知改装项目。'};
 if(s.raceActive)return {ok:false,message:'请先结束比赛，再安装改装套件。'};
 if(s.running)return {ok:false,message:'请先关闭发动机，再安装改装套件。'};
 if(!inspection(s).ready)return {ok:false,message:'先回工坊修好机械部件，再安装性能套件。'};
 const quote=upgradeQuote(s,id,target);if(!quote||quote.target<=quote.level)return {ok:false,message:'该等级已经安装，或选择的等级无效。'};
 if(credits(s.money)<BigInt(quote.cost))return {ok:false,message:'余额不足。点击底部「休息到次日」立即领取奖励。'};
 adjustCredits(s,-quote.cost);s.upgrades[id]=quote.target;advanceTime(s,quote.hours);log(s,`改装中心安装${item.name} L${quote.target.toLocaleString('en-US')}，支出 ${quote.cost.toLocaleString('en-US')} CR。`);
 return {ok:true,message:`${item.name}已升至 ${quote.target.toLocaleString('en-US')} 级，性能已更新。`};
}
export function applyTuning(s,values){
 ensureCareer(s);if(!inspection(s).ready)return {ok:false,message:'机械部件需要先通过工坊检查。'};
 const next={};for(const [key,range]of Object.entries(TUNE_LIMITS)){const value=Number(values[key]);if(!Number.isFinite(value)||value<range.min||value>range.max)return {ok:false,message:'调校参数超出允许范围。'};next[key]=value;}
 if(s.tuned&&Object.keys(next).every(k=>next[k]===s.tuning[k]))return {ok:false,message:'当前调校方案已经应用。'};
 if(credits(s.money)<200n)return {ok:false,message:'保存调校需要 200 CR，请先领取工坊补助。'};
 adjustCredits(s,-200);s.tuning=next;s.tuned=true;advanceTime(s,1);log(s,'CS 店完成四项性能调校，支出 200 CR。');
 return {ok:true,message:'调校已应用。新的齿比、悬挂、制动与胎压将用于下一场比赛。'};
}
export function raceReadiness(s){
 ensureCareer(s);const faults=[...inspection(s).faults];
 if(!Object.values(s.upgrades).some(v=>v>0)&&visualMods(s).tires!=='race'&&visualMods(s).fan!=='race')faults.push('先在车辆改装界面安装赛车轮胎、抽风装置或性能套件');
 if(!s.tuned)faults.push('先在 CS 店保存一套调校方案');
 return {ready:!faults.length,faults};
}
export function beginRace(s,id,trackName='北郊环线'){
 const check=raceReadiness(s);if(!check.ready)return {ok:false,message:check.faults[0]};
 if(s.raceActive)return {ok:false,message:'当前比赛尚未结算。'};
 if(!id||s.settledRaces.includes(id))return {ok:false,message:'比赛编号已使用。'};
 s.running=false;s.raceActive={id,startedDay:s.day};s.raceStats.starts++;advanceTime(s,3);log(s,`进入${trackName}俱乐部赛：2 圈，3 位 AI 对手。`);
 return {ok:true,message:'比赛开始。'};
}
export function applyRaceDamage(s,impact,side='front'){
 if(!s.raceActive||!Number.isFinite(impact)||impact<=0)return 0;
 const severity=Math.max(1,Math.min(28,Math.round(impact)));
 const affected=side==='rear'?['gearbox','wheelRL','wheelRR']:side==='side'?['wheelFL','wheelFR','wheelRL','wheelRR']:['engine','radiator','wheelFL','wheelFR'];
 for(const id of affected)s.parts[id].condition=Math.max(0,s.parts[id].condition-severity);
 log(s,`赛道碰撞：${side==='front'?'前部':side==='rear'?'后部':'侧面'}部件受损 ${severity}%。`);
 return severity;
}
export function settleRace(s,id,result){
 ensureCareer(s);if(!s.raceActive||s.raceActive.id!==id||s.settledRaces.includes(id))return {ok:false,reward:0};
 const finished=result.finished===true&&Number.isInteger(result.place)&&result.place>=1&&result.place<=4&&Number.isFinite(result.time)&&result.time>0;
 const reward=finished?ECONOMY.racePrizes[result.place-1]:0;
 adjustCredits(s,reward);s.settledRaces.push(id);s.settledRaces=s.settledRaces.slice(-100);s.raceActive=null;
 if(finished){s.raceStats.finishes++;if(result.place===1)s.raceStats.wins++;s.raceStats.bestTime=Math.min(s.raceStats.bestTime??Infinity,result.time);if(Number.isFinite(result.bestLap)&&result.bestLap>0)s.raceStats.bestLap=Math.min(s.raceStats.bestLap??Infinity,result.bestLap);log(s,`俱乐部赛第 ${result.place} 名，奖金 +${reward} CR。`);}else log(s,'比赛未完赛，无奖金；车辆损伤已保留，请回工坊检查。');
 return {ok:true,reward,finished};
}
