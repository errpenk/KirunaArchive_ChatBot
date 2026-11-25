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
      prompt:buildWeakWebPrompt(question),
      answer:buildWeakWebAnswer(question,sources)
    };
  }

  function buildWeakWebPrompt(question){
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
