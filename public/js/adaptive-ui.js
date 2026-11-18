
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

  function applyEmbeddedMobileOverrides(phoneEnabled, tabletEnabled){
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
      installTimeline2OverviewCollisionPatch(tlWindow);
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
