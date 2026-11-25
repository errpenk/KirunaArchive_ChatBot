
(function(){
  const CHAT_HISTORY_KEY='kiruna_chat_history_v1';
  const CHAT_FAB_KEY='kiruna_chat_fab_position_v1';
  const CHAT_MAX_TURNS=48;
  const MAX_SOURCE_CARDS=6;
  const AI_SOURCE_CARD_LIMIT=3;
  const CHAT_API_ENDPOINT='/api/chat';
  const CHAT_ARCHIVE_ANSWER_ENDPOINT='/api/archive-answer';
  const CHAT_WEAK_WEB_ENDPOINT='/api/weak-web-search';
  const state={
    turns:loadTurns(),
    requestInFlight:false,
    panelOpen:false,
    activeTurnId:null,
    pendingWeakSuggestion:null,
    pendingExternalSuggestion:null,
    fabPos:loadFabPos(),
    drag:null,
    suppressFabClick:false,
    welcomeDismissed:false
  };
  let chatSourceReturnState=null;
  let chatActiveTurnTimer=null;
  let chatFabStatusTimer=null;

  const els={
    fab:document.getElementById('chat-fab'),
    welcome:document.getElementById('chat-welcome'),
    panel:document.getElementById('chat-panel'),
    panelClose:document.getElementById('chat-close-btn'),
    panelOpenPage:document.getElementById('chat-open-page-btn'),
    widgetRail:document.getElementById('chat-widget-rail'),
    pageRail:document.getElementById('chat-page-rail'),
    pageSourceRail:document.getElementById('chat-page-source-rail'),
    widgetThread:document.getElementById('chat-widget-thread'),
    pageThread:document.getElementById('chat-page-thread'),
    widgetForm:document.getElementById('chat-widget-form'),
    pageForm:document.getElementById('chat-page-form'),
    widgetInput:document.getElementById('chat-widget-input'),
    pageInput:document.getElementById('chat-page-input'),
    widgetSend:document.getElementById('chat-widget-send'),
    pageSend:document.getElementById('chat-page-send'),
    sourceReturnBtn:document.getElementById('chat-source-return-btn'),
    widgetLoadingHint:document.getElementById('chat-widget-loading-hint'),
    pageLoadingHint:document.getElementById('chat-page-loading-hint')
  };

  function isChatOpenedForNotice(){
    return state.panelOpen || document.body.classList.contains('on-chat');
  }

  function setChatFabStatus(mode){
    if(!els.fab) return;
    els.fab.classList.remove('fab-status-thinking','fab-status-success','fab-status-unread');
    if(mode) els.fab.classList.add('fab-status-'+mode);
  }

  function clearChatFabStatusTimer(){
    clearTimeout(chatFabStatusTimer);
    chatFabStatusTimer=null;
  }

  function markChatThinking(){
    clearChatFabStatusTimer();
    setChatFabStatus('thinking');
  }

  function markChatResponseReady(){
    clearChatFabStatusTimer();
    setChatFabStatus('success');
    chatFabStatusTimer=setTimeout(()=>{
      chatFabStatusTimer=null;
      if(state.requestInFlight) return;
      setChatFabStatus(isChatOpenedForNotice()?null:'unread');
    },1000);
  }

  function acknowledgeChatFabNotice(){
    if(state.requestInFlight) return;
    clearChatFabStatusTimer();
    setChatFabStatus(null);
  }
  window.acknowledgeChatFabNotice=acknowledgeChatFabNotice;

  let _loadingTimer=null, _loadingTimerSecs=0;
  function startLoadingTimer(){
    _loadingTimerSecs=0;
    clearInterval(_loadingTimer);
    _loadingTimer=setInterval(()=>{
      _loadingTimerSecs++;
      const msg=_loadingTimerSecs+'s · You can close this window and come back later';
      [els.widgetLoadingHint,els.pageLoadingHint].forEach(el=>{
        if(el){el.textContent=msg;el.classList.add('visible');}
      });
    },1000);
  }
  function stopLoadingTimer(){
    clearInterval(_loadingTimer);_loadingTimer=null;
    [els.widgetLoadingHint,els.pageLoadingHint].forEach(el=>{
      if(el){el.textContent='';el.classList.remove('visible');}
    });
  }


  function keepChatLastVisible(){
  const thread = state.panelOpen
      ? els.widgetThread
      : els.pageThread;

  const form = state.panelOpen
      ? els.widgetForm
      : els.pageForm;

  if(!thread || !form) return;

  if(threadHasOnlyEmptyState(thread)){
    thread.style.removeProperty('paddingBottom');
    thread.style.removeProperty('scrollPaddingBottom');
    thread.scrollTop = 0;
    return;
  }

  const reserve = form.offsetHeight + 30;

  thread.style.paddingBottom = reserve + 'px';
  thread.style.scrollPaddingBottom = reserve + 'px';

  requestAnimationFrame(()=>{
    thread.scrollTop = thread.scrollHeight;
  });
}




  if(!els.fab||!els.panel||!els.widgetThread||!els.pageThread)return;
  [els.widgetInput,els.pageInput].forEach(inp=>{
    if(!inp) return;
    inp.addEventListener('focus',()=>{
      setTimeout(keepChatLastVisible,250);
    });
    inp.addEventListener('input',keepChatLastVisible);
  });
  if(window.visualViewport){
    visualViewport.addEventListener('resize',()=>{
      setTimeout(keepChatLastVisible,80);
    });
  }




  const LOCAL_CHAT_TEXT_SELECTOR='h1,h2,h3,h4,p,li,.sec-title,.sub,.src-title,.src-group-label,.dc-h2,.dc-p,.dc-chart-title,.dc-chart-desc';
  const LOCAL_CHAT_SECTION_SELECTOR='#home-hero,#home-stats,#tl-anchor,#home-documents,#src-section,.dc-section[id],.cards-section-outer[id],.stats-wrapper[id],.hero-outer[id],.htl-section-outer[id]';
  const LOCAL_CHAT_PAGE_LABELS={
    'page-home':'Home',
    'page-archive':'Map',
    'page-timeline2':'Time',
    'page-discourse':'Discourse',
    'page-chat':'Chat'
  };
  const LOCAL_CHAT_STOPWORDS=new Set([
    'about','after','again','also','amid','among','been','before','between','both',
    'city','from','have','into','just','more','most','only','over','same','such',
    'than','that','their','them','then','there','these','they','this','through',
    'very','what','when','where','which','while','with','would','your',
    'happened','happen','tell','show','find','look','inside','index','html','content',
    'question','answer','about','please'
  ]);
  const LOCAL_CHAT_CONTEXT_TOKENS=new Set([
    'kiruna','kirunavaara','lkab','norrbotten','sweden','swedish','sverige','swiden',
    'sami','sapmi','geijer'
  ]);
  const LOCAL_CHAT_TOKEN_ALIASES={
    raddit:'reddit',
    redddit:'reddit',
    redit:'reddit',
    subreddits:'subreddit',
    twiter:'twitter',
    tweets:'twitter',
    tweet:'twitter',
    xcom:'twitter',
    discource:'discourse',
    discussion:'discourse',
    discussions:'discourse',
    dataset:'data',
    datasets:'data',
    statistic:'data',
    statistics:'data',
    stats:'data',
    records:'data',
    replies:'reply',
    replys:'reply',
    posts:'post'
  };
  const LOCAL_CHAT_TOKEN_EXPANSIONS={
    reddit:['reddit','subreddit','subreddits','reply','post','discussion'],
    subreddit:['subreddit','subreddits','reddit'],
    twitter:['twitter','post','reply','discourse'],
    discourse:['discourse','analysis','sentiment','keyword','discussion'],
    data:['data','analysis','records','sentiment','keyword'],
    reply:['reply','replies','discussion'],
    post:['post','posts']
  };
  const LOCAL_CHAT_DISCOURSE_QUERY_TOKENS=new Set([
    'discourse','reddit','subreddit','twitter','reply','post','data','analysis','sentiment','keyword'
  ]);
  const LOCAL_CHAT_KIRUNA_TOPIC_RE=/\b(kiruna|kirunavaara|lkab|norrbotten|geijer)\b/i;
  const LOCAL_CHAT_SWEDEN_CONTEXT_RE=/\b(sweden|swedish|sverige|swiden|sami|sapmi)\b/i;
  let localTextIndexCache=null;
  let activeArchiveContainerHighlight=null;
  let activeArchiveContainerHighlightKey='';
  let activeArchiveInlineHighlight=null;
  let activeArchiveInlineHighlightKey='';
  let chatSourceReturnAnchor=null;
  let activeChatJumpHighlight=null;
  let chatSourceReturnRetryTimer=null;
  let outsideDocFlashTimers=[];
  let archiveHighlightRefreshToken=0;
  let archiveHighlightRefreshTimers=[];
  let composeBlurTimer=null;

  function isChatInputElement(target){
    return target===els.widgetInput||target===els.pageInput;
  }

  function isPhoneComposeEligible(){
    // Phones intentionally reuse the tablet chat flow instead of the phone-only fullscreen compose mode.
    return false;
  }

  function getLiveViewportHeight(){
    const vv=window.visualViewport;
    const vvHeight=vv&&Number.isFinite(vv.height)?vv.height:0;
    return Math.max(320,Math.round(vvHeight||window.innerHeight||document.documentElement.clientHeight||320));
  }

  function getStableViewportHeight(){
    return Math.max(getLiveViewportHeight(),Math.round(window.innerHeight||document.documentElement.clientHeight||320));
  }

  function syncChatComposeViewportVars(preserveStable){
    const root=document.documentElement;
    const liveHeight=getLiveViewportHeight();
    const existingStable=parseFloat(root.style.getPropertyValue('--chat-stable-vh-px'));
    const stableHeight=preserveStable&&Number.isFinite(existingStable)&&existingStable>0
      ? existingStable
      : getStableViewportHeight();
    root.style.setProperty('--chat-live-vh-px', `${liveHeight}px`);
    root.style.setProperty('--chat-stable-vh-px', `${stableHeight}px`);
  }

  function refreshChatLayoutAfterViewportChange(){
    syncPageChatViewport();
    refreshRailLayout(els.widgetThread, els.widgetRail);
    refreshRailLayout(els.pageThread, els.pageRail);
  }

  let _composeAnimTimer=null;

  function enterChatComposeMode(){
    if(!isPhoneComposeEligible()) return;
    clearTimeout(composeBlurTimer);
    clearTimeout(_composeAnimTimer);
    syncChatComposeViewportVars(false);

    const html=document.documentElement;
    const panel=els.panel;

    /* If panel is open: animate from current float position → fullscreen */
    if(panel && state.panelOpen){
      /* 1. Snapshot current geometry as inline styles so CSS knows where to animate FROM */
      const r=panel.getBoundingClientRect();
      panel.style.left=r.left+'px';
      panel.style.top=r.top+'px';
      panel.style.width=r.width+'px';
      panel.style.height=r.height+'px';
      panel.style.borderRadius='20px';
      panel.style.transform='none';

      /* 2. Enable geometry transitions */
      panel.classList.add('chat-panel-animating');

      /* 3. Next frame: apply compose-active which sets target fullscreen geometry */
      requestAnimationFrame(()=>{
        html.classList.remove('chat-compose-collapsing');
        html.classList.add('chat-compose-expanding','chat-compose-active');
        window.applyAdaptiveAppMode?.();

        /* 4. After transition finishes, clean up */
        _composeAnimTimer=setTimeout(()=>{
          html.classList.remove('chat-compose-expanding');
          panel.classList.remove('chat-panel-animating');
          /* Clear inline geometry overrides — CSS rules take over */
          ['left','top','width','height','borderRadius','transform'].forEach(p=>panel.style.removeProperty(p));
          requestAnimationFrame(refreshChatLayoutAfterViewportChange);
        }, 420);
      });
    } else {
      /* No panel open — instant activate */
      html.classList.add('chat-compose-active');
      window.applyAdaptiveAppMode?.();
      requestAnimationFrame(refreshChatLayoutAfterViewportChange);
    }
  }

  function exitChatComposeMode(delay){
    clearTimeout(composeBlurTimer);
    clearTimeout(_composeAnimTimer);

    const finish=()=>{
      const html=document.documentElement;
      const panel=els.panel;

      if(panel && state.panelOpen){
        /* 1. Snapshot current fullscreen geometry */
        const r=panel.getBoundingClientRect();
        panel.style.left=r.left+'px';
        panel.style.top=r.top+'px';
        panel.style.width=r.width+'px';
        panel.style.height=r.height+'px';
        panel.style.borderRadius='0px';

        /* 2. Enable geometry transitions */
        panel.classList.add('chat-panel-animating');
        html.classList.add('chat-compose-collapsing');

        /* 3. Remove compose-active so CSS geometry snaps to target float */
        html.classList.remove('chat-compose-active','chat-compose-expanding');
        html.style.removeProperty('--chat-live-vh-px');
        html.style.removeProperty('--chat-stable-vh-px');
        window.applyAdaptiveAppMode?.();

        /* 4. Apply the real target float position immediately so transition has a target */
        requestAnimationFrame(()=>{
          positionPanel();

          /* 5. After transition completes, clean up inline styles */
          _composeAnimTimer=setTimeout(()=>{
            html.classList.remove('chat-compose-collapsing');
            panel.classList.remove('chat-panel-animating');
            ['left','top','width','height','borderRadius'].forEach(p=>panel.style.removeProperty(p));
            applyFabPos(state.fabPos||getDefaultFabPos());
            refreshChatLayoutAfterViewportChange();
          }, 420);
        });
      } else {
        html.classList.remove('chat-compose-active','chat-compose-expanding','chat-compose-collapsing');
        html.style.removeProperty('--chat-live-vh-px');
        html.style.removeProperty('--chat-stable-vh-px');
        window.applyAdaptiveAppMode?.();
        requestAnimationFrame(()=>{
          if(state.panelOpen) positionPanel();
          applyFabPos(state.fabPos||getDefaultFabPos());
          refreshChatLayoutAfterViewportChange();
        });
      }
    };

    if(delay&&delay>0){
      composeBlurTimer=setTimeout(finish,delay);
      return;
    }
    finish();
  }

  function blurChatInputs(){
    [els.widgetInput,els.pageInput].forEach(input=>{
      if(input&&document.activeElement===input) input.blur();
    });
  }

  function loadTurns(){
    try{localStorage.removeItem(CHAT_HISTORY_KEY);}catch(e){}
    return [];
  }

  function saveTurns(){
    return;
  }

  function loadFabPos(){
    try{
      const raw=localStorage.getItem(CHAT_FAB_KEY);
      const parsed=raw?JSON.parse(raw):null;
      if(parsed&&Number.isFinite(parsed.x)&&Number.isFinite(parsed.y)) return parsed;
    }catch(e){}
    return null;
  }

  function saveFabPos(){
    try{
      if(state.fabPos) localStorage.setItem(CHAT_FAB_KEY,JSON.stringify(state.fabPos));
    }catch(e){}
  }

  function clearChatActiveTurn(resetTurn){
    if(chatActiveTurnTimer){
      clearTimeout(chatActiveTurnTimer);
      chatActiveTurnTimer=null;
    }
    if(resetTurn&&state.activeTurnId){
      state.activeTurnId=null;
      syncAllRailStates();
    }
  }

  function pulseChatActiveTurn(turnId,duration){
    clearChatActiveTurn(false);
    state.activeTurnId=turnId||null;
    syncAllRailStates();
    if(!turnId) return;
    chatActiveTurnTimer=setTimeout(()=>{
      chatActiveTurnTimer=null;
      if(state.activeTurnId===turnId){
        state.activeTurnId=null;
        syncAllRailStates();
      }
    }, Math.max(0, Number(duration)||500));
  }
