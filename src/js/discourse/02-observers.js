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

    rvEls.forEach(el=>{
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
