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
