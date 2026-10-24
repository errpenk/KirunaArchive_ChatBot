
/* ══════════════════════════════════════════════════════════════
   DATA — match the "完善版" calendar/timeline events exactly,
   with date precision added only where Temporal Zoom needs it.
═══════════════════════════════════════════════════════════════ */
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

function parseIssuanceDate(raw){
  const value = String(raw || '').trim();
  const match = value.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if(!match) return {year:2000, month:1, day:1, datePrecision:'year'};
  return {
    year:Number(match[1]),
    month:match[2] ? Number(match[2]) : 1,
    day:match[3] ? Number(match[3]) : 1,
    datePrecision:match[3] ? 'day' : match[2] ? 'month' : 'year',
  };
}

function archiveImageUrl(source, id){
  return 'images/' + source + '/' + source + '-' + String(id).padStart(3,'0') + '.jpg';
}
function archiveImageBackground(source, id){
  const url = archiveImageUrl(source, id);
  return 'background-image:url(' + url + '),linear-gradient(90deg,var(--g5) 0%,var(--g4) 45%,var(--g5) 100%);background-size:cover,cover;background-position:center,center;animation:none;';
}

const CORE_EVENTS = [
  {id:1,year:1900,month:5,day:17,era:'industrial',cat:'mine',featured:true,
   title:'LKAB Begins Industrial Mining',loc:'Kiirunavaara Mine, Kiruna',
   desc:"LKAB commences large-scale iron ore extraction at Kiirunavaara. The mine grew into one of the world's largest underground iron ore operations, producing approximately 27 million tonnes of iron ore annually."},
  {id:2,year:1902,month:11,day:15,era:'industrial',cat:'infra',featured:false,
   title:'Malmbanan Railway Completed',loc:'Kiruna Station (Kiruna C)',
   desc:"The Ore Railway (Malmbanan) linking Kiruna to Narvik's ice-free port is completed - 473 km of Arctic engineering built 1899-1902. Still the primary export route for Swedish iron ore today."},
  {id:3,year:1910,month:6,day:3,era:'industrial',cat:'urban',featured:true,
   title:'Garden City Master Plan',loc:'Old Town Centre (Gamla Centrum)',
   desc:"Architect Per Hallman designs Kiruna's urban plan based on Ebenezer Howard's Garden City principles - separating industrial and residential zones with a central square and ordered street grid."},
  {id:4,year:1943,month:9,day:8,era:'industrial',cat:'mine',featured:false,
   title:'Peak Wartime Ore Production',loc:'LKAB Mine - Southern Zone',
   desc:"WWII drives Swedish iron ore exports to historic peaks - Sweden supplied both Allied and Axis powers. Kiruna's workforce surges and the city expands. The postwar boom sustained rapid growth into the 1960s."},
  {id:5,year:1958,month:10,day:22,era:'growth',cat:'urban',featured:true,
   title:'City Hall (Stadshus) Inaugurated',loc:'Town Hall Square (Stadshustorget)',
   desc:"Artur von Schmalensee's iconic Kiruna Stadshus opens. Later voted Sweden's most beautiful public building, its distinctive clock tower and Sami-inspired ornamentation made it a cultural landmark."},
  {id:6,year:1969,month:12,day:9,era:'growth',cat:'mine',featured:false,
   title:'The 1969 Strike',loc:'LKAB, Kiruna',
   desc:'Approximately 4,800 miners at LKAB staged a massive 57-day strike against a harsh rationalization and time-study system (UMS), permanently altering Swedish labor laws.'},
  {id:7,year:1984,month:7,day:4,era:'growth',cat:'infra',featured:false,
   title:'Esrange Space Centre Expansion',loc:'Esrange Space Centre (SSC)',
   desc:"The Swedish Space Corporation's Esrange facility 45 km east of Kiruna undergoes major expansion, supporting rockets, balloons and satellite tracking - Europe's northernmost commercial space hub."},
  {id:8,year:2004,month:4,day:16,era:'relocation',cat:'urban',featured:true,
   title:'City Relocation Decision Adopted',loc:'New Town Centre Site (Nya Centrum)',
   desc:"LKAB's deformation prognosis confirms 60% of Kiruna's city centre will be uninhabitable by 2033. Municipality and LKAB jointly announce the relocation of the entire city centre 3 km northeast."},
  {id:9,year:2012,month:8,day:28,era:'relocation',cat:'social',featured:false,
   title:'Old City Hall Demolished',loc:'Old City Hall site (Gamla Stadshuset)',
   desc:"The 1958 Stadshus - voted Sweden's most beautiful building - is demolished as the deformation zone expands. After public protest, the iconic clock tower is carefully cut free and transported intact to the new city centre, where it stands today."},
  {id:10,year:2018,month:9,day:1,era:'relocation',cat:'urban',featured:true,
   title:'Kristallen City Hall & New Centre Open',loc:'Kristallen City Hall, New Kiruna Centre',
   desc:'Henning Larsen Architects\' Kristallen ("The Crystal") city hall opens, anchoring the new city centre 3 km east. The building\'s aurora-inspired form and Sami motifs mark the most visible milestone in the relocation.'},
  {id:11,year:2023,month:5,day:9,era:'relocation',cat:'env',featured:false,
   title:'Old Town Subsidence Milestone',loc:'Old Town Eastern Subsidence Zone',
   desc:'Monitoring confirms cumulative ground displacement in old city has reached critical thresholds. Several historic buildings show structural cracking. Evacuation timetable shortened to 2029.'},
  {id:12,year:2035,month:12,day:15,era:'relocation',cat:'urban',featured:true,
   title:'New Kiruna: Target Completion',loc:'New Kiruna - Full District (Nya Kiruna)',
   desc:'Target year for full completion of the Kiruna relocation programme. By 2035, LKAB estimates over 6,000 additional residents (beyond those already moved) will have relocated to Nya Kiruna - 3 km northeast across 30+ years.'},
];

const DOCS = [
  {title:'Compilation of responses "So what the people of Kiruna think?" (15)', issuance_date:'2008', type:'Informative Doc.', description:"This document is a compilation of the responses to the survey 'What is your impression of Kiruna?' Citizens identified the Church, Hjalmar Lundbohmsgarden, and the Town Hall as buildings of significant value. The municipality viewed this consultation positively and proposed various engagement opportunities over the years."},
  {title:'Detail plan for Bolagsomradet Gruvstadspark (18)', issuance_date:'2010-10-20', type:'Prescriptive Doc.', description:'First of 8 detailed plans in the old center of Kiruna, transforming residential areas into mining zones for demolition. Covers the town hall, Ullspiran district, and A10 highway. Gained legal validity in 2012.'},
  {title:'Development Plan (41)', issuance_date:'2014-03-17', type:'Design Doc.', description:"The development plan shapes the new city, written in Swedish for Kiruna's citizens. Divided into four parts; the third spanning 80 pages describes the city's new form and relocation strategies through plans, sections, images, and diagrams."},
  {title:'Deformation forecast (45)', issuance_date:'2014-12', type:'Technical Doc.', description:"LKAB's deformation forecast outlining expected ground subsidence areas and intervention timing due to the Kiirunavaara mine expansion at 1,365 m depth."},
  {title:'Construction of Scandic Hotel begins (63)', issuance_date:'2019-04', type:'Material effect', description:'After two extensions of the land acquisition agreement, construction of the Scandic hotel finally began in 2019 in the new city centre.'},
  {title:'Town Hall demolition (64)', issuance_date:'2019-04', type:'Informative Doc.', description:'After the new town hall was completed, the old building "The Igloo" was demolished. The Sami door handles and the clock tower were preserved - the tower relocated to the central square of New Kiruna.'},
  {title:'Construction of Aurora Center begins (65)', issuance_date:'2019-05', type:'Material effect', description:'Work began on the Aurora Center, a multifunctional complex including the municipal library. Connected to the Scandic hotel by a skywalk, mirroring the layout of the old city.'},
  {title:'Construction of Block 1 begins (69)', issuance_date:'2019-06', type:'Material effect', description:'Simultaneously with the Aurora Center, work began on Block 1, a mixed-use building overlooking the main square - the first residential buildings in the new town.'},
  {title:'Detail plan for square and commercial street (50)', issuance_date:'2016-06-22', type:'Prescriptive Doc.', description:'First detailed plan implemented from the new masterplan. Defines 9 dense blocks near the town hall, including 6 buildings facing the main square. Mixed public/private functions with residential use prominent.'},
  {title:'Gruvstadspark 2, etapp 5, Kyrkan (81)', issuance_date:'2021-09-04', type:'Prescriptive Doc.', description:'Last detailed plan of the second planning phase, concerning the area around the Kiruna Church. Six buildings, half serving religious functions. Specifies the church will be dismantled 2025-2026 and reassembled by 2029.'},
  {title:'Demolition documentation, Kiruna City Hall (76)', issuance_date:'2020-11-26', type:'Informative Doc.', description:"162-page study by the Norrbotten Museum analyzing the city hall's materials before demolition in April 2019 - preserving knowledge of every structural detail."},
  {title:'Deformation forecast (62)', issuance_date:'2019-04', type:'Technical Doc.', description:'Third deformation forecast published in 2019, five years after the second. The deformation line remains unchanged; what varies are intervention timing and the shape of affected zones.'},
  {title:'Detailed plan for Gruvstadspark 2, etapp 3 (58)', issuance_date:'2018-10', type:'Prescriptive Doc.', description:'Third Detailed Plan of the second demolition phase, covering a narrow elongated area straddling the old railway. Sole designated land use is mining, temporarily used as a park during an interim phase.'},
  {title:'Vision 2099 (4)', issuance_date:'2004', type:'Design Doc.', description:"The first project document for the new city of Kiruna, created in response to LKAB's letter. Despite being presented anonymously, its principles proved fundamental in all subsequent planning documents."},
  {title:'Adjusted development plan (47)', issuance_date:'2015', type:'Design Doc.', description:"Update of the Development Plan one year after its creation. The central square takes its final shape; the large school complex north of it appears for the first time. Still the version in use today after 10 years."},
  {title:'Detailed Overview Plan for the Central Area of Kiruna 2014 (44)', issuance_date:'2014-06', type:'Prescriptive Doc.', description:'Intermediate-scale planning instrument for central Kiruna. Incorporates all Development Plan projections into a prescriptive tool. Compliance is not mandatory but supports Detailed Plans.'},
  {title:'Detailed plan for LINBANAN 1 (42)', issuance_date:'2014-03', type:'Prescriptive Doc.', description:'First Detailed Plan for the new city center. Covers the land for a single building: Kristallen, the new Town Hall and the first building constructed in New Kiruna.'},
  {title:'Mail to Kiruna kommun (2)', issuance_date:'2004-03-19', type:'Prescriptive Doc.', description:"The act that initiates the relocation of Kiruna. LKAB communicates its intention to construct a new mining level at 1,365 m depth and urges the municipality to begin planning the city's relocation."},
  {title:'Construction of new city hall begins (48)', issuance_date:'2015', type:'Material effect', description:'Kiruna Town Hall was the first building rebuilt in the new town center in 2015. It remained isolated for some time due to a slowdown in mining activities.'},
  {title:'Detail plan for square and commercial street (49)', issuance_date:'2016-06-22', type:'Prescriptive Doc.', description:'Approved July 2016, this is the first detailed plan implemented from the new masterplan. Defines the area near the town hall with 9 blocks, 6 facing the main square.'},
  {title:'Detail plan for Bolagsomradet Gruvstad-spark (18b)', issuance_date:'2010-10-20', type:'Prescriptive Doc.', description:'One of 8 detailed plans in old Kiruna center transforming residential areas into mining zones for demolition. Gained legal validity in 2012.'},
  {title:'Kiruna Church closes (102)', issuance_date:'2024-06-02', type:'Material effect', description:"On June 2, the Kiruna Church closed for relocation preparations following a solemn ceremony. Relocation scheduled for summer 2025, taking two days. Voted 'Sweden's most beautiful building constructed before 1950.'"},
];

function typeToCat(type){
  const s = String(type || '').toLowerCase();
  if(s.includes('design')) return 'urban';
  if(s.includes('prescriptive') || s.includes('overview')) return 'urban';
  if(s.includes('technical')) return 'mine';
  if(s.includes('material')) return 'infra';
  return 'social';
}

const EVS = CORE_EVENTS.map(normalizeEvent);

DOCS.forEach((doc, i) => {
  const parsed = parseIssuanceDate(doc.issuance_date);
  let era = 'relocation';
  if(parsed.year < 1950) era = 'industrial';
  else if(parsed.year < 2004) era = 'growth';

  EVS.push(normalizeEvent({
    id:100 + i,
    ...parsed,
    era,
    cat:typeToCat(doc.type),
    title:doc.title,
    featured:false,
    loc:doc.type || 'Document',
    desc:doc.description || '',
  }));
});

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
const YR_SPAN = YR_MAX - YR_MIN;
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
const TIMELINE_PAGE_COOLDOWN = 420;
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
let stageW = 0, stageH = 0;
let centerSeq = 0;
let timelineAxisPositions = [];
let timelineAxisSpan = 0;
let railLeft = 0, railWidth = 0;
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
  stageH = stageRect.height;
  const ribbonRect = ribbonTrack.getBoundingClientRect();
  if(ribbonRect.width > 0){
    railLeft = ribbonRect.left - stageRect.left;
    railWidth = ribbonRect.width;
  } else {
    railLeft = 0;
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

function ribbonPctForYear(year, width = railWidth){
  const safeWidth = Math.max(width, 1);
  return (ribbonPxForYear(year, safeWidth) / safeWidth) * 100;
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

function ribbonXToTimelinePos(clientX){
  const rect = ribbonTrack.getBoundingClientRect();
  const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const innerWidth = Math.max(1, rect.width - RIBBON_EDGE_PAD * 2);
  const t = clamp01((localX - RIBBON_EDGE_PAD) / innerWidth);
  return t * getTimelineAxisSpan();
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

function activateTimelineEvent(ev, e){
  const now = performance.now();
  if(now < suppressTimelineEventClicksUntil) return;
  if(dragging || dragDistance >= TIMELINE_DRAG_CLICK_SUPPRESS_DISTANCE) return;
  if(e && 'pointerId' in e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
  if(lastTimelineActivationId === ev.id && now - lastTimelineActivationAt < 180) return;
  lastTimelineActivationId = ev.id;
  lastTimelineActivationAt = now;
  if(getMode() === 'overview'){
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

function getOverviewProgress(){
  return clamp01((24 - ypv) / 12);
}

function getCalendarProgress(){
  return clamp01((8 - ypv) / 5);
}

function getTimelineStep(){
  const overviewToYear = getOverviewProgress();
  const yearToCalendar = getCalendarProgress();
  return lerp(210, 260, overviewToYear) * lerp(1, 0.82, yearToCalendar);
}

function getTimelinePadding(){
  return Math.max(140, Math.min(260, stageW * 0.26));
}

function getTimelineContentWidth(){
  return getTimelinePadding() * 2 + Math.max(0, EVS.length - 1) * getTimelineStep();
}

function getColumnX(index){
  return getTimelinePadding() + index * getTimelineStep();
}

function getVisibleTimelineEntries(){
  const edgeMargin = getMode() === 'overview' ? 120 : 150;
  const visible = [];

  EVS.forEach((ev, index) => {
    const screenX = yearToX(evFractionalYear(ev));
    if(screenX >= -edgeMargin && screenX <= stageW + edgeMargin){
      visible.push({ev, index, screenX});
    }
  });

  return visible;
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

function filterDenseOverviewLabels(entries, minGap){
  const shown = [];
  [...entries]
    .sort((a,b) => a.x - b.x || a.index - b.index)
    .forEach(entry => {
      entry.showLabel = true;
      const prev = shown[shown.length - 1];
      if(!prev || entry.x - prev.x >= minGap){
        shown.push(entry);
        return;
      }

      const prevScore = (prev.featured ? 4 : 0) + Math.max(0, OVERVIEW_LABEL_MAX_LANES - prev.lane);
      const nextScore = (entry.featured ? 4 : 0) + Math.max(0, OVERVIEW_LABEL_MAX_LANES - entry.lane);
      if(nextScore > prevScore){
        prev.showLabel = false;
        shown[shown.length - 1] = entry;
      } else {
        entry.showLabel = false;
      }
    });
}

function rectsIntersect(a, b){
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

function getOverviewEntryScore(entry){
  return (entry.featured ? 4 : 0) + Math.max(0, OVERVIEW_LABEL_MAX_LANES - entry.lane);
}

function setTextEntryVisibility(entry, visible){
  entry.col.classList.toggle('show', visible);
  entry.col.style.opacity = visible ? '1.000' : '0.000';
  entry.col.style.pointerEvents = visible ? 'auto' : 'none';
  if(entry.guide){
    entry.guide.style.opacity = visible && entry.showGuide ? '1' : '0';
  }
}

function resolveRenderedOverviewCollisions(entries){
  const kept = [];

  [...entries]
    .sort((a,b) => a.x - b.x || a.index - b.index)
    .forEach(entry => {
      if(!entry.label) return;
      const rect = entry.label.getBoundingClientRect();
      const colliding = kept.filter(other => rectsIntersect(rect, other.label.getBoundingClientRect()));
      if(!colliding.length){
        kept.push(entry);
        return;
      }

      const currentScore = getOverviewEntryScore(entry);
      const strongerCollision = colliding.some(other => getOverviewEntryScore(other) >= currentScore);
      if(strongerCollision){
        setTextEntryVisibility(entry, false);
        return;
      }

      colliding.forEach(other => {
        setTextEntryVisibility(other, false);
        const idx = kept.indexOf(other);
        if(idx !== -1) kept.splice(idx, 1);
      });
      kept.push(entry);
    });
}

function getDetailEntryScore(entry){
  const ev = EVS[entry.index];
  return (ev?.featured ? 100 : 0) + (ev && ev.id < 100 ? 10 : 0) + (entry.index / 1000);
}

function setDetailEntryVisibility(entry, visible){
  entry.col.classList.toggle('show', visible);
  entry.col.style.opacity = visible ? '1.000' : '0.000';
  entry.col.style.pointerEvents = visible ? 'auto' : 'none';
  if(entry.guide){
    entry.guide.style.opacity = visible && entry.showGuide ? '1' : '0';
  }
}

function resolveRenderedDetailCollisions(entries){
  const kept = [];

  [...entries]
    .sort((a,b) => a.x - b.x || a.index - b.index)
    .forEach(entry => {
      if(!entry.card) return;
      const rect = entry.card.getBoundingClientRect();
      const colliding = kept.filter(other => rectsIntersect(rect, other.card.getBoundingClientRect()));
      if(!colliding.length){
        kept.push(entry);
        return;
      }

      const currentScore = getDetailEntryScore(entry);
      const strongerCollision = colliding.some(other => getDetailEntryScore(other) > currentScore);
      if(strongerCollision){
        setDetailEntryVisibility(entry, false);
        return;
      }

      colliding.forEach(other => {
        setDetailEntryVisibility(other, false);
        const idx = kept.indexOf(other);
        if(idx !== -1) kept.splice(idx, 1);
      });
      kept.push(entry);
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

function getTimelinePageStep(){
  const visible = getVisibleTimelineEntries();
  return Math.max(1, visible.length - 2);
}

function getTimelineVisibleRange(){
  const visible = getVisibleTimelineEntries();
  if(!visible.length) return null;

  const sorted = [...visible].sort((a,b) => evFractionalYear(a.ev) - evFractionalYear(b.ev) || a.ev.id - b.ev.id);
  return {
    startYear: sorted[0].ev.year,
    endYear: sorted[sorted.length - 1].ev.year,
    startValue: evFractionalYear(sorted[0].ev),
    endValue: evFractionalYear(sorted[sorted.length - 1].ev),
    entries: sorted
  };
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

function getRibbonDisplayRange(){
  if(getMode() === 'calendar'){
    const block = cpBlock(cpYear);
    return {start: block.start, end: block.end};
  }

  const displayedRange = getDisplayedTimelineRange();
  if(!displayedRange) return {start: YR_MIN, end: YR_MAX};

  return {
    start: Math.max(YR_MIN, Math.floor(displayedRange.startValue)),
    end: Math.min(YR_MAX, Math.ceil(displayedRange.endValue))
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

/* ══════════════════════════════════════════════════════════════
   CALENDAR OVERLAY — year-block grid (7×5 = 35 years per page).
   Block = 35 years starting at 1900 (1900–1934, 1935–1969,
   1970–2004, 2005–2035*). * last block is truncated to 2035.
   Clicking a year filters the side panel to that year's events.
═══════════════════════════════════════════════════════════════ */

const CC = {mine:'#b07070',urban:'#6e9ab8',infra:'#9b7fb3',social:'#6a9e7f',env:'#b8a868'};
const CL = {mine:'Mining History',urban:'Urban Planning',infra:'Infrastructure',social:'Social Culture',env:'Environment'};

function mixHexWithWhite(hex, colorWeight = 0.7){
  const raw = (hex || '').replace('#','');
  if(raw.length !== 6) return hex;
  const r = parseInt(raw.slice(0,2),16);
  const g = parseInt(raw.slice(2,4),16);
  const b = parseInt(raw.slice(4,6),16);
  const whiteWeight = 1 - colorWeight;
  const mix = (channel) => Math.round(channel * colorWeight + 255 * whiteWeight);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
const CC_BAR = Object.fromEntries(Object.entries(CC).map(([key, value]) => [key, mixHexWithWhite(value, 0.7)]));

function animateStaggerIn(nodes, opts = {}){
  const items = Array.from(nodes || []).filter(Boolean);
  if(!items.length) return;
  const axis = opts.axis || 'y';
  const distance = opts.distance ?? 10;
  const step = opts.step ?? 24;
  const duration = opts.duration ?? 240;
  items.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = axis === 'x' ? `translateX(${distance}px)` : `translateY(${distance}px)`;
    item.style.transition = 'none';
  });
  requestAnimationFrame(() => {
    items.forEach((item, index) => {
      const delay = index * step;
      item.style.transition = `opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`;
      item.style.opacity = '1';
      item.style.transform = 'none';
    });
  });
}

function formatEventDate(ev){
  return ev.dateLabel || formatDateLabelFromParts(ev.year, ev.month || 1, ev.day || 1, ev.datePrecision || 'year');
}

const BLOCK_SIZE = 35;
let cpYear = 1900;
let cpSel = null;
let cpActiveId = null;
let lastCalBlockStart = null;

function cpBlock(year){
  const start = Math.floor((year - YR_MIN) / BLOCK_SIZE) * BLOCK_SIZE + YR_MIN;
  const end = Math.min(start + BLOCK_SIZE - 1, YR_MAX);
  return {start, end};
}

function _ensureCalGrid(container, count, cellClass){
  if(container.children.length === count) return;
  container.innerHTML = '';
  for(let i = 0; i < count; i++){
    const cell = document.createElement('div');
    cell.className = cellClass;
    cell.dataset.idx = i;
    container.appendChild(cell);
  }
}

function _animCellContent(cell, buildFn){
  cell.innerHTML = '';
  buildFn(cell);
}

function triggerCalDayInteraction(cell){
  if(!cell) return;
  cell.classList.remove('cp-click-anim');
  void cell.offsetWidth;
  cell.classList.add('cp-click-anim');
  if(cell._cpClickAnimTimer) clearTimeout(cell._cpClickAnimTimer);
  cell._cpClickAnimTimer = setTimeout(() => {
    cell.classList.remove('cp-click-anim');
    cell._cpClickAnimTimer = null;
  }, 540);
}

function _calAnimLabel(el, newText, dir){
  if(!el) return;
  if(!dir || el.textContent === newText){
    el.textContent = newText;
    return;
  }
  const dxOut = dir === 'left' ? '-18px' : '18px';
  const dxIn = dir === 'left' ? '18px' : '-18px';
  el.style.transition = 'opacity .15s ease, transform .15s ease';
  el.style.opacity = '0';
  el.style.transform = `translateX(${dxOut})`;
  setTimeout(() => {
    el.textContent = newText;
    el.style.transition = 'none';
    el.style.transform = `translateX(${dxIn})`;
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.transition = 'opacity .2s cubic-bezier(.22,1,.36,1), transform .2s cubic-bezier(.22,1,.36,1)';
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  }, 150);
}

function showCalendar(){
  const center = Math.round(centerYear);
  const curBlock = cpBlock(cpYear);
  if(center < curBlock.start || center > curBlock.end){
    cpYear = center;
    cpSel = null;
  }
  const nextBlock = cpBlock(cpYear);
  if(lastCalBlockStart !== nextBlock.start){
    renderCalPage();
    lastCalBlockStart = nextBlock.start;
  }
}

function renderCalPage(dir){
  const {start, end} = cpBlock(cpYear);
  const label = `${start} – ${end}`;

  _calAnimLabel(cphTitle, label, dir || null);
  document.getElementById('cpdow').innerHTML = ["'00","'05","'10","'15","'20","'25","'30"].map(d => `<div class="cpdow-cell">${d}</div>`).join('');

  _ensureCalGrid(cpdaysEl, 35, 'cp-day');
  const cells = cpdaysEl.children;
  const rangeEvents = EVS.filter(e => e.year >= start && e.year <= end);

  for(let i = 0; i < 35; i++){
    const y = start + i;
    const evs = EVS.filter(e => e.year === y);
    const cell = cells[i];
    const cls = ['cp-day'];

    if(y === cpSel) cls.push('cp-selected');
    if(evs.length > 0) cls.push('cp-milestone');
    if(y > YR_MAX) cls.push('cp-dim');
    cell.className = cls.join(' ');
    cell.style.background = '';
    cell.dataset.year = String(y);

    cell.onclick = null;
    if(y <= YR_MAX){
      cell.onclick = () => {
        cpSel = y;
        renderCalPage();
        renderCpeList(EVS.filter(e => e.year === y), y);
        if(evs.length > 0) triggerCalDayInteraction(cell);
      };
    }

    _animCellContent(cell, container => {
      let evHtml = '';
      evs.slice(0,2).forEach(ev => {
        evHtml += `<span class="cp-ev-tag" style="color:${CC[ev.cat]}">${ev.title.split(' ').slice(0,4).join(' ')}</span>`;
      });
      if(evs.length > 2) evHtml += `<span class="cp-more">+${evs.length - 2} more</span>`;

      const heat = Math.min(evs.length / 8, 1);
      if(evs.length > 0){
        cell.style.background = `rgba(180,160,130,${(heat * 0.22).toFixed(3)})`;
      }

      let barHtml = '';
      if(evs.length > 0){
        const cats = evs.map(e => e.cat);
        const segs = cats.map(cat => `<span style="background:${CC_BAR[cat] || CC[cat]}"></span>`).join('');
        barHtml = `<div class="cp-bar">${segs}</div>`;
      }

      const hasFeat = evs.some(e => e.featured);
      const featMark = hasFeat ? '<span class="cp-feat-star">★</span>' : '';

      let dotsHtml = '';
      if(evs.length > 0){
        const shown = evs.slice(0,8);
        dotsHtml = `<div class="cp-dots">${shown.map(ev => `<span class="cp-dot" style="background:${CC[ev.cat]}"></span>`).join('')}${evs.length > 8 ? '<span class="cp-dot" style="background:var(--g4)"></span>' : ''}</div>`;
      }

      container.innerHTML = `${barHtml}<div class="cp-yr-label">${y}${featMark}</div>${evHtml}${dotsHtml}`;
    });
  }

  if(dir) animateStaggerIn(Array.from(cells), {axis:'x', distance:dir === 'left' ? 18 : -18, step:10, duration:220});

  if(!cpSel || cpSel < start || cpSel > end){
    renderCpeList(rangeEvents, null);
  }
  else renderCpeList(EVS.filter(e => e.year === cpSel), cpSel);
  updateCpNav();
  requestAnimationFrame(updateCpeFullscreenAvailability);

  requestAnimationFrame(() => {
    const panel = document.getElementById('cal-grid-wrap');
    if(!panel || !cpdaysEl) return;
    cpdaysEl.querySelectorAll('.cp-day-empty').forEach(node => node.remove());
    const panelH = panel.clientHeight;
    const gridH = cpdaysEl.clientHeight;
    const cellH = cpdaysEl.firstElementChild ? cpdaysEl.firstElementChild.clientHeight : 80;
    if(gridH >= panelH || cellH <= 0) return;
    const extraRows = Math.ceil((panelH - gridH) / cellH);
    const extraCells = extraRows * 7;
    const frag = document.createDocumentFragment();
    for(let i = 0; i < extraCells; i++){
      const filler = document.createElement('div');
      filler.className = 'cp-day-empty' + ((35 + i) % 7 === 6 ? ' no-border-right' : '');
      frag.appendChild(filler);
    }
    cpdaysEl.appendChild(frag);
  });
}

function renderCpeList(evs, sel){
  const sorted = [...evs].sort((a,b) => a.year - b.year || a.month - b.month || a.day - b.day || a.id - b.id);
  cpeYr.textContent = sel || 'All events this period';
  cpeCount.textContent = sorted.length ? `${sorted.length} event${sorted.length !== 1 ? 's' : ''}` : sel ? 'No archived events' : '';

  if(!sorted.length){
    cpeList.innerHTML = '<div class="cpe-empty">No events recorded<br>for this year.</div>';
    requestAnimationFrame(updateCpeScrollIndicator);
    return;
  }

  function getCpeDensityClass(ev){
    const score = String(ev.title || '').length + (String(ev.desc || '').length * 0.22) + (ev.featured ? 12 : 0);
    if(score > 95) return ' cpe-dense';
    if(score > 66) return ' cpe-compact';
    return '';
  }

  cpeList.innerHTML = sorted.map(ev => `
    <div class="cpe-ev${getCpeDensityClass(ev)}${cpActiveId === ev.id ? ' is-active' : ''}" data-id="${ev.id}">
      <div class="cpe-ev-row">
        <div class="cpe-ev-d" style="background:${CC[ev.cat]}"></div>
        <div class="cpe-ev-main">
          <div class="cpe-ev-title">${ev.title}${ev.featured ? '<span class="cpe-ev-feat">★ Featured</span>' : ''}</div>
          <div class="cpe-ev-meta">${ev.year} · ${CL[ev.cat]}</div>
          <div class="cpe-ev-desc">${ev.desc}</div>
        </div>
      </div>
    </div>
  `).join('');

  cpeList.querySelectorAll('.cpe-ev').forEach(row => {
    row.addEventListener('mouseenter', () => {
      setLinkedHover(Number(row.dataset.id));
    });
    row.addEventListener('mouseleave', () => {
      setLinkedHover(null);
    });
    row.addEventListener('click', () => {
      cpActiveId = Number(row.dataset.id);
      const ev = EVS.find(item => item.id === cpActiveId);
      if(ev) openPopover(ev);
      syncCalendarListActiveState();
    });
  });

  animateStaggerIn(cpeList.querySelectorAll('.cpe-ev'), {axis:'y', distance:10, step:20, duration:220});
  cpeList.scrollTop = 0;
  requestAnimationFrame(updateCpeScrollIndicator);
  setTimeout(updateCpeScrollIndicator, 260);
}

function syncCalendarListActiveState(){
  cpeList.querySelectorAll('.cpe-ev').forEach(row => {
    row.classList.toggle('is-active', Number(row.dataset.id) === cpActiveId);
  });
}

function updateCpNav(){
  const {start, end} = cpBlock(cpYear);
  cpnavPrev.disabled = start <= YR_MIN;
  cpnavNext.disabled = end >= YR_MAX;
}

function navigateCalendarBy(dir){
  const {start, end} = cpBlock(cpYear);
  let nextStart = null;
  let pageDir = null;
  if(dir < 0 && start > YR_MIN){
    nextStart = start - BLOCK_SIZE;
    pageDir = 'left';
  } else if(dir > 0 && end < YR_MAX){
    nextStart = start + BLOCK_SIZE;
    pageDir = 'right';
  }
  if(nextStart === null) return;

  cpYear = nextStart;
  cpSel = null;
  cpActiveId = null;
  const nextBlock = cpBlock(cpYear);
  lastCalBlockStart = nextBlock.start;
  centerYear = nextBlock.start + ((nextBlock.end - nextBlock.start + 1) / 2);
  clampCenter();
  renderCalPage(pageDir);
  layout();
  return true;
}

function monthName(m){
  return MONTH_NAMES[m - 1];
}

let lastCalendarNavTriggerAt = 0;
function triggerCalendarNav(dir){
  const now = performance.now();
  if(now - lastCalendarNavTriggerAt < 180) return;
  lastCalendarNavTriggerAt = now;
  navigateCalendarBy(dir);
}

function bindCalendarNavButton(btn, dir){
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if(btn.disabled) return;
    triggerCalendarNav(dir);
  });
  btn.addEventListener('keydown', e => {
    if((e.key === 'Enter' || e.key === ' ') && !btn.disabled){
      e.preventDefault();
      triggerCalendarNav(dir);
    }
  });
}

bindCalendarNavButton(cpnavPrev, -1);
bindCalendarNavButton(cpnavNext, 1);

cpeList.addEventListener('wheel', e => {
  const canScrollDown = cpeList.scrollTop + cpeList.clientHeight < cpeList.scrollHeight;
  const canScrollUp = cpeList.scrollTop > 0;
  if((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)){
    e.stopPropagation();
  }
}, {passive: true});
cpeList.addEventListener('scroll', updateCpeScrollIndicator, {passive:true});
window.addEventListener('resize', () => requestAnimationFrame(updateCpeScrollIndicator), {passive:true});

let calendarPanelHoverLocked = false;
if(cpePanel){
  cpePanel.addEventListener('pointerenter', () => {
    calendarPanelHoverLocked = true;
  });
  cpePanel.addEventListener('pointerleave', () => {
    calendarPanelHoverLocked = false;
  });
}

function isCalendarPanelInteractionTarget(target){
  return !!target?.closest('.cpevs-panel');
}

function canSwipeCalendarTarget(target){
  return !target.closest('.cpevs-panel, .cpn-btn, .cph, button');
}


function isAdaptiveCalendarPanelScroll(){
  const html = document.documentElement;
  return html.classList.contains('embedded-phone')
      || html.classList.contains('phone-app')
      || html.classList.contains('tablet-app')
      || html.classList.contains('embedded-tablet');
}

let calendarPanelTouchProxy = null;

function startCalendarPanelTouchProxy(touch){
  if(!touch || !cpeList) return;
  calendarPanelTouchProxy = {
    startY: touch.clientY,
    startScrollTop: cpeList.scrollTop,
    moved: false
  };
}

function updateCalendarPanelTouchProxy(touch){
  if(!calendarPanelTouchProxy || !touch || !cpeList) return false;
  const dy = touch.clientY - calendarPanelTouchProxy.startY;
  cpeList.scrollTop = calendarPanelTouchProxy.startScrollTop - dy;
  updateCpeScrollIndicator();
  if(Math.abs(dy) > 4) calendarPanelTouchProxy.moved = true;
  return calendarPanelTouchProxy.moved;
}

function stopCalendarPanelTouchProxy(){
  calendarPanelTouchProxy = null;
}

let calDragStartX = null;
calOverlay.addEventListener('wheel', e => {
  if(isCalendarPanelInteractionTarget(e.target)) return;
  const axis = getLockedWheelGestureAxis(e.deltaX, e.deltaY);
  if(axis === 'horizontal'){
    e.preventDefault();
    e.stopPropagation();
    handleCalendarWheel(getWheelAxisDelta(axis, e.deltaX, e.deltaY));
  }
}, {passive:false});

calOverlay.addEventListener('mousedown', e => {
  if(!canSwipeCalendarTarget(e.target)) return;
  resetWheelGestureLock();
  calDragStartX = e.clientX;
});
window.addEventListener('mouseup', e => {
  if(calDragStartX === null) return;
  const dx = e.clientX - calDragStartX;
  calDragStartX = null;
  if(Math.abs(dx) < 60) return;
  navigateCalendarBy(dx < 0 ? 1 : -1);
});

let calTouchStartX = null;
let calTouchStartY = null;
calOverlay.addEventListener('touchstart', e => {
  if(!canSwipeCalendarTarget(e.target)) return;
  if(!e.touches[0]) return;
  resetWheelGestureLock();
  calTouchStartX = e.touches[0].clientX;
  calTouchStartY = e.touches[0].clientY;
}, {passive:true});
calOverlay.addEventListener('touchend', e => {
  if(calTouchStartX === null) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - calTouchStartX;
  const dy = touch.clientY - calTouchStartY;
  calTouchStartX = null;
  calTouchStartY = null;
  if(Math.abs(dy) >= TOUCH_MODE_SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx) * TOUCH_GESTURE_DIRECTION_RATIO){
    return;
  }
  if(Math.abs(dx) < 50) return;
  navigateCalendarBy(dx < 0 ? 1 : -1);
}, {passive:true});

if(cpePanel && cpeList){
  cpePanel.addEventListener('wheel', e => {
    if(!isAdaptiveCalendarPanelScroll()) return;
    if(e.target.closest('.cpe-list')) return;
    cpeList.scrollTop += e.deltaY;
    e.preventDefault();
    e.stopPropagation();
  }, {passive:false});

  cpePanel.addEventListener('touchstart', e => {
    if(!isAdaptiveCalendarPanelScroll()) return;
    if(e.target.closest('.cpn-btn, button')) return;
    if(!e.touches[0]) return;
    startCalendarPanelTouchProxy(e.touches[0]);
    e.stopPropagation();
  }, {passive:true});

  cpePanel.addEventListener('touchmove', e => {
    if(!isAdaptiveCalendarPanelScroll()) return;
    if(!calendarPanelTouchProxy || !e.touches[0]) return;
    const moved = updateCalendarPanelTouchProxy(e.touches[0]);
    if(moved){
      e.preventDefault();
      e.stopPropagation();
    }
  }, {passive:false});

  cpePanel.addEventListener('touchend', e => {
    if(!isAdaptiveCalendarPanelScroll()) return;
    if(calendarPanelTouchProxy?.moved) e.stopPropagation();
    stopCalendarPanelTouchProxy();
  }, {passive:true});

  cpePanel.addEventListener('touchcancel', () => {
    stopCalendarPanelTouchProxy();
  }, {passive:true});
}


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

function updateZoomButtons(){
  const current = getModeIndex();
  zoomBtns.forEach((b,i) => b.classList.toggle('on', i === current));
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
  const requested = RIBBON_VISIBLE_DOT_MIN_GAP * (items.length - 1);
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
      return;
    }
    rangeStart = displayedRange.startValue;
    rangeEnd = displayedRange.endValue;
    labelStart = displayedRange.startYear;
    labelEnd = displayedRange.endYear;
  }

  if(rangeEnd < rangeStart){
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
window.__codexGetTimelineYpv = () => Number(ypv) || 72;
window.__codexPinchZoomBy = (scale, clientX, baseYpv) => applyEmbeddedPinchZoom(scale, clientX, baseYpv);
window.__codexFinalizePinchZoom = () => {
  layout();
  updateHud();
  return true;
};

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
    // Smooth tween to target zoom level
    animateTo(centerYear, LEVELS[lvl].ypv, 500);
    hideHint();
  });
});

// ── Map-view two-tier tab logic ──
(function(){
  const shell = document.getElementById('shell');
  const zoomWrap = document.getElementById('zoom-scale-wrap');
  const mapTabs = document.querySelectorAll('.map-tab');

  function setMapView(view){
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
  pop.classList.remove('show');
  fitPopoverCard();
  if(restoreOverview){
    animateTo(centerYear, LEVELS[0].ypv, 500);
  }
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
  closePopover(false);
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
    closePopover(false);
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

/* ══════════════════════════════════════════════════════════════
   ONBOARDING — plays once per session. Pantomimes the core
   interactions with a fake cursor. Users can skip.
═══════════════════════════════════════════════════════════════ */
function runOnboarding(){
  const onboard = document.getElementById('onboard');
  const cursor = document.getElementById('onboard-cursor');
  const caption = document.getElementById('onboard-caption');
  const skip = document.getElementById('onboard-skip');

  let cancelled = false;
  const timers = [];

  function cleanup(){
    if(cancelled) return;
    cancelled = true;
    timers.forEach(t => clearTimeout(t));
    if(tweenRAF) cancelAnimationFrame(tweenRAF);
    onboard.classList.remove('on');
    setTimeout(() => {
      // restore to overview if user didn't interact
      ypv = LEVELS[0].ypv;
      centerYear = DEFAULT_OVERVIEW_CENTER;
      clampCenter(); layout();
    }, 400);
  }
  skip.addEventListener('click', cleanup);
  // Any user interaction kills onboarding
  const killers = ['wheel','mousedown','keydown','touchstart'];
  killers.forEach(ev => {
    window.addEventListener(ev, function once(){
      cleanup();
      killers.forEach(e2 => window.removeEventListener(e2, once));
    }, {once: true, capture: true});
  });

  function wait(ms){
    return new Promise(res => {
      const t = setTimeout(res, ms);
      timers.push(t);
    });
  }
  function moveCursor(xPct, yPct){
    cursor.style.transform = `translate(-50%, -50%) translate(${xPct}vw, ${yPct}vh)`;
  }
  function setCaption(text){
    caption.textContent = text;
    caption.classList.add('on');
  }
  function hideCaption(){
    caption.classList.remove('on');
  }
  function click(){
    cursor.classList.add('click');
    setTimeout(() => cursor.classList.remove('click'), 500);
  }

  async function play(){
    // Start: show overview fully (set zoom)
    ypv = LEVELS[0].ypv;
    centerYear = DEFAULT_OVERVIEW_CENTER;
    clampCenter(); layout();

    await wait(300);
    onboard.classList.add('on');
    if(cancelled) return;

    // 1. Cursor appears in middle, caption: "Scroll to zoom through time"
    moveCursor(-20, -10);
    await wait(100);
    moveCursor(0, 0);
    setCaption('Scroll to zoom through time');
    await wait(1200);
    if(cancelled) return;

    // 2. Simulate a scroll zoom — animate into timeline view
    hideCaption();
    await wait(300);
    animateTo(1990, 12, 1600);
    await wait(1800);
    if(cancelled) return;

    // 3. Caption: "← → to hop between events"
    setCaption('Use ← → to jump between events');
    await wait(900);
    if(cancelled) return;

    // 4. Simulate arrow key hop — pick an event to flash
    const ev = EVS.find(e => e.year === 2004) || EVS.find(e => e.featured);
    if(ev){
      animateTo(evFractionalYear(ev), 28, 700);
      await wait(800);
      if(cancelled) return;
      flashEvent(ev.id);
    }
    await wait(1000);
    if(cancelled) return;

    // 5. Caption: "Or drag the ribbon below"
    setCaption('Or drag the timeline ribbon below');
    // Move cursor to ribbon area
    moveCursor(0, 30);
    // Add pulse to ribbon dots
    document.querySelectorAll('.ribbon-dot.featured').forEach(d => d.classList.add('breathe'));
    await wait(1800);
    if(cancelled) return;

    // 6. Fade out, return to overview
    hideCaption();
    await wait(300);
    onboard.classList.remove('on');
    animateTo(DEFAULT_OVERVIEW_CENTER, LEVELS[0].ypv, 1200);

    // stop breathing after a bit
    setTimeout(() => {
      document.querySelectorAll('.ribbon-dot.breathe').forEach(d => d.classList.remove('breathe'));
    }, 4000);
  }

  play();
}

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
  } else if(normalizedView === 'year' || normalizedView === 'timeline' || normalizedView === 'overview'){
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

// Trigger onboarding after a short beat (only if user hasn't seen it)
const ONBOARD_KEY = 'kiruna_onboard_seen_v1';
sessionStorage.setItem(ONBOARD_KEY, '1');
