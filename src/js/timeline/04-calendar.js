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
const DEFAULT_CALENDAR_BLOCK_START = 1935;
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
        window.parent.KirunaRoutes?.update('timeline2',{source:'inside',view:'calendar',year:y,event:null});
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
  window.parent.KirunaRoutes?.update('timeline2',{
    source:'inside',view:'calendar',year:nextStart===DEFAULT_CALENDAR_BLOCK_START?null:nextStart,event:null
  });
  return true;
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
