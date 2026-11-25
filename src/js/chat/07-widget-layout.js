  function clamp(value,min,max){
    return Math.max(min,Math.min(max,value));
  }

  function isAdaptiveTouchChatLayout(){
    return document.documentElement.classList.contains('phone-app') || document.documentElement.classList.contains('tablet-app');
  }

  function getVisualViewportMetrics(){
    const vv=window.visualViewport;
    const width=Math.max(0,vv?.width||window.innerWidth||0);
    const height=Math.max(0,vv?.height||window.innerHeight||0);
    const left=vv?.offsetLeft||0;
    const top=vv?.offsetTop||0;
    return {
      width,
      height,
      left,
      top,
      right:left+width,
      bottom:top+height
    };
  }

  function getFocusedChatInput(){
    const active=document.activeElement;
    return active===els.widgetInput||active===els.pageInput ? active : null;
  }

  function syncPageChatViewport(){
    const page=document.getElementById('page-chat');
    const content=document.getElementById('content');
    if(!page||!content){
      return;
    }
    if(!isAdaptiveTouchChatLayout()){
      page.style.removeProperty('--chat-page-visible-height');
      page.style.removeProperty('height');
      return;
    }
    const viewport=getVisualViewportMetrics();
    const contentRect=content.getBoundingClientRect();
    const visibleHeight=clamp(viewport.bottom-contentRect.top, 260, Math.max(260, contentRect.height));
    page.style.setProperty('--chat-page-visible-height', visibleHeight+'px');
    page.style.height=visibleHeight+'px';
  }

  function syncChatViewportLayout(opts){
    syncPageChatViewport();
    if(state.panelOpen) positionPanel();
    if(opts?.scroll===false) return;
    requestAnimationFrame(()=>{
      scrollThreadToBottom(els.widgetThread,{force:true});
      scrollThreadToBottom(els.pageThread,{force:true});
      refreshRailLayout(els.widgetThread, els.widgetRail);
      refreshRailLayout(els.pageThread, els.pageRail);
    });
  }

  function getDefaultFabPos(){
    return {
      x:Math.max(12,window.innerWidth-36),
      y:Math.max(12,window.innerHeight-120)
    };
  }

  function applyFabPos(nextPos){
    const size=els.fab.offsetWidth||18;
    const x=clamp(nextPos.x,8,Math.max(8,window.innerWidth-size-8));
    const y=clamp(nextPos.y,8,Math.max(8,window.innerHeight-size-8));
    state.fabPos={x,y};
    els.fab.style.left=x+'px';
    els.fab.style.top=y+'px';
    if(state.panelOpen) positionPanel();
    if(els.welcome&&!els.welcome.hidden) positionWelcome();
  }

  function positionWelcome(){
    if(!els.welcome||els.welcome.hidden) return;
    const fab=els.fab.getBoundingClientRect();
    const width=els.welcome.offsetWidth;
    const height=els.welcome.offsetHeight;
    const left=clamp(fab.right-width,12,Math.max(12,window.innerWidth-width-12));
    const top=fab.top-height-12>=12 ? fab.top-height-12 : fab.bottom+12;
    els.welcome.style.left=left+'px';
    els.welcome.style.top=clamp(top,12,Math.max(12,window.innerHeight-height-12))+'px';
  }

  let welcomePage='';
  function maybeShowWelcome(){
    if(state.welcomeDismissed||window.__kirunaIsReload) return;
    const introVisible=['kiruna-intro-pending','kiruna-intro-active','kiruna-intro-exiting','kiruna-intro-revealing']
      .some(name=>document.body.classList.contains(name));
    if(introVisible) return;
    if(els.welcome.hidden){
      welcomePage=getCurrentPageName();
      els.welcome.hidden=false;
      positionWelcome();
    }else if(getCurrentPageName()!==welcomePage){
      dismissWelcome();
    }
  }
  const welcomeObserver=new MutationObserver(maybeShowWelcome);

  function dismissWelcome(){
    state.welcomeDismissed=true;
    if(els.welcome) els.welcome.hidden=true;
    welcomeObserver.disconnect();
  }

  function positionPanel(){
    if(document.documentElement.classList.contains('chat-compose-active')) return;
    const viewport=getVisualViewportMetrics();
    const adaptive=isAdaptiveTouchChatLayout();
    const keyboardLikelyOpen=adaptive && !!getFocusedChatInput() && (window.innerHeight-viewport.height>120);
    const edgeInset=adaptive ? 10 : 16;
    const panelWidth=adaptive
      ? Math.min(420,Math.max(280,viewport.width-edgeInset*2))
      : Math.min(420,Math.max(280,window.innerWidth-32));
    const panelHeight=adaptive
      ? Math.max(280,Math.min(620,viewport.height-edgeInset*2))
      : Math.min(620,Math.max(360,viewport.height-48));
    const fabRect=els.fab.getBoundingClientRect();
    let left;
    let top;
    if(adaptive&&keyboardLikelyOpen){
      left=viewport.left+Math.max(edgeInset,(viewport.width-panelWidth)/2);
      top=viewport.top+edgeInset;
    }else{
      left=fabRect.right+14;
      if(left+panelWidth>viewport.right-edgeInset){
        left=fabRect.left-panelWidth-14;
      }
      if(left<viewport.left+edgeInset){
        left=Math.max(viewport.left+edgeInset,viewport.right-panelWidth-edgeInset);
      }
      top=fabRect.top-24;
      if(top+panelHeight>viewport.bottom-edgeInset){
        top=viewport.bottom-panelHeight-edgeInset;
      }
      top=Math.max(viewport.top+edgeInset,top);
    }
    els.panel.style.setProperty('--chat-floating-visible-height',panelHeight+'px');
    els.panel.style.width=panelWidth+'px';
    els.panel.style.height=panelHeight+'px';
    els.panel.style.left=left+'px';
    els.panel.style.top=top+'px';
    scheduleChatEmptyOverlapState();
  }

  let panelCloseAnimTimer=null;

  function clearPanelClosingState(){
    clearTimeout(panelCloseAnimTimer);
    panelCloseAnimTimer=null;
    els.panel.classList.remove('closing');
    els.panel.style.removeProperty('--chat-close-origin-x');
    els.panel.style.removeProperty('--chat-close-origin-y');
  }

  function preparePanelOpenAnimation(){
    const fabRect=els.fab.getBoundingClientRect();
    const panelLeft=parseFloat(els.panel.style.left)||els.panel.offsetLeft||0;
    const panelTop=parseFloat(els.panel.style.top)||els.panel.offsetTop||0;
    if(!els.panel.offsetWidth||!els.panel.offsetHeight||!fabRect.width||!fabRect.height) return false;
    const originX=(fabRect.left+fabRect.width/2)-panelLeft;
    const originY=(fabRect.top+fabRect.height/2)-panelTop;
    els.panel.style.setProperty('--chat-open-origin-x',originX+'px');
    els.panel.style.setProperty('--chat-open-origin-y',originY+'px');
    void els.panel.offsetWidth;
    return true;
  }

  function preparePanelCloseAnimation(){
    if(document.body.classList.contains('on-chat')) return false;
    const panelRect=els.panel.getBoundingClientRect();
    const fabRect=els.fab.getBoundingClientRect();
    if(!panelRect.width||!panelRect.height||!fabRect.width||!fabRect.height) return false;
    const originX=(fabRect.left+fabRect.width/2)-panelRect.left;
    const originY=(fabRect.top+fabRect.height/2)-panelRect.top;
    els.panel.style.setProperty('--chat-close-origin-x',originX+'px');
    els.panel.style.setProperty('--chat-close-origin-y',originY+'px');
    els.panel.classList.add('closing');
    void els.panel.offsetWidth;
    panelCloseAnimTimer=setTimeout(clearPanelClosingState,340);
    return true;
  }

  function openPanel(){
    dismissWelcome();
    clearPanelClosingState();
    state.panelOpen=true;
    document.documentElement.classList.add('chat-widget-open');
    acknowledgeChatFabNotice();
    syncChatComposeViewportVars(false);
    positionPanel();
    preparePanelOpenAnimation();
    els.panel.classList.add('open');
    if(!els.fab.classList.contains('open')) els.fab.classList.add('open');
    els.panel.setAttribute('aria-hidden','false');
    renderChatViews();
    syncChatViewportLayout({scroll:false});
    setTimeout(()=>{
      els.widgetInput.focus();
      syncChatViewportLayout();
    },80);
  }

  function closePanel(){
    const shouldAnimate=state.panelOpen&&preparePanelCloseAnimation();
    state.panelOpen=false;
    document.documentElement.classList.remove('chat-widget-open');
    exitChatComposeMode();
    els.panel.classList.remove('open');
    els.fab.classList.remove('open');
    els.panel.classList.remove('chat-empty-overlap-hidden');
    els.panel.setAttribute('aria-hidden','true');
    if(!shouldAnimate) clearPanelClosingState();
    syncChatViewportLayout({scroll:false});
  }

  window.closeFloatingChatPanel=closePanel;
  window.openFloatingChatPanel=openPanel;

  function togglePanel(){
    if(state.panelOpen) closePanel();
    else openPanel();
  }

  function normalizeTextareaHeight(textarea){
    if(!textarea)return;
    textarea.style.height='0px';
    textarea.style.height=Math.min(textarea.scrollHeight,144)+'px';
  }

  function syncWidgetDraftState(){
    if(!els.widgetThread) return;
    const hasDraft=!!normalizeSearchText(els.widgetInput?.value||'');
    els.widgetThread.classList.toggle('chat-has-draft',hasDraft);
  }

  function rectsOverlap(a,b,pad){
    const gap=pad||0;
    if(!a||!b||!a.width||!a.height||!b.width||!b.height) return false;
    return a.left < b.right + gap &&
      a.right > b.left - gap &&
      a.top < b.bottom + gap &&
      a.bottom > b.top - gap;
  }

  function updateChatRailClipState(rail,form){
    if(!rail||!form){
      return;
    }
    if(rail===els.pageRail&&document.querySelector('#page-chat .chat-page-shell')?.classList.contains('board-expanded')){
      rail.style.removeProperty('--chat-rail-bottom-cut');
      return;
    }
    const railRect=rail.getBoundingClientRect();
    const formRect=form.getBoundingClientRect();
    if(!railRect.width||!railRect.height||!formRect.width||!formRect.height){
      rail.style.removeProperty('--chat-rail-bottom-cut');
      return;
    }
    const overlap=Math.max(0,railRect.bottom-formRect.top);
    if(overlap>0){
      rail.style.setProperty('--chat-rail-bottom-cut',Math.ceil(overlap+1)+'px');
    }else{
      rail.style.removeProperty('--chat-rail-bottom-cut');
    }
  }

  function updateChatEmptyOverlapState(){
    if(!els.panel||!els.widgetThread) return;
    const adaptive=document.documentElement.classList.contains('phone-app')||
      document.documentElement.classList.contains('tablet-app');
    if(!adaptive||!state.panelOpen){
      els.panel.classList.remove('chat-empty-overlap-hidden');
      return;
    }

    els.panel.classList.remove('chat-empty-overlap-hidden');
    if(!threadHasOnlyEmptyState(els.widgetThread)){
      return;
    }

    const card=els.widgetThread.querySelector('.chat-empty-card');
    if(!card){
      return;
    }

    const cardRect=card.getBoundingClientRect();
    const railRect=els.widgetRail?.getBoundingClientRect();
    const formRect=els.widgetForm?.getBoundingClientRect();
    const shouldHide=rectsOverlap(cardRect,railRect,10)||rectsOverlap(cardRect,formRect,10);
    els.panel.classList.toggle('chat-empty-overlap-hidden',shouldHide);
  }

  function scheduleChatEmptyOverlapState(){
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        updateChatRailClipState(els.widgetRail,els.widgetForm);
        updateChatRailClipState(els.pageRail,els.pageForm);
        updateChatEmptyOverlapState();
      });
    });
  }

  function threadHasOnlyEmptyState(thread){
    if(!thread||state.turns.length) return false;
    return thread.classList.contains('chat-empty-thread')||
      (!!thread.querySelector('.chat-empty')&&!thread.querySelector('.chat-turn'));
  }

  function scrollThreadToBottom(thread,opts){
    if(!thread)return;
    if(threadHasOnlyEmptyState(thread)){
      thread.scrollTop=0;
      syncRailActive(thread, thread._chatRail);
      return;
    }
    if(state.activeTurnId&&!opts?.force) return;
    thread.scrollTop=thread.scrollHeight;
    syncRailActive(thread, thread._chatRail);
  }
