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
