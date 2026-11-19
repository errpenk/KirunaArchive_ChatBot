
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

function showPage(p,fromPage){
  if(p==='report') p='discourse';
  // Dismiss the chat-source return button whenever the page changes
  if(typeof window.clearChatSourceReturnAnchor==='function') window.clearChatSourceReturnAnchor();
  const prev=activePage;
  const viaTopNav=fromPage===undefined && prev!==p;
  activePage=p;
  window.KirunaRoutes.page(p);

  /* ── Determine entrance direction from nav tab order ── */
  const NAV_ORDER=['home','archive','timeline2','gallery','discourse','chat'];
  const prevIdx=NAV_ORDER.indexOf(prev);
  const nextIdx=NAV_ORDER.indexOf(p);
  // fromPage===undefined means nav tab click; otherwise programmatic (back btn, card click)
  let enterClass='page-enter-up';
  // NAV TAB CLICKS: slide left/right. Only upward slide for programmatic transitions without order.
  if(prevIdx>=0 && nextIdx>=0){
    enterClass = nextIdx > prevIdx ? 'page-enter-right' : 'page-enter-left';
  }

  // Track page on body for CSS gating
  document.body.className=document.body.className.replace(/\bon-\w+/g,'').trim();
  document.body.classList.add('on-'+p);

  const PAGES=['home','archive','timeline2','gallery','discourse','chat'];
  const incoming=document.getElementById('page-'+p);
  PAGES.forEach(x=>{
    const el=document.getElementById('page-'+x);
    if(!el) return;
    if(x!==p){
      el.classList.remove('page-enter-right','page-enter-left','page-enter-up');
      el.classList.add('off');
    }
  });

  if(incoming){
    incoming.classList.remove('off','page-enter-right','page-enter-left','page-enter-up');
    incoming.getBoundingClientRect();
    if(prev!==p){
      incoming.classList.add(enterClass);
      incoming.addEventListener('animationend',()=>{
        incoming.classList.remove('page-enter-right','page-enter-left','page-enter-up');
      },{once:true});
    }
  }

  PAGES.forEach(x=>{
    const el=document.getElementById('ntab-'+x);
    if(el)el.classList.toggle('on',x===p);
  });
  if(p==='archive'){
    // Entering Archive from the top nav should always restore the map overview,
    // not preserve a previously focused event from a cross-page jump.
    if(viaTopNav){
      resetArchiveOverviewState({recenter:false});
    }
    // Track origin for back button
    if(fromPage&&fromPage!=='archive'){_mapOriginPage=fromPage;}
    else if(prev&&prev!=='archive'){_mapOriginPage=prev;}
    else if(!_mapOriginPage){_mapOriginPage=null;}
    const backBtn=document.getElementById('map-back-btn');
    if(_mapOriginPage&&backBtn){
      backBtn.style.display='flex';
      _setBackLabel(
        backBtn,
        ({home:'Home',timeline2:'Timeline',discourse:'Discourse',chat:'Chat'}[_mapOriginPage]||_mapOriginPage),
        {chatReturn:_mapOriginPage==='chat'}
      );
    } else if(backBtn){backBtn.style.display='none';}
    renderSidebarTL();renderSidebarCal();setTimeout(()=>{initMap();renderMarkers();if(viaTopNav) resetArchiveOverviewState();if(window._syncMapChromeState)window._syncMapChromeState();setTimeout(observeRulerTicks,200);
    // Force Leaflet to recalculate map size in case it was hidden during init
    if(leafletMap){setTimeout(()=>{leafletMap.invalidateSize({animate:false});},80);}
    },30);
  } else {
    _mapOriginPage=null;
    const backBtn=document.getElementById('map-back-btn');
    if(backBtn)backBtn.style.display='none';
    if(window._resetMapChromeState) window._resetMapChromeState();
  }

  if(p==='timeline2'){
    if(fromPage==='preserve'){
      // keep the existing timeline origin
    } else if(fromPage&&fromPage!=='timeline2'){
      _timeline2OriginPage=fromPage;
    } else if(!fromPage){
      _timeline2OriginPage=null;
    }
    if(viaTopNav){
      resetTimeline2OverviewState();
    }
    updateTimeline2BackButton();
    try{
      const tlFrame=document.getElementById('timeline2-frame');
      tlFrame?.contentWindow?.forceTimelineLayout?.();
      tlFrame?.contentWindow?.alignHeaderCenterToParentTabs?.();
    }catch(e){}
    scheduleTimeline2NavAlignment();
  } else {
    setTimelineNavOffset(0);
    const tl2BackBtn=document.getElementById('timeline2-back-btn');
    if(tl2BackBtn) tl2BackBtn.style.display='none';
  }

  if(p==='chat'){
    if(typeof window.acknowledgeChatFabNotice==='function') window.acknowledgeChatFabNotice();
    if(fromPage&&fromPage!=='chat'){
      _chatOriginPage=fromPage;
    } else if(!fromPage){
      _chatOriginPage=null;
    }
    updateChatBackButton();
    requestAnimationFrame(()=>{
      if(typeof window.refreshChatUI==='function') window.refreshChatUI();
    });
  } else {
    updateChatBackButton();
  }

  if(p==='home'){
    requestAnimationFrame(()=>{
      observeHomeSections(); // builds observer once; scroll loop runs continuously
      observeHTLNodes();
    });
  }
  if(p==='discourse'&&!window._discourseInitialized){
    window._discourseInitialized=true;
    initDiscourse();
  }
  /* Re-observe active discourse panel when returning to discourse page */
  if(p==='discourse' && window._discourseInitialized){
    setTimeout(()=>{
      const activePanel = document.querySelector('#page-discourse .dc-platform-panel.on');
      if(activePanel && window._reObserveDcPanel) window._reObserveDcPanel(activePanel);
    }, 120);
  }
  /* When entering discourse, start from the hero top. */
  if(p==='discourse'){
    const btnTop=document.getElementById('dc-btn-top');
    const trigger=document.getElementById('dc-toc-trigger');
    const tocPanel=document.getElementById('dc-toc-panel');
    const edge=document.getElementById('dc-toc-edge');
    if(btnTop) { btnTop.style.display='flex'; }
    if(trigger) { trigger.style.display='block'; }
    if(tocPanel) { tocPanel.style.display='flex'; }
    if(edge) edge.classList.add('show');
    /* Restore INDEX tab immediately to avoid the white gap after navigation */
    const dcTab=document.getElementById('dc-toc-tab');
    if(dcTab) {
      dcTab.style.display='flex';
      dcTab.style.transition='none';
      dcTab.classList.add('show');
      dcTab.classList.add('dc-tab-visible');
      dcTab.style.pointerEvents='auto';
      requestAnimationFrame(()=>{ dcTab.style.transition=''; });
    }
    setTimeout(()=>{
      const dcPage = document.getElementById('page-discourse');
      if(dcPage){
        dcPage.scrollTo({top: 0, behavior:'instant'});
      }
      if(window._resizeDiscourseCharts){
        setTimeout(()=>window._resizeDiscourseCharts(),120);
      }
    }, 40);
  }
  if(p==='timeline2'){
    ensureTimeline2FrameLoaded();
  }
  if(p==='chat' && window.closeFloatingChatPanel){
    window.closeFloatingChatPanel();
    if(window.refreshChatUI) setTimeout(()=>window.refreshChatUI(),40);
  }
  if(p==='gallery'){
    if(window.buildGallery) window.buildGallery();
    // Show back button if we came from somewhere
    const backBtn=document.getElementById('gallery-back-btn');
    if(backBtn){
      const origin=fromPage&&fromPage!=='gallery'?fromPage:(prev&&prev!=='gallery'?prev:null);
      window._galleryOriginPage=origin||window._galleryOriginPage||null;
      if(window._galleryOriginPage){
        backBtn.hidden=false;
        const label={home:'Home',archive:'Map',timeline2:'Time',discourse:'Discourse',chat:'Chat'};
        _setBackLabel(
          backBtn,
          label[window._galleryOriginPage]||window._galleryOriginPage,
          {chatReturn:window._galleryOriginPage==='chat'}
        );
      } else {
        backBtn.hidden=true;
      }
    }
  } else {
    window._galleryOriginPage=null;
  }
  /* Hide discourse fixed UI when on other pages; show when on discourse */
  if(p!=='discourse' && window._discourseInitialized){
    if(window.hideDcFixed) window.hideDcFixed();
  }
  /* Always close compare panel + fullscreen when leaving discourse */
  if(p!=='discourse'){
    if(window.closeComparePanel) window.closeComparePanel({immediate:true});
    if(window.closeCmpFullscreen) window.closeCmpFullscreen();
  }
  scheduleResponsiveCollisionHides();
}
window.showPage=showPage;

/* MAP */
function initMap(){
  if(leafletMap)return;
  leafletMap=L.map('leaflet-map',{center:[67.857,20.26],zoom:13,zoomControl:false});
  leafletMap.on('move zoom resize',()=>requestAnimationFrame(centerMapPopupCard));
  if(window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(centerMapPopupCard)).observe(leafletMap.getContainer());

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:19
  }).addTo(leafletMap);

  L.control.zoom({position:'bottomleft'}).addTo(leafletMap);

  // Align zoom control left edge exactly with homeBtn (left:14px in mapwrap)
  requestAnimationFrame(()=>{
    const zoomEl = document.querySelector('.leaflet-control-zoom');
    const mapwrap = document.getElementById('mapwrap');
    if(zoomEl && mapwrap){
      const containerLeft = zoomEl.closest('.leaflet-bottom.leaflet-left');
      if(containerLeft){
        // Zero out Leaflet's container padding/margin so margin-left is absolute
        containerLeft.style.padding = '0';
        containerLeft.style.margin = '0';
      }
      zoomEl.style.marginLeft = '14px';
    }
  });

  const homeBtn=document.createElement('button');
  homeBtn.className='map-home-btn';
  homeBtn.title='Back to Kiruna';
  homeBtn.innerHTML=`<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.8"/><line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>`;
  homeBtn.addEventListener('click',()=>{
    leafletMap.flyTo([67.857,20.26],13,{animate:true,duration:.7});
    homeBtn.style.borderColor='var(--accent)';
    homeBtn.style.color='var(--accent)';
    setTimeout(()=>{homeBtn.style.borderColor='';homeBtn.style.color='';},1000);
  });
  document.getElementById('mapwrap').appendChild(homeBtn);

  // ── Fullscreen map button ──
  const fsBtn=document.createElement('button');
  fsBtn.id='map-fs-btn';
  fsBtn.title='Fullscreen map';
  const fsIconExpand=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="#424245" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const fsIconCollapse=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" stroke="#0066cc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  fsBtn.innerHTML=fsIconExpand;
  const _sidebar=document.getElementById('sidebar');
  const _root=document.documentElement;
  window._mapFsState=false;
  if(typeof window._mapPopupOpen!=='boolean') window._mapPopupOpen=false;
  if(typeof window._mapDetailOpen!=='boolean') window._mapDetailOpen=false;
  function syncPhoneDetailMarkerVisibility(){
    const hide=!!window._mapDetailOpen && window.isPhoneAppMode && window.isPhoneAppMode();
    document.querySelectorAll('#leaflet-map .leaflet-marker-icon').forEach(el=>{
      el.style.opacity=hide?'0':'';
      el.style.pointerEvents=hide?'none':'';
    });
  }
  function syncMapChromeState(){
    _root.classList.toggle('map-fs-active', !!window._mapFsState && activePage==='archive');
    _root.classList.toggle('map-popup-open', !!window._mapPopupOpen && activePage==='archive');
    _root.classList.toggle('map-detail-open', !!window._mapDetailOpen && activePage==='archive');
    syncPhoneDetailMarkerVisibility();
    requestAnimationFrame(syncPhoneDetailMarkerVisibility);
    setTimeout(syncPhoneDetailMarkerVisibility, 90);
    requestAnimationFrame(syncMapTimelinePreviewPosition);
    requestAnimationFrame(()=>window.scheduleResponsiveCollisionHides?.());
  }
  function initPhoneMapSheet(){
    if(!_sidebar || _sidebar.dataset.phoneSheetReady) return;
    _sidebar.dataset.phoneSheetReady='1';
    let startY=0;
    let currentY=0;
    let dragging=false;
    let startOffset=0;
    const peek=()=>{
      const raw=getComputedStyle(document.documentElement).getPropertyValue('--phone-sheet-peek').trim();
      const val=parseFloat(raw);
      return Number.isFinite(val)?val:76;
    };
    const maxOffset=()=>Math.max(0,_sidebar.offsetHeight-peek());
    const canStart=(target,clientY)=>{
      if(!(window.isPhoneAppMode&&window.isPhoneAppMode())) return false;
      if(activePage!=='archive') return false;
      const rect=_sidebar.getBoundingClientRect();
      const nearTop=clientY-rect.top<=84;
      return !!(nearTop || target.closest('.era-head') || target.closest('.cpe-head'));
    };
    const begin=(clientY,target)=>{
      if(!canStart(target,clientY)) return;
      dragging=true;
      startY=clientY;
      currentY=clientY;
      startOffset=_root.classList.contains('map-sheet-collapsed')?maxOffset():0;
      _sidebar.classList.add('is-dragging');
      _sidebar.classList.remove('phone-sheet-hint');
      _sidebar.style.transition='none';
    };
    const move=(clientY)=>{
      if(!dragging) return;
      currentY=clientY;
      const next=Math.max(0,Math.min(maxOffset(),startOffset+(clientY-startY)));
      _sidebar.style.transform=`translateY(${next}px)`;
    };
    const end=()=>{
      if(!dragging) return;
      dragging=false;
      const delta=currentY-startY;
      const collapsed=_root.classList.contains('map-sheet-collapsed');
      const shouldCollapse=collapsed?delta>-36:delta>68;
      const shouldExpand=collapsed&&delta<-34;
      if(shouldExpand) _root.classList.remove('map-sheet-collapsed');
      else if(shouldCollapse) _root.classList.add('map-sheet-collapsed');
      _sidebar.classList.remove('is-dragging');
      _sidebar.style.transition='';
      _sidebar.style.transform='';
      syncMapChromeState();
    };
    _sidebar.addEventListener('touchstart',e=>{
      if(e.touches && e.touches[0]) begin(e.touches[0].clientY,e.target);
    },{passive:true});
    _sidebar.addEventListener('touchmove',e=>{
      if(e.touches && e.touches[0]) move(e.touches[0].clientY);
    },{passive:true});
    _sidebar.addEventListener('touchend',end,{passive:true});
    _sidebar.addEventListener('touchcancel',end,{passive:true});
    requestAnimationFrame(()=>{
      if(window.isPhoneAppMode&&window.isPhoneAppMode()){
        _sidebar.classList.add('phone-sheet-hint');
        setTimeout(()=>_sidebar.classList.remove('phone-sheet-hint'),1800);
      }
    });
  }
  window._syncMapChromeState = syncMapChromeState;
  window._resetMapChromeState = function(){
    window._mapFsState=false;
    window._mapPopupOpen=false;
    window._mapDetailOpen=false;
    _root.classList.remove('map-sheet-collapsed');
    _sidebar.classList.remove('fs-hidden','is-dragging','phone-sheet-hint');
    _sidebar.style.transform='';
    _sidebar.style.transition='';
    fsBtn.innerHTML=fsIconExpand;
    fsBtn.title='Fullscreen map';
    fsBtn.style.borderColor='';
    syncMapChromeState();
  };
  initPhoneMapSheet();
  fsBtn.addEventListener('click',()=>{
    window._mapFsState=!window._mapFsState;
    if(window._mapFsState){
      _sidebar.classList.add('fs-hidden');
      fsBtn.innerHTML=fsIconCollapse;
      fsBtn.title='Exit fullscreen';
      fsBtn.style.borderColor='var(--accent)';
    } else {
      _sidebar.classList.remove('fs-hidden');
      fsBtn.innerHTML=fsIconExpand;
      fsBtn.title='Fullscreen map';
      fsBtn.style.borderColor='';
    }
    syncMapChromeState();
    setTimeout(()=>leafletMap.invalidateSize({animate:true}),360);
  });
  document.getElementById('mapwrap').appendChild(fsBtn);

  var _municipalityLayer = L.geoJSON(window.KirunaMapGeometry.municipality,{style:{color:'#0066cc',weight:1.8,opacity:.45,dashArray:'6 4',fillColor:'#0066cc',fillOpacity:0.04}});  mapAreaLayers['kiruna-municipality']=_municipalityLayer;  mapAreaVisibility['kiruna-municipality']=true;  _municipalityLayer.addTo(leafletMap);

  // ── Area polygons (from database) ──
  const _areaData = window.KirunaMapGeometry.areas;

  window._mapAreaMeta = _areaData.map(function(a){
    return {id:a.id,label:a.label,color:a.color};
  });
  // Prepend the municipality boundary (already in mapAreaLayers from above)
  window._mapAreaMeta.unshift({id:'kiruna-municipality',label:'Kiruna Municipality',color:'#7a98b8'});
  _areaData.forEach(function(a){
    var poly = L.polygon(a.coords, {
      color: a.color, weight: 1.8, opacity: 0.85,
      fillColor: a.color, fillOpacity: 0.18,
      interactive: false
    }).addTo(leafletMap);
    mapAreaLayers[a.id] = poly;
    if(!(a.id in mapAreaVisibility)) mapAreaVisibility[a.id] = true;
  });
  renderMapAreaLegend();

  buildMapRuler();
  buildMapTimelinePreview();
  leafletMap.on('moveend zoomend',updateEdgeIndicators);
  // Click on blank map area → deselect all markers
  leafletMap.on('click',function(){
    if(activeId===null && calYearFilter===null) return;
    activeId=null;
    ++mapSelectionToken;
    calYearFilter=null;
    window.KirunaRoutes.update('archive',{event:null,details:false});
    window._mapDetailOpen=false;
    leafletMap.closePopup();
    if(window._syncMapChromeState) window._syncMapChromeState();
    updateMarkerSelectionVisuals();
    highlightRulerYear(null);
    updateMapTimelinePreviewSelection(null);
    if(!syncSidebarTLSelection({scroll:false})) renderSidebarTL();
  });
}

function buildMapRuler(){
  const wrap=document.getElementById('mapwrap');
  const ruler=document.createElement('div');
  ruler.id='map-ruler';
  const inner=document.createElement('div');
  inner.id='map-ruler-inner';

  // Sort EVS by year ascending, deduplicate by year (keep first occurrence per year)
  const seenYears=new Set();
  const sortedUniq=[...EVS]
    .sort((a,b)=>a.year-b.year)
    .filter(ev=>{ if(seenYears.has(ev.year))return false; seenYears.add(ev.year); return true; });

  sortedUniq.forEach(ev=>{
    const tick=document.createElement('div');
    tick.className='ruler-tick';
    tick.dataset.id=ev.id;
    tick.dataset.year=ev.year;
    tick.innerHTML=`
      <div class="ruler-yr">${ev.year}</div>
      <div class="ruler-tick-line"></div>
      <div class="ruler-dot" style="background:var(--b)"></div>`;
    tick.addEventListener('click',()=>{
      // Find nearest event by year to the clicked tick's year
      const clickedYear=ev.year;
      let nearest=EVS[0];
      let minDiff=Infinity;
      EVS.forEach(e=>{
        const diff=Math.abs(e.year-clickedYear);
        if(diff<minDiff){minDiff=diff;nearest=e;}
      });
      selectEvent(nearest.id);
    });
    tick.addEventListener('dblclick',()=>{
      activeId=null;calYearFilter=null;
      ++mapSelectionToken;
      window.KirunaRoutes.update('archive',{event:null,details:false});
      leafletMap&&leafletMap.closePopup();
      updateMarkerSelectionVisuals();highlightRulerYear(null);
      updateMapTimelinePreviewSelection(null);
      if(!syncSidebarTLSelection({scroll:false})) renderSidebarTL();
    });
    inner.appendChild(tick);
  });
  ruler.appendChild(inner);
  wrap.appendChild(ruler);
}

function highlightRulerYear(id){
  const ev=EVS.find(e=>e.id===id);
  const targetYear=ev?ev.year:null;
  document.querySelectorAll('.ruler-tick').forEach(t=>{
    const active=targetYear!==null&&+t.dataset.year===targetYear;
    const dim=targetYear!==null&&!active;
    t.classList.toggle('active',active);
    t.classList.toggle('ruler-dim',dim);
    if(active)t.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  });
}

/* ── Timeline Overview: sliding density-bar rail ──────────────── */
const TL2OV_START    = 1900;
const TL2OV_END      = 2035;
const TL2OV_SPAN     = TL2OV_END - TL2OV_START;
const TL2OV_PAD      = 6;
const TL2OV_ZOOM_WIN = 28;
const TL2OV_BAR_MIN  = 3;
const TL2OV_BAR_MAX  = 32;
const TL2OV_ANCHORS  = [1900, 1950, 2000, 2035];

let _tl2ovRailW    = 0;
let _tl2ovActiveId = null;

function _tl2ovClamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function _tl2ovYearToPx(year, railW){
  return TL2OV_PAD + ((year - TL2OV_START) / TL2OV_SPAN) * (railW - TL2OV_PAD * 2);
}

function syncMapTimelinePreviewPosition(){
  const panel = document.getElementById('map-tl2-preview');
  if(!panel) return;
  panel.style.height = panel.classList.contains('is-collapsed') ? '0px' : '62px';
  requestAnimationFrame(()=>_tl2ovApplyTransform(_tl2ovActiveId, {immediate:true}));
}

function buildMapTimelinePreview(){
  const sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  let panel = document.getElementById('map-tl2-preview');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'map-tl2-preview';
    panel.innerHTML = `
      <div class="map-tl2-preview-header">
        <div class="map-tl2-preview-title-wrap">
          <div class="map-tl2-preview-title">Timeline Overview</div>
        </div>
      </div>
      <div class="map-tl2-preview-body">
        <div class="map-tl2-preview-viewport" id="tl2ov-viewport">
          <div class="map-tl2-preview-rail" id="tl2ov-rail"></div>
        </div>
      </div>`;
    const detail = document.getElementById('detail');
    if(detail) sidebar.insertBefore(panel, detail);
    else sidebar.appendChild(panel);
    if(!window._mapTl2PreviewResizeBound){
      window.addEventListener('resize', ()=>requestAnimationFrame(renderMapTimelinePreview));
      window._mapTl2PreviewResizeBound = true;
    }
  }
  requestAnimationFrame(()=>{ renderMapTimelinePreview(); syncMapTimelinePreviewPosition(); });
}

function renderMapTimelinePreview(){
  const rail = document.getElementById('tl2ov-rail');
  const viewport = document.getElementById('tl2ov-viewport');
  if(!rail||!viewport) return;
  const vpW = Math.round(viewport.getBoundingClientRect().width)||viewport.clientWidth||0;
  if(!vpW){ requestAnimationFrame(renderMapTimelinePreview); return; }
  _tl2ovRailW = vpW;

  const events = [...getEraFilteredEvents()].sort((a,b)=>a.year-b.year||a.id-b.id);
  rail.innerHTML = '';

  // Group events by year
  const yearMap = new Map();
  events.forEach(ev=>{
    if(!yearMap.has(ev.year)) yearMap.set(ev.year, {count:0, cats:[], ids:[]});
    const r = yearMap.get(ev.year);
    r.count++; r.cats.push(ev.cat); r.ids.push(ev.id);
  });
  const maxCount = Math.max(1, ...[...yearMap.values()].map(r=>r.count));

  yearMap.forEach((row, year)=>{
    const x = _tl2ovYearToPx(year, vpW);
    const catCounts = {};
    row.cats.forEach(c=>{ catCounts[c]=(catCounts[c]||0)+1; });
    const domCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0][0];
    const color  = CC[domCat] || '#8ba2b8';
    const ratio  = Math.log(row.count+1) / Math.log(maxCount+1);
    const barH   = TL2OV_BAR_MIN + ratio * (TL2OV_BAR_MAX - TL2OV_BAR_MIN);

    const bar = document.createElement('div');
    bar.className = 'tl2ov-bar';
    bar.style.cssText = `left:${x.toFixed(2)}px;height:${barH.toFixed(1)}px;--bar-color:${color}`;
    bar.dataset.year = year;
    bar.dataset.ids  = row.ids.join(',');
    bar.title = `${year}: ${row.count} event${row.count>1?'s':''}`;
    bar.addEventListener('click', e=>{ e.stopPropagation(); selectEvent(row.ids[0]); });
    rail.appendChild(bar);

    const callout = document.createElement('div');
    callout.className  = 'tl2ov-callout';
    callout.id         = `tl2ov-callout-y${year}`;
    callout.style.left = `${x.toFixed(2)}px`;
    callout.textContent = year;
    rail.appendChild(callout);
  });

  TL2OV_ANCHORS.forEach(year=>{
    const x = _tl2ovYearToPx(year, vpW);
    const a = document.createElement('div');
    a.className = 'tl2ov-anchor';
    a.style.left = `${x.toFixed(2)}px`;
    a.dataset.anchorYear = year;
    a.textContent = year;
    rail.appendChild(a);
  });

  _tl2ovApplyTransform(_tl2ovActiveId, {immediate:true});
}

function updateMapTimelinePreviewSelection(id, opts={}){
  _tl2ovActiveId = id;
  _tl2ovApplyTransform(id, opts);
}

function _tl2ovApplyTransform(id, opts={}){
  const rail = document.getElementById('tl2ov-rail');
  const viewport = document.getElementById('tl2ov-viewport');
  if(!rail||!viewport) return;
  const vpW = _tl2ovRailW||(Math.round(viewport.getBoundingClientRect().width)||viewport.clientWidth||0);
  if(!vpW) return;

  const ev = (id!==null&&id!==undefined) ? EVS.find(e=>e.id===id) : null;

  rail.querySelectorAll('.tl2ov-bar').forEach(bar=>{
    const yr = +bar.dataset.year;
    bar.classList.toggle('is-active', !!ev && yr===ev.year);
    bar.classList.toggle('is-dim',    !!ev && yr!==ev.year);
  });
  rail.querySelectorAll('.tl2ov-callout').forEach(c=>c.classList.remove('is-visible'));
  if(ev){ const c=document.getElementById(`tl2ov-callout-y${ev.year}`); if(c) c.classList.add('is-visible'); }

  let scaleX=1, translateX=0;
  if(ev){
    scaleX = TL2OV_SPAN / (TL2OV_ZOOM_WIN * 2);
    const ax = _tl2ovYearToPx(ev.year, vpW);
    translateX = _tl2ovClamp(vpW/2 - ax*scaleX, vpW - vpW*scaleX, 0);
  }
  viewport.style.setProperty('--tl2ov-iscale', (1/scaleX).toFixed(5));

  rail.querySelectorAll('.tl2ov-anchor').forEach(a=>{
    if(ev){
      const sx = _tl2ovYearToPx(+a.dataset.anchorYear, vpW)*scaleX+translateX;
      a.classList.toggle('is-hidden', Math.abs(sx-vpW/2)<30||sx<2||sx>vpW-2);
    } else { a.classList.remove('is-hidden'); }
  });

  const tv = `translateX(${translateX.toFixed(2)}px) scaleX(${scaleX.toFixed(5)})`;
  if(opts.immediate){
    rail.style.transition='none'; rail.style.transform=tv;
    void rail.offsetWidth; rail.style.transition='';
  } else { rail.style.transform=tv; }
}


let _edgeEls=[];
function updateEdgeIndicators(){
  if(!leafletMap)return;
  _edgeEls.forEach(el=>el.remove());
  _edgeEls=[];
  if(window._mapPopupOpen)return;
  const bounds=leafletMap.getBounds();
  const mapEl=document.getElementById('mapwrap');
  const W=mapEl.clientWidth,H=mapEl.clientHeight;
  const filtered=eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter);

  const edges={left:[],right:[],top:[],bottom:[]};
  filtered.forEach(ev=>{
    if(bounds.contains([ev.lat,ev.lng]))return;
    const p=leafletMap.latLngToContainerPoint([ev.lat,ev.lng]);
    if(p.x<0)edges.left.push(ev);
    else if(p.x>W)edges.right.push(ev);
    else if(p.y<0)edges.top.push(ev);
    else edges.bottom.push(ev);
  });

  const edgeDefs=[
    {key:'left',  style:`left:12px;top:50%;transform:translateY(-50%)`, arrow:'←'},
    {key:'right', style:`right:12px;top:50%;transform:translateY(-50%)`, arrow:'→'},
    {key:'top',   style:`top:60px;left:50%;transform:translateX(-50%)`, arrow:'↑'},
    {key:'bottom',style:`bottom:68px;left:50%;transform:translateX(-50%)`, arrow:'↓'},
  ];
  edgeDefs.forEach(({key,style,arrow})=>{
    const evs=edges[key];if(!evs.length)return;
    const center=leafletMap.getCenter();
    const nearest=evs.reduce((a,b)=>{
      const da=Math.hypot(a.lat-center.lat,a.lng-center.lng);
      const db=Math.hypot(b.lat-center.lat,b.lng-center.lng);
      return da<db?a:b;
    });
    const color=CC[nearest.cat];
    const el=document.createElement('div');
    el.className='map-edge-indicator';
    el.style.cssText=style+';position:absolute;pointer-events:all;cursor:pointer';
    el.innerHTML=`<span class="ei-arrow">${arrow}</span><span class="ei-dot" style="background:${color}"></span><span style="letter-spacing:-.01em">${evs.length} event${evs.length>1?'s':''}</span>`;
    el.addEventListener('click',()=>{
      // Clear active selection when navigating via edge indicator
      activeId=null;
      updateMarkerSelectionVisuals();
      highlightRulerYear(null);
      updateMapTimelinePreviewSelection(null);
      if(!syncSidebarTLSelection()) renderSidebarTL();
      if(window._syncMapChromeState) window._syncMapChromeState();
      const z=leafletMap.getZoom();
      leafletMap.flyTo([nearest.lat,nearest.lng],z,{animate:true,duration:.5});
    });
    mapEl.appendChild(el);
    _edgeEls.push(el);
  });
}

function updateMarkerSelectionVisuals(){
  const hasSelection = activeId!==null;
  Object.entries(leafletMarkers).forEach(([id,marker])=>{
    const el=marker.getElement();
    const root=el?.querySelector('.map-ev-marker');
    if(!root) return;
    const isAct=+id===activeId;
    root.classList.toggle('is-active',isAct);
    root.classList.toggle('is-dim',hasSelection&&!isAct);
    if(!isAct) root.classList.remove('gallery-map-arrival');
    marker.setZIndexOffset(isAct?300:0);
  });
}

function flashGalleryMapMarker(id){
  const marker=leafletMarkers[id];
  const root=marker?.getElement()?.querySelector('.map-ev-marker');
  if(!root) return;
  root.classList.remove('gallery-map-arrival');
  void root.offsetWidth;
  root.classList.add('gallery-map-arrival');
  clearTimeout(root._galleryMapArrivalTimer);
  root._galleryMapArrivalTimer=setTimeout(()=>{
    root.classList.remove('gallery-map-arrival');
    root._galleryMapArrivalTimer=null;
  },760);
}

function buildMapPopupHtml(ev,filtered){
  const tagsHtml=(ev.tags||[]).map(t=>`<span class="popup-expand-tag">${t}</span>`).join('');
  const stakeholders=ev.stakeholders||((ev.sources||[]).map(s=>s.t.split(/[,.(]/)[0].trim()).filter(Boolean));
  const stakeholdersHtml=stakeholders.length?`<div class="popup-stakeholder-label">Stakeholders</div><div class="popup-stakeholders-row">${stakeholders.map(s=>`<span class="popup-stakeholder-pill">${s}</span>`).join('')}</div>`:'';
  const related=relatedMapEvents(ev,filtered);
  const relatedHtml=related.length?`<div class="popup-related"><div class="popup-related-heading">Related by topic</div>${related.map(({event,topic})=>`<button class="popup-related-link" type="button" onclick="event.stopPropagation();window._selectEv(${event.id})"><span>${event.year} · ${event.title}</span><small>${topic} →</small></button>`).join('')}</div>`:'';
  const pid=`ppx-${ev.id}`;
  return `
<div class="popup-inner">
  <div class="popup-yr">${ev.year} · ${CL[ev.cat]}</div>
  <div class="popup-title">${ev.title}</div>
  <div class="popup-cat">${ev.loc||ev.docType||''}</div>
  <div class="popup-short-desc">${ev.desc}</div>
  ${relatedHtml}
</div>
<div class="popup-expand" id="${pid}">
  <div class="popup-expand-inner">
    <div class="popup-expand-desc">${ev.desc}</div>
    <div class="popup-expand-loc">
      <span style="font-size:14px;flex-shrink:0">◎</span>
      <div><div class="popup-expand-loc-name">${ev.docType||ev.loc}</div><div class="popup-expand-loc-coords">${ev.coords}</div></div>
    </div>
    ${stakeholdersHtml}
    <div class="popup-expand-tags">${tagsHtml}</div>
    <div class="popup-expand-pad"></div>
  </div>
</div>
<div class="popup-btn-row">
  <button class="popup-btn" onclick="window._togglePopupDetail('${pid}',this)">View Details</button>
  <button class="popup-btn popup-btn-sec" onclick="window.openGalleryItem('inside',${ev.id})">View in Gallery</button>
</div>`;
}

function renderMarkers(){
  if(!leafletMap)return;
  Object.values(leafletMarkers).forEach(m=>m.remove());
  leafletMarkers={};
  // Remove old selection circles
  if(window._selCircles){window._selCircles.forEach(c=>c.remove());window._selCircles=[];}
  const filtered=(eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter));

  function buildMarkerHtml(ev, isAct){
    const color=CC[ev.cat];
    const s=ev.featured?18:14;
    const box=Math.round(s*3);
    const classes=['map-ev-marker'];
    if(ev.featured) classes.push('is-featured');
    if(isAct) classes.push('is-active');
    else if(activeId!==null) classes.push('is-dim');
    // When a type filter is active, add a small floating geometric icon so all markers are identifiable
    const showTypeLabel = eraFilter !== 'all';
    const roundedDownTriangle = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5L11.5 2.5L7 12Z" fill="#fff" stroke="#fff" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" opacity=".95"/></svg>`;
    const typeLabelHtml = showTypeLabel
      ? `<div class="map-ev-type-label" style="background:${color}">${roundedDownTriangle}</div>`
      : '';
    return `<div class="${classes.join(' ')}" style="--marker-size:${s}px;--marker-box:${box}px;--marker-color:${color};--marker-halo:${color}55;">
      <div class="map-ev-ring"></div>
      <div class="map-ev-shell">
        <div class="map-ev-center"></div>
      </div>
      ${typeLabelHtml}
    </div>`;
  }

  filtered.forEach(ev=>{
    const isActive=activeId===ev.id;
    const s=ev.featured?18:14;
    const box=Math.round(s*3);
    const icon=L.divIcon({
      className:'',
      html:buildMarkerHtml(ev,isActive),
      iconSize:[box,box],iconAnchor:[box/2,box/2],popupAnchor:[0,-(Math.round(s/2)+6)]
    });
    const m=L.marker([ev.lat,ev.lng],{icon,zIndexOffset:isActive?300:0}).addTo(leafletMap);
    m.bindPopup(L.popup({
      closeButton:false,
      maxWidth:420,
      minWidth:280,
      autoPan:false
    }).setContent(buildMapPopupHtml(ev,filtered)));
    m.on('popupopen',()=>{
      window.KirunaRoutes.update('archive',{event:ev.id});
      const mapSize=leafletMap.getSize();
      const mapEl=leafletMap.getContainer();
      mapEl.style.setProperty('--popup-center-x',`${mapSize.x/2}px`);
      mapEl.style.setProperty('--popup-center-y',`${mapSize.y/2}px`);
      requestAnimationFrame(centerMapPopupCard);
      window._mapPopupOpen=true;
      window._mapDetailOpen=false;
      updateEdgeIndicators();
      document.documentElement.classList.remove('map-sheet-collapsed');
      if(window._syncMapChromeState) window._syncMapChromeState();
    });
    m.on('popupclose',()=>{
      window._mapPopupOpen=false;
      window._mapDetailOpen=false;
      updateEdgeIndicators();
      if(window._syncMapChromeState) window._syncMapChromeState();
    });
    m.on('click',()=>{
      // Toggle: clicking the already-active marker deselects it
      if(activeId===ev.id){
        activeId=null;
        ++mapSelectionToken;
        window.KirunaRoutes.update('archive',{event:null,details:false});
        window._mapDetailOpen=false;
        document.documentElement.classList.remove('map-sheet-collapsed');
        updateMarkerSelectionVisuals();
        highlightRulerYear(null);
        updateMapTimelinePreviewSelection(null);
        if(!syncSidebarTLSelection()) renderSidebarTL();
        m.closePopup();
        if(window._syncMapChromeState) window._syncMapChromeState();
        setTimeout(updateEdgeIndicators,100);
        return;
      }
      selectEvent(ev.id);
    });
    leafletMarkers[ev.id]=m;
  });
  setTimeout(updateEdgeIndicators,100);
}

function fitMapPopupContent(card,mapWidth,visibleHeight){
  const content=card.querySelector('.leaflet-popup-content');
  const wrapper=card.querySelector('.leaflet-popup-content-wrapper');
  if(content&&wrapper){
    const maxWidth=Math.max(280,Math.min(620,mapWidth-32));
    const fitKey=`${maxWidth}:${visibleHeight}:${content.className}`;
    if(content.dataset.fitKey!==fitKey){
      const buttons=content.querySelector('.popup-btn-row');
      if(buttons)buttons.style.flexDirection='';
      wrapper.style.setProperty('max-width',`${maxWidth}px`,'important');
      content.style.setProperty('transition','none','important');
      content.style.setProperty('overflow-wrap','anywhere');
      content.style.setProperty('width',`${Math.min(300,maxWidth)}px`,'important');
      for(let width=320;content.scrollHeight>content.clientHeight+1&&width<maxWidth+20;width+=20){
        content.style.setProperty('width',`${Math.min(width,maxWidth)}px`,'important');
      }
      if(buttons&&content.scrollHeight>content.clientHeight+1)buttons.style.flexDirection='row';
      content.style.setProperty('overflow-y',content.scrollHeight>content.clientHeight+1?'auto':'hidden','important');
      content.dataset.fitKey=fitKey;
    }
  }
}
function centerMapPopupCard(){
  if(!leafletMap)return;
  const mapEl=leafletMap.getContainer();
  const card=mapEl.querySelector('.leaflet-popup');
  if(!card)return;
  const mapRect=mapEl.getBoundingClientRect();
  const rulerTop=document.getElementById('map-ruler')?.getBoundingClientRect().top;
  const bottom=rulerTop>mapRect.top?Math.min(mapRect.bottom,rulerTop):mapRect.bottom;
  const visibleTop=mapRect.top+12;
  const visibleBottom=bottom-12;
  mapEl.style.setProperty('--map-popup-max-height',`${Math.max(0,visibleBottom-visibleTop)}px`);
  fitMapPopupContent(card,mapRect.width,visibleBottom-visibleTop);
  const cardRect=card.getBoundingClientRect();
  const styles=getComputedStyle(mapEl);
  const x=parseFloat(styles.getPropertyValue('--popup-center-x'))||leafletMap.getSize().x/2;
  const y=parseFloat(styles.getPropertyValue('--popup-center-y'))||leafletMap.getSize().y/2;
  mapEl.style.setProperty('--popup-center-x',`${x+mapRect.left+mapRect.width/2-cardRect.left-cardRect.width/2}px`);
  mapEl.style.setProperty('--popup-center-y',`${y+(visibleTop+visibleBottom)/2-cardRect.top-cardRect.height/2}px`);
}
window._togglePopupDetail=function(pid,btn){
  const el=document.getElementById(pid);
  if(!el)return;
  const content=el.closest('.leaflet-popup-content');
  const wrapper=content?.closest('.leaflet-popup-content-wrapper');
  wrapper?._detailAnimation?.cancel();
  const before=wrapper?.getBoundingClientRect();
  const open=el.classList.toggle('open');
  const phoneMode=window.isPhoneAppMode&&window.isPhoneAppMode();
  btn.textContent=open?'Hide Details':'View Details';
  window._mapDetailOpen=!!open;
  window.KirunaRoutes.update('archive',{details:open});

  if(phoneMode) document.documentElement.classList.remove('map-sheet-collapsed');
  if(window._syncMapChromeState) window._syncMapChromeState();
  // hide short desc when details are open to avoid duplicate text
  content.classList.toggle('details-open',open);
  const shortDesc=content.querySelector('.popup-short-desc');
  if(shortDesc)shortDesc.hidden=open;
  centerMapPopupCard();
  if(wrapper&&before&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const after=wrapper.getBoundingClientRect();
    wrapper._detailAnimation=wrapper.animate([
      {height:`${before.height}px`,width:`${before.width}px`},
      {height:`${after.height}px`,width:`${after.width}px`}
    ],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
  }
};

window._selectEv=function(id){selectEvent(id);};
window._openPopover=function(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;
  openPopover(ev);
};
window._selectAndOpenPopover=function(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;
  selectEvent(id);
  setTimeout(()=>openPopover(ev), 400);
};
function buildHTL(){
  const cont=document.getElementById('htl-nodes');
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const nd=document.createElement('div');
    nd.className='htl-node'+(ev.featured?' featured':'')+(i===0?' htl-first':'');
    nd.innerHTML=
      (above?`<div class="htl-above"><div class="htl-name">${ev.title}</div><div class="htl-yr">${ev.year}</div></div>`:'')
      +`<div class="htl-dot" style="background:${CC[ev.cat]}"></div>`
      +(!above?`<div class="htl-below"><div class="htl-name">${ev.title}</div><div class="htl-yr">${ev.year}</div></div>`:'');
    nd.addEventListener('click',()=>openTimeline2View('overview', ev.year, 'home', ev.id));
    cont.appendChild(nd);
  });
}

function buildCards(){
  const g=document.getElementById('cards-grid');
  EVS.filter(e=>e.featured).forEach(ev=>{
    const d=document.createElement('div');d.className='card';
    d.innerHTML=`<div class="card-era"><span class="card-cat-dot" style="background:${CC[ev.cat]}"></span>${CL[ev.cat]}</div><div class="card-yr">${ev.year}</div><div class="card-title">${ev.title}</div><div class="card-desc">${ev.desc}</div><div class="card-arr">→</div>`;
    d.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});
    g.appendChild(d);
  });
}

let _photosOn=true;
function buildCombinedTimeline(){
  const body=document.getElementById('dtl-body');
  if(body.dataset.built)return;
  body.dataset.built='1';
  const stage=document.createElement('div');
  stage.className='dtl-stage';
  const cline=document.createElement('div');
  cline.className='dtl-center-line';
  stage.appendChild(cline);
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const col=document.createElement('div');
    col.className='dtl-col';
    const conn=document.createElement('div');
    conn.className='dtl-connector';
    conn.style.cssText=above?'bottom:50%;top:0;':'top:50%;bottom:0;';
    const dot=document.createElement('div');
    dot.className='dtl-dot'+(ev.featured?' featured':'');
    dot.style.background=CC[ev.cat];
    const card=document.createElement('div');
    card.className='dtl-card';
    card.style.cssText=above?'bottom:calc(50% + 20px)':'top:calc(50% + 20px)';
    card.innerHTML=`<div class="dtl-card-img"></div><div class="dtl-card-body"><div class="dtl-card-yr">${ev.year} · ${CL[ev.cat]}</div><div class="dtl-card-title">${ev.title}</div><div class="dtl-card-cat">${CL[ev.cat]}</div></div>`;

    col.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});

    col.appendChild(conn);col.appendChild(dot);col.appendChild(card);
    stage.appendChild(col);
  });
  body.appendChild(stage);
}

function buildTextTimeline(){
  const body=document.getElementById('dtl-text-body');
  if(body.dataset.built)return;
  body.dataset.built='1';
  const stage=document.createElement('div');
  stage.className='txt-stage';
  const cline=document.createElement('div');
  cline.className='txt-center-line';
  stage.appendChild(cline);
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const col=document.createElement('div');
    col.className='txt-col';
    const conn=document.createElement('div');
    conn.className='txt-connector';
    conn.style.cssText=above?'bottom:50%;top:0;':'top:50%;bottom:0;';
    const dot=document.createElement('div');
    dot.className='txt-dot'+(ev.featured?' featured':'');
    dot.style.background=ev.featured?CC[ev.cat]:'var(--w)';
    dot.style.borderColor=CC[ev.cat];
    const label=document.createElement('div');
    label.className='txt-label';
    label.style.cssText=above
      ?'bottom:calc(50% + 22px);left:50%;transform:translateX(-50%);transform-origin:bottom center;'
      :'top:calc(50% + 22px);left:50%;transform:translateX(-50%);transform-origin:top center;';
    label.innerHTML=`<div class="txt-yr" style="color:${CC[ev.cat]}">${ev.year}</div><div class="txt-title">${ev.title}</div><div class="txt-cat">${CL[ev.cat]}</div>`;
    col.appendChild(conn);col.appendChild(dot);col.appendChild(label);
    col.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});
    stage.appendChild(col);
  });
  body.appendChild(stage);
}

function buildPhaseView(){
  const outer=document.getElementById('phase-outer');
  outer.innerHTML='';  // always rebuild fresh
  outer.dataset.built='1';
  const eras=[
    {key:'urban',label:'Urban Planning',range:'Design & Prescriptive Documents',color:'#2471a3'},
    {key:'mine',label:'Technical Documents',range:'Deformation Forecasts & Surveys',color:'#a93226'},
    {key:'infra',label:'Construction & Effects',range:'Material Effects & Building Works',color:'#6c3483'},
    {key:'social',label:'Informative Documents',range:'Reports, Surveys & Records',color:'#1d8348'},
  ];
  eras.forEach(era=>{
    const evs=EVS.filter(e=>e.cat===era.key);
    const block=document.createElement('div');
    block.className='phase-era-block';
    block.innerHTML=`<div class="peb-head"><div class="peb-info"><div class="peb-era-name">${era.label}</div><div class="peb-era-range">${era.range} · ${evs.length} events archived</div></div></div><div class="peb-events" style="gap:1px">${evs.map((ev,ei)=>`<div class="peb-event" data-id="${ev.id}" style="transition-delay:${.15+ei*.06}s"><div class="peb-evt-dot" style="background:${CC[ev.cat]}"></div><div><div class="peb-evt-yr">${ev.year}</div><div class="peb-evt-title">${ev.title}${ev.featured?'<span class="peb-evt-feat">★</span>':''}</div></div></div>`).join('')}</div>`;
    block.querySelectorAll('.peb-event').forEach(r=>r.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(+r.getAttribute('data-id')),80);}));
    // Store fill-width as CSS var for animation
    outer.appendChild(block);
  });
}

function animatePhaseBlocks(){
  const blocks=document.querySelectorAll('.phase-era-block');
  if(!blocks.length)return;
  // Reset then stagger in
  blocks.forEach(b=>b.classList.remove('peb-in'));
  // Small delay per block for stagger
  blocks.forEach((b,i)=>{
    setTimeout(()=>{
      b.classList.add('peb-in');
    }, 60 + i*90);
  });
}

function renderSidebarTL(){
  const pane=document.getElementById('pane-tl');
  const filtered=eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter);
  let html='';
  ['urban','mine','infra','social'].forEach(era=>{
    const evs=filtered.filter(e=>e.cat===era);if(!evs.length)return;
    html+=`<div class="era-head">${EL[era]}</div>`;
    evs.forEach(ev=>{html+=`<div class="tl-row${activeId===ev.id?' on':''}" data-id="${ev.id}"><div class="tl-dot-s" style="background:${CC[ev.cat]}"></div><div><div class="tl-row-yr">${ev.year}</div><div class="tl-row-title">${ev.title}${ev.featured?`<span class="tl-feat">★</span>`:''}</div><div class="tl-row-cat">${CL[ev.cat]}</div></div></div>`;});
  });
  pane.innerHTML=html;
  // Suppress calRowSelectIn on initial render for already-selected rows
  pane.querySelectorAll('.tl-row.on').forEach(r=>r.classList.add('no-select-anim'));
  requestAnimationFrame(()=>{ pane.querySelectorAll('.tl-row.no-select-anim').forEach(r=>r.classList.remove('no-select-anim')); });
  pane.querySelectorAll('.tl-row').forEach(r=>r.addEventListener('click',e=>{e.currentTarget.blur();selectEvent(+r.getAttribute('data-id'));}));
  // Stable hover: use mouseenter/mouseleave on the pane to avoid flicker from child elements
  pane.onmouseover = e=>{
    const row=e.target.closest('.tl-row');
    if(!row) return;
    pane.querySelectorAll('.tl-row.hovered').forEach(r=>r!==row&&r.classList.remove('hovered'));
    row.classList.add('hovered');
  };
  pane.onmouseleave = ()=>{
    pane.querySelectorAll('.tl-row.hovered').forEach(r=>r.classList.remove('hovered'));
  };
  animateStaggerIn(pane.querySelectorAll('.era-head,.tl-row'),{axis:'x',distance:-12,step:6,duration:180});
  const on=pane.querySelector('.tl-row.on');if(on)on.scrollIntoView({block:'nearest',behavior:'smooth'});
  renderMapTimelinePreview();
  updateMapTimelinePreviewSelection(activeId,{immediate:true});
  scheduleResponsiveCollisionHides();
}

function syncSidebarTLSelection(opts={}){
  const pane=document.getElementById('pane-tl');
  if(!pane) return false;
  const rows=pane.querySelectorAll('.tl-row');
  if(!rows.length) return false;

  const activeRow = activeId===null ? null : pane.querySelector(`.tl-row[data-id="${activeId}"]`);
  if(activeId!==null && !activeRow) return false;

  rows.forEach(row=>row.classList.toggle('on', row===activeRow));
  if(activeRow && opts.scroll !== false){
    activeRow.scrollIntoView({block:'nearest',behavior:opts.behavior||'smooth'});
  }
  return true;
}

/* ── Update calendar nav button disabled states ── */
function _updateCalNavBtns(){
  const sStart = Math.floor((calYear-1900)/35)*35+1900;
  const cStart = Math.floor((cpYear-1900)/35)*35+1900;
  const prev = document.getElementById('cal-prev');
  const next = document.getElementById('cal-next');
  const cpPrev = document.getElementById('cpnav-prev');
  const cpNext = document.getElementById('cpnav-next');
  if(prev) prev.disabled = sStart <= 1900;
  if(next) next.disabled = sStart >= 2005;
  if(cpPrev) cpPrev.disabled = cStart <= 1900;
  if(cpNext) cpNext.disabled = cStart >= 2005;
}


function getEraFilteredEvents(){
  return eraFilter==='all' ? EVS : EVS.filter(e=>e.cat===eraFilter);
}

function renderSidebarCal(dir){
  const start=Math.floor((calYear-1900)/35)*35+1900;
  const end=start+34;
  const filteredEvents=getEraFilteredEvents();
  const rangeEvents=filteredEvents.filter(e=>e.year>=start&&e.year<=end);
  const filteredYears=new Set(rangeEvents.map(e=>e.year));
  const filteredFeaturedYears=new Set(rangeEvents.filter(e=>e.featured).map(e=>e.year));
  const label=`${start} – ${end}`;
  _calAnimLabel(document.getElementById('cal-label'), label, dir||null);
  document.getElementById('cal-dow').innerHTML=["'00","'05","'10","'15","'20","'25","'30"].map(d=>`<div class="dow-cell">${d}</div>`).join('');

  const grid=document.getElementById('cal-days');
  // Ensure 35 button cells exist
  _ensureCalGrid(grid, 35, 'day-cell');

  const cells=grid.children;
  const animDir=dir||null;
  for(let i=0;i<35;i++){
    const y=start+i;
    const btn=cells[i];
    const cls=['day-cell'];
    if(y===activeId)cls.push('selected');
    else if(y===calYear&&!calYearFilter)cls.push('today');
    if(filteredYears.has(y))cls.push('has-ev');
    if(filteredFeaturedYears.has(y))cls.push('feat-ev');
    if(y>2035)cls.push('dim');
    if(calYearFilter&&y===calYearFilter)cls.push('cal-year-active');
    btn.className=cls.join(' ');
    btn.title=String(y);
    btn.dataset.year=String(y);
    _animCellContent(btn, (c)=>{ c.textContent=String(y).slice(2); }, animDir);
  }
  if(animDir)animateStaggerIn(Array.from(cells),{axis:'x',distance:animDir==='left'?16:-16,step:8,duration:200});

  renderCalEvList(calYearFilter ? filteredEvents.filter(e=>e.year===calYearFilter) : rangeEvents,calYearFilter||null);
  _updateCalNavBtns();
  scheduleResponsiveCollisionHides();
}

function renderCalEvList(evs,sel){
  const c=document.getElementById('cal-evs');
  if(!evs.length){
    c.innerHTML='<div class="cal-ev-head" style="color:var(--g3);font-size:10px;padding:14px 0">No events recorded for this year</div>';
    scheduleResponsiveCollisionHides();
    return;
  }
  let h=`<div class="cal-ev-head"${sel?'':' data-default-period="1"'}>${sel?`Events in ${sel}`:'Events this period'}</div>`;
  evs.forEach(ev=>{h+=`<div class="cal-ev-row${activeId===ev.id?' is-active':''}" data-id="${ev.id}"><div class="cal-ev-d" style="background:${CC[ev.cat]}"></div><div><div class="cal-ev-title">${ev.title}</div><div class="cal-ev-yr">${ev.year} · ${CL[ev.cat]}</div></div></div>`;});
  c.innerHTML=h;
  c.querySelectorAll('.cal-ev-row').forEach(r=>r.addEventListener('click',()=>{
    const id=+r.getAttribute('data-id');
    // Highlight on map WITHOUT leaving the calendar tab
    activeId=id;
    const ev=EVS.find(e=>e.id===id);
    if(!ev)return;
    if(leafletMarkers[id]) updateMarkerSelectionVisuals();
    else renderMarkers();
    const m=leafletMarkers[id];
    if(m){
      const z=leafletMap?leafletMap.getZoom():13;
      if(leafletMap)leafletMap.flyTo([ev.lat,ev.lng],z,{animate:true,duration:.6});
      setTimeout(()=>m.openPopup(),700);
    }
    c.querySelectorAll('.cal-ev-row').forEach(row=>row.classList.remove('is-active'));
    r.classList.add('is-active');
    highlightRulerYear(id);
    updateMapTimelinePreviewSelection(id);
  }));
  animateStaggerIn(c.querySelectorAll('.cal-ev-head,.cal-ev-row'),{axis:'y',distance:8,step:18,duration:210});
  scheduleResponsiveCollisionHides();
}


/* ── Calendar: static grid, animate cell content in-place ── */

// Build the grid once; subsequent calls only update cell content
function _ensureCalGrid(container, count, cellClass){
  if(container.children.length === count) return; // already built
  container.innerHTML = '';
  for(let i=0;i<count;i++){
    const cell = document.createElement('div');
    cell.className = cellClass;
    cell.dataset.idx = i;
    container.appendChild(cell);
  }
}

// Animate a single year-label: old number fades out top, new fades in bottom (or reverse)
function _animCellContent(cell, buildFn, dir){
  // Get all animatable children
  const children = Array.from(cell.children);

  if(!dir){
    cell.innerHTML = '';
    buildFn(cell);
    return;
  }

  // Instant content swap — no animation on individual cells
  cell.innerHTML = '';
  buildFn(cell);
}

function triggerCalDayInteraction(cell){
  if(!cell)return;
  cell.classList.remove('cp-click-anim');
  void cell.offsetWidth;
  cell.classList.add('cp-click-anim');
  if(cell._cpClickAnimTimer) clearTimeout(cell._cpClickAnimTimer);
  cell._cpClickAnimTimer=setTimeout(()=>{
    cell.classList.remove('cp-click-anim');
    cell._cpClickAnimTimer=null;
  },540);
}

function _calAnimLabel(el, newText, dir){
  if(!el){ return; }
  if(el.id === 'cph-title' || el.id === 'cpn-label'){
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.textContent = newText;
    return;
  }
  if(!dir || el.textContent === newText){
    el.textContent = newText;
    return;
  }
  const DY_OUT = dir === 'left' ? '-5px' : '5px';
  const DY_IN  = dir === 'left' ? '5px'  : '-5px';
  el.style.transition = 'opacity .15s ease, transform .15s ease';
  el.style.opacity = '0';
  el.style.transform = `translateY(${DY_OUT})`;
  setTimeout(() => {
    el.textContent = newText;
    el.style.transition = 'none';
    el.style.transform = `translateY(${DY_IN})`;
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.transition = 'opacity .2s cubic-bezier(.22,1,.36,1), transform .2s cubic-bezier(.22,1,.36,1)';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 150);
}
function renderCalPage(dir){
  const start=Math.floor((cpYear-1900)/35)*35+1900;
  const end=Math.min(start+34,2035);
  const label=`${start} – ${end}`;

  _calAnimLabel(document.getElementById('cph-title'), label, dir);
  _calAnimLabel(document.getElementById('cpn-label'), label, dir);
  document.getElementById('cpdow').innerHTML=['00s','05s','10s','15s','20s','25s','30s'].map(d=>`<div class="cpdow-cell">'${d}</div>`).join('');

  const grid=document.getElementById('cpdays');
  // Ensure exactly 35 cells exist (build once, reuse)
  _ensureCalGrid(grid, 35, 'cp-day');

  const cells=grid.children;
  for(let i=0;i<35;i++){
    const y=start+i;
    const evs=EVS.filter(e=>e.year===y);
    const cell=cells[i];

    // Update classes (instant — no layout shift)
    const cls=['cp-day'];
    if(y===cpSel)cls.push('cp-selected');
    if(evs.length>0)cls.push('cp-milestone');
    if(y>2035)cls.push('cp-dim');
    cell.className=cls.join(' ');

    // Re-attach click handler
    cell.onclick=()=>{
      cpSel=y;
      renderCalPage();
      renderCepList(evs,y);
      if(evs.length>0) triggerCalDayInteraction(cell);
    };

    // Animate content in-place
    const buildContent=(c)=>{
      let evHtml='';
      evs.slice(0,2).forEach(ev=>{evHtml+=`<span class="cp-ev-tag" style="color:${CC[ev.cat]};display:block">${ev.title.split(' ').slice(0,4).join(' ')}</span>`;});
      if(evs.length>2)evHtml+=`<span class="cp-more" style="display:block">+${evs.length-2} more</span>`;

      // ── Heat background: more events = slightly warmer tint
      const maxEvs=8;
      const heat=Math.min(evs.length/maxEvs,1);
      if(evs.length>0){
        cell.style.background=`rgba(180,160,130,${(heat*0.22).toFixed(3)})`;
      } else {
        cell.style.background='';
      }

      // ── Category bar: thin strip at top showing category mix
      let barHtml='';
      if(evs.length>0){
        const cats=evs.map(e=>e.cat);
        const segs=cats.map(cat=>`<span style="flex:1;height:100%;background:${CC_BAR[cat]||CC[cat]}"></span>`).join('');
        barHtml=`<div style="position:absolute;top:-1px;left:-1px;right:-1px;height:6px;display:flex;z-index:10;pointer-events:none">${segs}</div>`;
      }

      // ── Featured star
      const hasFeat=evs.some(e=>e.featured);
      const featMark=hasFeat?`<span style="font-size:8px;color:#bf5af2;margin-left:3px;vertical-align:top;line-height:1.8">★</span>`:'';

      // ── Colored dots
      let dotsHtml='';
      if(evs.length>0){
        const shown=evs.slice(0,8);
        dotsHtml=`<div class="cp-dots">${shown.map(ev=>`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${CC[ev.cat]};flex-shrink:0;opacity:.9"></span>`).join('')}${evs.length>8?`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--g4);flex-shrink:0"></span>`:''}</div>`;
      }

      c.innerHTML=`${barHtml}<div class="cp-yr-label">${y}${featMark}</div>${evHtml}${dotsHtml}`;
    };
    _animCellContent(cell, buildContent, dir);
  }
  if(dir)animateStaggerIn(Array.from(cells),{axis:'x',distance:dir==='left'?18:-18,step:10,duration:220});

  if(!cpSel||cpSel<start||cpSel>end)renderCepList(EVS.filter(e=>e.year>=start&&e.year<=end),null);
  else renderCepList(EVS.filter(e=>e.year===cpSel),cpSel);
  _updateCalNavBtns();

  /* Fill remaining panel height with empty ghost cells so no white gap shows */
  requestAnimationFrame(()=>{
    const skipAdaptiveFill = (window.isPhoneAppMode&&window.isPhoneAppMode()) || (window.isTabletAppMode&&window.isTabletAppMode());
    if(skipAdaptiveFill) return;
    const panel=document.getElementById('cal-grid-wrap');
    const gridEl=document.getElementById('cpdays');
    if(!panel||!gridEl)return;
    // Remove previously added filler rows
    gridEl.querySelectorAll('.cp-day-empty').forEach(e=>e.remove());
    const panelH=panel.clientHeight;
    const gridH=gridEl.clientHeight;
    const cellH=gridEl.firstElementChild?gridEl.firstElementChild.clientHeight:80;
    if(gridH>=panelH||cellH<=0)return;
    const extraRows=Math.ceil((panelH-gridH)/cellH);
    const extraCells=extraRows*7;
    const frag=document.createDocumentFragment();
    for(let i=0;i<extraCells;i++){
      const d=document.createElement('div');
      // Position in grid: real cells are 35, so this cell is at column (35+i)%7
      d.className='cp-day-empty'+((35+i)%7===6?' no-border-right':'');
      frag.appendChild(d);
    }
    gridEl.appendChild(frag);
  });
}

function renderCepList(evs,sel){
  document.getElementById('cpe-yr').textContent=sel||'All events this period';
  document.getElementById('cpe-count').textContent=evs.length?`${evs.length} event${evs.length!==1?'s':''}`:sel?'No archived events':'';
  const list=document.getElementById('cpe-list');
  if(!evs.length){list.innerHTML=`<div class="cpe-empty">No events recorded<br>for this year.</div>`;return;}
  list.innerHTML=evs.map(ev=>`<div class="cpe-ev" data-id="${ev.id}"><div class="cpe-ev-row"><div class="cpe-ev-d" style="background:${CC[ev.cat]}"></div><div style="flex:1"><div class="cpe-ev-title">${ev.title}${ev.featured?'<span class="cpe-feat">★ Featured</span>':''}</div><div class="cpe-ev-meta">${ev.year} · ${CL[ev.cat]}</div><div class="cpe-ev-desc">${ev.desc}</div></div></div></div>`).join('');
  list.querySelectorAll('.cpe-ev').forEach(r=>r.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(+r.getAttribute('data-id')),80);}));
  animateStaggerIn(list.querySelectorAll('.cpe-ev'),{axis:'y',distance:10,step:20,duration:220});
}

function selectEvent(id){
  const ev=EVS.find(e=>e.id===id);if(!ev)return;
  const token=++mapSelectionToken;
  activeId=id;
  if(activePage!=='archive')showPage('archive',activePage);
  window.KirunaRoutes.update('archive',{event:id,details:false});
  if(!syncSidebarTLSelection()) renderSidebarTL();
  calYear=ev.year;renderSidebarCal();
  highlightRulerYear(id);
  updateMapTimelinePreviewSelection(id);
  setTimeout(()=>{
    if(token!==mapSelectionToken||activePage!=='archive')return;
    if(leafletMarkers[id]) updateMarkerSelectionVisuals();
    else renderMarkers();
    const m=leafletMarkers[id];
    if(m){
      const z=leafletMap.getZoom();
      leafletMap.flyTo([ev.lat,ev.lng],z,{animate:true,duration:.6});
      setTimeout(()=>{if(token===mapSelectionToken&&activePage==='archive')m.openPopup();},700);
    }
  },50);
}

window.applyArchiveRoute=async function(state){
  ++mapSelectionToken;
  await new Promise(resolve=>setTimeout(resolve,60));
  if(activePage!=='archive')return;
  initMap();
  eraFilter=state.type;
  document.querySelectorAll('.era-opt').forEach(btn=>btn.classList.toggle('on',btn.dataset.era===eraFilter));
  activeId=null;
  leafletMap.closePopup();
  renderMarkers();renderSidebarTL();renderSidebarCal();updateRulerFilter();
  const calendar=state.view==='calendar';
  document.getElementById('sbtab-cal').classList.toggle('on',calendar);
  document.getElementById('sbtab-tl').classList.toggle('on',!calendar);
  document.querySelector('.sb-tabs').dataset.active=calendar?'cal':'tl';
  for(const pane of ['tl','cal'])document.getElementById('pane-'+pane).classList.toggle('on',calendar===(pane==='cal'));
  document.getElementById(calendar?'pane-cal':'pane-tl').classList.add('pane-visible');
  if(!EVS.some(ev=>ev.id===state.event))return;
  selectEvent(state.event);
  if(state.details){
    const marker=leafletMarkers[state.event];
    marker?.once('popupopen',()=>{
      const button=document.querySelector('.popup-btn');
      const ev=EVS.find(ev=>ev.id===state.event);
      if(button)window._togglePopupDetail('ppx-'+ev.id,button);
    });
  }
};

/* ── Gallery → Map: robust animated open ── */
function openGalleryToMap(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;

  /* Step 1: navigate to archive page */
  showPage('archive','gallery');

  /* Step 2: poll until map + marker are ready, then animate */
  let attempts=0;
  function tryOpen(){
    attempts++;
    /* Ensure map is initialised */
    if(!leafletMap){ initMap(); }
    if(!leafletMarkers[id]){ renderMarkers(); }

    const m=leafletMarkers[id];
    if(m && leafletMap){
      /* Step 3: close any open popup cleanly */
      leafletMap.closePopup();

      /* Step 4: first show and emphasize the matching marker */
      const startZoom=Math.max(11, leafletMap.getZoom()-1);
      leafletMap.setView([ev.lat,ev.lng], startZoom, {animate:false});
      activeId=id;
      updateMarkerSelectionVisuals();
      flashGalleryMapMarker(id);

      /* Step 5: then fly in smoothly */
      const markerLeadMs=220;
      setTimeout(()=>{
        leafletMap.flyTo([ev.lat,ev.lng], 15, {animate:true, duration:1.1, easeLinearity:0.35});
      }, markerLeadMs + 80);

      /* Step 6: after fly lands, open popup */
      setTimeout(()=>{
        activeId=id;
        updateMarkerSelectionVisuals();
        if(!syncSidebarTLSelection()) renderSidebarTL();
        calYear=ev.year; renderSidebarCal();
        highlightRulerYear(id);
        m.openPopup();
      }, markerLeadMs + 1400);
      return;
    }
    if(attempts < 20) setTimeout(tryOpen, 120);
  }
  setTimeout(tryOpen, 80);
}
window.openGalleryToMap=openGalleryToMap;

/* Search */
const searchInput=document.getElementById('nav-search');
const searchDrop=document.getElementById('search-dropdown');
const searchVm=Vue.createApp({
  data:()=>({items:[],query:''}),
  methods:{
    openResult(item){
      setSearchDropdownOpen(false);
      searchInput.value='';
      if(item.source==='outside')openOutsideSearchResult(item.docIdx,item.year);
      else selectEvent(item.id);
    }
  },
  template:'#search-results-template'
}).mount(searchDrop);
const navEl=document.getElementById('nav');
const navLogoEl=document.getElementById('logo-btn');
const navTabsEl=document.querySelector('#nav .nav-tabs');
const navToolsEl=document.querySelector('#nav .nav-r');
const navSearchWrapEl=document.querySelector('#nav .nav-search-wrap');
const navSecondaryBadgeEl=document.querySelector('#nav .nav-r .nbadge:not(.filled)');
const navPrimaryCtaEl=document.getElementById('btn-explore');
function setSearchDropdownOpen(open){
  searchDrop.classList.toggle('open',!!open);
}
let _outsideSearchCache=[];
let _outsideSearchCacheReady=false;
function _buildOutsideSearchIndex(){
  const {RAW,FIELD_META}=window.KirunaOutsideData||{};
  if(!Array.isArray(RAW)) return [];
  const MONTHS={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
  return RAW.map(row=>{
    const rawDate=String(row?.[0]||'').trim();
    const field=String(row?.[3]||'').trim();
    const parts=rawDate.replace(/[~]/g,'').trim().split(/\s+/);
    return {
      idx:row[7],
      title:String(row?.[1]||'').trim(),
      actor:String(row?.[2]||'').trim(),
      field,
      label:String(row?.[4]||'').trim(),
      desc:String(row?.[5]||'').trim(),
      year:Number(parts.length===2?parts[1]:parts[0])||null,
      rawDate,
      month:MONTHS[rawDate.toLowerCase().split(/\s+/)[0]]||0,
      color:FIELD_META?.[field]?.color||'#86868b'
    };
  }).filter(doc=>doc.title&&doc.rawDate);
}
function refreshOutsideSearchIndex(){
  try{
    const outsideWin=getOutsideSearchWindow();
    if(outsideWin&&typeof outsideWin.getOutsideSearchIndex==='function'){
      const nextIndex=outsideWin.getOutsideSearchIndex();
      if(Array.isArray(nextIndex)&&nextIndex.length){
        _outsideSearchCache=nextIndex;
        _outsideSearchCacheReady=true;
      }
    }
  }catch(e){}
  if(!_outsideSearchCacheReady||!_outsideSearchCache.length){
    const fallbackIndex=_buildOutsideSearchIndex();
    if(fallbackIndex.length){
      _outsideSearchCache=fallbackIndex;
      _outsideSearchCacheReady=true;
    }
  }
  return _outsideSearchCache;
}
function getOutsideSearchWindow(){
  try{
    const tlFrame=document.getElementById('timeline2-frame');
    const tlDoc=tlFrame?.contentDocument||tlFrame?.contentWindow?.document;
    const outsideFrame=tlDoc?.getElementById('outside-frame');
    return outsideFrame?.contentWindow||null;
  }catch(e){
    return null;
  }
}
function getOutsideSearchIndex(){
  return refreshOutsideSearchIndex();
}
function openOutsideDoc(docIdx, year, fromGallery){
  if(typeof window.openTimeline2View==='function') window.openTimeline2View('overview', Number.isFinite(year)?year:null);
  else if(typeof window.showPage==='function') window.showPage('timeline2');
  let attempts=0;
  const tryOpen=()=>{
    attempts+=1;
    try{
      const tlFrame=document.getElementById('timeline2-frame');
      const tlDoc=tlFrame?.contentDocument||tlFrame?.contentWindow?.document;
      const outsideBtn=tlDoc?.getElementById('map-tab-outside');
      if(outsideBtn&&!outsideBtn.classList.contains('on')) outsideBtn.click();
      const outsideWin=tlDoc?.getElementById('outside-frame')?.contentWindow;
      if(fromGallery&&outsideWin&&typeof outsideWin.openOutsideDocFromGallery==='function'){
        if(outsideWin.openOutsideDocFromGallery(docIdx)) return;
      }
      if(outsideWin&&typeof outsideWin.openOutsideDocSearch==='function'){
        if(outsideWin.openOutsideDocSearch(docIdx)) return;
      }
    }catch(e){}
    if(attempts<40) setTimeout(tryOpen,120);
  };
  setTimeout(tryOpen,80);
}
function openOutsideSearchResult(docIdx, year){
  openOutsideDoc(docIdx, year, false);
}
function openOutsideFromGallery(docIdx, year){
  openOutsideDoc(docIdx, year, true);
}
window.openOutsideFromGallery=openOutsideFromGallery;
(function warmOutsideSearchIndex(attempt=0){
  if(refreshOutsideSearchIndex().length||attempt>=30) return;
  setTimeout(()=>warmOutsideSearchIndex(attempt+1),200);
})();
function doSearch(q){
  if(!q.trim()){searchVm.items=[];setSearchDropdownOpen(false);return;}
  const lq=q.toLowerCase();
  const insideRes=EVS
    .filter(ev=>ev.emoji!=='📄')
    .filter(ev=>ev.title.toLowerCase().includes(lq)||ev.desc.toLowerCase().includes(lq)||ev.tags.some(t=>t.toLowerCase().includes(lq))||String(ev.year).includes(lq)||CL[ev.cat].toLowerCase().includes(lq))
    .slice(0,4)
    .map(ev=>({
      key:`inside-${ev.id}`,
      source:'inside',
      id:ev.id,
      year:ev.year,
      title:ev.title,
      meta:`${ev.year} · ${CL[ev.cat]}`,
      sourceLabel:'Inside Map',
      color:CC[ev.cat]
    }));
  const outsideRes=getOutsideSearchIndex()
    .filter(doc=>{
      const haystack=[doc.title,doc.desc,doc.actor,doc.field,doc.label,doc.rawDate,String(doc.year)].join(' ').toLowerCase();
      return haystack.includes(lq);
    })
    .slice(0,4)
    .map(doc=>({
      key:`outside-${doc.idx}`,
      source:'outside',
      docIdx:doc.idx,
      year:Number(doc.year)||null,
      title:doc.title,
      meta:`${doc.rawDate} · ${doc.field}`,
      sourceLabel:'Outside Web',
      color:doc.color||'#86868b'
    }));
  const res=[...insideRes,...outsideRes].slice(0,8);
  searchVm.query=q;
  searchVm.items=res;
  if(!res.length){
    if(!_outsideSearchCacheReady){
      setTimeout(()=>{
        if(searchInput.value.trim()===q.trim()) doSearch(q);
      },220);
    }
  }
  else Vue.nextTick(()=>{if(searchInput.value===q)animateStaggerIn(searchDrop.querySelectorAll('.srd-item'),{axis:'y',distance:6,step:18,duration:180});});
  setSearchDropdownOpen(true);
}
searchInput.addEventListener('input',e=>doSearch(e.target.value));
searchInput.addEventListener('focus',e=>{if(e.target.value)doSearch(e.target.value);});
searchInput.addEventListener('keydown',e=>{if(e.key==='Escape'){setSearchDropdownOpen(false);searchInput.blur();}});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-search-wrap'))setSearchDropdownOpen(false);});

function getElementOuterWidth(el){
  if(!el) return 0;
  const rect=el.getBoundingClientRect();
  return rect.width||0;
}
function getCssGapPx(value){
  const parsed=parseFloat(value);
  return Number.isFinite(parsed)?parsed:0;
}
function isSearchEventsVisible(){
  if(!navSearchWrapEl||!searchInput) return false;
  const wrapStyles=getComputedStyle(navSearchWrapEl);
  const inputStyles=getComputedStyle(searchInput);
  if(
    wrapStyles.display==='none'||
    inputStyles.display==='none'||
    wrapStyles.visibility==='hidden'||
    inputStyles.visibility==='hidden'||
    Number(wrapStyles.opacity)===0
  ) return false;
  const rect=navSearchWrapEl.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&rect.right>0&&rect.left<window.innerWidth;
}
function updateNavTabsCentering(){
  if(!navEl||!navTabsEl) return;
  const html=document.documentElement;
  if(html.classList.contains('phone-app')||html.classList.contains('tablet-app')){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  if(!isSearchEventsVisible()||!navLogoEl){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  const navRect=navEl.getBoundingClientRect();
  const logoRect=navLogoEl.getBoundingClientRect();
  const searchRect=navSearchWrapEl.getBoundingClientRect();
  const gapWidth=searchRect.left-logoRect.right;
  if(gapWidth<=180){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  const center=((logoRect.right+searchRect.left)/2)-navRect.left;
  navTabsEl.style.setProperty('--nav-tabs-left',center.toFixed(2)+'px');
  navTabsEl.style.setProperty('--nav-tabs-max-width',Math.max(220,gapWidth-18).toFixed(2)+'px');
  syncMainNavCenterVar();
  requestAnimationFrame(()=>_alignMapTabsCenter());
}
function getMainNavTabsCenterX(){
  if(!navTabsEl) return window.innerWidth/2;
  const rect=navTabsEl.getBoundingClientRect();
  if(!rect.width) return window.innerWidth/2;
  return rect.left+(rect.width/2);
}
function syncMainNavCenterVar(){
  document.documentElement.style.setProperty('--main-nav-center-x',getMainNavTabsCenterX().toFixed(2)+'px');
}
window.getKirunaMainNavTabsCenterX=getMainNavTabsCenterX;
const NAV_SECONDARY_HIDE_EPSILON=6;
const NAV_SECONDARY_SHOW_BUFFER=18;
function getNavSecondaryToolsFootprint(){
  if(!navToolsEl) return 0;
  const toolsStyles=getComputedStyle(navToolsEl);
  const toolGap=getCssGapPx(toolsStyles.gap||toolsStyles.columnGap);
  let footprint=0;
  let visibleCount=0;
  if(navSearchWrapEl&&getComputedStyle(navSearchWrapEl).display!=='none'){
    footprint+=getElementOuterWidth(navSearchWrapEl);
    visibleCount+=1;
  }
  if(navSecondaryBadgeEl&&getComputedStyle(navSecondaryBadgeEl).display!=='none'){
    footprint+=getElementOuterWidth(navSecondaryBadgeEl);
    visibleCount+=1;
  }
  return footprint + (visibleCount ? toolGap * visibleCount : 0);
}
function getNavTabsOverflowPx(){
  if(!navTabsEl) return 0;
  const scrollOverflow=Math.max(0,(navTabsEl.scrollWidth||0)-navTabsEl.clientWidth);
  const lastTabEl=navTabsEl.querySelector('.ntab:last-child');
  if(!lastTabEl) return scrollOverflow;
  const tabsRect=navTabsEl.getBoundingClientRect();
  const lastTabRect=lastTabEl.getBoundingClientRect();
  return Math.max(scrollOverflow,lastTabRect.right-tabsRect.right);
}
function shouldHideNavSecondaryTools(){
  if(!navEl||!navTabsEl||!navToolsEl||!navPrimaryCtaEl) return false;
  if(document.documentElement.classList.contains('phone-app')||document.documentElement.classList.contains('tablet-app')) return false;
  const currentlyHidden=navEl.classList.contains('nav-auto-hide-secondary');
  const tabsOverflow=getNavTabsOverflowPx();
  if(!currentlyHidden){
    return tabsOverflow > NAV_SECONDARY_HIDE_EPSILON;
  }
  const secondaryFootprint=getNavSecondaryToolsFootprint();
  if(!secondaryFootprint) return false;
  const projectedTabsWidth=navTabsEl.clientWidth-secondaryFootprint;
  const requiredTabsWidth=Math.ceil(navTabsEl.scrollWidth||0)+NAV_SECONDARY_SHOW_BUFFER;
  return projectedTabsWidth < requiredTabsWidth;
}
function updateNavSecondaryToolsVisibility(){
  if(!navEl) return;
  const shouldHide=shouldHideNavSecondaryTools();
  const wasHidden=navEl.classList.contains('nav-auto-hide-secondary');
  navEl.classList.toggle('nav-auto-hide-secondary', shouldHide);
  if(shouldHide){
    if(document.activeElement===searchInput) searchInput.blur();
    setSearchDropdownOpen(false);
  }
  if(wasHidden!==shouldHide){
    if(typeof alignTlpControls==='function') requestAnimationFrame(()=>alignTlpControls());
    if(typeof window.refreshDiscourseNavLayout==='function'){
      requestAnimationFrame(()=>window.refreshDiscourseNavLayout(false));
    }
  }
  if(typeof window.refreshTimeline2HeaderAlignment==='function'){
    requestAnimationFrame(()=>window.refreshTimeline2HeaderAlignment());
  }
  updateNavTabsCentering();
}
function scheduleNavSecondaryToolsVisibility(){
  if(scheduleNavSecondaryToolsVisibility._raf) cancelAnimationFrame(scheduleNavSecondaryToolsVisibility._raf);
  scheduleNavSecondaryToolsVisibility._raf=requestAnimationFrame(()=>{
    updateNavSecondaryToolsVisibility();
    updateNavTabsCentering();
    scheduleResponsiveCollisionHides();
    scheduleNavSecondaryToolsVisibility._raf=0;
  });
}
scheduleNavSecondaryToolsVisibility();
window.addEventListener('resize',scheduleNavSecondaryToolsVisibility,{passive:true});
window.addEventListener('resize',scheduleResponsiveCollisionHides,{passive:true});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',scheduleResponsiveCollisionHides,{passive:true});
  window.visualViewport.addEventListener('scroll',scheduleResponsiveCollisionHides,{passive:true});
}
navSearchWrapEl?.addEventListener('transitionend',scheduleNavSecondaryToolsVisibility);
searchInput.addEventListener('focus',()=>{
  scheduleNavSecondaryToolsVisibility();
  setTimeout(scheduleNavSecondaryToolsVisibility,170);
});
searchInput.addEventListener('blur',()=>{
  scheduleNavSecondaryToolsVisibility();
  setTimeout(scheduleNavSecondaryToolsVisibility,170);
});
if(window.ResizeObserver){
  const navAdaptiveObserver=new ResizeObserver(()=>scheduleNavSecondaryToolsVisibility());
  [navEl,navLogoEl,navTabsEl,navToolsEl,navSearchWrapEl,navSecondaryBadgeEl,navPrimaryCtaEl].forEach(el=>{
    if(el) navAdaptiveObserver.observe(el);
  });
}
if(document.fonts?.ready){
  document.fonts.ready.then(()=>{
    scheduleNavSecondaryToolsVisibility();
    scheduleResponsiveCollisionHides();
  }).catch(()=>{});
}

/* Era filter */

const PANEL_BODY_TRANSITION_MS=380;

function finishPanelBodyOpen(body){
  if(!body)return;
  if(body._panelBodyTimer) clearTimeout(body._panelBodyTimer);
  body._panelBodyTimer=setTimeout(()=>{
    if(!body.classList.contains('collapsed')){
      body.style.maxHeight='none';
      body.classList.remove('is-animating');
      body.classList.remove('skip-height-transition');
    }
    body._panelBodyTimer=null;
  }, PANEL_BODY_TRANSITION_MS + 40);
}

function openPanelBody(body, opts={}){
  if(!body)return;
  if(body._panelBodyTimer) clearTimeout(body._panelBodyTimer);
  if(body._panelBodyOpenRaf) cancelAnimationFrame(body._panelBodyOpenRaf);
  const skipHeight=!!opts.skipHeight;
  if(skipHeight){
    body.classList.add('skip-height-transition');
    body.classList.remove('is-animating');
    body.style.maxHeight='none';
    void body.offsetHeight;
    body.classList.remove('collapsed');
    finishPanelBodyOpen(body);
    return;
  }
  body.classList.remove('skip-height-transition');
  body.classList.add('is-animating');
  body.style.maxHeight='0px';
  body.classList.remove('collapsed');
  void body.offsetHeight;
  body._panelBodyOpenRaf=requestAnimationFrame(()=>{
    body.style.maxHeight=body.scrollHeight+'px';
    finishPanelBodyOpen(body);
    body._panelBodyOpenRaf=null;
  });
}

function closePanelBody(body){
  if(!body)return;
  if(body._panelBodyTimer) clearTimeout(body._panelBodyTimer);
  if(body._panelBodyOpenRaf) cancelAnimationFrame(body._panelBodyOpenRaf);
  body.classList.remove('skip-height-transition');
  body.classList.add('is-animating');
  body.style.maxHeight=body.scrollHeight+'px';
  void body.offsetHeight;
  body.classList.add('collapsed');
  body.style.maxHeight='0px';
}

function refreshPanelBodyHeight(body){
  if(!body || body.classList.contains('collapsed')) return;
  if(body.classList.contains('skip-height-transition')) return;
  // If already at max-height:none the panel is fully open — just let it be.
  // The inner list growing/shrinking is handled by its own CSS transition,
  // so the outer panel doesn't need a height animation at all.
  if(body.style.maxHeight==='none') return;
  body.classList.add('is-animating');
  body.style.maxHeight=body.scrollHeight+'px';
  finishPanelBodyOpen(body);
}

function isLegendAreaExpanded(){
  const list=document.getElementById('legend-area-list');
  return !!(list && !list.classList.contains('collapsed'));
}

function togglePanel(which){
  const panelId=which==='era'?'era-panel':'legend-panel';
  const bodyId=which==='era'?'era-body':'legend-body';
  const panel=document.getElementById(panelId);
  const body=document.getElementById(bodyId);
  const header=panel ? panel.querySelector('.panel-header') : null;
  if(!panel||!body)return;
  const opening=body.classList.contains('collapsed');
  if(opening){
    panel.classList.remove('panel-collapsed');
    if(header) header.setAttribute('aria-expanded', 'true');
    openPanelBody(body,{
      skipHeight: which==='legend' && isLegendAreaExpanded()
    });
  }else{
    panel.classList.add('panel-collapsed');
    if(header) header.setAttribute('aria-expanded', 'false');
    closePanelBody(body);
  }
  scheduleResponsiveCollisionHides();
  setTimeout(scheduleResponsiveCollisionHides, PANEL_BODY_TRANSITION_MS + 50);
}
window.togglePanel=togglePanel;
function handlePanelHeaderKeydown(event, which){
  if(event.key!=='Enter' && event.key!==' ') return;
  event.preventDefault();
  togglePanel(which);
}
window.handlePanelHeaderKeydown=handlePanelHeaderKeydown;
document.getElementById('era-filter-btns').addEventListener('click',e=>{
  const btn=e.target.closest('.era-opt');if(!btn)return;
  document.querySelectorAll('.era-opt').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');eraFilter=btn.getAttribute('data-era');
  activeId=null;
  ++mapSelectionToken;
  leafletMap?.closePopup();
  window.KirunaRoutes.update('archive',{type:eraFilter,event:null,details:false});
  renderMarkers();renderSidebarTL();renderSidebarCal();
  updateRulerFilter();
  renderMapTimelinePreview();
  scheduleResponsiveCollisionHides();
});

/* Tabs — animated switch */
function switchSidebarTab(to, opts={}){
  ++mapSelectionToken;
  leafletMap?.closePopup();
  window.KirunaRoutes.update('archive',{view:to==='cal'?'calendar':'timeline',event:null,details:false});
  const tabs=document.getElementById('sb-tabs-wrap');
  const fromTl = to==='cal';
  if(tabs) tabs.dataset.active=to;
  else {
    const sbTabs=document.querySelector('.sb-tabs');
    if(sbTabs) sbTabs.dataset.active=to;
  }
  const leaving=document.getElementById(fromTl?'pane-tl':'pane-cal');
  const entering=document.getElementById(to==='cal'?'pane-cal':'pane-tl');
  const leavingTab=document.getElementById(fromTl?'sbtab-tl':'sbtab-cal');
  const enteringTab=document.getElementById(to==='cal'?'sbtab-cal':'sbtab-tl');
  if(leaving){leaving.classList.remove('pane-visible');setTimeout(()=>leaving.classList.remove('on'),200);}
  leavingTab&&leavingTab.classList.remove('on');
  enteringTab&&enteringTab.classList.add('on');
  setTimeout(()=>{
    if(entering){
      entering.classList.add('on');
      // Set start position without transition, then animate in
      entering.style.transition='none';
      entering.style.transform=fromTl?'translateX(10px)':'translateX(-10px)';
      entering.style.opacity='0';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        entering.style.transition='';
        entering.style.transform='';
        entering.style.opacity='';
        entering.classList.add('pane-visible');
      }));
    }
    if(to==='cal'){
      renderSidebarCal();
      requestAnimationFrame(()=>animateStaggerIn(entering?.querySelectorAll('.day-cell, .cal-ev-row')||[],{axis:'y',distance:8,step:12,duration:180}));
    }
    else{
      calYearFilter=null;activeId=null;renderMarkers();
      highlightRulerYear(null);
      updateMapTimelinePreviewSelection(null);
      if(!syncSidebarTLSelection({scroll:false})) renderSidebarTL();
      requestAnimationFrame(()=>animateStaggerIn(entering?.querySelectorAll('.tl-row')||[],{axis:'y',distance:10,step:18,duration:200}));
    }
    scheduleResponsiveCollisionHides();
  },200);
}
document.getElementById('sbtab-tl').addEventListener('click',()=>switchSidebarTab('tl'));
document.getElementById('sbtab-cal').addEventListener('click',()=>switchSidebarTab('cal'));

// ── One-time delegated click handler for the sidebar calendar grid ──
// Registered once here; works regardless of how many times renderSidebarCal runs.
(function(){
  const grid=document.getElementById('cal-days');
  if(!grid)return;
  grid.addEventListener('click',(e)=>{
    const cell=e.target.closest('.day-cell');
    if(!cell||cell.classList.contains('dim'))return;
    const clickedYear=+cell.dataset.year;
    if(!clickedYear)return;

    // Toggle: click same year again → clear filter
    const wasSelected = (calYearFilter === clickedYear);
    calYearFilter = wasSelected ? null : clickedYear;
    if(!wasSelected) calYear = clickedYear;
    // When deselecting, calYear stays but we don't apply 'today' styling to avoid re-highlighting
    const curStart=Math.floor((calYear-1900)/35)*35+1900;
    const filteredEvents=getEraFilteredEvents();
    const rangeEvents=filteredEvents.filter(ev=>ev.year>=curStart&&ev.year<=curStart+34);
    const filteredYears=new Set(rangeEvents.map(ev=>ev.year));
    const filteredFeaturedYears=new Set(rangeEvents.filter(ev=>ev.featured).map(ev=>ev.year));

    // Update all cell highlight classes
    const allCells=grid.children;
    for(let j=0;j<allCells.length;j++){
      const cb=allCells[j];
      const cy=+cb.dataset.year;
      const cc=['day-cell'];
      if(cy===activeId)cc.push('selected');
      // Only apply 'today' highlight when no year-filter is active AND we haven't just deselected this cell
      else if(cy===calYear && !calYearFilter && !wasSelected)cc.push('today');
      if(filteredYears.has(cy))cc.push('has-ev');
      if(filteredFeaturedYears.has(cy))cc.push('feat-ev');
      if(cy>2035)cc.push('dim');
      // Mark the actively-filtered year with a distinct visual class
      if(calYearFilter&&cy===calYearFilter)cc.push('cal-year-active');
      cb.className=cc.join(' ');
    }

    // Show filtered events in sidebar using the current type filter too
    const evs=calYearFilter
      ?filteredEvents.filter(e=>e.year===calYearFilter)
      :rangeEvents;
    renderCalEvList(evs,calYearFilter||null);
    updateMapTimelinePreviewSelection(activeId);
    // Do NOT call renderMarkers() with filter — show all markers regardless of year selection
    // Only individual event clicks (cal-ev-row) will trigger marker highlighting
  });
})();
// Init first pane as visible
requestAnimationFrame(()=>{
  const firstPane=document.getElementById('pane-tl');
  if(firstPane){firstPane.classList.add('on');setTimeout(()=>firstPane.classList.add('pane-visible'),50);}
  const sbTabs=document.querySelector('.sb-tabs');
  if(sbTabs) sbTabs.dataset.active='tl';
});

/* Calendar nav */
document.getElementById('cal-prev').addEventListener('click',()=>{
  const curStart=Math.floor((calYear-1900)/35)*35+1900;
  if(curStart<=1900)return;
  calYear=curStart-35;calYearFilter=null;activeId=null;renderMarkers();renderSidebarCal('right');highlightRulerYear(null);updateMapTimelinePreviewSelection(null);
});
document.getElementById('cal-next').addEventListener('click',()=>{
  const curStart=Math.floor((calYear-1900)/35)*35+1900;
  if(curStart>=2005)return;
  calYear=curStart+35;calYearFilter=null;activeId=null;renderMarkers();renderSidebarCal('left');highlightRulerYear(null);updateMapTimelinePreviewSelection(null);
});
document.getElementById('cal-expand').addEventListener('click',()=>{
  const targetYear=activeId!==null?(EVS.find(e=>e.id===activeId)?.year??calYear):calYear;
  openTimeline2View('calendar', targetYear, 'archive');
});
document.getElementById('cpnav-prev').addEventListener('click',()=>{
  const curStart=Math.floor((cpYear-1900)/35)*35+1900;
  if(curStart<=1900)return;
  cpYear=curStart-35;cpSel=null;
  renderCalPage('right');
});
document.getElementById('cpnav-next').addEventListener('click',()=>{
  const curStart=Math.floor((cpYear-1900)/35)*35+1900;
  if(curStart>=2005)return;
  cpYear=curStart+35;cpSel=null;
  renderCalPage('left');
});
document.getElementById('cp-back').addEventListener('click',()=>showPage('archive'));

/* Timeline view toggle */
document.getElementById('tlpv-combined').addEventListener('click',()=>{
  buildCombinedTimeline();
  buildTextTimeline();
  const adaptiveTimeline=isAdaptiveTimelineMode();
  if(adaptiveTimeline){
    switchTimelineView('text');
    requestAnimationFrame(()=>observeTxtCols());
    return;
  }
  const stage=document.querySelector('#dtl-body .dtl-stage');
  _photosOn=!_photosOn;
  if(stage)stage.classList.toggle('photos-off',!_photosOn);
  switchTimelineView(_photosOn?'combined':'text');
});
function showPhaseView(opts={}){
  switchTimelineView('phase',opts);
}
window.showPhaseView=showPhaseView;

function getTimelinePreviewTargetYear(){
  if(Number.isFinite(activeId)){
    const activeEvent=EVS.find(ev=>ev.id===activeId);
    if(activeEvent) return activeEvent.year;
  }
  const preferredEvent=
    EVS.find(ev=>ev.year===2004)
    || EVS.find(ev=>ev.featured)
    || EVS[Math.floor(EVS.length/2)]
    || EVS[0]
    || null;
  return preferredEvent ? preferredEvent.year : 2004;
}

function buildTimeline2Src(view='overview', year=null){
  const frame=document.getElementById('timeline2-frame');
  const baseSrc=frame?.dataset.baseSrc||'./timeline.html';
  const params=new URLSearchParams();
  if(view) params.set('view', view);
  if(Number.isFinite(year)) params.set('year', String(Math.round(year)));
  params.set('nonce', String(Date.now()));
  return `${baseSrc}?${params.toString()}`;
}

function resetArchiveOverviewState(opts={}){
  activeId=null;
  ++mapSelectionToken;
  window.KirunaRoutes.update('archive',{event:null,details:false});
  calYearFilter=null;
  window._mapPopupOpen=false;
  window._mapDetailOpen=false;
  try{
    if(leafletMap) leafletMap.closePopup();
  }catch(e){}
  if(typeof updateMarkerSelectionVisuals==='function') updateMarkerSelectionVisuals();
  if(typeof highlightRulerYear==='function') highlightRulerYear(null);
  if(typeof updateMapTimelinePreviewSelection==='function') updateMapTimelinePreviewSelection(null,{immediate:true});
  if(window._syncMapChromeState) window._syncMapChromeState();
  if(opts.recenter===false || !leafletMap) return;
  leafletMap.flyTo(MAP_OVERVIEW_CENTER, MAP_OVERVIEW_ZOOM,{animate:false});
}

function resetTimeline2OverviewState(){
  const frame=document.getElementById('timeline2-frame');
  if(!frame) return;
  frame.dataset.currentView='overview';
  delete frame.dataset.currentYear;
  try{
    const tlWin=frame.contentWindow||null;
    const tlDoc=frame.contentDocument||tlWin?.document||null;
    const insideBtn=tlDoc?.getElementById('map-tab-inside');
    if(insideBtn&&!insideBtn.classList.contains('on')) insideBtn.click();
    if(tlWin&&typeof tlWin.resetTimelineOverview==='function'){
      tlWin.resetTimelineOverview();
      if(typeof tlWin.forceTimelineLayout==='function') tlWin.forceTimelineLayout();
      return;
    }
  }catch(e){}
  frame.src=buildTimeline2Src('overview', null);
}

function ensureTimeline2FrameLoaded(view='overview', year=null){
  const frame=document.getElementById('timeline2-frame');
  if(!frame) return;
  const lastView=frame.dataset.currentView||view;
  const parsedStoredYear=Number(frame.dataset.currentYear);
  const targetYear=Number.isFinite(year)
    ? year
    : (Number.isFinite(parsedStoredYear) ? parsedStoredYear : getTimelinePreviewTargetYear());
  if(frame.getAttribute('src')||frame.getAttribute('srcdoc')) return;
  frame.dataset.currentView=lastView;
  if(Number.isFinite(targetYear)) frame.dataset.currentYear=String(Math.round(targetYear));
  frame.src=buildTimeline2Src(lastView, Number.isFinite(targetYear) ? targetYear : null);
}

function openTimeline2View(view='overview', year=null, originPage=null, eventId=null){
  const frame=document.getElementById('timeline2-frame');
  const targetView=view||'overview';
  const targetYear=Number.isFinite(year)?Math.round(year):null;
  const timelineOrigin=originPage||(activePage!=='timeline2'?activePage:'preserve');

  if(frame){
    frame.dataset.currentView=targetView;
    if(Number.isFinite(targetYear)) frame.dataset.currentYear=String(targetYear);
    else delete frame.dataset.currentYear;
  }

  const applyState=()=>{
    try{
      const tlWin=frame?.contentWindow||null;
      const tlDoc=frame?.contentDocument||tlWin?.document||null;
      const insideBtn=tlDoc?.getElementById('map-tab-inside');
      if(insideBtn&&!insideBtn.classList.contains('on')) insideBtn.click();
      if(tlWin&&typeof tlWin.applyExternalViewState==='function'){
        tlWin.applyExternalViewState(targetView, targetYear);
        if(typeof tlWin.forceTimelineLayout==='function') tlWin.forceTimelineLayout();
        if(eventId&&typeof tlWin._selectAndOpenPopover==='function'){
          setTimeout(()=>{try{tlWin._selectAndOpenPopover(eventId);}catch(e){}}, 520);
        } else if(eventId&&typeof tlWin.flashEvent==='function'){
          setTimeout(()=>{try{tlWin.flashEvent(eventId);}catch(e){}}, 480);
        }
        return true;
      }
    }catch(e){}
    return false;
  };

  ensureTimeline2FrameLoaded(targetView, targetYear);
  showPage('timeline2', timelineOrigin);
  if(applyState()) return;
  setTimeout(applyState, 80);
  setTimeout(applyState, 220);
}
window.openTimeline2View=openTimeline2View;

document.getElementById('tlpv-phase').addEventListener('click',()=>{
  showPhaseView();
});
document.getElementById('tlp-back').addEventListener('click',()=>showPage('home'));

/* Align View: left edge with Search box left edge */
function alignTlpControls(){
  const adaptiveTimeline=isAdaptiveTimelineMode();
  const headerEl = document.querySelector('.tlp-header');
  if(adaptiveTimeline){
    if(headerEl) headerEl.style.paddingRight='';
    _alignMapTabsCenter();
    return;
  }
  const search = document.querySelector('.nav-search-wrap');
  const controls = document.querySelector('.tlp-controls');
  if(!search || !controls || !headerEl) return;
  const searchLeft = search.getBoundingClientRect().left;
  const headerRect = headerEl.getBoundingClientRect();
  const controlsWidth = controls.getBoundingClientRect().width;
  const paddingRight = headerRect.right - searchLeft - controlsWidth;
  headerEl.style.paddingRight = Math.max(0, paddingRight) + 'px';
  _alignMapTabsCenter();
}

function _alignMapTabsCenter(){
  try{
    syncMainNavCenterVar();
    const navTabsCenterX = getMainNavTabsCenterX();
    const frame = document.getElementById('timeline2-frame');
    const frameRect = frame?.getBoundingClientRect();
    const tlDoc = frame?.contentDocument || frame?.contentWindow?.document;
    if(!tlDoc) return;
    const hdr = tlDoc.getElementById('hdr');
    const hdrCenter = tlDoc.querySelector('.hdr-center');
    if(!hdr||!hdrCenter) return;
    if(document.documentElement.classList.contains('phone-app') || document.documentElement.classList.contains('tablet-app')){
      hdrCenter.style.setProperty('--parent-nav-offset', '0px');
      tlDoc.documentElement.style.setProperty('--parent-nav-offset', '0px');
      return;
    }
    const hdrRect = hdr.getBoundingClientRect();
    const hdrCenterX = (frameRect?.left||0) + hdrRect.left + hdrRect.width / 2;
    const offset = navTabsCenterX - hdrCenterX;
    hdrCenter.style.setProperty('--parent-nav-offset', offset + 'px');
    tlDoc.documentElement.style.setProperty('--parent-nav-offset', offset + 'px');
    frame?.contentWindow?.alignHeaderCenterToParentTabs?.();
  }catch(e){}
}
window.addEventListener('resize', alignTlpControls);
document.addEventListener('DOMContentLoaded', alignTlpControls);
setTimeout(alignTlpControls, 100);

/* Re-align whenever timeline2 iframe loads */
(function(){
  const frame=document.getElementById('timeline2-frame');
  if(!frame) return;
  frame.addEventListener('load',()=>{
    setTimeout(_alignMapTabsCenter, 80);
    setTimeout(_alignMapTabsCenter, 300);
    scheduleTimeline2NavAlignment();
    setTimeout(()=>window.applyAdaptiveAppMode?.(), 120);
  });
})();

/* Nav */
[
  ['ntab-home','home'],
  ['ntab-archive','archive'],
  ['ntab-timeline2','timeline2'],
  ['ntab-gallery','gallery'],
  ['ntab-discourse','discourse'],
  ['ntab-chat','chat'],
].forEach(([id,page])=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener('click',()=>showPage(page));
});
document.getElementById('logo-btn').addEventListener('click',()=>showPage('home'));
// Home → Archive buttons pass 'home' as origin
document.getElementById('btn-explore').addEventListener('click',()=>showPage('archive','home'));
document.getElementById('btn-map').addEventListener('click',()=>showPage('archive','home'));
document.getElementById('cards-map-link').addEventListener('click',()=>showPage('archive','home'));
// Update total event count dynamically
(()=>{const el=document.getElementById('cards-map-link');if(el)el.textContent=`All ${EVS.length} events →`;})();
document.getElementById('btn-scroll').addEventListener('click',()=>document.getElementById('tl-anchor').scrollIntoView({behavior:'smooth'}));
document.getElementById('tl-full-link').addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  openTimeline2View('overview', getTimelinePreviewTargetYear(), 'home');
});

// Map back button — returns to origin page
document.getElementById('map-back-btn').addEventListener('click',()=>{
  if(_mapOriginPage==='timeline2'){openTimeline2View('overview', null, 'preserve');}
  else if(_mapOriginPage)showPage(_mapOriginPage);
  else showPage('home');
});
document.getElementById('timeline2-back-btn').addEventListener('click',()=>{
  if(_timeline2OriginPage)showPage(_timeline2OriginPage);
  else showPage('home');
});
document.getElementById('chat-page-back-btn').addEventListener('click',()=>{
  if(_chatOriginPage) showPage(_chatOriginPage,'chat');
  else showPage('home');
});
window.addEventListener('resize',refreshTimeline2HeaderAlignment,{passive:true});
window.addEventListener('resize',scheduleTimeline2NavAlignment,{passive:true});
setTimeout(refreshTimeline2HeaderAlignment,120);
setTimeout(scheduleTimeline2NavAlignment,160);


buildHTL();buildCards();
initTimelineViewState();
syncTimelineToggleState();

/* ══════════════════════════════════════════
   SCROLL-DRIVEN INTERSECTION ANIMATIONS
══════════════════════════════════════════ */

// ── Home sections: pure scroll-driven reveal ──
// Uses scroll position directly — works regardless of screen height
// or how many sections fit in the viewport at once.
let _homeScrollInit=false;
function observeHomeSections(){
  const homeEl=document.getElementById('page-home');
  if(!homeEl) return;

  const sections=Array.from(document.querySelectorAll('.home-section'));
  if(!sections.length) return;

  // First call: start invisible with stagger
  if(!_homeScrollInit){
    _homeScrollInit=true;
    sections.forEach((el,i)=>{
      el.classList.remove('reveal-in','reveal-out');
      el.dataset.secDelay=String(i*120);
    });
    // Trigger initial entrance after a short frame
    setTimeout(()=>_updateHomeSections(homeEl,sections,true),60);
  }

  // Attach scroll listener (once)
  if(homeEl._scrollBound) return;
  homeEl._scrollBound=true;
  homeEl.addEventListener('scroll',()=>_updateHomeSections(homeEl,sections,false),{passive:true});
}

function _updateHomeSections(homeEl,sections,isFirst){
  const vH=homeEl.clientHeight;
  // Zone: a section is "active" when its centre is within a band
  // Upper edge: 15% from top of viewport
  // Lower edge: 88% from top of viewport
  const ENTER_TOP=vH*0.88;
  const EXIT_TOP=vH*0.05;

  sections.forEach((el,i)=>{
    const r=el.getBoundingClientRect();
    // getBoundingClientRect is relative to viewport, not scroll container.
    // Convert to be relative to homeEl:
    const homeR=homeEl.getBoundingClientRect();
    const top=r.top-homeR.top;
    const bottom=r.bottom-homeR.top;

    const visible=(top < ENTER_TOP) && (bottom > EXIT_TOP);

    if(visible){
      if(!el.classList.contains('reveal-in')){
        el.classList.remove('reveal-out');
        const delay=isFirst?(+el.dataset.secDelay||0):0;
        setTimeout(()=>el.classList.add('reveal-in'),delay);
      }
    } else {
      if(el.classList.contains('reveal-in')){
        el.classList.remove('reveal-in');
        el.classList.add('reveal-out');
      }
    }
  });
}

// ── Home mini-timeline nodes — 50ms stagger, in+out ──
let _htlObs=null;
function observeHTLNodes(){
  const root=document.querySelector('.htl-scroll-area');
  if(!root)return;
  const nodes=document.querySelectorAll('.htl-node');
  if(!nodes.length)return;
  nodes.forEach(el=>el.classList.remove('in-view'));
  if(_htlObs)_htlObs.disconnect();
  _htlObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  },{root,threshold:0.1,rootMargin:'0px 60px 0px 60px'});
  nodes.forEach((el,i)=>{el.dataset.obsDelay=i*50;_htlObs.observe(el);});
}

// ── Featured cards — 70ms stagger, spring pop ──
let _cardObs=null;
function observeCards(){
  const root=document.getElementById('page-home');
  if(!root)return;
  const cards=document.querySelectorAll('#page-home .card');
  if(!cards.length)return;
  cards.forEach(el=>{el.classList.remove('in-view');el.style.transition='';});
  if(_cardObs)_cardObs.disconnect();
  _cardObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        setTimeout(()=>{
          entry.target.style.transition='opacity .38s cubic-bezier(.4,0,.2,1),transform .38s cubic-bezier(.4,0,.2,1),box-shadow .2s';
          entry.target.classList.add('in-view');
        },+entry.target.dataset.obsDelay||0);
      }
    });
  },{root,threshold:0.08});
  cards.forEach((el,i)=>{el.dataset.obsDelay=i*70;_cardObs.observe(el);});
}

// ── Text timeline txt-cols (Images Off) — stagger, in+out with out-view ──
let _txtObs=null;
function observeTxtCols(){
  const root=document.getElementById('dtl-text-body');
  if(!root)return;
  const cols=root.querySelectorAll('.txt-col');
  if(!cols.length)return;
  if(_txtObs)_txtObs.disconnect();
  _txtObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.remove('out-view');
        setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
      } else {
        if(entry.target.classList.contains('in-view')){
          entry.target.classList.remove('in-view');
          entry.target.classList.add('out-view');
        }
      }
    });
  },{root,threshold:0.08,rootMargin:'0px 20px 0px 20px'});
  cols.forEach((el,i)=>{el.dataset.obsDelay=i*35;_txtObs.observe(el);});
}

// ── Ruler ticks — 30ms stagger ──
let _rulerObs=null;
function observeRulerTicks(){
  const root=document.getElementById('map-ruler-inner');
  if(!root)return;
  const ticks=root.querySelectorAll('.ruler-tick:not(.era-hidden)');
  if(!ticks.length)return;
  if(_rulerObs)_rulerObs.disconnect();
  _rulerObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting)setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
    });
  },{root,threshold:0.1});
  ticks.forEach((el,i)=>{el.dataset.obsDelay=i*30;_rulerObs.observe(el);});
}

// ── Ruler era filter ──
function updateRulerFilter(){
  const inner=document.getElementById('map-ruler-inner');
  if(!inner)return;
  const ticks=inner.querySelectorAll('.ruler-tick');
  let visIdx=0;
  ticks.forEach(t=>{
    const tickYear=+t.dataset.year;
    // Check if any event in this year matches the filter
    const eventsThisYear=EVS.filter(e=>e.year===tickYear);
    const hide=eraFilter!=='all'&&!eventsThisYear.some(e=>e.cat===eraFilter);
    t.classList.toggle('era-hidden',hide);
    t.classList.remove('in-view');
    if(!hide){
      const delay=visIdx*40;
      setTimeout(()=>t.classList.add('in-view'),delay+60);
      visIdx++;
    }
  });
}

// Initial observations on first load
requestAnimationFrame(()=>{
  observeHomeSections();
  observeHTLNodes();
  observeCards();
});
})();
