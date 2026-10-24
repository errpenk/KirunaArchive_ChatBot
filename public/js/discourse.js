
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
  function donutOpts(total, labelFn){
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

  /* Lock nav bar — prevent mouse-drag scroll, allow tab clicks */
  if(dcNavInner){
    let _navDown=false,_navDragMoved=false,_navDownX=0;
    dcNavInner.addEventListener('mousedown',e=>{
      _navDown=true;_navDragMoved=false;_navDownX=e.clientX;
      // Don't preventDefault — allows click to fire
    });
    dcNavInner.addEventListener('mousemove',e=>{
      if(!_navDown)return;
      if(Math.abs(e.clientX-_navDownX)>4){
        _navDragMoved=true;
        // Block scroll-drag by not manipulating scrollLeft (no drag handler here)
      }
    });
    window.addEventListener('mouseup',()=>{_navDown=false;_navDragMoved=false;},{passive:true});
    // Prevent wheel scroll on the nav-inner
    dcNavInner.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
  }

  function scrollToNav(behavior='smooth'){
    /* Scroll page-discourse so the sticky dc-nav sits flush at top.
       dc-nav is inside page-discourse, so we scroll to its offsetTop. */
    const navTop = dcNav ? dcNav.offsetTop : 0;
    page.scrollTo({top: navTop, behavior});
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

  /* ── Chart card hover: smooth shadow only (no tilt) ── */
  function bindTiltCards(root){
    /* Subtle directional shadow on chart cards */
    root.querySelectorAll('.dc-chart-card').forEach(card=>{
      card.addEventListener('mousemove',e=>{
        const r=card.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width-.5;
        const y=(e.clientY-r.top)/r.height-.5;
        card.style.boxShadow=`${-x*6}px ${y*5}px 22px rgba(0,0,0,.08)`;
      });
      card.addEventListener('mouseleave',()=>{
        card.style.boxShadow='';
      });
    });
    /* Drag-scroll on three-col-inner */
    root.querySelectorAll('.dc-three-col-inner').forEach(inner=>{
      const wrap=inner.closest('.dc-three-col-wrap');
      let isDown=false,startX=0,scrollLeft=0;
      inner.addEventListener('mousedown',e=>{
        isDown=true;startX=e.pageX-inner.offsetLeft;scrollLeft=inner.scrollLeft;
        inner.style.cursor='grabbing';
      });
      window.addEventListener('mouseup',()=>{isDown=false;inner.style.cursor='grab';});
      inner.addEventListener('mousemove',e=>{
        if(!isDown)return;
        e.preventDefault();
        const x=e.pageX-inner.offsetLeft;
        inner.scrollLeft=scrollLeft-(x-startX);
      });
      /* Touch scroll is native — just track end of scroll for fade */
      function updateFade(){
        if(!wrap)return;
        const atEnd=inner.scrollLeft+inner.clientWidth>=inner.scrollWidth-4;
        wrap.classList.toggle('scrolled-end',atEnd);
      }
      inner.addEventListener('scroll',updateFade,{passive:true});
      updateFade();
    });
  }

  /* ── Scroll-reveal for .dc-rv elements with exit animation ── */
  let _dcObs=null;
  function observeDcPanel(panel){
    if(!panel)return;
    if(_dcObs)_dcObs.disconnect();

    /* Mark individual text children of each section for staggered reveal */
    panel.querySelectorAll('.dc-section').forEach(sec=>{
      let staggerIdx = 0;
      Array.from(sec.children).forEach(child=>{
        if(child.classList.contains('dc-rv')) return; // already marked
        if(child.matches('.dc-label,.dc-h2,.dc-p,.dc-cards,.dc-chart-card,.dc-pill-wrap,.dc-two-col,.dc-two-col-chart-table,.dc-three-col-wrap,.dc-kw-wrap,.dc-col-scroll-wrap')){
          child.classList.add('dc-rv');
          /* Assign stagger delay: each element 65ms after the previous */
          child.dataset.rvStagger = staggerIdx;
          staggerIdx++;
        }
      });
    });

    const rvEls=panel.querySelectorAll('.dc-rv');
    const forceStaticReveal=document.documentElement.classList.contains('phone-app');

    if(forceStaticReveal){
      rvEls.forEach(el=>{
        el.classList.remove('dc-rv-exit-up','dc-rv-exit-down');
        el.classList.add('in');
        el.style.transitionDelay='0s';
      });
      bindTiltCards(panel);
      if(window._lbBindZoom) window._lbBindZoom(panel);
      panel.querySelectorAll('.dc-chart-card').forEach(el=>el.classList.add('dc-card-in'));
      return;
    }

    _dcObs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.remove('dc-rv-exit-up','dc-rv-exit-down');
          /* Apply stagger delay from data attribute if present */
          if(e.target.dataset.rvStagger !== undefined){
            const stagger = +e.target.dataset.rvStagger * 0.065;
            e.target.style.transitionDelay = stagger + 's';
          }
          e.target.classList.add('in');
        } else {
          if(e.target.classList.contains('in')){
            /* Remove stagger delay on exit so it's instant-ish */
            if(e.target.dataset.rvStagger !== undefined){
              e.target.style.transitionDelay = '0s';
            }
            e.target.classList.remove('in');
            if(e.boundingClientRect.top < 0){
              e.target.classList.add('dc-rv-exit-up');
            } else {
              e.target.classList.remove('dc-rv-exit-up','dc-rv-exit-down');
            }
          }
        }
      });
    },{threshold:0.06, rootMargin:'0px 0px -28px 0px'});

    rvEls.forEach((el,i)=>{
      /* Only assign delay to non-stagger elements (section-level dc-rv) */
      if(el.dataset.rvStagger === undefined){
        const siblings=Array.from(el.parentElement.querySelectorAll(':scope > .dc-rv'));
        const sibIdx=siblings.indexOf(el);
        const delay=Math.min(sibIdx*0.07,0.21);
        el.style.transitionDelay=delay+'s';
      }
      if(el.matches('.dc-h2')) el.classList.add('dc-rv-heading');
      else if(el.matches('.dc-p')) el.classList.add('dc-rv-para');
      else if(el.matches('.dc-cards')) el.classList.add('dc-rv-cards');
      else if(el.matches('.dc-chart-card,.dc-pill-wrap')) el.classList.add('dc-rv-card');
      _dcObs.observe(el);
    });
    bindTiltCards(panel);
    /* Bind lightbox zoom to newly activated panel */
    if(window._lbBindZoom) window._lbBindZoom(panel);
    const cardEls=panel.querySelectorAll('.dc-chart-card:not(.dc-three-col .dc-chart-card):not(.dc-two-col .dc-chart-card)');
    if(_cardAnimObs)_cardAnimObs.disconnect();
    _cardAnimObs=new IntersectionObserver(entries=>{
      entries.forEach((e,idx)=>{
        if(e.isIntersecting){
          setTimeout(()=>e.target.classList.add('dc-card-in'),idx*55);
        } else {
          if(e.boundingClientRect.top > 0) e.target.classList.remove('dc-card-in');
        }
      });
    },{threshold:0.08,rootMargin:'0px 0px -24px 0px'});
    cardEls.forEach(el=>_cardAnimObs.observe(el));

    // Section label underline sweep
    const labelObs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting) e.target.classList.add('dc-label-in');
        else if(e.boundingClientRect.top > 0) e.target.classList.remove('dc-label-in');
      });
    },{threshold:0.3});
    panel.querySelectorAll('.dc-section-label').forEach(el=>labelObs.observe(el));
  }
  let _cardAnimObs=null;

  /* ── Also observe page scroll for initial panel ── */
  function initPageObserver(){
    const activePanel=page.querySelector('.dc-platform-panel.on');
    if(activePanel){
      observeDcPanel(activePanel);
      buildDcToc('xpost');
    }

  /* Expose re-observe for external page-switch triggers */
  window._reObserveDcPanel = function(panel){
    if(!panel) return;
    /* Reset dc-rv states so they re-animate */
    panel.querySelectorAll('.dc-rv').forEach(el=>{ el.classList.remove('in','dc-rv-exit-up','dc-rv-exit-down'); el.style.transitionDelay=''; });
    panel.querySelectorAll('.dc-chart-card').forEach(el=>el.classList.remove('dc-card-in'));
    observeDcPanel(panel);
  };
    /* Back-to-top (fixed position — show only when discourse is active) */
    const btnTop=document.getElementById('dc-btn-top');
    const trigger=document.getElementById('dc-toc-trigger');
    const tocPanel=document.getElementById('dc-toc-panel');
    const edge=document.getElementById('dc-toc-edge');
    /* Show fixed elements */
    if(btnTop) btnTop.style.display='flex';
    if(trigger) trigger.style.display='block';
    if(tocPanel) tocPanel.style.display='flex';
    if(edge) edge.classList.add('show');

    /* Show the pull-tab — always visible on discourse page */
    const dcTab = document.getElementById('dc-toc-tab');
    if(dcTab) {
      dcTab.classList.add('show');
      dcTab.classList.add('dc-tab-visible');
    }

    let _dcTocHideTimer = null;
    function _showDcToc(){
      clearTimeout(_dcTocHideTimer);
      tocPanel.classList.add('dc-toc-open');
      if(edge) edge.style.opacity='0';
    }
    function _hideDcToc(){
      _dcTocHideTimer = setTimeout(()=>{
        tocPanel.classList.remove('dc-toc-open');
        if(edge) edge.style.opacity='';
        if(dcTab){ dcTab.classList.add('dc-tab-visible'); }
      }, 260);
    }
    page.addEventListener('scroll',()=>{
      if(btnTop){
        btnTop.classList.toggle('dc-top-visible', page.scrollTop>320);
      }
      updateDcTocActive();
    },{passive:true});

    if(btnTop){
      btnTop.addEventListener('click',()=>page.scrollTo({top:0,behavior:'smooth'}));
    }
    if(trigger && tocPanel){
      trigger.addEventListener('mouseenter', _showDcToc);
      trigger.addEventListener('mouseleave', _hideDcToc);
      tocPanel.addEventListener('mouseenter', _showDcToc);
      tocPanel.addEventListener('mouseleave', _hideDcToc);
      /* No proximity-based behavior needed — tab is always visible */
    }
    /* Hover over tab to open TOC panel */
    if(dcTab){
      dcTab.addEventListener('mouseenter', ()=>{ _showDcToc(); });
      dcTab.addEventListener('mouseleave', ()=>{ _hideDcToc(); });
      dcTab.addEventListener('click', ()=>{ _showDcToc(); });
    }
  }

  /* Hide fixed elements when leaving discourse page */
  window.hideDcFixed = function(){
    /* Hide most elements with display:none */
    ['dc-btn-top','dc-toc-trigger','dc-toc-panel','dc-toc-edge'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      el.style.display='none';
      el.style.transform='';
      el.style.pointerEvents='';
      el.classList.remove('dc-top-visible','dc-toc-open','show','dc-tab-visible');
    });
    /* dc-toc-tab: always display:flex — hide via class+pointer-events only to avoid flash */
    const tab=document.getElementById('dc-toc-tab');
    if(tab){
      tab.style.transition='none';
      tab.classList.remove('show','dc-tab-visible');
      tab.style.display='none';
      tab.style.pointerEvents='none';
      requestAnimationFrame(()=>{ tab.style.transition=''; });
    }
  };

  /* ── Build TOC items for current panel ── */
  const DC_TOC_SECTIONS = {
    xpost:  [{slug:'overview',  label:'Overview'},  {slug:'sentiment', label:'Sentiment'}, {slug:'language',  label:'Language'}],
    xreply: [{slug:'overview',  label:'Overview'},  {slug:'sentiment', label:'Sentiment'}, {slug:'topics',    label:'Topics'},   {slug:'language',  label:'Language'}],
    rpost:  [{slug:'overview',  label:'Overview'},  {slug:'sentiment', label:'Sentiment'}, {slug:'communities',label:'Communities'},{slug:'language', label:'Language'}],
    rreply: [{slug:'overview',  label:'Overview'},  {slug:'sentiment', label:'Sentiment'}, {slug:'topics',    label:'Topics'},   {slug:'language',  label:'Language'}],
  };
  /* Varying tick widths for visual rhythm (mirrors report TOC) */
  const TICK_WIDTHS = [18, 12, 18, 12, 18, 12, 18];
  let _dcTocPending = null;

  function setDcTocActive(targetId){
    document.querySelectorAll('.dc-toc-item').forEach(item=>{
      item.classList.toggle('dc-toc-active', item.dataset.target===targetId);
    });
  }

  function buildDcToc(panelKey){
    const container = document.getElementById('dc-toc-items');
    if(!container) return;
    const sections = DC_TOC_SECTIONS[panelKey] || [];

    const doRender = () => {
      let html = '<div class="dc-toc-index-label">Index</div>';
      sections.forEach((sec, i)=>{
        const tickW = TICK_WIDTHS[i % TICK_WIDTHS.length];
        html += `
          <div class="dc-toc-item" data-target="dc-sec-${panelKey}-${sec.slug}" data-key="${panelKey}" data-slug="${sec.slug}">
            <span class="dc-toc-label">${sec.label}</span>
            <div class="dc-toc-tick" style="position:relative">
              <div class="dc-toc-tick-line" style="width:${tickW}px"></div>
              <div class="dc-toc-dot"></div>
              <div class="dc-toc-connector"></div>
            </div>
          </div>`;
      });
      container.innerHTML = html;
      // Bind click-to-scroll
      container.querySelectorAll('.dc-toc-item').forEach(item=>{
        item.addEventListener('click', ()=>{
          const target = document.getElementById(item.dataset.target);
          if(!target) return;
          const navH = document.querySelector('.dc-nav')?.offsetHeight || 52;
          const top = page.scrollTop + target.getBoundingClientRect().top - page.getBoundingClientRect().top - navH - 16;
          _dcTocPending = {
            targetId:item.dataset.target,
            top,
            expiresAt:performance.now() + 1200
          };
          // Activate immediately on click, then let scroll logic catch up once the section is reached.
          setDcTocActive(item.dataset.target);
          page.scrollTo({top, behavior:'smooth'});
        });
      });
      updateDcTocActive();
    };

    /* Animate out → swap content → animate in */
    if(container.children.length > 0){
      container.classList.add('dc-toc-switching');
      container.classList.remove('dc-toc-switched');
      setTimeout(()=>{
        doRender();
        container.classList.remove('dc-toc-switching');
        requestAnimationFrame(()=>{
          container.classList.add('dc-toc-switched');
          setTimeout(()=>container.classList.remove('dc-toc-switched'), 350);
        });
      }, 190);
    } else {
      doRender();
    }
  }

  /* ── Build TOC for current panel ── */
  function updateDcTocActive(){
    const panelKey=document.querySelector('.dc-ptab.on')?.dataset.panel||'xpost';
    const navH=document.querySelector('.dc-nav')?.offsetHeight||52;
    const scrollMid=page.scrollTop+navH+80;
    let activeId=null;
    ['overview','sentiment','topics','communities','engagement','language'].forEach(slug=>{
      const sec=document.getElementById(`dc-sec-${panelKey}-${slug}`);
      if(sec&&sec.offsetTop<=scrollMid)activeId=`dc-sec-${panelKey}-${slug}`;
    });
    if(_dcTocPending){
      const isSamePanel = _dcTocPending.targetId.startsWith(`dc-sec-${panelKey}-`);
      if(!isSamePanel){
        _dcTocPending = null;
      } else {
        const reachedTarget = Math.abs(page.scrollTop - _dcTocPending.top) <= 24;
        const expired = performance.now() >= _dcTocPending.expiresAt;
        if(reachedTarget || expired){
          if(reachedTarget) activeId = _dcTocPending.targetId;
          _dcTocPending = null;
        } else {
          activeId = _dcTocPending.targetId;
        }
      }
    }
    setDcTocActive(activeId);
  }

  /* ── Helpers ── */
  /* Shared IntersectionObserver-based bar-row reveal helper */
  function _obsRevealBars(container){
    const obs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        container.querySelectorAll('.dc-rank-row').forEach(r=>{ r.style.opacity='1'; r.style.transform='translateX(0)'; });
        container.querySelectorAll('.dc-rank-fill[data-w]').forEach(f=>{ f.style.width=f.dataset.w+'%'; });
      } else {
        container.querySelectorAll('.dc-rank-row').forEach(r=>{ r.style.opacity='0'; r.style.transform='translateX(-8px)'; });
        container.querySelectorAll('.dc-rank-fill[data-w]').forEach(f=>{ f.style.width='0%'; });
      }
    },{threshold:0.05});
    obs.observe(container);
  }

  /* Chart registry for scroll re-animation */
  const _chartRegistry = [];

  function mkChart(id, cfg){
    const el = document.getElementById(id);
    if(!el) return null;

    /* Capture chart type for override-based animation config */
    const chartType = cfg.type || 'bar';

    /* Start chart hidden — animate on scroll entry */
    if(!cfg.options) cfg.options = {};
    cfg.options.animation = false;

    const chart = new Chart(el, cfg);

    /* Build animation config based on type */
    function getAnimCfg(){
      if(chartType === 'doughnut' || chartType === 'pie'){
        return {animateRotate:true, animateScale:true, duration:850, easing:'easeOutExpo'};
      }
      if(chartType === 'line'){
        return {duration:700, easing:'easeOutCubic'};
      }
      return {duration:750, easing:'easeOutQuart'};
    }

    /* Observe for viewport entry — animate on enter, reset on exit */
    let _visible = false;
    const chartObs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting && !_visible){
          _visible = true;
          chart.options.animation = getAnimCfg();
          chart.reset();
          chart.update('active');
        } else if(!e.isIntersecting){
          _visible = false;
          /* Reset silently so re-entry re-animates */
          chart.options.animation = false;
          chart.reset();
          chart.update('none');
        }
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -24px 0px'});

    const wrap = el.closest('.dc-chart-canvas') || el.parentElement;
    if(wrap) chartObs.observe(wrap);
    else chartObs.observe(el);

    _chartRegistry.push({chart, obs: chartObs});
    if(!window._discourseChartsResizeBound){
      window._discourseChartsResizeBound = true;
      const resizeCharts = ()=>{
        _chartRegistry.forEach(({chart: chartInstance})=>{
          try{
            chartInstance.resize();
            chartInstance.update('none');
          }catch(e){}
        });
      };
      window._resizeDiscourseCharts = resizeCharts;
      window.addEventListener('resize', ()=>requestAnimationFrame(resizeCharts), {passive:true});
      window.addEventListener('orientationchange', ()=>setTimeout(resizeCharts, 120), {passive:true});
    }
    /* Register for lightbox re-render */
    if(el.id && window._registerChartForLightbox){
      window._registerChartForLightbox(el.id, chart);
    }
    return chart;
  }

  /* ── Radial Spoke — pos/neg keyword SVG with entrance animation ── */
  function normalizeInlineSpokeScale(svg){
    if(!svg) return;
    try{
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      svg.querySelectorAll('line,circle,text,path,rect,ellipse,polyline,polygon').forEach(node=>{
        if(typeof node.getBBox !== 'function') return;
        const box = node.getBBox();
        if(!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;
        if(box.width===0 && box.height===0) return;
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });
      if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      const contentSize = Math.max(maxX - minX, maxY - minY);
      if(!Number.isFinite(contentSize) || contentSize <= 0) return;
      const scale = Math.max(0.96, Math.min(1.16, 332 / contentSize));
      svg.style.transformOrigin = '50% 50%';
      svg.style.transform = Math.abs(scale - 1) > 0.02 ? `scale(${scale.toFixed(3)})` : 'none';
    }catch(e){}
  }

  function radialSpoke(containerId, items, color){
    const el = document.getElementById(containerId);
    if(!el) return;
    const data = items.slice(0, 12);
    if(!data.length) return;
    const max  = data[0].c;

    /* Fixed dimensions — identical for every spoke chart */
    const W = 420, H = 420, cx = 210, cy = 210;
    const innerR = 36, maxR = 158;
    const DOT_R   = 6.5;
    const BADGE_R = 11;

    const sorted = [...data].sort((a,b)=>b.c-a.c);
    const n = sorted.length;

    let spokes = '', labels = '';
    sorted.forEach((item, i)=>{
      const ang = (i/n)*Math.PI*2 - Math.PI/2;
      const t   = item.c / max;
      const r   = innerR + t*(maxR - innerR);
      const x2  = cx + Math.cos(ang)*r;
      const y2  = cy + Math.sin(ang)*r;
      const lR  = r + DOT_R + 16;
      const lx  = cx + Math.cos(ang)*lR;
      const ly  = cy + Math.sin(ang)*lR;
      const anchor = Math.cos(ang) > 0.15 ? 'start' : Math.cos(ang) < -0.15 ? 'end' : 'middle';
      const sw  = (0.8 + t*2.2).toFixed(1);
      const op  = (0.32 + t*0.68).toFixed(2);
      const bR  = innerR + t*(maxR-innerR)*0.52;
      const bx  = cx + Math.cos(ang)*bR;
      const by  = cy + Math.sin(ang)*bR;
      // Stagger delay per spoke (ms → s)
      const delay = (i * 55).toFixed(0);
      const dur = (320 + t * 180).toFixed(0);

      // Spoke line — animates from center outward using stroke-dashoffset
      const lineLen = Math.hypot(x2-cx, y2-cy).toFixed(1);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
        stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" stroke-linecap="round"
        stroke-dasharray="${lineLen}" stroke-dashoffset="${lineLen}"
        class="spoke-line" data-delay="${delay}" data-dur="${dur}"/>`;

      // End dot — fades in with spoke
      spokes += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${DOT_R}"
        fill="${color}" opacity="0"
        class="spoke-dot" data-delay="${delay}" data-op="${op}"/>`;

      // Count badge — scales in
      spokes += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${BADGE_R}"
        fill="white" stroke="${color}" stroke-width="1.2" stroke-opacity="${(+op*0.65).toFixed(2)}"
        opacity="0" class="spoke-badge" data-delay="${(+delay+100).toFixed(0)}" data-op="${op}"/>`;
      spokes += `<text x="${bx.toFixed(1)}" y="${(by+4).toFixed(1)}"
        font-size="9.5" font-family="-apple-system,monospace" text-anchor="middle"
        fill="${color}" opacity="0"
        class="spoke-badge" data-delay="${(+delay+100).toFixed(0)}" data-op="${Math.min(1,+op+0.2).toFixed(2)}">${item.c}</text>`;

      // Label text — fades in last
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}"
        font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        text-anchor="${anchor}" dominant-baseline="middle"
        fill="#5a6270" opacity="0"
        class="spoke-label" data-delay="${(+delay+180).toFixed(0)}" data-op="${Math.min(1,+op+0.15).toFixed(2)}">${item.w}</text>`;
    });

    const ring = `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="3 3"/>`;
    el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block">${ring}${spokes}${labels}</svg>`;
    const svg = el.querySelector('svg');
    if(!svg) return;

    requestAnimationFrame(()=>{
      normalizeInlineSpokeScale(svg);
    });

    // Animate on viewport entry using IntersectionObserver
    let _spokeAnimated = false;
    function animateSpoke(){
      if(_spokeAnimated) return;
      _spokeAnimated = true;
      // Spoke lines — draw from center
      svg.querySelectorAll('.spoke-line').forEach(line=>{
        const delay = +line.dataset.delay;
        const dur   = +line.dataset.dur;
        setTimeout(()=>{
          line.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.22,1,.36,1)`;
          line.style.strokeDashoffset = '0';
        }, delay);
      });
      // Dots / badges / labels — fade in
      svg.querySelectorAll('.spoke-dot, .spoke-badge, .spoke-label').forEach(el2=>{
        const delay = +el2.dataset.delay;
        const op = el2.dataset.op;
        setTimeout(()=>{
          el2.style.transition = 'opacity 280ms ease';
          el2.setAttribute('opacity', op);
        }, delay);
      });
    }
    const spokeObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        animateSpoke();
      }
    },{threshold:0.1});
    spokeObs.observe(el);
  }

  /* ── Stacked Pills — top global keywords with cascade animation ── */
  function stackedPills(containerId, items, color){
    const el = document.getElementById(containerId);
    if(!el) return;
    const list = items.slice(0, 25);
    const max  = list[0].c;
    el.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px 4px;align-items:center;padding:4px 0';
    el.innerHTML = list.map((item, idx)=>{
      const t   = item.c / max;
      const h   = Math.round(20 + t*18);
      const px  = Math.round(9  + t*9);
      const fs  = Math.round(10 + t*4);
      const op  = (0.22 + t*0.78).toFixed(2);
      const br  = Math.round(h/2);
      return `<span title="${item.w}: ${item.c}"
        style="display:inline-flex;align-items:center;gap:4px;height:${h}px;
               padding:0 ${px}px;border-radius:${br}px;
               background:${color};opacity:0;cursor:default;
               transform:translateY(8px) scale(.92);
               transition:opacity .22s ease,transform .22s cubic-bezier(.4,0,.2,1);"
        data-op="${op}" data-delay="${idx * 22}"
        onmouseover="this.style.opacity=1;this.style.transform='scale(1)'"
        onmouseout="this.style.opacity=this.dataset.op;this.style.transform='scale(1)'">
        <span style="font-size:${fs}px;color:#fff;font-weight:500;letter-spacing:-.01em;line-height:1;opacity:1">${item.w}</span>
        <span style="font-size:8px;color:#fff;font-family:monospace;line-height:1;opacity:.78">${item.c}</span>
      </span>`;
    }).join('');

    // Animate pills on viewport entry — reset on exit so re-entry re-animates
    function animatePills(){
      el.querySelectorAll('span[data-delay]').forEach(pill=>{
        const delay = +pill.dataset.delay;
        const op = pill.dataset.op;
        setTimeout(()=>{
          pill.style.opacity = op;
          pill.style.transform = 'translateY(0) scale(1)';
        }, delay);
      });
    }
    function resetPills(){
      el.querySelectorAll('span[data-delay]').forEach(pill=>{
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(8px) scale(.92)';
      });
    }
    const pillObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){ animatePills(); }
      else { resetPills(); }
    },{threshold:0.05});
    pillObs.observe(el);
  }

  function kwCloud(wrapId, tabsId, kwData, defaultKey, accentColor){
    const wrap = document.getElementById(wrapId);
    const tabsEl = document.getElementById(tabsId);
    if(!wrap || !tabsEl) return;
    const col = accentColor || '#1c1c1e';

    function render(key){
      const words = (kwData[key] || []).slice(0, 22);
      if(!words.length){ wrap.innerHTML=''; return; }
      const max = words[0].c;
      const top = words.slice(0, 6);
      const rest = words.slice(6);

      /* ── Top-6 bubbles — start invisible, pop in on scroll ── */
      let html = '<div class="dc-wf-bubbles">';
      top.forEach((item, bi)=>{
        const t = item.c / max;
        const sz = Math.round(56 + t * 62);   /* smaller range: 56–118px so 6 fit in one row */
        const fs = Math.max(11, Math.round(sz * 0.22));
        const alpha = (0.28 + t * 0.72).toFixed(2);
        const wordW = Math.max(sz + 4, 64);
        html += `<div class="dc-wf-bubble-item" title="${item.w}: ${item.c} mentions"
          style="opacity:0;transform:translateY(12px) scale(.85);transition:opacity .38s cubic-bezier(.4,0,.2,1) ${bi*60}ms,transform .38s cubic-bezier(.4,0,.2,1) ${bi*60}ms"
          data-bubble-delay="${bi*60}" data-bubble-alpha="${alpha}">
          <div class="dc-wf-bubble" style="width:${sz}px;height:${sz}px;background:${col};opacity:${alpha};">
            <span class="dc-wf-bubble-count" style="font-size:${fs}px;">${item.c}</span>
          </div>
          <span class="dc-wf-bubble-word" style="max-width:${wordW}px;font-size:11px;">${item.w}</span>
        </div>`;
      });
      html += '</div>';

      /* ── Divider + rest bars ── */
      if(rest.length){
        const multiCls = rest.length > 5 ? 'dc-wf-rows-wrap dc-wf-multi' : 'dc-wf-rows-wrap';
        html += '<div class="dc-wf-divider"></div>';
        html += '<div class="dc-wf-rest-label">Remaining keywords</div>';
        html += `<div class="${multiCls}">`;
        rest.forEach((item, ri)=>{
          const pct = Math.round(item.c / max * 100);
          const alpha = (0.3 + (item.c/max) * 0.7).toFixed(2);
          html += `<div class="dc-wf-row" title="${item.w}: ${item.c}"
            style="opacity:0;transform:translateX(-6px);transition:opacity .3s ease ${(top.length*60)+ri*20}ms,transform .3s cubic-bezier(.22,1,.36,1) ${(top.length*60)+ri*20}ms"
            data-row-delay="${(top.length*60)+ri*20}">
            <div class="dc-wf-label">${item.w}</div>
            <div class="dc-wf-track">
              <div class="dc-wf-fill" style="width:0%;background:${col};opacity:${alpha};transition:width .55s cubic-bezier(.22,1,.36,1) ${(top.length*60)+80+ri*20}ms;" data-w="${pct}"></div>
            </div>
            <span class="dc-wf-count">${item.c}</span>
          </div>`;
        });
        html += '</div>';
      }

      wrap.innerHTML = html;

      /* Animate on viewport entry — fire once, then unobserve */
      function _triggerKwAnim(){
        wrap.querySelectorAll('.dc-wf-bubble-item[data-bubble-delay]').forEach(el=>{
          el.style.opacity = el.dataset.bubbleAlpha;
          el.style.transform = 'translateY(0) scale(1)';
        });
        wrap.querySelectorAll('.dc-wf-row[data-row-delay]').forEach(el=>{
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        });
        wrap.querySelectorAll('.dc-wf-fill[data-w]').forEach(el2=>{
          el2.style.width = el2.dataset.w + '%';
        });
      }
      const kwObs = new IntersectionObserver(entries=>{
        if(entries[0].isIntersecting){
          _triggerKwAnim();
          kwObs.unobserve(wrap);
        }
      },{threshold:0.05});
      kwObs.observe(wrap);
    }

    /* Build tabs */
    Object.keys(kwData).forEach(key=>{
      const btn = document.createElement('button');
      btn.className = 'dc-kw-tab' + (key === defaultKey ? ' on' : '');
      btn.textContent = key;
      btn.dataset.key = key;
      btn.onclick = ()=>{
        tabsEl.querySelectorAll('.dc-kw-tab').forEach(t=> t.classList.remove('on'));
        btn.classList.add('on');
        // Smooth crossfade: fade out → render → fade in
        wrap.style.transition = 'opacity .18s ease';
        wrap.style.opacity = '0';
        setTimeout(()=>{
          render(key);
          wrap.style.opacity = '1';
          setTimeout(()=>{ wrap.style.transition = ''; }, 200);
        }, 180);
      };
      tabsEl.appendChild(btn);
    });
    render(defaultKey);
  }

  /* ════════════════
     PANEL 1 — X POSTS
  ════════════════ */
  mkChart('xp-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[38,103,12],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(153, c=>` ${c.label}: ${c.raw} (${(c.raw/153*100).toFixed(1)}%)`)
  });
  mkChart('xp-eng-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[8.0,42.5,91.2],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  mkChart('xp-year-bar',{type:'bar',
    data:{labels:['2018','2019','2020','2021','2022','2023','2024','2025'],
      datasets:[
        {label:'Positive', data:[3,4,4,1,1,1,1,21],  backgroundColor:cPos, borderRadius:4, borderWidth:0, borderSkipped:false},
        {label:'Neutral',  data:[8,6,42,3,3,2,1,37],  backgroundColor:cNeu, borderRadius:0, borderWidth:0},
        {label:'Negative', data:[0,0,4,0,0,0,0,8],   backgroundColor:cNeg, borderRadius:0, borderWidth:0}
      ]},
    options: stackedBarOpts()
  });
  const xpKw={
    'All':[{w:'kiruna',c:171},{w:'relocation',c:125},{w:'sweden',c:74},{w:'town',c:71},{w:'church',c:58},{w:'city',c:52},{w:'mining',c:49},{w:'moving',c:41},{w:'swedish',c:34},{w:'moved',c:27},{w:'mine',c:27},{w:'world',c:20},{w:'arctic',c:20},{w:'iron',c:18},{w:'miles',c:17},{w:'entire',c:16},{w:'ore',c:16},{w:'project',c:16},{w:'wooden',c:12},{w:'historic',c:12}],
    'Positive':[{w:'kiruna',c:45},{w:'relocation',c:27},{w:'church',c:26},{w:'sweden',c:26},{w:'town',c:18},{w:'historic',c:12},{w:'moved',c:10},{w:'city',c:10},{w:'mining',c:9},{w:'arctic',c:8},{w:'landmark',c:7},{w:'iron',c:7},{w:'safely',c:6},{w:'feat',c:5},{w:'incredible',c:4}],
    'Negative':[{w:'city',c:15},{w:'kiruna',c:13},{w:'relocation',c:12},{w:'sweden',c:11},{w:'entire',c:9},{w:'rare',c:7},{w:'earths',c:7},{w:'mining',c:6},{w:'demolished',c:5},{w:'dependency',c:4},{w:'forced',c:4},{w:'displaced',c:4},{w:'crisis',c:3},{w:'threat',c:3},{w:'losing',c:3}],
    'Neutral':[{w:'kiruna',c:113},{w:'relocation',c:86},{w:'town',c:53},{w:'mining',c:40},{w:'sweden',c:37},{w:'moving',c:34},{w:'church',c:32},{w:'swedish',c:28},{w:'city',c:27},{w:'iron',c:14},{w:'ore',c:13},{w:'arctic',c:12},{w:'project',c:11},{w:'ongoing',c:10},{w:'urban',c:9}]
  };
  kwCloud('xp-kw-cloud','xp-kw-tabs',xpKw,'All',cBrand);
  radialSpoke('xp-pos-words',[{w:'kiruna',c:45},{w:'relocation',c:27},{w:'church',c:26},{w:'sweden',c:26},{w:'town',c:18},{w:'historic',c:12},{w:'moved',c:10},{w:'city',c:10},{w:'mining',c:9},{w:'arctic',c:8},{w:'landmark',c:7},{w:'iron',c:7},{w:'safely',c:6},{w:'feat',c:5},{w:'incredible',c:4}],cPos);
  radialSpoke('xp-neg-words',[{w:'city',c:15},{w:'kiruna',c:13},{w:'relocation',c:12},{w:'sweden',c:11},{w:'entire',c:9},{w:'rare',c:7},{w:'earths',c:7},{w:'mining',c:6},{w:'demolished',c:5},{w:'dependency',c:4},{w:'forced',c:4},{w:'displaced',c:4},{w:'crisis',c:3},{w:'threat',c:3},{w:'losing',c:3}],cNeg);
  stackedPills('xp-top-bars',[{w:'kiruna',c:171},{w:'relocation',c:125},{w:'sweden',c:74},{w:'town',c:71},{w:'church',c:58},{w:'city',c:52},{w:'mining',c:49},{w:'moving',c:41},{w:'swedish',c:34},{w:'urban',c:20},{w:'moved',c:27},{w:'mine',c:27},{w:'world',c:20},{w:'arctic',c:20},{w:'iron',c:18},{w:'miles',c:17},{w:'entire',c:16},{w:'ore',c:16},{w:'project',c:16},{w:'landmark',c:10},{w:'wooden',c:12},{w:'historic',c:12},{w:'rare',c:9},{w:'earths',c:9},{w:'ongoing',c:13}],cBrand);

  /* ════════════════
     PANEL 2 — X REPLIES
  ════════════════ */
  mkChart('xr-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[139,576,18],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(733, c=>` ${c.label}: ${c.raw} (${(c.raw/733*100).toFixed(1)}%)`)
  });
  mkChart('xr-likes-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[13.5,43.5,4.5],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  mkChart('xr-year-line',{type:'line',
    data:{labels:['2019','2020','2021','2022','2023','2024','2025'],
      datasets:[
        {label:'Positive', data:[19,3,2,0,33,28,46],  borderColor:cPos, backgroundColor:cPosA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cPos, borderWidth:2},
        {label:'Neutral',  data:[42,20,16,63,51,23,340],borderColor:cNeu, backgroundColor:cNeuA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cNeu, borderWidth:2},
        {label:'Negative', data:[5,1,1,0,1,0,9],      borderColor:cNeg, backgroundColor:cNegA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cNeg, borderWidth:2}
      ]},
    options: lineOpts()
  });
  const xrTagCounts=[{t:'Question_Curiosity',n:153},{t:'Religious_Discussion',n:101},{t:'Mining_Mineral',n:79},{t:'Comparison',n:67},{t:'Positive_Reaction',n:48},{t:'Engineering_Reaction',n:44},{t:'Cultural_Heritage',n:20},{t:'Kiruna_Relocation',n:20},{t:'Cost_Question',n:20},{t:'Engineering_Move',n:19},{t:'Sami_Indigenous',n:17},{t:'Distance_Location',n:15}];
  mkChart('xr-tag-bar',{type:'bar',
    data:{labels:xrTagCounts.map(d=>d.t),datasets:[{
      data:xrTagCounts.map(d=>d.n),
      backgroundColor: xrTagCounts.map((_,i)=>{
        const t = i/xrTagCounts.length;
        return `rgba(93,122,150,${(0.9-t*0.45).toFixed(2)})`;
      }),
      borderRadius:4, borderWidth:0
    }]},
    options: hBarOpts()
  });
  const xrTagSent=[
    {t:'Positive_Reaction',total:54,pos:52,neg:0,neu:2},
    {t:'Engineering_Reaction',total:44,pos:14,neg:2,neu:28},
    {t:'Engineering_Move',total:19,pos:6,neg:2,neu:11},
    {t:'Cultural_Heritage',total:20,pos:3,neg:0,neu:17},
    {t:'Mining_Mineral',total:79,pos:10,neg:2,neu:67},
    {t:'Religious_Discussion',total:101,pos:7,neg:3,neu:91},
    {t:'Comparison',total:67,pos:14,neg:1,neu:52},
    {t:'Question_Curiosity',total:153,pos:2,neg:1,neu:150},
    {t:'Sami_Indigenous',total:17,pos:1,neg:2,neu:14},
    {t:'Distance_Location',total:15,pos:6,neg:1,neu:8}
  ];
  const xrTbody=document.querySelector('#xr-tag-sent-table tbody');
  if(xrTbody) xrTagSent.forEach(d=>{
    const pr=(d.pos/d.total*100).toFixed(0);
    const pw=Math.round(d.pos/d.total*54),nw=Math.round(d.neg/d.total*54),nuw=Math.round(d.neu/d.total*54);
    const col=d.pos/d.total>0.3?cPos:d.pos/d.total>0.1?cNeu:'#909098';
    xrTbody.innerHTML+=`<tr><td style="font-weight:500">${d.t}</td><td>${d.total}</td><td style="color:${cPos}">${d.pos}</td><td style="color:${cNeg}">${d.neg}</td><td style="color:${col};font-weight:600">${pr}%</td><td><div style="display:flex;gap:1px;height:7px;width:54px"><div style="width:${pw}px;height:100%;background:${cPos}"></div><div style="width:${nuw}px;height:100%;background:${cNeu}"></div><div style="width:${nw}px;height:100%;background:${cNeg}"></div></div></td></tr>`;
  });
  const xrViewTag=[{t:'Kiruna_Tourism',v:708},{t:'Church_Building',v:486},{t:'Sweden_Dutch',v:478},{t:'Sweden_Context',v:433},{t:'Move_Reaction',v:341},{t:'Distance_Location',v:306},{t:'Cost_Question',v:265},{t:'Engineering_Technical',v:261},{t:'Cultural_Heritage',v:242},{t:'Engineering_Move',v:237},{t:'Heritage_Value',v:233},{t:'Kiruna_Relocation',v:217}];
  const xrVtEl=document.getElementById('xr-view-tag');
  if(xrVtEl){
    const maxV = xrViewTag[0].v;
    /* Lollipop chart — connector line + dot end + value label */
    xrVtEl.style.cssText='display:flex;flex-direction:column;gap:0;padding:2px 0';
    xrVtEl.innerHTML = xrViewTag.map((item,i)=>{
      const pct = (item.v / maxV * 100).toFixed(1);
      const alpha = (0.32 + (item.v/maxV)*0.68).toFixed(2);
      const delay = i * 38;
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:5px 0;cursor:default;opacity:0;transform:translateX(-10px);
        transition:opacity .32s ease ${delay}ms,transform .32s cubic-bezier(.22,1,.36,1) ${delay}ms"
        class="xr-vt-row">
        <span style="width:16px;font-size:9px;color:#b8c0c8;text-align:right;font-family:monospace;flex-shrink:0">${i+1}</span>
        <span style="width:138px;font-size:10.5px;color:#3a4250;font-weight:500;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${item.t}">${item.t.replace(/_/g,' ')}</span>
        <div style="flex:1;position:relative;height:2px;background:#f0f1f3;border-radius:1px">
          <div style="position:absolute;left:0;top:0;height:2px;border-radius:1px;
            background:rgba(93,122,150,${alpha});width:0;
            transition:width .7s cubic-bezier(.22,1,.36,1) ${delay+80}ms"
            data-w="${pct}" class="xr-vt-fill"></div>
          <div style="position:absolute;top:50%;transform:translateY(-50%);
            width:7px;height:7px;border-radius:50%;
            background:rgba(93,122,150,${alpha});border:1.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.12);
            left:0;transition:left .7s cubic-bezier(.22,1,.36,1) ${delay+80}ms"
            class="xr-vt-dot" data-w="${pct}"></div>
        </div>
        <span style="width:36px;font-size:9.5px;color:#96a0aa;text-align:right;font-family:monospace;flex-shrink:0">${item.v}</span>
      </div>`;
    }).join('');

    /* Animate on viewport entry — reset on exit so re-entry re-animates */
    const vtObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        xrVtEl.querySelectorAll('.xr-vt-row').forEach(r=>{
          r.style.opacity='1'; r.style.transform='translateX(0)';
        });
        xrVtEl.querySelectorAll('.xr-vt-fill').forEach(f=>{
          f.style.width = f.dataset.w + '%';
        });
        xrVtEl.querySelectorAll('.xr-vt-dot').forEach(d=>{
          d.style.left = 'calc('+d.dataset.w+'% - 3.5px)';
        });
      } else {
        xrVtEl.querySelectorAll('.xr-vt-row').forEach(r=>{
          r.style.opacity='0'; r.style.transform='translateX(-8px)';
        });
        xrVtEl.querySelectorAll('.xr-vt-fill').forEach(f=>{ f.style.width='0%'; });
        xrVtEl.querySelectorAll('.xr-vt-dot').forEach(d=>{ d.style.left='0%'; });
      }
    },{threshold:0.05});
    vtObs.observe(xrVtEl);
  }
  const xrKw={
    'All (English)':[{w:'kiruna',c:58},{w:'church',c:43},{w:'move',c:30},{w:'town',c:28},{w:'moving',c:28},{w:'mine',c:25},{w:'lkab',c:25},{w:'amazing',c:24},{w:'moved',c:23},{w:'sweden',c:20},{w:'old',c:19},{w:'love',c:18},{w:'beautiful',c:17},{w:'home',c:18},{w:'history',c:13},{w:'city',c:14},{w:'iron',c:12},{w:'cost',c:11},{w:'heritage',c:9},{w:'miles',c:9}],
    'Question_Curiosity':[{w:'cost',c:8},{w:'long',c:6},{w:'much',c:6},{w:'take',c:5},{w:'kiruna',c:5},{w:'church',c:5},{w:'move',c:5},{w:'mine',c:4},{w:'far',c:4},{w:'time',c:4}],
    'Religious_Discussion':[{w:'church',c:35},{w:'kiruna',c:10},{w:'moving',c:7},{w:'old',c:6},{w:'fire',c:5},{w:'god',c:5},{w:'man',c:5},{w:'moved',c:4},{w:'burn',c:4},{w:'history',c:4}],
    'Mining_Mineral':[{w:'mine',c:10},{w:'iron',c:7},{w:'lkab',c:6},{w:'ore',c:5},{w:'rare',c:5},{w:'kiruna',c:5},{w:'earth',c:5},{w:'mining',c:4},{w:'cost',c:4},{w:'town',c:3}],
    'Positive_Reaction':[{w:'amazing',c:16},{w:'beautiful',c:15},{w:'love',c:8},{w:'city',c:6},{w:'incredible',c:4},{w:'great',c:4},{w:'impressive',c:3},{w:'wow',c:3},{w:'awesome',c:3},{w:'stunning',c:2}],
    'Engineering_Reaction':[{w:'move',c:18},{w:'moving',c:11},{w:'moved',c:11},{w:'home',c:5},{w:'house',c:4},{w:'town',c:4},{w:'good',c:3},{w:'everything',c:3},{w:'away',c:4},{w:'hope',c:4}],
    'Cultural_Heritage':[{w:'history',c:11},{w:'heritage',c:8},{w:'church',c:4},{w:'historical',c:4},{w:'kiruna',c:3},{w:'social',c:3},{w:'matters',c:2},{w:'preserve',c:2},{w:'culture',c:2},{w:'main',c:2}]
  };
  kwCloud('xr-kw-cloud','xr-kw-tabs',xrKw,'All (English)',cBrand);
  radialSpoke('xr-pos-words',[{w:'amazing',c:24},{w:'love',c:18},{w:'beautiful',c:17},{w:'best',c:13},{w:'church',c:13},{w:'safe',c:13},{w:'moving',c:11},{w:'incredible',c:10},{w:'good',c:10},{w:'wow',c:9}],cPos);
  radialSpoke('xr-neg-words',[{w:'tragedy',c:3},{w:'fire',c:2},{w:'church',c:2},{w:'mine',c:2},{w:'cost',c:2},{w:'city',c:2},{w:'kiruna',c:2},{w:'move',c:2},{w:'memories',c:2},{w:'away',c:2}],cNeg);
  stackedPills('xr-top-bars',[{w:'kiruna',c:58},{w:'church',c:43},{w:'move',c:30},{w:'town',c:28},{w:'moving',c:28},{w:'mine',c:25},{w:'lkab',c:25},{w:'amazing',c:24},{w:'moved',c:23},{w:'sweden',c:20},{w:'old',c:19},{w:'love',c:18},{w:'beautiful',c:17},{w:'home',c:18},{w:'history',c:13},{w:'city',c:14},{w:'iron',c:12},{w:'cost',c:11},{w:'heritage',c:9},{w:'miles',c:9},{w:'ore',c:8},{w:'dutch',c:8},{w:'mammoet',c:7},{w:'safe',c:13},{w:'incredible',c:10}],cBrand);

  /* ════════════════
     PANEL 3 — REDDIT POSTS
  ════════════════ */
  mkChart('rp-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[14,108,9],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(131, c=>` ${c.label}: ${c.raw} (${(c.raw/131*100).toFixed(1)}%)`)
  });
  mkChart('rp-replies-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[12.0,54.6,54.9],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Replies')
  });
  mkChart('rp-cat-sent-bar',{type:'bar',
    data:{labels:[['City/Church','Relocation'],['Place, Photo','& Travel'],'Other/Mixed'],
      datasets:[
        {label:'Positive', data:[5,8,1],  backgroundColor:cPos, borderRadius:0, borderWidth:0},
        {label:'Neutral',  data:[58,42,8], backgroundColor:cNeu, borderRadius:0, borderWidth:0},
        {label:'Negative', data:[7,2,0],  backgroundColor:cNeg, borderRadius:0, borderWidth:0}
      ]},
    options: stackedBarOpts({xFont:{size:10}})
  });
  mkChart('rp-cat-donut',{type:'doughnut',
    data:{labels:['City/Church Relocation','Place, Photo & Travel','Other/Mixed'],datasets:[{
      data:[70,52,9],
      backgroundColor:[cBrand,'#8fa5b8','#b8a48a'],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{
        legend:{display:true,position:'bottom',labels:{boxWidth:8,boxHeight:8,borderRadius:2,font:{size:10},color:textC,padding:14,usePointStyle:true,pointStyle:'rectRounded'}},
        tooltip:{callbacks:{label:c=>` ${c.raw} posts`}}
      }}
  });
  const rpSubData=[{s:'r/europe',c:13},{s:'r/pics',c:9},{s:'r/interestingasfuck',c:9},{s:'r/sweden',c:7},{s:'r/urbanplanning',c:6},{s:'r/CityPorn',c:6},{s:'r/Damnthatsinteresting',c:6},{s:'r/environment',c:4},{s:'r/TillSverige',c:4},{s:'r/architecture',c:3}];
  const rpSubEl=document.getElementById('rp-sub-bars');
  if(rpSubEl){
    const maxS=rpSubData[0].c;
    rpSubEl.className='dc-rank-grid';
    rpSubEl.innerHTML=rpSubData.map((item,i)=>`
      <div class="dc-rank-row" style="opacity:0;transform:translateX(-8px);transition:opacity .32s ease ${i*28}ms,transform .32s cubic-bezier(.22,1,.36,1) ${i*28}ms">
        <span class="dc-rank-n">${i+1}</span>
        <span class="dc-rank-word" title="${item.s}" style="width:120px">${item.s}</span>
        <div class="dc-rank-track"><div class="dc-rank-fill" style="width:0%;background:${cReddit};opacity:${(0.35+item.c/maxS*0.65).toFixed(2)};transition:width .65s cubic-bezier(.22,1,.36,1) ${80+i*28}ms;" data-w="${Math.round(item.c/maxS*100)}"></div></div>
        <span class="dc-rank-val">${item.c}</span>
      </div>`).join('');
    _obsRevealBars(rpSubEl);
  }
  const rpKw={
    'All':[{w:'kiruna',c:99},{w:'sweden',c:86},{w:'church',c:44},{w:'town',c:41},{w:'city',c:31},{w:'mine',c:24},{w:'relocated',c:24},{w:'northern',c:23},{w:'entire',c:21},{w:'swedish',c:20},{w:'mining',c:19},{w:'building',c:16},{w:'moved',c:15},{w:'relocation',c:15},{w:'iron',c:14},{w:'miles',c:13},{w:'ore',c:13},{w:'expansion',c:12},{w:'moving',c:10},{w:'arctic',c:8}],
    'City/Church':[{w:'kiruna',c:52},{w:'church',c:38},{w:'city',c:27},{w:'moved',c:22},{w:'mine',c:20},{w:'relocated',c:18},{w:'moving',c:16},{w:'entire',c:15},{w:'mining',c:14},{w:'building',c:12}],
    'Place & Travel':[{w:'kiruna',c:39},{w:'sweden',c:36},{w:'northern',c:19},{w:'north',c:12},{w:'swedish',c:11},{w:'europe',c:10},{w:'arctic',c:8},{w:'city',c:8},{w:'town',c:7},{w:'beautiful',c:5}],
    'Positive Titles':[{w:'love',c:6},{w:'beautiful',c:5},{w:'amazing',c:4},{w:'incredible',c:3},{w:'fascinating',c:3},{w:'feat',c:3},{w:'impressive',c:2},{w:'stunning',c:2},{w:'remarkable',c:2},{w:'great',c:2}],
    'Negative Titles':[{w:'destructive',c:5},{w:'torn',c:4},{w:'hell',c:3},{w:'forced',c:3},{w:'environmentally',c:3},{w:'money',c:3},{w:'swallowed',c:2},{w:'suffer',c:2},{w:'destroyed',c:2},{w:'lose',c:2}]
  };
  kwCloud('rp-kw-cloud','rp-kw-tabs',rpKw,'All',cReddit);
  radialSpoke('rp-pos-words',[{w:'love',c:6},{w:'beautiful',c:5},{w:'amazing',c:4},{w:'incredible',c:3},{w:'fascinating',c:3},{w:'feat',c:3},{w:'impressive',c:2},{w:'stunning',c:2},{w:'remarkable',c:2}],cPos);
  radialSpoke('rp-neg-words',[{w:'destructive',c:5},{w:'torn',c:4},{w:'forced',c:3},{w:'environmentally',c:3},{w:'hell',c:3},{w:'swallowed',c:2},{w:'suffer',c:2},{w:'destroyed',c:2},{w:'lose',c:2}],cNeg);
  stackedPills('rp-top-bars',[{w:'kiruna',c:99},{w:'sweden',c:86},{w:'church',c:44},{w:'town',c:41},{w:'city',c:31},{w:'mine',c:24},{w:'relocated',c:24},{w:'northern',c:23},{w:'entire',c:21},{w:'swedish',c:20},{w:'mining',c:19},{w:'building',c:16},{w:'moved',c:15},{w:'relocation',c:15},{w:'iron',c:14},{w:'miles',c:13},{w:'ore',c:13},{w:'expansion',c:12},{w:'moving',c:10},{w:'old',c:9},{w:'relocating',c:9},{w:'arctic',c:8},{w:'ground',c:8},{w:'underneath',c:8},{w:'year',c:8}],cReddit);

  /* ════════════════
     PANEL 4 — REDDIT REPLIES
  ════════════════ */
  mkChart('rr-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[222,469,216],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(907, c=>` ${c.label}: ${c.raw} (${(c.raw/907*100).toFixed(1)}%)`)
  });
  mkChart('rr-likes-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[25.14,15.22,17.13],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  const rrTopicData={
    'Relocation':{total:252,pos:25,neg:145,neu:82,compound:-0.315},
    'Place name':{total:215,pos:59,neg:17,neu:139,compound:0.160},
    'Mining/Industry':{total:149,pos:22,neg:36,neu:91,compound:-0.082},
    'Climate/Nature':{total:142,pos:52,neg:25,neu:65,compound:0.111},
    'Tourism':{total:78,pos:31,neg:6,neu:41,compound:0.282},
    'Sami Culture':{total:36,pos:12,neg:3,neu:21,compound:0.250},
    'Aerospace':{total:29,pos:8,neg:6,neu:15,compound:0.073},
    'N. Sweden Life':{total:6,pos:5,neg:0,neu:1,compound:0.512}
  };
  const rrCompLabels=Object.keys(rrTopicData);
  const rrCompVals=rrCompLabels.map(k=>rrTopicData[k].compound);
  mkChart('rr-compound-bar',{type:'bar',
    data:{labels:rrCompLabels,datasets:[{
      data:rrCompVals,
      backgroundColor:rrCompVals.map(v=>v<-0.1?cNeg:v>0.15?cPos:cNeu),
      borderRadius:4, borderWidth:0
    }]},
    options:{
      ...hBarOpts(),
      scales:{
        x:{ grid:{color:gridC, drawBorder:false}, border:{display:false}, min:-0.4, max:0.6, ticks:{color:textC} },
        y:{ grid:{display:false}, ticks:{font:{size:10},color:textC} }
      }
    }
  });
  mkChart('rr-topic-bar',{type:'bar',
    data:{labels:Object.keys(rrTopicData),datasets:[{
      data:Object.values(rrTopicData).map(d=>d.total),
      backgroundColor: Object.values(rrTopicData).map((_,i,arr)=>{
        const t = i/arr.length;
        return `rgba(93,122,150,${(0.88-t*0.42).toFixed(2)})`;
      }),
      borderRadius:4, borderWidth:0
    }]},
    options: hBarOpts()
  });
  const rrTbody=document.querySelector('#rr-sent-table tbody');
  if(rrTbody) Object.entries(rrTopicData).forEach(([topic,d])=>{
    const pr=(d.pos/d.total*100).toFixed(0);
    const pw=Math.round(d.pos/d.total*54),nw=Math.round(d.neg/d.total*54),nuw=Math.round(d.neu/d.total*54);
    let tone;
    if(d.compound<-0.1)tone=`<span style="color:${cNeg};font-weight:600">−${(d.neg/d.total*100).toFixed(0)}% Neg</span>`;
    else if(d.compound>0.1)tone=`<span style="color:${cPos};font-weight:600">+${pr}% Pos</span>`;
    else tone=`<span style="color:#b0b8c0;font-weight:600">Neutral</span>`;
    rrTbody.innerHTML+=`<tr><td style="font-weight:500">${topic}</td><td>${d.total}</td><td style="color:${cPos}">${d.pos}</td><td style="color:${cNeg}">${d.neg}</td><td>${tone}</td><td><div style="display:flex;gap:1px;height:6px;width:54px;border-radius:3px;overflow:hidden"><div style="width:${pw}px;height:100%;background:${cPos}"></div><div style="width:${nuw}px;height:100%;background:${cNeu}"></div><div style="width:${nw}px;height:100%;background:${cNeg}"></div></div></td></tr>`;
  });
  const rrKw={
    'All Topics':[{w:'kiruna',c:164},{w:'mine',c:156},{w:'sweden',c:154},{w:'town',c:127},{w:'church',c:120},{w:'city',c:119},{w:'mining',c:100},{w:'move',c:93},{w:'people',c:82},{w:'moving',c:81},{w:'moved',c:77},{w:'north',c:68},{w:'northern',c:55},{w:'swedish',c:55},{w:'winter',c:50},{w:'ore',c:48},{w:'ice',c:48},{w:'lithium',c:48},{w:'iron',c:47},{w:'reindeer',c:35}],
    'Relocation':[{w:'church',c:101},{w:'move',c:70},{w:'moved',c:67},{w:'moving',c:63},{w:'city',c:63},{w:'town',c:49},{w:'mine',c:30},{w:'buildings',c:24},{w:'house',c:20},{w:'forced',c:18}],
    'Mining/Industry':[{w:'mine',c:111},{w:'mining',c:57},{w:'ore',c:45},{w:'iron',c:39},{w:'town',c:39},{w:'city',c:29},{w:'mines',c:21},{w:'rare',c:18},{w:'company',c:17},{w:'whole',c:14}],
    'Climate/Nature':[{w:'lithium',c:33},{w:'winter',c:27},{w:'brine',c:27},{w:'snow',c:22},{w:'summer',c:19},{w:'sweden',c:19},{w:'water',c:17},{w:'mining',c:17},{w:'ice',c:16},{w:'mosquitos',c:16}],
    'Tourism':[{w:'northern',c:22},{w:'lights',c:21},{w:'went',c:14},{w:'visited',c:13},{w:'ice',c:13},{w:'people',c:12},{w:'sun',c:11},{w:'trip',c:10},{w:'tourists',c:10},{w:'winter',c:9}],
    'Sami Culture':[{w:'reindeer',c:29},{w:'moose',c:16},{w:'meat',c:9},{w:'road',c:8},{w:'keep',c:8},{w:'finnish',c:7},{w:'good',c:6},{w:'car',c:6},{w:'sami',c:5},{w:'swedes',c:5}],
    'Aerospace':[{w:'launch',c:18},{w:'rocket',c:15},{w:'space',c:9},{w:'student',c:6},{w:'kiruna',c:6},{w:'time',c:6},{w:'sweden',c:6},{w:'little',c:6},{w:'western',c:6},{w:'expensive',c:6}],
    'Positive':[{w:'good',c:30},{w:'beautiful',c:30},{w:'nice',c:23},{w:'place',c:23},{w:'summer',c:21},{w:'winter',c:21},{w:'went',c:20},{w:'northern',c:20},{w:'lights',c:18},{w:'visit',c:15}],
    'Negative':[{w:'move',c:85},{w:'moving',c:72},{w:'moved',c:64},{w:'forced',c:38},{w:'lithium',c:32},{w:'brine',c:27},{w:'destroy',c:22},{w:'process',c:17},{w:'extraction',c:11},{w:'bad',c:10}],
    'Neutral':[{w:'swedish',c:48},{w:'years',c:48},{w:'north',c:44},{w:'ore',c:43},{w:'iron',c:38},{w:'buildings',c:35},{w:'new',c:33},{w:'plan',c:28},{w:'project',c:25},{w:'company',c:22}]
  };
  kwCloud('rr-kw-cloud','rr-kw-tabs',rrKw,'All Topics',cReddit);
  radialSpoke('rr-pos-words',rrKw['Positive'],cPos);
  radialSpoke('rr-neg-words',rrKw['Negative'],cNeg);
  radialSpoke('rr-neu-words',rrKw['Neutral'],cNeu);
  stackedPills('rr-top-bars',[{w:'kiruna',c:164},{w:'mine',c:156},{w:'sweden',c:154},{w:'town',c:127},{w:'church',c:120},{w:'city',c:119},{w:'mining',c:100},{w:'move',c:93},{w:'people',c:82},{w:'moving',c:81},{w:'moved',c:77},{w:'north',c:68},{w:'years',c:63},{w:'northern',c:55},{w:'swedish',c:55},{w:'live',c:41},{w:'winter',c:50},{w:'ore',c:48},{w:'ice',c:48},{w:'lithium',c:48},{w:'iron',c:47},{w:'buildings',c:36},{w:'train',c:40},{w:'lights',c:36},{w:'reindeer',c:35}],cReddit);

  /* Boot scroll-reveal for the first panel */
  setTimeout(initPageObserver,120);
  setTimeout(scheduleDataAside,120);
}
