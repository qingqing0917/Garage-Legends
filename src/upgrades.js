import {vehicleInfo} from './vehicles.js';
import {UPGRADES,MAX_UPGRADE_LEVEL,credits,formatCredits,ensureCareer,carSpecs,upgradeQuote,maxAffordableUpgrade,buyUpgrade,inspection} from './game.js';
import './upgrades.css';
import {visualMods} from './visual-mods.js';

const fmt=n=>Math.round(n).toLocaleString('en-US');
const metrics=[
 {key:'hp',label:'发动机功率',unit:'hp',digits:0},
 {key:'torque',label:'发动机扭矩',unit:'N·m',digits:0},
 {key:'grip',label:'轮胎抓地',unit:'μ',digits:2},
 {key:'brake',label:'制动能力',unit:'m/s²',digits:2},
 {key:'mass',label:'整备质量',unit:'kg',digits:0},
 {key:'steeringResponse',label:'转向响应',unit:'×',digits:2}
];

export function createUpgradeShop({getState,garage,icon,toast,persist,render,go}){
 const panel=document.createElement('aside');panel.className='mod-panel';panel.setAttribute('aria-label','车辆改装中心');document.querySelector('.workspace').appendChild(panel);
 let selected='turbo',target=null,invalid=false,mode='visual',wingPreview=false;
 const $=s=>document.querySelector(s);
 function visualShop(){
  const s=ensureCareer(getState()),mods=visualMods(s),car=vehicleInfo(s);
  const scrollTop=panel.querySelector('.visual-content')?.scrollTop||0;
  $('#project-label').textContent='EMBER WORKS / CUSTOM GARAGE';$('#route-badge').textContent='外观与底盘改装';$('#orbit-hint').textContent='左键旋转';$('#scene-hint-extra').textContent='旋转车辆查看改装效果';
  $('#work-card').innerHTML=`<div class="visual-summary"><span class="eyebrow">${car.brand} / ${car.name}</span><strong>外观与底盘改装</strong><small>立即生效 · 免费安装</small></div>`;
  const options=(key,title,items)=>`<section class="visual-option"><h3>${title}</h3><div class="visual-options">${items.map(([value,label])=>`<button data-visual="${key}" data-value="${value}" class="${mods[key]===value?'selected':''}" aria-pressed="${mods[key]===value}">${label}</button>`).join('')}</div></section>`;
  const colors=(key,title,items,body=false)=>`<section class="visual-option"><h3>${title}</h3><div class="fender-colors" data-color-group="${key}">${body?`<button data-visual="${key}" data-value="${body==='original'?'original':'body'}" class="fender-body ${mods[key]===(body==='original'?'original':'body')?'selected':''}" aria-pressed="${mods[key]===(body==='original'?'original':'body')}">${body==='original'?'原色':'跟随车漆'}</button>`:''}${items.map(([color,name])=>`<button class="fender-swatch ${mods[key]===color?'selected':''}" style="--swatch:${color}" data-visual="${key}" data-value="${color}" aria-label="${title}${name}" title="${name}" aria-pressed="${mods[key]===color}"></button>`).join('')}<label class="fender-custom" title="自选颜色"><input type="color" data-visual-color="${key}" aria-label="自选${title}" value="${mods[key]==='body'||mods[key]==='original'?s.paint:mods[key]}"><span>自选</span></label></div></section>`;
  panel.innerHTML=`<div class="mod-heading"><div class="eyebrow"><span class="live-dot"></span> EMBER WORKS / CUSTOM GARAGE</div><h2>打造你的车<span>。</span></h2><p>外观与底盘改装免费，按车型分别保存。</p></div><div class="visual-tabs"><button class="selected" aria-pressed="true">外观与底盘</button><button id="show-performance" aria-pressed="false">性能升级</button></div><div class="mod-content visual-content">
  ${options('lip','前唇',[['stock','原厂'],['sport','运动前唇']])}
  ${options('rearLip','后唇',[['stock','原厂'],['sport','运动后唇']])}
  ${options('wing','尾翼',[['stock','原厂'],['fixed','固定赛车尾翼'],['active','自动升降尾翼']])}
  <p class="visual-help">自动尾翼平时贴合车尾，比赛速度超过 80 km/h 时升起。</p>${mods.wing==='active'?`<button class="visual-wing-preview" id="wing-preview" aria-pressed="${wingPreview}">${wingPreview?'收起尾翼预览':'预览尾翼升起'}</button>`:''}
  ${colors('wingColor','尾翼颜色',[['#f2f2ed','白色'],['#202326','黑色'],['#d52d2d','红色'],['#2870b2','蓝色'],['#d9b340','金色']],'original')}
  ${options('wingMaterial','尾翼材质',[['original','原厂'],['gloss','亮面'],['matte','哑光'],['metal','金属'],['carbon','碳纤维']])}
  ${options('tires','轮胎',[['street','街道轮胎'],['race','赛车轮胎']])}
  <p class="visual-help">赛车轮胎提升游戏内抓地力。</p>
  ${colors('fenderColor','挡泥板颜色',[['#f2f2ed','白色'],['#202326','黑色'],['#cf3030','红色'],['#2870b2','蓝色'],['#d9b340','金色']],true)}
  ${colors('headlightColor','车灯颜色',[['#e6fbff','冰白'],['#ffd78a','暖黄'],['#61bcff','蓝色'],['#f25a78','粉红'],['#8fffb1','绿色']])}
  ${colors('windshieldColor','挡风玻璃颜色',[['#142730','深色'],['#54849a','蓝色'],['#687b69','绿色'],['#8d667b','紫色'],['#b59b6d','金色']])}
  ${options('fan','赛车底盘抽风装置',[['none','不安装'],['race','安装赛车抽风装置']])}
  <p class="visual-help">车尾风扇抽出底盘空气，提供额外下压力和抓地力；行驶时车身会略微下压。</p>
  <label class="visual-slider"><span>降低悬挂 <b id="lowering-value">${mods.lowering} cm</b></span><input type="range" data-visual-range="lowering" aria-label="降低悬挂" min="0" max="16" step="1" value="${mods.lowering}"></label>
  <label class="visual-slider"><span>车轮负外倾 <b id="camber-value">${mods.camber}°</b></span><input type="range" data-visual-range="camber" aria-label="车轮负外倾" min="0" max="8" step="1" value="${mods.camber}"></label>
  </div><div class="mod-checkout"><div class="mod-next"><button id="mods-to-tune">${icon('wrench',14)} CS 参数调校 ${icon('arrow',13)}</button><button id="mods-to-race">前往赛道 ${icon('flag',14)}</button></div></div>`;
  $('#show-performance').onclick=()=>{wingPreview=false;garage.setWingPreview(false);mode='performance';refresh();};
  panel.querySelectorAll('[data-visual]').forEach(button=>button.onclick=()=>{if(button.dataset.visual==='wing'){wingPreview=false;garage.setWingPreview(false);}visualMods(s)[button.dataset.visual]=button.dataset.value;garage.update(s,false);persist();visualShop();});
  panel.querySelectorAll('[data-visual-color]').forEach(input=>input.oninput=event=>{const key=input.dataset.visualColor;visualMods(s)[key]=event.target.value;garage.update(s,false);persist();panel.querySelectorAll(`[data-color-group="${key}"] button`).forEach(button=>{const selected=button.dataset.value===event.target.value;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});});
  panel.querySelector('#wing-preview')?.addEventListener('click',()=>{wingPreview=!wingPreview;garage.setWingPreview(wingPreview);const button=panel.querySelector('#wing-preview');button.setAttribute('aria-pressed',String(wingPreview));button.textContent=wingPreview?'收起尾翼预览':'预览尾翼升起';});
  panel.querySelectorAll('[data-visual-range]').forEach(input=>input.oninput=()=>{const key=input.dataset.visualRange;visualMods(s)[key]=Number(input.value);$(`#${key}-value`).textContent=input.value+(key==='lowering'?' cm':'°');garage.update(s,false);persist();});
  $('#mods-to-tune').onclick=()=>go('tuning');$('#mods-to-race').onclick=()=>go('race');panel.querySelector('.visual-content').scrollTop=scrollTop;
 }
 function preview(){
  const s=ensureCareer(getState()),level=s.upgrades[selected],q=upgradeQuote(s,selected,invalid?level:target),spec=carSpecs(s),ready=inspection(s),installed=q.target===level,affordable=credits(s.money)>=BigInt(q.cost);
  $('#mod-level-error').textContent=invalid?`请输入 ${fmt(Math.max(1,level))} 至 ${fmt(MAX_UPGRADE_LEVEL)} 之间的整数。`:'';
  $('#mod-target').setAttribute('aria-invalid',String(invalid));
  panel.querySelectorAll('[data-stage]').forEach(b=>{const active=!invalid&&Number(b.dataset.stage)===target;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  $('#mod-selected-level').textContent=invalid?'等级待确认':installed?'当前已安装':`本次 +${fmt(target-level)} 级 → L${fmt(target)}`;
  $('#work-card').innerHTML=`<div class="mod-car-summary"><div><span class="eyebrow">YOUR ${vehicleInfo(s).name} / 当前已安装性能</span><strong>${fmt(spec.hp)} <small>hp</small><i>${fmt(spec.torque)} N·m</i></strong></div><div class="mod-power-weight"><small>每吨马力</small><b>${fmt(spec.hp/spec.mass*1000)}<em>hp/t</em></b></div><div class="mod-preview"><small>${invalid||installed?'已安装':'安装后预览'}</small><b>${fmt(q.after.hp)} <em>hp</em></b><span>${invalid||installed?'已保存到车辆':'查看右侧完整对比'}</span></div></div>`;
  $('#mod-comparison').innerHTML=`<caption>${invalid?'输入有效等级后查看预览':installed?'已安装套件的当前性能':'安装后性能预览 · 尚未扣款'}</caption><thead><tr><th scope="col">性能</th><th scope="col">当前</th><th scope="col">安装后</th><th scope="col">变化</th></tr></thead><tbody>${metrics.map(m=>{const delta=q.after[m.key]-q.before[m.key],changed=Math.abs(delta)>.0001;return `<tr class="${changed?'improved':''}"><th scope="row">${m.label}<small>${m.unit}</small></th><td>${q.before[m.key].toFixed(m.digits)}</td><td>${q.after[m.key].toFixed(m.digits)}</td><td>${changed?(delta>0?'+':'')+delta.toFixed(m.digits):'—'}</td></tr>`;}).join('')}</tbody>`;
  $('#mod-budget').innerHTML=`<span>可用资金 <b>${formatCredits(s.money)} <small>CR</small></b></span><span>${invalid?'待选择等级':installed?'已安装':'安装后余额'} <b class="${!affordable?'shortfall':''}">${invalid?'—':installed?formatCredits(s.money):affordable?formatCredits(credits(s.money)-BigInt(q.cost)):'差 '+formatCredits(BigInt(q.cost)-credits(s.money))} <small>CR</small></b></span>`;
  $('#mod-quote-total').textContent=invalid?'':`本次费用 ${fmt(q.cost)} CR · 游戏工时 ${q.hours} 小时`;
  const button=$('#install-mod');button.disabled=invalid||installed||!ready.ready||!affordable||s.running||!!s.raceActive;
  const title=invalid?'请输入有效等级':installed?(level===MAX_UPGRADE_LEVEL?'已达到 1 亿级':'此等级已安装'):s.running?'先关闭发动机':!ready.ready?'先完成机械维修':!affordable?'资金不足':`安装至 ${fmt(target)} 级`;
  button.innerHTML=`<span class="mod-install-label">${title}${!invalid&&!installed?`<small>${fmt(q.cost)} CR</small>`:''}</span><span>${installed?icon('check',16):`${q.hours}h ${icon('wrench',16)}`}</span>`;
 }
 function refresh(){
  if(mode==='visual'){visualShop();return;}
  const s=ensureCareer(getState()),item=UPGRADES.find(u=>u.id===selected),level=s.upgrades[selected],ready=inspection(s);
  target=Math.max(level,Math.min(MAX_UPGRADE_LEVEL,target??level+1));invalid=false;
  $('#project-label').textContent='EMBER WORKS / UPGRADE BAY';$('#route-badge').textContent='车辆改装中心';$('#orbit-hint').textContent='左键旋转';$('#scene-hint-extra').textContent='选择目标等级，预览性能变化';
  panel.innerHTML=`<div class="mod-heading"><div class="eyebrow"><span class="live-dot"></span> EMBER WORKS / PERFORMANCE PARTS</div><h2>给这台车，更多可能<span>。</span></h2><p>六类改装均可升级至 <strong>1 亿级</strong>，支持批量安装。</p></div><div class="visual-tabs"><button id="show-visual">外观与底盘</button><button class="selected" aria-pressed="true">性能升级</button></div>
   <div class="mod-categories" aria-label="改装类别">${UPGRADES.map(u=>`<button data-mod="${u.id}" aria-pressed="${selected===u.id}" class="${selected===u.id?'selected':''}"><span>${u.name}</span><small>${u.tag}<b>L${fmt(s.upgrades[u.id])}</b></small></button>`).join('')}</div>
   <div class="mod-content">
    <div class="mod-item-title"><h3>${item.name}</h3><span>当前 L${fmt(level)}</span></div>
    <div class="mod-level-editor"><label for="mod-target">目标等级 <span>最高 ${fmt(MAX_UPGRADE_LEVEL)} 级</span></label><div class="mod-level-input"><input id="mod-target" type="number" min="${Math.max(1,level)}" max="${MAX_UPGRADE_LEVEL}" step="1" inputmode="numeric" value="${target}" aria-describedby="mod-level-error mod-level-help"/><button id="mod-max-preview">预览 1 亿级</button></div><p id="mod-level-error" class="mod-level-error" role="status"></p><div class="mod-batch">${[1,10,100,1000,1000000].map(amount=>`<button data-add-level="${amount}" ${level===MAX_UPGRADE_LEVEL?'disabled':''}>+${fmt(amount)} 级</button>`).join('')}<button id="mod-affordable" ${maxAffordableUpgrade(s,selected)===level?'disabled':''}>选择可购最高级</button></div><p id="mod-selected-level" aria-live="polite"></p><p id="mod-level-help">L4 起每级 ${fmt(item.cost[2])} CR；高等级的性能提升逐渐放缓。批量安装最多消耗 12 小时游戏时间，立即完成。</p></div>
    <details class="mod-base-kits"><summary>基础套件 L1–L3</summary><p class="mod-description">${item.desc}</p><div class="mod-stages" aria-label="基础改装等级">${item.stages.map((name,i)=>`<button data-stage="${i+1}" aria-pressed="false" ${i+1<level?'disabled':''}><b>L${i+1} <span>${i+1<=level?'已安装':i===2?'赛道':'进阶'}</span></b><strong>${name}</strong><small>${i+1<=level?icon('check',12):fmt(upgradeQuote(s,selected,i+1).cost)+' CR'}</small></button>`).join('')}</div></details>
    <table class="mod-comparison" id="mod-comparison"></table>
    ${!ready.ready?`<div class="mod-advice warning">${icon('info',16)}<span>机械状态不足会影响性能。${ready.faults[0]}。<button data-mod-garage>回工坊维修 ${icon('arrow',12)}</button></span></div>`:`<div class="mod-advice">${icon('info',16)}<span>${selected==='turbo'||selected==='engine'?'动力提升后建议配合轮胎和刹车，入弯前提前减速。':selected==='suspension'?'悬挂套件改善响应；安装后可去 CS 店细调悬挂硬度。':'套件会保留在车辆上，后续升级只支付尚未安装等级的费用。'}${carSpecs(s).health<100?' 当前预览已计入部件磨损。':''}</span></div>`}
   </div>
   <div class="mod-checkout"><div class="mod-budget" id="mod-budget"></div><p id="mod-quote-total" aria-live="polite"></p><button id="install-mod" class="primary"></button><div class="mod-next"><button id="mods-to-tune">${icon('wrench',14)} CS 参数调校 ${icon('arrow',13)}</button><button id="mods-to-race">前往赛道 ${icon('flag',14)}</button></div></div>`;
  function selectLevel(value){target=value;invalid=false;$('#mod-target').value=String(target);preview();}
  $('#show-visual').onclick=()=>{mode='visual';refresh();};
  panel.querySelectorAll('[data-mod]').forEach(button=>button.onclick=()=>{selected=button.dataset.mod;target=null;refresh();});
  panel.querySelectorAll('[data-stage]').forEach(button=>button.onclick=()=>selectLevel(Number(button.dataset.stage)));
  panel.querySelectorAll('[data-add-level]').forEach(button=>button.onclick=()=>selectLevel(Math.min(MAX_UPGRADE_LEVEL,level+Number(button.dataset.addLevel))));
  $('#mod-affordable').onclick=()=>selectLevel(maxAffordableUpgrade(getState(),selected));
  $('#mod-max-preview').onclick=()=>selectLevel(MAX_UPGRADE_LEVEL);
  $('#mod-target').oninput=e=>{const value=e.target.value;target=Number(value);invalid=!/^\d+$/.test(value)||!Number.isInteger(target)||target<Math.max(1,level)||target>MAX_UPGRADE_LEVEL;preview();};
  panel.querySelector('[data-mod-garage]')?.addEventListener('click',()=>go('garage'));
  $('#install-mod').onclick=()=>{if(invalid)return;const result=buyUpgrade(getState(),selected,target);toast(result.message,!result.ok);if(result.ok){persist();render();}};
  $('#mods-to-tune').onclick=()=>go('tuning');$('#mods-to-race').onclick=()=>go('race');preview();
 }
 return {refresh,reset(){selected='turbo';target=null;invalid=false;mode='visual';wingPreview=false;garage.setWingPreview(false);}};
}
