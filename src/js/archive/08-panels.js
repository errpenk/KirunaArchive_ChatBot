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
