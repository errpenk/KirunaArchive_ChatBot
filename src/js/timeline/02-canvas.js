/* ──────── BUILD DOM ──────── */
function buildCanvas(){
  canvas.innerHTML = '';

  EVS.forEach((ev, i) => {
    const above = i % 2 === 0;

    const txtCol = document.createElement('div');
    txtCol.className = `txt-col ${above ? 'above' : 'below'}`;
    txtCol.dataset.id = ev.id;
    txtCol.dataset.index = i;
    txtCol.dataset.year = evFractionalYear(ev);
    txtCol.dataset.lane = String(Math.floor(i / 2) % 3);
    txtCol.innerHTML = `
      <div class="tl-guide"></div>
      <div class="txt-connector"></div>
      <div class="txt-dot${ev.featured ? ' featured' : ''}" style="background:${ev.featured ? CC[ev.cat] : 'var(--w)'};border-color:${CC[ev.cat]}"></div>
      <div class="txt-label">
        <div class="txt-yr" style="color:${CC[ev.cat]}">${ev.year}</div>
        <div class="txt-title">${ev.title}</div>
        <div class="txt-cat">${CL[ev.cat]}</div>
      </div>
    `;
    bindTimelineInteractiveTargets(txtCol, [
      txtCol.querySelector('.txt-dot'),
      txtCol.querySelector('.txt-label')
    ], ev);
    canvas.appendChild(txtCol);

    const dtlCol = document.createElement('div');
    dtlCol.className = `dtl-col ${above ? 'above' : 'below'}`;
    dtlCol.dataset.id = ev.id;
    dtlCol.dataset.index = i;
    dtlCol.dataset.year = evFractionalYear(ev);
    dtlCol.innerHTML = `
      <div class="tl-guide"></div>
      <div class="dtl-connector"></div>
      <div class="dtl-dot${ev.featured ? ' featured' : ''}" style="background:${CC[ev.cat]}"></div>
      <div class="dtl-card">
        <div class="dtl-card-img" style="${archiveImageBackground('inside', ev.id)}"></div>
        <div class="dtl-card-body">
          <div class="dtl-card-yr">${ev.year} · ${CL[ev.cat]}</div>
          <div class="dtl-card-title">${ev.title}</div>
        <div class="dtl-card-cat">${CL[ev.cat]}</div>
        </div>
      </div>
    `;
    bindTimelineInteractiveTargets(dtlCol, [
      dtlCol.querySelector('.dtl-dot'),
      dtlCol.querySelector('.dtl-card')
    ], ev);
    canvas.appendChild(dtlCol);
  });
}

/* ──────── POSITION + MODE ──────── */
function getMode(){
  if(ypv > 3) return 'overview';
  return 'calendar';
}

function getModeIndex(mode = getMode()){
  if(mode === 'overview') return 0;
  return 2;
}

function seqToYear(seq){
  const lastIdx = EVS.length - 1;
  if(seq >= lastIdx && EVS.length > 0){
    const lastYear = evFractionalYear(EVS[lastIdx]);
    if(seq === lastIdx) return lastYear;
    // Linear extension beyond last event
    const extraSeq = seq - lastIdx;
    return lastYear + extraSeq * TIMELINE_MAX_EVENT_GAP;
  }
  const lo = Math.max(0, Math.min(lastIdx, Math.floor(seq)));
  const hi = Math.max(0, Math.min(lastIdx, Math.ceil(seq)));
  if(lo === hi) return evFractionalYear(EVS[lo]);
  const t = seq - lo;
  const y1 = evFractionalYear(EVS[lo]);
  const y2 = evFractionalYear(EVS[hi]);
  return y1 + (y2 - y1) * t;
}

function yearToSeq(year){
  if(!EVS.length) return 0;
  const firstYear = evFractionalYear(EVS[0]);
  const lastYear = evFractionalYear(EVS[EVS.length - 1]);
  if(year <= firstYear) return 0;
  if(year >= lastYear){
    // Extend linearly beyond last event toward YR_MAX
    const lastSeq = EVS.length - 1;
    if(lastYear >= YR_MAX) return lastSeq;
    const extraFrac = (year - lastYear) / Math.max(YR_MAX - lastYear, 1);
    // Use TIMELINE_MAX_EVENT_GAP as the unit to extend
    return lastSeq + extraFrac * ((YR_MAX - lastYear) / TIMELINE_MAX_EVENT_GAP);
  }

  for(let i = 0; i < EVS.length - 1; i++){
    const y1 = evFractionalYear(EVS[i]);
    const y2 = evFractionalYear(EVS[i + 1]);
    if(year <= y2){
      const span = Math.max(y2 - y1, 0.0001);
      const t = Math.max(0, Math.min(1, (year - y1) / span));
      return i + t;
    }
  }

  return EVS.length - 1;
}

function clampCenter(){
  const axisSpan = getTimelineAxisSpan();
  if(!EVS.length){
    centerYear = (YR_MIN + YR_MAX) / 2;
    centerSeq = 0;
    return;
  }

  if(ypv >= axisSpan){
    centerSeq = timelinePosToSeq(axisSpan / 2);
    centerYear = seqToYear(centerSeq);
    return;
  }

  // Work entirely in timeline-position space to avoid year<->pos round-trip
  // distortion. halfSpan = how many pos-units are visible on each side of center.
  const halfSpan = ypv / 2;

  // Left: first event is at pos=0, so center must be >= halfSpan
  const minPos = halfSpan;
  // Right: right viewport edge must not exceed axisSpan (=2035 boundary),
  // so center <= axisSpan - halfSpan.  This is the ONLY place that sets
  // the right limit — no special-casing by mode or last-event position.
  const maxPos = Math.max(axisSpan - halfSpan, minPos);

  const rawPos = yearToTimelinePos(centerYear);
  const clampedPos = Math.max(minPos, Math.min(maxPos, rawPos));
  centerSeq = timelinePosToSeq(clampedPos);
  centerYear = seqToYear(centerSeq);
}

function clamp01(value){
  return Math.max(0, Math.min(1, value));
}

function getWheelGestureAxis(deltaX, deltaY){
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if(absX < WHEEL_GESTURE_MIN_DELTA && absY < WHEEL_GESTURE_MIN_DELTA) return 'none';
  if(absY >= absX * WHEEL_GESTURE_DIRECTION_RATIO) return 'vertical';
  if(absX >= absY * WHEEL_GESTURE_DIRECTION_RATIO) return 'horizontal';
  return absY >= absX ? 'vertical' : 'horizontal';
}

let wheelGestureAxis = 'none';
let wheelGestureLastAt = 0;
let wheelGestureAccumX = 0;
let wheelGestureAccumY = 0;
let wheelGestureModeSwitchConsumed = false;

function resetWheelGestureLock(){
  wheelGestureAxis = 'none';
  wheelGestureLastAt = 0;
  wheelGestureAccumX = 0;
  wheelGestureAccumY = 0;
  wheelGestureModeSwitchConsumed = false;
}

function getLockedWheelGestureAxis(deltaX, deltaY){
  const now = performance.now();
  if(now - wheelGestureLastAt > WHEEL_GESTURE_IDLE_MS){
    wheelGestureAxis = 'none';
    wheelGestureAccumX = 0;
    wheelGestureAccumY = 0;
    wheelGestureModeSwitchConsumed = false;
  }
  wheelGestureLastAt = now;
  wheelGestureAccumX += deltaX;
  wheelGestureAccumY += deltaY;
  if(wheelGestureAxis !== 'none') return wheelGestureAxis;
  wheelGestureAxis = getWheelGestureAxis(wheelGestureAccumX, wheelGestureAccumY);
  return wheelGestureAxis;
}

function getWheelAxisDelta(axis, deltaX, deltaY){
  if(axis === 'horizontal'){
    return Math.abs(deltaX) > 0.01 ? deltaX : deltaY;
  }
  return Math.abs(deltaY) > 0.01 ? deltaY : deltaX;
}

function getStageDragTravelSpan(mode = getMode()){
  if(mode === 'year'){
    return getTimelineAxisSpan() * YEAR_STAGE_FREE_DRAG_MULTIPLIER;
  }
  return ypv;
}

function getRibbonViewportDragDeltaPos(deltaX, mode = getMode()){
  const rect = ribbonTrack.getBoundingClientRect();
  const innerWidth = Math.max(1, rect.width - RIBBON_EDGE_PAD * 2);
  const dragMultiplier = mode === 'year' ? YEAR_RIBBON_FREE_DRAG_MULTIPLIER : 1;
  return (deltaX / innerWidth) * getTimelineAxisSpan() * RIBBON_DRAG_RESISTANCE * dragMultiplier;
}

function lerp(a, b, t){
  return a + (b - a) * t;
}

function isEntryWithinViewport(x, halfWidth, bleed = 12){
  return x >= -halfWidth - bleed && x <= stageW + halfWidth + bleed;
}

function assignVisibleLanes(entries, maxLanes, minGap){
  const laneEnds = new Array(maxLanes).fill(-Infinity);
  const sorted = [...entries].sort((a,b) => a.x - b.x || a.index - b.index);

  sorted.forEach(entry => {
    entry.lane = -1;
    for(let lane = 0; lane < laneEnds.length; lane++){
      if(entry.x - laneEnds[lane] >= minGap){
        entry.lane = lane;
        laneEnds[lane] = entry.x;
        return;
      }
    }

    const relaxedLane = laneEnds.findIndex(lastX => entry.x - lastX >= minGap * 0.72);
    if(relaxedLane !== -1){
      entry.lane = relaxedLane;
      laneEnds[relaxedLane] = entry.x;
      return;
    }

    let fallbackLane = 0;
    let bestDistance = -Infinity;
    laneEnds.forEach((lastX, lane) => {
      const distance = entry.x - lastX;
      if(distance > bestDistance){
        bestDistance = distance;
        fallbackLane = lane;
      }
    });
    entry.lane = fallbackLane;
    laneEnds[fallbackLane] = entry.x;
  });
}

function dedupeGuideLines(entries, minGap){
  let lastVisibleX = -Infinity;
  [...entries]
    .sort((a,b) => a.x - b.x || a.index - b.index)
    .forEach(entry => {
      entry.showGuide = entry.x - lastVisibleX >= minGap;
      if(entry.showGuide) lastVisibleX = entry.x;
    });
}

function animatePanByYears(deltaYears, duration = 180){
  // deltaYears is really "delta in pos units" (ypv-scaled steps).
  // Compute the target pos directly, then convert to year just for animateTo's API.
  const targetPos = seqToTimelinePos(centerSeq) + deltaYears;
  // Clamp targetPos to axis bounds before converting, so animateTo doesn't
  // overshoot and get clamped back (which would kill the animation progress).
  const axisSpan = getTimelineAxisSpan();
  const halfSpan = ypv / 2;
  const safePos = Math.max(halfSpan, Math.min(axisSpan - halfSpan, targetPos));
  animateTo(timelinePosToYear(safePos), ypv, duration);
}

function getTimelineViewportEntries(mode = getMode(), bleed = 0){
  if(mode === 'calendar') return [];

  if(mode === 'year'){
    const cardHalf = 86;
    const yearBleed = 18 + bleed;
    return EVS
      .map((ev, index) => ({
        ev,
        index,
        pos: seqToTimelinePos(index),
        x: yearToX(evFractionalYear(ev))
      }))
      .filter(entry => isEntryWithinViewport(entry.x, cardHalf, yearBleed))
      .sort((a,b) => a.index - b.index);
  }

  const {startPos, endPos} = getCurrentTimelineViewPosRange();
  const entries = [];

  EVS.forEach((ev, index) => {
    const eventPos = seqToTimelinePos(index);
    if(eventPos >= startPos - bleed && eventPos <= endPos + bleed){
      entries.push({ev, index, pos: eventPos});
    }
  });

  return entries;
}

function getTimelineViewportRange(mode = getMode(), bleed = 0){
  const entries = getTimelineViewportEntries(mode, bleed);
  if(!entries.length) return null;

  return {
    startYear: entries[0].ev.year,
    endYear: entries[entries.length - 1].ev.year,
    startValue: evFractionalYear(entries[0].ev),
    endValue: evFractionalYear(entries[entries.length - 1].ev),
    entries: entries.map(entry => entry.ev)
  };
}

function getDisplayedTimelineRange(){
  const mode = getMode();
  if(mode === 'calendar') return null;

  if(mode === 'year'){
    return getTimelineViewportRange(mode, Math.max(0.01, YEAR_EDGE_DRAG_BLEED * 0.08));
  }

  const selector = mode === 'overview' ? '.txt-col.show' : '.dtl-col.show';
  const entries = Array.from(canvas.querySelectorAll(selector))
    .map(node => EV_BY_ID.get(Number(node.dataset.id)))
    .filter(Boolean)
    .sort((a,b) => evFractionalYear(a) - evFractionalYear(b) || a.id - b.id);

  if(!entries.length) return null;

  return {
    startYear: entries[0].year,
    endYear: entries[entries.length - 1].year,
    startValue: evFractionalYear(entries[0]),
    endValue: evFractionalYear(entries[entries.length - 1]),
    entries
  };
}

function updateRibbonLabels(rangeStart, rangeEnd, leftPct, rightPct){
  ribbonTrack.querySelectorAll('.ribbon-yr').forEach(node => node.remove());

  const startYear = Math.max(YR_MIN, Math.floor(rangeStart));
  const endYear = Math.min(YR_MAX, Math.ceil(rangeEnd));
  const startLabel = document.createElement('div');
  startLabel.className = 'ribbon-yr start';
  startLabel.style.left = `${leftPct}%`;
  startLabel.textContent = startYear;
  ribbonTrack.appendChild(startLabel);

  if(endYear !== startYear){
    const endLabel = document.createElement('div');
    endLabel.className = 'ribbon-yr end';
    endLabel.style.left = `${rightPct}%`;
    endLabel.textContent = endYear;
    ribbonTrack.appendChild(endLabel);
  }

  if(ribbonLabelEl){
    ribbonLabelEl.textContent = `${startYear} — ${endYear}`;
  }
}
