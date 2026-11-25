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
      style.textContent='.chat-jump-highlight,.pop-title.chat-jump-highlight + .pop-desc{background:#fff1a8!important;border-radius:6px!important}';
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
    if(!els.sourceReturnBtn) return;
    els.sourceReturnBtn.hidden=true;
    els.sourceReturnBtn.style.left='';
    els.sourceReturnBtn.style.top='';
  }

  function positionChatSourceReturnButton(){
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
