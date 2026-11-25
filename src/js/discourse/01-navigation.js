
function initDiscourse(){
  /* ══════════════════════════════════════════════
     NEW COLOUR SYSTEM — editorial, low-saturation
     Positive : soft sage teal
     Neutral  : cool stone grey
     Negative : warm clay rose
     Brand    : slate indigo (X)
     Reddit   : muted olive
  ══════════════════════════════════════════════ */
  const cPos   = '#6b9e8f';   /* sage teal         — positive  */
  const cNeu   = '#9eaab4';   /* stone grey         — neutral  */
  const cNeg   = '#c07a6a';   /* clay rose          — negative */
  const cBrand = '#5d7a96';   /* slate indigo       — X brand  */
  const cReddit= '#7a8f6b';   /* muted olive        — Reddit   */
  const gridC  = '#ebebf0';   /* very light rule    */
  const textC  = '#96a0aa';   /* axis / label text  */

  /* Transparent variants for fills */
  const cPosA  = 'rgba(107,158,143,.13)';
  const cNeuA  = 'rgba(158,170,180,.10)';
  const cNegA  = 'rgba(192,122,106,.12)';

  Chart.defaults.color = textC;
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.animation = { duration: 820, easing: 'easeOutQuart' };
  Chart.defaults.animations = {
    numbers: { type:'number', properties:['x','y','borderWidth','pointRadius','tension'] },
    colors:  { type:'color',  properties:['borderColor','backgroundColor','pointBackgroundColor'] }
  };
  /* Doughnut global override — spin + scale + gap */
  Chart.overrides.doughnut = Chart.overrides.doughnut || {};
  Chart.overrides.doughnut.animation = { animateRotate:true, animateScale:true, duration:950, easing:'easeOutExpo' };
  Chart.overrides.pie = Chart.overrides.pie || {};
  Chart.overrides.pie.animation = { animateRotate:true, animateScale:true, duration:950, easing:'easeOutExpo' };

  /* ── Shared chart option builders ── */
  /* Doughnut options factory — cleaner gap, inner label plugin */
  function donutOpts(labelFn){
    return {
      responsive:true, maintainAspectRatio:false,
      cutout:'72%',
      layout:{ padding:8 },
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{ label: labelFn || (c=>`${c.label}: ${c.raw}`) } }
      }
    };
  }
  /* Vertical bar options factory */
  function vBarOpts(yLabel){
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ grid:{ display:false }, ticks:{ maxRotation:0, color:textC } },
        y:{ grid:{ color:gridC, drawBorder:false }, border:{ display:false },
            ticks:{ color:textC },
            ...(yLabel ? { title:{ display:true, text:yLabel, color:textC, font:{ size:10 } } } : {}) }
      }
    };
  }
  /* Horizontal bar options factory */
  function hBarOpts(){
    return {
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ grid:{ color:gridC, drawBorder:false }, border:{ display:false }, ticks:{ color:textC } },
        y:{ grid:{ display:false }, ticks:{ color:textC, font:{ size:10 } } }
      }
    };
  }
  /* Stacked bar options factory */
  function stackedBarOpts(extra={}){
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ stacked:true, grid:{ display:false }, ticks:{ maxRotation:0, color:textC, ...((extra.xFont)?{font:extra.xFont}:{}) } },
        y:{ stacked:true, grid:{ color:gridC, drawBorder:false }, border:{ display:false }, ticks:{ color:textC } }
      }
    };
  }
  /* Line options factory */
  function lineOpts(){
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ grid:{ display:false }, ticks:{ maxRotation:0, color:textC } },
        y:{ grid:{ color:gridC, drawBorder:false }, border:{ display:false }, ticks:{ color:textC } }
      }
    };
  }

  /* ── Platform tab switching ── */
  const page=document.getElementById('page-discourse');
  const dcNav=document.querySelector('.dc-nav');
  const dcNavInner=document.querySelector('.dc-nav-inner');
  const dataAside=document.getElementById('dc-data-aside');
  const metaAside=document.getElementById('dc-meta-aside');
  let dataAsideFrame=0;
  const asideTimers=new Map();
  let lastAsideScrollTop=0;
  let metaScope='';
  let metaStep=0;

  function hideDataAsides(){
    [dataAside,metaAside].forEach(aside=>{
      clearTimeout(asideTimers.get(aside));
      aside?.classList.remove('is-visible','is-changing');
    });
  }

  function showDataAside(aside,notes,index,scope){
    const key=scope+'|'+index;
    if(aside.dataset.noteKey===key){
      aside.classList.add('is-visible');
      return;
    }
    const wasVisible=aside.classList.contains('is-visible');
    const movingUp=page.scrollTop<lastAsideScrollTop;
    clearTimeout(asideTimers.get(aside));
    aside.dataset.noteKey=key;
    aside.classList.toggle('is-up',movingUp);
    if(wasVisible) aside.classList.add('is-changing');
    const showNote=()=>{
      aside.querySelector('h3').textContent=notes[index].title;
      aside.querySelector('p').textContent=notes[index].copy;
      aside.classList.remove('is-changing');
      aside.classList.add('is-visible');
    };
    if(wasVisible) asideTimers.set(aside,setTimeout(showNote,180));
    else showNote();
  }

  function updateDataAside(){
    dataAsideFrame=0;
    if(!dataAside||!metaAside||page.classList.contains('off')||window.innerWidth<1240||
      document.documentElement.classList.contains('phone-app')||
      document.documentElement.classList.contains('tablet-app')){
      hideDataAsides();
      return;
    }
    const railTop=Math.round(page.scrollTop+
      Math.max(190,Math.min(window.innerHeight*.32,340))-page.getBoundingClientRect().top)+'px';
    dataAside.style.top=railTop;
    metaAside.style.top=railTop;
    const focusY=window.innerHeight*.55;
    const navRect=dcNav.getBoundingClientRect();
    const panel=page.querySelector('.dc-platform-panel.on');
    const sections=[...(panel?.querySelectorAll('.dc-section')||[])];
    const section=navRect.top<focusY-80
      ? sections.find(item=>{
          const rect=item.getBoundingClientRect();
          return rect.top<=focusY&&rect.bottom>focusY;
        })||sections.filter(item=>item.getBoundingClientRect().top<=focusY).at(-1)
      : null;
    const isHero=!section&&navRect.top>focusY-80;
    if(!section&&!isHero){
      hideDataAsides();
      return;
    }

    let readings,metadata,scope,index;
    if(isHero){
      const stats=[...page.querySelectorAll('.dc-hero .dc-hs')]
        .map(stat=>({value:stat.querySelector('.dc-hs-n').textContent,
          label:stat.querySelector('.dc-hs-l').textContent}));
      readings=[
        {title:'A shared story',copy:'Kiruna is discussed through both engineering achievement and contested displacement.'},
        {title:'Replies carry the debate',copy:'The four groups include 1,640 replies and 284 original posts; reactions make up most of the material.'},
        {title:'Compare the platforms',copy:'X/Twitter and Reddit are separated into posts and replies so their tones can be read independently.'}
      ];
      metadata=[
        {title:'Coverage',copy:page.querySelector('.dc-hero-eyebrow').textContent.trim()},
        {title:'Source platforms',copy:'X/Twitter and Reddit · original posts and replies'},
        {title:'Sample',copy:stats.map(stat=>stat.value+' '+stat.label.toLowerCase()).join(' · ')}
      ];
      const hero=page.querySelector('.dc-hero').getBoundingClientRect();
      index=Math.min(readings.length-1,Math.floor(
        Math.max(0,Math.min(.999,page.scrollTop/Math.max(1,hero.height-180)))*readings.length));
      scope='hero';
    }else{
      const label=section.querySelector('.dc-label')?.textContent.trim()||'Overview';
      const prose=section.querySelector('.dc-p')?.textContent.trim()||'';
      const sentences=prose.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
      const summaries=sentences.map(sentence=>({title:label,copy:sentence}));
      const charts=[...section.querySelectorAll('.dc-chart-card')]
        .map(card=>({title:card.querySelector('.dc-chart-title')?.textContent?.trim(),
          copy:card.querySelector('.dc-chart-desc')?.textContent?.trim()}))
        .filter(note=>note.title&&note.copy);
      readings=[...summaries,...charts];
      if(!readings.length){
        hideDataAsides();
        return;
      }
      const rect=section.getBoundingClientRect();
      let progress=Math.max(0,Math.min(.999,(focusY-rect.top)/Math.max(1,rect.height)));
      index=Math.min(readings.length-1,Math.floor(progress*readings.length));
      const strip=section.querySelector('.dc-three-col-inner');
      const stripRect=strip?.getBoundingClientRect();
      if(charts.length&&strip&&strip.scrollWidth>strip.clientWidth+4&&
        stripRect.top<focusY&&stripRect.bottom>focusY){
        progress=strip.scrollLeft/Math.max(1,strip.scrollWidth-strip.clientWidth);
        index=summaries.length+Math.min(charts.length-1,Math.floor(progress*charts.length));
      }
      const sample=panel.querySelector('.dc-section .dc-card-stat');
      const sourceLabel={xpost:'X/Twitter posts',xreply:'X/Twitter replies',
        rpost:'Reddit posts',rreply:'Reddit replies'}[page.querySelector('.dc-ptab.on')?.dataset.panel];
      const currentChart=charts[Math.min(charts.length-1,Math.max(0,index-summaries.length))];
      metadata=[
        {title:'Dataset',copy:sourceLabel+' · '+
          (sample?.querySelector('.dc-card-n')?.textContent.trim()||'')+' '+
          (sample?.querySelector('.dc-card-l')?.textContent.trim()||'records')},
        {title:'Section',copy:label+' · '+section.querySelector('.dc-h2')?.textContent.trim()},
        ...(currentChart?[{title:'Chart basis',copy:currentChart.title+' · '+currentChart.copy}]:[])
      ];
      scope=panel.id+'|'+section.id;
    }
    if(scope!==metaScope){metaScope=scope;metaStep=0;}
    showDataAside(dataAside,readings,index,scope);
    showDataAside(metaAside,metadata,metaStep%metadata.length,scope+'|'+index);
    lastAsideScrollTop=page.scrollTop;
  }

  function scheduleDataAside(){
    if(!dataAsideFrame) dataAsideFrame=requestAnimationFrame(updateDataAside);
  }
  page.addEventListener('scroll',scheduleDataAside,{passive:true});
  page.querySelectorAll('.dc-three-col-inner').forEach(strip=>
    strip.addEventListener('scroll',scheduleDataAside,{passive:true})
  );
  window.addEventListener('resize',scheduleDataAside,{passive:true});
  setInterval(()=>{metaStep++;scheduleDataAside();},5000);

  /* Align dc-nav-inner horizontally to match the nav-tabs (6 main tabs) range */
  function alignDcNavToNavTabs(){
    const navTabs=document.querySelector('.nav-tabs');
    if(!navTabs||!dcNavInner) return;
    if(document.documentElement.classList.contains('phone-app')){
      dcNavInner.style.paddingLeft='12px';
      dcNavInner.style.paddingRight='12px';
      dcNavInner.style.maxWidth='100%';
      dcNavInner.style.margin='0 auto';
      dcNavInner.style.justifyContent='center';
      return;
    }
    const r=navTabs.getBoundingClientRect();
    const pageLeft=document.documentElement.getBoundingClientRect().left;
    const left=r.left-pageLeft;
    const right=document.documentElement.clientWidth-(r.right-pageLeft);
    dcNavInner.style.paddingLeft=left+'px';
    dcNavInner.style.paddingRight=right+'px';
    dcNavInner.style.maxWidth='none';
    dcNavInner.style.margin='0';
  }
  alignDcNavToNavTabs();

  /* Keep wheel input from scrolling the tab bar. */
  if(dcNavInner){
    dcNavInner.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
  }

  /* Track panel order for directional animation */
  const DC_PANEL_ORDER = ['xpost','xreply','rpost','rreply'];

  /* ── Sliding indicator ── */
  const dcIndicator = document.getElementById('dc-nav-indicator');
  function moveIndicator(tabEl, animate){
    if(!dcIndicator || !tabEl) return;
    const navInner = tabEl.closest('.dc-nav-inner');
    if(!navInner) return;
    const left = Math.max(0, tabEl.offsetLeft);
    const width = Math.max(0, tabEl.offsetWidth);
    if(!animate){
      dcIndicator.style.transition = 'none';
      dcIndicator.style.left = left + 'px';
      dcIndicator.style.width = width + 'px';
    } else {
      dcIndicator.style.transition = 'left .32s cubic-bezier(.4,0,.2,1), width .32s cubic-bezier(.4,0,.2,1)';
      dcIndicator.style.left = left + 'px';
      dcIndicator.style.width = width + 'px';
    }
  }
  function refreshActiveDcIndicator(animate=false){
    const active = page.querySelector('.dc-ptab.on');
    if(!active) return;
    requestAnimationFrame(()=>moveIndicator(active, animate));
  }
  function refreshDiscourseNavLayout(animate=false){
    requestAnimationFrame(()=>{
      alignDcNavToNavTabs();
      requestAnimationFrame(()=>refreshActiveDcIndicator(animate));
    });
  }
  window.refreshDiscourseNavLayout=refreshDiscourseNavLayout;
  /* Init indicator on active tab */
  const initActiveTab = page.querySelector('.dc-ptab.on');
  if(initActiveTab){
    refreshDiscourseNavLayout(false);
  }
  /* Also re-position on resize */
  const _indResizeObs = new ResizeObserver(()=>{
    refreshDiscourseNavLayout(false);
  });
  const dcNavInnerEl = page.querySelector('.dc-nav-inner');
  if(dcNavInnerEl){
    _indResizeObs.observe(dcNavInnerEl);
    dcNavInnerEl.addEventListener('scroll',()=>refreshActiveDcIndicator(false),{passive:true});
  }
  page.querySelectorAll('.dc-ptab').forEach(tab=>_indResizeObs.observe(tab));
  if(dcNav) _indResizeObs.observe(dcNav);
  window.addEventListener('resize',()=>refreshDiscourseNavLayout(false),{passive:true});

  page.querySelectorAll('.dc-ptab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const key = tab.dataset.panel;
      const currentTab = page.querySelector('.dc-ptab.on');
      const currentKey = currentTab ? currentTab.dataset.panel : null;
      if(key === currentKey) return;

      const oldIdx = DC_PANEL_ORDER.indexOf(currentKey);
      const newIdx = DC_PANEL_ORDER.indexOf(key);
      const goingForward = newIdx > oldIdx;

      const oldPanel = currentKey ? document.getElementById('dc-panel-'+currentKey) : null;
      const newPanel = document.getElementById('dc-panel-'+key);
      if(!newPanel) return;

      requestAnimationFrame(()=>{
        page.scrollTo({ top: targetTop, behavior: 'smooth' });
      });

      /* ── 1. Scroll to nav top before any visual change ── */
      const navH = dcNav ? dcNav.offsetHeight : 0;
      const overview = document.getElementById(`dc-sec-${key}-overview`);
      const targetTop = overview
      ? Math.max(0, overview.offsetTop - navH)
      : (dcNav ? dcNav.offsetTop : 0);

      page.scrollTo({ top: targetTop, behavior: 'smooth' });

      /* ── 2. Update tab indicators ── */
      page.querySelectorAll('.dc-ptab').forEach(t=>t.classList.remove('on'));
      tab.classList.add('on');
      window.KirunaRoutes.update('discourse',{panel:key});
      moveIndicator(tab, true);

      /* ── 3. Exit old panel with fade+slide (transition on inline style so it fires from current state) ── */
      if(oldPanel){
        const exitX = goingForward ? '-24px' : '24px';
        /* Freeze current opacity:1 transform:none, then immediately transition to exit state */
        oldPanel.style.transition = 'none';
        oldPanel.style.opacity = '1';
        oldPanel.style.transform = 'translateX(0)';
        oldPanel.style.overflow = 'hidden';
        /* Force paint, then animate out */
        oldPanel.getBoundingClientRect();
        oldPanel.style.transition = 'opacity .22s ease, transform .22s cubic-bezier(.4,0,.2,1)';
        oldPanel.style.opacity = '0';
        oldPanel.style.transform = `translateX(${exitX})`;
        oldPanel.classList.remove('on');
        /* After exit: collapse height, reset scroll-reveal */
        setTimeout(()=>{
          oldPanel.style.transition = 'none';
          oldPanel.style.height = '0';
          oldPanel.style.overflow = 'hidden';
          oldPanel.style.opacity = '';
          oldPanel.style.transform = '';
          oldPanel.querySelectorAll('.dc-rv').forEach(el=>{ el.classList.remove('in','dc-rv-exit-up','dc-rv-exit-down'); el.style.transitionDelay=''; });
          oldPanel.querySelectorAll('.dc-chart-card').forEach(el=>el.classList.remove('dc-card-in'));
          oldPanel.querySelectorAll('.dc-label-in').forEach(el=>el.classList.remove('dc-label-in'));
        }, 240);
      }

      /* ── 4. Place new panel at enter position (invisible, in flow at height:auto) ── */
      const enterX = goingForward ? '24px' : '-24px';
      newPanel.style.transition = 'none';
      newPanel.style.height = 'auto';
      newPanel.style.overflow = 'visible';
      newPanel.style.opacity = '0';
      newPanel.style.transform = `translateX(${enterX})`;
      newPanel.classList.add('on');
      setTimeout(scheduleDataAside,360);

      /* ── 5. Double rAF: browser paints enter-start, then we trigger the transition ── */
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          const navH = dcNav ? dcNav.offsetHeight : 0;
          const overview = document.getElementById(`dc-sec-${key}-overview`);

          if(overview){
            const top = page.scrollTop + overview.getBoundingClientRect().top - page.getBoundingClientRect().top - navH;
            page.scrollTo({ top, behavior: 'smooth' });
          }

          newPanel.style.transition = 'opacity .3s ease, transform .3s cubic-bezier(.4,0,.2,1)';
          newPanel.style.opacity = '1';
          newPanel.style.transform = 'translateX(0)';

          /* ── 6. After transition settles, clean up inline styles and bind observers ── */
          setTimeout(()=>{
            newPanel.style.transition = '';
            newPanel.style.opacity = '';
            newPanel.style.transform = '';
            newPanel.style.height = '';
            newPanel.style.overflow = '';
            observeDcPanel(newPanel);
            buildDcToc(key);
          }, 340);
        });
      });
    });
  });
