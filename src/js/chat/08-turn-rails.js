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
    let activeId=state.activeTurnId;
    if(!activeId&&rail===els.pageRail){
      const focus=thread.getBoundingClientRect().top+Math.max(24,thread.clientHeight*0.2);
      const nearest=[...thread.querySelectorAll('.chat-turn.user')].reduce((best,turn)=>{
        const bubble=turn.querySelector('.chat-bubble')||turn;
        const rect=bubble.getBoundingClientRect();
        const distance=Math.abs(rect.top+rect.height/2-focus);
        return !best||distance<best.distance?{id:turn.dataset.turnId,distance}:best;
      },null);
      activeId=nearest?.id||null;
    }
    setRailActive(rail,activeId);
  }

  function refreshRailLayout(thread, rail){
    if(!thread||!rail) return;
    if(rail===els.pageRail){
      rail.style.removeProperty('height');
      const track=rail.querySelector('.chat-node-track');
      const trackHeight=Math.max(thread.scrollHeight,rail.clientHeight)+'px';
      if(track&&track.style.height!==trackHeight) track.style.height=trackHeight;
      if(Math.abs(rail.scrollTop-thread.scrollTop)>1) rail.scrollTop=thread.scrollTop;
      syncRailActive(thread,rail);
    }else{
      rail.style.height=thread.clientHeight+'px';
    }
    const railRect=rail.getBoundingClientRect();
    const threadTop=thread.getBoundingClientRect().top;
    const railHeight=rail.clientHeight||thread.clientHeight||0;
    const positions=[...rail.querySelectorAll('.chat-node-btn')].map(btn=>{
      const turn=findTurnEl(thread, btn.getAttribute('data-turn-id'));
      if(!turn) return null;
      let center;
      if(rail===els.pageRail){
        const bubble=turn.querySelector('.chat-bubble')||turn;
        const rect=bubble.getBoundingClientRect();
        center=rect.top+rect.height/2-threadTop+thread.scrollTop;
        if(btn.classList.contains('active')){
          const pinned=clamp(center,thread.scrollTop+16,thread.scrollTop+railHeight-16);
          return {btn,center:pinned,pinned:pinned!==center};
        }
      }else{
        const bubble=turn.querySelector('.chat-bubble')||turn;
        const bubbleRect=bubble.getBoundingClientRect();
        center=bubbleRect.top+(bubbleRect.height/2)-railRect.top;
      }
      return {btn,center:rail===els.pageRail?center:clamp(center,12,Math.max(12,railHeight-12)),pinned:false};
    });
    positions.forEach(position=>{
      if(!position) return;
      position.btn.classList.toggle('is-pinned',position.pinned);
      position.btn.style.top=position.center+'px';
    });
    if(rail!==els.pageRail) syncRailActive(thread,rail);
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
    const buttons=markers.map((marker,index)=>'<button class="chat-node-btn" type="button" data-turn-id="'+escapeHtml(marker.id)+'" aria-label="Jump to question '+(index+1)+': '+escapeHtml(marker.question)+'" title="'+escapeHtml(marker.question)+'">'+(rail===els.pageRail?'<span>'+String(index+1).padStart(2,'0')+'</span>':'')+'</button>').join('');
    rail.innerHTML=rail===els.pageRail?'<div class="chat-node-track">'+buttons+'</div>':buttons;
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
    if(rail===els.pageRail&&!rail._chatScrollBound){
      rail._chatScrollBound=true;
      rail.addEventListener('scroll',()=>{
        if(Math.abs(thread.scrollTop-rail.scrollTop)>1) thread.scrollTop=rail.scrollTop;
      },{passive:true});
    }
    refreshRailLayout(thread,rail);
  }
