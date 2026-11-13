import './style.css';
import { createGarage } from './scene.js';
import {openVehiclePicker} from './vehicle-picker.js';
import {stopVehiclePreviews} from './vehicle-thumbnails.js';
import {CATALOG_COUNT,escapeHTML} from './vehicles.js';
import {DOOR_TYPES} from './body-features.js';
import { createCareer, raceTime } from './career.js';
import {exportSaves,parseSaveFile,importSaves} from './save-transfer.js';
import { roofIsOpen, setRoofOpen, vehicleInfo, ECONOMY, formatCredits, restToNextDay, prepareCarQuote, prepareCar, switchBuildProject, makeSalvageProject, SALVAGE_LABELS, SAVE_KEY, PARTS, PANELS, COLORS, createGame, work, claimGrant, advanceTime, progress, panelStats, inspection, applyStroke, setPaint, saveGame, loadGame, log } from './game.js';

const icons={
 logo:'<path d="M6 20V4h8a4 4 0 0 1 0 8H6m7 0 6 8"/>',
 wrench:'<path d="M14.8 6.2a5 5 0 0 0-6.6 6.6L3 18a2.1 2.1 0 0 0 3 3l5.2-5.2a5 5 0 0 0 6.6-6.6l-3.1 3.1-3-3 3.1-3.1Z"/>',
 rust:'<path d="m13 3 8 8-6 6-8-8 6-6Z"/><path d="m7 9-4 4 8 8 4-4M5 15l-3 3m7 1-3 3m9-18 5 5"/>',
 sand:'<path d="m3 11 10-7 8 5-10 8-8-6Z"/><path d="M3 11v5l8 5 10-8V9M11 17v4"/>',
 paint:'<path d="M8 8h8v13H8zM10 8V4h5v4M10 4V2h7"/><path d="m18 4 4-1m-4 4h4m-4 3 4 1M8 12h8"/>',
 engine:'<path d="M7 6h8v3h4l3 4v5h-4l-2 3H7l-3-4V9h3V6ZM9 3h5M11 3v3M1 11v6m0-3h3"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 time:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 wallet:'<path d="M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7m18 5h-6v5h6"/><path d="M17 14.5h.01"/>',
 rotate:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
 hood:'<path d="m3 15 4-8h10l4 8v5h-3v-3H6v3H3v-5Zm0 0h18M7 7l2-4h6l2 4"/>',
 camera:'<path d="M3 7h5l2-3h4l2 3h5v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 save:'<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/>',
 flag:'<path d="M4 22V3m0 1c5-5 11 5 16 0v10c-5 5-11-5-16 0"/>',
 volume:'<path d="m3 9 4 0 5-5v16l-5-5H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="m3 9 4 0 5-5v16l-5-5H3V9Zm13 0 6 6m0-6-6 6"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 archive:'<path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>'
};
const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.wrench}</svg>`;
const $=s=>document.querySelector(s);
const money=formatCredits;
const names={hood:'引擎盖',trunk:'后备厢',left:'左侧车身',right:'右侧车身',roof:'车顶',front:'前围',rear:'后围'};
const tools={inspect:{label:'拆装',en:'ASSEMBLY',icon:'wrench',desc:'点击车辆标记或右侧清单选择部件。损坏零件需要先拆下，检修后再装回。'},rust:{label:'除锈',en:'RUST REMOVAL',icon:'rust',desc:'按住鼠标左键，刷过锈蚀的车身。按住右键旋转车辆，滚轮缩放。'},sand:{label:'打磨',en:'SURFACE PREP',icon:'sand',desc:'先完成面板除锈，再按住左键均匀打磨，露出干净的底漆。'},paint:{label:'喷漆',en:'PAINT SHOP',icon:'paint',desc:'选择车漆颜色，按住左键喷涂已打磨的面板。右键旋转，照顾每一面。'}};
let state=loadGame(),started=!!state,tool='inspect',hoverLabel='',routeChoice='salvage',saveTimer=null,toastTimer=null,activePanel='hood',soundOn=true,garage=null,saveError=false;
if(!state)state=createGame('salvage');
state.started=started;
let audioCtx,audioGain,audioNodes=[],career=null;
const app=$('#app');
app.innerHTML=`
<header class="header">
 <div class="brand"><span class="brand-icon">${icon('logo',27)}</span><div><strong>赛车车库</strong><small>RACING GARAGE</small></div></div>
 <nav class="header-nav"><span class="nav-active">修复工坊<span>01</span></span><button id="archive">项目档案 ${icon('archive',16)}</button></nav>
 <div class="header-right"><span id="save-status" class="saved">${icon('check',14)} 已自动保存</span><button class="icon-button" id="sound" aria-label="关闭声音" title="声音开关">${icon('volume')}</button><button class="icon-button" id="help" aria-label="操作帮助" title="操作帮助">${icon('info')}</button></div>
</header>
<main class="workspace">
 <aside class="tool-rail"><div class="rail-caption">工具</div>${Object.entries(tools).map(([id,t],i)=>`<button class="tool-button ${id==='inspect'?'active':''}" data-tool="${id}" title="${t.label}（${i+1}）">${icon(t.icon,25)}<span>${t.label}</span><kbd>${i+1}</kbd></button>`).join('')}<div class="rail-line"></div><button class="tool-button ignition-tool" id="ignition-rail" title="点火验收（空格）">${icon('engine',26)}<span>点火</span></button><div class="rail-bottom"><span class="vertical-word">BUILT. NOT BOUGHT.</span><span class="rail-number">01</span></div></aside>
 <section class="stage">
  <div id="scene"></div>
  <div class="stage-heading"><div class="eyebrow"><span class="live-dot"></span><span id="project-label">RESTORATION PROJECT / 001</span></div><h1 id="vehicle-name">R-86 <span>COUPÉ</span></h1><div class="vehicle-meta"><span id="vehicle-year">1986</span><i></i><span id="vehicle-engine">1.8L · 直列四缸</span><i></i><span id="route-badge">废车修复</span></div><button id="change-vehicle" class="change-vehicle">${icon('rotate',14)} 更换车型 <small>车型收藏馆</small></button><div class="body-controls" id="body-controls"></div></div>
  <div class="view-actions"><button id="hood" class="glass-button">${icon('hood',17)}<span>打开引擎盖</span></button><button id="reset-camera" class="glass-button" title="复位视角（R）">${icon('rotate',17)}</button><button id="snapshot" class="glass-button" title="保存车辆照片">${icon('camera',17)}</button></div>
  <div class="view-selector"><button data-view="front">前</button><button data-view="left">左</button><button data-view="right">右</button><button data-view="rear">后</button><button data-view="top">顶</button></div>
  <div class="scene-label"><span class="label-line"></span><span id="hover-name">每一台旧车，都值得再响一次。</span></div>
  <div class="scene-hint"><span class="mouse-icon"></span><span id="orbit-hint">左键旋转</span><span class="hint-divider"></span><span>滚轮缩放</span><span class="hint-divider"></span><span id="scene-hint-extra">点击标记选择部件</span></div>
  <div class="engine-readout hidden" id="engine-readout"><span class="live-dot"></span><div><small>ENGINE RUNNING</small><b id="rpm">850 <em>RPM</em></b></div><div class="engine-bars">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div></div>
  <div class="work-card" id="work-card"></div>
 </section>
 <aside class="inspector">
  <div class="project-progress"><div class="section-eyebrow">PROJECT STATUS <span id="route-status">SALVAGE</span></div><div class="progress-title"><h2>让它重获新生</h2><span id="total-progress">0<small>%</small></span></div><div class="progress-track"><div id="total-bar"></div></div><p id="progress-note">从第一次拆装，到第一声轰鸣。</p><div class="project-actions"><button id="build-project" class="build-project-button"></button><button id="salvage-project" class="build-project-button">${icon('wrench',16)} 修车</button></div></div>
  <div class="inspector-tabs"><button data-tab="parts" class="selected">机械部件 <span>08</span></button><button data-tab="body">车身工序 <span>03</span></button></div>
  <div id="inspector-content"></div>
  <div class="inspector-bottom"><div class="funds"><span>${icon('wallet',18)} 可用资金</span><strong id="balance">${money(state.money)} <small>CR</small></strong></div><div class="daily-row"><span>工坊每日补助 <b>${money(ECONOMY.dailyGrant)} CR</b></span><button id="claim-grant">今日已领 ${icon('check',13)}</button></div><button id="organize" class="organize-button">${icon('time',16)} 整理车库 <span>免费 · +6h</span></button></div>
 </aside>
</main>
<footer class="footer"><div class="day-block">${icon('sun',18)}<span>第 <b id="day">01</b> 天</span><i></i><span id="time">08:00</span></div><div class="day-track"><span id="day-bar"></span></div><span class="footer-tip" id="latest-log">工坊已就绪，开始你的第一个项目。</span><button data-rest-next-day class="rest-shortcut">${icon('time',14)} 休息到次日 <b>+1 古戈尔 CR</b></button><button id="new-project">${icon('plus',14)} 新项目</button><span class="build-tag">BUILD + TUNE + RACE / 0.11.1</span></footer>
<div id="toast" class="toast" role="status"></div>
<div id="modal-root"></div>
<div id="welcome" class="welcome ${started?'hidden':''}"><div class="welcome-backdrop"></div><div class="welcome-card"><div class="eyebrow"><span class="live-dot"></span> A SECOND LIFE, BUILT BY YOU.</div><h2>让引擎，<br/>再响一次<span>。</span></h2><p>一间车库。一双手。一台等待重生的车。<br/>选择你的起点，剩下的，交给你和工具。</p><div class="route-options"><button class="route-option selected" data-route="salvage"><span class="route-icon">${icon('wrench',24)}</span><span><strong>修复一台废车</strong><small>把锈迹、故障和岁月，一点点修好。</small></span><span class="route-price">${money(ECONOMY.startingGrant.salvage)}<small>CR 启动资金</small></span></button><button class="route-option" data-route="scratch"><span class="route-icon">${icon('plus',24)}</span><span><strong>从零组装一台车</strong><small>从白车身开始，把每个零件装到位。</small></span><span class="route-price">${money(ECONOMY.startingGrant.scratch)}<small>CR 启动资金</small></span></button></div><div class="purchase-note" id="purchase-note">废车入库 1,800 CR · 剩余 28,200 CR · 附基础耗材</div><button id="start" class="primary start-button">领取资金，打开车库 ${icon('arrow',20)}</button><div class="welcome-foot">${icon('save',13)} 进度自动保存在本机浏览器 <span>修复 → 车辆改装 → CS 调校 → 比赛。</span></div></div><div class="welcome-stamp">R-86 / 1986<br/><span>THE RESTORATION SERIES</span></div></div>`;

let activeTab='parts',hoodOpen=false;
function toast(message,error=false){const el=$('#toast');el.innerHTML=`${icon(error?'info':'check',18)}<span>${message}</span>`;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4000);}
function persist(){if(!started)return;try{saveGame(state);saveError=false;$('#save-status').innerHTML=`${icon('check',14)} 已自动保存`;}catch{if(!saveError)toast('浏览器存储已满或不可用，本次进度暂时无法保存。',true);saveError=true;$('#save-status').textContent='保存失败';}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,400);}
function act(action,id=state.selected){if(!started)return;const result=work(state,action,id);toast(result.message,!result.ok);if(result.ok){playClick();render();persist();}}
function selectPart(id){if(!started)return;state.selected=id;activeTab='parts';setTool('inspect');if(!id.startsWith('wheel')){hoodOpen=true;garage.setHood(true);updateHoodButton();}render();scheduleSave();}
function updateHoodButton(){$('#hood span').textContent=hoodOpen?'关闭引擎盖':'打开引擎盖';$('#hood').classList.toggle('is-active',hoodOpen);}
function setTool(id){if(!started)return;tool=id;activeTab=id==='inspect'?'parts':'body';document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===id));garage.setTool(id);$('#orbit-hint').textContent=id==='inspect'?'左键旋转':'右键旋转';$('#scene-hint-extra').textContent=id==='inspect'?'点击标记选择部件':'按住左键涂刷';if(id!=='inspect'){hoodOpen=false;garage.setHood(false);updateHoodButton();}render();}
function panelView(id){const views={hood:'top',roof:'top',trunk:'top',left:'left',right:'right',front:'front',rear:'rear'};if(id==='roof'&&roofIsOpen(state)){setRoofOpen(state,false);garage.closeDoors();renderBodyControls();persist();}garage.view(views[id]);activePanel=id;renderWorkCard();}
function render(){
 const model=vehicleInfo(state);$('#vehicle-name').innerHTML=`${escapeHTML(model.name)} <span>${model.badge}</span>`;$('#vehicle-name').classList.toggle('long-name',model.name.length>18);$('#vehicle-year').textContent=`${model.brand} · ${model.year}`;$('#vehicle-engine').textContent=`${model.engine} · ${model.design.label}`;$('#change-vehicle small').textContent='∞ 可继续扩充';$('#change-vehicle').title=`已收录 ${CATALOG_COUNT.toLocaleString('en-US')} 款目录车型`;
 const value=progress(state),b=panelStats(state);$('#total-progress').innerHTML=`${value}<small>%</small>`;$('#total-bar').style.width=`${value}%`;
 $('#balance').innerHTML=`${money(state.money)} <small>CR</small>`;$('#balance').title=`${String(state.money).replace(/\B(?=(\d{3})+(?!\d))/g,',')} CR`;$('#day').textContent=String(state.day).padStart(2,'0');
 const h=Math.floor(state.hour),m=Math.floor((state.hour-h)*60);$('#time').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;$('#day-bar').style.width=`${(state.hour-8)/12*100}%`;
 const claimed=state.claimedDays.includes(state.day);$('#claim-grant').innerHTML=claimed?`今日已领 ${icon('check',13)}`:`领取补助 ${icon('arrow',13)}`;$('#claim-grant').disabled=claimed;$('#claim-grant').classList.toggle('available',!claimed);
 $('#latest-log').textContent=state.history[0]||'';$('#route-badge').textContent=state.route==='salvage'?(SALVAGE_LABELS[state.salvageType]||'废车修复'):'从零组装';$('#route-status').textContent=state.route==='salvage'?'SALVAGE':'NEW BUILD';
 $('#project-label').textContent=state.route==='salvage'?'RESTORATION PROJECT / 001':'CUSTOM BUILD PROJECT / 001';
 $('#build-project').innerHTML=`${icon(state.projectSlot==='build'?'rotate':'plus',16)} ${state.projectSlot==='build'?'返回原车辆':'造车'}`;
 const fixed=PARTS.filter(p=>state.parts[p.id].installed&&state.parts[p.id].condition>=70).length;
 $('#progress-note').textContent=value===100?'车辆修复完成。准备迎接第一声轰鸣。':`机械验收 ${fixed}/8 · 车身修复 ${Math.round((b.rust+b.sand+b.paint)/3*100)}%`;
 document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('selected',el.dataset.tab===activeTab));
 renderInspector();renderWorkCard();garage?.update(state,false);renderBodyControls();
 $('#engine-readout').classList.toggle('hidden',!state.running);$('#ignition-rail').classList.toggle('running',state.running);career?.refresh();
}
function renderInspector(){
 const el=$('#inspector-content'),prep=prepareCarQuote(state);
 if(activeTab==='parts'){
  el.innerHTML=`<button data-prepare-car class="prepare-car-button" ${!prep.count||state.running?'disabled':''}>${icon('wrench',17)} ${prep.count?'一键维修当前车辆':'机械状态完好'} <span>${prep.count?money(prep.cost)+' CR · '+prep.hours+'h':icon('check',14)}</span></button><div class="list-heading"><span>部件检查清单</span><span>状态</span></div><div class="parts-list">${PARTS.map(p=>{const item=state.parts[p.id],ok=item.installed&&item.condition>=70;return `<button class="part-row ${state.selected===p.id?'selected':''}" data-part="${p.id}"><span class="part-indicator ${ok?'good':!item.installed?'empty':'bad'}">${ok?icon('check',11):!item.installed?'+':'!'}</span><span class="part-name">${p.short}<small>${p.category}</small></span><span class="part-value ${ok?'good':!item.installed?'':'bad'}">${!item.installed?(item.owned?'已拆下':'待安装'):item.condition+'%'}${icon('chevron',12)}</span></button>`;}).join('')}</div><div class="inspector-note">${icon('info',16)}<p>点火前，全部部件需安装到位，<br/>健康度达到 70% 以上。</p></div><button id="inspect-start" class="start-engine-button ${inspection(state).ready?'ready':''}">${icon('engine',20)}<span>${state.running?'关闭发动机':'点火验收'}</span>${icon('arrow',16)}</button>`;
  el.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>selectPart(b.dataset.part));$('#inspect-start').onclick=ignite;
 }else{
  const b=panelStats(state);el.innerHTML=`<div class="body-steps">${['rust','sand','paint'].map((id,i)=>`<button data-step="${id}" class="body-step ${tool===id?'active':''}"><span>${b[id]>=.99?icon('check',12):'0'+(i+1)}</span><strong>${tools[id].label}</strong><small>${Math.round(b[id]*100)}%</small></button>`).join('')}</div>${tool==='paint'?`<div class="color-label">车漆颜色 <span>${COLORS.find(c=>c.hex===state.paint)?.name||''}</span></div><div class="color-swatches">${COLORS.map(c=>`<button class="swatch ${c.hex===state.paint?'selected':''}" style="--paint:${c.hex}" title="${c.name}" aria-label="${c.name}" data-color="${c.hex}">${c.hex===state.paint?icon('check',16):''}</button>`).join('')}</div>`:''}<div class="list-heading"><span>选择面板，调整视角</span><span>进度</span></div><div class="panel-list">${PANELS.map(id=>{const value=Math.round(state.panels[id][tool==='inspect'?'rust':tool]*100);return `<button data-panel="${id}" class="panel-row"><span>${names[id]}</span><div class="panel-track"><i style="width:${value}%"></i></div><small>${value}%</small></button>`;}).join('')}</div><div class="inspector-note">${icon('info',16)}<p>除锈 → 打磨 → 喷漆。<br/>每块面板独立完成三道工序。</p></div>`;
  el.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>setTool(b.dataset.step));el.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>panelView(b.dataset.panel));
  el.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{const painted=panelStats(state).paint>0;if(painted&&state.paint!==b.dataset.color){showModal('更换车漆颜色',`<p class="modal-copy">已经喷涂的部分需要重新上色，除锈和打磨进度会保留。</p><div class="modal-actions"><button class="secondary" data-close>继续当前颜色</button><button class="primary" id="confirm-color">更换颜色</button></div>`);$('#confirm-color').onclick=()=>{setPaint(state,b.dataset.color);garage.update(state);render();persist();closeModal();};}else{setPaint(state,b.dataset.color);garage.update(state);render();persist();}});
 }
}
function renderWorkCard(){
 const el=$('#work-card');
 if(tool==='inspect'){
  const spec=PARTS.find(p=>p.id===state.selected),p=state.parts[state.selected];
  let actions='';
  if(p.installed)actions=`<button class="secondary" data-action="remove">${icon('wrench',16)} 拆下部件 <span>0.5h</span></button>`;
  else {if(p.owned&&p.condition<100)actions+=`<button class="primary" data-action="repair">检修 <span>${money(spec.repair)} CR</span></button>`;actions+=`<button class="${p.owned&&p.condition<100?'secondary':'primary'}" data-action="install">${p.owned?'装回车辆':'购买并安装'} ${icon('arrow',17)}<span>${p.owned?'0.75h':money(spec.price)+' CR'}</span></button>`;}
  el.innerHTML=`<div class="work-card-icon">${icon('wrench',23)}</div><div class="work-card-copy"><div class="eyebrow">${p.installed?'INSTALLED COMPONENT':p.owned?'ON THE WORKBENCH':'EMPTY MOUNTING POINT'}</div><h3>${spec.name} <span class="condition ${p.condition>=70?'good':'bad'}">${p.owned?p.condition+'%':'空缺'}</span></h3><p>${p.installed?(p.condition<70?'状态不佳。拆下后在工作台检修，再装回车辆。':'已安装到位，满足点火验收要求。'):p.owned?'部件已放到工作台，可以检修或装回。':'采购新部件，安装到车身的固定接口。'}</p></div><div class="work-card-actions">${actions}</div>`;
  el.querySelectorAll('[data-action]').forEach(b=>{b.onclick=()=>act(b.dataset.action);b.disabled=state.running;});
 }else{
  const t=tools[tool],value=Math.round(state.panels[activePanel][tool]*100);
  el.innerHTML=`<div class="work-card-icon">${icon(t.icon,26)}</div><div class="work-card-copy"><div class="eyebrow">${t.en}</div><h3>${t.label}作业 <span class="surface-label">${names[activePanel]} · ${value}%</span></h3><p>${t.desc}</p></div><div class="brush-size"><span class="brush-preview"></span><small>按住左键<br/>均匀涂刷</small></div>`;
 }
}
function showModal(title,content){stopVehiclePreviews();career?.pauseForDialog();$('#modal-root').innerHTML=`<div class="modal-scrim"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-close aria-label="关闭">${icon('close')}</button></div>${content}</section></div>`;$('#modal-root').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);$('.modal-scrim').addEventListener('click',e=>{if(e.target.classList.contains('modal-scrim'))closeModal();});$('.modal [data-close]')?.focus();}
function closeModal(){stopVehiclePreviews();$('#modal-root').innerHTML='';}
function openSaveTransfer(){
 if(state.raceActive||state.running){toast('请先结束比赛并关闭发动机，再转移存档。',true);return;}
 showModal('转移游戏存档',`<p class="modal-copy">导出会保存资金、车辆、改装和造车 / 修车项目。把文件传到另一台电脑，在这里选择导入即可。</p><div class="modal-actions"><button class="secondary" id="export-save" ${started?'':'disabled'}>导出存档</button><button class="primary" id="choose-import-save">选择存档文件</button></div><input id="import-save-file" type="file" accept="application/json,.json" hidden>`);
 $('#export-save').onclick=()=>{try{const content=exportSaves(localStorage,started?state:null),url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Garage-Legends-存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档已导出，请把文件传到另一台电脑。');}catch(error){toast(error.message,true);}};
 const input=$('#import-save-file');$('#choose-import-save').onclick=()=>input.click();input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error('存档文件过大。');const saves=parseSaveFile(await file.text());showModal('确认导入存档？',`<p class="modal-copy">导入会替换这台电脑当前浏览器中的游戏进度，包括造车和修车项目。建议先导出当前存档备份。</p><div class="modal-actions"><button class="secondary" data-close>取消</button><button class="primary" id="confirm-import-save">替换并导入</button></div>`);$('#confirm-import-save').onclick=()=>{try{importSaves(localStorage,saves);clearTimeout(saveTimer);started=false;window.location.reload();}catch(error){toast(error.message,true);}};}catch(error){toast(error.message,true);input.value='';}};
}
function engineAudio(on){
 if(!audioCtx)return;if(on){audioGain.gain.setTargetAtTime(soundOn?.025:0,audioCtx.currentTime,.15);return;}audioGain?.gain.setTargetAtTime(0,audioCtx.currentTime,.2);
}
function initAudio(){
 if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume();return;}
 try{
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();audioGain=audioCtx.createGain();audioGain.gain.value=0;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;filter.Q.value=1;filter.connect(audioGain);audioGain.connect(audioCtx.destination);
  for(const frequency of [42,63,85]){const osc=audioCtx.createOscillator();osc.type='sawtooth';osc.frequency.value=frequency;osc.connect(filter);osc.start();audioNodes.push(osc);}
 }catch{}
}
function playClick(){if(!soundOn)return;initAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(160,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(65,audioCtx.currentTime+.08);g.gain.setValueAtTime(.06,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.12);}
function ignite(){
 if(!started)return;initAudio();
 if(state.running){state.running=false;engineAudio(false);log(state,'关闭发动机，继续工坊作业。');render();persist();return;}
 const check=inspection(state);
 if(!check.ready){showModal('点火前检查',`<div class="diagnostic-banner">${icon('engine',26)}<div><strong>暂时无法启动</strong><p>先解决下面的问题，再唤醒这台发动机。</p></div></div><div class="fault-list">${check.faults.map(f=>`<div><span>!</span>${f}</div>`).join('')}</div><button class="primary modal-wide" id="back-to-work">返回工作台 ${icon('wrench',17)}</button>`);$('#back-to-work').onclick=()=>{closeModal();setTool('inspect');};return;}
 state.running=true;engineAudio(true);const allDone=progress(state)===100;
 const first=!state.finished;state.finished=allDone||state.finished;log(state,allDone?`全车修复完成，${vehicleInfo(state).name} 成功点火！`:'发动机成功启动。车身工序还可以继续完善。');render();persist();
 showModal(allDone?'第一声轰鸣，属于你。':'发动机，醒了。',`<div class="success-emblem">${icon('engine',46)}</div><div class="success-heading"><span class="eyebrow">${allDone?'RESTORATION COMPLETE':'ENGINE TEST PASSED'}</span><h3>${allDone?`这台 ${vehicleInfo(state).name}，重获新生。`:'点火验收通过。'}</h3><p>${allDone?'从锈迹斑斑到焕然一新，每一道工序都出自你的手。':'机械部件已通过检查。继续完成车身修复，让它内外如新。'}</p></div><div class="success-stats"><div><small>项目进度</small><strong>${progress(state)}<em>%</em></strong></div><div><small>机械验收</small><strong>8<em>/ 8</em></strong></div><div><small>投入工时</small><strong>${state.totalHours.toFixed(1)}<em>h</em></strong></div></div><button class="primary modal-wide" id="go-cs-after-ignition">下一站：车辆改装中心 ${icon('arrow',18)}</button><button class="secondary modal-wide" data-close>留在车库</button>`);
}
let lastBrushNotice=0;
try{garage=createGarage($('#scene'),{
 onSelect:selectPart,
 onBrush:(id,t,u,v)=>{if(!started)return;activePanel=id;const result=applyStroke(state,id,t,u,v,.16);if(result.ok){garage.updatePanel(state,id);render();scheduleSave();if(result.complete)toast(`${names[id]}${tools[t].label}完成。`);}else if(!result.quiet&&!result.complete&&performance.now()-lastBrushNotice>2200){toast(result.message,true);lastBrushNotice=performance.now();}},
 onHover:label=>{$('#hover-name').textContent=label||'每一台旧车，都值得再响一次。';},
 onMessage:message=>{if(message==='save')persist();}
});garage.update(state);}
catch(error){console.error(error);$('#scene').innerHTML='<div class="webgl-error"><h2>3D 车库未能启动</h2><p>请使用支持 WebGL 2 的桌面浏览器，并开启浏览器的硬件加速后刷新。</p></div>';$('#start').disabled=true;}
career=createCareer({getState:()=>state,garage,icon,toast,showModal,closeModal,persist,render,onGarage:()=>setTool('inspect'),stopEngine:()=>{state.running=false;engineAudio(false);},getSound:()=>soundOn});
const transferButton=document.createElement('button');transferButton.className='icon-button';transferButton.title='导出或导入存档';transferButton.setAttribute('aria-label','导出或导入存档');transferButton.innerHTML=icon('save');transferButton.onclick=openSaveTransfer;$('.header-right').prepend(transferButton);
const welcomeTransfer=document.createElement('button');welcomeTransfer.className='secondary welcome-transfer';welcomeTransfer.textContent='导入已有存档';welcomeTransfer.onclick=openSaveTransfer;$('#start').after(welcomeTransfer);
render();if(started)persist();
$('#start').onclick=()=>{state=createGame(routeChoice);started=true;state.started=true;tool='inspect';activeTab='parts';$('#welcome').classList.add('hidden');garage.update(state);garage.home();hoodOpen=false;garage.setHood(false);updateHoodButton();setTool('inspect');render();persist();toast('启动资金已到账，车辆已入库。先检查右侧的部件清单。');};
document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{routeChoice=b.dataset.route;document.querySelectorAll('[data-route]').forEach(r=>r.classList.toggle('selected',r===b));$('#purchase-note').textContent=routeChoice==='salvage'?'废车入库 1,800 CR · 剩余 28,200 CR · 附基础耗材':'底盘与白车身 5,500 CR · 剩余 44,500 CR · 附基础耗材';state=createGame(routeChoice);state.started=false;garage.update(state);render();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;if(activeTab==='body'&&tool==='inspect'){setTool('rust');}else if(activeTab==='parts'){setTool('inspect');}else render();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>garage.view(b.dataset.view));
function chooseVehicle(initialFeature=''){
 if(!started)return;
 if(state.running){toast('请先关闭发动机，再更换车型。',true);return;}
 openVehiclePicker({state,showModal,initialFeature,onChanged:result=>{
  if(result.ok){hoodOpen=false;garage.setHood(false);updateHoodButton();garage.update(state);garage.home();setTool('inspect');persist();closeModal();playClick();}
  toast(result.message,!result.ok);
 }});
}
$('#change-vehicle').onclick=()=>chooseVehicle();
$('#build-project').onclick=()=>{
 const result=switchBuildProject(state);
 if(!result.ok){toast(result.message,true);return;}
 clearTimeout(saveTimer);state=result.state;started=true;career.reset();hoodOpen=false;garage.setHood(false);garage.update(state);garage.home();updateHoodButton();setTool('inspect');persist();playClick();
 toast(result.returning?'已回到原来的车辆，进度已保留。':'已进入造车项目，安装零件开始组装。');
};
$('#salvage-project').onclick=()=>{
 const result=makeSalvageProject(state);if(!result.ok){toast(result.message,true);return;}
 hoodOpen=false;garage.setHood(false);updateHoodButton();garage.update(state);setTool('inspect');persist();playClick();toast(result.message);
};
function renderBodyControls(){
 const f=vehicleInfo(state).features,container=$('#body-controls');
 if(!f.interactive){container.innerHTML='<button class="body-browse" id="browse-special">挑选特殊车门 / 敞篷车 →</button>';$('#browse-special').onclick=()=>chooseVehicle('special');return;}
 const doorOpen=!!garage?.doorsOpen,roofOpen=roofIsOpen(state),disabled=!started||state.running||!!state.raceActive;
 container.innerHTML=`<button id="toggle-doors" aria-pressed="${doorOpen}" ${disabled?'disabled':''}>${doorOpen?'关闭':'打开'}${DOOR_TYPES[f.doors]}</button>${f.convertible?`<button id="toggle-roof" aria-pressed="${roofOpen}" ${disabled?'disabled':''}>${roofOpen?'切换有顶篷':'切换敞篷'}</button><small aria-live="polite">${roofOpen?'当前：敞篷':'当前：有顶篷'}</small>`:''}`;
 $('#toggle-doors').onclick=()=>{garage.toggleDoors();renderBodyControls();};
 if($('#toggle-roof'))$('#toggle-roof').onclick=()=>{const result=setRoofOpen(state,!roofIsOpen(state));if(result.ok){garage.closeDoors();garage.update(state,false);renderBodyControls();persist();}toast(result.message,!result.ok);};
}
$('#hood').onclick=()=>{hoodOpen=garage.toggleHood();updateHoodButton();};$('#reset-camera').onclick=()=>garage.home();
$('#claim-grant').onclick=()=>{const r=claimGrant(state);toast(r.message,!r.ok);render();persist();};
$('#organize').onclick=()=>{if(!started)return;if(state.running){toast('先关闭发动机，再整理车库。',true);return;}advanceTime(state,6);log(state,'整理工具、清扫工作台，时间推进 6 小时。');render();persist();playClick();toast(state.claimedDays.includes(state.day)?'车库整理好了，游戏时间推进 6 小时。':`新的一天开始了，可以领取 ${money(ECONOMY.dailyGrant)} CR 补助。`);};
document.addEventListener('click',e=>{
 if(e.target.closest('[data-rest-next-day]')){const result=restToNextDay(state);toast(result.message,!result.ok);if(result.ok){render();persist();playClick();}}
 if(e.target.closest('[data-prepare-car]')){
  const result=prepareCar(state);toast(result.message,!result.ok);if(result.ok){garage.update(state);render();persist();playClick();}
 }
});
$('#ignition-rail').onclick=ignite;
$('#sound').onclick=()=>{soundOn=!soundOn;career?.setSound(soundOn);$('#sound').innerHTML=icon(soundOn?'volume':'mute');$('#sound').setAttribute('aria-label',soundOn?'关闭声音':'开启声音');if(state.running){initAudio();engineAudio(true);}};
$('#snapshot').onclick=()=>{const a=document.createElement('a');a.download=`EMBER-R86-Day${state.day}.png`;a.href=garage.exportImage();a.click();toast('车辆照片已保存到浏览器下载目录。');};
$('#help').onclick=()=>showModal('工坊操作手册',`<div class="help-grid"><div>${icon('wrench',24)}<h3>机械拆装</h3><p>选择部件 → 拆下 → 检修 → 装回。空缺的部件可以直接购买安装；「一键维修当前车辆」可一次修好并装齐机械部件。</p></div><div>${icon('paint',24)}<h3>车身修复</h3><p>按顺序除锈、打磨、喷漆。左键涂刷，右键旋转，滚轮缩放。右侧点击面板可快速调整视角。</p></div><div>${icon('time',24)}<h3>工坊日历</h3><p>每天 08:00–20:00，工作推进时间。每日补助 ${money(ECONOMY.dailyGrant)} CR；整理车库推进 6 小时。「休息到次日」立即跳到明早并获得 1 古戈尔 CR；每日补助可单独领取。</p></div><div>${icon('engine',24)}<h3>车门与车顶</h3><p>车名下方可开合特殊车门、切换敞篷和有顶篷。车顶状态随车型保存，发车时自动关门，保留开篷选择。</p></div><div>${icon('engine',24)}<h3>点火验收</h3><p>所有机械部件安装到位、健康度至少 70% 就能点火。车身三道工序全部完成，项目进度达到 100%。</p></div></div><div class="keyboard-help"><span><kbd>1–4</kbd> 切换工具</span><span><kbd>H</kbd> 引擎盖</span><span><kbd>R</kbd> 视角复位</span><span><kbd>空格</kbd> 点火 / 熄火</span></div><p class="modal-footnote">修好机械部件后，去车辆改装中心安装性能套件，再到 CS 店应用调校，再到赛道发车。自动过弯默认开启，发车后会自动加速、提前减速并沿赛道转向。S 刹车，A/D 临时接管方向，F 切换自动/手动；手动时 W 油门，空格手刹，C 切换视角，R 救援，Esc 暂停。碰撞损伤持续保留，赛后可回工坊维修。</p>`);
$('#archive').onclick=()=>showModal(`项目档案 · ${escapeHTML(vehicleInfo(state).name)}`,`<div class="archive-summary"><span>${state.route==='salvage'?'废车修复':'从零组装'}</span><strong>第 ${state.day} 天 · 已工作 ${state.totalHours.toFixed(1)} 小时</strong></div><div class="archive-list">${state.history.map((s,i)=>`<div><span>${String(state.history.length-i).padStart(2,'0')}</span><p>${escapeHTML(s)}</p></div>`).join('')}</div>`);
$('#new-project').onclick=()=>showModal('开始一个新项目',`<p class="modal-copy">新项目会替换当前浏览器中的存档。你的 ${vehicleInfo(state).name} 目前完成了 <strong>${progress(state)}%</strong>。</p><div class="modal-actions"><button class="secondary" data-close>继续当前项目</button><button class="primary" id="confirm-new">选择新项目 ${icon('arrow',16)}</button></div>`);
$('#modal-root').addEventListener('click',e=>{if(e.target.closest('#confirm-new')){career.reset();try{localStorage.removeItem(SAVE_KEY);}catch{}state.running=false;engineAudio(false);started=false;state=createGame('salvage');state.started=false;routeChoice='salvage';hoodOpen=false;garage.setHood(false);garage.home();closeModal();$('#welcome').classList.remove('hidden');document.querySelector('[data-route="salvage"]').click();updateHoodButton();}});
window.addEventListener('keydown',e=>{if(career?.location==='race'){if(e.key==='Escape'&&$('#modal-root').children.length){e.stopImmediatePropagation();closeModal();}return;}if(e.key==='Escape'){closeModal();return;}if(['tuning','upgrades'].includes(career?.location))return;if(!started||$('#modal-root').children.length||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;const idx=Number(e.key)-1;if(idx>=0&&idx<4)setTool(Object.keys(tools)[idx]);if(e.key.toLowerCase()==='h')$('#hood').click();if(e.key.toLowerCase()==='r')garage.home();if(e.code==='Space'){e.preventDefault();ignite();}});
window.addEventListener('beforeunload',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();engineAudio(false);}else if(state.running)engineAudio(true);});
setInterval(()=>{if(state.running)$('#rpm').innerHTML=`${845+Math.round(Math.random()*14)} <em>RPM</em>`;},600);
