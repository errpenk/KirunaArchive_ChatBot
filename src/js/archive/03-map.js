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
