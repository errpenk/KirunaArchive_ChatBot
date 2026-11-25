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
        const score=scoreLocalTextEntry(normalizedQuestion,queryTokens,entry);
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
      zh:'我目前没有找到足够可靠的直接匹配。请换一个关键词或时间范围再试。',
      it:'Non ho trovato una corrispondenza diretta abbastanza affidabile. Prova con un altro termine o intervallo di date.',
      en:'I could not find a reliable direct match. Try a different keyword or date range.'
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
