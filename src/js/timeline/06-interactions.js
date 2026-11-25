/* ──────── INTERACTIONS ──────── */

let modeScrollAccum = 0;
let modeScrollLastAt = 0;
let modeScrollLastTriggerAt = 0;


function moveModeBySteps(stepDelta, clientX, duration = 430){

  if(
    document.documentElement.classList.contains('embedded-phone') ||
    document.documentElement.classList.contains('embedded-tablet')
  ){
    return false;
  }

  const currentSequenceIndex = getMode() === 'calendar' ? 1 : 0;
  const targetSequenceIndex = Math.max(
    0,
    Math.min(MODE_SWITCH_LEVELS.length - 1, currentSequenceIndex + stepDelta)
  );
  if(targetSequenceIndex === currentSequenceIndex) return false;

  const stageRect = stage.getBoundingClientRect();
  const anchorClientX = clientX ?? (stageRect.left + stageW / 2);
  const focusYear = xToYear(anchorClientX);
  const focusPos = yearToTimelinePos(focusYear);
  const targetLevelIndex = MODE_SWITCH_LEVELS[targetSequenceIndex];
  const targetYpv = LEVELS[targetLevelIndex].ypv;
  const edgePad = getStageEdgePad();
  const usableWidth = Math.max(stageW - edgePad * 2, 1);
  const localX = Math.max(edgePad, Math.min(stageW - edgePad, anchorClientX - stageRect.left));
  const frac = clamp01((localX - edgePad) / usableWidth);
  const targetCenterPos = focusPos - (frac - 0.5) * targetYpv;
  animateTo(timelinePosToYear(targetCenterPos), targetYpv, duration);
  return true;
}

function applyEmbeddedPinchZoom(scale, clientX, baseYpv = ypv){
  const safeScale = Math.max(Number(scale) || 1, 0.2);
  const currentYpv = Number(baseYpv) > 0 ? Number(baseYpv) : (Number(ypv) || 72);
  const nextYpv = Math.max(1, Math.min(72, currentYpv / safeScale));
  const stageRect = stage.getBoundingClientRect();
  const anchorClientX = Number.isFinite(clientX) ? clientX : (stageRect.left + stageRect.width / 2);
  const edgePad = getStageEdgePad();
  const stageWidth = Math.max(stageRect.width || stage.clientWidth || 0, 1);
  const usableWidth = Math.max(stageWidth - edgePad * 2, 1);
  const focusYear = xToYear(anchorClientX);
  const focusPos = yearToTimelinePos(focusYear);
  const localX = Math.max(edgePad, Math.min(stageWidth - edgePad, anchorClientX - stageRect.left));
  const frac = clamp01((localX - edgePad) / usableWidth);
  const targetCenterPos = focusPos - (frac - 0.5) * nextYpv;
  ypv = nextYpv;
  centerYear = timelinePosToYear(targetCenterPos);
  clampCenter();
  layoutDrag();
  updateHud();
  return nextYpv;
}
function handleTimelineZoom(deltaY, clientX){
  const now = performance.now();
  if(wheelGestureModeSwitchConsumed) return;
  if(Math.abs(deltaY) < 1.5) return;
  if(now - modeScrollLastAt > MODE_SCROLL_GESTURE_RESET_MS){
    modeScrollAccum = 0;
  }
  modeScrollLastAt = now;
  const gestureDelta = -deltaY;
  if(Math.abs(gestureDelta) >= MODE_SCROLL_DIRECT_TRIGGER){
    modeScrollAccum = Math.sign(gestureDelta) * MODE_SCROLL_STEP_THRESHOLD;
  } else {
    modeScrollAccum += gestureDelta;
  }

  if(Math.abs(modeScrollAccum) < MODE_SCROLL_STEP_THRESHOLD) return;
  // Long cooldown after a level switch: prevents a single large swipe from
  // triggering more than one level change.
  if(now - modeScrollLastTriggerAt < MODE_SCROLL_TRIGGER_COOLDOWN_MS) return;

  const direction = modeScrollAccum > 0 ? 1 : -1;
  modeScrollAccum = 0; // reset so next trigger needs fresh accumulation
  if(moveModeBySteps(direction, clientX)){
    modeScrollLastTriggerAt = now;
    wheelGestureModeSwitchConsumed = true;
  }
}

function handleTimelinePagePan(delta){
  if(Math.abs(delta) < 0.01) return;
  const usableWidth = Math.max(stageW - getStageEdgePad() * 2, 1);
  const centerPos = seqToTimelinePos(centerSeq);
  centerYear = timelinePosToYear(centerPos + (delta / usableWidth) * ypv * TIMELINE_WHEEL_PAN_MULTIPLIER);
  clampCenter();
  layout();
}

let lastCalendarWheelAt = 0;
function handleCalendarWheel(delta){
  const now = performance.now();
  if(now - lastCalendarWheelAt < 380) return;
  if(Math.abs(delta) < 14) return;
  lastCalendarWheelAt = now;
  navigateCalendarBy(delta > 0 ? 1 : -1);
}

function handleRibbonWheelPan(delta){
  if(Math.abs(delta) < 0.01) return;
  const rect = ribbonTrack.getBoundingClientRect();
  const innerWidth = Math.max(1, rect.width - RIBBON_EDGE_PAD * 2);
  const centerPos = seqToTimelinePos(centerSeq);
  const deltaPos = (delta / innerWidth) * getTimelineAxisSpan() * RIBBON_WHEEL_PAN_MULTIPLIER;
  centerYear = timelinePosToYear(centerPos + deltaPos);
  clampCenter();
  layout();
}

// Wheel: horizontal pans the timeline, vertical zooms like the original temporal prototype.
stage.addEventListener('wheel', e=>{
  const mode = getMode();
  if(mode === 'calendar' && (calendarPanelHoverLocked || isCalendarPanelInteractionTarget(e.target))) return;
  const axis = getLockedWheelGestureAxis(e.deltaX, e.deltaY);
  if(axis === 'none'){
    if(Math.abs(e.deltaX) > 0.01 || Math.abs(e.deltaY) > 0.01) e.preventDefault();
    return;
  }
  const axisDelta = getWheelAxisDelta(axis, e.deltaX, e.deltaY);
  e.preventDefault();
  hideHint();

  if(mode === 'calendar' && axis === 'horizontal'){
    handleCalendarWheel(axisDelta);
    return;
  }

  if(axis === 'horizontal'){
    handleTimelinePagePan(axisDelta);
    return;
  }

  handleTimelineZoom(axisDelta, e.clientX);
}, {passive: false});

let embeddedPinchGesture = null;
const isEmbeddedTouch = () => document.documentElement.classList.contains('embedded-tablet') || document.documentElement.classList.contains('embedded-phone');
stage.addEventListener('touchstart', e => {
  if(!isEmbeddedTouch() || e.touches.length !== 2) return;
  const [a, b] = e.touches;
  const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if(!Number.isFinite(distance) || distance <= 0) return;
  e.preventDefault();
  embeddedPinchGesture = {
    distance,
    startYpv: Number(ypv) || 72
  };
  hideHint();
  stopStageDrag();
}, {passive:false});
stage.addEventListener('touchmove', e => {
  if(!embeddedPinchGesture || !isEmbeddedTouch() || e.touches.length !== 2) return;
  const [a, b] = e.touches;
  const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if(!Number.isFinite(distance) || distance <= 0) return;
  e.preventDefault();
  const midClientX = (a.clientX + b.clientX) / 2;
  applyEmbeddedPinchZoom(distance / Math.max(embeddedPinchGesture.distance, 1), midClientX, embeddedPinchGesture.startYpv);
}, {passive:false});
stage.addEventListener('touchend', e => {
  if(!embeddedPinchGesture) return;
  if(e.touches.length >= 2) return;
  embeddedPinchGesture = null;
  layout();
  updateHud();
}, {passive:true});
stage.addEventListener('touchcancel', () => {
  if(!embeddedPinchGesture) return;
  embeddedPinchGesture = null;
  layout();
  updateHud();
}, {passive:true});

// Drag to pan (stage)
let dragging = false, dragStartX = 0, dragStartCenterPos = 0, dragPointerId = null;
let dragStartY = 0, dragPointerType = '';
let stageTouchIntentPending = false;
let dragDistance = 0;
let suppressTimelineEventClicksUntil = 0;
function stopStageDrag(pointerId = null){
  if(pointerId !== null && dragPointerId !== null && pointerId !== dragPointerId) return;
  if(dragging && dragDistance >= TIMELINE_DRAG_CLICK_SUPPRESS_DISTANCE){
    suppressTimelineEventClicksUntil = performance.now() + 120;
  }
  dragging = false;
  stageTouchIntentPending = false;
  dragDistance = 0;
  stage.classList.remove('dragging');
  if(dragPointerId !== null && stage.hasPointerCapture(dragPointerId)){
    stage.releasePointerCapture(dragPointerId);
  }
  dragPointerId = null;
  dragPointerType = '';
  stage.style.cursor = '';
  document.body.style.userSelect = '';
}

stage.addEventListener('pointerdown', e=>{
  if(e.button !== 0) return;
  if(e.target.closest('#cal-overlay')) return;
  resetWheelGestureLock();
  dragPointerId = e.pointerId;
  dragPointerType = e.pointerType || 'mouse';
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragDistance = 0;
  // Store current center in pos space (not year space) for accurate dragging
  dragStartCenterPos = seqToTimelinePos(centerSeq);
  document.body.style.userSelect = 'none';
  hideHint();
  if(dragPointerType === 'touch' || dragPointerType === 'pen'){
    stageTouchIntentPending = true;
    return;
  }
  // For mouse: don't capture yet — wait for actual movement to confirm drag.
  // This allows click events on child elements (cards, labels) to fire normally.
});

stage.addEventListener('pointermove', e=>{
  if(e.pointerId !== dragPointerId) return;
  if(stageTouchIntentPending){
    const mode = getMode();
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if(mode === 'year'){
      if(absX >= TOUCH_MODE_SWIPE_THRESHOLD && absX > absY * TOUCH_GESTURE_DIRECTION_RATIO){
        suppressTimelineEventClicksUntil = performance.now() + 120;
        stageNavPan(dx > 0 ? 1 : -1);
        stopStageDrag(e.pointerId);
      }
      return;
    }
    if(absX >= TOUCH_PAN_START_THRESHOLD && absX > absY * TOUCH_GESTURE_DIRECTION_RATIO){
      stageTouchIntentPending = false;
      dragging = true;
      stage.classList.add('dragging');
      if(!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
      return;
    }
    return;
  }
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const dist = Math.hypot(dx, dy);
  dragDistance = Math.max(dragDistance, dist);
  // Only enter drag mode after a clear horizontal gesture so clicks stay clicks.
  if(!dragging){
    if(absX < TIMELINE_DRAG_CLICK_SUPPRESS_DISTANCE) return;
    if(absX <= absY * TOUCH_GESTURE_DIRECTION_RATIO) return;
    dragging = true;
    stage.classList.add('dragging');
    stage.style.cursor = 'grabbing';
    if(!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
  }
  const mode = getMode();
  const usableWidth = Math.max(stageW - getStageEdgePad() * 2, 1);
  const dragTravelSpan = getStageDragTravelSpan(mode);
  // In year mode we intentionally amplify drag travel so a single continuous
  // pull can scrub across the whole archive instead of only one viewport.
  const newPos = dragStartCenterPos - (dx / usableWidth) * dragTravelSpan * DRAG_RESISTANCE;
  centerYear = timelinePosToYear(newPos);
  clampCenter();
  layoutDrag();
});

stage.addEventListener('pointerup', e => { stopStageDrag(e.pointerId); layout(); });
stage.addEventListener('pointercancel', e => { stopStageDrag(e.pointerId); layout(); });

// Ribbon click/drag = jump
let ribbonDragging = false;
let ribbonViewportDragging = false;
let ribbonViewportDragStartX = 0;
let ribbonViewportDragStartPos = 0;
ribbonTrack.addEventListener('mousemove', e => {
  updateRibbonProximityHover(e.clientX);
});
ribbonTrack.addEventListener('mouseleave', () => {
  if(ribbonDragging || ribbonViewportDragging) return;
  hideRibbonHoverYear();
  setLinkedHover(null);
});
ribbonTrack.addEventListener('wheel', e => {
  const axis = getLockedWheelGestureAxis(e.deltaX, e.deltaY);
  if(axis !== 'horizontal') return;
  e.preventDefault();
  e.stopPropagation();
  hideHint();
  handleRibbonWheelPan(getWheelAxisDelta(axis, e.deltaX, e.deltaY));
  updateRibbonProximityHover(e.clientX);
}, {passive:false});
ribbonTrack.addEventListener('mousedown', e=>{
  if(e.target.closest('#ribbon-viewport')) return;
  resetWheelGestureLock();
  ribbonDragging = true;
  ribbonJumpTo(e);
  hideHint();
});
ribbonViewport.addEventListener('mousedown', e => {
  e.preventDefault();
  e.stopPropagation();
  resetWheelGestureLock();
  if(getMode() === 'calendar'){
    ribbonDragging = true;
    ribbonJumpTo(e);
    return;
  }
  ribbonViewportDragging = true;
  ribbonViewportDragStartX = e.clientX;
  ribbonViewportDragStartPos = seqToTimelinePos(centerSeq);
  ribbonViewport.classList.add('dragging');
  hideHint();
});
window.addEventListener('mousemove', e=>{
  if(ribbonViewportDragging){
    const deltaPos = getRibbonViewportDragDeltaPos(e.clientX - ribbonViewportDragStartX);
    centerYear = timelinePosToYear(ribbonViewportDragStartPos + deltaPos);
    clampCenter();
    layout();
    return;
  }
  if(!ribbonDragging) return;
  ribbonJumpTo(e);
});
window.addEventListener('mouseup', ()=>{
  ribbonDragging = false;
  ribbonViewportDragging = false;
  ribbonViewport.classList.remove('dragging');
  hideRibbonHoverYear();
  setLinkedHover(null);
});
function ribbonJumpTo(e){
  centerYear = ribbonXToYear(e.clientX);
  clampCenter();
  layout();
}

// Zoom buttons
zoomBtns.forEach(b=>{
  b.addEventListener('click', ()=>{
    const lvl = parseInt(b.dataset.lvl);
    const route=window.parent.KirunaRoutes?.parse(new URL(window.parent.location.href));
    window.parent.KirunaRoutes?.update('timeline2',{source:'inside',view:['overview','year','calendar'][lvl],year:route?.year===null?null:Math.round(centerYear),event:null});
    // Smooth tween to target zoom level
    animateTo(centerYear, LEVELS[lvl].ypv, 500);
    hideHint();
  });
});
