import {vehicleInfo,switchVehicle} from './game.js';
import {VEHICLES,BRANDS,BRAND_ALIASES,BODY_TYPES,CATALOG_COUNT,filterVehicles,escapeHTML as esc} from './vehicles.js';
import './vehicles.css';
import {attachVehiclePreviews} from './vehicle-thumbnails.js';
import {BODY_FEATURES,DOOR_TYPES} from './body-features.js';

function silhouette(v){
 const body=v.design.body;
 const outlines={
  sport:'M20 77 Q30 62 78 57 L117 35 Q132 27 159 29 L197 49 Q235 51 254 64 L260 78 L245 83 L33 84Z',
  wedge:'M17 78 L42 64 L102 53 L135 31 L170 34 L202 49 L252 58 L263 78 L244 84 L32 84Z',
  gt:'M17 77 Q39 55 112 55 L146 31 Q169 25 188 40 L214 57 L257 67 L263 81 L27 84Z',
  round:'M20 77 Q27 57 76 57 Q103 26 144 27 Q175 28 192 50 Q230 53 256 70 L259 83 L26 84Z',
  roadster:'M19 77 Q36 58 91 56 L117 35 L123 36 L120 57 L182 60 L195 48 L222 56 L258 69 L260 83 L24 84Z',
  classic:'M18 76 Q35 48 90 57 L118 31 Q145 24 163 34 L189 55 Q235 44 258 74 L258 83 L21 84Z',
  muscle:'M20 77 L29 56 L97 54 L123 29 L182 29 L211 54 L254 60 L258 83 L21 83Z',
  prototype:'M12 83 L24 69 L78 62 L113 39 L140 33 L161 45 L181 61 L246 61 L267 80 L267 86 L13 86Z'
 };
 const win=body==='gt'?'M120 53 L149 35 Q169 30 181 42 L196 55Z':body==='wedge'?'M112 52 L138 35 L168 38 L189 51Z':'M103 54 L123 35 Q144 29 164 37 L181 54Z';
 return `<svg viewBox="0 0 280 108" aria-hidden="true"><ellipse cx="140" cy="91" rx="123" ry="7" fill="#050c10"/><path d="${outlines[body]||outlines.sport}" fill="${esc(v.color)}"/>${body==='roadster'?'<path d="M112 57L118 38" stroke="#9cbbc4" stroke-width="4"/>':`<path d="${win}" fill="#263c46"/>`}<path d="M36 79H247" stroke="#111b21" stroke-width="4"/>${v.design.wing&&v.design.wing!=='none'?'<path d="M225 56V43H262V48H232V58" fill="#161f25"/>':''}<path d="M27 68L55 65" stroke="#c7f8ff" stroke-width="3"/>${[70,217].map(x=>`<circle cx="${x}" cy="80" r="21" fill="#12191f"/><circle cx="${x}" cy="80" r="14" fill="#63747e"/><circle cx="${x}" cy="80" r="9" fill="#202a33"/>`).join('')}</svg>`;
}
export function openVehiclePicker({state,showModal,onChanged,initialFeature=''}){
 const current=vehicleInfo(state),filters={query:'',brand:'',body:'',feature:initialFeature,sort:'featured',lowFast:false};let page=1;const pageSize=12;
 const brandCounts=new Map(BRANDS.map(b=>[b,VEHICLES.filter(v=>v.brand===b).length]));
 const featuredBrands=['Ferrari','Lamborghini','Porsche','McLaren','Bugatti','Koenigsegg','Pagani','Nissan'];
 showModal('车型收藏馆',`<div class="catalog-heading"><p><strong>${CATALOG_COUNT.toLocaleString('en-US')}</strong> 条车型 · <strong>${BRANDS.length}</strong> 个品牌</p><span>全部免费交换</span></div><p class="vehicle-intro">资金、改装、调校和赛事记录随你一起换车。当前：${esc(current.brand)} ${esc(current.name)}。</p><div class="catalog-tools"><label class="catalog-search">搜索车型<input id="catalog-query" type="search" placeholder="搜索中文品牌 / Ferrari / 911 / GT-R…" autocomplete="off"/></label><label>品牌<select id="catalog-brand"><option value="">全部品牌</option><option value="EMBER">EMBER · 原创车型</option>${BRANDS.map(b=>`<option value="${esc(b)}">${esc(b)} ${esc(BRAND_ALIASES[b]||'')} · ${brandCounts.get(b)}</option>`).join('')}</select></label><label>类别<select id="catalog-body"><option value="">全部类别</option>${Object.entries(BODY_TYPES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>车门 / 车顶<select id="catalog-feature"><option value="">全部特征</option>${Object.entries(BODY_FEATURES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>排序<select id="catalog-sort"><option value="featured">热门优先</option><option value="name">品牌 / 名称</option><option value="power">游戏动力从高到低</option><option value="year">年代从新到旧</option></select></label></div><div class="catalog-brand-chips">${featuredBrands.map(b=>`<button data-brand="${b}">${esc((BRAND_ALIASES[b]||b).split(' ')[0])}</button>`).join('')}${['sedan','suv','offroad'].map(id=>`<button data-body="${id}">${BODY_TYPES[id]}</button>`).join('')}${['gullwing','scissor','convertible'].map(id=>`<button data-feature="${id}">${BODY_FEATURES[id]}</button>`).join('')}<button id="catalog-clear">重置筛选</button></div><div class="catalog-result-summary" id="catalog-result-count" aria-live="polite"></div><div class="vehicle-options" id="catalog-results"></div><div class="catalog-pagination"><button class="secondary" id="catalog-prev">上一页</button><span id="catalog-page"></span><button class="secondary" id="catalog-next">下一页</button></div><p class="vehicle-footnote">车型资料来自 <a href="https://en.wikipedia.org/wiki/List_of_sports_cars" target="_blank" rel="noopener noreferrer">跑车目录</a>、<a href="https://en.wikipedia.org/wiki/List_of_sport_utility_vehicles" target="_blank" rel="noopener noreferrer">SUV 目录</a>和轿车分类；部分年代未核实。使用简化 3D 外形，数值为游戏设定，实际输出还受改装与磨损影响。</p>`);
 const modal=document.querySelector('.modal');modal.classList.add('vehicle-modal');const $=selector=>modal.querySelector(selector);
 $('.catalog-heading').innerHTML=`<p><strong>∞</strong> 可继续扩充 · 已收录 <strong>${CATALOG_COUNT.toLocaleString('en-US')}</strong> 条目录车型 · ${BRANDS.length} 个品牌</p><span>全部免费交换</span>`;
 $('.vehicle-footnote').innerHTML='资料来自 <a href="https://en.wikipedia.org/wiki/List_of_sports_cars" target="_blank" rel="noopener noreferrer">跑车目录</a>、<a href="https://en.wikipedia.org/wiki/List_of_sport_utility_vehicles" target="_blank" rel="noopener noreferrer">SUV 目录</a>及 Wikipedia 车型分类。目录仍不完整，部分年代未核实；车辆使用简化 3D 外形，数值为游戏设定。';
 $('.vehicle-intro').textContent=`资金、性能升级、调校和赛事记录随你换车；外观改装按车型保存。当前：${current.brand} ${current.name}。`;
 const lowFastButton=document.createElement('button');lowFastButton.textContent='低车身快车推荐';lowFastButton.setAttribute('aria-pressed','false');$('#catalog-clear').before(lowFastButton);
 lowFastButton.onclick=()=>{filters.lowFast=!filters.lowFast;page=1;draw();};
 const categoryButtons=['两厢车','旅行车','皮卡','MPV'].map(label=>{const button=document.createElement('button');button.textContent=label;button.onclick=()=>{filters.query=filters.query===label?'':label;$('#catalog-query').value=filters.query;page=1;draw();};lowFastButton.before(button);return button;});
 function draw(){
  const list=filterVehicles(filters),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(page,pages);
  $('#catalog-result-count').textContent=`找到 ${list.length.toLocaleString('en-US')} 款 · ${filters.lowFast?'低车身造型，按游戏设定极速排序':'免费选择，随时换回'}`;
  lowFastButton.classList.toggle('selected',filters.lowFast);lowFastButton.setAttribute('aria-pressed',String(filters.lowFast));
  categoryButtons.forEach(button=>button.classList.toggle('selected',button.textContent===filters.query));
  $('#catalog-page').textContent=`${page} / ${pages}`;$('#catalog-prev').disabled=page===1;$('#catalog-next').disabled=page===pages;
  $('#catalog-results').innerHTML=list.length?list.slice((page-1)*pageSize,page*pageSize).map(v=>`<article class="vehicle-choice ${v.id===current.id?'current':''}"><div class="vehicle-choice-heading"><span>${esc(v.brand)}</span><small>${v.id===current.id?'当前车型':esc(v.label)}</small></div>${v.id==='r86'?silhouette(v):`<div class="vehicle-preview">${silhouette(v)}<img data-preview-model="${v.id}" alt="${esc(v.brand+' '+v.name+' 3D 外观预览')}"/></div>`}<h3>${esc(v.name)}</h3><p class="vehicle-design-label">${esc(v.design.label)}<span>${esc(v.design.cues)}</span></p><button class="${v.id===current.id?'secondary':'primary'}" data-vehicle="${v.id}" aria-label="${esc(`免费换上 ${v.brand} ${v.name} ${v.year}`)}" ${v.id===current.id?'disabled':''}>${v.id===current.id?'正在使用':'免费换上这辆车'}</button><p class="vehicle-year">${esc(v.year)} ${v.concept?'· 概念车型':''}</p><p class="vehicle-features">${v.features.interactive?DOOR_TYPES[v.features.doors]:'经典车身'}${v.features.convertible?' · 可开合车顶':''}</p><div class="vehicle-choice-specs"><span><b>${v.hp}</b> hp</span><span><b>${v.mass}</b> kg</span><span>${v.gameSpecs?'基础游戏性能':'原创车型性能'}</span></div>${v.source?`<a class="vehicle-source" href="${esc(v.source)}" target="_blank" rel="noopener noreferrer">车型资料 ↗</a>`:'<span class="vehicle-source">EMBER 原创车型</span>'}</article>`).join(''):'<div class="catalog-empty"><strong>没有找到匹配车型</strong><p>试试品牌中文名、英文名或缩短车型关键词。</p><button class="secondary" id="catalog-empty-clear">清空筛选</button></div>';
  $('#catalog-results').scrollTop=0;attachVehiclePreviews($('#catalog-results'));
  $('#catalog-results').querySelectorAll('.vehicle-choice').forEach((el,i)=>{const v=list[(page-1)*pageSize+i];if(v.id.startsWith('global-')&&v.id!==current.id)el.querySelector('.vehicle-choice-heading small').textContent=v.styles.split(' ')[0];});
  if(filters.lowFast)$('#catalog-results').querySelectorAll('.vehicle-choice-specs').forEach((el,i)=>{const speed=document.createElement('span');speed.textContent=`游戏极速 ${list[(page-1)*pageSize+i].topSpeed} km/h`;el.appendChild(speed);});
  $('#catalog-sort').disabled=filters.lowFast;
  modal.querySelectorAll('[data-brand]').forEach(b=>b.classList.toggle('selected',b.dataset.brand===filters.brand));
  modal.querySelectorAll('[data-feature]').forEach(b=>b.classList.toggle('selected',b.dataset.feature===filters.feature));
  modal.querySelectorAll('[data-body]').forEach(b=>b.classList.toggle('selected',b.dataset.body===filters.body));
  for(const button of modal.querySelectorAll('[data-vehicle]'))button.onclick=()=>onChanged(switchVehicle(state,button.dataset.vehicle));
  if($('#catalog-empty-clear'))$('#catalog-empty-clear').onclick=reset;
 }
 function reset(){Object.assign(filters,{query:'',brand:'',body:'',feature:'',sort:'featured',lowFast:false});$('#catalog-query').value='';$('#catalog-brand').value='';$('#catalog-body').value='';$('#catalog-feature').value='';$('#catalog-sort').value='featured';page=1;draw();}
 $('#catalog-query').oninput=e=>{filters.query=e.target.value;page=1;draw();};
 for(const key of ['brand','body','feature','sort'])$(`#catalog-${key}`).onchange=e=>{filters[key]=e.target.value;page=1;draw();};
 modal.querySelectorAll('[data-brand]').forEach(button=>button.onclick=()=>{filters.brand=button.dataset.brand;filters.query='';$('#catalog-query').value='';$('#catalog-brand').value=filters.brand;page=1;draw();});
 modal.querySelectorAll('[data-body]').forEach(button=>button.onclick=()=>{filters.body=filters.body===button.dataset.body?'':button.dataset.body;$('#catalog-body').value=filters.body;page=1;draw();});
 modal.querySelectorAll('[data-feature]').forEach(button=>button.onclick=()=>{filters.feature=filters.feature===button.dataset.feature?'':button.dataset.feature;$('#catalog-feature').value=filters.feature;page=1;draw();});
 $('#catalog-feature').value=initialFeature;
 $('#catalog-clear').onclick=reset;$('#catalog-prev').onclick=()=>{page--;draw();};$('#catalog-next').onclick=()=>{page++;draw();};draw();
}
