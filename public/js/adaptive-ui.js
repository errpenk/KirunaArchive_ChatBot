
(function(){
  function isPhoneAppMode(){
    const ua = navigator.userAgent || '';
    const shortestSide = Math.min(window.innerWidth || 9999, window.innerHeight || 9999);
    const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 1;
    const coarsePointer = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)').matches : false;
    const mobileUA = /iPhone|iPod|Android.+Mobile|Mobile/i.test(ua);
    return shortestSide <= 540 && (mobileUA || (touchCapable && coarsePointer));
  }

  function isTabletAppMode(){
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const shortestSide = Math.min(window.innerWidth || 9999, window.innerHeight || 9999);
    const longestSide = Math.max(window.innerWidth || 0, window.innerHeight || 0);
    const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 1;
    const coarsePointer = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)').matches : false;
    const tabletUA = /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Lenovo Tab|Pixel C|Android(?!.*Mobile)/i.test(ua);
    const iPadDesktopUA = platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
    return !isPhoneAppMode()
      && shortestSide >= 700
      && shortestSide <= 1100
      && longestSide <= 1400
      && (tabletUA || iPadDesktopUA || (touchCapable && coarsePointer));
  }

  function shouldUseCompactMapDensity(phoneEnabled, tabletEnabled){
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    const landscape = width > height;
    if(phoneEnabled){
      return height <= 540 || (landscape && height <= 760);
    }
    if(tabletEnabled){
      return height <= 700 && width <= 1100;
    }
    return false;
  }

  function ensureEmbeddedStyle(doc, id, cssText){
    if(!doc) return;
    const head = doc.head || doc.documentElement;
    if(!head) return;
    let style = doc.getElementById(id);
    if(!style){
      style = doc.createElement('style');
      style.id = id;
      head.appendChild(style);
    }
    if(style.textContent !== cssText){
      style.textContent = cssText;
    }
  }

  function installTimeline2OverviewCollisionPatch(tlWindow){
    if(!tlWindow || tlWindow.__codexOverviewCollisionPatchInstalled) return;
    tlWindow.__codexOverviewCollisionPatchInstalled = true;

    const rectsOverlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

    const schedule = () => {
      if(tlWindow.__codexOverviewCollisionRaf) return;
      tlWindow.__codexOverviewCollisionRaf = tlWindow.requestAnimationFrame(() => {
        tlWindow.__codexOverviewCollisionRaf = 0;
        try{
          const tlDoc = tlWindow.document;
          const embeddedAdaptive = !!(
            tlDoc?.documentElement?.classList.contains('embedded-phone') ||
            tlDoc?.documentElement?.classList.contains('embedded-tablet')
          );
          if(!embeddedAdaptive) return;
          if(typeof tlWindow.getMode === 'function' && tlWindow.getMode() !== 'overview') return;

          const entries = Array.from(tlDoc.querySelectorAll('#canvas .txt-col.show'))
            .map(col => {
              const label = col.querySelector('.txt-label');
              if(!label) return null;
              const guide = col.querySelector('.tl-guide');
              return {
                col,
                label,
                guide,
                featured: !!col.querySelector('.txt-dot.featured'),
                x: parseFloat(col.style.left) || label.getBoundingClientRect().left,
                baseOpacity: col.style.opacity || '1',
                baseLabelPointer: label.style.pointerEvents || 'auto',
                baseGuideOpacity: guide ? (guide.style.opacity || '') : ''
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.x - b.x);

          entries.forEach(entry => {
            entry.col.style.opacity = entry.baseOpacity;
            entry.label.style.pointerEvents = entry.baseLabelPointer;
            if(entry.guide) entry.guide.style.opacity = entry.baseGuideOpacity;
          });

          const kept = [];
          const hideEntry = (entry) => {
            entry.col.style.opacity = '0';
            entry.label.style.pointerEvents = 'none';
            if(entry.guide) entry.guide.style.opacity = '0';
          };

          entries.forEach(entry => {
            const rect = entry.label.getBoundingClientRect();
            const overlapIndex = kept.findIndex(other => rectsOverlap(rect, other.rect));
            if(overlapIndex === -1){
              kept.push({entry, rect, featured: entry.featured});
              return;
            }

            const other = kept[overlapIndex];
            if(entry.featured && !other.featured){
              hideEntry(other.entry);
              kept.splice(overlapIndex, 1, {entry, rect, featured: true});
              return;
            }

            hideEntry(entry);
          });

          let remaining = kept.slice();
          for(let pass = 0; pass < 6; pass += 1){
            let changed = false;
            outer: for(let i = 0; i < remaining.length; i += 1){
              for(let j = i + 1; j < remaining.length; j += 1){
                const a = remaining[i];
                const b = remaining[j];
                const aRect = a.entry.label.getBoundingClientRect();
                const bRect = b.entry.label.getBoundingClientRect();
                if(!rectsOverlap(aRect, bRect)) continue;
                if(b.featured && !a.featured){
                  hideEntry(a.entry);
                  remaining.splice(i, 1);
                }else{
                  hideEntry(b.entry);
                  remaining.splice(j, 1);
                }
                changed = true;
                break outer;
              }
            }
            if(!changed) break;
          }
        }catch(e){}
      });
    };

    const wrap = (name) => {
      const original = tlWindow[name];
      if(typeof original !== 'function' || original.__codexWrappedForPhone) return;
      const wrapped = function(){
        const result = original.apply(this, arguments);
        schedule();
        tlWindow.setTimeout(schedule, 120);
        tlWindow.setTimeout(schedule, 260);
        tlWindow.setTimeout(schedule, 520);
        tlWindow.setTimeout(schedule, 880);
        tlWindow.setTimeout(schedule, 1400);
        return result;
      };
      wrapped.__codexWrappedForPhone = true;
      tlWindow[name] = wrapped;
    };

    ['layout', 'layoutDrag', 'forceTimelineLayout', 'syncTimelineAdaptiveUi', 'applyExternalViewState'].forEach(wrap);
    try{
      tlWindow.document?.fonts?.ready?.then?.(() => schedule());
    }catch(e){}
    if(!tlWindow.__codexOverviewCollisionInterval){
      tlWindow.__codexOverviewCollisionInterval = tlWindow.setInterval(() => {
        try{ schedule(); }catch(e){}
      }, 700);
    }
    schedule();
  }

  function installTimeline2TouchZoomPatch(tlWindow){
    if(!tlWindow || tlWindow.__codexTouchZoomPatchInstalled) return;
    if(typeof tlWindow.__codexPinchZoomBy === 'function' && typeof tlWindow.__codexGetTimelineYpv === 'function'){
      tlWindow.__codexTouchZoomPatchInstalled = true;
      return;
    }
    tlWindow.__codexTouchZoomPatchInstalled = true;

    const stage = tlWindow.document?.getElementById('stage');
    if(!stage) return;

    const bridgeDoc = tlWindow.document;
    if(bridgeDoc && !bridgeDoc.getElementById('codex-touchzoom-bridge')){
      const bridgeScript = bridgeDoc.createElement('script');
      bridgeScript.id = 'codex-touchzoom-bridge';
      bridgeScript.textContent = `
window.__codexGetTimelineYpv = function(){
  try{
    return Number(ypv) || 72;
  }catch(e){
    return 72;
  }
};
window.__codexPinchZoomBy = function(scale, clientX, baseYpv){
  try{
    const safeScale = Math.max(Number(scale) || 1, 0.2);
    const currentYpv = Number(baseYpv) > 0 ? Number(baseYpv) : (Number(ypv) || 72);
    const nextYpv = Math.max(1, Math.min(72, currentYpv / safeScale));
    const stageEl = document.getElementById('stage');
    const stageRect = stageEl.getBoundingClientRect();
    const anchorClientX = Number.isFinite(clientX) ? clientX : (stageRect.left + stageRect.width / 2);
    const anchorYear = typeof xToYear === 'function' ? xToYear(anchorClientX) : 0;
    const edgePad = typeof getStageEdgePad === 'function' ? getStageEdgePad() : 0;
    const stageWidth = Math.max(stageRect.width || stageEl.clientWidth || 0, 1);
    const usableWidth = Math.max(stageWidth - edgePad * 2, 1);
    const localX = Math.max(edgePad, Math.min(stageWidth - edgePad, anchorClientX - stageRect.left));
    const frac = Math.max(0, Math.min(1, (localX - edgePad) / usableWidth));
    const anchorPos = typeof yearToTimelinePos === 'function' ? yearToTimelinePos(anchorYear) : anchorYear;
    const targetCenterPos = anchorPos - (frac - 0.5) * nextYpv;
    const targetCenterYear = typeof timelinePosToYear === 'function' ? timelinePosToYear(targetCenterPos) : anchorYear;
    ypv = nextYpv;
    centerYear = targetCenterYear;
    clampCenter();
    layoutDrag();
    updateHud();
    return nextYpv;
  }catch(e){
    return null;
  }
};
window.__codexFinalizePinchZoom = function(){
  try{
    layout();
    updateHud();
    return true;
  }catch(e){
    return false;
  }
};
`;
      (bridgeDoc.body || bridgeDoc.documentElement).appendChild(bridgeScript);
    }

    const isTabletAdaptive = () => !!tlWindow.document?.documentElement?.classList.contains('embedded-tablet');
    const isPhoneAdaptive = () => !!tlWindow.document?.documentElement?.classList.contains('embedded-phone');
    const isTouchAdaptive = () => isTabletAdaptive() || isPhoneAdaptive();
    const getDistance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    let pinch = null;

    stage.addEventListener('touchstart', event => {
      if(!isTouchAdaptive() || event.touches.length !== 2) return;
      const distance = getDistance(event.touches);
      if(!Number.isFinite(distance) || distance <= 0) return;
      event.preventDefault();
      try{
        tlWindow.stopStageDrag?.();
        tlWindow.hideHint?.();
        pinch = {
          distance,
          startYpv: typeof tlWindow.__codexGetTimelineYpv === 'function'
            ? (Number(tlWindow.__codexGetTimelineYpv()) || 72)
            : 72
        };
      }catch(e){
        pinch = { distance, startYpv: 72 };
      }
    }, {passive:false});

    stage.addEventListener('touchmove', event => {
      if(!isTouchAdaptive() || !pinch || event.touches.length !== 2) return;
      const distance = getDistance(event.touches);
      if(!Number.isFinite(distance) || distance <= 0) return;
      event.preventDefault();
      const scale = distance / Math.max(pinch.distance, 1);
      const midClientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      try{
        tlWindow.__codexPinchZoomBy?.(scale, midClientX, pinch.startYpv);
      }catch(e){}
    }, {passive:false});

    const endPinch = () => {
      if(!pinch) return;
      pinch = null;
      try{
        tlWindow.__codexFinalizePinchZoom?.();
      }catch(e){}
    };

    stage.addEventListener('touchend', event => {
      if(event.touches.length < 2) endPinch();
    }, {passive:true});
    stage.addEventListener('touchcancel', endPinch, {passive:true});
  }

  function applyEmbeddedMobileOverrides(phoneEnabled, tabletEnabled){
    const timelineCss = `
html.embedded-phone,
html.embedded-phone body,
html.embedded-phone *{
  scrollbar-width:none!important;
}
html.embedded-phone *::-webkit-scrollbar{
  display:none!important;
  width:0!important;
  height:0!important;
}
html.embedded-phone #hdr{
  padding:0 10px!important;
}
html.embedded-phone .hdr-center{
  gap:4px!important;
  max-width:100%!important;
  justify-content:center!important;
  transform:translateX(0)!important;
  margin:0 auto!important;
}
html.embedded-phone .zoom-btn{
  padding:7px 8px!important;
}
html.embedded-phone .map-tab{
  padding:7px 10px!important;
}
html.embedded-phone .txt-col{
  width:136px!important;
}
html.embedded-phone .txt-label{
  width:60px!important;
  max-width:60px!important;
}
html.embedded-phone .txt-yr{
  font-size:9px!important;
}
html.embedded-phone .txt-title{
  display:-webkit-box!important;
  -webkit-line-clamp:3!important;
  -webkit-box-orient:vertical!important;
  overflow:hidden!important;
  font-size:6.6px!important;
  line-height:1.1!important;
  letter-spacing:-.02em!important;
  word-break:break-word!important;
}
html.embedded-phone .txt-cat{
  display:none!important;
}
html.embedded-phone .cp-day,
html.embedded-phone .cp-day-empty{
  min-height:0!important;
}
html.embedded-phone .cpbody{
  display:flex!important;
  flex-direction:column!important;
  gap:10px!important;
  height:calc(100svh - 52px)!important;
  min-height:0!important;
  padding:10px 12px calc(24px + env(safe-area-inset-bottom))!important;
  overflow:hidden!important;
}
html.embedded-phone .cpgrid-panel,
html.embedded-phone .cpevs-panel{
  width:100%!important;
  border:none!important;
  border-radius:0!important;
  background:rgba(248,248,250,.96)!important;
  box-shadow:0 12px 28px rgba(15,23,42,.08)!important;
  min-height:0!important;
  overflow:hidden!important;
}
html.embedded-phone .cpgrid-panel{
  order:1!important;
  flex:0 0 auto!important;
}
html.embedded-phone .cpevs-panel{
  order:2!important;
  flex:1 1 auto!important;
  height:auto!important;
  max-height:none!important;
  min-height:0!important;
  display:flex!important;
  flex-direction:column!important;
  overflow:hidden!important;
  touch-action:pan-y!important;
  position:relative!important;
}
html.embedded-phone.cpe-fullscreen-open .cph,
html.embedded-phone.cpe-fullscreen-open .cpgrid-panel{
  opacity:0!important;
  pointer-events:none!important;
  transition:opacity .22s ease!important;
}
html.embedded-phone .cpevs-panel::before{
  content:''!important;
  position:absolute!important;
  right:3px!important;
  top:var(--cpe-scroll-top,58px)!important;
  width:5px!important;
  height:var(--cpe-scroll-track-h,0px)!important;
  border-radius:999px!important;
  background:rgba(29,29,31,.08)!important;
  opacity:var(--cpe-scroll-visible,0)!important;
  pointer-events:none!important;
  z-index:5!important;
}
html.embedded-phone .cpevs-panel::after{
  content:''!important;
  position:absolute!important;
  right:3px!important;
  top:var(--cpe-scroll-top,58px)!important;
  width:5px!important;
  height:var(--cpe-scroll-thumb-h,36px)!important;
  border-radius:999px!important;
  background:rgba(29,29,31,.48)!important;
  transform:translateY(var(--cpe-scroll-thumb-y,0px))!important;
  opacity:var(--cpe-scroll-visible,0)!important;
  pointer-events:none!important;
  z-index:6!important;
}
html.embedded-phone .cp-day{
  padding:8px 5px 4px!important;
  gap:1px!important;
}
html.embedded-phone .cp-yr-label{
  font-size:13px!important;
}
html.embedded-phone .cp-ev-tag,
html.embedded-phone .cp-more{
  display:none!important;
}
html.embedded-phone .cp-dots{
  gap:3px!important;
  padding-top:6px!important;
}
html.embedded-phone .cpe-head{
  display:flex!important;
  align-items:flex-start!important;
  justify-content:space-between!important;
  gap:12px!important;
  padding:14px 16px 10px!important;
  border-right:none!important;
  border-bottom:.5px solid var(--g5)!important;
  min-width:0!important;
}
html.embedded-phone .cpe-head-copy{
  flex:1 1 auto!important;
  min-width:0!important;
}
html.embedded-phone .cpe-fullscreen-btn{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:36px!important;
  height:36px!important;
  flex:0 0 36px!important;
  margin-top:-2px!important;
  border:1px solid rgba(29,29,31,.16)!important;
  border-radius:999px!important;
  background:rgba(248,248,250,.96)!important;
  color:#1d1d1f!important;
  font-size:18px!important;
  line-height:1!important;
  box-shadow:0 8px 20px -16px rgba(0,0,0,.3)!important;
  cursor:pointer!important;
  touch-action:manipulation!important;
  position:relative!important;
  z-index:3!important;
}
html.embedded-phone .cpe-fullscreen-close{
  display:none!important;
  font-size:24px!important;
  transform:translateY(-1px)!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen{
  position:fixed!important;
  inset:0!important;
  z-index:5000!important;
  width:100vw!important;
  height:100svh!important;
  max-height:none!important;
  min-height:0!important;
  flex:none!important;
  display:flex!important;
  flex-direction:column!important;
  border:0!important;
  border-radius:0!important;
  background:rgba(248,248,250,.96)!important;
  padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;
  box-shadow:none!important;
  opacity:0;
  transform:translateY(12px);
  transition:opacity .26s ease, transform .28s cubic-bezier(.22,1,.36,1);
}
html.embedded-phone .cpevs-panel.cpe-fullscreen.cpe-fullscreen-visible{
  opacity:1!important;
  transform:translateY(0)!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen.cpe-fullscreen-closing{
  opacity:0!important;
  transform:translateY(10px)!important;
  pointer-events:none!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-head{
  padding:8px 0 14px!important;
  border-bottom:1px solid rgba(29,29,31,.1)!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-list{
  flex:1 1 auto!important;
  height:auto!important;
  max-height:none!important;
  padding:14px 8px 0 0!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-fullscreen-open{
  display:none!important;
}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-fullscreen-close{
  display:block!important;
}
html.embedded-phone .cpe-yr{
  font-size:18px!important;
  line-height:1.06!important;
}
html.embedded-phone .cpe-count{
  font-size:10px!important;
}
html.embedded-phone .cpe-list{
  flex:1 1 auto!important;
  min-height:0!important;
  height:100%!important;
  max-height:100%!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  padding-bottom:12px!important;
  scrollbar-width:thin!important;
  scrollbar-color:rgba(29,29,31,.28) transparent!important;
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-y:contain!important;
  touch-action:pan-y!important;
}
html.embedded-phone .cpe-list::-webkit-scrollbar{
  display:block!important;
  width:4px!important;
  height:4px!important;
}
html.embedded-phone .cpe-list::-webkit-scrollbar-track{
  background:transparent!important;
  margin:6px 0!important;
}
html.embedded-phone .cpe-list::-webkit-scrollbar-thumb{
  background:rgba(29,29,31,.28)!important;
  border-radius:99px!important;
}
html.embedded-phone .cpe-ev{
  padding:10px 14px!important;
}
html.embedded-phone .cpe-ev-row{
  gap:7px!important;
}
html.embedded-phone .cpe-ev-d{
  width:5px!important;
  height:5px!important;
}
html.embedded-phone .cpe-ev-title{
  font-size:11.2px!important;
  line-height:1.28!important;
}
html.embedded-phone .cpe-ev-meta{
  font-size:9.3px!important;
  line-height:1.32!important;
}
html.embedded-phone .cpe-ev-desc{
  font-size:9.8px!important;
  line-height:1.44!important;
  display:block!important;
  -webkit-line-clamp:unset!important;
  -webkit-box-orient:initial!important;
  overflow:visible!important;
  white-space:normal!important;
}
html.embedded-phone .cpe-ev.cpe-compact{
  padding-top:9px!important;
  padding-bottom:9px!important;
}
html.embedded-phone .cpe-ev.cpe-compact .cpe-ev-title{
  font-size:10.6px!important;
  line-height:1.24!important;
}
html.embedded-phone .cpe-ev.cpe-compact .cpe-ev-desc{
  font-size:9.2px!important;
  line-height:1.38!important;
}
html.embedded-phone .cpe-ev.cpe-dense{
  padding-top:8px!important;
  padding-bottom:8px!important;
}
html.embedded-phone .cpe-ev.cpe-dense .cpe-ev-title{
  font-size:10px!important;
  line-height:1.18!important;
}
html.embedded-phone .cpe-ev.cpe-dense .cpe-ev-meta{
  font-size:8.8px!important;
}
html.embedded-phone .cpe-ev.cpe-dense .cpe-ev-desc{
  font-size:8.8px!important;
  line-height:1.32!important;
  display:block!important;
  -webkit-line-clamp:unset!important;
  -webkit-box-orient:initial!important;
  overflow:visible!important;
  white-space:normal!important;
}
html.embedded-tablet #hdr{
  padding:0 16px!important;
}
html.embedded-tablet .hdr-center{
  gap:8px!important;
  max-width:100%!important;
  justify-content:center!important;
  transform:translateX(0)!important;
  margin:0 auto!important;
}
html.embedded-tablet .zoom-btn{
  padding:8px 12px!important;
}
html.embedded-tablet .map-tab{
  padding:8px 14px!important;
}
html.embedded-tablet .txt-col{
  width:156px!important;
}
html.embedded-tablet .txt-label{
  width:78px!important;
  max-width:78px!important;
}
html.embedded-tablet .txt-yr{
  font-size:10px!important;
}
html.embedded-tablet .txt-title{
  display:-webkit-box!important;
  -webkit-line-clamp:3!important;
  -webkit-box-orient:vertical!important;
  overflow:hidden!important;
  font-size:7.2px!important;
  line-height:1.14!important;
  word-break:break-word!important;
}
html.embedded-tablet .txt-cat{
  display:none!important;
}
html.embedded-tablet .cpbody{
  min-height:0!important;
  overflow:hidden!important;
}
html.embedded-tablet .cpgrid-panel,
html.embedded-tablet .cpevs-panel{
  min-height:0!important;
}
html.embedded-tablet .cpevs-panel{
  width:min(320px,33vw)!important;
  max-width:320px!important;
  overflow:hidden!important;
}
html.embedded-tablet #cal-grid-wrap{
  min-height:0!important;
  overflow:hidden!important;
}
html.embedded-tablet .cp-day,
html.embedded-tablet .cp-day-empty{
  min-height:82px!important;
}
html.embedded-tablet .cp-day{
  padding:9px 7px 6px!important;
  gap:2px!important;
}
html.embedded-tablet .cp-ev-tag,
html.embedded-tablet .cp-more{
  display:none!important;
}
html.embedded-tablet .cp-dots{
  gap:3px!important;
  padding-top:8px!important;
  padding-bottom:2px!important;
}
html.embedded-tablet .cpe-list{
  min-height:0!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
  -webkit-overflow-scrolling:touch!important;
  padding-bottom:12px!important;
}
html:not(.embedded-phone) .cpe-fullscreen-btn,
html.embedded-tablet .cpe-fullscreen-btn{
  display:none!important;
}
@media (max-width:1100px){
  html:not(.embedded-tablet) .cpe-fullscreen-btn{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    width:36px!important;
    height:36px!important;
    flex:0 0 36px!important;
    margin-top:-2px!important;
    border:1px solid rgba(29,29,31,.16)!important;
    border-radius:999px!important;
    background:rgba(248,248,250,.96)!important;
    color:#1d1d1f!important;
    font-size:18px!important;
    line-height:1!important;
    box-shadow:0 8px 20px -16px rgba(0,0,0,.3)!important;
    cursor:pointer!important;
    touch-action:manipulation!important;
    position:relative!important;
    z-index:3!important;
  }
  html:not(.embedded-tablet) .cpe-fullscreen-close{
    display:none!important;
    font-size:24px!important;
    transform:translateY(-1px)!important;
  }
  html:not(.embedded-tablet) .cpevs-panel.cpe-fullscreen{
    position:fixed!important;
    inset:0!important;
    z-index:5000!important;
    width:100vw!important;
    height:100svh!important;
    max-height:none!important;
    min-height:0!important;
    flex:none!important;
    display:flex!important;
    flex-direction:column!important;
    border:0!important;
    border-radius:0!important;
    background:rgba(248,248,250,.96)!important;
    padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;
    box-shadow:none!important;
  }
  html:not(.embedded-tablet).cpe-fullscreen-open .cph,
  html:not(.embedded-tablet).cpe-fullscreen-open .cpgrid-panel{
    opacity:0!important;
    pointer-events:none!important;
    transition:opacity .22s ease!important;
  }
  html:not(.embedded-tablet) .cpevs-panel.cpe-fullscreen .cpe-head{
    padding:8px 0 14px!important;
    border-bottom:1px solid rgba(29,29,31,.1)!important;
  }
  html:not(.embedded-tablet) .cpevs-panel.cpe-fullscreen .cpe-list{
    flex:1 1 auto!important;
    height:auto!important;
    max-height:none!important;
    padding:14px 8px 0 0!important;
  }
  html:not(.embedded-tablet) .cpevs-panel.cpe-fullscreen .cpe-fullscreen-open{display:none!important;}
  html:not(.embedded-tablet) .cpevs-panel.cpe-fullscreen .cpe-fullscreen-close{display:block!important;}
}
@media (max-width:1100px) and (hover:hover) and (pointer:fine){
  html.embedded-tablet .cpe-fullscreen-btn{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    width:36px!important;
    height:36px!important;
    flex:0 0 36px!important;
    margin-top:-2px!important;
    border:1px solid rgba(29,29,31,.16)!important;
    border-radius:999px!important;
    background:rgba(248,248,250,.96)!important;
    color:#1d1d1f!important;
    font-size:18px!important;
    line-height:1!important;
    box-shadow:0 8px 20px -16px rgba(0,0,0,.3)!important;
    cursor:pointer!important;
    touch-action:manipulation!important;
    position:relative!important;
    z-index:3!important;
  }
  html.embedded-tablet .cpe-fullscreen-close{
    display:none!important;
    font-size:24px!important;
    transform:translateY(-1px)!important;
  }
  html.embedded-tablet .cpevs-panel.cpe-fullscreen{
    position:fixed!important;
    inset:0!important;
    z-index:5000!important;
    width:100vw!important;
    height:100svh!important;
    max-height:none!important;
    min-height:0!important;
    flex:none!important;
    display:flex!important;
    flex-direction:column!important;
    border:0!important;
    border-radius:0!important;
    background:rgba(248,248,250,.96)!important;
    padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;
    box-shadow:none!important;
  }
  html.embedded-tablet.cpe-fullscreen-open .cph,
  html.embedded-tablet.cpe-fullscreen-open .cpgrid-panel{
    opacity:0!important;
    pointer-events:none!important;
    transition:opacity .22s ease!important;
  }
  html.embedded-tablet .cpevs-panel.cpe-fullscreen .cpe-head{
    padding:8px 0 14px!important;
    border-bottom:1px solid rgba(29,29,31,.1)!important;
  }
  html.embedded-tablet .cpevs-panel.cpe-fullscreen .cpe-list{
    flex:1 1 auto!important;
    height:auto!important;
    max-height:none!important;
    padding:14px 8px 0 0!important;
  }
  html.embedded-tablet .cpevs-panel.cpe-fullscreen .cpe-fullscreen-open{display:none!important;}
  html.embedded-tablet .cpevs-panel.cpe-fullscreen .cpe-fullscreen-close{display:block!important;}
}
/* ── Event detail popup: compact on phone ── */
html.embedded-phone #popover{
  align-items:flex-end!important;
  padding:0!important;
}
html.embedded-phone .pop-card{
  --pop-fit-scale:0.72!important;
  --pop-pad:20px!important;
  width:100%!important;
  max-width:100%!important;
  max-height:min(82svh,560px)!important;
  border-radius:20px 20px 0 0!important;
  overflow-y:auto!important;
}
html.embedded-phone .pop-hero{
  height:90px!important;
  border-radius:20px 20px 0 0!important;
}
html.embedded-phone .pop-title{
  font-size:1.15rem!important;
  margin-bottom:8px!important;
  line-height:1.22!important;
}
html.embedded-phone .pop-desc{
  font-size:0.82rem!important;
  line-height:1.52!important;
  margin-bottom:12px!important;
  -webkit-line-clamp:5;
  display:-webkit-box;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
html.embedded-phone .pop-yr{
  font-size:0.6rem!important;
  margin-bottom:6px!important;
}
html.embedded-phone .pop-actions{
  gap:7px!important;
  margin-bottom:10px!important;
}
html.embedded-phone .pop-map-link,
html.embedded-phone .pop-gallery-link{
  min-height:40px!important;
  font-size:0.78rem!important;
  border-radius:10px!important;
  padding:0 16px!important;
}
html.embedded-phone .pop-meta{
  font-size:0.6rem!important;
  gap:8px!important;
  padding-top:10px!important;
}
html.embedded-phone .pop-close{
  width:28px!important;height:28px!important;
  top:12px!important;right:12px!important;
  font-size:14px!important;
}
/* ── Tablet popup: slightly compact ── */
html.embedded-tablet #popover{
  padding:16px!important;
}
html.embedded-tablet .pop-card{
  --pop-fit-scale:0.88!important;
  --pop-pad:28px!important;
  max-height:min(85svh,680px)!important;
}
html.embedded-tablet .pop-hero{
  height:110px!important;
}
/* ── tablet portrait: hide view/events counter ── */
html.embedded-tablet.embedded-portrait .hdr-r{display:none!important;}
`;

    /* ── Chat highlight CSS injected into both iframes ── */
    const chatHighlightCss = `
.archive-locate-flash{
  animation:archiveLocateFlash 1.6s cubic-bezier(.22,1,.36,1);
}
@keyframes archiveLocateFlash{
  0%{box-shadow:0 0 0 0 rgba(255,205,64,.38);background:rgba(255,241,168,.92)}
  70%{box-shadow:0 0 0 16px rgba(255,205,64,0);background:rgba(255,241,168,.42)}
  100%{box-shadow:0 0 0 0 rgba(255,205,64,0);background:transparent}
}
.archive-inline-highlight{
  background:#fff1a8;
  color:inherit;
  border-radius:4px;
  padding:0 .08em;
  box-shadow:0 0 0 4px rgba(255,241,168,.48);
}
.archive-container-highlight{
  background:rgba(255,241,168,.42)!important;
  box-shadow:0 0 0 4px rgba(255,241,168,.42)!important;
  border-radius:16px!important;
}
.archive-container-highlight.archive-container-highlight-pulse,
.archive-inline-highlight.archive-inline-highlight-pulse{
  animation:archiveInlineHighlightPulse 1.6s cubic-bezier(.22,1,.36,1);
}
@keyframes archiveInlineHighlightPulse{
  0%{box-shadow:0 0 0 0 rgba(255,205,64,.55);background:#fff1a8}
  70%{box-shadow:0 0 0 14px rgba(255,205,64,0);background:#fff6c7}
  100%{box-shadow:0 0 0 0 rgba(255,205,64,0);background:#fff1a8}
}
/* Outside-doc chat highlight */
.ov-event-row.chat-outside-highlight{
  background:rgba(255,241,168,.55)!important;
  outline:2px solid rgba(255,205,64,.95)!important;
  outline-offset:2px!important;
  box-shadow:0 0 0 8px rgba(255,241,168,.36)!important;
  transition:background .26s ease,box-shadow .26s ease,outline-color .26s ease;
}
/* Timeline text/detail col highlight */
.txt-col.archive-locate-flash,
.dtl-col.archive-locate-flash{
  border-radius:10px;
  z-index:10;
  position:relative;
}
`;

    const outsideCss = `
html.embedded-phone,
html.embedded-phone body,
html.embedded-phone *{
  scrollbar-width:none!important;
}
html.embedded-phone *::-webkit-scrollbar{
  display:none!important;
  width:0!important;
  height:0!important;
}
html.embedded-phone .timeline-wrap{
  height:16vh!important;
  min-height:118px!important;
}
html.embedded-phone .track-outer,
html.embedded-phone .year-bar,
html.embedded-phone .field-bar,
html.embedded-phone .overview-panel,
html.embedded-phone .cards-vp,
html.embedded-phone .density-header,
html.embedded-phone .density-chart{
  padding-left:14px!important;
  padding-right:14px!important;
}
html.embedded-phone .year-bar{
  gap:10px!important;
}
html.embedded-phone .yb-left{
  display:none!important;
}
html.embedded-phone .yb-filter{
  flex:1!important;
}
html.embedded-phone .yb-filter-btn{
  width:100%!important;
  justify-content:flex-start!important;
}
html.embedded-phone .yb-stats{
  gap:10px!important;
  padding-left:12px!important;
}
html.embedded-phone .field-comp-row{
  gap:10px!important;
}
html.embedded-phone .overview-panel{
  gap:14px!important;
  padding-top:14px!important;
  padding-bottom:16px!important;
}
html.embedded-phone .ov-event-row{
  grid-template-columns:82px minmax(0,1fr)!important;
  gap:10px!important;
  padding:10px 12px!important;
  overflow:hidden!important;
}
html.embedded-phone .ov-ev-field,
html.embedded-phone .ov-ev-actor,
html.embedded-phone .ov-ev-link{
  display:none!important;
}
html.embedded-phone .ov-ev-date{
  font-size:0.54rem!important;
  min-width:0!important;
}
html.embedded-phone .ov-ev-title{
  font-size:0.68rem!important;
  min-width:0!important;
  max-width:100%!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
html.embedded-phone .ov-ev-gallery{
  display:none!important;
}
html.embedded-phone{
  --card-w:min(84vw,318px)!important;
  --card-gap:14px!important;
}
html.embedded-phone .cards-vp{
  align-items:stretch!important;
  padding:16px 22px 18px!important;
}
html.embedded-phone .event-card{
  width:var(--card-w)!important;
  min-width:var(--card-w)!important;
}
html.embedded-phone .card-head{
  padding:14px 16px 10px!important;
}
html.embedded-phone .card-head-top{
  margin-bottom:10px!important;
}
html.embedded-phone .card-head-left{
  gap:7px!important;
}
html.embedded-phone .card-mo-day,
html.embedded-phone .card-index{
  font-size:0.52rem!important;
}
html.embedded-phone .card-year-row{
  gap:8px!important;
}
html.embedded-phone .card-year{
  font-size:2.55rem!important;
}
html.embedded-phone .card-month-abbr{
  font-size:0.68rem!important;
}
html.embedded-phone .card-body{
  padding:12px 16px 14px!important;
}
html.embedded-phone .card-pills{
  gap:5px!important;
  margin-bottom:9px!important;
}
html.embedded-phone .pill{
  font-size:0.56rem!important;
  padding:3px 8px!important;
}
html.embedded-phone .card-title{
  font-size:0.8rem!important;
  line-height:1.22!important;
  margin-bottom:9px!important;
}
html.embedded-phone .card-actor{
  font-size:0.55rem!important;
  padding:3px 8px!important;
  margin-bottom:10px!important;
}
html.embedded-phone .card-desc{
  font-size:0.73rem!important;
  line-height:1.42!important;
  padding-right:2px!important;
}
html.embedded-phone .event-card.card-compact .card-year{
  font-size:2.28rem!important;
}
html.embedded-phone .event-card.card-compact .card-title{
  font-size:0.75rem!important;
  line-height:1.18!important;
}
html.embedded-phone .event-card.card-compact .card-actor{
  font-size:0.52rem!important;
  margin-bottom:8px!important;
}
html.embedded-phone .event-card.card-compact .card-desc{
  font-size:0.69rem!important;
  line-height:1.34!important;
}
html.embedded-phone .event-card.card-dense .card-head{
  padding:12px 14px 8px!important;
}
html.embedded-phone .event-card.card-dense .card-body{
  padding:10px 14px 12px!important;
}
html.embedded-phone .event-card.card-dense .card-year{
  font-size:2.08rem!important;
}
html.embedded-phone .event-card.card-dense .card-month-abbr{
  font-size:0.62rem!important;
}
html.embedded-phone .event-card.card-dense .pill{
  font-size:0.52rem!important;
  padding:2px 7px!important;
}
html.embedded-phone .event-card.card-dense .card-title{
  font-size:0.71rem!important;
  line-height:1.14!important;
  margin-bottom:8px!important;
}
html.embedded-phone .event-card.card-dense .card-actor{
  font-size:0.5rem!important;
  padding:2px 7px!important;
  margin-bottom:8px!important;
}
html.embedded-phone .event-card.card-dense .card-desc{
  font-size:0.65rem!important;
  line-height:1.28!important;
  mask-image:none!important;
  -webkit-mask-image:none!important;
}
html.embedded-phone .card-desc,
html.embedded-phone .event-card.card-compact .card-desc,
html.embedded-phone .event-card.card-dense .card-desc{
  flex:0 1 auto!important;
  min-height:64px!important;
  max-height:clamp(86px,22svh,150px)!important;
  overflow-y:scroll!important;
  overflow-x:hidden!important;
  padding-right:12px!important;
  scrollbar-gutter:stable!important;
  scrollbar-width:thin!important;
  scrollbar-color:rgba(29,29,31,.42) transparent!important;
  mask-image:none!important;
  -webkit-mask-image:none!important;
  overscroll-behavior-y:contain!important;
  -webkit-overflow-scrolling:touch!important;
}
/* ── phone/tablet: hide "or use ←→" hint ── */
html.embedded-phone .drag-hint-line2{display:none!important;}
html.embedded-tablet .drag-hint-line2{display:none!important;}
/* ── phone: year-bar buttons vertically centred ── */
html.embedded-phone .year-bar{
  height:auto!important;
  padding-top:12px!important;
  padding-bottom:12px!important;
  align-items:center!important;
  justify-content:space-between!important;
}
/* ── phone: inside-map calendar list scrolls within the events panel ── */
html.embedded-phone .cpe-list{scrollbar-width:thin!important;scrollbar-color:rgba(29,29,31,.28) transparent!important;}
html.embedded-phone .cpe-list::-webkit-scrollbar{display:block!important;width:4px!important;height:4px!important;}
html.embedded-phone .cpe-list::-webkit-scrollbar-track{background:transparent!important;margin:6px 0!important;}
html.embedded-phone .cpe-list::-webkit-scrollbar-thumb{background:rgba(29,29,31,.28)!important;border-radius:99px!important;}
html.embedded-phone .cpe-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;}
html.embedded-phone .cpe-head-copy{flex:1 1 auto!important;min-width:0!important;}
html.embedded-phone .cpe-fullscreen-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:36px!important;height:36px!important;flex:0 0 36px!important;margin-top:-2px!important;border:1px solid rgba(29,29,31,.16)!important;border-radius:999px!important;background:rgba(248,248,250,.96)!important;color:#1d1d1f!important;font-size:18px!important;line-height:1!important;box-shadow:0 8px 20px -16px rgba(0,0,0,.3)!important;cursor:pointer!important;touch-action:manipulation!important;}
html.embedded-phone .cpe-fullscreen-close{display:none!important;font-size:24px!important;transform:translateY(-1px)!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen{position:fixed!important;inset:0!important;z-index:5000!important;width:100vw!important;height:100svh!important;max-height:none!important;min-height:0!important;flex:none!important;display:flex!important;flex-direction:column!important;border:0!important;border-radius:0!important;background:rgba(248,248,250,.96)!important;padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;box-shadow:none!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-head{padding:8px 0 14px!important;border-bottom:1px solid rgba(29,29,31,.1)!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-list{flex:1 1 auto!important;height:auto!important;max-height:none!important;padding:14px 8px 0 0!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-fullscreen-open{display:none!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen .cpe-fullscreen-close{display:block!important;}
html.embedded-phone .cpevs-panel.cpe-fullscreen{opacity:0;transform:translateY(12px);transition:opacity .26s ease,transform .28s cubic-bezier(.22,1,.36,1);}
html.embedded-phone .cpevs-panel.cpe-fullscreen.cpe-fullscreen-visible{opacity:1;transform:translateY(0);}
html.embedded-phone .cpevs-panel.cpe-fullscreen.cpe-fullscreen-closing{opacity:0;transform:translateY(10px);pointer-events:none!important;}
.cpevs-panel:not(.cpe-fullscreen-capable) .cpe-fullscreen-btn,
.cpe-fullscreen-btn[hidden]{
  display:none!important;
  pointer-events:none!important;
}
.cpevs-panel.cpe-fullscreen-capable .cpe-fullscreen-btn{
  display:inline-flex!important;
}
.cpevs-panel.cpe-fullscreen .cpe-fullscreen-btn{
  width:36px!important;
  height:36px!important;
  flex:0 0 36px!important;
  margin-top:-2px!important;
  margin-right:0!important;
  font-size:18px!important;
  overflow:visible!important;
}
.cpevs-panel.cpe-fullscreen .cpe-fullscreen-btn::before{
  content:''!important;
  position:absolute!important;
  inset:-12px!important;
  border-radius:999px!important;
}
/* ── phone: FIELD bar — hide category legend tags ── */
html.embedded-phone .cat-legend{display:none!important;}
/* ── phone: equal-width filter + toggle buttons, icon pinned right ── */
html.embedded-phone .yb-right{flex:1!important;}
html.embedded-phone .toggle-btn{width:100%!important;}
html.embedded-phone #toggle-label{flex:1!important;text-align:left!important;}
/* ── phone: year labels clickable cursor ── */
html.embedded-phone .year-labels-row{
  height:22px!important;
  z-index:4!important;
}
html.embedded-phone .yr-lbl{
  cursor:pointer!important;
  min-width:28px!important;
  min-height:24px!important;
  display:flex!important;
  align-items:flex-start!important;
  justify-content:center!important;
  padding-top:2px!important;
  touch-action:manipulation!important;
  pointer-events:auto!important;
}
html.embedded-phone .node::before{
  content:''!important;
  position:absolute!important;
  left:50%!important;
  bottom:-10px!important;
  width:28px!important;
  height:58px!important;
  transform:translateX(-50%)!important;
  pointer-events:none!important;
}
html.embedded-phone .card-desc{
  flex:0 1 auto!important;
  min-height:64px!important;
  max-height:clamp(86px,22svh,150px)!important;
  overflow-y:scroll!important;
  overflow-x:hidden!important;
  padding-right:12px!important;
  scrollbar-gutter:stable!important;
  scrollbar-width:thin!important;
  scrollbar-color:rgba(29,29,31,.42) transparent!important;
  mask-image:none!important;
  -webkit-mask-image:none!important;
  overscroll-behavior-y:contain!important;
  -webkit-overflow-scrolling:touch!important;
}
html.embedded-phone .card-desc::-webkit-scrollbar{
  display:block!important;
  width:4px!important;
  height:4px!important;
}
html.embedded-phone .card-desc::-webkit-scrollbar-track{
  display:block!important;
  background:transparent!important;
  margin:2px 0!important;
}
html.embedded-phone .card-desc::-webkit-scrollbar-thumb{
  display:block!important;
  background:rgba(29,29,31,.38)!important;
  border-radius:999px!important;
}
`;

    try{
      const tlFrame = document.getElementById('timeline2-frame');
      if(!tlFrame) return;
      if(!tlFrame.dataset.codexAdaptiveBound){
        tlFrame.dataset.codexAdaptiveBound = '1';
        tlFrame.addEventListener('load', () => {
          requestAnimationFrame(() => window.applyAdaptiveAppMode?.());
        });
      }

      const tlWindow = tlFrame.contentWindow || null;
      const tlDoc = tlFrame.contentDocument || tlWindow?.document || null;
      if(!tlDoc) return;

      tlDoc.documentElement.classList.toggle('embedded-phone', phoneEnabled);
      tlDoc.documentElement.classList.toggle('embedded-tablet', tabletEnabled);
      ensureEmbeddedStyle(tlDoc, 'codex-timeline-mobile-patches', timelineCss);
      ensureEmbeddedStyle(tlDoc, 'codex-chat-highlight', chatHighlightCss);
      installTimeline2OverviewCollisionPatch(tlWindow);
      installTimeline2TouchZoomPatch(tlWindow);
      tlWindow?.forceTimelineLayout?.();

      const outsideFrame = tlDoc.getElementById('outside-frame');
      if(outsideFrame && !outsideFrame.dataset.codexAdaptiveBound){
        outsideFrame.dataset.codexAdaptiveBound = '1';
        outsideFrame.addEventListener('load', () => {
          requestAnimationFrame(() => window.applyAdaptiveAppMode?.());
        });
      }

      const outsideWin = outsideFrame?.contentWindow || null;
      const outsideDoc = outsideFrame?.contentDocument || outsideWin?.document || null;
      if(!outsideDoc) return;

      outsideDoc.documentElement.classList.toggle('embedded-phone', phoneEnabled);
      outsideDoc.documentElement.classList.toggle('embedded-tablet', tabletEnabled);
      ensureEmbeddedStyle(outsideDoc, 'codex-outside-mobile-patches', outsideCss);
      ensureEmbeddedStyle(outsideDoc, 'codex-chat-highlight', chatHighlightCss);
    }catch(e){}
  }

  function syncEmbeddedAdaptiveFrames(){
    try{
      const phoneEnabled = document.documentElement.classList.contains('phone-app');
      const tabletEnabled = document.documentElement.classList.contains('tablet-app');
      const tlFrame = document.getElementById('timeline2-frame');
      const tlWindow = tlFrame?.contentWindow || null;
      const tlDoc = tlFrame?.contentDocument || tlWindow?.document || null;
      tlWindow?.syncEmbeddedAppMode?.();
      tlWindow?.syncTimelineAdaptiveUi?.();
      const outsideWin = tlDoc?.getElementById('outside-frame')?.contentWindow || null;
      outsideWin?.syncEmbeddedAppMode?.();
      outsideWin?.syncOutsideAdaptiveUi?.();
      applyEmbeddedMobileOverrides(phoneEnabled, tabletEnabled);
    }catch(e){}
  }

  function applyAdaptiveAppMode(){
    const composeLocked = document.documentElement.classList.contains('chat-compose-active');
    if(composeLocked){
      const lockedHeight = parseFloat(document.documentElement.style.getPropertyValue('--chat-stable-vh-px'));
      const viewportHeight = Number.isFinite(lockedHeight) && lockedHeight > 0
        ? lockedHeight
        : (window.innerHeight || document.documentElement.clientHeight || 0);
      document.documentElement.style.setProperty('--app-vh', `${viewportHeight * 0.01}px`);
      return;
    }
    const phoneEnabled = isPhoneAppMode();
    const tabletEnabled = !phoneEnabled && isTabletAppMode();
    const compactMap = shouldUseCompactMapDensity(phoneEnabled, tabletEnabled);
    document.documentElement.classList.toggle('phone-app', phoneEnabled);
    document.documentElement.classList.toggle('tablet-app', tabletEnabled);
    document.documentElement.classList.toggle('map-density-compact', compactMap);
    /* Don't shrink the layout when the keyboard opens for a chat input on phone.
       The chat system repositions itself via visualViewport; the shell must stay put. */
    const ae = document.activeElement;
    const chatInputFocused = phoneEnabled && ae &&
      (ae.id === 'chat-widget-input' || ae.id === 'chat-page-input');
    if(!chatInputFocused){
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
    }
    if(phoneEnabled && document.body.classList.contains('on-timeline') && typeof window.showPhaseView === 'function'){
      window.showPhaseView();
    }
    syncEmbeddedAdaptiveFrames();
    requestAnimationFrame(()=>window.scheduleResponsiveCollisionHides?.());
  }

  window.isPhoneAppMode = isPhoneAppMode;
  window.isTabletAppMode = isTabletAppMode;
  window.applyAdaptiveAppMode = applyAdaptiveAppMode;

  applyAdaptiveAppMode();
  window.addEventListener('resize', ()=>requestAnimationFrame(applyAdaptiveAppMode), {passive:true});
  window.addEventListener('orientationchange', ()=>requestAnimationFrame(applyAdaptiveAppMode), {passive:true});
  window.addEventListener('pageshow', applyAdaptiveAppMode, {passive:true});
})();

/* Phone map: fade-out popup pane when user taps map to dismiss */
(function(){
  var fadeAttached=false;
  function getMap(){
    return typeof window.getKirunaLeafletMap==='function' ? window.getKirunaLeafletMap() : null;
  }
  function attachFade(){
    var map=getMap();
    if(fadeAttached||!map)return;
    fadeAttached=true;
    map.on('click',function(){
      if(!window.isPhoneAppMode||!window.isPhoneAppMode())return;
      if(!window._mapPopupOpen)return;
      var pane=document.querySelector('#leaflet-map .leaflet-popup-pane');
      if(!pane)return;
      pane.style.opacity='0';
      setTimeout(function(){if(pane)pane.style.opacity='';},340);
    });
  }
  var iv=setInterval(function(){if(getMap()){attachFade();clearInterval(iv);}},300);
  setTimeout(function(){clearInterval(iv);},15000);
})();

/* Mobile map search bar — phone-app only, wired to existing EVS/CL/selectEvent */
(function(){
  var inp = document.getElementById('mobile-map-search-input');
  var res = document.getElementById('mobile-map-search-results');
  if(!inp || !res) return;
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  inp.addEventListener('input', function(){
    var q = inp.value.trim().toLowerCase();
    res.innerHTML = '';
    if(!q) return;
    var evList = (typeof EVS !== 'undefined') ? EVS : [];
    var matches = evList.filter(function(ev){
      return ev.title.toLowerCase().includes(q) ||
        (ev.desc && ev.desc.toLowerCase().includes(q)) ||
        (ev.tags && ev.tags.some(function(t){ return t.toLowerCase().includes(q); })) ||
        String(ev.year).includes(q) ||
        (typeof CL !== 'undefined' && CL[ev.cat] && CL[ev.cat].toLowerCase().includes(q));
    }).slice(0, 8);
    matches.forEach(function(ev){
      var item = document.createElement('div');
      item.className = 'mmsr-item';
      var cat = (typeof CL !== 'undefined' && CL[ev.cat]) ? esc(CL[ev.cat]) : '';
      item.innerHTML = '<div class="mmsr-item-title">'+esc(ev.title)+'</div>' +
        '<div class="mmsr-item-meta">'+(ev.year ? esc(String(ev.year)) : '')+(cat ? ' · '+cat : '')+'</div>';
      item.addEventListener('click', function(){
        inp.value = '';
        res.innerHTML = '';
        inp.blur();
        if(typeof selectEvent === 'function') selectEvent(ev.id);
      });
      res.appendChild(item);
    });
  });
  inp.addEventListener('blur', function(){
    setTimeout(function(){ res.innerHTML = ''; }, 200);
  });
})();
