import {vehicleInfo,ECONOMY,formatCredits,TUNE_PRESETS,TUNE_LIMITS,ensureCareer,carSpecs,applyTuning,raceReadiness,inspection,beginRace,applyRaceDamage,settleRace} from './game.js';
import {createRace} from './race.js';
import {TRACKS} from './driving.js';
import {mountOpponentPicker} from './race-opponents.js';
import {createUpgradeShop} from './upgrades.js';
import {visualMods} from './visual-mods.js';
import {createWorld} from './world.js';
import './career.css';
import './race-opponents.css';
export const raceTime=t=>t==null?'—':`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
export function createCareer({getState,garage,icon,toast,showModal,closeModal,persist,render,onGarage,stopEngine,getSound}){
 let location='garage',draft={...ensureCareer(getState()).tuning},race=null,world=null,raceId=null,noticeTimer=null,selectedTrack='circuit';
 const $=s=>document.querySelector(s),format=n=>Math.round(n).toLocaleString('en-US');
 const nav=$('.header-nav');nav.innerHTML=`<button class="location-tab nav-active" data-location="garage">修复工坊 <span>01</span></button><button class="location-tab" data-location="upgrades">车辆改装 <span>02</span></button><button class="location-tab" data-location="tuning">CS 调校 <span>03</span></button><button class="location-tab" data-location="race">赛道竞速 <span>04</span></button><button class="location-tab" data-location="world">车库生活 <span>05</span></button>`;
 document.body.dataset.location='garage';
 const panel=document.createElement('aside');panel.className='tuning-panel';$('.workspace').appendChild(panel);
 const mods=createUpgradeShop({getState,garage,icon,toast,persist,render,go});
 const racing=document.createElement('section');racing.className='race-location';$('.footer').before(racing);
 const living=document.createElement('section');living.className='world-location';$('.footer').before(living);
 const archive=document.createElement('button');archive.className='icon-button';archive.id='archive';archive.title='项目档案';archive.setAttribute('aria-label','项目档案');archive.innerHTML=icon('archive');$('.header-right').prepend(archive);
 for(const button of nav.querySelectorAll('[data-location]'))button.onclick=()=>go(button.dataset.location);
 function syncNav(){for(const button of nav.querySelectorAll('[data-location]'))button.classList.toggle('nav-active',button.dataset.location===location);document.body.dataset.location=location;}
 function go(next,force=false){
  if(!getState().started){toast('先选择开局，领取资金并让车辆入库。',true);return;}
  if(next===location&&!force)return;
  if(race?.isActive()){
   race.setPaused(true);showModal('退出当前比赛？',`<p class="modal-copy">退赛不会获得奖金，已经造成的车辆损伤会保留。</p><div class="modal-actions"><button class="secondary" id="stay-racing">继续比赛</button><button class="primary" id="leave-racing">退赛并离开</button></div>`);
   $('#stay-racing').onclick=()=>{closeModal();race.setPaused(false);};$('#leave-racing').onclick=()=>{settleRace(getState(),raceId,{finished:false});persist();race.destroy();race=null;closeModal();change(next);};return;
  }
  change(next);
 }
 function change(next){
  if(race){race.destroy();race=null;}
  if(world){world.destroy();world=null;}
  stopEngine();location=next;syncNav();garage.setPaused(next==='race'||next==='world');garage.setHood(false);
  if(next==='garage'){garage.setLocation('garage');onGarage();garage.update(getState());}
  else if(next==='upgrades'){mods.reset();garage.setLocation('upgrades');garage.setTool('upgrades');garage.home();render();}
  else if(next==='tuning'){draft={...ensureCareer(getState()).tuning};garage.setLocation('tuning');garage.setTool('tuning');garage.home();render();}
  else if(next==='world'){garage.setLocation('garage');world=createWorld(living,{vehicle:garage.getVehicle(),getState,getProfile:()=>carSpecs(getState()),persist,onExit:()=>go('garage'),onShop:shop=>go(shop==='cs'?'tuning':'garage'),toast});}
  else {garage.setLocation('garage');openRace();}
  persist();
 }
 function metricHTML(spec){return `<div><small>发动机功率</small><strong>${Math.round(spec.hp)}<em>hp</em></strong></div><div><small>整备质量</small><strong>${Math.round(spec.mass)}<em>kg</em></strong></div><div><small>轮胎抓地</small><strong>${spec.grip.toFixed(2)}<em>μ</em></strong></div><div><small>估算极速</small><strong>${spec.estimatedTop}<em>km/h</em></strong></div>`;}
 function preview(){const spec=carSpecs(getState(),draft);$('#tuning-metrics').innerHTML=metricHTML(spec);$('.dyno-metrics').innerHTML=metricHTML(spec);const apply=$('#apply-tuning');if(apply){const saved=getState().tuned&&Object.keys(draft).every(k=>draft[k]===getState().tuning[k]);apply.disabled=saved;apply.innerHTML=saved?`当前方案已应用 ${icon('check',16)}`:`应用调校 <span>200 CR · 1h</span> ${icon('arrow',16)}`;}}
 function renderShop(){
  const s=ensureCareer(getState()),spec=carSpecs(s,draft),ready=raceReadiness(s),mechanical=inspection(s).ready;
  $('#project-label').textContent='CS PERFORMANCE / DYNO BAY';$('#route-badge').textContent='性能参数调校';$('#scene-hint-extra').textContent='调校保存后用于比赛';$('#orbit-hint').textContent='左键旋转';$('#hood span').textContent='打开引擎盖';
  $('#work-card').innerHTML=`<div class="work-card-icon">${icon('engine',24)}</div><div class="dyno-copy"><div class="eyebrow">${vehicleInfo(s).name} / LIVE PERFORMANCE PREVIEW</div><h3>你的选择，改变每一次出弯。</h3></div><div class="dyno-metrics">${metricHTML(spec)}</div>`;
  panel.innerHTML=`<div class="shop-heading"><div class="eyebrow"><span class="live-dot"></span> CS / PERFORMANCE LAB</div><h2>把性能，调到位<span>。</span></h2><p>硬件改装完成后，在这里调整驾驶手感。</p><div class="tuning-metrics" id="tuning-metrics">${metricHTML(spec)}</div></div><div class="shop-tabs"><button id="shop-to-mods">车辆改装 ${icon('arrow',13)}</button><button class="selected">参数调校</button></div><div class="shop-content">${!mechanical?`<div class="shop-warning">${icon('info',17)}<span>车辆尚未通过机械验收。可以查看方案，调校前请先回工坊维修。</span></div>`:''}<div class="preset-caption">选一个起点，再调成你的手感。</div><div class="preset-grid">${TUNE_PRESETS.map(p=>`<button data-preset="${p.id}" class="preset ${Object.keys(p.values).every(k=>p.values[k]===draft[k])?'selected':''}"><strong>${p.name}</strong><small>${p.desc}</small></button>`).join('')}</div><div class="tuning-sliders">${Object.entries(TUNE_LIMITS).map(([key,r])=>`<label class="tuning-slider"><span>${r.label}<b id="value-${key}">${key==='finalDrive'?draft[key].toFixed(2):draft[key]} <small>${r.unit}</small></b></span><input type="range" data-tune="${key}" aria-label="${r.label}" min="${r.min}" max="${r.max}" step="${r.step}" value="${draft[key]}"/><small>${r.hint}</small></label>`).join('')}</div><p class="tuning-note">调整参数可预览性能。点击「应用调校」后，方案才会保存到车辆。</p></div><div class="shop-footer"><div class="shop-wallet"><span>可用资金</span><strong>${formatCredits(s.money)} <small>CR</small></strong></div><button class="primary" id="apply-tuning" ${!mechanical?'disabled':''}>应用调校 <span>200 CR · 1h</span> ${icon('arrow',16)}</button><button class="to-circuit ${ready.ready?'ready':''}" id="shop-to-race">${icon('flag',18)} 前往赛道 <span>${ready.ready?'已可参赛':'查看参赛条件'}</span>${icon('arrow',16)}</button></div>`;
  $('#shop-to-mods').onclick=()=>go('upgrades');
  panel.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{draft={...TUNE_PRESETS.find(p=>p.id===b.dataset.preset).values};renderShop();});
  panel.querySelectorAll('[data-tune]').forEach(input=>input.oninput=()=>{const key=input.dataset.tune;draft[key]=Number(input.value);$(`#value-${key}`).innerHTML=`${key==='finalDrive'?draft[key].toFixed(2):draft[key]} <small>${TUNE_LIMITS[key].unit}</small>`;preview();});
  if($('#apply-tuning')){$('#apply-tuning').onclick=()=>{const r=applyTuning(s,draft);toast(r.message,!r.ok);if(r.ok){persist();render();}};if(mechanical)preview();}
  $('#shop-to-race').onclick=()=>go('race');
 }
 function notice(message){const el=$('#race-notice');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
 function openRace(){
  const s=ensureCareer(getState()),readiness=raceReadiness(s),mechanical=inspection(s).ready,modified=Object.values(s.upgrades).some(v=>v>0)||visualMods(s).tires==='race'||visualMods(s).fan==='race';
  racing.innerHTML=`<div id="race-scene"></div><div class="race-vignette"></div><div class="race-title"><div class="eyebrow"><span class="live-dot"></span> NORTH LOOP / CLUB CIRCUIT</div><h1>北郊环线<span>CLUB RACE</span></h1><small>638 m / 圈 · 晴 · 干燥路面</small></div><div class="race-top-actions"><button id="race-camera" class="glass-button">${icon('camera',17)}<span id="race-view-name">车后视角 · C</span></button><button id="race-assist" class="glass-button" aria-pressed="${s.drivingAssist}">自动过弯：${s.drivingAssist?'开':'关'} · F</button><button id="race-pause" class="glass-button">暂停 · Esc</button><button id="race-back" class="glass-button">返回工坊</button></div><div class="race-scoreboard"><div><small>POSITION</small><strong><span id="race-position">1</span><em>/ 4</em></strong></div><div><small>LAP</small><strong><span id="race-lap">1</span><em>/ 2</em></strong></div><div class="race-clock"><small>RACE TIME</small><strong id="race-time">0:00.00</strong></div></div><div class="race-minimap"><svg id="track-map" viewBox="-135 -25 285 185" aria-label="赛道小地图"></svg><div>北郊环线 <span>2 LAPS</span></div></div><div class="race-order" id="race-order"></div><div class="race-warning hidden" id="race-wrong-way">逆向行驶 · 请沿路线提示前进</div><div class="race-notice" id="race-notice" role="status"></div><div class="race-countdown hidden" id="race-countdown">3</div><div class="speed-cluster"><div class="rpm-segments">${Array.from({length:16},(_,i)=>`<i data-rpm="${i}"></i>`).join('')}</div><div class="speed-line"><div class="gear"><small>GEAR</small><b id="race-gear">1</b><span>AUTO</span></div><div class="speed-value"><strong id="race-speed">0</strong><span>KM / H</span></div></div><div class="vehicle-health"><span>车辆状态</span><div><i id="race-health-bar"></i></div><b id="race-health">100%</b></div></div><div class="assist-status" id="assist-status" role="status"><b id="assist-status-label">准备自动过弯</b><span id="assist-status-detail">自动控制油门、转向和刹车</span></div><div class="driving-hint"><span><kbd>W</kbd> 油门</span><span><kbd>S</kbd> <span id="brake-hint">刹车</span></span><span><kbd>A D</kbd> 转向</span><span><kbd>空格</kbd> 手刹</span><button id="race-recover"><kbd>R</kbd> 救援 +5s</button></div><div class="drive-buttons"><div><button data-drive="KeyA" aria-label="向左转向">←</button><button data-drive="KeyD" aria-label="向右转向">→</button></div><div><button data-drive="KeyS" class="brake-pedal" aria-label="刹车或倒车">刹车</button><button data-drive="KeyW" class="gas-pedal" aria-label="踩住油门">油门</button></div></div><div class="race-entry" id="race-entry"><div class="eyebrow">CLUB RACE / ROUND 01</div><h2>让改装，见真章<span>。</span></h2><p>驾驶 ${vehicleInfo(s).name}，与三位对手完成两圈竞速。</p><p class="entry-assist" id="entry-assist">${s.drivingAssist?'自动过弯已开启：发车后自动驾驶，S 刹车，F 切回手动。':'当前为手动驾驶。按 F 可开启自动减速与转向。'}</p><div class="entry-facts"><span>2 圈</span><span>3 位 AI</span><span>无报名费</span></div><div class="entry-checklist">${[[mechanical,'机械部件通过检查'],[modified,'至少安装一项性能改装'],[s.tuned,'已保存 CS 店调校方案']].map(([ok,label])=>`<div class="${ok?'passed':''}">${icon(ok?'check':'info',15)}${label}</div>`).join('')}</div><div class="race-prize"><span>冠军奖金</span><b>${format(ECONOMY.racePrizes[0])} <small>CR</small></b></div><button class="primary" id="race-start" ${readiness.ready?'':'disabled'}>发车 · 2 圈 ${icon('flag',17)}</button>${!readiness.ready?`<div class="entry-links"><button id="entry-garage">回工坊维修</button><button id="entry-mods">车辆改装</button><button id="entry-shop">CS 调校 ${icon('arrow',15)}</button></div>`:'<small class="entry-tip">F 切换辅助 · A/D 暂时接管转向 · S 刹车</small>'}</div><div class="race-paused hidden" id="race-paused"><div class="eyebrow">RACE PAUSED</div><h2>稍作停留。</h2><p>比赛和计时已暂停。</p><button class="primary" id="race-resume">继续比赛 ${icon('arrow',17)}</button><button class="secondary" id="race-quit">退赛并返回工坊</button></div>`;
  const trackInfo=TRACKS[selectedTrack];$('.race-title .eyebrow').innerHTML=`<span class="live-dot"></span> ${trackInfo.subtitle}`;$('.race-title h1').innerHTML=`${trackInfo.name}<span>CLUB RACE</span>`;$('.race-minimap div').innerHTML=`${trackInfo.name} <span>2 LAPS</span>`;
  const trackOptions=document.createElement('div');trackOptions.className='race-time-options race-track-options';trackOptions.setAttribute('aria-label','选择赛道');trackOptions.innerHTML=`<span>选择赛道</span><div>${Object.values(TRACKS).map(t=>`<button data-race-track="${t.id}" aria-pressed="${t.id===selectedTrack}">${t.name}</button>`).join('')}</div>`;$('#race-entry .entry-facts').before(trackOptions);
  trackOptions.querySelectorAll('[data-race-track]').forEach(button=>button.onclick=()=>{if(button.dataset.raceTrack===selectedTrack)return;selectedTrack=button.dataset.raceTrack;race.destroy();race=null;openRace();});
  const timeOptions=document.createElement('div');timeOptions.className='race-time-options';timeOptions.setAttribute('aria-label','比赛时间');timeOptions.innerHTML=`<span>比赛时间</span><div><button data-race-time="day" aria-pressed="${s.raceTimeOfDay==='day'}">白天</button><button data-race-time="night" aria-pressed="${s.raceTimeOfDay==='night'}">夜晚</button></div>`;$('#race-entry .entry-facts').before(timeOptions);
  let hudCars=[];
  race=createRace($('#race-scene'),{vehicle:garage.getVehicle(),getProfile:()=>carSpecs(getState()),sound:getSound(),assistEnabled:s.drivingAssist,timeOfDay:s.raceTimeOfDay,trackId:selectedTrack,opponentModels:s.raceOpponents,
   onAssistChange:enabled=>{s.drivingAssist=enabled;persist();},
   onNotice:notice,
   onPause:paused=>$('#race-paused')?.classList.toggle('hidden',!paused),
   onDamage:(impact,side)=>{const amount=applyRaceDamage(s,impact,side);if(amount){persist();notice(`碰撞！部件受损 ${amount}% · 损伤会保留到赛后`);}},
   onHUD:h=>{
    if(location!=='race')return;
    $('#race-assist').textContent=`自动过弯：${h.assist?'开':'关'} · F`;$('#race-assist').setAttribute('aria-pressed',String(h.assist));
    $('#assist-status').classList.toggle('manual',!h.assist);$('#assist-status-label').textContent=h.assist?(h.paused?'辅助已暂停':!h.active||h.countdown>0?'自动过弯已就绪':h.assistStatus):'手动驾驶';
    $('#brake-hint').textContent=h.assist?'刹车':'刹车 / 倒车';$('.brake-pedal').setAttribute('aria-label',h.assist?'刹车':'刹车或倒车');
    $('#assist-status-detail').textContent=h.assist?'抓地增强 · 自动油门 / 转向 / 刹车':'F 开启自动过弯';
    $('#entry-assist').textContent=h.assist?'自动过弯已开启：发车后自动驾驶，S 刹车，F 切回手动。':'当前为手动驾驶。按 F 可开启自动减速与转向。';
    $('#race-speed').textContent=h.speed;$('#race-gear').textContent=h.gear;$('#race-position').textContent=h.position;$('#race-lap').textContent=h.lap;$('#race-time').textContent=raceTime(h.time);$('#race-view-name').textContent=h.view==='cockpit'?'驾驶舱 · C':'车后视角 · C';
    $('#race-health').textContent=`${Math.round(h.health)}%`;$('#race-health-bar').style.width=`${h.health}%`;$('#race-health-bar').classList.toggle('damaged',h.health<70);
    $('#race-wrong-way').classList.toggle('hidden',!h.active||!h.wrongWay||h.paused||h.countdown>0);
    const count=$('#race-countdown'),counting=h.active&&!h.paused&&(h.countdown>0||h.time<.8);count.classList.toggle('hidden',!counting);count.textContent=h.countdown>0?Math.ceil(h.countdown):'GO';
    racing.querySelectorAll('[data-rpm]').forEach(el=>el.classList.toggle('lit',Number(el.dataset.rpm)<h.rpm/6900*16));
    h.cars.forEach(c=>{const dot=$(`#map-car-${c.id}`);if(dot){dot.setAttribute('cx',c.x);dot.setAttribute('cy',c.z);}});
    if(h.order.join()!==hudCars.join()){hudCars=h.order;$('#race-order').innerHTML=h.order.map((id,i)=>`<div class="${id===0?'player':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${h.cars.find(c=>c.id===id).name}</span>${id===0?'<small>YOU</small>':''}</div>`).join('');}
   },
   onFinish:result=>{
    const settlement=settleRace(s,raceId,result);if(!settlement.ok)return;persist();render();const needsRepair=!inspection(s).ready;
    showModal(result.finished?`完赛 · 第 ${result.place} 名`:'车辆退赛',`<div class="race-result-hero"><span class="eyebrow">${result.finished?'RACE FINISHED':'DID NOT FINISH'}</span><strong>${result.finished?'P'+result.place:'DNF'}</strong><p>${result.finished?'每一次调校，都在赛道上得到了回应。':'车辆需要检修。已经发生的损伤会保留。'}</p></div><div class="race-result-stats"><div><small>比赛用时</small><b>${raceTime(result.time)}</b></div><div><small>最佳圈速</small><b>${raceTime(result.bestLap)}</b></div><div><small>获得奖金</small><b>+${format(settlement.reward)} <em>CR</em></b></div></div><div class="results-table">${result.results.map((r,i)=>`<div class="${r.id===0?'player':''}"><span>${i+1}</span><strong>${r.name}</strong><small>${r.time?raceTime(r.time):r.id===0?'未完赛':'仍在赛道上'}</small></div>`).join('')}</div><p class="result-damage">${needsRepair?'车辆已有部件低于 70%，下一次参赛前需要回工坊维修。':'车辆状态良好。继续调整性能，挑战更快的圈速。'}</p><div class="modal-actions"><button class="secondary" id="result-shop">前往 CS 店</button><button class="primary" id="result-garage">${needsRepair?'回工坊维修':'返回工坊'} ${icon('arrow',16)}</button></div>`);
    $('#result-shop').onclick=()=>{closeModal();go('tuning');};$('#result-garage').onclick=()=>{closeModal();go('garage');};
   }
  });
  mountOpponentPicker($('#race-entry'),s,(slot,id)=>{race.setOpponent(slot,id);hudCars=[];persist();});
  timeOptions.querySelectorAll('[data-race-time]').forEach(button=>button.onclick=()=>{s.raceTimeOfDay=button.dataset.raceTime;race.setTimeOfDay(s.raceTimeOfDay);timeOptions.querySelectorAll('button').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));persist();});
  const xs=race.track.samples.map(p=>p.x),zs=race.track.samples.map(p=>p.z),minX=Math.min(...xs)-20,minZ=Math.min(...zs)-20;$('#track-map').setAttribute('viewBox',`${minX} ${minZ} ${Math.max(...xs)-minX+20} ${Math.max(...zs)-minZ+20}`);$('.race-title small').textContent=`${Math.round(race.track.length)} m / 圈 · 晴 · 干燥路面`;
  const path=race.track.samples.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ')+' Z';$('#track-map').innerHTML=`<path d="${path}" class="map-outline"/><path d="${path}" class="map-center"/>${['#e6a65d','#7da3af','#b0b4a1','#af6460'].map((c,i)=>`<circle id="map-car-${i}" cx="0" cy="0" r="${i?3.5:4.5}" fill="${c}"/>`).join('')}`;
  $('#race-start').onclick=()=>{const id=crypto.randomUUID(),entry=beginRace(s,id,trackInfo.name);if(!entry.ok){toast(entry.message,true);return;}raceId=id;persist();$('#race-entry').classList.add('hidden');race.start();document.activeElement?.blur();};
  $('#race-assist').onclick=()=>{race.toggleAssist();document.activeElement?.blur();};$('#race-camera').onclick=()=>race.switchView();$('#race-pause').onclick=()=>race.setPaused(!race.isPaused());$('#race-back').onclick=()=>go('garage');$('#race-resume').onclick=()=>race.setPaused(false);$('#race-quit').onclick=()=>go('garage');$('#race-recover').onclick=()=>race.recover();
  if($('#entry-garage'))$('#entry-garage').onclick=()=>go('garage');if($('#entry-shop'))$('#entry-shop').onclick=()=>go('tuning');if($('#entry-mods'))$('#entry-mods').onclick=()=>go('upgrades');
  racing.querySelectorAll('[data-drive]').forEach(button=>{const release=()=>race?.hold(button.dataset.drive,false);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);race.hold(button.dataset.drive,true);};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;});
 }
 function refresh(){syncNav();if(location==='upgrades')mods.refresh();if(location==='tuning')renderShop();if(location==='garage'){
  const content=$('#inspector-content');content.querySelector('.garage-next')?.remove();const next=document.createElement('button');next.className='garage-next';next.innerHTML=`${icon('arrow',18)} 下一站：车辆改装 <span>02</span>`;next.onclick=()=>go('upgrades');content.appendChild(next);
  $('#progress-note').textContent=inspection(getState()).ready?'机械验收通过，可以前往车辆改装中心。':$('#progress-note').textContent;
 }}
 $('#modal-root').addEventListener('click',e=>{if(e.target.closest('#go-cs-after-ignition')){closeModal();go('upgrades');}});
 return {get location(){return location;},go,refresh,pauseForDialog:()=>race?.setPaused(true),setSound:on=>race?.setSound(on),stopRace:()=>{if(race){if(getState().raceActive)settleRace(getState(),raceId,{finished:false});race.destroy();race=null;}},reset(){this.stopRace();if(world){world.destroy();world=null;}location='garage';syncNav();garage.setPaused(false);garage.setLocation('garage');}};
}
