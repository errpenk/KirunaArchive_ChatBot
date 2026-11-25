
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function formatDateLabelFromParts(year, month, day, precision){
  if(precision === 'day') return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  if(precision === 'month') return `${MONTH_NAMES[month - 1]} ${year}`;
  return `${year}`;
}

function normalizeEvent(ev){
  const month = Number(ev.month || 1);
  const day = Number(ev.day || 1);
  const datePrecision = ev.datePrecision || (ev.month && ev.day ? 'day' : ev.month ? 'month' : 'year');
  return {
    ...ev,
    month,
    day,
    emoji:'',
    datePrecision,
    dateLabel: ev.dateLabel || formatDateLabelFromParts(ev.year, month, day, datePrecision),
  };
}

function archiveImageUrl(source, id){
  return 'images/' + source + '/' + source + '-' + String(id).padStart(3,'0') + '.jpg';
}
function archiveImageBackground(source, id){
  const url = archiveImageUrl(source, id);
  return 'background-image:url(' + url + '),linear-gradient(90deg,var(--g5) 0%,var(--g4) 45%,var(--g5) 100%);background-size:cover,cover;background-position:center,center;animation:none;';
}

const EVS = window.KirunaArchiveData.EVENTS.map(normalizeEvent);

EVS.sort((a,b) => a.year - b.year || a.month - b.month || a.day - b.day || a.id - b.id);
const EV_BY_ID = new Map(EVS.map(ev => [ev.id, ev]));

/* ══════════════════════════════════════════════════════════════
   ZOOM MODEL

   Years of timeline: 1900 → 2035 = 135 years.

   We still keep a zoom scalar (YPV) to drive the three view modes.
   - Level 0 Overview:  YPV = 90
   - Level 1 Year:      YPV = 12
   - Level 2 Calendar:  YPV = 1

   We interpolate continuously. Mode changes based on YPV:
   - YPV > 3   → overview
   - ≤ 3       → calendar overlay
═══════════════════════════════════════════════════════════════ */
const YR_MIN = 1900, YR_MAX = 2035;
const LEVELS = [
  {name:'Overview', ypv:72, idx:0},
  {name:'Year',     ypv:12, idx:1},
  {name:'Calendar', ypv:1,  idx:2},
];
const MODE_SWITCH_LEVELS = [0, 2];
const DRAG_RESISTANCE = 0.94;
const RIBBON_DRAG_RESISTANCE = 1;
const YEAR_STAGE_FREE_DRAG_MULTIPLIER = 2.05;
const YEAR_RIBBON_FREE_DRAG_MULTIPLIER = 2;
const RIBBON_EDGE_PAD = 18;
const TIMELINE_MIN_EVENT_GAP = 3.15;
const TIMELINE_MAX_EVENT_GAP = 9.2;
const DEFAULT_OVERVIEW_CENTER = YR_MIN;
const OVERVIEW_LABEL_BASE_OFFSET = 44;
const OVERVIEW_LABEL_LANE_STEP = 72;
const OVERVIEW_LABEL_MAX_LANES = 3;
const OVERVIEW_LABEL_MIN_GAP = 118;
const TIMELINE_GUIDE_MIN_GAP = 8;
const MODE_SCROLL_STEP_THRESHOLD = 14;
const TIMELINE_WHEEL_PAN_MULTIPLIER = 0.96;
const RIBBON_VISIBLE_DOT_MIN_GAP = 18;
const RIBBON_HOVER_SNAP_PX = 22;
const RIBBON_WHEEL_PAN_MULTIPLIER = 0.22;
const MODE_SCROLL_GESTURE_RESET_MS = 680;
const MODE_SCROLL_TRIGGER_COOLDOWN_MS = 680;
const TOUCH_MODE_SWIPE_THRESHOLD = 28;
const TOUCH_PAN_START_THRESHOLD = 14;
const TOUCH_GESTURE_DIRECTION_RATIO = 1.15;
const WHEEL_GESTURE_DIRECTION_RATIO = 1.18;
const WHEEL_GESTURE_MIN_DELTA = 1.2;
const WHEEL_GESTURE_IDLE_MS = 160;
const MODE_SCROLL_DIRECT_TRIGGER = 10;
const YEAR_EDGE_DRAG_BLEED = 1;
const TIMELINE_DRAG_CLICK_SUPPRESS_DISTANCE = 8;

function getInitialViewState(){
  const searchParams = new URLSearchParams(window.location.search);
  const hashRaw = window.location.hash.replace(/^#/, '');
  const hashParams = new URLSearchParams(hashRaw.includes('=') ? hashRaw : '');
  const hashView = hashRaw && !hashRaw.includes('=') ? hashRaw : '';
  const rawView = (searchParams.get('view') || hashParams.get('view') || hashView || '').trim().toLowerCase();
  const rawYear = searchParams.get('year') || hashParams.get('year');
  let level = null;
  if(rawView === 'calendar' || rawView === 'cal') level = 2;
  else if(rawView === 'year' || rawView === 'timeline' || rawView === 'overview') level = 0;
  const parsedYear = rawYear === null ? NaN : Number(rawYear);
  const year = Number.isFinite(parsedYear)
    ? Math.max(YR_MIN, Math.min(YR_MAX, Math.round(parsedYear)))
    : null;
  return {level, year};
}

const initialViewState = getInitialViewState();

let ypv = LEVELS[0].ypv;               // current years-per-viewport
let centerYear = DEFAULT_OVERVIEW_CENTER;  // start on the earliest overview window
let stageW = 0;
let centerSeq = 0;
let timelineAxisPositions = [];
let timelineAxisSpan = 0;
let railWidth = 0;
let ribbonBasePxById = new Map();
let ribbonBasePctById = new Map();
let ribbonBaseLayoutWidth = 0;

const stage = document.getElementById('stage');
const shell = document.getElementById('shell');
const canvas = document.getElementById('canvas');
const centerLine = document.getElementById('center-line');
const calOverlay = document.getElementById('cal-overlay');
const cpdaysEl  = document.getElementById('cpdays');
const cphTitle  = document.getElementById('cph-title');
const cpeYr     = document.getElementById('cpe-yr');
const cpeCount  = document.getElementById('cpe-count');
const cpeList   = document.getElementById('cpe-list');
const cpnavPrev = document.getElementById('cpnav-prev');
const cpnavNext = document.getElementById('cpnav-next');
const ribbonTrack = document.getElementById('ribbon-track');
const ribbonViewport = document.getElementById('ribbon-viewport');
const ribbonLabelEl = document.getElementById('ribbon-label');
const ribbonHoverYearEl = document.getElementById('ribbon-hover-year');
const cpePanel = document.querySelector('.cpevs-panel');
const cpeFullscreenBtn = document.getElementById('cpe-fullscreen-btn');
const viewRangeEl = document.getElementById('view-range');
const viewCountEl = document.getElementById('view-count');
const zoomBtns = document.querySelectorAll('.zoom-btn');
const hint = document.getElementById('stage-hint');

function updateCpeScrollIndicator(){
  if(!cpeList || !cpePanel) return;
  const maxScroll = Math.max(0, cpeList.scrollHeight - cpeList.clientHeight);
  const visible = maxScroll > 1;
  const panelRect = cpePanel.getBoundingClientRect();
  const listRect = cpeList.getBoundingClientRect();
  const top = Math.max(0, Math.round(listRect.top - panelRect.top));
  const trackH = Math.max(0, Math.round(cpeList.clientHeight));
  const thumbH = visible ? Math.max(32, Math.round((cpeList.clientHeight / Math.max(cpeList.scrollHeight, 1)) * trackH)) : 0;
  const thumbY = visible ? Math.round((cpeList.scrollTop / maxScroll) * Math.max(0, trackH - thumbH)) : 0;
  cpePanel.style.setProperty('--cpe-scroll-visible', visible ? '1' : '0');
  cpePanel.style.setProperty('--cpe-scroll-top', top + 'px');
  cpePanel.style.setProperty('--cpe-scroll-track-h', trackH + 'px');
  cpePanel.style.setProperty('--cpe-scroll-thumb-h', thumbH + 'px');
  cpePanel.style.setProperty('--cpe-scroll-thumb-y', thumbY + 'px');
}

function isCpeFullscreenLayoutEligible(){
  if(!cpePanel) return false;
  if(cpePanel.classList.contains('cpe-fullscreen')) return true;
  if(document.documentElement.classList.contains('embedded-phone')
    || document.documentElement.classList.contains('phone-app')) return true;
  const grid = document.querySelector('.cpgrid-panel');
  if(!grid) return false;
  const panelRect = cpePanel.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  if(panelRect.width <= 0 || panelRect.height <= 0 || gridRect.width <= 0 || gridRect.height <= 0) return false;
  const stackedBelowGrid = panelRect.top >= gridRect.bottom - 8;
  const wideEnoughPanel = panelRect.width >= Math.min(420, window.innerWidth * 0.52);
  return stackedBelowGrid && wideEnoughPanel;
}

function updateCpeFullscreenAvailability(){
  if(!cpePanel || !cpeFullscreenBtn) return false;
  const available = isCpeFullscreenLayoutEligible();
  cpePanel.classList.toggle('cpe-fullscreen-capable', available);
  cpeFullscreenBtn.hidden = !available;
  cpeFullscreenBtn.disabled = !available;
  cpeFullscreenBtn.setAttribute('aria-hidden', available ? 'false' : 'true');
  cpeFullscreenBtn.tabIndex = available ? 0 : -1;
  if(available) cpeFullscreenBtn.style.removeProperty('display');
  else cpeFullscreenBtn.style.setProperty('display', 'none', 'important');
  return available;
}

function clearCpeFullscreenAnimationState(){
  if(!cpePanel) return;
  cpePanel.style.removeProperty('opacity');
  cpePanel.style.removeProperty('transform');
  cpePanel.style.removeProperty('filter');
  cpePanel.style.removeProperty('transition');
  cpePanel.style.removeProperty('transform-origin');
  cpePanel.style.removeProperty('will-change');
  cpePanel.style.removeProperty('visibility');
}

function setCpeFullscreenButtonHitArea(expanded){
  if(!cpeFullscreenBtn) return;
  const props = ['width','height','flex-basis','margin-top','margin-right','font-size','overflow'];
  props.forEach(prop => cpeFullscreenBtn.style.removeProperty(prop));
  if(!expanded) return;
  cpeFullscreenBtn.style.setProperty('width', '36px', 'important');
  cpeFullscreenBtn.style.setProperty('height', '36px', 'important');
  cpeFullscreenBtn.style.setProperty('flex-basis', '36px', 'important');
  cpeFullscreenBtn.style.setProperty('margin-top', '-2px', 'important');
  cpeFullscreenBtn.style.setProperty('margin-right', '0', 'important');
  cpeFullscreenBtn.style.setProperty('font-size', '18px', 'important');
  cpeFullscreenBtn.style.setProperty('overflow', 'visible', 'important');
}

function setCpeFullscreen(open){
  if(!cpePanel) return;
  const next = !!open;
  const isOpen = cpePanel.classList.contains('cpe-fullscreen');
  if(next === isOpen && !cpePanel.classList.contains('cpe-fullscreen-closing')) return;
  if(next && !updateCpeFullscreenAvailability()) return;
  clearTimeout(cpePanel._cpeFullscreenTimer);
  cpePanel._cpeFullscreenAnim?.cancel?.();
  cpeFullscreenBtn?.setAttribute('aria-label', next ? 'Close all events fullscreen' : 'Open all events fullscreen');
  cpeFullscreenBtn?.setAttribute('title', next ? 'Close fullscreen events' : 'Fullscreen events');

  if(next){
    document.documentElement.classList.add('cpe-fullscreen-open');
    cpePanel.classList.remove('cpe-fullscreen-closing');
    cpePanel.classList.add('cpe-fullscreen');
    cpePanel.classList.remove('cpe-fullscreen-visible');
    setCpeFullscreenButtonHitArea(true);
    clearCpeFullscreenAnimationState();
    void cpePanel.offsetHeight;
    cpePanel.style.setProperty('will-change', 'transform, opacity', 'important');
    cpePanel.style.setProperty('transition', 'none', 'important');
    cpePanel.style.setProperty('transform', 'translateY(14px) scale(.992)', 'important');
    cpePanel.style.setProperty('opacity', '0', 'important');
    void cpePanel.offsetHeight;
    requestAnimationFrame(() => {
      cpePanel.classList.add('cpe-fullscreen-visible');
      cpePanel.style.setProperty('transition', 'transform .52s cubic-bezier(.22,1,.36,1), opacity .44s cubic-bezier(.22,1,.36,1)', 'important');
      cpePanel.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
      cpePanel.style.setProperty('opacity', '1', 'important');
      cpePanel._cpeFullscreenTimer = setTimeout(() => {
        clearCpeFullscreenAnimationState();
        updateCpeScrollIndicator();
      }, 560);
    });
    updateCpeScrollIndicator();
    return;
  }

  cpePanel.classList.remove('cpe-fullscreen-visible');
  cpePanel.classList.add('cpe-fullscreen-closing');
  clearCpeFullscreenAnimationState();
  cpePanel.style.setProperty('will-change', 'transform, opacity', 'important');
  cpePanel.style.setProperty('transition', 'none', 'important');
  cpePanel.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
  cpePanel.style.setProperty('opacity', '1', 'important');
  void cpePanel.offsetHeight;
  requestAnimationFrame(() => {
    cpePanel.style.setProperty('transition', 'transform .42s cubic-bezier(.4,0,.2,1), opacity .36s cubic-bezier(.4,0,.2,1)', 'important');
    cpePanel.style.setProperty('transform', 'translateY(12px) scale(.994)', 'important');
    cpePanel.style.setProperty('opacity', '0', 'important');
    cpePanel._cpeFullscreenTimer = setTimeout(() => {
      cpePanel.classList.remove('cpe-fullscreen', 'cpe-fullscreen-closing');
      document.documentElement.classList.remove('cpe-fullscreen-open');
      setCpeFullscreenButtonHitArea(false);
      clearCpeFullscreenAnimationState();
      updateCpeFullscreenAvailability();
      updateCpeScrollIndicator();
    }, 440);
  });
}

cpeFullscreenBtn?.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  setCpeFullscreen(!cpePanel?.classList.contains('cpe-fullscreen'));
});

document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && cpePanel?.classList.contains('cpe-fullscreen')){
    setCpeFullscreen(false);
  }
});

window.addEventListener('resize', () => {
  requestAnimationFrame(() => {
    if(!cpePanel?.classList.contains('cpe-fullscreen')) updateCpeFullscreenAvailability();
    updateCpeScrollIndicator();
  });
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if(!cpePanel?.classList.contains('cpe-fullscreen')) updateCpeFullscreenAvailability();
    updateCpeScrollIndicator();
  }, 180);
});

function isCpeFullscreenOpen(){
  return !!cpePanel?.classList.contains('cpe-fullscreen');
}

['click','pointerdown','pointerup','touchstart','touchmove','touchend','wheel'].forEach(type => {
  document.addEventListener(type, e => {
    if(!isCpeFullscreenOpen()) return;
    const insidePanel = cpePanel.contains(e.target);
    if(insidePanel && (e.target.closest('.cpe-list') || e.target.closest('.cpe-fullscreen-btn') || e.target.closest('.cpe-ev'))) return;
    if(e.target.closest('#popover, .pop-card, #pop-close, .pop-close')) return;
    if(e.target.closest('#hdr, .hdr-center, .zoom-tabs, .map-tabs, .zoom-btn, .map-tab')) return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }, {capture:true, passive:false});
});

function getOutsideHudState(){
  try{
    const outsideFrame = document.getElementById('outside-frame');
    if(!outsideFrame) return null;
    return outsideFrame.contentWindow?.getOutsideHudState?.() || null;
  }catch(e){
    return null;
  }
}

function measure(){
  const stageRect = stage.getBoundingClientRect();
  stageW = stageRect.width;
  const ribbonRect = ribbonTrack.getBoundingClientRect();
  if(ribbonRect.width > 0){
    railWidth = ribbonRect.width;
  } else {
    railWidth = stageW;
  }
}

function getStageEdgePad(){
  const mode = getMode();
  if(mode === 'year') return Math.max(78, Math.min(136, stageW * 0.16));
  if(mode === 'overview') return Math.max(54, Math.min(112, stageW * 0.14));
  return Math.max(36, Math.min(72, stageW * 0.1));
}

/* Map a (fractional) year → x pixel inside canvas */
function yearToX(yr){
  const edgePad = getStageEdgePad();
  const usableWidth = Math.max(stageW - edgePad * 2, 1);
  const centerPos = seqToTimelinePos(centerSeq);
  const pos = yearToTimelinePos(yr);
  const startPos = centerPos - ypv / 2;
  return edgePad + ((pos - startPos) / Math.max(ypv, 0.0001)) * usableWidth;
}

function xToYear(clientX){
  const stageRect = stage.getBoundingClientRect();
  const edgePad = getStageEdgePad();
  const usableWidth = Math.max(stageW - edgePad * 2, 1);
  const localX = Math.max(edgePad, Math.min(stageW - edgePad, clientX - stageRect.left));
  const startPos = seqToTimelinePos(centerSeq) - ypv / 2;
  const pos = startPos + ((localX - edgePad) / usableWidth) * ypv;
  return timelinePosToYear(pos);
}

function getRibbonOrderedEvents(){
  return [...EVS].sort((a,b) => evFractionalYear(a) - evFractionalYear(b) || a.id - b.id);
}

function ribbonPxForYear(year, width = railWidth){
  const safeWidth = Math.max(width, 1);
  const innerWidth = Math.max(1, safeWidth - RIBBON_EDGE_PAD * 2);
  const axisSpan = Math.max(getTimelineAxisSpan(), 1);
  const clampedPos = Math.max(0, Math.min(axisSpan, yearToTimelinePos(year)));
  return RIBBON_EDGE_PAD + (clampedPos / axisSpan) * innerWidth;
}

function ensureRibbonBaseLayout(){
  const width = Math.max(railWidth, 1);
  if(ribbonBaseLayoutWidth === width && ribbonBasePctById.size === EVS.length) return;

  ribbonBaseLayoutWidth = width;
  ribbonBasePxById = new Map();
  ribbonBasePctById = new Map();

  const ordered = getRibbonOrderedEvents();

  ordered.forEach(ev => {
    const px = ribbonPxForYear(evFractionalYear(ev), width);
    ribbonBasePxById.set(ev.id, px);
    ribbonBasePctById.set(ev.id, (px / width) * 100);
  });
}

function ribbonPxForId(id){
  ensureRibbonBaseLayout();
  return ribbonBasePxById.get(id) ?? railWidth / 2;
}

function ribbonPctForId(id){
  ensureRibbonBaseLayout();
  return ribbonBasePctById.get(id) ?? 50;
}

function ribbonXToYear(clientX){
  const rect = ribbonTrack.getBoundingClientRect();
  const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const innerWidth = Math.max(1, rect.width - RIBBON_EDGE_PAD * 2);
  const t = clamp01((localX - RIBBON_EDGE_PAD) / innerWidth);
  return timelinePosToYear(t * getTimelineAxisSpan());
}

/* Timeline hit-testing stays anchored to the visible year label. */
function evFractionalYear(ev){
  return ev.year;
}

function buildTimelineAxis(){
  timelineAxisPositions = new Array(EVS.length);
  if(!EVS.length){
    timelineAxisSpan = LEVELS[0].ypv;
    return;
  }

  let pos = 0;
  timelineAxisPositions[0] = 0;
  for(let i = 1; i < EVS.length; i++){
    const prev = evFractionalYear(EVS[i - 1]);
    const next = evFractionalYear(EVS[i]);
    const actualGap = Math.max(0.15, next - prev);
    const displayGap = Math.max(TIMELINE_MIN_EVENT_GAP, Math.min(TIMELINE_MAX_EVENT_GAP, actualGap));
    pos += displayGap;
    timelineAxisPositions[i] = pos;
  }

  timelineAxisSpan = Math.max(pos, LEVELS[0].ypv + 6);
}

function getTimelineAxisSpan(){
  // Extend axis to encompass the space from last event to YR_MAX
  if(EVS.length > 0){
    const lastYear = evFractionalYear(EVS[EVS.length - 1]);
    const extraYears = Math.max(0, YR_MAX - lastYear);
    const extraPos = (extraYears / Math.max(TIMELINE_MAX_EVENT_GAP, 1)) * TIMELINE_MAX_EVENT_GAP;
    return Math.max(timelineAxisSpan + extraPos, 1);
  }
  return Math.max(timelineAxisSpan, 1);
}

function seqToTimelinePos(seq){
  if(!timelineAxisPositions.length) return 0;
  const lastIdx = timelineAxisPositions.length - 1;
  if(seq >= lastIdx){
    const extraSeq = seq - lastIdx;
    return timelineAxisPositions[lastIdx] + extraSeq * TIMELINE_MAX_EVENT_GAP;
  }
  const lo = Math.max(0, Math.min(lastIdx, Math.floor(seq)));
  const hi = Math.max(0, Math.min(lastIdx, Math.ceil(seq)));
  if(lo === hi) return timelineAxisPositions[lo];
  const t = seq - lo;
  return lerp(timelineAxisPositions[lo], timelineAxisPositions[hi], t);
}

function timelinePosToSeq(pos){
  if(!timelineAxisPositions.length) return 0;
  const lastIdx = timelineAxisPositions.length - 1;
  const lastPos = timelineAxisPositions[lastIdx];

  if(pos >= lastPos){
    const extraPos = pos - lastPos;
    return lastIdx + extraPos / Math.max(TIMELINE_MAX_EVENT_GAP, 0.0001);
  }

  const clamped = Math.max(0, pos);
  if(clamped <= timelineAxisPositions[0]) return 0;

  for(let i = 0; i < lastIdx; i++){
    const p1 = timelineAxisPositions[i];
    const p2 = timelineAxisPositions[i + 1];
    if(clamped <= p2){
      const span = Math.max(p2 - p1, 0.0001);
      const t = (clamped - p1) / span;
      return i + t;
    }
  }

  return lastIdx;
}

function yearToTimelinePos(year){
  return seqToTimelinePos(yearToSeq(year));
}

function timelinePosToYear(pos){
  return seqToYear(timelinePosToSeq(pos));
}

let lastTimelineActivationId = null;
let lastTimelineActivationAt = 0;
let popoverReturnView = null;

function activateTimelineEvent(ev, e){
  const now = performance.now();
  if(now < suppressTimelineEventClicksUntil) return;
  if(dragging || dragDistance >= TIMELINE_DRAG_CLICK_SUPPRESS_DISTANCE) return;
  if(e && 'pointerId' in e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
  if(lastTimelineActivationId === ev.id && now - lastTimelineActivationAt < 180) return;
  lastTimelineActivationId = ev.id;
  lastTimelineActivationAt = now;
  if(getMode() === 'overview'){
    popoverReturnView = {centerYear, ypv};
    animateTo(evFractionalYear(ev), LEVELS[1].ypv, 500, () => openPopover(ev));
  } else {
    openPopover(ev);
  }
}

function bindTimelineInteractiveTargets(col, targets, ev){
  const activate = e => activateTimelineEvent(ev, e);
  const enter = () => {
    col.classList.add('is-hit-target');
    setLinkedHover(ev.id);
  };
  const leave = e => {
    if(col.contains(e.relatedTarget)) return;
    col.classList.remove('is-hit-target');
    setLinkedHover(null);
  };

  targets.filter(Boolean).forEach(target => {
    target.addEventListener('click', activate);
    target.addEventListener('pointerup', activate);
    target.addEventListener('mouseenter', enter);
    target.addEventListener('mouseleave', leave);
  });
}
