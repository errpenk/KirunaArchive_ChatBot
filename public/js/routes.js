(function(){
  const basePath=typeof document.baseURI==='string'?new URL(document.baseURI).pathname.replace(/\/$/,''):'';
  const paths={home:'/',archive:'/map',timeline2:'/time/inside/overview',gallery:'/gallery',discourse:'/discourse/x/posts',chat:'/chat'};
  const panels={xpost:'/discourse/x/posts',xreply:'/discourse/x/replies',rpost:'/discourse/reddit/posts',rreply:'/discourse/reddit/replies'};
  const types=['all','urban','mine','infra','social','env'];
  const calendarStart=year=>1900+Math.floor((year-1900)/35)*35;
  function parse(url){
    const pathname=url.pathname===basePath?'/':url.pathname.startsWith(basePath+'/')?url.pathname.slice(basePath.length):url.pathname;
    const parts=pathname.split('/').filter(Boolean);
    const params=url.searchParams;
    const state={page:({map:'archive',time:'timeline2',gallery:'gallery',discourse:'discourse',chat:'chat'})[parts[0]]||'home'};
    if(state.page==='archive'){
      state.event=parts[1]==='event'&&/^\d+$/.test(parts[2]||'')?Number(parts[2]):null;
      state.view=params.get('view')==='calendar'?'calendar':'timeline';
      state.type=types.includes(params.get('type'))?params.get('type'):'all';
      state.details=params.get('details')==='1';
    }
    if(state.page==='timeline2'){
      state.source=parts[1]==='outside'?'outside':'inside';
      state.view=['overview','year','calendar',...(state.source==='outside'?['cards']:[])].includes(parts[2])?parts[2]:'overview';
      for(const key of ['year','event']){
        const value=params.get(key);
        state[key]=value!==null&&/^\d+$/.test(value)?Number(value):null;
      }
      if(state.source==='outside'||state.year<1900||state.year>2035) state.year=null;
      if(state.source==='inside'&&state.view==='calendar')state.year=calendarStart(state.year??1935);
    }
    if(state.page==='discourse'){
      state.panel=Object.keys(panels).find(key=>panels[key]===pathname.replace(/\/$/,''))||'xpost';
      state.compare=['sentiment','keywords'].includes(params.get('compare'))?params.get('compare'):null;
    }
    if(state.page==='gallery'){
      state.source=parts[1]==='outside'?'outside':'inside';
      state.item=/^\d+$/.test(parts[2]||'')?Number(parts[2]):null;
    }
    return state;
  }
  function format(state){
    let path=paths[state.page]||'/';
    const query=new URLSearchParams();
    if(state.page==='archive'){
      if(state.event!==null&&state.event!==undefined) path+='/event/'+state.event;
      if(state.view==='calendar')query.set('view','calendar');
      if(types.includes(state.type)&&state.type!=='all')query.set('type',state.type);
      if(state.details)query.set('details','1');
    }
    if(state.page==='timeline2'){
      path='/time/'+(state.source==='outside'?'outside':'inside')+'/'+(['overview','year','calendar',...(state.source==='outside'?['cards']:[])].includes(state.view)?state.view:'overview');
      if(state.source==='inside'&&state.view==='calendar')query.set('year',calendarStart(Number.isInteger(state.year)&&state.year>=1900&&state.year<=2035?state.year:1935));
      else if(state.source!=='outside'&&Number.isInteger(state.year)&&state.year>=1900&&state.year<=2035)query.set('year',state.year);
      if(Number.isInteger(state.event))query.set('event',state.event);
    }
    if(state.page==='discourse'){
      path=panels[state.panel]||panels.xpost;
      if(['sentiment','keywords'].includes(state.compare))query.set('compare',state.compare);
    }
    if(state.page==='gallery'&&Number.isInteger(state.item))path+='/'+(state.source==='outside'?'outside':'inside')+'/'+state.item;
    return basePath+path+(query.size?'?'+query:'');
  }
  let restoring=false;
  let restoreToken=0;
  function write(state,replace=false){
    if(restoring)return;
    const next=format(state);
    if(next===location.pathname+location.search)return;
    history[replace?'replaceState':'pushState']({},'',next);
  }
  function update(page,patch,replace=false){
    if(!document.body.classList.contains('on-'+page))return;
    write({...parse(new URL(location.href)),...patch,page},replace);
  }
  async function restore(){
    const token=++restoreToken;
    const state=parse(new URL(location.href));
    restoring=true;
    history.replaceState({},'',format(state));
    try{
      if(state.page!=='gallery'||state.item===null)window.closeGalleryLightbox?.();
      window.showPage(state.page);
      if(state.page==='archive')await window.applyArchiveRoute(state);
      if(state.page==='discourse'){
        document.querySelector('.dc-ptab[data-panel="'+state.panel+'"]')?.click();
        if(state.compare){
          window.selectCmpModule(state.compare==='keywords'?'Keywords':'Sentiment');
          window.openComparePanel();
        }else window.closeComparePanel({immediate:true});
      }
      if(state.page==='gallery'&&state.item!==null)await window.restoreGalleryItem(state.source,state.item);
      if(state.page==='timeline2'){
        const frame=document.getElementById('timeline2-frame');
        if(!frame.contentWindow?.applyTimeRoute){
          await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
        }
        if(token===restoreToken)frame.contentWindow?.applyTimeRoute?.(state);
      }
    }finally{if(token===restoreToken)restoring=false;}
  }
  window.KirunaRoutes={parse,format,update,page:page=>write({page}),restore};
  window.addEventListener('popstate',restore);
  document.addEventListener('DOMContentLoaded',restore,{once:true});
})();
