/* ──────── HEADER + ZOOM BUTTONS ──────── */
function updateHud(){
  if((shell.dataset.mapView || 'inside') === 'outside'){
    const outsideState = getOutsideHudState();
    if(outsideState){
      viewRangeEl.textContent = Number.isFinite(outsideState.startYear) && Number.isFinite(outsideState.endYear)
        ? `${outsideState.startYear}–${outsideState.endYear}`
        : '—';
      viewCountEl.textContent = String(Math.max(0, Math.round(outsideState.count || 0)));
      return;
    }
  }

  const mode = getMode();
  if(mode === 'calendar'){
    const {start, end} = cpBlock(cpYear);
    const evs = EVS.filter(e => e.year >= start && e.year <= end);
    viewRangeEl.textContent = `${start}–${end}`;
    viewCountEl.textContent = evs.length;
    return;
  }

  const displayedRange = getDisplayedTimelineRange();
  if(!displayedRange){
    viewRangeEl.textContent = '—';
    viewCountEl.textContent = '0';
    return;
  }

  viewRangeEl.textContent = `${displayedRange.startYear}–${displayedRange.endYear}`;
  viewCountEl.textContent = displayedRange.entries.length;
}

let routeUpdateTimer=null;
function updateZoomButtons(){
  const current = getModeIndex();
  zoomBtns.forEach((b,i) => b.classList.toggle('on', i === current));
  clearTimeout(routeUpdateTimer);
  routeUpdateTimer=setTimeout(()=>{
    if(shell.dataset.mapView==='outside')return;
    const route=window.parent.KirunaRoutes?.parse(new URL(window.parent.location.href));
    const view=ypv<=3?'calendar':ypv<=24?'year':'overview';
    const eventYear=route?.event?EV_BY_ID.get(route.event)?.year:null;
    window.parent.KirunaRoutes?.update('timeline2',{
      source:'inside',view,
      year:eventYear??(route?.year===null?null:view==='calendar'?(cpSel??cpBlock(cpYear).start):Math.round(centerYear))
    },true);
  },600);
}

window.refreshTimeline2Hud = function(outsideState = null){
  if((shell.dataset.mapView || 'inside') === 'outside' && outsideState){
    viewRangeEl.textContent = Number.isFinite(outsideState.startYear) && Number.isFinite(outsideState.endYear)
      ? `${outsideState.startYear}–${outsideState.endYear}`
      : '—';
    viewCountEl.textContent = String(Math.max(0, Math.round(outsideState.count || 0)));
    return;
  }
  updateHud();
};

/* ──────── RIBBON ──────── */
function getCalendarCellByYear(year){
  return cpdaysEl.querySelector(`.cp-day[data-year="${year}"]`);
}

let linkedHoverId = null;
let ribbonViewportLeftPct = 0;
let ribbonViewportRightPct = 100;
let ribbonViewportLastLeftPct = null;
let ribbonViewportLastWidthPct = null;
let ribbonViewportAnimTimer = 0;

function setLinkedHover(id){
  if(linkedHoverId === id) return;

  if(linkedHoverId !== null){
    document.querySelector(`.ribbon-dot[data-id="${linkedHoverId}"]`)?.classList.remove('is-hover-linked');
    canvas.querySelector(`.txt-col[data-id="${linkedHoverId}"]`)?.classList.remove('is-hover-linked');
    canvas.querySelector(`.dtl-col[data-id="${linkedHoverId}"]`)?.classList.remove('is-hover-linked');
    cpeList.querySelector(`.cpe-ev[data-id="${linkedHoverId}"]`)?.classList.remove('is-hover-linked');
    const prevEv = EV_BY_ID.get(linkedHoverId);
    if(prevEv){
      getCalendarCellByYear(prevEv.year)?.classList.remove('is-hover-linked');
    }
  }

  linkedHoverId = id;
  if(id === null){
    canvas.classList.remove('has-hover');
    return;
  }
  canvas.classList.add('has-hover');

  document.querySelector(`.ribbon-dot[data-id="${id}"]`)?.classList.add('is-hover-linked');
  canvas.querySelector(`.txt-col[data-id="${id}"]`)?.classList.add('is-hover-linked');
  canvas.querySelector(`.dtl-col[data-id="${id}"]`)?.classList.add('is-hover-linked');
  cpeList.querySelector(`.cpe-ev[data-id="${id}"]`)?.classList.add('is-hover-linked');
  const ev = EV_BY_ID.get(id);
  if(ev){
    getCalendarCellByYear(ev.year)?.classList.add('is-hover-linked');
  }
}

function getRibbonDotLeftPct(id){
  const dot = ribbonTrack.querySelector(`.ribbon-dot[data-id="${id}"]`);
  return Number(dot?.dataset.currentLeft ?? dot?.dataset.baseLeft ?? ribbonPctForId(id));
}

function animateRibbonViewportIfNeeded(leftPct, widthPct){
  const moved = ribbonViewportLastLeftPct === null
    || Math.abs(leftPct - ribbonViewportLastLeftPct) > 0.12
    || Math.abs(widthPct - ribbonViewportLastWidthPct) > 0.12;
  ribbonViewportLastLeftPct = leftPct;
  ribbonViewportLastWidthPct = widthPct;
  if(!moved || ribbonViewportDragging) return;
  ribbonViewport.classList.add('animating');
  clearTimeout(ribbonViewportAnimTimer);
  ribbonViewportAnimTimer = window.setTimeout(() => {
    ribbonViewport.classList.remove('animating');
  }, 220);
}

function getNearestRibbonDot(clientX){
  const rect = ribbonTrack.getBoundingClientRect();
  if(rect.width <= 0) return null;
  const localX = clientX - rect.left;
  let bestDot = null;
  let bestDistance = Infinity;

  ribbonTrack.querySelectorAll('.ribbon-dot').forEach(dot => {
    const style = getComputedStyle(dot);
    if(style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return;
    if(dot.style.pointerEvents === 'none') return;
    const leftPct = Number(dot.dataset.currentLeft ?? dot.dataset.baseLeft ?? 0);
    const dotX = (leftPct / 100) * rect.width;
    const distance = Math.abs(localX - dotX);
    if(distance < bestDistance){
      bestDistance = distance;
      bestDot = dot;
    }
  });

  if(!bestDot || bestDistance > RIBBON_HOVER_SNAP_PX) return null;
  return {dot: bestDot, distance: bestDistance};
}

function updateRibbonProximityHover(clientX){
  if(ribbonDragging || ribbonViewportDragging) return;
  const nearest = getNearestRibbonDot(clientX);
  if(!nearest){
    hideRibbonHoverYear();
    setLinkedHover(null);
    return;
  }
  const id = Number(nearest.dot.dataset.id || 0);
  const ev = EV_BY_ID.get(id);
  if(!ev){
    hideRibbonHoverYear();
    setLinkedHover(null);
    return;
  }
  setLinkedHover(id);
  showRibbonHoverYear(ev.year, getRibbonDotLeftPct(id));
}

function getRibbonDotSpreadMap(dots, inViewIds, minLeftPx, maxLeftPx){
  const items = Array.from(dots)
    .map(dot => ({
      dot,
      id: Number(dot.dataset.id || 0),
      basePx: ribbonPxForId(Number(dot.dataset.id || 0))
    }))
    .filter(item => inViewIds.has(item.id))
    .sort((a,b) => a.basePx - b.basePx || a.id - b.id);

  const spread = new Map();
  if(!items.length) return spread;
  if(items.length === 1){
    spread.set(items[0].id, Math.max(minLeftPx, Math.min(maxLeftPx, items[0].basePx)));
    return spread;
  }

  const available = Math.max(maxLeftPx - minLeftPx, 1);
  const gap = Math.min(RIBBON_VISIBLE_DOT_MIN_GAP, available / Math.max(items.length - 1, 1));
  const positions = items.map(item => Math.max(minLeftPx, Math.min(maxLeftPx, item.basePx)));

  for(let i = 1; i < positions.length; i++){
    positions[i] = Math.max(positions[i], positions[i - 1] + gap);
  }

  if(positions[positions.length - 1] > maxLeftPx){
    const shift = positions[positions.length - 1] - maxLeftPx;
    for(let i = 0; i < positions.length; i++) positions[i] -= shift;
  }

  for(let i = positions.length - 2; i >= 0; i--){
    positions[i] = Math.min(positions[i], positions[i + 1] - gap);
  }

  if(positions[0] < minLeftPx){
    const shift = minLeftPx - positions[0];
    for(let i = 0; i < positions.length; i++) positions[i] += shift;
  }

  const neededWidth = gap * (items.length - 1);
  if(neededWidth > available + 0.5){
    const evenGap = available / Math.max(items.length - 1, 1);
    const clusterCenter = items.reduce((sum, item) => sum + item.basePx, 0) / items.length;
    const start = Math.max(minLeftPx, Math.min(maxLeftPx - evenGap * (items.length - 1), clusterCenter - (evenGap * (items.length - 1)) / 2));
    items.forEach((item, index) => {
      spread.set(item.id, start + evenGap * index);
    });
    return spread;
  }

  items.forEach((item, index) => {
    spread.set(item.id, positions[index]);
  });
  return spread;
}

function activateRibbonEvent(id){
  const ev = EV_BY_ID.get(id);
  if(!ev) return;

  if(getMode() === 'calendar'){
    const block = cpBlock(ev.year);
    cpYear = ev.year;
    cpSel = ev.year;
    cpActiveId = ev.id;
    lastCalBlockStart = block.start;
    centerYear = block.start + ((block.end - block.start + 1) / 2);
    clampCenter();
    renderCalPage();
    layout();
    requestAnimationFrame(() => {
      const cell = getCalendarCellByYear(ev.year);
      if(cell) triggerCalDayInteraction(cell);
      const row = cpeList.querySelector(`.cpe-ev[data-id="${ev.id}"]`);
      if(row) row.scrollIntoView({block:'nearest'});
    });
    return;
  }

  focusEvent(ev, true);
}

function buildRibbon(){
  ensureRibbonBaseLayout();
  // event dots
  EVS.forEach(ev=>{
    const d = document.createElement('div');
    d.className = 'ribbon-dot' + (ev.featured?' featured':'');
    d.dataset.id = ev.id;
    d.dataset.year = String(evFractionalYear(ev));
    d.dataset.labelYear = String(ev.year);
    d.dataset.baseLeft = String(ribbonPctForId(ev.id));
    d.style.left = d.dataset.baseLeft + '%';
    d.dataset.currentLeft = d.dataset.baseLeft;
    d.style.background = CC[ev.cat];
    d.title = ev.year + ' · ' + ev.title;
    d.tabIndex = 0;
    d.addEventListener('mouseenter', () => {
      setLinkedHover(ev.id);
      showRibbonHoverYear(ev.year, getRibbonDotLeftPct(ev.id));
    });
    d.addEventListener('mouseleave', () => {
      hideRibbonHoverYear();
      setLinkedHover(null);
    });
    d.addEventListener('focus', () => {
      setLinkedHover(ev.id);
      showRibbonHoverYear(ev.year, getRibbonDotLeftPct(ev.id));
    });
    d.addEventListener('blur', () => {
      hideRibbonHoverYear();
      setLinkedHover(null);
    });
    d.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
    });
    d.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      activateRibbonEvent(ev.id);
    });
    d.addEventListener('keydown', e => {
      if(e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      activateRibbonEvent(ev.id);
    });
    ribbonTrack.appendChild(d);
  });
}

function resetRibbonViewport(dots){
  updateRibbonLabels(YR_MIN, YR_MAX, 0, 100);
  ribbonViewportLeftPct = 0;
  ribbonViewportRightPct = 100;
  hideRibbonHoverYear();
  ribbonViewport.style.left = '0%';
  ribbonViewport.style.width = '100%';
  animateRibbonViewportIfNeeded(0, 100);
  dots.forEach(d => {
    d.classList.remove('in-view');
    d.style.opacity = '1';
    d.style.pointerEvents = 'auto';
  });
}

function updateRibbonViewport(){
  const mode = getMode();
  const dots = Array.from(ribbonTrack.querySelectorAll('.ribbon-dot'));
  ensureRibbonBaseLayout();

  dots.forEach(d => {
    d.dataset.baseLeft = String(ribbonPctForId(parseInt(d.dataset.id)));
    d.dataset.currentLeft = d.dataset.baseLeft;
    d.style.left = d.dataset.baseLeft + '%';
  });

  let rangeStart = YR_MIN;
  let rangeEnd = YR_MAX;
  let labelStart = YR_MIN;
  let labelEnd = YR_MAX;

  if(mode === 'calendar'){
    const block = cpBlock(cpYear);
    rangeStart = block.start;
    rangeEnd = block.end;
    labelStart = block.start;
    labelEnd = block.end;
  } else {
    const displayedRange = getDisplayedTimelineRange();
    if(!displayedRange){
      resetRibbonViewport(dots);
      return;
    }
    rangeStart = displayedRange.startValue;
    rangeEnd = displayedRange.endValue;
    labelStart = displayedRange.startYear;
    labelEnd = displayedRange.endYear;
  }

  if(rangeEnd < rangeStart){
    resetRibbonViewport(dots);
    return;
  }

  const loPx = ribbonPxForYear(rangeStart);
  const hiPx = ribbonPxForYear(rangeEnd);
  const paddingPx = 12;
  const leftPct = ((Math.max(0, loPx - paddingPx)) / Math.max(railWidth, 1)) * 100;
  const widthPct = ((Math.min(railWidth, hiPx + paddingPx) - Math.max(0, loPx - paddingPx)) / Math.max(railWidth, 1)) * 100;
  ribbonViewport.style.left = leftPct + '%';
  ribbonViewport.style.width = Math.max(widthPct, 1.6) + '%';
  ribbonViewportLeftPct = leftPct;
  ribbonViewportRightPct = leftPct + Math.max(widthPct, 1.6);
  animateRibbonViewportIfNeeded(ribbonViewportLeftPct, Math.max(widthPct, 1.6));
  updateRibbonLabels(labelStart, labelEnd, leftPct, leftPct + Math.max(widthPct, 1.6));
  hideRibbonHoverYear();

  const displayedIdSet = mode === 'calendar'
    ? new Set(EVS.filter(ev => ev.year >= rangeStart && ev.year <= rangeEnd).map(ev => ev.id))
    : new Set((getDisplayedTimelineRange()?.entries || []).map(ev => ev.id));

  const minDotPx = loPx + 8;
  const maxDotPx = hiPx - 8;
  const spreadMap = getRibbonDotSpreadMap(dots, displayedIdSet, Math.min(minDotPx, maxDotPx), Math.max(minDotPx, maxDotPx));
  const viewportHideBufferPct = (10 / Math.max(railWidth, 1)) * 100;

  dots.forEach(d => {
    const id = Number(d.dataset.id || 0);
    if(spreadMap.has(id)){
      const pct = (spreadMap.get(id) / Math.max(railWidth, 1)) * 100;
      d.dataset.currentLeft = String(pct);
      d.style.left = `${pct}%`;
    }
    const inView = displayedIdSet.has(id);
    const currentPct = Number(d.dataset.currentLeft ?? d.dataset.baseLeft ?? 0);
    const hiddenInsideViewport = !inView
      && currentPct >= ribbonViewportLeftPct - viewportHideBufferPct
      && currentPct <= ribbonViewportRightPct + viewportHideBufferPct;
    d.classList.toggle('in-view', inView);
    d.style.opacity = hiddenInsideViewport ? '0' : '1';
    d.style.pointerEvents = hiddenInsideViewport ? 'none' : 'auto';
  });
}
