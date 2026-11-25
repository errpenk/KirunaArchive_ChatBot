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
        const index=getOutsideSearchIndex();
        return Array.isArray(index)?index:[];
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
        if(!el||el.closest('#nav,#chat-panel,#page-chat,#chat-fab')) return;
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

  function scoreLocalTextEntry(normalizedQuestion,queryTokens,entry){
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
