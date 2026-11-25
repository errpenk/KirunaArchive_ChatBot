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
  window.addEventListener('resize',()=>{
    if(document.documentElement.classList.contains('chat-compose-active')){
      syncChatComposeViewportVars(true);
      refreshChatLayoutAfterViewportChange();
      return;
    }
    applyFabPos(state.fabPos||getDefaultFabPos());
    refreshRailLayout(els.widgetThread, els.widgetRail);
    refreshRailLayout(els.pageThread, els.pageRail);
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
