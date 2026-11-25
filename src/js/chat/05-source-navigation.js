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
