/* ── Timeline Overview: sliding density-bar rail ──────────────── */
const TL2OV_START    = 1900;
const TL2OV_END      = 2035;
const TL2OV_SPAN     = TL2OV_END - TL2OV_START;
const TL2OV_PAD      = 6;
const TL2OV_ZOOM_WIN = 28;
const TL2OV_BAR_MIN  = 3;
const TL2OV_BAR_MAX  = 32;
const TL2OV_ANCHORS  = [1900, 1950, 2000, 2035];

let _tl2ovRailW    = 0;
let _tl2ovActiveId = null;

function _tl2ovClamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function _tl2ovYearToPx(year, railW){
  return TL2OV_PAD + ((year - TL2OV_START) / TL2OV_SPAN) * (railW - TL2OV_PAD * 2);
}

function syncMapTimelinePreviewPosition(){
  const panel = document.getElementById('map-tl2-preview');
  if(!panel) return;
  panel.style.height = panel.classList.contains('is-collapsed') ? '0px' : '62px';
  requestAnimationFrame(()=>_tl2ovApplyTransform(_tl2ovActiveId, {immediate:true}));
}

function buildMapTimelinePreview(){
  const sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  let panel = document.getElementById('map-tl2-preview');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'map-tl2-preview';
    panel.innerHTML = `
      <div class="map-tl2-preview-header">
        <div class="map-tl2-preview-title-wrap">
          <div class="map-tl2-preview-title">Timeline Overview</div>
        </div>
      </div>
      <div class="map-tl2-preview-body">
        <div class="map-tl2-preview-viewport" id="tl2ov-viewport">
          <div class="map-tl2-preview-rail" id="tl2ov-rail"></div>
        </div>
      </div>`;
    const detail = document.getElementById('detail');
    if(detail) sidebar.insertBefore(panel, detail);
    else sidebar.appendChild(panel);
    if(!window._mapTl2PreviewResizeBound){
      window.addEventListener('resize', ()=>requestAnimationFrame(renderMapTimelinePreview));
      window._mapTl2PreviewResizeBound = true;
    }
  }
  requestAnimationFrame(()=>{ renderMapTimelinePreview(); syncMapTimelinePreviewPosition(); });
}

function renderMapTimelinePreview(){
  const rail = document.getElementById('tl2ov-rail');
  const viewport = document.getElementById('tl2ov-viewport');
  if(!rail||!viewport) return;
  const vpW = Math.round(viewport.getBoundingClientRect().width)||viewport.clientWidth||0;
  if(!vpW){ requestAnimationFrame(renderMapTimelinePreview); return; }
  _tl2ovRailW = vpW;

  const events = [...getEraFilteredEvents()].sort((a,b)=>a.year-b.year||a.id-b.id);
  rail.innerHTML = '';

  // Group events by year
  const yearMap = new Map();
  events.forEach(ev=>{
    if(!yearMap.has(ev.year)) yearMap.set(ev.year, {count:0, cats:[], ids:[]});
    const r = yearMap.get(ev.year);
    r.count++; r.cats.push(ev.cat); r.ids.push(ev.id);
  });
  const maxCount = Math.max(1, ...[...yearMap.values()].map(r=>r.count));

  yearMap.forEach((row, year)=>{
    const x = _tl2ovYearToPx(year, vpW);
    const catCounts = {};
    row.cats.forEach(c=>{ catCounts[c]=(catCounts[c]||0)+1; });
    const domCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0][0];
    const color  = CC[domCat] || '#8ba2b8';
    const ratio  = Math.log(row.count+1) / Math.log(maxCount+1);
    const barH   = TL2OV_BAR_MIN + ratio * (TL2OV_BAR_MAX - TL2OV_BAR_MIN);

    const bar = document.createElement('div');
    bar.className = 'tl2ov-bar';
    bar.style.cssText = `left:${x.toFixed(2)}px;height:${barH.toFixed(1)}px;--bar-color:${color}`;
    bar.dataset.year = year;
    bar.dataset.ids  = row.ids.join(',');
    bar.title = `${year}: ${row.count} event${row.count>1?'s':''}`;
    bar.addEventListener('click', e=>{ e.stopPropagation(); selectEvent(row.ids[0]); });
    rail.appendChild(bar);

    const callout = document.createElement('div');
    callout.className  = 'tl2ov-callout';
    callout.id         = `tl2ov-callout-y${year}`;
    callout.style.left = `${x.toFixed(2)}px`;
    callout.textContent = year;
    rail.appendChild(callout);
  });

  TL2OV_ANCHORS.forEach(year=>{
    const x = _tl2ovYearToPx(year, vpW);
    const a = document.createElement('div');
    a.className = 'tl2ov-anchor';
    a.style.left = `${x.toFixed(2)}px`;
    a.dataset.anchorYear = year;
    a.textContent = year;
    rail.appendChild(a);
  });

  _tl2ovApplyTransform(_tl2ovActiveId, {immediate:true});
}

function updateMapTimelinePreviewSelection(id, opts={}){
  _tl2ovActiveId = id;
  _tl2ovApplyTransform(id, opts);
}

function _tl2ovApplyTransform(id, opts={}){
  const rail = document.getElementById('tl2ov-rail');
  const viewport = document.getElementById('tl2ov-viewport');
  if(!rail||!viewport) return;
  const vpW = _tl2ovRailW||(Math.round(viewport.getBoundingClientRect().width)||viewport.clientWidth||0);
  if(!vpW) return;

  const ev = (id!==null&&id!==undefined) ? EVS.find(e=>e.id===id) : null;

  rail.querySelectorAll('.tl2ov-bar').forEach(bar=>{
    const yr = +bar.dataset.year;
    bar.classList.toggle('is-active', !!ev && yr===ev.year);
    bar.classList.toggle('is-dim',    !!ev && yr!==ev.year);
  });
  rail.querySelectorAll('.tl2ov-callout').forEach(c=>c.classList.remove('is-visible'));
  if(ev){ const c=document.getElementById(`tl2ov-callout-y${ev.year}`); if(c) c.classList.add('is-visible'); }

  let scaleX=1, translateX=0;
  if(ev){
    scaleX = TL2OV_SPAN / (TL2OV_ZOOM_WIN * 2);
    const ax = _tl2ovYearToPx(ev.year, vpW);
    translateX = _tl2ovClamp(vpW/2 - ax*scaleX, vpW - vpW*scaleX, 0);
  }
  viewport.style.setProperty('--tl2ov-iscale', (1/scaleX).toFixed(5));

  rail.querySelectorAll('.tl2ov-anchor').forEach(a=>{
    if(ev){
      const sx = _tl2ovYearToPx(+a.dataset.anchorYear, vpW)*scaleX+translateX;
      a.classList.toggle('is-hidden', Math.abs(sx-vpW/2)<30||sx<2||sx>vpW-2);
    } else { a.classList.remove('is-hidden'); }
  });

  const tv = `translateX(${translateX.toFixed(2)}px) scaleX(${scaleX.toFixed(5)})`;
  if(opts.immediate){
    rail.style.transition='none'; rail.style.transform=tv;
    void rail.offsetWidth; rail.style.transition='';
  } else { rail.style.transform=tv; }
}


let _edgeEls=[];
function updateEdgeIndicators(){
  if(!leafletMap)return;
  _edgeEls.forEach(el=>el.remove());
  _edgeEls=[];
  if(window._mapPopupOpen)return;
  const bounds=leafletMap.getBounds();
  const mapEl=document.getElementById('mapwrap');
  const W=mapEl.clientWidth;
  const filtered=eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter);

  const edges={left:[],right:[],top:[],bottom:[]};
  filtered.forEach(ev=>{
    if(bounds.contains([ev.lat,ev.lng]))return;
    const p=leafletMap.latLngToContainerPoint([ev.lat,ev.lng]);
    if(p.x<0)edges.left.push(ev);
    else if(p.x>W)edges.right.push(ev);
    else if(p.y<0)edges.top.push(ev);
    else edges.bottom.push(ev);
  });

  const edgeDefs=[
    {key:'left',  style:`left:12px;top:50%;transform:translateY(-50%)`, arrow:'←'},
    {key:'right', style:`right:12px;top:50%;transform:translateY(-50%)`, arrow:'→'},
    {key:'top',   style:`top:60px;left:50%;transform:translateX(-50%)`, arrow:'↑'},
    {key:'bottom',style:`bottom:68px;left:50%;transform:translateX(-50%)`, arrow:'↓'},
  ];
  edgeDefs.forEach(({key,style,arrow})=>{
    const evs=edges[key];if(!evs.length)return;
    const center=leafletMap.getCenter();
    const nearest=evs.reduce((a,b)=>{
      const da=Math.hypot(a.lat-center.lat,a.lng-center.lng);
      const db=Math.hypot(b.lat-center.lat,b.lng-center.lng);
      return da<db?a:b;
    });
    const color=CC[nearest.cat];
    const el=document.createElement('div');
    el.className='map-edge-indicator';
    el.style.cssText=style+';position:absolute;pointer-events:all;cursor:pointer';
    el.innerHTML=`<span class="ei-arrow">${arrow}</span><span class="ei-dot" style="background:${color}"></span><span style="letter-spacing:-.01em">${evs.length} event${evs.length>1?'s':''}</span>`;
    el.addEventListener('click',()=>{
      // Clear active selection when navigating via edge indicator
      activeId=null;
      updateMarkerSelectionVisuals();
      highlightRulerYear(null);
      updateMapTimelinePreviewSelection(null);
      if(!syncSidebarTLSelection()) renderSidebarTL();
      if(window._syncMapChromeState) window._syncMapChromeState();
      const z=leafletMap.getZoom();
      leafletMap.flyTo([nearest.lat,nearest.lng],z,{animate:true,duration:.5});
    });
    mapEl.appendChild(el);
    _edgeEls.push(el);
  });
}

function updateMarkerSelectionVisuals(){
  const hasSelection = activeId!==null;
  Object.entries(leafletMarkers).forEach(([id,marker])=>{
    const el=marker.getElement();
    const root=el?.querySelector('.map-ev-marker');
    if(!root) return;
    const isAct=+id===activeId;
    root.classList.toggle('is-active',isAct);
    root.classList.toggle('is-dim',hasSelection&&!isAct);
    if(!isAct) root.classList.remove('gallery-map-arrival');
    marker.setZIndexOffset(isAct?300:0);
  });
}

function flashGalleryMapMarker(id){
  const marker=leafletMarkers[id];
  const root=marker?.getElement()?.querySelector('.map-ev-marker');
  if(!root) return;
  root.classList.remove('gallery-map-arrival');
  void root.offsetWidth;
  root.classList.add('gallery-map-arrival');
  clearTimeout(root._galleryMapArrivalTimer);
  root._galleryMapArrivalTimer=setTimeout(()=>{
    root.classList.remove('gallery-map-arrival');
    root._galleryMapArrivalTimer=null;
  },760);
}

function buildMapPopupHtml(ev,filtered){
  const tagsHtml=(ev.tags||[]).map(t=>`<span class="popup-expand-tag">${t}</span>`).join('');
  const stakeholders=ev.stakeholders||((ev.sources||[]).map(s=>s.t.split(/[,.(]/)[0].trim()).filter(Boolean));
  const stakeholdersHtml=stakeholders.length?`<div class="popup-stakeholder-label">Stakeholders</div><div class="popup-stakeholders-row">${stakeholders.map(s=>`<span class="popup-stakeholder-pill">${s}</span>`).join('')}</div>`:'';
  const related=relatedMapEvents(ev,filtered);
  const relatedHtml=related.length?`<div class="popup-related"><div class="popup-related-heading">Related by topic</div>${related.map(({event,topic})=>`<button class="popup-related-link" type="button" onclick="event.stopPropagation();window._selectEv(${event.id})"><span>${event.year} · ${event.title}</span><small>${topic} →</small></button>`).join('')}</div>`:'';
  const pid=`ppx-${ev.id}`;
  return `
<div class="popup-inner">
  <div class="popup-yr">${ev.year} · ${CL[ev.cat]}</div>
  <div class="popup-title">${ev.title}</div>
  <div class="popup-cat">${ev.loc||ev.docType||''}</div>
  <div class="popup-short-desc">${ev.desc}</div>
  ${relatedHtml}
</div>
<div class="popup-expand" id="${pid}">
  <div class="popup-expand-inner">
    <div class="popup-expand-desc">${ev.desc}</div>
    <div class="popup-expand-loc">
      <span style="font-size:14px;flex-shrink:0">◎</span>
      <div><div class="popup-expand-loc-name">${ev.docType||ev.loc}</div><div class="popup-expand-loc-coords">${ev.coords}</div></div>
    </div>
    ${stakeholdersHtml}
    <div class="popup-expand-tags">${tagsHtml}</div>
    <div class="popup-expand-pad"></div>
  </div>
</div>
<div class="popup-btn-row">
  <button class="popup-btn" onclick="window._togglePopupDetail('${pid}',this)">View Details</button>
  <button class="popup-btn popup-btn-sec" onclick="window.openGalleryItem('inside',${ev.id})">View in Gallery</button>
</div>`;
}

function renderMarkers(){
  if(!leafletMap)return;
  Object.values(leafletMarkers).forEach(m=>m.remove());
  leafletMarkers={};
  // Remove old selection circles
  if(window._selCircles){window._selCircles.forEach(c=>c.remove());window._selCircles=[];}
  const filtered=(eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter));

  function buildMarkerHtml(ev, isAct){
    const color=CC[ev.cat];
    const s=ev.featured?18:14;
    const box=Math.round(s*3);
    const classes=['map-ev-marker'];
    if(ev.featured) classes.push('is-featured');
    if(isAct) classes.push('is-active');
    else if(activeId!==null) classes.push('is-dim');
    // When a type filter is active, add a small floating geometric icon so all markers are identifiable
    const showTypeLabel = eraFilter !== 'all';
    const roundedDownTriangle = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5L11.5 2.5L7 12Z" fill="#fff" stroke="#fff" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" opacity=".95"/></svg>`;
    const typeLabelHtml = showTypeLabel
      ? `<div class="map-ev-type-label" style="background:${color}">${roundedDownTriangle}</div>`
      : '';
    return `<div class="${classes.join(' ')}" style="--marker-size:${s}px;--marker-box:${box}px;--marker-color:${color};--marker-halo:${color}55;">
      <div class="map-ev-ring"></div>
      <div class="map-ev-shell">
        <div class="map-ev-center"></div>
      </div>
      ${typeLabelHtml}
    </div>`;
  }

  filtered.forEach(ev=>{
    const isActive=activeId===ev.id;
    const s=ev.featured?18:14;
    const box=Math.round(s*3);
    const icon=L.divIcon({
      className:'',
      html:buildMarkerHtml(ev,isActive),
      iconSize:[box,box],iconAnchor:[box/2,box/2],popupAnchor:[0,-(Math.round(s/2)+6)]
    });
    const m=L.marker([ev.lat,ev.lng],{icon,zIndexOffset:isActive?300:0}).addTo(leafletMap);
    m.bindPopup(L.popup({
      closeButton:false,
      maxWidth:420,
      minWidth:280,
      autoPan:false
    }).setContent(buildMapPopupHtml(ev,filtered)));
    m.on('popupopen',()=>{
      window.KirunaRoutes.update('archive',{event:ev.id});
      centerMapPopupCard();
      window._mapPopupOpen=true;
      window._mapDetailOpen=false;
      updateEdgeIndicators();
      document.documentElement.classList.remove('map-sheet-collapsed');
      if(window._syncMapChromeState) window._syncMapChromeState();
    });
    m.on('popupclose',()=>{
      window._mapPopupOpen=false;
      window._mapDetailOpen=false;
      updateEdgeIndicators();
      if(window._syncMapChromeState) window._syncMapChromeState();
    });
    m.on('click',()=>{
      // Toggle: clicking the already-active marker deselects it
      if(activeId===ev.id){
        activeId=null;
        ++mapSelectionToken;
        window.KirunaRoutes.update('archive',{event:null,details:false});
        window._mapDetailOpen=false;
        document.documentElement.classList.remove('map-sheet-collapsed');
        updateMarkerSelectionVisuals();
        highlightRulerYear(null);
        updateMapTimelinePreviewSelection(null);
        if(!syncSidebarTLSelection()) renderSidebarTL();
        m.closePopup();
        if(window._syncMapChromeState) window._syncMapChromeState();
        setTimeout(updateEdgeIndicators,100);
        return;
      }
      selectEvent(ev.id);
    });
    leafletMarkers[ev.id]=m;
  });
  setTimeout(updateEdgeIndicators,100);
}

function fitMapPopupContent(card,mapWidth,visibleHeight){
  const content=card.querySelector('.leaflet-popup-content');
  const wrapper=card.querySelector('.leaflet-popup-content-wrapper');
  if(content&&wrapper){
    const maxWidth=Math.max(280,Math.min(620,mapWidth-32));
    const fitKey=`${maxWidth}:${visibleHeight}:${content.className}`;
    if(content.dataset.fitKey!==fitKey){
      const buttons=content.querySelector('.popup-btn-row');
      if(buttons)buttons.style.flexDirection='';
      wrapper.style.setProperty('max-width',`${maxWidth}px`,'important');
      content.style.setProperty('transition','none','important');
      content.style.setProperty('overflow-wrap','anywhere');
      content.style.setProperty('width',`${Math.min(300,maxWidth)}px`,'important');
      for(let width=320;content.scrollHeight>content.clientHeight+1&&width<maxWidth+20;width+=20){
        content.style.setProperty('width',`${Math.min(width,maxWidth)}px`,'important');
      }
      if(buttons&&content.scrollHeight>content.clientHeight+1)buttons.style.flexDirection='row';
      content.style.setProperty('overflow-y',content.scrollHeight>content.clientHeight+1?'auto':'hidden','important');
      content.dataset.fitKey=fitKey;
    }
  }
}
function centerMapPopupCard(){
  if(!leafletMap)return;
  const mapEl=leafletMap.getContainer();
  const card=mapEl.querySelector('.leaflet-popup');
  if(!card)return;
  const mapRect=mapEl.getBoundingClientRect();
  const rulerTop=document.getElementById('map-ruler')?.getBoundingClientRect().top;
  const bottom=rulerTop>mapRect.top?Math.min(mapRect.bottom,rulerTop):mapRect.bottom;
  const visibleTop=mapRect.top+12;
  const visibleBottom=bottom-12;
  mapEl.style.setProperty('--map-popup-max-height',`${Math.max(0,visibleBottom-visibleTop)}px`);
  fitMapPopupContent(card,mapRect.width,visibleBottom-visibleTop);
  const paneRect=card.parentElement.getBoundingClientRect();
  mapEl.style.setProperty('--popup-center-x',`${mapRect.left+mapRect.width/2-paneRect.left}px`);
  mapEl.style.setProperty('--popup-center-y',`${(visibleTop+visibleBottom)/2-paneRect.top}px`);
}
window._togglePopupDetail=function(pid,btn){
  const el=document.getElementById(pid);
  if(!el)return;
  const content=el.closest('.leaflet-popup-content');
  const wrapper=content?.closest('.leaflet-popup-content-wrapper');
  wrapper?._detailAnimation?.cancel();
  const before=wrapper?.getBoundingClientRect();
  const open=!el.classList.contains('open');
  const phoneMode=window.isPhoneAppMode&&window.isPhoneAppMode();
  btn.textContent=open?'Hide Details':'View Details';
  window._mapDetailOpen=!!open;
  window.KirunaRoutes.update('archive',{details:open});

  if(phoneMode) document.documentElement.classList.remove('map-sheet-collapsed');
  if(window._syncMapChromeState) window._syncMapChromeState();
  const shortDesc=content.querySelector('.popup-short-desc');
  const showDetails=value=>{
    el.classList.toggle('open',value);
    content.classList.toggle('details-open',value);
    if(shortDesc)shortDesc.hidden=value;
    centerMapPopupCard();
  };
  showDetails(open);
  if(!wrapper||!before||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const after=wrapper.getBoundingClientRect();
  if(!open)showDetails(true);
  const animation=wrapper.animate([
    {height:`${before.height}px`,width:`${before.width}px`},
    {height:`${after.height}px`,width:`${after.width}px`}
  ],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
  wrapper._detailAnimation=animation;
  animation.onfinish=()=>{
    if(wrapper._detailAnimation!==animation||!wrapper.isConnected)return;
    if(!open)showDetails(false);
    wrapper._detailAnimation=null;
  };
};

window._selectEv=function(id){selectEvent(id);};
window._openPopover=function(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;
  openPopover(ev);
};
window._selectAndOpenPopover=function(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;
  selectEvent(id);
  setTimeout(()=>openPopover(ev), 400);
};
