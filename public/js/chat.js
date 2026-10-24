
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
  let chatSourceReturnPositionFrame=null;
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
    if(chatSourceReturnAnchor) scheduleChatSourceReturnPosition();
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

  function makeId(prefix){
    return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  }

  function normalizeSearchText(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function canonicalizeSearchToken(token){
    const lowered=String(token||'').toLowerCase();
    return LOCAL_CHAT_TOKEN_ALIASES[lowered]||lowered;
  }

  function expandSearchToken(token){
    const canonical=canonicalizeSearchToken(token);
    return [canonical].concat(LOCAL_CHAT_TOKEN_EXPANSIONS[canonical]||[]);
  }

  function tokenizeSearchText(value){
    const normalized=normalizeSearchText(value)
      .toLowerCase()
      .replace(/\bx\/twitter\b/g,' twitter ')
      .replace(/\btwitter\/x\b/g,' twitter ')
      .replace(/\bx\b/g,' twitter ')
      .replace(/\br\/\b/g,' reddit ')
      .split(/[^a-z0-9]+/i)
      .map(canonicalizeSearchToken)
      .filter(token=>token.length>2&&!LOCAL_CHAT_STOPWORDS.has(token));
    const expanded=[];
    normalized.forEach(token=>{
      expandSearchToken(token).forEach(nextToken=>{
        if(nextToken.length>2&&!LOCAL_CHAT_STOPWORDS.has(nextToken)) expanded.push(nextToken);
      });
    });
    return [...new Set(expanded)];
  }

  function buildTokenFrequency(tokens){
    const freq=new Map();
    tokens.forEach(token=>{
      freq.set(token,(freq.get(token)||0)+1);
    });
    return freq;
  }

  function uniqueBy(items,keyFn){
    const seen=new Set();
    return items.filter(item=>{
      const key=keyFn(item);
      if(!key||seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getArchiveSourceTargetKey(source){
    const locator=source?.locator||{};
    if(locator.type==='event'){
      const pageId=locator.pageId||'page-timeline2';
      return 'event:'+String(pageId)+':'+String(locator.eventId??source?.title??'');
    }
    if(locator.type==='outside-doc'){
      return 'outside:'+String(locator.pageId||'page-timeline2')+':'+String(locator.docIdx??source?.title??'');
    }
    const pageId=locator.pageId||'page-home';
    const sectionId=locator.sectionId||'';
    if(sectionId){
      return 'text:'+pageId+':'+sectionId;
    }
    const heading=normalizeSearchText(locator.heading||source?.title||'').toLowerCase();
    return 'text:'+pageId+':'+(heading||'page-root');
  }

  function getArchiveSourceKey(source){
    return getArchiveSourceTargetKey(source);
  }

  function clearArchiveHighlightRefreshTimers(){
    archiveHighlightRefreshTimers.forEach(timer=>clearTimeout(timer));
    archiveHighlightRefreshTimers=[];
  }

  function clearArchiveContainerHighlight(){
    const containerEl=activeArchiveContainerHighlight;
    activeArchiveContainerHighlight=null;
    activeArchiveContainerHighlightKey='';
    if(!containerEl||!containerEl.classList) return;
    containerEl.classList.remove('archive-container-highlight','archive-container-highlight-pulse');
  }

  function resetArchiveHighlightSession(){
    archiveHighlightRefreshToken+=1;
    clearArchiveHighlightRefreshTimers();
    clearArchiveContainerHighlight();
    clearArchiveInlineHighlight();
  }

  function questionHasKirunaContext(question){
    return /\b(kiruna|kirunavaara|lkab|norrbotten|sweden|swedish|sverige|swiden|sami|sapmi)\b/i.test(String(question||''));
  }

  function sourceHasKirunaContext(source){
    const haystack=normalizeSearchText([source?.title,source?.snippet,source?.domain].join(' ')).toLowerCase();
    return LOCAL_CHAT_KIRUNA_TOPIC_RE.test(haystack);
  }

  function containsCjk(value){
    return /[\u3400-\u9fff]/.test(String(value||''));
  }

  function detectQuestionLanguage(value){
    const text=normalizeSearchText(value).toLowerCase();
    if(containsCjk(text)) return 'zh';
    const italianMatches=text.match(/\b(il|lo|la|gli|le|un|uno|una|che|chi|come|dove|quando|quale|quali|per|con|senza|sono|sei|siamo|voglio|vorrei|mostra|dimmi|trova|spiega|recenti|ultimi|ultime|relazione|spostamento|discorso|dati|mappa|tempo|fuori|archivio)\b/g)||[];
    if(italianMatches.length>=2||/[àèéìòù]/.test(text)) return 'it';
    return 'en';
  }

  function localizeForQuestion(question,messages){
    const language=detectQuestionLanguage(question);
    return messages[language]||messages.en;
  }

  function extractQuestionYears(value){
    return [...new Set(
      (String(value||'').match(/\b(18|19|20)\d{2}\b/g)||[]).map(Number)
    )];
  }

  function getRelevantQueryTokens(queryTokens){
    const discriminative=queryTokens.filter(token=>!LOCAL_CHAT_CONTEXT_TOKENS.has(String(token||'').toLowerCase()));
    return discriminative.length?discriminative:queryTokens;
  }

  function countDistinctHaystackTokenMatches(haystack,tokens){
    const lowered=normalizeSearchText(haystack).toLowerCase();
    return [...new Set(tokens)].filter(token=>lowered.includes(String(token||'').toLowerCase())).length;
  }

  function isAffirmativeReply(value){
    return /^(yes|y|yeah|yep|sure|ok|okay|please do|go ahead|si|sì|certo|va bene|mostra|procedi|是|对|好|好的|可以|行|要|想)$/i.test(normalizeSearchText(value));
  }

  function isNegativeReply(value){
    return /^(no|n|nope|nah|not now|non ora|no grazie|不是|否|不要|不用|不想|不对|不是这个)$/i.test(normalizeSearchText(value));
  }

  function getPageLabel(pageId){
    return LOCAL_CHAT_PAGE_LABELS[pageId]||'Archive';
  }

  function getChatEventList(){
    return Array.isArray(window.EVS)?window.EVS:[];
  }

  function getChatCategoryLabels(){
    return window.CL&&typeof window.CL==='object'?window.CL:{};
  }

  function getOutsideSearchEntries(){
    if(typeof getOutsideSearchIndex==='function'){
      try{
        return Array.isArray(getOutsideSearchIndex())?getOutsideSearchIndex():[];
      }catch(e){}
    }
    return [];
  }

  function jumpToArchiveEvent(eventId){
    if(typeof window._selectEv==='function'){
      window._selectEv(Number(eventId));
      return true;
    }
    if(typeof window.selectEvent==='function'){
      window.selectEvent(Number(eventId));
      return true;
    }
    return false;
  }

  function getSectionHeading(sectionRoot,fallback){
    if(!sectionRoot) return fallback||'Kiruna Archive';
    const headingEl=sectionRoot.matches?.('h1,h2,h3,h4,.sec-title,.sub,.src-title,.src-group-label,.dc-h2,.dc-chart-title')
      ? sectionRoot
      : sectionRoot.querySelector('h1,h2,h3,h4,.sec-title,.sub,.src-title,.src-group-label,.dc-h2,.dc-chart-title');
    const heading=normalizeSearchText(headingEl?.textContent||'');
    return heading||fallback||'Kiruna Archive';
  }

  function clampSlice(text,start,maxLength){
    const normalized=normalizeSearchText(text);
    if(!normalized) return '';
    const safeStart=Math.max(0,Math.min(start,Math.max(0,normalized.length-maxLength)));
    const end=Math.min(normalized.length,safeStart+maxLength);
    const prefix=safeStart>0?'…':'';
    const suffix=end<normalized.length?'…':'';
    return prefix+normalized.slice(safeStart,end).trim()+suffix;
  }

  function buildSnippetData(text,queryTokens,maxLength){
    const normalized=normalizeSearchText(text);
    if(!normalized) return {snippet:'',highlightText:''};
    const lowered=normalized.toLowerCase();
    const orderedTokens=[...new Set(queryTokens)].sort((a,b)=>b.length-a.length);
    let matchIndex=-1;
    let matchLength=0;
    orderedTokens.some(token=>{
      const index=lowered.indexOf(token.toLowerCase());
      if(index===-1) return false;
      matchIndex=index;
      matchLength=token.length;
      return true;
    });
    if(matchIndex===-1){
      return {
        snippet:clampSlice(normalized,0,maxLength),
        highlightText:normalized.slice(0,Math.min(normalized.length,80)).trim()
      };
    }
    const snippetStart=Math.max(0,matchIndex-Math.floor((maxLength-matchLength)/2));
    const highlightStart=Math.max(0,matchIndex-24);
    const highlightEnd=Math.min(normalized.length,matchIndex+Math.max(matchLength,36));
    return {
      snippet:clampSlice(normalized,snippetStart,maxLength),
      highlightText:normalized.slice(highlightStart,highlightEnd).trim()
    };
  }

  function buildLocalTextIndex(){
    const entries=[];
    document.querySelectorAll('.page').forEach(page=>{
      if(!page||page.id==='page-chat') return;
      const pageId=page.id||'page-home';
      const pageLabel=getPageLabel(pageId);
      let currentHeading=getSectionHeading(page,pageLabel);
      page.querySelectorAll(LOCAL_CHAT_TEXT_SELECTOR).forEach(el=>{
        if(!el||el.closest('#nav,#chat-panel,#page-chat,#toc-panel,#toc-tab,#toc-trigger,#toc-edge-cue,#chat-fab')) return;
        const text=normalizeSearchText(el.textContent||'');
        if(!text) return;
        const isHeading=el.matches('h1,h2,h3,h4,.sec-title,.sub,.src-title,.src-group-label,.dc-h2,.dc-chart-title');
        if(isHeading) currentHeading=text;
        const sectionRoot=el.closest(LOCAL_CHAT_SECTION_SELECTOR)||page;
        const sectionId=sectionRoot.id||'';
        const heading=getSectionHeading(sectionRoot,currentHeading||pageLabel);
        if(text.length<(isHeading?12:36)) return;
        if(/^(home|map|time|discourse|chat)$/i.test(text)) return;
        if(/^type a question$/i.test(text)) return;
        if(/^your question and reply history is temporary/i.test(text)) return;
        const tokens=tokenizeSearchText(text);
        if(!tokens.length&&text.length<48) return;
        entries.push({
          pageId,
          pageLabel,
          sectionId,
          heading:isHeading?text:(heading||pageLabel),
          text,
          searchText:(heading+' '+text).toLowerCase(),
          headingTokens:new Set(tokenizeSearchText(heading)),
          tokenFreq:buildTokenFrequency(tokens)
        });
      });
    });
    return entries;
  }

  function getLocalTextIndex(){
    if(!localTextIndexCache) localTextIndexCache=buildLocalTextIndex();
    return localTextIndexCache;
  }

  function scoreLocalTextEntry(question,normalizedQuestion,queryTokens,entry){
    if(!queryTokens.length) return 0;
    const relevantTokens=getRelevantQueryTokens(queryTokens);
    const scoringTokens=relevantTokens.length?relevantTokens:queryTokens;
    const tokenMatches=countDistinctHaystackTokenMatches(entry.searchText,scoringTokens);
    const discourseIntent=scoringTokens.filter(token=>LOCAL_CHAT_DISCOURSE_QUERY_TOKENS.has(token)).length;
    let score=0;
    if(normalizedQuestion&&entry.searchText.includes(normalizedQuestion)) score+=16;
    scoringTokens.forEach(token=>{
      const hits=entry.tokenFreq.get(token)||0;
      if(hits) score+=2+Math.min(hits,3);
      if(entry.headingTokens.has(token)) score+=4;
    });
    if(scoringTokens.length&&tokenMatches===scoringTokens.length) score+=7;
    else if(tokenMatches>=Math.min(2,scoringTokens.length)) score+=4;
    if(entry.pageId==='page-discourse'&&discourseIntent){
      score+=3+(discourseIntent*2);
      if(entry.searchText.includes('reddit')&&scoringTokens.includes('reddit')) score+=4;
      if(entry.searchText.includes('reply')&&scoringTokens.includes('reply')) score+=2;
      if(entry.searchText.includes('analysis')&&scoringTokens.includes('data')) score+=2;
    }
    if(entry.pageId==='page-home') score+=1;
    return score;
  }

  function scoreLocalEvent(question,normalizedQuestion,queryTokens,eventItem){
    if(!eventItem||!queryTokens.length) return 0;
    const categoryLabels=getChatCategoryLabels();
    const questionYears=extractQuestionYears(question);
    const exactYearMatch=questionYears.includes(Number(eventItem.year));
    const relevantTokens=getRelevantQueryTokens(queryTokens);
    const scoringTokens=relevantTokens.length?relevantTokens:queryTokens;
    const haystack=normalizeSearchText([
      eventItem.title,
      eventItem.desc,
      eventItem.loc,
      Array.isArray(eventItem.tags)?eventItem.tags.join(' '):'',
      eventItem.dateLabel,
      eventItem.year,
      categoryLabels[eventItem.cat]||''
    ].join(' ')).toLowerCase();
    const titleText=normalizeSearchText(eventItem.title).toLowerCase();
    const tokenMatches=countDistinctHaystackTokenMatches(haystack,scoringTokens);
    let score=0;
    if(normalizedQuestion&&haystack.includes(normalizedQuestion)) score+=18;
    if(questionYears.length){
      if(exactYearMatch) score+=26;
      else score-=14;
    }
    scoringTokens.forEach(token=>{
      if(titleText.includes(token)) score+=6;
      const bodyHits=haystack.split(token).length-1;
      if(bodyHits>0) score+=2+Math.min(bodyHits,3);
    });
    if(scoringTokens.length&&tokenMatches===scoringTokens.length) score+=9;
    else if(tokenMatches>=Math.min(2,scoringTokens.length)) score+=5;
    if(String(eventItem.year||'').includes(normalizedQuestion)) score+=4;
    if(eventItem.featured) score+=1.5;
    return score;
  }

  function scoreLocalOutsideDoc(question,normalizedQuestion,queryTokens,doc){
    if(!doc||!queryTokens.length) return 0;
    const questionYears=extractQuestionYears(question);
    const exactYearMatch=questionYears.includes(Number(doc.year));
    const relevantTokens=getRelevantQueryTokens(queryTokens);
    const scoringTokens=relevantTokens.length?relevantTokens:queryTokens;
    const haystack=normalizeSearchText([
      doc.title,
      doc.actor,
      doc.field,
      doc.label,
      doc.desc,
      doc.rawDate,
      doc.year
    ].join(' ')).toLowerCase();
    const titleText=normalizeSearchText(doc.title).toLowerCase();
    const tokenMatches=countDistinctHaystackTokenMatches(haystack,scoringTokens);
    let score=0;
    if(normalizedQuestion&&haystack.includes(normalizedQuestion)) score+=20;
    if(questionYears.length){
      if(exactYearMatch) score+=24;
      else score-=14;
    }
    scoringTokens.forEach(token=>{
      if(titleText.includes(token)) score+=7;
      const hits=haystack.split(token).length-1;
      if(hits>0) score+=2+Math.min(hits,3);
    });
    if(scoringTokens.length&&tokenMatches===scoringTokens.length) score+=10;
    else if(tokenMatches>=Math.min(2,scoringTokens.length)) score+=5;
    return score;
  }

  function searchLocalEventSources(question,queryTokens){
    const normalizedQuestion=normalizeSearchText(question).toLowerCase();
    return getChatEventList()
      .map(eventItem=>{
        const score=scoreLocalEvent(question,normalizedQuestion,queryTokens,eventItem);
        if(score<=0) return null;
        const snippetData=buildSnippetData(
          [eventItem.dateLabel||eventItem.year,eventItem.desc].filter(Boolean).join(' · '),
          queryTokens,
          180
        );
        return {
          kind:'archive',
          sourceType:'event',
          score,
          year:Number(eventItem.year)||null,
          title:eventItem.title||'Map event',
          domain:'Kiruna Archive',
          url:'',
          snippet:snippetData.snippet,
          jumpLabel:'Locate in timeline →',
          locationLabel:'Time · Inside Map · '+(eventItem.dateLabel||String(eventItem.year||'')),
          locator:{
            type:'event',
            pageId:'page-timeline2',
            eventId:eventItem.id,
            year:Number(eventItem.year)||null,
            heading:eventItem.title||'',
            query:eventItem.desc||'',
            highlightText:snippetData.highlightText,
            queryTokens
          }
        };
      })
      .filter(Boolean)
      .sort((a,b)=>b.score-a.score)
      .slice(0,4);
  }

  function searchLocalTextSources(question,queryTokens){
    const normalizedQuestion=normalizeSearchText(question).toLowerCase();
    const questionYears=extractQuestionYears(question);
    return getLocalTextIndex()
      .map(entry=>{
        const score=scoreLocalTextEntry(question,normalizedQuestion,queryTokens,entry);
        if(score<=0) return null;
        const hasYearMatch=!questionYears.length || questionYears.some(year=>entry.searchText.includes(String(year)));
        const finalScore=hasYearMatch?score+(questionYears.length?12:0):score-10;
        if(finalScore<=0) return null;
        const snippetData=buildSnippetData(entry.text,queryTokens,180);
        return {
          kind:'archive',
          sourceType:'text',
          score:finalScore,
          year:questionYears.find(year=>entry.searchText.includes(String(year)))||null,
          title:entry.heading||entry.pageLabel,
          domain:'Kiruna Archive',
          url:'',
          snippet:snippetData.snippet,
          jumpLabel:'Locate in index →',
          locationLabel:[entry.pageLabel,entry.heading].filter(Boolean).join(' · '),
          locator:{
            type:'text',
            pageId:entry.pageId,
            sectionId:entry.sectionId,
            year:questionYears.find(year=>entry.searchText.includes(String(year)))||null,
            heading:entry.heading,
            query:snippetData.snippet,
            matchText:entry.text,
            highlightText:snippetData.highlightText,
            queryTokens
          }
        };
      })
      .filter(Boolean)
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);
  }

  function searchLocalOutsideSources(question,queryTokens){
    const normalizedQuestion=normalizeSearchText(question).toLowerCase();
    const questionYears=extractQuestionYears(question);
    return getOutsideSearchEntries()
      .map(doc=>{
        const score=scoreLocalOutsideDoc(question,normalizedQuestion,queryTokens,doc);
        if(score<=0) return null;
        const hasYearMatch=!questionYears.length||questionYears.includes(Number(doc.year));
        const finalScore=hasYearMatch?score+(questionYears.length?12:0):score-12;
        if(finalScore<=0) return null;
        const detailText=[doc.rawDate,doc.actor,doc.field,doc.desc].filter(Boolean).join(' · ');
        const snippetData=buildSnippetData(detailText||doc.title,queryTokens,180);
        return {
          kind:'archive',
          sourceType:'outside-doc',
          score:finalScore,
          year:Number(doc.year)||null,
          title:doc.title||'Outside archive item',
          domain:'Kiruna Web Archive',
          url:'',
          snippet:snippetData.snippet,
          jumpLabel:'Locate in outside archive →',
          locationLabel:['Time','Outside Map',doc.rawDate||String(doc.year||'')].filter(Boolean).join(' · '),
          locator:{
            type:'outside-doc',
            pageId:'page-timeline2',
            docIdx:Number(doc.idx),
            year:Number(doc.year)||null,
            heading:doc.title||'',
            query:detailText,
            matchText:[doc.title,doc.actor,doc.field,doc.label,doc.desc].filter(Boolean).join(' · '),
            highlightText:snippetData.highlightText,
            queryTokens
          }
        };
      })
      .filter(Boolean)
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);
  }

  function sourceMatchesQuestionYears(source,questionYears){
    if(!questionYears.length) return true;
    const sourceYear=Number(source?.year||source?.locator?.year);
    if(Number.isFinite(sourceYear)&&questionYears.includes(sourceYear)) return true;
    const haystack=normalizeSearchText([
      source?.title,
      source?.snippet,
      source?.locator?.matchText,
      source?.locator?.query
    ].join(' ')).toLowerCase();
    return questionYears.some(year=>haystack.includes(String(year)));
  }

  function countSourceTokenMatches(source,tokens){
    const haystack=normalizeSearchText([
      source?.title,
      source?.snippet,
      source?.locator?.matchText,
      source?.locator?.query
    ].join(' ')).toLowerCase();
    return [...new Set(tokens)].filter(token=>haystack.includes(token.toLowerCase())).length;
  }

  function isStrongLocalSource(source,question,topScore,questionYears,queryTokens){
    if(!source) return false;
    const normalizedQuestion=normalizeSearchText(question).toLowerCase();
    const titleText=normalizeSearchText(source.title).toLowerCase();
    const snippetText=normalizeSearchText(source.snippet).toLowerCase();
    const nonYearTokens=getRelevantQueryTokens(queryTokens.filter(token=>!/^\d{4}$/.test(token)));
    const tokenMatches=countSourceTokenMatches(source,nonYearTokens);
    if(questionYears.length){
      if(!sourceMatchesQuestionYears(source,questionYears)) return false;
      if(nonYearTokens.length){
        return source.score>=16 && tokenMatches>=Math.min(1,nonYearTokens.length);
      }
      return source.score>=16;
    }
    if(normalizedQuestion.length>=8&&(titleText.includes(normalizedQuestion)||snippetText.includes(normalizedQuestion))){
      return true;
    }
    if(tokenMatches>=Math.min(2,Math.max(1,nonYearTokens.length||1))&&source.score>=14){
      return true;
    }
    return source.score>=Math.max(16,topScore*.76);
  }

  function isReliableWeakLocalSource(source,question,topScore,questionYears,queryTokens){
    if(!source) return false;
    const nonYearTokens=getRelevantQueryTokens(queryTokens.filter(token=>!/^\d{4}$/.test(token)));
    const tokenMatches=countSourceTokenMatches(source,nonYearTokens);
    const needsFreshContext=questionNeedsFreshContext(question);
    if(questionYears.length){
      if(!sourceMatchesQuestionYears(source,questionYears)) return false;
      if(nonYearTokens.length){
        return source.score>=12 && tokenMatches>=1;
      }
      return source.score>=12;
    }
    if(needsFreshContext){
      return source.score>=Math.max(14,topScore*.72) && tokenMatches>=Math.min(2,Math.max(1,nonYearTokens.length||1));
    }
    if(source.locator?.type==='event'&&source.score>=10) return true;
    if(source.locator?.type==='outside-doc'&&source.score>=10) return true;
    if(tokenMatches>=1&&source.score>=10) return true;
    return source.score>=Math.max(11,topScore*.62);
  }

  function getPreferredLocalArchiveSources(localSearch,question){
    const strongSources=trimSourcesForTurn(localSearch?.strongSources,MAX_SOURCE_CARDS);
    if(strongSources.length){
      return {sources:strongSources,direct:true};
    }
    const fallbackSources=trimSourcesForTurn(
      (localSearch?.weakSources||[]).filter(source=>
        isReliableWeakLocalSource(
          source,
          question,
          Number(localSearch?.topScore||0),
          Array.isArray(localSearch?.questionYears)?localSearch.questionYears:[],
          Array.isArray(localSearch?.queryTokens)?localSearch.queryTokens:[]
        )
      ),
      Math.min(MAX_SOURCE_CARDS,4)
    );
    return {sources:fallbackSources,direct:false};
  }

  function searchLocalArchive(question){
    const queryTokens=tokenizeSearchText(question);
    const questionYears=extractQuestionYears(question);
    if(!queryTokens.length&&!questionYears.length){
      return {strongSources:[],weakSources:[],queryTokens,questionYears,topScore:0};
    }
    const merged=uniqueBy(
      [
        ...searchLocalEventSources(question,queryTokens),
        ...searchLocalOutsideSources(question,queryTokens),
        ...searchLocalTextSources(question,queryTokens)
      ]
        .sort((a,b)=>b.score-a.score),
      item=>getArchiveSourceTargetKey(item)
    );
    if(!merged.length){
      return {strongSources:[],weakSources:[],queryTokens,questionYears,topScore:0};
    }
    const topScore=merged[0].score||0;
    const weakMinScore=questionYears.length?Math.max(8,topScore*.32):topScore>=18?Math.max(6,topScore*0.28):topScore>=12?5:4;
    const weakSources=merged.filter(item=>item.score>=weakMinScore).slice(0,MAX_SOURCE_CARDS);
    const strongSources=weakSources.filter(item=>isStrongLocalSource(item,question,topScore,questionYears,queryTokens)).slice(0,MAX_SOURCE_CARDS);
    if(strongSources.length===1&&weakSources[1]&&isStrongLocalSource(weakSources[1],question,topScore,questionYears,queryTokens)){
      strongSources.push(weakSources[1]);
    }
    return {
      strongSources:strongSources.slice(0,MAX_SOURCE_CARDS),
      weakSources,
      queryTokens,
      questionYears,
      topScore
    };
  }

  function buildLocalAnswer(question,sources){
    if(!Array.isArray(sources)||!sources.length) return '';
    const lead=sources[0];
    const eventSource=sources.find(source=>source.locator?.type==='event')||null;
    const outsideSource=sources.find(source=>source.locator?.type==='outside-doc')||null;
    if(eventSource){
      return localizeForQuestion(question,{
        zh:'我在 archive web 里找到直接命中：Time / Inside Map 事件“'+eventSource.title+'”。'+eventSource.snippet+' 可用下面的来源卡片直接跳转。',
        it:'Ho trovato una corrispondenza diretta nell\'archive web: l\'evento Time / Inside Map "'+eventSource.title+'". '+eventSource.snippet+' Usa la scheda fonte qui sotto per saltarci.',
        en:'I found a direct match in the archive web: the Time / Inside Map event "'+eventSource.title+'". '+eventSource.snippet+' Use the source card below to jump there.'
      });
    }
    if(outsideSource){
      return localizeForQuestion(question,{
        zh:'我在 archive web 里找到直接命中：Outside Map 文档“'+outsideSource.title+'”。'+outsideSource.snippet+' 可用下面的来源卡片直接跳转。',
        it:'Ho trovato una corrispondenza diretta nell\'archive web: il documento Outside Map "'+outsideSource.title+'". '+outsideSource.snippet+' Usa la scheda fonte qui sotto per saltarci.',
        en:'I found a direct match in the archive web: the Outside Map document "'+outsideSource.title+'". '+outsideSource.snippet+' Use the source card below to jump there.'
      });
    }
    return localizeForQuestion(question,{
      zh:'我在 archive web 里找到直接命中：“'+lead.title+'”。'+lead.snippet+' 可用下面的来源卡片直接跳转到对应位置。',
      it:'Ho trovato una corrispondenza diretta nell\'archive web: "'+lead.title+'". '+lead.snippet+' Usa la scheda fonte qui sotto per saltarci.',
      en:'I found a direct match in the archive web: "'+lead.title+'". '+lead.snippet+' Use the source card below to jump there.'
    });
  }

  function buildLocalArchiveLeadAnswer(question,sources){
    if(!Array.isArray(sources)||!sources.length) return '';
    const lead=sources[0];
    const eventSource=sources.find(source=>source.locator?.type==='event')||null;
    const outsideSource=sources.find(source=>source.locator?.type==='outside-doc')||null;
    if(eventSource){
      return localizeForQuestion(question,{
        zh:'我没有找到特别强的直接命中，但在 archive web 里找到最接近的 Time / Inside Map 事件“'+eventSource.title+'”。'+eventSource.snippet,
        it:'Non ho trovato una corrispondenza diretta molto forte, ma il lead più vicino nell\'archive web è l\'evento Time / Inside Map "'+eventSource.title+'". '+eventSource.snippet,
        en:'I did not find a very strong direct archive hit, but the closest lead in the archive web is the Time / Inside Map event "'+eventSource.title+'". '+eventSource.snippet
      });
    }
    if(outsideSource){
      return localizeForQuestion(question,{
        zh:'我没有找到特别强的直接命中，但在 archive web 里找到最接近的 Outside Map 文档“'+outsideSource.title+'”。'+outsideSource.snippet,
        it:'Non ho trovato una corrispondenza diretta molto forte, ma il lead più vicino nell\'archive web è il documento Outside Map "'+outsideSource.title+'". '+outsideSource.snippet,
        en:'I did not find a very strong direct archive hit, but the closest lead in the archive web is the Outside Map document "'+outsideSource.title+'". '+outsideSource.snippet
      });
    }
    return localizeForQuestion(question,{
      zh:'我没有找到特别强的直接命中，但在 archive web 里找到最接近的内容“'+lead.title+'”。'+lead.snippet,
      it:'Non ho trovato una corrispondenza diretta molto forte, ma il lead più vicino nell\'archive web è "'+lead.title+'". '+lead.snippet,
      en:'I did not find a very strong direct archive hit, but the closest lead in the archive web is "'+lead.title+'". '+lead.snippet
    });
  }

  function buildApiUnavailableMessage(question){
    return localizeForQuestion(question,{
      zh:'我没有找到强直接命中，而且当前连不上 AI API。',
      it:'Non ho trovato una corrispondenza diretta forte e l\'API AI non è disponibile in questo momento.',
      en:'I could not find a strong direct match, and the AI API is unavailable right now.'
    });
  }

  function sourceIsExternalResource(source){
    return Boolean(String(source?.url||'').trim());
  }

  function splitAssistantSourcesForDisclosure(sources){
    const trimmed=Array.isArray(sources)
      ? uniqueBy(sources.filter(Boolean),source=>source.url||getArchiveSourceTargetKey(source))
      : [];
    return {
      archiveSources:trimmed.filter(source=>!sourceIsExternalResource(source)).slice(0,AI_SOURCE_CARD_LIMIT),
      externalSources:trimmed.filter(source=>sourceIsExternalResource(source)).slice(0,AI_SOURCE_CARD_LIMIT)
    };
  }

  function buildExternalSourcesPrompt(question){
    return localizeForQuestion(question,{
      zh:'我还找到了外部来源。要显示吗？可点 Yes / No，或直接输入。',
      it:'Ho trovato anche fonti esterne. Vuoi vederle? Usa Yes / No qui sotto oppure scrivi.',
      en:'I also found external sources. Show them? Use Yes / No below or type.'
    });
  }

  function buildExternalSourcesAnswer(question){
    return localizeForQuestion(question,{
      zh:'这是我找到的外部来源。',
      it:'Ecco le fonti esterne che ho trovato.',
      en:'Here are the external sources I found.'
    });
  }

  function buildExternalSourcesDeclineMessage(question){
    return localizeForQuestion(question,{
      zh:'好，我先保留当前的 archive 回答，不展开外部来源。',
      it:'Va bene, per ora tengo solo la risposta dell\'archive senza mostrare le fonti esterne.',
      en:'Okay, I will keep the archive answer only for now and not open the external sources.'
    });
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function buildRequestHistory(){
    return state.turns
      .filter(turn=>turn&&!turn.pending)
      .slice(-8)
      .map(turn=>({
        role:turn.role,
        text:String(turn.text||'')
      }));
  }

  function canReachChatApi(){
    return window.location.protocol!=='file:'&&window.location.origin!=='null';
  }

  function trimSourcesForTurn(sources,limit){
    return Array.isArray(sources)
      ? uniqueBy(sources.filter(Boolean),source=>source.url||getArchiveSourceTargetKey(source)).slice(0,Number(limit)||MAX_SOURCE_CARDS)
      : [];
  }

  async function requestAssistantPayload(endpoint,body){
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body||{})
    });
    const payload=await response.json().catch(()=>null);
    return {response,payload};
  }

  function hasArchiveEnhancedPayload(payload){
    return Boolean(
      String(payload?.answer||'').trim()&&
      (payload?.used_ai===true||payload?.mode==='archive-enhanced')
    );
  }

  function hasStrongAiAnswerPayload(payload){
    const answer=String(payload?.answer||'').trim();
    const sources=trimSourcesForTurn(payload?.sources,AI_SOURCE_CARD_LIMIT);
    const mode=String(payload?.mode||'');
    if(!answer||!sources.length) return false;
    if(payload?.used_ai!==true) return false;
    return mode!=='archive-only'&&mode!=='archive-fallback'&&mode!=='archive-missing';
  }

  function findTurnById(turnId){
    return state.turns.find(turn=>turn.id===turnId)||null;
  }

  function getPageNameFromId(pageId){
    return String(pageId||'page-home').replace(/^page-/,'')||'home';
  }

  function getCurrentPageName(){
    const visiblePage=document.querySelector('.page:not(.off)');
    if(visiblePage&&visiblePage.id) return getPageNameFromId(visiblePage.id);
    const bodyMatch=(document.body.className||'').match(/\bon-([a-z0-9_-]+)/i);
    return bodyMatch?bodyMatch[1]:'home';
  }

  function clearChatSourceReturnRetry(){
    if(chatSourceReturnRetryTimer){
      clearTimeout(chatSourceReturnRetryTimer);
      chatSourceReturnRetryTimer=null;
    }
  }

  function resolveElementViewportRect(el){
    if(!el||typeof el.getBoundingClientRect!=='function') return null;
    let rect=el.getBoundingClientRect();
    if(!rect) return null;
    let ownerWindow=el.ownerDocument?.defaultView||window;
    while(ownerWindow&&ownerWindow!==window){
      const frameEl=ownerWindow.frameElement;
      if(!frameEl) break;
      const frameRect=frameEl.getBoundingClientRect();
      rect={
        left:rect.left+frameRect.left,
        right:rect.right+frameRect.left,
        top:rect.top+frameRect.top,
        bottom:rect.bottom+frameRect.top,
        width:rect.width,
        height:rect.height
      };
      ownerWindow=frameEl.ownerDocument?.defaultView||window;
    }
    return rect;
  }

  function getChatSourceReturnAnchorElement(){
    if(!chatSourceReturnAnchor) return null;
    try{
      const el=typeof chatSourceReturnAnchor.getElement==='function'
        ? chatSourceReturnAnchor.getElement()
        : chatSourceReturnAnchor.element||null;
      return el&&el.isConnected?el:null;
    }catch(e){
      return null;
    }
  }

  function getChatSourceReturnAnchorRect(anchorEl){
    if(chatSourceReturnAnchor&&typeof chatSourceReturnAnchor.getRect==='function'){
      try{
        const customRect=chatSourceReturnAnchor.getRect(anchorEl);
        if(customRect) return customRect;
      }catch(e){}
    }
    return resolveElementViewportRect(anchorEl);
  }

  function highlightChatJumpElement(el){
    if(!el||activeChatJumpHighlight===el) return;
    activeChatJumpHighlight?.classList.remove('chat-jump-highlight');
    const doc=el.ownerDocument;
    if(doc!==document&&!doc.getElementById('chat-jump-highlight-style')){
      const style=doc.createElement('style');
      style.id='chat-jump-highlight-style';
      style.textContent='.chat-jump-highlight{background:#fff1a8!important;box-shadow:0 0 0 4px rgba(255,241,168,.55)!important;border-radius:6px!important}'+
        '.pop-title.chat-jump-highlight + .pop-desc{background:rgba(255,241,168,.55)!important;border-radius:6px!important}';
      doc.head.appendChild(style);
    }
    el.classList.add('chat-jump-highlight');
    activeChatJumpHighlight=el;
  }

  function clearChatSourceReturnAnchor(){
    clearChatSourceReturnRetry();
    _stopChatReturnTrackingLoop();
    clearOutsideDocFlashTimers();
    activeChatJumpHighlight?.classList.remove('chat-jump-highlight');
    activeChatJumpHighlight=null;
    chatSourceReturnAnchor=null;
    chatSourceReturnPositionFrame=null;
    if(!els.sourceReturnBtn) return;
    els.sourceReturnBtn.hidden=true;
    els.sourceReturnBtn.style.left='';
    els.sourceReturnBtn.style.top='';
  }

  function scheduleChatSourceReturnPosition(){
    // Position updates are now handled by the continuous rAF tracking loop.
    // This stub is kept so existing call-sites don't throw errors.
  }

  function positionChatSourceReturnButton(){
    chatSourceReturnPositionFrame=null;
    if(!els.sourceReturnBtn||!chatSourceReturnAnchor) return;
    const anchorEl=getChatSourceReturnAnchorElement();
    // No anchor element → hide immediately (no fallback to last position)
    if(!anchorEl){
      els.sourceReturnBtn.hidden=true;
      return;
    }
    if(chatSourceReturnAnchor.persistHighlight&&activeChatJumpHighlight!==anchorEl){
      highlightChatJumpElement(anchorEl);
    }
    const anchorPage=anchorEl?.closest('.page');
    if(anchorPage&&anchorPage.classList.contains('off')){
      els.sourceReturnBtn.hidden=true;
      return;
    }
    const rect=getChatSourceReturnAnchorRect(anchorEl);
    if(!rect){
      els.sourceReturnBtn.hidden=true;
      return;
    }
    const btnRect=els.sourceReturnBtn.getBoundingClientRect();
    const btnWidth=btnRect.width||34;
    const btnHeight=btnRect.height||34;
    // Hide button if anchor is scrolled completely out of viewport
    const vw=window.innerWidth, vh=window.innerHeight;
    if(rect.bottom<0||rect.top>vh||rect.right<0||rect.left>vw){
      els.sourceReturnBtn.hidden=true;
      return;
    }
    els.sourceReturnBtn.hidden=false;

    const textBlock=anchorEl.closest('.pop-card,.leaflet-popup-content-wrapper,p,h1,h2,h3,h4,li,blockquote');
    const context=textBlock&&textBlock!==anchorEl
      ? resolveElementViewportRect(textBlock)||rect
      : rect;
    const pad=12;
    const minTop=(document.getElementById('nav')?.getBoundingClientRect().bottom||0)+pad;
    const midY=rect.top+rect.height/2-btnHeight/2;
    const midX=rect.left+rect.width/2-btnWidth/2;
    const candidates=[
      [context.right+pad,midY],
      [context.left-pad-btnWidth,midY],
      [midX,context.top-pad-btnHeight],
      [midX,context.bottom+pad]
    ];
    const [left,top]=candidates.find(([x,y])=>
      x>=pad&&x+btnWidth<=vw-pad&&y>=minTop&&y+btnHeight<=vh-pad
    )||[
      clamp(midX,pad,Math.max(pad,vw-btnWidth-pad)),
      clamp(context.top-pad-btnHeight,minTop,Math.max(minTop,vh-btnHeight-pad))
    ];

    els.sourceReturnBtn.style.left=Math.round(left)+'px';
    els.sourceReturnBtn.style.top=Math.round(top)+'px';
  }

  // ── Continuous rAF tracking loop ──────────────────────────────────────────
  // Instead of event-driven one-shot scheduling, we run a lightweight loop
  // every frame while an anchor is active. This guarantees the button always
  // follows the anchor element regardless of what causes it to move
  // (scroll inside iframe, CSS transform, page transition, etc.).
  let _chatReturnRafId=null;

  function _startChatReturnTrackingLoop(){
    if(_chatReturnRafId) return; // already running
    function loop(){
      if(!chatSourceReturnAnchor){
        _chatReturnRafId=null;
        return; // stop loop when no anchor
      }
      positionChatSourceReturnButton();
      _chatReturnRafId=requestAnimationFrame(loop);
    }
    _chatReturnRafId=requestAnimationFrame(loop);
  }

  function _stopChatReturnTrackingLoop(){
    if(_chatReturnRafId){
      cancelAnimationFrame(_chatReturnRafId);
      _chatReturnRafId=null;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  function setChatSourceReturnAnchor(nextAnchor){
    clearChatSourceReturnRetry();
    _stopChatReturnTrackingLoop();
    chatSourceReturnAnchor=nextAnchor||null;
    if(!els.sourceReturnBtn) return;
    if(!chatSourceReturnAnchor){
      clearChatSourceReturnAnchor();
      return;
    }
    els.sourceReturnBtn.hidden=false;
    _startChatReturnTrackingLoop();
  }

  function attachChatReturnToEventPopup(attempt){
    const tries=Number(attempt||0);
    const popupEl=document.querySelector('#leaflet-map .leaflet-popup-content-wrapper')||document.querySelector('#leaflet-map .leaflet-popup-content');
    if(popupEl){
      highlightChatJumpElement(popupEl);
      setChatSourceReturnAnchor({
        prefer:'event',
        getElement:()=>document.querySelector('#leaflet-map .leaflet-popup-content-wrapper')||document.querySelector('#leaflet-map .leaflet-popup-content')
      });
      return;
    }
    if(tries>=36) return;
    chatSourceReturnRetryTimer=setTimeout(()=>{
      attachChatReturnToEventPopup(tries+1);
    },120);
  }

  function getOutsideDocRow(docIdx){
    try{
      const outsideWin=getOutsideSearchWindow();
      const panel=outsideWin?.document?.getElementById('overview-panel');
      return panel?.querySelector('[data-doc-idx="'+Number(docIdx)+'"]')||null;
    }catch(e){
      return null;
    }
  }

  function getTimelineFrameWindow(){
    try{
      return document.getElementById('timeline2-frame')?.contentWindow||null;
    }catch(e){
      return null;
    }
  }

  function getTimelineEventAnchor(eventId){
    try{
      const tlWin=getTimelineFrameWindow();
      const tlDoc=tlWin?.document||null;
      if(!tlDoc) return null;
      return tlDoc.querySelector('.txt-col[data-id="'+Number(eventId)+'"], .dtl-col[data-id="'+Number(eventId)+'"], .ribbon-dot[data-id="'+Number(eventId)+'"]')||null;
    }catch(e){
      return null;
    }
  }

  function getTimelineEventHighlight(eventId){
    const tlDoc=getTimelineFrameWindow()?.document;
    const popupTitle=tlDoc?.querySelector('#popover.show #pop-title');
    if(popupTitle) return popupTitle;
    const anchor=getTimelineEventAnchor(eventId);
    return anchor?.querySelector('.txt-title,.dtl-card')||anchor;
  }

  function attachChatReturnToTimelineEvent(eventId,attempt){
    const tries=Number(attempt||0);
    const anchor=getTimelineEventHighlight(eventId);
    if(anchor){
      highlightChatJumpElement(anchor);
      setChatSourceReturnAnchor({
        prefer:'text',
        persistHighlight:true,
        getElement:()=>getTimelineEventHighlight(eventId)
      });
      return;
    }
    if(tries>=36) return;
    chatSourceReturnRetryTimer=setTimeout(()=>{
      attachChatReturnToTimelineEvent(eventId,tries+1);
    },120);
  }

  function flashOutsideDocRow(row){
    if(!row) return;
    highlightChatJumpElement(row);
  }

  function clearOutsideDocFlashTimers(){
    outsideDocFlashTimers.forEach(timer=>clearTimeout(timer));
    outsideDocFlashTimers=[];
  }

  function attachChatReturnToOutsideDoc(docIdx,attempt){
    const tries=Number(attempt||0);
    const row=getOutsideDocRow(docIdx);
    if(row){
      clearOutsideDocFlashTimers();
      flashOutsideDocRow(row);
      [160,420,880,1480].forEach(delay=>{
        const timer=setTimeout(()=>{
          const currentRow=getOutsideDocRow(docIdx);
          if(currentRow) flashOutsideDocRow(currentRow);
        },delay);
        outsideDocFlashTimers.push(timer);
      });
      setChatSourceReturnAnchor({
        prefer:'text',
        getElement:()=>getOutsideDocRow(docIdx)
      });
      return;
    }
    if(tries>=40) return;
    chatSourceReturnRetryTimer=setTimeout(()=>{
      attachChatReturnToOutsideDoc(docIdx,tries+1);
    },140);
  }

  function clearArchiveInlineHighlight(){
    const markEl=activeArchiveInlineHighlight;
    activeArchiveInlineHighlight=null;
    activeArchiveInlineHighlightKey='';
    if(!markEl||!markEl.parentNode) return;
    const textNode=document.createTextNode(markEl.textContent||'');
    markEl.parentNode.replaceChild(textNode,markEl);
    if(textNode.parentNode&&typeof textNode.parentNode.normalize==='function'){
      textNode.parentNode.normalize();
    }
  }

  function flashArchiveTarget(target){
    if(!target) return;
    target.classList.remove('archive-locate-flash');
    target.getBoundingClientRect();
    target.classList.add('archive-locate-flash');
    clearTimeout(target._archiveLocateTimer);
    target._archiveLocateTimer=setTimeout(()=>{
      target.classList.remove('archive-locate-flash');
    },1700);
  }

  function getArchiveCandidateElements(scope){
    return [...(scope||document).querySelectorAll(LOCAL_CHAT_TEXT_SELECTOR)];
  }

  function getArchiveHighlightContainer(target){
    if(!target||!(target instanceof Element)) return target||null;
    return target.closest(
      '.dc-chart-card,.dc-pill-wrap,.dc-rank-grid,.dc-two-col-chart-table,.dc-three-col-wrap,.dc-cards,.dc-kw-wrap,.dc-col-scroll-wrap,[data-doc-idx]'
    )||target;
  }

  function shouldUseContainerHighlight(target,source){
    if(!target||!(target instanceof Element)) return false;
    const locator=source?.locator||{};
    if(locator.type==='outside-doc') return true;
    if(locator.pageId==='page-discourse'){
      return target.matches('.dc-chart-card,.dc-pill-wrap,.dc-rank-grid,.dc-two-col-chart-table,.dc-three-col-wrap,.dc-cards,.dc-kw-wrap,.dc-col-scroll-wrap');
    }
    return false;
  }

  function findArchiveTextMatch(target,source){
    if(!target) return null;
    const locator=source?.locator||{};
    const phrases=uniqueBy(
      [
        locator.highlightText,
        locator.matchText,
        locator.query,
        source?.snippet
      ]
        .map(value=>normalizeSearchText(value))
        .filter(Boolean)
        .sort((a,b)=>b.length-a.length),
      value=>value.toLowerCase()
    );
    const tokens=Array.isArray(locator.queryTokens)
      ? [...new Set(locator.queryTokens)].sort((a,b)=>b.length-a.length)
      : [];
    const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node||!normalizeSearchText(node.nodeValue||'')) return NodeFilter.FILTER_REJECT;
        const parent=node.parentElement;
        if(!parent||parent.closest('script,style,noscript,#chat-panel,#page-chat')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let textNode;
    while((textNode=walker.nextNode())){
      const rawText=textNode.nodeValue||'';
      const lowered=rawText.toLowerCase();
      for(const phrase of phrases){
        const needle=phrase.toLowerCase();
        const phraseIndex=lowered.indexOf(needle);
        if(needle&&phraseIndex!==-1){
          return {node:textNode,start:phraseIndex,length:needle.length};
        }
      }
      for(const token of tokens){
        const tokenIndex=lowered.indexOf(token.toLowerCase());
        if(tokenIndex!==-1){
          return {node:textNode,start:tokenIndex,length:token.length};
        }
      }
    }
    return null;
  }

  function highlightArchiveTextTarget(target,source){
    const sourceKey=getArchiveSourceKey(source);
    const containerTarget=getArchiveHighlightContainer(target);
    if(shouldUseContainerHighlight(containerTarget,source)){
      if(
        activeArchiveContainerHighlight&&
        activeArchiveContainerHighlight.isConnected&&
        activeArchiveContainerHighlightKey===sourceKey&&
        containerTarget===activeArchiveContainerHighlight
      ){
        return activeArchiveContainerHighlight;
      }
      clearArchiveInlineHighlight();
      clearArchiveContainerHighlight();
      containerTarget.classList.add('archive-container-highlight','archive-container-highlight-pulse');
      activeArchiveContainerHighlight=containerTarget;
      activeArchiveContainerHighlightKey=sourceKey;
      setTimeout(()=>{
        if(activeArchiveContainerHighlight===containerTarget){
          containerTarget.classList.remove('archive-container-highlight-pulse');
        }
      },1700);
      return containerTarget;
    }
    if(
      activeArchiveInlineHighlight&&
      activeArchiveInlineHighlight.isConnected&&
      activeArchiveInlineHighlightKey===sourceKey&&
      target.contains(activeArchiveInlineHighlight)
    ){
      return activeArchiveInlineHighlight;
    }
    clearArchiveInlineHighlight();
    const match=findArchiveTextMatch(target,source);
    if(!match){
      highlightChatJumpElement(target);
      return target;
    }
    const range=document.createRange();
    range.setStart(match.node,match.start);
    range.setEnd(match.node,match.start+match.length);
    const mark=document.createElement('mark');
    mark.className='archive-inline-highlight archive-inline-highlight-pulse';
    try{
      range.surroundContents(mark);
    }catch(e){
      flashArchiveTarget(target);
      return target;
    }
    activeArchiveInlineHighlight=mark;
    activeArchiveInlineHighlightKey=sourceKey;
    setTimeout(()=>{
      if(activeArchiveInlineHighlight===mark){
        mark.classList.remove('archive-inline-highlight-pulse');
      }
    },1700);
    return mark;
  }

  function getActiveArchiveAnchorForSource(source){
    const sourceKey=getArchiveSourceKey(source);
    if(
      activeArchiveContainerHighlight&&
      activeArchiveContainerHighlight.isConnected&&
      activeArchiveContainerHighlightKey===sourceKey
    ){
      return activeArchiveContainerHighlight;
    }
    if(
      activeArchiveInlineHighlight&&
      activeArchiveInlineHighlight.isConnected&&
      activeArchiveInlineHighlightKey===sourceKey
    ){
      return activeArchiveInlineHighlight;
    }
    const fallback=findArchiveTarget(source);
    return fallback&&fallback.isConnected?fallback:null;
  }

  function refreshArchiveTextSource(source,options){
    const resolved=findArchiveTarget(source);
    if(!resolved) return null;
    const highlightTarget=source?.locator?.type==='text'
      ? highlightArchiveTextTarget(resolved,source)
      : resolved;
    const scrollTarget=highlightTarget||resolved;
    if(options?.scroll){
      scrollTarget.scrollIntoView({
        behavior:options.behavior||'smooth',
        block:options.block||'center'
      });
    }
    setChatSourceReturnAnchor({
      prefer:'text',
      getElement:()=>getActiveArchiveAnchorForSource(source)
    });
    if(options?.flash&&source?.locator?.type!=='text') highlightChatJumpElement(resolved);
    return scrollTarget;
  }

  function scheduleArchiveTextSourceRefresh(source){
    clearArchiveHighlightRefreshTimers();
    const token=++archiveHighlightRefreshToken;
    [120,340,820,1680].forEach(delay=>{
      const timer=setTimeout(()=>{
        if(token!==archiveHighlightRefreshToken) return;
        refreshArchiveTextSource(source,{scroll:false,flash:false});
      },delay);
      archiveHighlightRefreshTimers.push(timer);
    });
  }

  function findArchiveTarget(source){
    const locator=source?.locator||{};
    if(locator.type==='event') return null;
    if(locator.type==='outside-doc') return getOutsideDocRow(locator.docIdx);
    const pageRoot=locator.pageId?document.getElementById(locator.pageId):null;
    if(locator.sectionId){
      const sectionEl=document.getElementById(locator.sectionId);
      if(sectionEl){
        const exactMatch=findArchiveTextMatch(sectionEl,source);
        if(exactMatch) return getArchiveHighlightContainer(exactMatch.node.parentElement||sectionEl);
      }
    }
    const scope=pageRoot||document;
    const candidates=getArchiveCandidateElements(scope);
    const titleNeedle=normalizeSearchText(source?.title||locator.heading).toLowerCase();
    const snippetNeedle=normalizeSearchText(source?.snippet||locator.query).toLowerCase();
    const textNeedle=normalizeSearchText(locator.matchText).toLowerCase();
    const highlightNeedle=normalizeSearchText(locator.highlightText).toLowerCase();
    let best=null;
    let bestScore=0;
    candidates.forEach(el=>{
      const text=normalizeSearchText(el.textContent||'').toLowerCase();
      if(!text) return;
      let score=0;
      if(textNeedle&&text.includes(textNeedle)) score+=18;
      if(highlightNeedle&&text.includes(highlightNeedle)) score+=14;
      if(titleNeedle&&text.includes(titleNeedle)) score+=10;
      if(snippetNeedle){
        if(text.includes(snippetNeedle)) score+=12;
        else{
          const sample=snippetNeedle.slice(0,90);
          if(sample&&text.includes(sample)) score+=8;
        }
      }
      if(score<=bestScore) return;
      bestScore=score;
      best=getArchiveHighlightContainer(el);
    });
    return best;
  }

  function restoreChatSourceView(){
    if(!chatSourceReturnState) return;
    const next=chatSourceReturnState;
    chatSourceReturnState=null;
    clearChatSourceReturnAnchor();
    resetArchiveHighlightSession();
    if(next.view==='widget'){
      if(typeof window.showPage==='function'&&next.page&&getCurrentPageName()!==next.page){
        window.showPage(next.page);
      }
      setTimeout(()=>{
        if(typeof window.openFloatingChatPanel==='function') window.openFloatingChatPanel();
      },80);
      return;
    }
    if(typeof window.showPage==='function'){
      window.showPage('chat',next.chatOriginPage||next.page||'home');
    }
  }

  function navigateToArchiveSource(source){
    const locator=source?.locator||{};
    const currentPage=getCurrentPageName();
    const fallbackChatOrigin=(typeof _chatOriginPage==='string'&&_chatOriginPage)?_chatOriginPage:'home';
    resetArchiveHighlightSession();
    clearChatSourceReturnAnchor();
    chatSourceReturnState=state.panelOpen
      ? {view:'widget',page:currentPage}
      : {view:'page',page:currentPage,chatOriginPage:fallbackChatOrigin};
    if(state.panelOpen&&typeof window.closeFloatingChatPanel==='function'){
      window.closeFloatingChatPanel();
    }
    if(locator.type==='event'&&Number.isFinite(Number(locator.eventId))){
      if(locator.pageId==='page-timeline2'&&typeof window.openTimeline2View==='function'){
        window.openTimeline2View('overview', Number.isFinite(Number(locator.year))?Number(locator.year):null, currentPage, Number(locator.eventId));
        setTimeout(()=>{
          attachChatReturnToTimelineEvent(Number(locator.eventId),0);
        },currentPage==='timeline2'?240:380);
        return;
      }
      if(typeof window.showPage==='function'&&currentPage!=='archive'){
        window.showPage('archive',currentPage);
      }
      setTimeout(()=>{
        jumpToArchiveEvent(locator.eventId);
      },currentPage==='archive'?70:180);
      setTimeout(()=>{
        attachChatReturnToEventPopup(0);
      },currentPage==='archive'?180:300);
      return;
    }
    if(locator.type==='outside-doc'&&Number.isFinite(Number(locator.docIdx))){
      if(typeof window.showPage==='function'&&currentPage!=='timeline2'){
        window.showPage('timeline2',currentPage);
      }
      setTimeout(()=>{
        openOutsideSearchResult(Number(locator.docIdx),Number(locator.year));
      },currentPage==='timeline2'?80:180);
      setTimeout(()=>{
        attachChatReturnToOutsideDoc(Number(locator.docIdx),0);
      },currentPage==='timeline2'?220:360);
      return;
    }
    const target=findArchiveTarget(source);
    const targetPage=getPageNameFromId(locator.pageId||target?.closest('.page')?.id||'page-home');
    if(typeof window.showPage==='function'&&currentPage!==targetPage){
      window.showPage(targetPage);
    }
    const discoursePanel=targetPage==='discourse'?target?.closest('.dc-platform-panel'):null;
    const discourseTab=discoursePanel
      ? document.querySelector('#page-discourse .dc-ptab[data-panel="'+discoursePanel.id.replace('dc-panel-','')+'"]')
      : null;
    const switchedPanel=Boolean(discourseTab&&!discourseTab.classList.contains('on'));
    if(switchedPanel) discourseTab.click();
    const reveal=()=>{
      refreshArchiveTextSource(source,{scroll:true,behavior:'smooth',flash:true});
      scheduleArchiveTextSourceRefresh(source);
    };
    setTimeout(reveal, switchedPanel?560:(currentPage===targetPage?40:180));
  }
  window.handleChatArchiveSourceJump=function(turnId,sourceIndex){
    const targetTurn=findTurnById(turnId);
    const targetSource=targetTurn?.sources?.[Number(sourceIndex)];
    if(targetSource) navigateToArchiveSource(targetSource);
  };

  function renderTurnActions(turn){
    if(turn.role!=='assistant'||turn.pending||!Array.isArray(turn.actions)||!turn.actions.length) return '';
    return '<div class="chat-turn-actions">'+turn.actions.map((action,index)=>
      '<button class="chat-turn-action'+(action.style==='primary'?' primary':'')+'" type="button" data-turn-id="'+escapeHtml(turn.id)+'" data-action-index="'+escapeHtml(index)+'"'+(action.disabled?' disabled':'')+'>'+escapeHtml(action.label||'Action')+'</button>'
    ).join('')+'</div>';
  }

  function syncTurnActions(turnEl,turn){
    if(!turnEl) return;
    turnEl.querySelectorAll('.chat-turn-actions').forEach(el=>el.remove());
    if(turn.role!=='assistant'||turn.pending||!Array.isArray(turn.actions)||!turn.actions.length) return;
    const actions=document.createElement('div');
    actions.className='chat-turn-actions';
    actions.innerHTML=turn.actions.map((action,index)=>
      '<button class="chat-turn-action'+(action.style==='primary'?' primary':'')+'" type="button" data-turn-id="'+escapeHtml(turn.id)+'" data-action-index="'+escapeHtml(index)+'"'+(action.disabled?' disabled':'')+'>'+escapeHtml(action.label||'Action')+'</button>'
    ).join('');
    const sourceGrid=turnEl.querySelector('.chat-source-grid');
    if(sourceGrid) turnEl.insertBefore(actions,sourceGrid);
    else turnEl.appendChild(actions);
  }

  function syncTurnSources(turnEl,turn){
    if(!turnEl) return;
    turnEl.querySelectorAll('.chat-source-grid').forEach(el=>el.remove());
    if(turn.role!=='assistant'||turn.pending||!Array.isArray(turn.sources)||!turn.sources.length) return;
    const grid=document.createElement('div');
    grid.className='chat-source-grid';
    grid.innerHTML=turn.sources.slice(0,MAX_SOURCE_CARDS).map((source,index)=>renderSourceCard(source,turn.id,index)).join('');
    turnEl.appendChild(grid);
  }

  function bindSourceJumpDelegation(thread){
    if(!thread||thread._chatSourceJumpBound) return;
    thread._chatSourceJumpBound=true;
    thread.addEventListener('click',event=>{
      const actionBtn=event.target.closest('.chat-turn-action');
      if(actionBtn){
        const actionIndex=Number(actionBtn.getAttribute('data-action-index'));
        const targetTurn=findTurnById(actionBtn.getAttribute('data-turn-id'));
        const action=targetTurn?.actions?.[actionIndex];
        if(
          action?.kind==='weak-web-choice'&&
          state.pendingWeakSuggestion&&
          state.pendingWeakSuggestion.turnId===targetTurn?.id
        ){
          submitQuestion(action.value);
        }
        if(
          action?.kind==='external-source-choice'&&
          state.pendingExternalSuggestion&&
          state.pendingExternalSuggestion.turnId===targetTurn?.id
        ){
          submitQuestion(action.value);
        }
        return;
      }
      const btn=event.target.closest('.chat-source-jump');
      if(!btn) return;
      const sourceIndex=Number(btn.getAttribute('data-source-index'));
      const targetTurn=findTurnById(btn.getAttribute('data-turn-id'));
      const targetSource=targetTurn?.sources?.[sourceIndex];
      if(targetSource) navigateToArchiveSource(targetSource);
    });
  }

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

  function buildTurnMarkers(){
    return state.turns
      .filter(turn=>turn.role==='user')
      .map(turn=>({id:turn.id,question:turn.text||''}));
  }

  function renderPageSourceRail(){
    const rail=els.pageSourceRail;
    if(!rail) return;
    const links=state.turns.flatMap(turn=>
      turn.role==='assistant'&&!turn.pending&&Array.isArray(turn.sources)
        ? turn.sources.slice(0,MAX_SOURCE_CARDS).flatMap((source,index)=>
            source&&!sourceIsExternalResource(source)?[{turnId:turn.id,index,source}]:[])
        : []
    );
    rail.innerHTML='<div class="chat-source-rail-heading">IN THE ARCHIVE <span>'+links.length+'</span></div>'+
      (links.length
        ? '<div class="chat-source-rail-list">'+links.map(({turnId,index,source},position)=>
            '<button class="chat-source-rail-link" type="button" data-turn-id="'+escapeHtml(turnId)+'" data-source-index="'+index+'" title="'+escapeHtml(source.title||'Archive source')+'">'+
              '<span class="chat-source-rail-number">'+String(position+1).padStart(2,'0')+'</span>'+
              '<span class="chat-source-rail-text">'+escapeHtml(source.title||'Archive source')+'</span>'+
            '</button>'
          ).join('')+'</div>'
        : '<p class="chat-source-rail-empty">Archive links appear here when a reply finds a match.</p>');
  }

  function findTurnEl(thread, turnId){
    if(!thread||!turnId) return null;
    return thread.querySelector('.chat-turn[data-turn-id="'+turnId+'"]');
  }

  function bumpTurnBubble(turn){
    if(!turn) return;
    const bubble=turn.querySelector('.chat-bubble');
    if(!bubble) return;
    bubble.classList.remove('chat-bubble-bump');
    bubble.getBoundingClientRect();
    bubble.classList.add('chat-bubble-bump');
    clearTimeout(turn._chatBubbleBumpTimer);
    turn._chatBubbleBumpTimer=setTimeout(()=>{
      bubble.classList.remove('chat-bubble-bump');
    },360);
  }

  function setRailActive(rail, turnId){
    if(!rail) return;
    rail.querySelectorAll('.chat-node-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-turn-id')===turnId);
    });
  }

  function syncAllRailStates(){
    syncRailActive(els.widgetThread, els.widgetRail);
    syncRailActive(els.pageThread, els.pageRail);
  }

  function syncRailActive(thread, rail){
    if(!rail) return;
    if(state.activeTurnId && !state.turns.some(turn=>turn.id===state.activeTurnId)){
      clearChatActiveTurn(true);
      return;
    }
    setRailActive(rail,state.activeTurnId);
  }

  function refreshRailLayout(thread, rail){
    if(!thread||!rail) return;
    if(rail===els.pageRail){
      rail.style.removeProperty('height');
    }else{
      rail.style.height=thread.clientHeight+'px';
    }
    const railRect=rail.getBoundingClientRect();
    rail.querySelectorAll('.chat-node-btn').forEach(btn=>{
      const turn=findTurnEl(thread, btn.getAttribute('data-turn-id'));
      if(!turn) return;
      const railHeight=rail.clientHeight||thread.clientHeight||0;
      let center;
      if(rail===els.pageRail){
        center=22+(turn.offsetTop/Math.max(thread.scrollHeight,1))*Math.max(0,railHeight-44);
      }else{
        const bubble=turn.querySelector('.chat-bubble')||turn;
        const bubbleRect=bubble.getBoundingClientRect();
        center=bubbleRect.top+(bubbleRect.height/2)-railRect.top;
      }
      btn.style.top=clamp(center, 12, Math.max(12, railHeight-12))+'px';
    });
    syncRailActive(thread,rail);
  }

  function ensureThreadSyncBinding(thread){
    if(!thread||thread._chatSyncBound) return;
    thread._chatSyncBound=true;
    thread.addEventListener('scroll',()=>{
      if(thread._chatSyncFrame) return;
      thread._chatSyncFrame=requestAnimationFrame(()=>{
        thread._chatSyncFrame=null;
        refreshRailLayout(thread,thread._chatRail);
      });
    },{passive:true});
  }

  function attachRail(rail, thread){
    if(!rail||!thread) return;
    rail.classList.toggle('is-empty', !state.turns.length);
    if(!state.turns.length){
      clearChatActiveTurn(true);
      rail.innerHTML='';
      thread._chatRail=rail;
      if(rail===els.pageRail){
        rail.style.removeProperty('height');
      }else{
        rail.style.height=thread.clientHeight+'px';
      }
      syncRailActive(thread,rail);
      return;
    }
    const markers=buildTurnMarkers();
    rail.innerHTML=markers.map((marker,index)=>'<button class="chat-node-btn" type="button" data-turn-id="'+escapeHtml(marker.id)+'" aria-label="Jump to question '+(index+1)+': '+escapeHtml(marker.question)+'" title="'+escapeHtml(marker.question)+'">'+(rail===els.pageRail?'<span>'+String(index+1).padStart(2,'0')+'</span>':'')+'</button>').join('');
    rail.querySelectorAll('.chat-node-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const turnId=btn.getAttribute('data-turn-id');
        pulseChatActiveTurn(turnId,500);
        const target=findTurnEl(thread,turnId);
        if(!target) return;
        bumpTurnBubble(target);
        const bubble=target.querySelector('.chat-bubble')||target;
        const bubbleRect=bubble.getBoundingClientRect();
        const threadRect=thread.getBoundingClientRect();
        const offset=thread.scrollTop + (bubbleRect.top-threadRect.top) - Math.max(24, thread.clientHeight*0.2);
        thread.scrollTo({top:Math.max(0,offset),behavior:'smooth'});
        setTimeout(()=>bumpTurnBubble(target),160);
      });
    });
    thread._chatRail=rail;
    ensureThreadSyncBinding(thread);
    refreshRailLayout(thread,rail);
  }

  function formatSeenDate(raw){
    if(!raw) return 'Recent';
    const compact=String(raw).trim();
    const simpleMatch=compact.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if(simpleMatch){
      const [,yy,mm,dd,hh='00',mi='00',ss='00']=simpleMatch;
      const date=new Date(+yy,+mm-1,+dd,+hh,+mi,+ss);
      return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(date);
    }
    const match=compact.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if(!match) return compact;
    const [,yy,mm,dd,hh,mi,ss]=match;
    const date=new Date(Date.UTC(+yy,+mm-1,+dd,+hh,+mi,+ss));
    return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(date);
  }

  function safeDomain(url){
    try{
      return new URL(url).hostname.replace(/^www\./,'');
    }catch(e){
      return '';
    }
  }

  function formatSourceLabel(source){
    return String(source||'Source').replace(/^www\./,'');
  }

  function buildNewsQueries(question){
    const normalized=question.trim().replace(/\s+/g,' ');
    const keywordQuery=getRelevantQueryTokens(tokenizeSearchText(question)).slice(0,6).join(' ');
    const hasKirunaContext=/\b(kiruna|kirunavaara|lkab|norrbotten)\b/i.test(normalized);
    const hasSwedenContext=/\b(sweden|swedish|sverige|swiden)\b/i.test(normalized);
    const contextPrefix=[
      hasKirunaContext?'':'Kiruna',
      hasSwedenContext?'':'Sweden'
    ].filter(Boolean).join(' ');
    const contextSuffix=[
      hasKirunaContext?'':'Kiruna',
      hasSwedenContext?'':'Sweden'
    ].filter(Boolean).join(' ');
    return [
      contextPrefix?contextPrefix+' '+normalized:normalized,
      normalized+(contextSuffix?' '+contextSuffix:''),
      'Kiruna Sweden '+(keywordQuery||normalized),
      'LKAB Kiruna Sweden '+(keywordQuery||normalized),
      normalized
    ]
      .map(value=>value.trim())
      .filter(Boolean)
      .filter((value,index,list)=>list.indexOf(value)===index);
  }

  function splitHeadlineAndSource(rawTitle){
    const title=String(rawTitle||'').trim();
    const dividerIndex=title.lastIndexOf(' - ');
    if(dividerIndex>0){
      return {
        headline:title.slice(0,dividerIndex).trim(),
        source:title.slice(dividerIndex+3).trim()
      };
    }
    return {
      headline:title,
      source:''
    };
  }

  async function requestNewsArticles(query){
    const encodedQuery=encodeURIComponent(query);
    const rssUrl='https://news.google.com/rss/search?q='+encodedQuery+'&hl=en-US&gl=SE&ceid=SE:en';
    const apiUrl='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(rssUrl);
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),9000);
    let response;
    try{
      response=await fetch(apiUrl,{signal:controller.signal});
    }finally{
      clearTimeout(timeoutId);
    }
    if(!response.ok){
      throw new Error('News request failed with status '+response.status);
    }
    const data=await response.json();
    if(data.status!=='ok'){
      throw new Error(data.message||'News feed request failed');
    }
    return Array.isArray(data.items)?data.items:[];
  }

  async function fetchSourceAnswers(question){
    if(window.location.protocol!=='file:'&&window.location.origin!=='null'){
      try{
        const response=await fetch(CHAT_WEAK_WEB_ENDPOINT,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({question})
        });
        const payload=await response.json().catch(()=>null);
        if(response.ok&&Array.isArray(payload?.sources)&&payload.sources.length){
          return payload.sources.slice(0,MAX_SOURCE_CARDS);
        }
      }catch(e){}
    }
    const queries=buildNewsQueries(question);
    const seenUrls=new Set();
    const collected=[];
    for(const query of queries){
      const articles=await requestNewsArticles(query);
      articles.forEach(article=>{
        const url=String(article.link||article.guid||'').trim();
        const title=String(article.title||'').trim();
        const parts=splitHeadlineAndSource(title);
        const sourceLabel=formatSourceLabel(parts.source||safeDomain(url)||'Google News');
        if(!url||!parts.headline||seenUrls.has(url)) return;
        seenUrls.add(url);
        collected.push({
          url,
          title:parts.headline,
          domain:sourceLabel,
          seendate:article.pubDate||'',
          language:'',
          sourcecountry:''
        });
      });
      if(collected.length>=12) break;
    }

    const distinctSources=[];
    const seenDomains=new Set();
    collected.forEach(article=>{
      if(distinctSources.length>=MAX_SOURCE_CARDS) return;
      if(!article.domain||seenDomains.has(article.domain)) return;
      seenDomains.add(article.domain);
      distinctSources.push(article);
    });

    if(distinctSources.length<Math.min(3,MAX_SOURCE_CARDS)){
      collected.forEach(article=>{
        if(distinctSources.length>=MAX_SOURCE_CARDS) return;
        if(distinctSources.some(item=>item.url===article.url)) return;
        distinctSources.push(article);
      });
    }

    return distinctSources.slice(0,MAX_SOURCE_CARDS);
  }

  function scoreWebSourceRelevance(question,queryTokens,questionYears,source){
    const normalizedQuestion=normalizeSearchText(question).toLowerCase();
    const haystack=normalizeSearchText([source.title,source.snippet,source.domain].join(' ')).toLowerCase();
    const hasKirunaSignal=LOCAL_CHAT_KIRUNA_TOPIC_RE.test(haystack);
    const hasSwedenSignal=LOCAL_CHAT_SWEDEN_CONTEXT_RE.test(haystack);
    const relevantTokens=getRelevantQueryTokens(queryTokens);
    const scoringTokens=relevantTokens.length?relevantTokens:queryTokens;
    let score=0;
    if(normalizedQuestion&&haystack.includes(normalizedQuestion)) score+=10;
    questionYears.forEach(year=>{
      if(haystack.includes(String(year))) score+=7;
    });
    scoringTokens
      .filter(token=>!/^\d{4}$/.test(token))
      .forEach(token=>{
        if(normalizeSearchText(source.title).toLowerCase().includes(token)) score+=4;
        else if(haystack.includes(token)) score+=2;
      });
    if(hasKirunaSignal) score+=12;
    if(hasSwedenSignal) score+=3;
    if(questionHasKirunaContext(question)&&!hasKirunaSignal) score-=12;
    else if(!hasKirunaSignal&&!hasSwedenSignal) score-=10;
    return score;
  }

  async function fetchWeakWebSuggestion(question){
    const queryTokens=tokenizeSearchText(question);
    const questionYears=extractQuestionYears(question);
    const sources=(await fetchSourceAnswers(question))
      .map(source=>({
        ...source,
        score:scoreWebSourceRelevance(question,queryTokens,questionYears,source)
      }))
      .filter(source=>sourceHasKirunaContext(source)&&source.score>=(questionYears.length?9:7))
      .sort((a,b)=>b.score-a.score)
      .slice(0,MAX_SOURCE_CARDS)
      .map(source=>{
        const next={...source};
        delete next.score;
        return next;
      });
    if(!sources.length) return null;
    return {
      question,
      sources,
      prompt:buildWeakWebPrompt(question,sources),
      answer:buildWeakWebAnswer(question,sources)
    };
  }

  function buildWeakWebPrompt(question,sources){
    return localizeForQuestion(question,{
      zh:'我没有找到强直接答案，但找到了弱相关的 web 线索。要展开看吗？可点 Yes / No，或直接输入。',
      it:'Non ho trovato una risposta diretta forte nell\'archive web, ma ho trovato indizi web più deboli. Vuoi vederli? Usa Yes / No qui sotto oppure scrivi.',
      en:'I could not find a strong direct archive answer, but I found weaker web clues. Show them? Use Yes / No below or type.'
    });
  }

  function buildWeakWebAnswer(question,sources){
    const lead=sources[0];
    const second=sources[1]||null;
    const third=sources[2]||null;
    return localizeForQuestion(question,{
      zh:(()=>{
        let text='这是弱相关 web 结果。最接近的线索是“'+lead.title+'”';
        if(lead.domain) text+='，来源于 '+lead.domain;
        text+='。';
        if(lead.snippet) text+=' '+lead.snippet;
        if(second) text+=' 另一个来源是“'+second.title+'”。';
        if(third) text+=' 还可交叉查看“'+third.title+'”。';
        return text;
      })(),
      it:(()=>{
        let text='Questo è il risultato web più debole. Il lead più vicino è "'+lead.title+'".';
        if(lead.snippet) text+=' '+lead.snippet;
        if(second) text+=' Un\'altra fonte è "'+second.title+'".';
        if(third) text+=' Puoi anche confrontare "'+third.title+'".';
        return text;
      })(),
      en:(()=>{
        let text='This is the weaker web result. The closest lead is "'+lead.title+'".';
        if(lead.snippet) text+=' '+lead.snippet;
        if(second) text+=' Another source is "'+second.title+'".';
        if(third) text+=' You can also cross-check "'+third.title+'".';
        return text;
      })()
    });
  }

  function buildNotFoundMessage(question){
    return localizeForQuestion(question,{
      zh:'我没有找到足够相关的答案。可以补一个年份、地点、人物或主题词。',
      it:'Non ho trovato una risposta affidabile. Prova ad aggiungere anno, luogo, persona o parola chiave.',
      en:'I could not find a reliable answer. Try adding a year, place, person, or topic keyword.'
    });
  }

  function questionNeedsFreshContext(question){
    return /\b(latest|recent|current|today|now|newest|updated|202[4-9]|this year)\b/i.test(question);
  }

  function updateTurn(turnId,patch){
    state.turns=state.turns.map(turn=>turn.id===turnId?Object.assign({},turn,patch):turn);
  }

  function setPendingWeakSuggestion(nextSuggestion){
    const previous=state.pendingWeakSuggestion;
    if(previous?.turnId){
      updateTurn(previous.turnId,{actions:[]});
    }
    state.pendingWeakSuggestion=nextSuggestion||null;
  }

  function setPendingExternalSuggestion(nextSuggestion){
    const previous=state.pendingExternalSuggestion;
    if(previous?.turnId){
      updateTurn(previous.turnId,{actions:[]});
    }
    state.pendingExternalSuggestion=nextSuggestion||null;
  }

  function emptyStateMarkup(thread){
    const description=thread===els.pageThread
      ? 'Searches the local archive first and answers directly. If nothing is found, it guides you through a yes/no flow to narrow results. Matches link to relevant content, <span class="chat-lead-highlight">highlighted in yellow</span>, with a floating button to quickly return to the conversation.'
      : 'Use the floating dot on any page or type here. Questions and replies are temporary and disappear after refresh.';
    return '<div class="chat-empty"><div class="chat-empty-card"><div class="chat-empty-eyebrow">Chat History</div><div class="chat-empty-title">Ask anything</div><div class="chat-empty-copy">'+description+'</div></div></div>';
  }

  function renderSourceCard(source,turnId,sourceIndex){
    const metaParts=[source.domain||'Source'];
    if(source.locationLabel) metaParts.push(source.locationLabel);
    if(source.seendate) metaParts.push(formatSeenDate(source.seendate));
    if(source.language) metaParts.push(source.language);
    const jumpLabel=source.jumpLabel||(
      source.locator?.type==='event'
        ? 'Locate on map →'
        : 'Locate in index →'
    );
    const snippet=source.snippet
      ? '<span class="chat-source-snippet">'+escapeHtml(source.snippet)+'</span>'
      : '';
    if(source.url){
      return '<a class="chat-source-card" href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener noreferrer">'+
        '<span class="chat-source-meta">'+escapeHtml(metaParts.join(' · '))+'</span>'+
        '<span class="chat-source-title">'+escapeHtml(source.title)+'</span>'+
        snippet+
        '<span class="chat-source-link">Open source ↗</span>'+
      '</a>';
    }
    return '<button class="chat-source-card chat-source-card-static chat-source-jump" type="button" data-turn-id="'+escapeHtml(turnId||'')+'" data-source-index="'+escapeHtml(sourceIndex)+'">'+
      '<span class="chat-source-meta">'+escapeHtml(metaParts.join(' · '))+'</span>'+
      '<span class="chat-source-title">'+escapeHtml(source.title)+'</span>'+
      snippet+
      '<span class="chat-source-link">'+escapeHtml(jumpLabel)+'</span>'+
    '</button>';
  }

  function renderTurn(turn){
    const roleClass=turn.role==='user'?'user':'assistant';
    const body=turn.pending
      ? '<div class="chat-bubble"><div class="chat-loading"><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span></div></div>'
      : '<div class="chat-bubble"><p>'+escapeHtml(turn.text||'')+'</p></div>';
    const actionsMarkup=renderTurnActions(turn);
    const sourceGrid=turn.role==='assistant'&&!turn.pending&&Array.isArray(turn.sources)&&turn.sources.length
      ? '<div class="chat-source-grid">'+turn.sources.slice(0,MAX_SOURCE_CARDS).map((source,index)=>renderSourceCard(source,turn.id,index)).join('')+'</div>'
      : '';
    return '<div class="chat-turn '+roleClass+'" data-turn-id="'+escapeHtml(turn.id)+'">'+body+actionsMarkup+sourceGrid+'</div>';
  }

  /* Smart patch: never replace existing turn nodes — only add/update/remove diff */
  function patchThread(thread){
    if(!thread) return;
    thread.classList.toggle('chat-empty-thread', !state.turns.length);
    if(!state.turns.length){
      if(thread===els.widgetThread&&document.documentElement.classList.contains('phone-app')&&thread.classList.contains('chat-has-draft')){
        thread.innerHTML='';
        thread.scrollTop=0;
        return;
      }
      // Show empty state only if not already shown
      if(!thread.querySelector('.chat-empty')){
        thread.innerHTML=emptyStateMarkup(thread);
      }
      thread.scrollTop=0;
      return;
    }
    // Remove empty state if present
    const emptyEl=thread.querySelector('.chat-empty');
    if(emptyEl) emptyEl.remove();

    const existingIds=new Set(
      Array.from(thread.querySelectorAll('.chat-turn')).map(el=>el.getAttribute('data-turn-id'))
    );

    state.turns.forEach(turn=>{
      const existing=thread.querySelector('.chat-turn[data-turn-id="'+turn.id+'"]');
      if(!existing){
        // New turn — append with animation
        const tmp=document.createElement('div');
        tmp.innerHTML=renderTurn(turn);
        const el=tmp.firstElementChild;
        thread.appendChild(el);
        existingIds.add(turn.id);
      } else if(turn.pending){
        // Keep pending bubble as-is (dots animating)
        existingIds.delete(turn.id);
        existingIds.add(turn.id);
      } else {
        const bubble=existing.querySelector('.chat-bubble');
        if(bubble){
          const nextBubbleHtml='<p>'+escapeHtml(turn.text||'')+'</p>';
          if(bubble.querySelector('.chat-loading')||bubble.innerHTML!==nextBubbleHtml){
            bubble.innerHTML=nextBubbleHtml;
          }
        }
        syncTurnActions(existing,turn);
        syncTurnSources(existing,turn);
      }
    });

    // Remove turns no longer in state
    const currentIds=new Set(state.turns.map(t=>t.id));
    thread.querySelectorAll('.chat-turn').forEach(el=>{
      if(!currentIds.has(el.getAttribute('data-turn-id'))) el.remove();
    });

    scrollThreadToBottom(thread);
  }

  function renderThread(thread){
    if(!thread) return;
    patchThread(thread);
  }

  function renderChatViews(){
    syncWidgetDraftState();
    renderThread(els.widgetThread);
    renderThread(els.pageThread);
    renderPageSourceRail();
    bindSourceJumpDelegation(els.widgetThread);
    bindSourceJumpDelegation(els.pageThread);
    attachRail(els.widgetRail, els.widgetThread);
    attachRail(els.pageRail, els.pageThread);
    [els.widgetSend,els.pageSend].forEach(button=>{
      if(!button) return;
      button.disabled=state.requestInFlight;
      button.classList.toggle('is-loading', state.requestInFlight);
      button.setAttribute('aria-label', state.requestInFlight?'Sending':'Send');
      button.setAttribute('title', state.requestInFlight?'Sending':'Send');
    });
    [els.widgetInput,els.pageInput].forEach(textarea=>normalizeTextareaHeight(textarea));
    scheduleChatEmptyOverlapState();
  }

  async function submitQuestion(rawQuestion){
    const question=String(rawQuestion||'').trim();
    if(!question||state.requestInFlight) return;
    clearChatActiveTurn(true);
    state.requestInFlight=true;
    markChatThinking();
    startLoadingTimer();
    const pendingWeakSuggestion=state.pendingWeakSuggestion;
    const pendingExternalSuggestion=state.pendingExternalSuggestion;
    if(pendingWeakSuggestion&&!isAffirmativeReply(question)&&!isNegativeReply(question)){
      setPendingWeakSuggestion(null);
    }
    if(pendingExternalSuggestion&&!isAffirmativeReply(question)&&!isNegativeReply(question)){
      setPendingExternalSuggestion(null);
    }
    const history=buildRequestHistory();

    state.turns=state.turns.concat([
      {id:makeId('user'),role:'user',text:question,sources:[]},
      {id:makeId('assistant'),role:'assistant',text:'',pending:true,sources:[]}
    ]).slice(-CHAT_MAX_TURNS);
    const pendingTurn=state.turns[state.turns.length-1];
    saveTurns();
    renderChatViews();
    scrollThreadToBottom(els.widgetThread,{force:true});
    scrollThreadToBottom(els.pageThread,{force:true});

    [els.widgetInput,els.pageInput].forEach(textarea=>{
      if(!textarea) return;
      textarea.value='';
      normalizeTextareaHeight(textarea);
    });
    if(document.documentElement.classList.contains('chat-compose-active')){
      blurChatInputs();
      exitChatComposeMode(120);
    }

    try{
      if(pendingExternalSuggestion&&isAffirmativeReply(question)){
        setPendingExternalSuggestion(null);
        updateTurn(pendingTurn.id,{
          pending:false,
          text:buildExternalSourcesAnswer(pendingExternalSuggestion.question||question),
          sources:Array.isArray(pendingExternalSuggestion.sources)?pendingExternalSuggestion.sources.slice(0,AI_SOURCE_CARD_LIMIT):[]
        });
        return;
      }
      if(pendingExternalSuggestion&&isNegativeReply(question)){
        setPendingExternalSuggestion(null);
        updateTurn(pendingTurn.id,{
          pending:false,
          text:buildExternalSourcesDeclineMessage(pendingExternalSuggestion.question||question),
          sources:[]
        });
        return;
      }
      if(pendingWeakSuggestion&&isAffirmativeReply(question)){
        setPendingWeakSuggestion(null);
        updateTurn(pendingTurn.id,{
          pending:false,
          text:pendingWeakSuggestion.answer,
          sources:Array.isArray(pendingWeakSuggestion.sources)?pendingWeakSuggestion.sources.slice(0,MAX_SOURCE_CARDS):[]
        });
        return;
      }
      if(pendingWeakSuggestion&&isNegativeReply(question)){
        setPendingWeakSuggestion(null);
        updateTurn(pendingTurn.id,{
          pending:false,
          text:buildNotFoundMessage(pendingWeakSuggestion.question||question),
          sources:[]
        });
        return;
      }
      const localSearch=searchLocalArchive(question);
      const preferredLocalArchive=getPreferredLocalArchiveSources(localSearch,question);
      const archiveCandidateSources=preferredLocalArchive.sources;
      if(archiveCandidateSources.length){
        let archiveEnhancedPayload=null;
        if(canReachChatApi()){
          try{
            const {response,payload}=await requestAssistantPayload(CHAT_ARCHIVE_ANSWER_ENDPOINT,{
              question,
              history,
              sources:archiveCandidateSources
            });
            if(response.ok&&hasArchiveEnhancedPayload(payload)){
              archiveEnhancedPayload=payload;
            }
          }catch(e){}
        }
        updateTurn(pendingTurn.id,{
          pending:false,
          text:archiveEnhancedPayload?.answer
            ? String(archiveEnhancedPayload.answer)
            : preferredLocalArchive.direct
              ? buildLocalAnswer(question,archiveCandidateSources)
              : buildLocalArchiveLeadAnswer(question,archiveCandidateSources),
          sources:archiveCandidateSources
        });
        return;
      }
      let apiError=null;
      if(canReachChatApi()){
        try{
          const {response,payload}=await requestAssistantPayload(CHAT_API_ENDPOINT,{question,history});
          if(response.ok&&hasStrongAiAnswerPayload(payload)){
            const answerText=String(payload?.answer||'No answer returned.');
            const disclosedSources=splitAssistantSourcesForDisclosure(payload?.sources);
            if(disclosedSources.externalSources.length){
              const nextExternalSuggestion={
                question,
                turnId:pendingTurn.id,
                answer:answerText,
                sources:disclosedSources.externalSources
              };
              setPendingExternalSuggestion(nextExternalSuggestion);
              updateTurn(pendingTurn.id,{
                pending:false,
                text:answerText+' '+buildExternalSourcesPrompt(question),
                actions:[
                  {kind:'external-source-choice',label:'Yes',value:'Yes',style:'primary'},
                  {kind:'external-source-choice',label:'No',value:'No'}
                ],
                sources:disclosedSources.archiveSources
              });
              return;
            }
            updateTurn(pendingTurn.id,{
              pending:false,
              text:answerText,
              sources:trimSourcesForTurn(payload?.sources,AI_SOURCE_CARD_LIMIT)
            });
            return;
          }
          if(!response.ok){
            apiError=new Error(payload?.error||'The assistant request failed.');
          }
        }catch(error){
          apiError=error;
        }
      }else{
        apiError=new Error('The AI API is not reachable from a static page context.');
      }

      let weakWebSuggestion=null;
      try{
        weakWebSuggestion=await fetchWeakWebSuggestion(question);
      }catch(e){
        weakWebSuggestion=null;
      }
      if(weakWebSuggestion){
        const nextWeakSuggestion={...weakWebSuggestion,turnId:pendingTurn.id};
        setPendingWeakSuggestion(nextWeakSuggestion);
        updateTurn(pendingTurn.id,{
          pending:false,
          text:nextWeakSuggestion.prompt,
          actions:[
            {kind:'weak-web-choice',label:'Yes',value:'Yes',style:'primary'},
            {kind:'weak-web-choice',label:'No',value:'No'}
          ],
          sources:[]
        });
        return;
      }

      if(apiError){
        updateTurn(pendingTurn.id,{
          pending:false,
          text:buildApiUnavailableMessage(question),
          sources:[]
        });
        return;
      }

      updateTurn(pendingTurn.id,{
        pending:false,
        text:buildNotFoundMessage(question),
        sources:[]
      });
    }catch(error){
      setPendingWeakSuggestion(null);
      updateTurn(pendingTurn.id,{
        pending:false,
        text:error&&/failed to fetch/i.test(error.message||'')
          ? buildNotFoundMessage(question)
          : buildNotFoundMessage(question),
        sources:[]
      });
    }finally{
      state.requestInFlight=false;
      stopLoadingTimer();
      markChatResponseReady();
      saveTurns();
      renderChatViews();
    }
  }

  function bindComposer(form,input){
    if(!form||!input) return;
    /* Detect if this input belongs to the floating widget vs the chat page */
    const isWidgetInput = input===els.widgetInput;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      submitQuestion(input.value);
    });
    input.addEventListener('focus',()=>{
      if(isPhoneComposeEligible()){
        if(isWidgetInput){
          /* Float panel: do NOT go fullscreen — just sync keyboard-aware position */
          syncChatComposeViewportVars(false);
          requestAnimationFrame(()=>positionPanel());
          return;
        }
        /* Chat page: enter full compose mode (hides hero, keyboard-fits layout) */
        enterChatComposeMode();
        syncChatComposeViewportVars(true);
        return;
      }
      syncChatViewportLayout();
      setTimeout(()=>syncChatViewportLayout(),120);
      setTimeout(()=>syncChatViewportLayout(),260);
    });
    input.addEventListener('blur',()=>{
      if(!isPhoneComposeEligible()){
        setTimeout(()=>syncChatViewportLayout({scroll:false}),120);
        return;
      }
      if(isWidgetInput){
        /* Float panel blur: just reposition, no fullscreen teardown */
        requestAnimationFrame(()=>{
          if(isChatInputElement(document.activeElement)) return;
          syncChatComposeViewportVars(false);
          requestAnimationFrame(()=>positionPanel());
        });
        return;
      }
      requestAnimationFrame(()=>{
        if(isChatInputElement(document.activeElement)) return;
        exitChatComposeMode(120);
      });
    });
    input.addEventListener('input',()=>{
      normalizeTextareaHeight(input);
      if(isWidgetInput) syncWidgetDraftState();
      if(!isWidgetInput&&document.documentElement.classList.contains('chat-compose-active')){
        syncChatComposeViewportVars(true);
      }else{
        if(isWidgetInput&&state.panelOpen) positionPanel();
        else syncChatViewportLayout();
      }
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!event.shiftKey){
        event.preventDefault();
        form.requestSubmit();
      }
    });
    normalizeTextareaHeight(input);
  }

  function onFabPointerDown(event){
    if(event.button!==undefined&&event.button!==0) return;
    state.drag={
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      originX:state.fabPos?state.fabPos.x:els.fab.getBoundingClientRect().left,
      originY:state.fabPos?state.fabPos.y:els.fab.getBoundingClientRect().top,
      moved:false
    };
    els.fab.classList.add('dragging');
    try{els.fab.setPointerCapture(event.pointerId);}catch(e){}
  }

  function onFabPointerMove(event){
    if(!state.drag||event.pointerId!==state.drag.pointerId) return;
    const dx=event.clientX-state.drag.startX;
    const dy=event.clientY-state.drag.startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4){
      state.drag.moved=true;
      state.suppressFabClick=true;
    }
    applyFabPos({
      x:state.drag.originX+dx,
      y:state.drag.originY+dy
    });
  }

  function endFabDrag(event){
    if(!state.drag||event.pointerId!==state.drag.pointerId) return;
    try{els.fab.releasePointerCapture(event.pointerId);}catch(e){}
    els.fab.classList.remove('dragging');
    if(state.drag.moved) saveFabPos();
    state.drag=null;
  }

  els.fab.addEventListener('pointerdown',onFabPointerDown);
  els.fab.addEventListener('pointermove',onFabPointerMove);
  els.fab.addEventListener('pointerup',endFabDrag);
  els.fab.addEventListener('pointercancel',event=>{
    endFabDrag(event);
  });
  els.fab.addEventListener('click',event=>{
    if(state.suppressFabClick){
      state.suppressFabClick=false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if(!state.panelOpen){
      dismissWelcome();
      // Icon changes instantly to circle
      els.fab.classList.add('open');
      // Brief activation bounce
      els.fab.classList.add('activating');
      setTimeout(()=>{
        els.fab.classList.remove('activating');
        openPanel();
      },260);
    } else {
      togglePanel();
    }
  });
  els.fab.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      togglePanel();
    }
  });

  els.panelClose.addEventListener('click',closePanel);
  document.getElementById('chat-welcome-close')?.addEventListener('click',dismissWelcome);
  document.getElementById('chat-welcome-ask')?.addEventListener('click',()=>{
    dismissWelcome();
    if(getCurrentPageName()==='chat') els.pageInput?.focus();
    else openPanel();
  });
  document.getElementById('chat-welcome-explore')?.addEventListener('click',()=>{
    dismissWelcome();
    window.showPage?.('archive',getCurrentPageName());
  });
  if(els.sourceReturnBtn){
    els.sourceReturnBtn.addEventListener('click',restoreChatSourceView);
  }
  // Dismiss back button when clicking anywhere outside it
  // Note: clicks inside iframes don't bubble to parent document,
  // so we also listen to window blur (fired when an iframe steals focus)
  document.addEventListener('click',event=>{
    if(!els.sourceReturnBtn||els.sourceReturnBtn.hidden) return;
    if(els.sourceReturnBtn.contains(event.target)) return;
    clearChatSourceReturnAnchor();
  },{capture:false});
  // When focus moves into an iframe (e.g. timeline2), window loses focus → dismiss button
  window.addEventListener('blur',()=>{
    if(!els.sourceReturnBtn||els.sourceReturnBtn.hidden) return;
    // Small delay to distinguish tab-switch from iframe click
    setTimeout(()=>{
      if(!els.sourceReturnBtn||els.sourceReturnBtn.hidden) return;
      clearChatSourceReturnAnchor();
    },80);
  });
  els.panelOpenPage.addEventListener('click',()=>{
    acknowledgeChatFabNotice();
    closePanel();
    const currentPage=getCurrentPageName();
    const originPage=currentPage!=='chat'?currentPage:'home';
    if(typeof window.showPage==='function') window.showPage('chat',originPage);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.panelOpen) closePanel();
  });
  document.addEventListener('scroll',()=>{
    if(chatSourceReturnAnchor) scheduleChatSourceReturnPosition();
  },{passive:true,capture:true});
  window.addEventListener('resize',()=>{
    if(document.documentElement.classList.contains('chat-compose-active')){
      syncChatComposeViewportVars(true);
      refreshChatLayoutAfterViewportChange();
      return;
    }
    applyFabPos(state.fabPos||getDefaultFabPos());
    refreshRailLayout(els.widgetThread, els.widgetRail);
    refreshRailLayout(els.pageThread, els.pageRail);
    if(chatSourceReturnAnchor) scheduleChatSourceReturnPosition();
    syncChatViewportLayout({scroll:false});
  },{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{
      if(document.documentElement.classList.contains('chat-compose-active')){
        syncChatComposeViewportVars(true);
        refreshChatLayoutAfterViewportChange();
        return;
      }
      /* If widget input is focused (keyboard open/close), reposition panel */
      if(state.panelOpen&&document.activeElement===els.widgetInput){
        syncChatComposeViewportVars(false);
        requestAnimationFrame(()=>positionPanel());
        return;
      }
      syncChatViewportLayout();
    },{passive:true});
    window.visualViewport.addEventListener('scroll',()=>{
      if(document.documentElement.classList.contains('chat-compose-active')){
        syncChatComposeViewportVars(true);
        refreshChatLayoutAfterViewportChange();
        return;
      }
      if(state.panelOpen&&document.activeElement===els.widgetInput){
        requestAnimationFrame(()=>positionPanel());
        return;
      }
      syncChatViewportLayout({scroll:false});
    },{passive:true});
  }

  bindComposer(els.widgetForm,els.widgetInput);
  bindComposer(els.pageForm,els.pageInput);
  els.pageSourceRail?.addEventListener('click',event=>{
    const link=event.target.closest('.chat-source-rail-link');
    if(link) window.handleChatArchiveSourceJump(link.dataset.turnId,link.dataset.sourceIndex);
  });
  applyFabPos(state.fabPos||getDefaultFabPos());
  welcomeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(maybeShowWelcome,500);
  renderChatViews();
  syncChatViewportLayout({scroll:false});
  window.refreshChatUI=()=>{
    renderChatViews();
    if(document.documentElement.classList.contains('chat-compose-active')){
      refreshChatLayoutAfterViewportChange();
      return;
    }
    syncChatViewportLayout({scroll:false});
  };
  window.clearChatSourceReturnAnchor=clearChatSourceReturnAnchor;

  // ── Chat board expand / collapse toggle ──
  (function(){
    const btn=document.getElementById('chat-board-toggle');
    const shell=document.querySelector('#page-chat .chat-page-shell');
    if(!btn||!shell) return;
    btn.addEventListener('click',()=>{
      const expanded=shell.classList.toggle('board-expanded');
      btn.setAttribute('aria-label', expanded ? 'Collapse chat' : 'Expand chat');
      btn.setAttribute('title',      expanded ? 'Collapse chat' : 'Expand chat');
      updateChatRailClipState(els.pageRail,els.pageForm);
      requestAnimationFrame(()=>refreshRailLayout(els.pageThread,els.pageRail));
      setTimeout(()=>refreshRailLayout(els.pageThread,els.pageRail),460);
    });
  })();
})();
