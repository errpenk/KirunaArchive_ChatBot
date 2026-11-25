/* ── Update calendar nav button disabled states ── */
function _updateCalNavBtns(){
  const sStart = Math.floor((calYear-1900)/35)*35+1900;
  const cStart = Math.floor((cpYear-1900)/35)*35+1900;
  const prev = document.getElementById('cal-prev');
  const next = document.getElementById('cal-next');
  const cpPrev = document.getElementById('cpnav-prev');
  const cpNext = document.getElementById('cpnav-next');
  if(prev) prev.disabled = sStart <= 1900;
  if(next) next.disabled = sStart >= 2005;
  if(cpPrev) cpPrev.disabled = cStart <= 1900;
  if(cpNext) cpNext.disabled = cStart >= 2005;
}


function getEraFilteredEvents(){
  return eraFilter==='all' ? EVS : EVS.filter(e=>e.cat===eraFilter);
}

function renderSidebarCal(dir){
  const start=Math.floor((calYear-1900)/35)*35+1900;
  const end=start+34;
  const filteredEvents=getEraFilteredEvents();
  const rangeEvents=filteredEvents.filter(e=>e.year>=start&&e.year<=end);
  const filteredYears=new Set(rangeEvents.map(e=>e.year));
  const filteredFeaturedYears=new Set(rangeEvents.filter(e=>e.featured).map(e=>e.year));
  const label=`${start} – ${end}`;
  _calAnimLabel(document.getElementById('cal-label'), label, dir||null);
  document.getElementById('cal-dow').innerHTML=["'00","'05","'10","'15","'20","'25","'30"].map(d=>`<div class="dow-cell">${d}</div>`).join('');

  const grid=document.getElementById('cal-days');
  // Ensure 35 button cells exist
  _ensureCalGrid(grid, 35, 'day-cell');

  const cells=grid.children;
  const animDir=dir||null;
  for(let i=0;i<35;i++){
    const y=start+i;
    const btn=cells[i];
    const cls=['day-cell'];
    if(y===activeId)cls.push('selected');
    else if(y===calYear&&!calYearFilter)cls.push('today');
    if(filteredYears.has(y))cls.push('has-ev');
    if(filteredFeaturedYears.has(y))cls.push('feat-ev');
    if(y>2035)cls.push('dim');
    if(calYearFilter&&y===calYearFilter)cls.push('cal-year-active');
    btn.className=cls.join(' ');
    btn.title=String(y);
    btn.dataset.year=String(y);
    _animCellContent(btn, (c)=>{ c.textContent=String(y).slice(2); });
  }
  if(animDir)animateStaggerIn(Array.from(cells),{axis:'x',distance:animDir==='left'?16:-16,step:8,duration:200});

  renderCalEvList(calYearFilter ? filteredEvents.filter(e=>e.year===calYearFilter) : rangeEvents,calYearFilter||null);
  _updateCalNavBtns();
  scheduleResponsiveCollisionHides();
}

function renderCalEvList(evs,sel){
  const c=document.getElementById('cal-evs');
  if(!evs.length){
    c.innerHTML='<div class="cal-ev-head" style="color:var(--g3);font-size:10px;padding:14px 0">No events recorded for this year</div>';
    scheduleResponsiveCollisionHides();
    return;
  }
  let h=`<div class="cal-ev-head"${sel?'':' data-default-period="1"'}>${sel?`Events in ${sel}`:'Events this period'}</div>`;
  evs.forEach(ev=>{h+=`<div class="cal-ev-row${activeId===ev.id?' is-active':''}" data-id="${ev.id}"><div class="cal-ev-d" style="background:${CC[ev.cat]}"></div><div><div class="cal-ev-title">${ev.title}</div><div class="cal-ev-yr">${ev.year} · ${CL[ev.cat]}</div></div></div>`;});
  c.innerHTML=h;
  c.querySelectorAll('.cal-ev-row').forEach(r=>r.addEventListener('click',()=>{
    const id=+r.getAttribute('data-id');
    // Highlight on map WITHOUT leaving the calendar tab
    activeId=id;
    const ev=EVS.find(e=>e.id===id);
    if(!ev)return;
    if(leafletMarkers[id]) updateMarkerSelectionVisuals();
    else renderMarkers();
    const m=leafletMarkers[id];
    if(m){
      const z=leafletMap?leafletMap.getZoom():13;
      if(leafletMap)leafletMap.flyTo([ev.lat,ev.lng],z,{animate:true,duration:.6});
      setTimeout(()=>m.openPopup(),700);
    }
    c.querySelectorAll('.cal-ev-row').forEach(row=>row.classList.remove('is-active'));
    r.classList.add('is-active');
    highlightRulerYear(id);
    updateMapTimelinePreviewSelection(id);
  }));
  animateStaggerIn(c.querySelectorAll('.cal-ev-head,.cal-ev-row'),{axis:'y',distance:8,step:18,duration:210});
  scheduleResponsiveCollisionHides();
}


/* ── Calendar: static grid, animate cell content in-place ── */

// Build the grid once; subsequent calls only update cell content
function _ensureCalGrid(container, count, cellClass){
  if(container.children.length === count) return; // already built
  container.innerHTML = '';
  for(let i=0;i<count;i++){
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
  if(!cell)return;
  cell.classList.remove('cp-click-anim');
  void cell.offsetWidth;
  cell.classList.add('cp-click-anim');
  if(cell._cpClickAnimTimer) clearTimeout(cell._cpClickAnimTimer);
  cell._cpClickAnimTimer=setTimeout(()=>{
    cell.classList.remove('cp-click-anim');
    cell._cpClickAnimTimer=null;
  },540);
}

function _calAnimLabel(el, newText, dir){
  if(!el){ return; }
  if(el.id === 'cph-title' || el.id === 'cpn-label'){
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.textContent = newText;
    return;
  }
  if(!dir || el.textContent === newText){
    el.textContent = newText;
    return;
  }
  const DY_OUT = dir === 'left' ? '-5px' : '5px';
  const DY_IN  = dir === 'left' ? '5px'  : '-5px';
  el.style.transition = 'opacity .15s ease, transform .15s ease';
  el.style.opacity = '0';
  el.style.transform = `translateY(${DY_OUT})`;
  setTimeout(() => {
    el.textContent = newText;
    el.style.transition = 'none';
    el.style.transform = `translateY(${DY_IN})`;
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.transition = 'opacity .2s cubic-bezier(.22,1,.36,1), transform .2s cubic-bezier(.22,1,.36,1)';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 150);
}
function renderCalPage(dir){
  const start=Math.floor((cpYear-1900)/35)*35+1900;
  const end=Math.min(start+34,2035);
  const label=`${start} – ${end}`;

  _calAnimLabel(document.getElementById('cph-title'), label, dir);
  _calAnimLabel(document.getElementById('cpn-label'), label, dir);
  document.getElementById('cpdow').innerHTML=['00s','05s','10s','15s','20s','25s','30s'].map(d=>`<div class="cpdow-cell">'${d}</div>`).join('');

  const grid=document.getElementById('cpdays');
  // Ensure exactly 35 cells exist (build once, reuse)
  _ensureCalGrid(grid, 35, 'cp-day');

  const cells=grid.children;
  for(let i=0;i<35;i++){
    const y=start+i;
    const evs=EVS.filter(e=>e.year===y);
    const cell=cells[i];

    // Update classes (instant — no layout shift)
    const cls=['cp-day'];
    if(y===cpSel)cls.push('cp-selected');
    if(evs.length>0)cls.push('cp-milestone');
    if(y>2035)cls.push('cp-dim');
    cell.className=cls.join(' ');

    // Re-attach click handler
    cell.onclick=()=>{
      cpSel=y;
      renderCalPage();
      renderCepList(evs,y);
      if(evs.length>0) triggerCalDayInteraction(cell);
    };

    // Animate content in-place
    const buildContent=(c)=>{
      let evHtml='';
      evs.slice(0,2).forEach(ev=>{evHtml+=`<span class="cp-ev-tag" style="color:${CC[ev.cat]};display:block">${ev.title.split(' ').slice(0,4).join(' ')}</span>`;});
      if(evs.length>2)evHtml+=`<span class="cp-more" style="display:block">+${evs.length-2} more</span>`;

      // ── Heat background: more events = slightly warmer tint
      const maxEvs=8;
      const heat=Math.min(evs.length/maxEvs,1);
      if(evs.length>0){
        cell.style.background=`rgba(180,160,130,${(heat*0.22).toFixed(3)})`;
      } else {
        cell.style.background='';
      }

      // ── Category bar: thin strip at top showing category mix
      let barHtml='';
      if(evs.length>0){
        const cats=evs.map(e=>e.cat);
        const segs=cats.map(cat=>`<span style="flex:1;height:100%;background:${CC_BAR[cat]||CC[cat]}"></span>`).join('');
        barHtml=`<div style="position:absolute;top:-1px;left:-1px;right:-1px;height:6px;display:flex;z-index:10;pointer-events:none">${segs}</div>`;
      }

      // ── Featured star
      const hasFeat=evs.some(e=>e.featured);
      const featMark=hasFeat?`<span style="font-size:8px;color:#bf5af2;margin-left:3px;vertical-align:top;line-height:1.8">★</span>`:'';

      // ── Colored dots
      let dotsHtml='';
      if(evs.length>0){
        const shown=evs.slice(0,8);
        dotsHtml=`<div class="cp-dots">${shown.map(ev=>`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${CC[ev.cat]};flex-shrink:0;opacity:.9"></span>`).join('')}${evs.length>8?`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--g4);flex-shrink:0"></span>`:''}</div>`;
      }

      c.innerHTML=`${barHtml}<div class="cp-yr-label">${y}${featMark}</div>${evHtml}${dotsHtml}`;
    };
    _animCellContent(cell, buildContent);
  }
  if(dir)animateStaggerIn(Array.from(cells),{axis:'x',distance:dir==='left'?18:-18,step:10,duration:220});

  if(!cpSel||cpSel<start||cpSel>end)renderCepList(EVS.filter(e=>e.year>=start&&e.year<=end),null);
  else renderCepList(EVS.filter(e=>e.year===cpSel),cpSel);
  _updateCalNavBtns();

  /* Fill remaining panel height with empty ghost cells so no white gap shows */
  requestAnimationFrame(()=>{
    const skipAdaptiveFill = (window.isPhoneAppMode&&window.isPhoneAppMode()) || (window.isTabletAppMode&&window.isTabletAppMode());
    if(skipAdaptiveFill) return;
    const panel=document.getElementById('cal-grid-wrap');
    const gridEl=document.getElementById('cpdays');
    if(!panel||!gridEl)return;
    // Remove previously added filler rows
    gridEl.querySelectorAll('.cp-day-empty').forEach(e=>e.remove());
    const panelH=panel.clientHeight;
    const gridH=gridEl.clientHeight;
    const cellH=gridEl.firstElementChild?gridEl.firstElementChild.clientHeight:80;
    if(gridH>=panelH||cellH<=0)return;
    const extraRows=Math.ceil((panelH-gridH)/cellH);
    const extraCells=extraRows*7;
    const frag=document.createDocumentFragment();
    for(let i=0;i<extraCells;i++){
      const d=document.createElement('div');
      // Position in grid: real cells are 35, so this cell is at column (35+i)%7
      d.className='cp-day-empty'+((35+i)%7===6?' no-border-right':'');
      frag.appendChild(d);
    }
    gridEl.appendChild(frag);
  });
}

function renderCepList(evs,sel){
  document.getElementById('cpe-yr').textContent=sel||'All events this period';
  document.getElementById('cpe-count').textContent=evs.length?`${evs.length} event${evs.length!==1?'s':''}`:sel?'No archived events':'';
  const list=document.getElementById('cpe-list');
  if(!evs.length){list.innerHTML=`<div class="cpe-empty">No events recorded<br>for this year.</div>`;return;}
  list.innerHTML=evs.map(ev=>`<div class="cpe-ev" data-id="${ev.id}"><div class="cpe-ev-row"><div class="cpe-ev-d" style="background:${CC[ev.cat]}"></div><div style="flex:1"><div class="cpe-ev-title">${ev.title}${ev.featured?'<span class="cpe-feat">★ Featured</span>':''}</div><div class="cpe-ev-meta">${ev.year} · ${CL[ev.cat]}</div><div class="cpe-ev-desc">${ev.desc}</div></div></div></div>`).join('');
  list.querySelectorAll('.cpe-ev').forEach(r=>r.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(+r.getAttribute('data-id')),80);}));
  animateStaggerIn(list.querySelectorAll('.cpe-ev'),{axis:'y',distance:10,step:20,duration:220});
}

function selectEvent(id){
  const ev=EVS.find(e=>e.id===id);if(!ev)return;
  const token=++mapSelectionToken;
  activeId=id;
  if(activePage!=='archive')showPage('archive',activePage);
  window.KirunaRoutes.update('archive',{event:id,details:false});
  if(!syncSidebarTLSelection()) renderSidebarTL();
  calYear=ev.year;renderSidebarCal();
  highlightRulerYear(id);
  updateMapTimelinePreviewSelection(id);
  setTimeout(()=>{
    if(token!==mapSelectionToken||activePage!=='archive')return;
    if(leafletMarkers[id]) updateMarkerSelectionVisuals();
    else renderMarkers();
    const m=leafletMarkers[id];
    if(m){
      const z=leafletMap.getZoom();
      leafletMap.flyTo([ev.lat,ev.lng],z,{animate:true,duration:.6});
      setTimeout(()=>{if(token===mapSelectionToken&&activePage==='archive')m.openPopup();},700);
    }
  },50);
}

window.applyArchiveRoute=async function(state){
  ++mapSelectionToken;
  await new Promise(resolve=>setTimeout(resolve,60));
  if(activePage!=='archive')return;
  initMap();
  eraFilter=state.type;
  document.querySelectorAll('.era-opt').forEach(btn=>btn.classList.toggle('on',btn.dataset.era===eraFilter));
  activeId=null;
  leafletMap.closePopup();
  renderMarkers();renderSidebarTL();renderSidebarCal();updateRulerFilter();
  const calendar=state.view==='calendar';
  document.getElementById('sbtab-cal').classList.toggle('on',calendar);
  document.getElementById('sbtab-tl').classList.toggle('on',!calendar);
  document.querySelector('.sb-tabs').dataset.active=calendar?'cal':'tl';
  for(const pane of ['tl','cal'])document.getElementById('pane-'+pane).classList.toggle('on',calendar===(pane==='cal'));
  document.getElementById(calendar?'pane-cal':'pane-tl').classList.add('pane-visible');
  if(!EVS.some(ev=>ev.id===state.event))return;
  selectEvent(state.event);
  if(state.details){
    const marker=leafletMarkers[state.event];
    marker?.once('popupopen',()=>{
      const button=document.querySelector('.popup-btn');
      const ev=EVS.find(ev=>ev.id===state.event);
      if(button)window._togglePopupDetail('ppx-'+ev.id,button);
    });
  }
};

/* ── Gallery → Map: robust animated open ── */
function openGalleryToMap(id){
  const ev=EVS.find(e=>e.id===id);
  if(!ev) return;

  /* Step 1: navigate to archive page */
  showPage('archive','gallery');

  /* Step 2: poll until map + marker are ready, then animate */
  let attempts=0;
  function tryOpen(){
    attempts++;
    /* Ensure map is initialised */
    if(!leafletMap){ initMap(); }
    if(!leafletMarkers[id]){ renderMarkers(); }

    const m=leafletMarkers[id];
    if(m && leafletMap){
      /* Step 3: close any open popup cleanly */
      leafletMap.closePopup();

      /* Step 4: first show and emphasize the matching marker */
      const startZoom=Math.max(11, leafletMap.getZoom()-1);
      leafletMap.setView([ev.lat,ev.lng], startZoom, {animate:false});
      activeId=id;
      updateMarkerSelectionVisuals();
      flashGalleryMapMarker(id);

      /* Step 5: then fly in smoothly */
      const markerLeadMs=220;
      setTimeout(()=>{
        leafletMap.flyTo([ev.lat,ev.lng], 15, {animate:true, duration:1.1, easeLinearity:0.35});
      }, markerLeadMs + 80);

      /* Step 6: after fly lands, open popup */
      setTimeout(()=>{
        activeId=id;
        updateMarkerSelectionVisuals();
        if(!syncSidebarTLSelection()) renderSidebarTL();
        calYear=ev.year; renderSidebarCal();
        highlightRulerYear(id);
        m.openPopup();
      }, markerLeadMs + 1400);
      return;
    }
    if(attempts < 20) setTimeout(tryOpen, 120);
  }
  setTimeout(tryOpen, 80);
}
window.openGalleryToMap=openGalleryToMap;
