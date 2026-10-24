
(function(){
'use strict';
// Wait for report page to exist
function initReport(){
  const rptPage = document.getElementById('page-report');
  if(!rptPage || !window.L) return;

(function(){
'use strict';

/* ── Tile ── */
const TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* ── Coordinates (real geography) ── */
const C = {
  kiruna:     [67.8558, 20.2253],
  mine:       [67.8495, 20.1648],
  oldCity:    [67.8556, 20.2240],
  newCity:    [67.8603, 20.2978],
  perGeijer:  [67.8460, 20.1520],
  luossajarvi:[67.864,  20.289 ],
  narvik:     [68.4376, 17.4272],
  gallivare:  [67.1335, 20.6575],
};

/* ── Icon helpers ── */
function mk(cls){
  return L.divIcon({className:'',html:`<div class="${cls}"></div>`,iconSize:[13,13],iconAnchor:[6,6]});
}
function lbl(txt,cls=''){
  return L.divIcon({className:'',html:`<div class="mlabel ${cls}">${txt}</div>`,iconAnchor:[0,12],iconSize:null});
}
function pop(t,b){
  return `<div class="popup-t">${t}</div><div class="popup-b">${b}</div>`;
}

const FLY = {duration:1.1, easeLinearity:0.22};

/* ══════════════════════════════════════
   HERO MAP — Nordic overview (zoom 5)
══════════════════════════════════════ */
const hmap = L.map('hero-leaflet',{center:[67.5,19.5],zoom:5,zoomControl:false,scrollWheelZoom:false,attributionControl:true});
L.tileLayer(TILE,{attribution:ATTR,subdomains:'abcd',maxZoom:19}).addTo(hmap);

L.marker(C.kiruna,{icon:mk('mk-mine')}).addTo(hmap)
  .bindTooltip(pop('Kiruna','67°51\'N · World\'s largest underground iron ore mine'),{direction:'right',offset:[10,0]});
L.marker(C.narvik,{icon:mk('mk-city')}).addTo(hmap)
  .bindTooltip(pop('Narvik, Norway','Ice-free port · Iron ore export terminal'),{direction:'right',offset:[10,0]});
L.marker(C.gallivare,{icon:mk('mk-city')}).addTo(hmap)
  .bindTooltip(pop('Gällivare / Malmberget','Another LKAB mining relocation city'),{direction:'right',offset:[10,0]});

L.polyline([C.kiruna,C.narvik],{color:'#bbb',weight:1.8,dashArray:'6,4',opacity:0.6}).addTo(hmap);
L.polyline([C.kiruna,C.gallivare],{color:'#bbb',weight:1.8,dashArray:'6,4',opacity:0.6}).addTo(hmap);

L.marker([C.kiruna[0]+0.14, C.kiruna[1]],{icon:lbl('KIRUNA','or'),interactive:false}).addTo(hmap);
L.marker([C.narvik[0]+0.1,  C.narvik[1]],{icon:lbl('Narvik','bl'), interactive:false}).addTo(hmap);
L.marker([C.gallivare[0]-0.18, C.gallivare[1]],{icon:lbl('Gällivare',''),interactive:false}).addTo(hmap);


/* ══════════════════════════════════════
   MAP 1 — City level (5 views)
══════════════════════════════════════ */
const map1 = L.map('map1',{center:C.kiruna,zoom:12.5,zoomControl:true,scrollWheelZoom:false,attributionControl:true});
L.tileLayer(TILE,{attribution:ATTR,subdomains:'abcd',maxZoom:19}).addTo(map1);

/* elements */
const mine1 = L.marker(C.mine,{icon:mk('mk-mine'),zIndexOffset:100}).addTo(map1)
  .bindPopup(pop('Kiirunavaara Mine','World\'s largest underground iron ore mine<br>Depth: 1,365 m · ~27 Mt/yr · LKAB'));
L.marker([C.mine[0]+0.005,C.mine[1]],{icon:lbl('Mine','or'),interactive:false}).addTo(map1);

const deform = L.polygon([
  [67.847,20.195],[67.847,20.262],[67.862,20.272],
  [67.867,20.200],[67.857,20.188]
],{color:'#b83030',weight:1.5,fillColor:'#b83030',fillOpacity:0.1,dashArray:'5,4'}).addTo(map1);
deform.bindTooltip('Ground deformation zone (indicative)<br>Expanding eastward as mining deepens',{sticky:true,direction:'center'});

L.marker(C.oldCity,{icon:mk('mk-city')}).addTo(map1)
  .bindPopup(pop('Old City Centre','Confirmed in deformation zone, 2004<br>Main buildings demolished or relocated'));
L.marker([C.oldCity[0]+0.005,C.oldCity[1]],{icon:lbl('Old Centre','bl'),interactive:false}).addTo(map1);

const newM = L.marker(C.newCity,{icon:mk('mk-new')}).addTo(map1)
  .bindPopup(pop('New City Centre','~3 km east of old centre<br>Kristallen City Hall (2018)<br>Inaugurated Sep 2025'));
L.marker([C.newCity[0]+0.005,C.newCity[1]],{icon:lbl('New Centre','gn'),interactive:false}).addTo(map1);

L.marker(C.perGeijer,{icon:mk('mk-ree')}).addTo(map1)
  .bindPopup(pop('Per Geijer deposit','Europe\'s largest known REE deposit<br>Announced Jan 2023 · EU Strategic Project'));
L.marker([C.perGeijer[0]-0.005,C.perGeijer[1]],{icon:lbl('Per Geijer REE','rd'),interactive:false}).addTo(map1);

L.circle(C.luossajarvi,{radius:500,color:'#4a90d4',weight:1,fillColor:'#a8cff0',fillOpacity:0.35,interactive:false}).addTo(map1);

const arrow1 = L.polyline([C.oldCity,C.newCity],{color:'#5d7a96',weight:2,dashArray:'8,5',opacity:0.65}).addTo(map1);
arrow1.bindTooltip('~3 km eastward relocation',{sticky:true,direction:'top'});

const V1 = [
  {c:[67.856,20.235], z:12.3},   // 0 overview
  {c:[67.848,20.162], z:14.2},   // 1 mine close-up
  {c:[67.854,20.232], z:13.5},   // 2 deformation zone
  {c:[67.861,20.298], z:14.0},   // 3 new city
  {c:[67.855,20.233], z:12.0},   // 4 full arrow
];
const CAP1 = [
  {t:'Kiruna — City overview',              b:'Orange = mine · Blue = old centre · Green = new centre · Click markers for details'},
  {t:'Kiirunavaara Mine — west of the city',b:'Click orange marker · Depth 1,365 m · ~27 million tonnes/yr'},
  {t:'Ground deformation zone (red shading)',b:'Confirmed 2004 · Expands east as mining descends · Covers old city centre'},
  {t:'New City Centre — beside Lake Luossajärvi',b:'~3 km east · Kristallen City Hall · Inaugurated Sep 2025'},
  {t:'Full relocation — old centre → new centre',b:'Blue dashed line = relocation path · 21 heritage buildings moved or rebuilt'},
];


/* ══════════════════════════════════════
   MAP 2 — Regional level (5 views)
══════════════════════════════════════ */
const map2 = L.map('map2',{center:C.kiruna,zoom:12,zoomControl:true,scrollWheelZoom:false,attributionControl:true});
L.tileLayer(TILE,{attribution:ATTR,subdomains:'abcd',maxZoom:19}).addTo(map2);

const pg2 = L.marker(C.perGeijer,{icon:mk('mk-ree'),zIndexOffset:200}).addTo(map2)
  .bindPopup(pop('Per Geijer deposit','Europe\'s largest known REE deposit<br>>1 Mt REO · EU Critical Raw Materials Act Strategic Project<br>Announced Jan 2023'));
L.circle(C.perGeijer,{radius:600,color:'#b83030',weight:1.5,fillColor:'#b83030',fillOpacity:0.12,dashArray:'4,4'}).addTo(map2);
L.marker([C.perGeijer[0]-0.006,C.perGeijer[1]],{icon:lbl('Per Geijer REE','rd'),interactive:false}).addTo(map2);

L.marker(C.mine,{icon:mk('mk-mine')}).addTo(map2).bindPopup(pop('Kiirunavaara Mine','World\'s largest underground iron ore mine'));
L.marker([C.mine[0]+0.005,C.mine[1]],{icon:lbl('Mine','or'),interactive:false}).addTo(map2);

L.marker(C.oldCity,{icon:mk('mk-city')}).addTo(map2).bindPopup(pop('Old City Centre','Deformation zone'));
L.marker(C.newCity,{icon:mk('mk-new')}).addTo(map2).bindPopup(pop('New City Centre','Inaugurated Sep 2025'));
L.marker([C.newCity[0]+0.005,C.newCity[1]],{icon:lbl('New Centre','gn'),interactive:false}).addTo(map2);

const rail = L.polyline([
  [68.438,17.427],[68.35,17.65],[68.22,18.10],
  [68.05,18.95],[67.90,19.60],[67.86,20.05],
  [67.855,20.22],[67.80,20.42],[67.70,20.52],
  [67.50,20.56],[67.30,20.60],[67.13,20.66]
],{color:'#888',weight:2,dashArray:'7,4',opacity:0.55}).addTo(map2);
rail.bindTooltip('Malmbanan iron ore railway<br>Kiruna ↔ Narvik (north) / Luleå (south)<br>Built 1899–1902',{sticky:true});

L.marker(C.narvik,{icon:mk('mk-city')}).addTo(map2).bindPopup(pop('Narvik, Norway','Ice-free port · primary iron ore export terminal'));
L.marker([C.narvik[0]+0.08,C.narvik[1]],{icon:lbl('Narvik','bl'),interactive:false}).addTo(map2);

L.marker(C.gallivare,{icon:mk('mk-city')}).addTo(map2).bindPopup(pop('Gällivare / Malmberget','Another LKAB mining relocation city · ~120 km south'));
L.marker([C.gallivare[0]-0.12,C.gallivare[1]],{icon:lbl('Gällivare',''),interactive:false}).addTo(map2);

const V2 = [
  {c:[67.847,20.158], z:14.5},   // 0 Per Geijer + mine
  {c:[67.855,20.232], z:12.5},   // 1 mine + cities
  {c:[68.12, 19.00],  z:8.5 },   // 2 railway region
  {c:[67.50, 20.44],  z:9.0 },   // 3 Gällivare comparison
  {c:[67.90, 19.20],  z:7.0 },   // 4 Nordic overview
];
const CAP2 = [
  {t:'Per Geijer deposit — Europe\'s largest REE find', b:'Red = deposit area (indicative) · Orange = Kiirunavaara iron ore mine'},
  {t:'Spatial logic: mine → subsidence → city moves east',b:'Ore dips east → deformation follows → old city displaced → new city built further out'},
  {t:'Malmbanan iron ore railway',                       b:'Kiruna → Narvik (north) / Luleå (south) · Built 1899–1902'},
  {t:'Gällivare / Malmberget — parallel case',           b:'Another LKAB-driven urban relocation · ~120 km south of Kiruna'},
  {t:'Arctic scale — Kiruna in its landscape',           b:'145 km north of the Arctic Circle · Surrounded by boreal forest and mountain ranges'},
];


/* ══════════════════════════════════════
   SCROLL DRIVER
══════════════════════════════════════ */
let prev1 = -1, prev2 = -1;

function checkMapSteps(mapN, views, caps, prevIdx){
  const steps = document.querySelectorAll(`.sstep[data-map="${mapN}"]`);
  const wh = window.innerHeight;
  let active = -1;
  steps.forEach((s,i)=>{
    const r = s.getBoundingClientRect();
    if(r.top < wh * 0.58 && r.bottom > wh * 0.38) active = i;
  });
  steps.forEach((s,i)=> s.classList.toggle('active', i===active));

  if(active !== prevIdx && active >= 0){
    const v = views[active];
    const m = mapN===1 ? map1 : map2;
    if(v) m.flyTo(v.c, v.z, FLY);
    const cap = caps[active];
    if(cap){
      document.getElementById(`cap${mapN}-title`).textContent = cap.t;
      document.getElementById(`cap${mapN}-body`).textContent  = cap.b;
    }
    // auto-open popups at key steps
    if(mapN===1 && active===1) setTimeout(()=>mine1.openPopup(),900);
    if(mapN===1 && active===3) setTimeout(()=>newM.openPopup(),900);
    if(mapN===2 && active===0) setTimeout(()=>pg2.openPopup(),900);
    // highlight deform polygon
    if(mapN===1) deform.setStyle({fillOpacity: active===2 ? 0.22 : 0.10});
  }
  return active;
}

/* ── Scroll-reveal for .rv elements ──
   Each .rv enters when its top crosses
   ENTER_AT (60% from top) going down,
   and exits when its bottom goes above
   EXIT_AT (10% from top) going up.
   On scroll down past it, fade out.
*/
const ENTER_AT = 0.80;  // element top must be above this fraction of viewport
const EXIT_AT  = 0.05;  // element bottom above this fraction → fade out

function updateReveal(){
  const wh = window.innerHeight;
  document.querySelectorAll('.rv').forEach(el=>{
    const r = el.getBoundingClientRect();
    const topRatio    = r.top / wh;
    const bottomRatio = r.bottom / wh;

    if(topRatio < ENTER_AT && bottomRatio > EXIT_AT){
      // in the "visible band" → show
      if(!el.classList.contains('in')){
        el.classList.remove('out');
        // force reflow so transition fires
        void el.offsetWidth;
        el.classList.add('in');
      }
    } else if(bottomRatio <= EXIT_AT){
      // scrolled above viewport → fade up/out
      el.classList.remove('in');
      el.classList.add('out');
    } else {
      // below viewport, not yet seen → reset
      el.classList.remove('in','out');
    }
  });
}

function onScroll(){
  const rptEl=document.getElementById('page-report'); const sy=rptEl?rptEl.scrollTop:0;
  const docH = (rptEl?rptEl.scrollHeight-rptEl.clientHeight:1);
  // Update report scroll progress bar
  const pct = Math.min(100,(sy/docH)*100);
  const progBar=document.getElementById('rpt-progress-bar'); if(progBar) progBar.style.width=pct+'%';

  prev1 = checkMapSteps(1, V1, CAP1, prev1);
  prev2 = checkMapSteps(2, V2, CAP2, prev2);

  updateReveal();
}

document.getElementById('page-report').addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', ()=>{
  [hmap,map1,map2].forEach(m=>m.invalidateSize());
},{passive:true});

// Store map refs globally for re-invalidation on page revisit
window._rptMaps = [hmap,map1,map2];

// Aggressive invalidation sequence
[100, 300, 600, 1200].forEach(delay=>{
  setTimeout(()=>{
    [hmap,map1,map2].forEach(m=>{try{m.invalidateSize();}catch(e){}});
  }, delay);
});
setTimeout(onScroll, 300);

})();

  // ── TOC scroll tracker ──
  function updateTOC(){
    const sections = ['hero', 'sec1', 'scrolly1', 'sec2', 'scrolly2', 'sec3', 'sec4'];
    let active = sections[0];
    const scrollY = rptPage.scrollTop + 100;
    for(const id of sections){
      const el = document.getElementById(id);
      if(el && el.offsetTop <= scrollY) active = id;
    }
    document.querySelectorAll('.toc-item').forEach(item=>{
      item.classList.toggle('toc-active', item.dataset.target === active);
    });
    // Back to top visibility
    const topBtn = document.getElementById('btn-top');
    if(topBtn) topBtn.classList.toggle('visible', rptPage.scrollTop > 300);
  }

  rptPage.addEventListener('scroll', updateTOC, {passive:true});
  window._updateTOC = updateTOC;
  setTimeout(updateTOC, 200);
}

window.tocJump = function(id){
  const rptPage = document.getElementById('page-report');
  const target = document.getElementById(id);
  if(rptPage && target){
    rptPage.scrollTo({top: target.offsetTop, behavior:'smooth'});
  }
};

window.reportScrollTop = function(){
  const rptPage = document.getElementById('page-report');
  if(rptPage) rptPage.scrollTo({top:0, behavior:'smooth'});
};

// TOC hover logic
(function setupTOC(){
  const trigger = document.getElementById('toc-trigger');
  const panel = document.getElementById('toc-panel');
  const edgeCue = document.getElementById('toc-edge-cue');
  const edgeArrow = document.getElementById('toc-tab');
  if(!trigger || !panel) return;

  let hideTimer = null;
  let tocShownOnce = false;

  function showTOC(){
    clearTimeout(hideTimer);
    panel.classList.add('toc-visible');
    // Fade out edge cue when TOC is open
    if(edgeCue) edgeCue.style.opacity='0';
    if(edgeArrow){edgeArrow.style.transform='translateY(-50%) translateX(110%)';edgeArrow.style.pointerEvents='none';}
    tocShownOnce = true;
  }
  function hideTOC(){
    hideTimer = setTimeout(()=>{
      panel.classList.remove('toc-visible');
      if(edgeCue) edgeCue.style.opacity='';
      if(edgeArrow){edgeArrow.style.transform='';edgeArrow.style.pointerEvents='';}
    }, 260);
  }

  // Wide trigger zone (60px from right edge)
  trigger.addEventListener('mouseenter', showTOC);
  trigger.addEventListener('mouseleave', hideTOC);
  panel.addEventListener('mouseenter', showTOC);
  panel.addEventListener('mouseleave', hideTOC);

  // Also respond to mouse proximity via mousemove on the whole page-report
  const rptPage = document.getElementById('page-report');
  if(rptPage){
    rptPage.addEventListener('mousemove', e=>{
      const distFromRight = window.innerWidth - e.clientX;
      if(distFromRight < 60){
        showTOC();
      } else if(distFromRight > 200){
        hideTOC();
      }
    }, {passive:true});
  }
  // Tab click opens TOC
  const tab = document.getElementById('toc-tab');
  if(tab) tab.addEventListener('click', showTOC);
})();

// Init report when page shown
setTimeout(()=>{
  // Try initializing if already on report page
  if(document.getElementById('page-report') && !document.getElementById('page-report').classList.contains('off')){
    initReport();
  }
}, 500);

window._reportInitialized = false;
window._initReportOnce = function(){
  if(window._reportInitialized) return;
  window._reportInitialized = true;
  setTimeout(initReport, 100);
};

})();
