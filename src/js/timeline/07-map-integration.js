// ── Map-view two-tier tab logic ──
(function(){
  const shell = document.getElementById('shell');
  const zoomWrap = document.getElementById('zoom-scale-wrap');
  const mapTabs = document.querySelectorAll('.map-tab');

  function setMapView(view){
    window.parent.KirunaRoutes?.update('timeline2',{source:view,view:'overview',year:null,event:null});
    // Toggle parent tab active state
    mapTabs.forEach(t => t.classList.toggle('on', t.dataset.view === view));
    shell.dataset.mapView = view;

    if(view === 'outside'){
      // Collapse the sub zoom-scale with animation
      zoomWrap.classList.add('collapsed');
    } else {
      // Expand
      zoomWrap.classList.remove('collapsed');
    }
    document.dispatchEvent(new CustomEvent('mapViewChange', {detail:{view}}));
    updateHud();
    requestAnimationFrame(()=>window.syncTimelineAdaptiveUi?.());
  }

  mapTabs.forEach(tab => {
    tab.addEventListener('click', () => setMapView(tab.dataset.view));
  });

  syncEmbeddedAppMode();
  // Default: Inside Map + Overview
  setMapView('inside');
  // Ensure zoom-btn Overview is active (lvl 0)
  document.querySelectorAll('.zoom-btn').forEach(b =>
    b.classList.toggle('on', b.dataset.lvl === '0'));
  requestAnimationFrame(()=>window.syncTimelineAdaptiveUi?.());
})();

// Popover
function fitPopoverCard(){
  const pop = document.getElementById('popover');
  const card = pop?.querySelector('.pop-card');
  if(!card) return;
  if(!pop.classList.contains('show')){
    card.style.setProperty('--pop-fit-scale', '1');
    return;
  }
  const scales = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.73, 0.7];
  let chosen = scales[scales.length - 1];
  for(const scale of scales){
    card.style.setProperty('--pop-fit-scale', String(scale));
    if(card.scrollHeight <= card.clientHeight + 1){
      chosen = scale;
      break;
    }
  }
  card.style.setProperty('--pop-fit-scale', String(chosen));
}
function schedulePopoverFit(){
  requestAnimationFrame(()=>{
    requestAnimationFrame(fitPopoverCard);
  });
}
function openPopover(ev){
  window.parent.KirunaRoutes?.update('timeline2',{event:ev.id,year:getMode()==='calendar'?cpBlock(cpYear).start:ev.year});
  const pop = document.getElementById('popover');
  const mapBtn = document.getElementById('pop-map-link');
  const hero = document.getElementById('pop-hero');
  hero.textContent = '';
  hero.removeAttribute('style');
  hero.style.cssText = archiveImageBackground('inside', ev.id);
  document.getElementById('pop-yr').textContent = formatEventDate(ev);
  document.getElementById('pop-title').textContent = ev.title;
  document.getElementById('pop-desc').textContent = ev.desc;
  document.getElementById('pop-loc').textContent = '◉ ' + ev.loc;
  document.getElementById('pop-cat').textContent = CL[ev.cat] || ev.cat;
  mapBtn.hidden = false;
  mapBtn.onclick = ()=>{
    closePopover(false);
    try{
      if(window.parent && typeof window.parent._selectEv === 'function'){
        window.parent._selectEv(ev.id);
      }
    }catch(err){}
  };
  const galleryBtn = document.getElementById('pop-gallery-link');
  if(galleryBtn){
    galleryBtn.hidden = false;
    galleryBtn.onclick = ()=>{
      closePopover(false);
      try{ window.parent.openGalleryItem('inside', ev.id); }catch(err){}
    };
  }
  pop.classList.add('show');
  schedulePopoverFit();
}
function closePopover(restoreOverview = (getMode() !== 'calendar')){
  const pop = document.getElementById('popover');
  if(!pop.classList.contains('show')) return;
  const returnView=restoreOverview?(popoverReturnView||{centerYear,ypv:LEVELS[0].ypv}):null;
  const view=returnView?(returnView.ypv<=3?'calendar':returnView.ypv<=24?'year':'overview'):getMode();
  const year=view==='calendar'?cpBlock(cpYear).start:view==='year'?Math.round(returnView?.centerYear??centerYear):null;
  window.parent.KirunaRoutes?.update('timeline2',{view,year,event:null});
  pop.classList.remove('show');
  fitPopoverCard();
  if(restoreOverview){
    animateTo(returnView.centerYear, returnView.ypv, 500);
  }
  popoverReturnView = null;
}
function getEventClientPoint(e){
  const touch = e.changedTouches?.[0] || e.touches?.[0];
  return touch ? {x:touch.clientX, y:touch.clientY} : {x:e.clientX, y:e.clientY};
}
function isPointInRect(point, rect){
  return point
    && point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}
function closePopoverFromControl(e){
  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  closePopover();
}
document.getElementById('pop-close').addEventListener('click', ()=>{
  closePopover();
});
['pointerdown','touchstart','click'].forEach(type => {
  document.getElementById('pop-close').addEventListener(type, closePopoverFromControl, {capture:true, passive:false});
});
document.getElementById('popover').addEventListener('click', e=>{
  if(e.target.id === 'popover'){
    closePopover();
  }
});
function handlePopoverBackdropControl(e){
  if(e.target.id === 'popover'){
    const point = getEventClientPoint(e);
    const fsRect = cpeFullscreenBtn?.getBoundingClientRect();
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    if(isCpeFullscreenOpen() && fsRect && isPointInRect(point, fsRect)){
      closePopover(false);
      setCpeFullscreen(false);
      return;
    }
    closePopover();
  }
}
['pointerdown','touchstart','click'].forEach(type => {
  document.getElementById('popover').addEventListener(type, handlePopoverBackdropControl, {capture:true, passive:false});
});
window.addEventListener('resize', schedulePopoverFit, {passive:true});
window.addEventListener('orientationchange', ()=>setTimeout(schedulePopoverFit, 80), {passive:true});

// ─── Event hopping (keyboard ← →) ───
function focusEvent(ev, animate){
  const targetYear = evFractionalYear(ev);
  const targetYpv = ypv;

  if(animate){
    animateTo(targetYear, targetYpv, 500, () => {
      flashEvent(ev.id);
    });
  } else {
    centerYear = targetYear;
    ypv = targetYpv;
    clampCenter(); layout();
    flashEvent(ev.id);
  }
}

function flashEvent(id){
  const items = [
    canvas.querySelector(`.txt-col[data-id="${id}"]`),
    canvas.querySelector(`.dtl-col[data-id="${id}"]`)
  ];
  items.forEach(el => {
    if(!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1100);
  });
  // Also pulse the ribbon dot so the event is clearly indicated on overview
  const ribbonDot = document.querySelector(`.ribbon-dot[data-id="${id}"]`);
  if(ribbonDot){
    ribbonDot.classList.remove('flash');
    void ribbonDot.offsetWidth;
    ribbonDot.classList.add('flash');
    setTimeout(()=>ribbonDot.classList.remove('flash'), 1100);
  }
  // Temporarily highlight this event + dim all others (like hover state)
  if(typeof setLinkedHover === 'function'){
    setLinkedHover(id);
    setTimeout(()=>{ try{ setLinkedHover(null); }catch(e){} }, 2200);
  }
}

// Smooth tween for centerYear + ypv.
// Interpolates in timeline-position space (not year space) to avoid
// non-linear distortion near the axis boundaries.
let tweenRAF = null;
function animateTo(targetYear, targetYpv, duration, done){
  if(tweenRAF) cancelAnimationFrame(tweenRAF);
  // Snapshot starting pos (not year) so interpolation is linear in pos space
  const startPos = seqToTimelinePos(centerSeq);
  const startYpv = ypv;
  const t0 = performance.now();
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Pre-compute target pos: set ypv to target first so clamp uses correct halfSpan
  const savedYpv = ypv;
  ypv = targetYpv;
  centerYear = targetYear;
  clampCenter();
  const targetPos = seqToTimelinePos(centerSeq);
  ypv = savedYpv;
  // Restore centerYear/centerSeq to current values so nothing jumps yet
  const savedSeq = timelinePosToSeq(startPos);
  centerSeq = savedSeq;
  centerYear = seqToYear(centerSeq);

  function tick(now){
    const t = Math.min(1, (now - t0) / duration);
    const e = easeOut(t);
    ypv = startYpv + (targetYpv - startYpv) * e;
    const pos = startPos + (targetPos - startPos) * e;
    centerSeq = timelinePosToSeq(pos);
    centerYear = seqToYear(centerSeq);
    clampCenter(); layout();
    if(t < 1){ tweenRAF = requestAnimationFrame(tick); }
    else { tweenRAF = null; if(done) done(); }
  }
  tweenRAF = requestAnimationFrame(tick);
}

function hopToNextEvent(dir){
  const sorted = [...EVS].sort((a,b) => evFractionalYear(a) - evFractionalYear(b));
  if(dir > 0){
    const next = sorted.find(e => evFractionalYear(e) > centerYear + 0.01);
    if(next) focusEvent(next, true);
    else focusEvent(sorted[0], true);
  } else {
    const prev = [...sorted].reverse().find(e => evFractionalYear(e) < centerYear - 0.01);
    if(prev) focusEvent(prev, true);
    else focusEvent(sorted[sorted.length - 1], true);
  }
}

// Keyboard: arrows pan the timeline like the full archive timeline.
window.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){
    closePopover();
  } else if(e.key === 'ArrowLeft'){
    if(getMode() === 'calendar'){
      navigateCalendarBy(-1);
    } else if(e.altKey || e.metaKey){
      hopToNextEvent(-1);
    } else {
      animatePanByYears(-ypv * 0.15);
    }
    hideHint();
  } else if(e.key === 'ArrowRight'){
    if(getMode() === 'calendar'){
      navigateCalendarBy(1);
    } else if(e.altKey || e.metaKey){
      hopToNextEvent(1);
    } else {
      animatePanByYears(ypv * 0.15);
    }
    hideHint();
  } else if(e.key === '+' || e.key === '='){
    moveModeBySteps(1);
    hideHint();
  } else if(e.key === '-'){
    moveModeBySteps(-1);
    hideHint();
  }
});

function hideHint(){
  hint.classList.add('hide');
}

function syncEmbeddedAppMode(){
  let phone=false;
  let tablet=false;
  try{
    const parentRoot=window.parent?.document?.documentElement||null;
    phone=!!(parentRoot&&parentRoot.classList.contains('phone-app'));
    tablet=!!(parentRoot&&parentRoot.classList.contains('tablet-app'));
  }catch(e){}
  if(!phone&&!tablet){
    const width=window.innerWidth||0;
    phone=width<=680;
    tablet=!phone&&width<=1024;
  }
  document.documentElement.classList.toggle('embedded-phone',phone);
  document.documentElement.classList.toggle('embedded-tablet',tablet);
  try{
    const pw=window.parent||window;
    document.documentElement.classList.toggle('embedded-portrait',pw.innerHeight>pw.innerWidth);
  }catch(e){}
  return {phone,tablet};
}
window.syncEmbeddedAppMode = syncEmbeddedAppMode;

function syncTimelineHeaderMetaVisibility(){
  const hdr=document.getElementById('hdr');
  const center=document.querySelector('.hdr-center');
  const right=document.querySelector('.hdr-r');
  const shellEl=document.getElementById('shell');
  if(!hdr||!center||!right||!shellEl) return false;
  const {phone}=syncEmbeddedAppMode();
  const centerRect=center.getBoundingClientRect();
  const rightRect=right.getBoundingClientRect();
  const nextHidden=phone||(((shellEl.dataset.mapView||'inside')==='inside')&&rightRect.width>0&&(centerRect.right+18>rightRect.left));
  const changed=hdr.classList.contains('timeline-meta-hidden')!==nextHidden;
  hdr.classList.toggle('timeline-meta-hidden',nextHidden);
  return changed;
}

function alignHeaderCenterToParentTabs(){
  const setParentOffset=(value)=>{
    const next=Number.isFinite(value)?value:0;
    document.documentElement.style.setProperty('--parent-nav-offset',next.toFixed(2)+'px');
    document.querySelector('.hdr-center')?.style.setProperty('--parent-nav-offset',next.toFixed(2)+'px');
  };
  if(document.documentElement.classList.contains('embedded-phone') || document.documentElement.classList.contains('embedded-tablet')){
    setParentOffset(0);
    syncTimelineHeaderMetaVisibility();
    return;
  }
  try{
    const hdr=document.getElementById('hdr');
    const center=document.querySelector('.hdr-center');
    if(!hdr||!center){
      setParentOffset(0);
      syncTimelineHeaderMetaVisibility();
      return;
    }
    const hdrRect=hdr.getBoundingClientRect();
    const parentCenter=typeof window.parent?.getKirunaMainNavTabsCenterX==='function'
      ? window.parent.getKirunaMainNavTabsCenterX()
      : null;
    const frameRect=window.frameElement?.getBoundingClientRect?.();
    const desiredCenter=Number.isFinite(parentCenter)&&frameRect
      ? parentCenter-frameRect.left
      : hdrRect.left+(hdrRect.width/2);
    const localCenter=hdrRect.left+(hdrRect.width/2);
    setParentOffset(desiredCenter-localCenter);
  }catch(e){
    setParentOffset(0);
  }
  syncTimelineHeaderMetaVisibility();
}
window.alignHeaderCenterToParentTabs = alignHeaderCenterToParentTabs;
window.syncTimelineAdaptiveUi = function(){
  syncEmbeddedAppMode();
  alignHeaderCenterToParentTabs();
};

// Resize
window.addEventListener('resize', ()=>{ measure(); layout(); syncEmbeddedAppMode(); alignHeaderCenterToParentTabs(); });

window.applyExternalViewState = function(view = 'overview', year = null){
  const normalizedView = String(view || 'overview').trim().toLowerCase();
  const targetYear = Number.isFinite(year)
    ? Math.max(YR_MIN, Math.min(YR_MAX, Math.round(year)))
    : Math.round(centerYear);
  let targetYpv = LEVELS[0].ypv;
  if(normalizedView === 'calendar' || normalizedView === 'cal'){
    targetYpv = LEVELS[2].ypv;
    cpYear = targetYear;
    cpSel = null;
  } else if(normalizedView === 'year'){
    targetYpv = LEVELS[1].ypv;
  } else if(normalizedView === 'timeline' || normalizedView === 'overview'){
    targetYpv = LEVELS[0].ypv;
  }
  animateTo(targetYear, targetYpv, 420);
  hideHint();
};
window.resetTimelineOverview = function(){
  const insideBtn = document.getElementById('map-tab-inside');
  if(insideBtn && !insideBtn.classList.contains('on')) insideBtn.click();
  cpYear = DEFAULT_OVERVIEW_CENTER;
  cpSel = null;
  hideHint();
  closePopover(false);
  animateTo(DEFAULT_OVERVIEW_CENTER, LEVELS[0].ypv, 420);
};
window.forceTimelineLayout = function(){
  measure();
  layout();
  alignHeaderCenterToParentTabs();
};
window.applyTimeRoute=async function(state){
  document.getElementById('map-tab-'+state.source).click();
  if(state.source==='outside'){
    const frame=document.getElementById('outside-frame');
    if(!frame.contentWindow?.applyOutsideYearRoute){
      await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    }
    if(state.event!==null){
      if(state.view==='cards')frame.contentWindow?.openOutsideDocFromGallery?.(state.event);
      else frame.contentWindow?.openOutsideDocSearch?.(state.event);
    }else if(state.year!==null){
      frame.contentWindow?.applyOutsideYearRoute?.(state.year,state.view);
    }else if(state.view==='cards'){
      frame.contentWindow?.openOutsideCards?.();
    }
    return;
  }
  document.getElementById('popover').classList.remove('show');
  window.applyExternalViewState(state.view,state.year);
  if(state.event!==null){
    const ev=EV_BY_ID.get(state.event);
    if(ev)openPopover(ev);
  }
};

/* Exposed for gallery → Time animation sequence:
   1. selectEvent scrolls/centres the event on the timeline
   2. flashEvent pulses dot + dims all others (setLinkedHover)
   3. openPopover opens the event card */
window._selectAndOpenPopover = function(id){
  const ev = EVS.find(e => e.id === id);
  if(!ev) return;
  // Step 1: centre timeline on this event's year, animate in
  if(typeof animateTo === 'function'){
    animateTo(ev.year, LEVELS[1].ypv, 600, null);
  }
  // Step 2: flash dot + dim others
  setTimeout(()=>{
    if(typeof flashEvent === 'function') flashEvent(id);
  }, 320);
  // Step 3: open popover after flash settles
  setTimeout(()=>{
    if(typeof openPopover === 'function') openPopover(ev);
  }, 900);
};

// ─── Init ───
buildTimelineAxis();
measure();
if(initialViewState.year !== null){
  centerYear = initialViewState.year;
  cpYear = initialViewState.year;
  cpSel = initialViewState.year;
}
if(initialViewState.level !== null){
  ypv = LEVELS[initialViewState.level].ypv;
}
clampCenter();
buildCanvas();
buildRibbon();
layout();
alignHeaderCenterToParentTabs();
if(initialViewState.level !== null || initialViewState.year !== null){
  hint.classList.add('hide');
}
