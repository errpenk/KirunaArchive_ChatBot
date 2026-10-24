
/* ═══════════════════════════════════════════════════════════════
   CHART LIGHTBOX ENGINE v2
   - Only triggers on the visual element itself (canvas / SVG / rank-grid / table)
   - NOT on title text or desc text
   - Left/right navigation between all zoomable charts in current panel
   - Spoke SVG charts get full-size treatment
   - Animated slide transition on prev/next
═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  const lb      = document.getElementById('dc-lightbox');
  const lbInner = document.getElementById('dc-lightbox-inner');
  const lbClose = document.getElementById('dc-lightbox-close');
  const lbTitle = document.getElementById('dc-lightbox-title');
  const lbDesc  = document.getElementById('dc-lightbox-desc');
  const lbCont  = document.getElementById('dc-lightbox-content');
  if(!lb) return;

  /* ── Chart registry ── */
  let _chartMap = {};
  window._registerChartForLightbox = function(id, inst){ _chartMap[id] = inst; };

  /* ── State ── */
  let _isOpen   = false;
  let _lbChart  = null;
  let _allItems = [];   /* ordered list of zoomable visual elements in current panel */
  let _curIdx   = -1;

  /* ── Nav buttons — mounted on lb overlay (not lbInner) so they're always visible ── */
  const lbPrev = document.createElement('button');
  const lbNext = document.createElement('button');
  const navBase = [
    'position:fixed;top:50%;',
    'width:48px;height:48px;border-radius:50%;border:none;',
    'background:rgba(255,255,255,.92);',
    'box-shadow:0 3px 18px rgba(0,0,0,.18);',
    'display:flex;align-items:center;justify-content:center;',
    'cursor:pointer;color:#2c3038;z-index:9810;',
    'transition:background .15s,box-shadow .18s,transform .18s,opacity .22s;',
    'opacity:0;pointer-events:none;',
    'transform:translateY(-50%);',
  ].join('');
  lbPrev.style.cssText = navBase + 'left:max(16px, calc(50vw - min(44vw,490px) - 60px));';
  lbNext.style.cssText = navBase + 'right:max(16px, calc(50vw - min(44vw,490px) - 60px));';
  lbPrev.innerHTML = '<svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M9 16L2 9l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  lbNext.innerHTML = '<svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M2 2l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  lbPrev.setAttribute('aria-label', 'Previous chart');
  lbNext.setAttribute('aria-label', 'Next chart');
  lbPrev.addEventListener('click', e=>{ e.stopPropagation(); navigateLightbox(-1); });
  lbNext.addEventListener('click', e=>{ e.stopPropagation(); navigateLightbox(1); });
  document.body.appendChild(lbPrev);
  document.body.appendChild(lbNext);

  /* Nav counter indicator — bottom-centre of overlay */
  const lbCounter = document.createElement('div');
  lbCounter.style.cssText = [
    'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);',
    'font-size:11px;color:rgba(255,255,255,.82);font-family:monospace;',
    'letter-spacing:.08em;white-space:nowrap;pointer-events:none;',
    'z-index:9812;transition:opacity .22s;background:rgba(0,0,0,.22);',
    'padding:4px 12px;border-radius:980px;backdrop-filter:blur(6px);',
    'opacity:0;',
  ].join('');
  document.body.appendChild(lbCounter);

  function _showNav(){
    const show = _allItems.length > 1;
    const prevOk = show && _curIdx > 0;
    const nextOk = show && _curIdx < _allItems.length - 1;
    /* Always show arrows if multiple charts exist; dim if at edge */
    lbPrev.style.opacity = !show ? '0' : prevOk ? '1' : '0.3';
    lbPrev.style.pointerEvents = prevOk ? 'auto' : 'none';
    lbNext.style.opacity = !show ? '0' : nextOk ? '1' : '0.3';
    lbNext.style.pointerEvents = nextOk ? 'auto' : 'none';
    if(show){
      lbCounter.textContent = (_curIdx+1) + ' / ' + _allItems.length;
      lbCounter.style.opacity = '1';
    } else {
      lbCounter.style.opacity = '0';
    }
  }

  /* ── ZOOM_SEL — only on visual elements, not title/desc wrappers ── */
  /* We bind to chart-card but only trigger if click target is canvas/svg/rank/table.
     Spoke-wraps and rank-grids are direct targets. */
  const CARD_SEL  = '.dc-chart-card:not([data-no-zoom])';
  const DIRECT_SEL = '.dc-spoke-wrap:not([data-no-zoom]), .dc-rank-grid:not([data-no-zoom]), .dc-tbl-wrap:not([data-no-zoom])';

  /* ── Collect all visual items in the current active panel ── */
  function _collectItems(){
    const panel = document.querySelector('.dc-platform-panel.on');
    if(!panel){ _allItems = []; return; }
    const items = [];
    /* Standalone chart cards (not inside three-col or two-col — those are harder to nav) */
    panel.querySelectorAll('.dc-chart-card:not([data-no-zoom])').forEach(card=>{
      /* Only include if card has a real visual: canvas or SVG spoke */
      const hasCanvas = !!card.querySelector('canvas');
      const hasSpoke  = !!card.querySelector('.dc-spoke-wrap svg, svg');
      const hasRank   = !!card.querySelector('.dc-rank-grid, .dc-tbl-wrap');
      if(hasCanvas || hasSpoke || hasRank) items.push(card);
    });
    /* Direct rank-grids not inside a card */
    panel.querySelectorAll('.dc-rank-grid:not([data-no-zoom])').forEach(el=>{
      if(!el.closest('.dc-chart-card') && !items.includes(el)) items.push(el);
    });
    _allItems = items;
  }

  /* ── Title / desc extraction — from the CARD, not the clicked element ── */
  function _extractMeta(card){
    const t = card.querySelector('.dc-chart-title, .dc-pill-card-title');
    const d = card.querySelector('.dc-chart-desc, .dc-pill-card-desc');
    return {
      title: t ? t.textContent.trim() : '',
      desc:  d ? d.textContent.trim()  : ''
    };
  }

  /* ── Open ── */
  function openLightbox(triggerEl, idx){
    _collectItems();
    if(idx === undefined){
      /* Find index of this element in _allItems */
      const card = triggerEl.closest('.dc-chart-card') || triggerEl;
      idx = _allItems.indexOf(card);
      if(idx === -1) idx = 0;
    }
    _curIdx = idx;
    _isOpen = true;

    _renderItem(_allItems[_curIdx] || triggerEl, null);
    _showNav();
    lb.classList.add('lb-open');
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
  }

  /* ── Navigate prev / next with slide animation ── */
  function navigateLightbox(dir){
    const newIdx = _curIdx + dir;
    if(newIdx < 0 || newIdx >= _allItems.length) return;

    /* Slide out current content */
    const slideOut = dir > 0 ? 'translateX(-60px)' : 'translateX(60px)';
    lbCont.style.transition = 'opacity .18s ease, transform .2s cubic-bezier(.4,0,.2,1)';
    lbCont.style.opacity  = '0';
    lbCont.style.transform = slideOut;

    setTimeout(()=>{
      _curIdx = newIdx;
      const slideIn = dir > 0 ? 'translateX(60px)' : 'translateX(-60px)';
      lbCont.style.transition = 'none';
      lbCont.style.transform  = slideIn;
      lbCont.style.opacity    = '0';

      _renderItem(_allItems[_curIdx], ()=>{
        requestAnimationFrame(()=>{
          lbCont.style.transition = 'opacity .28s ease, transform .3s cubic-bezier(.22,1,.36,1)';
          lbCont.style.opacity    = '1';
          lbCont.style.transform  = 'translateX(0)';
        });
      });
      _showNav();
    }, 200);
  }

  /* ── Render a single item ── */
  function _renderItem(el, onReady){
    /* Get the card (or el itself) for meta */
    const card = el.closest('.dc-chart-card') || el;
    const meta = _extractMeta(card);
    lbTitle.textContent = meta.title;
    lbDesc.textContent  = meta.desc;

    /* Determine visual type */
    const isSpoke  = el.classList.contains('dc-spoke-wrap') || !!el.querySelector('.dc-spoke-wrap, svg');
    const isKw     = el.classList.contains('dc-kw-wrap') || el.classList.contains('dc-wf-bubbles');
    const isTbl    = el.classList.contains('dc-tbl-wrap') || !!el.querySelector('.dc-tbl-wrap');
    const canvas   = el.querySelector('canvas') || (el.tagName==='CANVAS' ? el : null);

    /* Adjust lightbox width */
    lbInner.style.width = '';
    lbInner.style.maxWidth = isSpoke
      ? 'min(99vw,1120px)'
      : isTbl
        ? 'min(90vw,900px)'
        : isKw
          ? 'min(92vw,1000px)'
          : 'min(88vw,960px)';
    if(isSpoke){
      lbInner.style.padding = '20px 14px 14px';
      lb.classList.add('lb-spoke');
    } else {
      lbInner.style.padding = '';
      lb.classList.remove('lb-spoke');
    }

    const phoneLightbox = window.isPhoneAppMode && window.isPhoneAppMode();
    if(canvas){
      if(phoneLightbox){
        _renderCanvasSnapshot(canvas);
      } else if(canvas.id && _chartMap[canvas.id]){
        _renderChart(canvas.id, _chartMap[canvas.id]);
      } else {
        _renderCanvasSnapshot(canvas);
      }
    } else {
      _renderClone(el, isSpoke);
    }
    if(onReady) onReady();
  }

  function _renderCanvasSnapshot(canvas){
    lbCont.innerHTML = '';
    if(_lbChart){ try{_lbChart.destroy();}catch(e){} _lbChart=null; }
    const img = document.createElement('img');
    img.className = 'dc-canvas-snapshot';
    img.alt = lbTitle.textContent || 'Chart preview';
    try{
      img.src = canvas.toDataURL('image/png');
    }catch(e){
      img.src = canvas.toDataURL();
    }
    lbCont.appendChild(img);
  }

  /* ── Re-render Chart.js chart ── */
  function _renderChart(id, srcChart){
    lbCont.innerHTML = '';
    if(_lbChart){ try{_lbChart.destroy();}catch(e){} _lbChart=null; }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:380px';
    const cv = document.createElement('canvas');
    cv.id = 'lb-cv-' + id;
    wrap.appendChild(cv);
    lbCont.appendChild(wrap);

    const srcCfg  = srcChart.config;
    const newData = JSON.parse(JSON.stringify(srcCfg.data));
    const newOpts = JSON.parse(JSON.stringify(srcCfg.options||{}));
    const ctype   = srcCfg.type || 'bar';
    newOpts.animation = ctype==='doughnut'||ctype==='pie'
      ? {animateRotate:true,animateScale:true,duration:650,easing:'easeOutExpo'}
      : {duration:550,easing:'easeOutQuart'};
    newOpts.responsive = true;
    newOpts.maintainAspectRatio = false;
    if(newOpts.scales){
      ['x','y'].forEach(ax=>{
        if(newOpts.scales[ax]){
          newOpts.scales[ax].ticks = {...(newOpts.scales[ax].ticks||{}), font:{size:12}};
        }
      });
    }
    if(newOpts.plugins?.legend){
      newOpts.plugins.legend.labels = {...(newOpts.plugins.legend.labels||{}), font:{size:12}};
    }
    try{
      _lbChart = new Chart(cv, {type:ctype, data:newData, options:newOpts});
    }catch(e){
      lbCont.innerHTML='';
      const img = document.createElement('img');
      img.src = srcChart.toBase64Image();
      img.style.cssText='width:100%;height:auto;border-radius:4px';
      lbCont.appendChild(img);
    }
  }

  function _fitSpokeSvgToContent(svg){
    if(!svg) return;
    try{
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      svg.querySelectorAll('line,circle,text,path,rect,ellipse,polyline,polygon').forEach(node=>{
        if(typeof node.getBBox !== 'function') return;
        const box = node.getBBox();
        if(!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;
        if(box.width===0 && box.height===0) return;
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });
      if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      const padX = 18;
      const padY = 16;
      svg.setAttribute('viewBox', `${minX-padX} ${minY-padY} ${(maxX-minX)+(padX*2)} ${(maxY-minY)+(padY*2)}`);
    }catch(e){}
  }

  function _tightenSpokeLightboxWidth(root){
    if(!root) return;
    const svg = root.querySelector('svg');
    if(!svg) return;
    const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if(vb.length !== 4 || !Number.isFinite(vb[2]) || !Number.isFinite(vb[3]) || vb[2] <= 0 || vb[3] <= 0) return;
    const ratio = vb[2] / vb[3];
    const maxVizHeight = Math.max(320, Math.min(window.innerHeight * 0.92 - 108, window.innerHeight - 120));
    const targetVizWidth = Math.min(window.innerWidth * 0.9, maxVizHeight * ratio);
    const targetInnerWidth = Math.max(640, Math.min(window.innerWidth * 0.96, targetVizWidth + 28));
    lbInner.style.width = `${Math.round(targetInnerWidth)}px`;
  }

  /* ── Clone non-Chart.js element ── */
  function _renderClone(el, isSpoke){
    lbCont.innerHTML='';
    if(_lbChart){try{_lbChart.destroy();}catch(e){}_lbChart=null;}

    /* For spoke charts: only clone the spoke-wrap div (the SVG), not the whole card */
    let source = el;
    if(!el.classList.contains('dc-spoke-wrap') && el.querySelector('.dc-spoke-wrap')){
      source = el.querySelector('.dc-spoke-wrap');
    }

    const clone = source.cloneNode(true);
    clone.style.cursor = 'default';
    clone.style.opacity = '1';
    clone.style.transform = 'none';
    clone.style.minHeight = '';

    /* If it's a spoke SVG, make it large */
    if(isSpoke){
      /* Let spoke charts use most of the available lightbox area */
      clone.style.cssText = 'width:100%;max-width:none;display:flex;align-items:center;justify-content:center;margin:0 auto;';
      const svgs = clone.querySelectorAll('svg');
      if(svgs.length){
        svgs.forEach(svg=>{
          svg.setAttribute('width','100%');
          svg.setAttribute('height','auto');
          svg.style.cssText = 'width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;max-height:calc(92vh - 108px)!important;display:block;overflow:visible!important;';
          /* Keep viewBox as-is for proper scaling */
          svg.setAttribute('viewBox','0 0 420 420');
        });
      }
      /* Re-trigger spoke animation: ensure lines are fully drawn */
      clone.querySelectorAll('.spoke-line').forEach(l=>{
        l.style.transition='none';
        l.style.strokeDashoffset='0';
      });
      clone.querySelectorAll('.spoke-dot,.spoke-badge,.spoke-label').forEach(e2=>{
        e2.style.transition='none';
        const op = e2.dataset.op || '1';
        e2.setAttribute('opacity', op);
        e2.style.opacity = op;
      });
    }

    /* Reveal hidden elements */
    clone.querySelectorAll('.dc-rv').forEach(c=>{ c.style.opacity='1'; c.style.transform='none'; c.style.transition='none'; });
    clone.querySelectorAll('.dc-rank-row,.xr-vt-row').forEach(r=>{ r.style.opacity='1'; r.style.transform='none'; });
    clone.querySelectorAll('.dc-rank-fill[data-w],.xr-vt-fill[data-w]').forEach(f=>{ f.style.width=f.dataset.w+'%'; });
    clone.querySelectorAll('.xr-vt-dot[data-w]').forEach(d=>{ d.style.left='calc('+d.dataset.w+'% - 3.5px)'; });
    clone.querySelectorAll('[data-bubble-delay]').forEach(b=>{ b.style.opacity=b.dataset.bubbleAlpha||'1'; b.style.transform='none'; });
    clone.querySelectorAll('[data-row-delay]').forEach(r=>{ r.style.opacity='1'; r.style.transform='none'; });
    clone.querySelectorAll('.dc-wf-fill[data-w]').forEach(f=>{ f.style.width=f.dataset.w+'%'; });

    /* Remove interaction handlers */
    clone.removeAttribute('onclick');
    clone.querySelectorAll('[onclick]').forEach(c=>c.removeAttribute('onclick'));
    /* Remove title/desc from cloned card (already in lightbox header) */
    clone.querySelectorAll('.dc-chart-title,.dc-chart-desc,.dc-pill-card-title,.dc-pill-card-desc').forEach(e3=>e3.remove());

    lbCont.appendChild(clone);
    if(isSpoke){
      requestAnimationFrame(()=>{
        clone.querySelectorAll('svg').forEach(_fitSpokeSvgToContent);
        _tightenSpokeLightboxWidth(clone);
      });
    }
  }

  /* ── Close ── */
  function closeLightbox(){
    if(!_isOpen) return;
    lb.classList.add('lb-closing');
    lb.classList.remove('lb-spoke');
    /* Hide nav immediately */
    lbPrev.style.opacity='0'; lbPrev.style.pointerEvents='none';
    lbNext.style.opacity='0'; lbNext.style.pointerEvents='none';
    lbCounter.style.opacity='0';
    setTimeout(()=>{
      lb.classList.remove('lb-open','lb-closing');
      lbCont.innerHTML = '';
      lbCont.style.transition = 'none';
      lbCont.style.opacity    = '1';
      lbCont.style.transform  = 'none';
      lbTitle.textContent = '';
      lbDesc.textContent  = '';
      if(_lbChart){try{_lbChart.destroy();}catch(e){}_lbChart=null;}
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
      _isOpen = false;
    }, 280);
  }

  /* ── Keyboard nav ── */
  document.addEventListener('keydown', e=>{
    if(!_isOpen) return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft')  navigateLightbox(-1);
    if(e.key==='ArrowRight') navigateLightbox(1);
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e=>{
    if(!lbInner.contains(e.target)) closeLightbox();
  });

  /* ── Bind ── */
  function bindZoom(root){
    /* Direct visual elements */
    root.querySelectorAll(DIRECT_SEL).forEach(el=>{
      if(el.dataset.lbBound) return;
      el.dataset.lbBound = '1';
      el.addEventListener('click', e=>{
        if(e.target.closest('button,a,.dc-tab,.dc-kw-tab')) return;
        e.stopPropagation();
        openLightbox(el);
      });
    });

    /* Chart cards — trigger on any click on the card (title, desc, or visual) */
    root.querySelectorAll(CARD_SEL).forEach(card=>{
      if(card.dataset.lbBound) return;
      card.dataset.lbBound = '1';
      card.addEventListener('click', e=>{
        if(e.target.closest('button,a,.dc-tab,.dc-kw-tab,.dc-label,.dc-legend')) return;
        e.stopPropagation();
        openLightbox(card);
      });
    });
  }

  window._lbBindZoom = bindZoom;

  document.addEventListener('DOMContentLoaded', ()=>{
    const p = document.getElementById('page-discourse');
    if(p) bindZoom(p);
  });
  setTimeout(()=>{
    const p = document.getElementById('page-discourse');
    if(p) bindZoom(p);
  }, 1200);
})();
