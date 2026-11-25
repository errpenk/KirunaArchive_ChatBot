
(function(){
const EVS=window.KirunaArchiveData.EVENTS.map(ev=>({...ev}));
const CC={mine:'#b07070',urban:'#6e9ab8',infra:'#9b7fb3',social:'#6a9e7f',env:'#b8a868'};
const CL={mine:'Mining History',urban:'Urban Planning',infra:'Infrastructure',social:'Social Culture',env:'Environment'};
const EL={industrial:'Industrial Era 1900–1950',growth:'Growth Era 1950–2003',relocation:'Relocation Era 2004–',urban:'Urban Planning',mine:'Technical Documents',infra:'Construction & Effects',social:'Informative Documents',env:'Environment'};
window.EVS=EVS;
window.CL=CL;
const scheduleResponsiveCollisionHides=window.scheduleResponsiveCollisionHides;
function mixHexWithWhite(hex, colorWeight=0.7){
  const raw=(hex||'').replace('#','');
  if(raw.length!==6)return hex;
  const r=parseInt(raw.slice(0,2),16);
  const g=parseInt(raw.slice(2,4),16);
  const b=parseInt(raw.slice(4,6),16);
  const whiteWeight=1-colorWeight;
  const mix=(channel)=>Math.round(channel*colorWeight + 255*whiteWeight);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
const CC_BAR=Object.fromEntries(Object.entries(CC).map(([key, value])=>[key, mixHexWithWhite(value, 0.7)]));

/* Sort all events by year ascending — applies globally to all views/platforms */
EVS.sort((a,b)=>a.year-b.year);

const tagCounts=new Map();
EVS.forEach(ev=>ev.tags?.forEach(tag=>tagCounts.set(tag,(tagCounts.get(tag)||0)+1)));
function relatedMapEvents(ev,visibleEvents){
  return visibleEvents.filter(other=>other.id!==ev.id).map(other=>{
    const shared=ev.tags?.filter(tag=>other.tags?.includes(tag)&&tagCounts.get(tag)<=5)||[];
    shared.sort((a,b)=>tagCounts.get(a)-tagCounts.get(b));
    return {event:other,topic:shared[0],score:shared.reduce((n,tag)=>n+1/tagCounts.get(tag),0)};
  }).filter(link=>link.topic).sort((a,b)=>b.score-a.score||Math.abs(a.event.year-ev.year)-Math.abs(b.event.year-ev.year)).slice(0,3);
}

let activePage='home',activeId=null,eraFilter='all',calYear=2010,cpYear=2010,cpSel=null,calYearFilter=null;
let mapSelectionToken=0;
document.body.classList.add('on-home');
let leafletMap=null,leafletMarkers={},mapAreaLayers={};
window.getKirunaLeafletMap=function(){return leafletMap;};
let mapAreaVisibility={};
let _mapOriginPage=null; // track which page launched Map Archive
let _timeline2OriginPage=null; // track which page launched Timeline 2
let _chatOriginPage=null; // track which page launched full Chat from floating panel
const MAP_OVERVIEW_CENTER=[67.857,20.26];
const MAP_OVERVIEW_ZOOM=13;

function animateStaggerIn(nodes, opts={}){
  const items=Array.from(nodes||[]).filter(Boolean);
  if(!items.length)return;
  const axis=opts.axis||'y';
  const distance=opts.distance??10;
  const step=opts.step??24;
  const duration=opts.duration??240;
  items.forEach(item=>{
    item.style.opacity='0';
    item.style.transform=axis==='x'?`translateX(${distance}px)`:`translateY(${distance}px)`;
    item.style.transition='none';
  });
  requestAnimationFrame(()=>{
    items.forEach((item,index)=>{
      const delay=index*step;
      item.style.transition=`opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`;
      item.style.opacity='1';
      // For .tl-row.on, respect the selected translateX(4px) rather than forcing 'none'
      const isSelectedRow = item.classList.contains('tl-row') && item.classList.contains('on');
      item.style.transform = isSelectedRow ? 'translateX(4px)' : 'none';
      // Clean up inline style after transition so CSS classes can take over naturally
      const cleanDelay = delay + duration + 20;
      setTimeout(()=>{ item.style.transform=''; item.style.opacity=''; item.style.transition=''; }, cleanDelay);
    });
  });
}

function setMapAreaVisibility(id, visible){
  const layer=mapAreaLayers[id];
  if(!layer || !leafletMap)return;
  mapAreaVisibility[id]=visible;
  if(visible){
    if(!leafletMap.hasLayer(layer)) layer.addTo(leafletMap);
  }else if(leafletMap.hasLayer(layer)){
    leafletMap.removeLayer(layer);
  }
  const row=document.querySelector(`.leg-area-row[data-area-id="${id}"]`);
  if(row) row.classList.toggle('off', !visible);
}

function renderMapAreaLegend(){
  const list=document.getElementById('legend-area-list');
  const areas=window._mapAreaMeta||[];
  if(!list || !areas.length)return;
  list.innerHTML=areas.map(area=>{
    const checked=mapAreaVisibility[area.id]!==false;
    return `<label class="leg-area-row${checked?'':' off'}" data-area-id="${area.id}">
      <input class="leg-area-toggle" type="checkbox" data-area-id="${area.id}" ${checked?'checked':''}>
      <span class="leg-area-dot" style="background:${area.color}"></span>
      <span class="leg-area-name">${area.label}</span>
    </label>`;
  }).join('');
  list.querySelectorAll('.leg-area-toggle').forEach(input=>{
    input.addEventListener('change',e=>{
      setMapAreaVisibility(e.currentTarget.dataset.areaId, e.currentTarget.checked);
    });
  });
}

function toggleLegendAreaList(){
  const list=document.getElementById('legend-area-list');
  const toggle=document.getElementById('legend-area-toggle');
  if(!list || !toggle)return;
  const isCollapsed=list.classList.contains('collapsed');
  const LEG_LIST_TRANSITION_MS=280;
  if(isCollapsed){
    // Step 1: apply explicit height:0 and remove .collapsed (no transition yet)
    list.style.transition='none';
    list.style.height='0px';
    list.style.opacity='0';
    list.style.marginTop='0';
    list.style.overflow='hidden';
    list.classList.remove('collapsed');
    void list.offsetHeight; // flush
    // Step 2: next frame — restore transition and animate to target
    requestAnimationFrame(()=>{
      list.style.transition='';
      list.style.height='';
      list.style.opacity='';
      list.style.marginTop='';
      list.style.overflow='';
    });
    toggle.classList.remove('is-collapsed');
    toggle.setAttribute('aria-expanded','true');
    setTimeout(()=>{
      refreshPanelBodyHeight(document.getElementById('legend-body'));
    }, LEG_LIST_TRANSITION_MS+20);
  }else{
    list.classList.add('collapsed');
    toggle.classList.add('is-collapsed');
    toggle.setAttribute('aria-expanded','false');
    setTimeout(()=>{
      refreshPanelBodyHeight(document.getElementById('legend-body'));
    }, LEG_LIST_TRANSITION_MS+20);
  }
}
window.toggleLegendAreaList=toggleLegendAreaList;

function initTimelineViewState(){
  const combined=document.getElementById('dtl-body');
  const text=document.getElementById('dtl-text-body');
  const phase=document.getElementById('phase-outer');
  if(!combined||!text||!phase)return;
  combined.style.display=_photosOn?'':'none';
  text.style.display=_photosOn?'none':'';
  phase.style.display='none';
}

function isAdaptiveTimelineMode(){
  return !!(window.isPhoneAppMode&&window.isPhoneAppMode());
}

function getTimelineColumnYear(col){
  if(!col)return null;
  const yearEl=col.querySelector('.dtl-card-yr,.txt-yr');
  const year=yearEl?parseInt(yearEl.textContent,10):NaN;
  return Number.isFinite(year)?year:null;
}

function getTimelineFocusState(viewEl){
  if(!viewEl)return null;
  const stage=viewEl.querySelector('.dtl-stage,.txt-stage');
  if(!stage)return null;
  const cols=Array.from(stage.querySelectorAll('.dtl-col,.txt-col'));
  if(!cols.length)return null;
  const centerX=viewEl.scrollLeft+viewEl.clientWidth/2;
  let best=null;
  cols.forEach((col,index)=>{
    const colCenter=col.offsetLeft+col.offsetWidth/2;
    const distance=Math.abs(colCenter-centerX);
    if(!best||distance<best.distance){
      best={
        index,
        year:getTimelineColumnYear(col),
        distance
      };
    }
  });
  return best;
}

function scrollTimelineViewToState(viewEl,state){
  if(!viewEl||!state)return;
  const stage=viewEl.querySelector('.dtl-stage,.txt-stage');
  if(!stage)return;
  const cols=Array.from(stage.querySelectorAll('.dtl-col,.txt-col'));
  if(!cols.length)return;
  let targetCol=null;
  if(Number.isFinite(state.year)){
    let bestMatch=null;
    cols.forEach((col,index)=>{
      const year=getTimelineColumnYear(col);
      if(!Number.isFinite(year)) return;
      const yearDistance=Math.abs(year-state.year);
      const indexDistance=Math.abs(index-state.index);
      if(!bestMatch
        || yearDistance<bestMatch.yearDistance
        || (yearDistance===bestMatch.yearDistance && indexDistance<bestMatch.indexDistance)){
        bestMatch={col,yearDistance,indexDistance};
      }
    });
    targetCol=bestMatch?bestMatch.col:null;
  }
  if(!targetCol&&Number.isInteger(state.index)){
    targetCol=cols[Math.max(0,Math.min(cols.length-1,state.index))]||null;
  }
  if(!targetCol){
    viewEl.scrollLeft=0;
    return;
  }
  viewEl.scrollLeft=targetCol.offsetLeft+targetCol.offsetWidth/2-viewEl.clientWidth/2;
}

function syncTimelineToggleState(view){
  const phaseEl=document.getElementById('phase-outer');
  const textEl=document.getElementById('dtl-text-body');
  const phaseShown=!!(phaseEl && getComputedStyle(phaseEl).display!=='none');
  const textShown=!!(textEl && getComputedStyle(textEl).display!=='none');
  const activeView=view||(
    phaseShown
      ?'phase'
      :(textShown?'text':(_photosOn?'combined':'text'))
  );
  const adaptiveTimeline=isAdaptiveTimelineMode();
  const combinedBtn=document.getElementById('tlpv-combined');
  const phaseBtn=document.getElementById('tlpv-phase');
  const hint=document.getElementById('tlp-hint');
  const lbl=document.querySelector('#tlpv-combined .tlpv-label');
  if(combinedBtn)combinedBtn.classList.toggle('on',activeView!=='phase');
  if(phaseBtn)phaseBtn.classList.toggle('on',activeView==='phase');
  if(lbl)lbl.textContent=adaptiveTimeline?'By Time':(_photosOn?'Images: On':'Images: Off');
  if(hint){
    if(adaptiveTimeline){
      hint.textContent=activeView==='phase'
        ?'Grouped by type · Tap event for map'
        :'Ordered by year · Tap event for map';
    } else {
      hint.textContent=activeView==='phase'
        ?'Events grouped by era · Click to open in Map'
        :'Drag to scroll · Click event for details';
    }
  }
}

function animateTimelinePanelSwap(panel){
  if(!panel)return;
  panel.style.opacity='0';
  panel.style.transform='translateY(12px)';
  panel.style.transition='none';
  requestAnimationFrame(()=>{
    panel.style.transition='opacity .28s cubic-bezier(.22,1,.36,1), transform .32s cubic-bezier(.22,1,.36,1)';
    panel.style.opacity='1';
    panel.style.transform='translateY(0)';
    setTimeout(()=>{
      panel.style.transition='';
      panel.style.opacity='';
      panel.style.transform='';
    },360);
  });
}

/* ── Back symbols shared by navigation pills ── */
const _BACK_ARROW_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M8.5 2.5L4 7L8.5 11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const _CHAT_RETURN_SYMBOL = '<span class="back-geom-symbol" aria-hidden="true">↩</span>';
function _usesTouchBackUi(){
  return document.documentElement.classList.contains('phone-app')
    || document.documentElement.classList.contains('tablet-app');
}
function _setBackLabel(btn, label, opts){
  const symbol = opts?.chatReturn && !_usesTouchBackUi() ? _CHAT_RETURN_SYMBOL : _BACK_ARROW_SVG;
  btn.innerHTML = symbol + '<span style="vertical-align:middle">' + label + '</span>';
}

function updateTimeline2BackButton(){
  const backBtn=document.getElementById('timeline2-back-btn');
  if(!backBtn) return;
  if(_timeline2OriginPage){
    backBtn.style.display='flex';
    _setBackLabel(
      backBtn,
      ({home:'Home',archive:'Map',discourse:'Discourse',chat:'Chat'}[_timeline2OriginPage]||_timeline2OriginPage),
      {chatReturn:_timeline2OriginPage==='chat'}
    );
  } else {
    backBtn.style.display='none';
  }
}
function updateChatBackButton(){
  const backBtn=document.getElementById('chat-page-back-btn');
  if(!backBtn) return;
  if(_chatOriginPage){
    backBtn.hidden=false;
    _setBackLabel(backBtn, ({home:'Home',archive:'Map',timeline2:'Time',discourse:'Discourse'}[_chatOriginPage]||_chatOriginPage));
  } else {
    backBtn.hidden=true;
  }
}
function setTimelineNavOffset(offset){
  const next=Number.isFinite(offset)?offset:0;
  document.documentElement.style.setProperty('--timeline-nav-offset',next.toFixed(2)+'px');
}
function refreshTimeline2HeaderAlignment(){
  try{
    const tlFrame=document.getElementById('timeline2-frame');
    const tlWindow=tlFrame?.contentWindow||null;
    const html=document.documentElement;
    if(
      !tlWindow||
      activePage!=='timeline2'||
      html.classList.contains('phone-app')||
      html.classList.contains('tablet-app')
    ){
      setTimelineNavOffset(0);
      tlWindow?.alignHeaderCenterToParentTabs?.();
      return;
    }
    setTimelineNavOffset(0);
    tlWindow?.alignHeaderCenterToParentTabs?.();
  }catch(e){}
}
window.refreshTimeline2HeaderAlignment=refreshTimeline2HeaderAlignment;
function runTimeline2NavAlignment(){
  updateNavTabsCentering();
  requestAnimationFrame(()=>{
    refreshTimeline2HeaderAlignment();
    _alignMapTabsCenter();
  });
}
function scheduleTimeline2NavAlignment(){
  [0,80,180,360,720].forEach(delay=>setTimeout(runTimeline2NavAlignment,delay));
}

let _timelineViewSwapToken=0;
function switchTimelineView(targetView, opts={}){
  const combined=document.getElementById('dtl-body');
  const text=document.getElementById('dtl-text-body');
  const phase=document.getElementById('phase-outer');
  if(!combined||!text||!phase)return;
  const adaptiveTimeline=isAdaptiveTimelineMode();

  if(targetView==='phase'){
    buildPhaseView();
    combined.style.display='none';
    text.style.display='none';
    phase.style.display='';
    syncTimelineToggleState('phase');
    if(adaptiveTimeline) animateTimelinePanelSwap(phase);
    requestAnimationFrame(()=>animatePhaseBlocks());
    return;
  }

  const swapToken=++_timelineViewSwapToken;
  const from=combined.style.display!=='none'?combined:text;
  const to=targetView==='combined'?combined:text;
  const focusState=from!==to?getTimelineFocusState(from):null;
  const fallbackScrollLeft=from.scrollLeft;

  phase.style.display='none';
  combined.style.display=targetView==='combined'?'':'none';
  text.style.display=targetView==='text'?'':'none';

  if(from!==to){
    requestAnimationFrame(()=>{
      if(swapToken!==_timelineViewSwapToken) return;
      if(focusState){
        scrollTimelineViewToState(to,focusState);
      } else {
        to.scrollLeft=fallbackScrollLeft;
      }
    });
  }

  syncTimelineToggleState(targetView);
  if(adaptiveTimeline){
    animateTimelinePanelSwap(to);
    if(targetView==='text') requestAnimationFrame(()=>observeTxtCols());
  }
}
