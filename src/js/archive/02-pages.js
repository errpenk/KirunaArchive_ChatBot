function showPage(p,fromPage){
  if(p==='report') p='discourse';
  // Dismiss the chat-source return button whenever the page changes
  if(typeof window.clearChatSourceReturnAnchor==='function') window.clearChatSourceReturnAnchor();
  const prev=activePage;
  const viaTopNav=fromPage===undefined && prev!==p;
  activePage=p;
  window.KirunaRoutes.page(p);

  /* ── Determine entrance direction from nav tab order ── */
  const NAV_ORDER=['home','archive','timeline2','gallery','discourse','chat'];
  const prevIdx=NAV_ORDER.indexOf(prev);
  const nextIdx=NAV_ORDER.indexOf(p);
  // fromPage===undefined means nav tab click; otherwise programmatic (back btn, card click)
  let enterClass='page-enter-up';
  // NAV TAB CLICKS: slide left/right. Only upward slide for programmatic transitions without order.
  if(prevIdx>=0 && nextIdx>=0){
    enterClass = nextIdx > prevIdx ? 'page-enter-right' : 'page-enter-left';
  }

  // Track page on body for CSS gating
  document.body.className=document.body.className.replace(/\bon-\w+/g,'').trim();
  document.body.classList.add('on-'+p);

  const PAGES=['home','archive','timeline2','gallery','discourse','chat'];
  const incoming=document.getElementById('page-'+p);
  PAGES.forEach(x=>{
    const el=document.getElementById('page-'+x);
    if(!el) return;
    if(x!==p){
      el.classList.remove('page-enter-right','page-enter-left','page-enter-up');
      el.classList.add('off');
    }
  });

  if(incoming){
    incoming.classList.remove('off','page-enter-right','page-enter-left','page-enter-up');
    incoming.getBoundingClientRect();
    if(prev!==p){
      incoming.classList.add(enterClass);
      incoming.addEventListener('animationend',()=>{
        incoming.classList.remove('page-enter-right','page-enter-left','page-enter-up');
      },{once:true});
    }
  }

  PAGES.forEach(x=>{
    const el=document.getElementById('ntab-'+x);
    if(el)el.classList.toggle('on',x===p);
  });
  if(p==='archive'){
    // Entering Archive from the top nav should always restore the map overview,
    // not preserve a previously focused event from a cross-page jump.
    if(viaTopNav){
      resetArchiveOverviewState({recenter:false});
    }
    // Track origin for back button
    if(fromPage&&fromPage!=='archive'){_mapOriginPage=fromPage;}
    else if(prev&&prev!=='archive'){_mapOriginPage=prev;}
    else if(!_mapOriginPage){_mapOriginPage=null;}
    const backBtn=document.getElementById('map-back-btn');
    if(_mapOriginPage&&backBtn){
      backBtn.style.display='flex';
      _setBackLabel(
        backBtn,
        ({home:'Home',timeline2:'Timeline',discourse:'Discourse',chat:'Chat'}[_mapOriginPage]||_mapOriginPage),
        {chatReturn:_mapOriginPage==='chat'}
      );
    } else if(backBtn){backBtn.style.display='none';}
    renderSidebarTL();renderSidebarCal();setTimeout(()=>{initMap();renderMarkers();if(viaTopNav) resetArchiveOverviewState();if(window._syncMapChromeState)window._syncMapChromeState();setTimeout(observeRulerTicks,200);
    // Force Leaflet to recalculate map size in case it was hidden during init
    if(leafletMap){setTimeout(()=>{leafletMap.invalidateSize({animate:false});},80);}
    },30);
  } else {
    _mapOriginPage=null;
    const backBtn=document.getElementById('map-back-btn');
    if(backBtn)backBtn.style.display='none';
    if(window._resetMapChromeState) window._resetMapChromeState();
  }

  if(p==='timeline2'){
    if(fromPage==='preserve'){
      // keep the existing timeline origin
    } else if(fromPage&&fromPage!=='timeline2'){
      _timeline2OriginPage=fromPage;
    } else if(!fromPage){
      _timeline2OriginPage=null;
    }
    if(viaTopNav){
      resetTimeline2OverviewState();
    }
    updateTimeline2BackButton();
    try{
      const tlFrame=document.getElementById('timeline2-frame');
      tlFrame?.contentWindow?.forceTimelineLayout?.();
      tlFrame?.contentWindow?.alignHeaderCenterToParentTabs?.();
    }catch(e){}
    scheduleTimeline2NavAlignment();
  } else {
    setTimelineNavOffset(0);
    const tl2BackBtn=document.getElementById('timeline2-back-btn');
    if(tl2BackBtn) tl2BackBtn.style.display='none';
  }

  if(p==='chat'){
    if(typeof window.acknowledgeChatFabNotice==='function') window.acknowledgeChatFabNotice();
    if(fromPage&&fromPage!=='chat'){
      _chatOriginPage=fromPage;
    } else if(!fromPage){
      _chatOriginPage=null;
    }
    updateChatBackButton();
    requestAnimationFrame(()=>{
      if(typeof window.refreshChatUI==='function') window.refreshChatUI();
    });
  } else {
    updateChatBackButton();
  }

  if(p==='home'){
    requestAnimationFrame(()=>{
      observeHomeSections(); // builds observer once; scroll loop runs continuously
      observeHTLNodes();
    });
  }
  if(p==='discourse'&&!window._discourseInitialized){
    window._discourseInitialized=true;
    initDiscourse();
  }
  /* Re-observe active discourse panel when returning to discourse page */
  if(p==='discourse' && window._discourseInitialized){
    setTimeout(()=>{
      const activePanel = document.querySelector('#page-discourse .dc-platform-panel.on');
      if(activePanel && window._reObserveDcPanel) window._reObserveDcPanel(activePanel);
    }, 120);
  }
  /* When entering discourse, start from the hero top. */
  if(p==='discourse'){
    const btnTop=document.getElementById('dc-btn-top');
    const trigger=document.getElementById('dc-toc-trigger');
    const tocPanel=document.getElementById('dc-toc-panel');
    const edge=document.getElementById('dc-toc-edge');
    if(btnTop) { btnTop.style.display='flex'; }
    if(trigger) { trigger.style.display='block'; }
    if(tocPanel) { tocPanel.style.display='flex'; }
    if(edge) edge.classList.add('show');
    /* Restore INDEX tab immediately to avoid the white gap after navigation */
    const dcTab=document.getElementById('dc-toc-tab');
    if(dcTab) {
      dcTab.style.display='flex';
      dcTab.style.transition='none';
      dcTab.classList.add('show');
      dcTab.classList.add('dc-tab-visible');
      dcTab.style.pointerEvents='auto';
      requestAnimationFrame(()=>{ dcTab.style.transition=''; });
    }
    setTimeout(()=>{
      const dcPage = document.getElementById('page-discourse');
      if(dcPage){
        dcPage.scrollTo({top: 0, behavior:'instant'});
      }
      if(window._resizeDiscourseCharts){
        setTimeout(()=>window._resizeDiscourseCharts(),120);
      }
    }, 40);
  }
  if(p==='timeline2'){
    ensureTimeline2FrameLoaded();
  }
  if(p==='chat' && window.closeFloatingChatPanel){
    window.closeFloatingChatPanel();
    if(window.refreshChatUI) setTimeout(()=>window.refreshChatUI(),40);
  }
  if(p==='gallery'){
    if(window.buildGallery) window.buildGallery();
    // Show back button if we came from somewhere
    const backBtn=document.getElementById('gallery-back-btn');
    if(backBtn){
      const origin=fromPage&&fromPage!=='gallery'?fromPage:(prev&&prev!=='gallery'?prev:null);
      window._galleryOriginPage=origin||window._galleryOriginPage||null;
      if(window._galleryOriginPage){
        backBtn.hidden=false;
        const label={home:'Home',archive:'Map',timeline2:'Time',discourse:'Discourse',chat:'Chat'};
        _setBackLabel(
          backBtn,
          label[window._galleryOriginPage]||window._galleryOriginPage,
          {chatReturn:window._galleryOriginPage==='chat'}
        );
      } else {
        backBtn.hidden=true;
      }
    }
  } else {
    window._galleryOriginPage=null;
  }
  /* Hide discourse fixed UI when on other pages; show when on discourse */
  if(p!=='discourse' && window._discourseInitialized){
    if(window.hideDcFixed) window.hideDcFixed();
  }
  /* Always close compare panel + fullscreen when leaving discourse */
  if(p!=='discourse'){
    if(window.closeComparePanel) window.closeComparePanel({immediate:true});
    if(window.closeCmpFullscreen) window.closeCmpFullscreen();
  }
  scheduleResponsiveCollisionHides();
}
window.showPage=showPage;
