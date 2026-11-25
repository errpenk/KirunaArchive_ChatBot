function showRibbonHoverYear(year, leftPct){
  if(!ribbonHoverYearEl) return;
  const safeWidth = Math.max(railWidth, 1);
  const hoverPx = (leftPct / 100) * safeWidth;
  const leftPx = (ribbonViewportLeftPct / 100) * safeWidth;
  const rightPx = (ribbonViewportRightPct / 100) * safeWidth;
  if(Math.abs(hoverPx - leftPx) < 40 || Math.abs(hoverPx - rightPx) < 40){
    hideRibbonHoverYear();
    return;
  }
  ribbonHoverYearEl.textContent = String(year);
  ribbonHoverYearEl.style.left = `${leftPct}%`;
  ribbonHoverYearEl.classList.add('show');
}

function hideRibbonHoverYear(){
  if(!ribbonHoverYearEl) return;
  ribbonHoverYearEl.classList.remove('show');
}

function layoutTimelineMode(){
  const mode = getMode();
  const isOverview = mode === 'overview';
  const isYear = mode === 'year';
  const isCalendar = mode === 'calendar';
  const textOpacity = isOverview ? 1 : 0;
  const cardOpacity = isYear ? 1 : 0;
  const txtEntries = [];
  const dtlEntries = [];

  canvas.style.width = stageW + 'px';
  canvas.style.transform = 'translateX(0)';
  canvas.style.opacity = isCalendar ? '0' : '1';
  canvas.style.pointerEvents = isCalendar ? 'none' : 'auto';

  canvas.querySelectorAll('.txt-col').forEach(col => {
    const index = Number(col.dataset.index);
    const x = yearToX(evFractionalYear(EVS[index]));
    const labelHalf = 64;
    const viewportVisible = isEntryWithinViewport(x, labelHalf, 18);
    const fullyVisible = x >= labelHalf + 10 && x <= stageW - labelHalf - 10;
    txtEntries.push({
      col,
      index,
      x,
      viewportVisible,
      fullyVisible,
      above: col.classList.contains('above'),
      dot: col.querySelector('.txt-dot'),
      connector: col.querySelector('.txt-connector'),
      label: col.querySelector('.txt-label'),
      guide: col.querySelector('.tl-guide'),
      lane: -1,
      showGuide: false,
      showLabel: false,
      featured: !!EVS[index].featured
    });
  });

  canvas.querySelectorAll('.dtl-col').forEach(col => {
    const index = Number(col.dataset.index);
    const x = yearToX(evFractionalYear(EVS[index]));
    const cardHalf = 86;
    const viewportVisible = isEntryWithinViewport(x, cardHalf, 18);
    const fullyVisible = x >= cardHalf + 12 && x <= stageW - cardHalf - 12;
    dtlEntries.push({
      col,
      index,
      x,
      viewportVisible,
      fullyVisible,
      above: col.classList.contains('above'),
      dot: col.querySelector('.dtl-dot'),
      card: col.querySelector('.dtl-card'),
      guide: col.querySelector('.tl-guide'),
      showGuide: false,
      featured: !!EVS[index].featured
    });
  });

  if(isOverview){
    assignVisibleLanes(txtEntries.filter(entry => entry.viewportVisible && entry.above), OVERVIEW_LABEL_MAX_LANES, OVERVIEW_LABEL_MIN_GAP);
    assignVisibleLanes(txtEntries.filter(entry => entry.viewportVisible && !entry.above), OVERVIEW_LABEL_MAX_LANES, OVERVIEW_LABEL_MIN_GAP);
    const visibleOverviewEntries = txtEntries.filter(entry => entry.viewportVisible && entry.lane >= 0);
    visibleOverviewEntries.forEach(entry => {
      entry.showLabel = true;
    });
    dedupeGuideLines(visibleOverviewEntries, TIMELINE_GUIDE_MIN_GAP);
  }

  if(isYear){
    dedupeGuideLines(dtlEntries.filter(entry => entry.viewportVisible), TIMELINE_GUIDE_MIN_GAP);
  }

  txtEntries.forEach(entry => {
    const {col, x, viewportVisible, dot, connector, label, guide, lane, above} = entry;
    const canShow = textOpacity > 0.02 && viewportVisible && (!isOverview || (lane >= 0 && entry.showLabel));
    const laneOffset = isOverview ? lane * OVERVIEW_LABEL_LANE_STEP : 0;
    const baseOffset = isOverview ? OVERVIEW_LABEL_BASE_OFFSET : 22;

    col.style.left = x + 'px';
    col.classList.toggle('show', canShow);
    col.style.opacity = (textOpacity * (canShow ? 1 : 0)).toFixed(3);
    col.style.pointerEvents = 'none';
    col.style.transform = `translateX(-50%) translateY(${isOverview ? 0 : -10}px) scale(${isOverview ? 1 : 0.985})`;

    if(guide){
      guide.style.opacity = canShow && entry.showGuide ? '1' : '0';
    }
    if(dot){
      dot.style.pointerEvents = canShow ? 'auto' : 'none';
    }
    if(connector){
      connector.style.opacity = isOverview ? '0' : '1';
    }
    if(label){
      label.style.pointerEvents = canShow ? 'auto' : 'none';
    }

    if(label && connector){
      if(above){
        label.style.top = '';
        connector.style.top = '0';
        label.style.bottom = `calc(50% + ${baseOffset + laneOffset}px)`;
        connector.style.bottom = `calc(50% + ${laneOffset}px)`;
      } else {
        label.style.bottom = '';
        connector.style.bottom = '0';
        label.style.top = `calc(50% + ${baseOffset + laneOffset}px)`;
        connector.style.top = `calc(50% + ${laneOffset}px)`;
      }
    }
  });

  dtlEntries.forEach(entry => {
    const {col, x, viewportVisible, dot, card, guide} = entry;
    const canShow = cardOpacity > 0.02 && viewportVisible;

    col.style.left = x + 'px';
    col.classList.toggle('show', canShow);
    col.style.opacity = (cardOpacity * (canShow ? 1 : 0)).toFixed(3);
    col.style.pointerEvents = 'none';
    col.style.transform = `translateX(-50%) translateY(${isYear ? 0 : 14}px) scale(${isYear ? 1 : 0.97})`;

    if(guide){
      guide.style.opacity = canShow && entry.showGuide ? '1' : '0';
    }

    if(dot){
      dot.style.transform = `translate(-50%,-50%) scale(${isYear ? 1 : 0.92})`;
      dot.style.pointerEvents = canShow ? 'auto' : 'none';
    }
    if(card){
      card.style.transform = `translateX(-50%) translateY(${isYear ? 0 : 12}px) scale(${isYear ? 1 : 0.96})`;
      card.style.opacity = isYear ? '1' : '0';
      card.style.pointerEvents = canShow ? 'auto' : 'none';
    }
  });
}

function layout(){
  const mode = getMode();
  shell.classList.toggle('calendar-mode', mode === 'calendar');

  layoutTimelineMode();
  centerLine.style.opacity = mode === 'calendar' ? '0' : '1';
  centerLine.style.background = 'var(--b)';
  centerLine.style.height = '2px';

  if(mode === 'calendar'){
    showCalendar();
    calOverlay.classList.add('show');
    calOverlay.style.opacity = '1';
    calOverlay.style.pointerEvents = 'auto';
  } else {
    calOverlay.style.opacity = '0';
    calOverlay.style.pointerEvents = 'none';
    calOverlay.classList.remove('show');
  }

  updateHud();
  updateRibbonViewport();
  updateZoomButtons();
  updateStageNavArrows();
}

/* Lightweight layout used during drag — skips ribbon spread/getBoundingClientRect */
let _dragRafPending = false;
function layoutDrag(){
  if(_dragRafPending) return;
  _dragRafPending = true;
  requestAnimationFrame(() => {
    _dragRafPending = false;
    const mode = getMode();
    layoutTimelineMode();
    centerLine.style.opacity = mode === 'calendar' ? '0' : '1';
    // Lightweight ribbon viewport update: just reposition the blue rect, skip spread calc
    _updateRibbonViewportFast();
    updateHud();
    updateStageNavArrows();
  });
}

function _updateRibbonViewportFast(){
  const mode = getMode();
  if(mode === 'calendar') return;
  const displayedRange = getDisplayedTimelineRange();
  if(!displayedRange) return;
  const loPx = ribbonPxForYear(displayedRange.startValue);
  const hiPx = ribbonPxForYear(displayedRange.endValue);
  const paddingPx = 12;
  const leftPct  = ((Math.max(0, loPx - paddingPx)) / Math.max(railWidth, 1)) * 100;
  const widthPct = ((Math.min(railWidth, hiPx + paddingPx) - Math.max(0, loPx - paddingPx)) / Math.max(railWidth, 1)) * 100;
  ribbonViewport.style.left  = leftPct + '%';
  ribbonViewport.style.width = Math.max(widthPct, 1.6) + '%';
  ribbonViewportLeftPct  = leftPct;
  ribbonViewportRightPct = leftPct + Math.max(widthPct, 1.6);
}

/* ──────── STAGE NAV ARROWS ──────── */
const stageNavLeft  = document.getElementById('stage-nav-left');
const stageNavRight = document.getElementById('stage-nav-right');
const stageNavBtnL  = document.getElementById('stage-nav-btn-left');
const stageNavBtnR  = document.getElementById('stage-nav-btn-right');

function getCurrentTimelineViewPosRange(){
  const halfSpan = ypv / 2;
  const centerPos = seqToTimelinePos(centerSeq);
  return {
    halfSpan,
    centerPos,
    startPos: centerPos - halfSpan,
    endPos: centerPos + halfSpan
  };
}

function getStageNavPageTarget(dir, mode = getMode()){
  if(mode !== 'year' || !EVS.length) return null;

  const {halfSpan, centerPos} = getCurrentTimelineViewPosRange();
  const coveredEntries = getTimelineViewportEntries(mode, Math.max(0.01, YEAR_EDGE_DRAG_BLEED * 0.08));
  if(!coveredEntries.length) return null;

  const firstCovered = coveredEntries[0];
  const lastCovered = coveredEntries[coveredEntries.length - 1];
  const edgeBleed = Math.max(0.35, YEAR_EDGE_DRAG_BLEED);
  const axisSpan = getTimelineAxisSpan();
  const minCenter = halfSpan;
  const maxCenter = Math.max(axisSpan - halfSpan, minCenter);

  if(dir > 0){
    if(lastCovered.index >= EVS.length - 1) return null;
    const nextIndex = Math.min(EVS.length - 1, lastCovered.index + 1);
    const nextCenterPos = Math.max(minCenter, Math.min(maxCenter, seqToTimelinePos(nextIndex) + halfSpan - edgeBleed));
    return nextCenterPos > centerPos + 0.01 ? {
      index: nextIndex,
      centerPos: nextCenterPos
    } : null;
  }

  if(firstCovered.index <= 0) return null;
  const prevIndex = Math.max(0, firstCovered.index - 1);
  const prevCenterPos = Math.max(minCenter, Math.min(maxCenter, seqToTimelinePos(prevIndex) - halfSpan + edgeBleed));
  return prevCenterPos < centerPos - 0.01 ? {
    index: prevIndex,
    centerPos: prevCenterPos
  } : null;
}

function updateStageNavArrows(){
  const mode = getMode();
  const visible = mode === 'overview' || mode === 'year';
  stageNavLeft.classList.toggle('show', visible);
  stageNavRight.classList.toggle('show', visible);
  stageNavLeft.style.opacity = visible ? '1' : '0';
  stageNavRight.style.opacity = visible ? '1' : '0';

  if(!visible) return;

  if(mode === 'year'){
    stageNavBtnL.disabled = !getStageNavPageTarget(-1, mode);
    stageNavBtnR.disabled = !getStageNavPageTarget( 1, mode);
    return;
  }

  const axisSpan = getTimelineAxisSpan();
  const {halfSpan, centerPos} = getCurrentTimelineViewPosRange();
  const minPos = halfSpan;
  const maxPos = Math.max(axisSpan - halfSpan, minPos);

  stageNavBtnL.disabled = centerPos <= minPos + 0.01;
  stageNavBtnR.disabled = centerPos >= maxPos - 0.01;
}

function stageNavPan(dir){
  const mode = getMode();
  if(mode === 'year'){
    const target = getStageNavPageTarget(dir, mode);
    if(target){
      animateTo(timelinePosToYear(target.centerPos), ypv, 320);
      return;
    }
  }
  // Pan by ~40% of the visible window
  animatePanByYears(dir * ypv * 0.4, 320);
}

stageNavBtnL.addEventListener('click', e => { e.stopPropagation(); stageNavPan(-1); });
stageNavBtnR.addEventListener('click', e => { e.stopPropagation(); stageNavPan( 1); });
