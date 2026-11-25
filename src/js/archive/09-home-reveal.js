/* ══════════════════════════════════════════
   SCROLL-DRIVEN INTERSECTION ANIMATIONS
══════════════════════════════════════════ */

// ── Home sections: pure scroll-driven reveal ──
// Uses scroll position directly — works regardless of screen height
// or how many sections fit in the viewport at once.
let _homeScrollInit=false;
function observeHomeSections(){
  const homeEl=document.getElementById('page-home');
  if(!homeEl) return;

  const sections=Array.from(document.querySelectorAll('.home-section'));
  if(!sections.length) return;

  // First call: start invisible with stagger
  if(!_homeScrollInit){
    _homeScrollInit=true;
    sections.forEach((el,i)=>{
      el.classList.remove('reveal-in','reveal-out');
      el.dataset.secDelay=String(i*120);
    });
    // Trigger initial entrance after a short frame
    setTimeout(()=>_updateHomeSections(homeEl,sections,true),60);
  }

  // Attach scroll listener (once)
  if(homeEl._scrollBound) return;
  homeEl._scrollBound=true;
  homeEl.addEventListener('scroll',()=>_updateHomeSections(homeEl,sections,false),{passive:true});
}

function _updateHomeSections(homeEl,sections,isFirst){
  const vH=homeEl.clientHeight;
  // Zone: a section is "active" when its centre is within a band
  // Upper edge: 15% from top of viewport
  // Lower edge: 88% from top of viewport
  const ENTER_TOP=vH*0.88;
  const EXIT_TOP=vH*0.05;

  sections.forEach(el=>{
    const r=el.getBoundingClientRect();
    // getBoundingClientRect is relative to viewport, not scroll container.
    // Convert to be relative to homeEl:
    const homeR=homeEl.getBoundingClientRect();
    const top=r.top-homeR.top;
    const bottom=r.bottom-homeR.top;

    const visible=(top < ENTER_TOP) && (bottom > EXIT_TOP);

    if(visible){
      if(!el.classList.contains('reveal-in')){
        el.classList.remove('reveal-out');
        const delay=isFirst?(+el.dataset.secDelay||0):0;
        setTimeout(()=>el.classList.add('reveal-in'),delay);
      }
    } else {
      if(el.classList.contains('reveal-in')){
        el.classList.remove('reveal-in');
        el.classList.add('reveal-out');
      }
    }
  });
}

// ── Home mini-timeline nodes — 50ms stagger, in+out ──
let _htlObs=null;
function observeHTLNodes(){
  const root=document.querySelector('.htl-scroll-area');
  if(!root)return;
  const nodes=document.querySelectorAll('.htl-node');
  if(!nodes.length)return;
  nodes.forEach(el=>el.classList.remove('in-view'));
  if(_htlObs)_htlObs.disconnect();
  _htlObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  },{root,threshold:0.1,rootMargin:'0px 60px 0px 60px'});
  nodes.forEach((el,i)=>{el.dataset.obsDelay=i*50;_htlObs.observe(el);});
}

// ── Featured cards — 70ms stagger, spring pop ──
let _cardObs=null;
function observeCards(){
  const root=document.getElementById('page-home');
  if(!root)return;
  const cards=document.querySelectorAll('#page-home .card');
  if(!cards.length)return;
  cards.forEach(el=>{el.classList.remove('in-view');el.style.transition='';});
  if(_cardObs)_cardObs.disconnect();
  _cardObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        setTimeout(()=>{
          entry.target.style.transition='opacity .38s cubic-bezier(.4,0,.2,1),transform .38s cubic-bezier(.4,0,.2,1),box-shadow .2s';
          entry.target.classList.add('in-view');
        },+entry.target.dataset.obsDelay||0);
      }
    });
  },{root,threshold:0.08});
  cards.forEach((el,i)=>{el.dataset.obsDelay=i*70;_cardObs.observe(el);});
}

// ── Text timeline txt-cols (Images Off) — stagger, in+out with out-view ──
let _txtObs=null;
function observeTxtCols(){
  const root=document.getElementById('dtl-text-body');
  if(!root)return;
  const cols=root.querySelectorAll('.txt-col');
  if(!cols.length)return;
  if(_txtObs)_txtObs.disconnect();
  _txtObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.remove('out-view');
        setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
      } else {
        if(entry.target.classList.contains('in-view')){
          entry.target.classList.remove('in-view');
          entry.target.classList.add('out-view');
        }
      }
    });
  },{root,threshold:0.08,rootMargin:'0px 20px 0px 20px'});
  cols.forEach((el,i)=>{el.dataset.obsDelay=i*35;_txtObs.observe(el);});
}

// ── Ruler ticks — 30ms stagger ──
let _rulerObs=null;
function observeRulerTicks(){
  const root=document.getElementById('map-ruler-inner');
  if(!root)return;
  const ticks=root.querySelectorAll('.ruler-tick:not(.era-hidden)');
  if(!ticks.length)return;
  if(_rulerObs)_rulerObs.disconnect();
  _rulerObs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting)setTimeout(()=>entry.target.classList.add('in-view'),+entry.target.dataset.obsDelay||0);
    });
  },{root,threshold:0.1});
  ticks.forEach((el,i)=>{el.dataset.obsDelay=i*30;_rulerObs.observe(el);});
}

// ── Ruler era filter ──
function updateRulerFilter(){
  const inner=document.getElementById('map-ruler-inner');
  if(!inner)return;
  const ticks=inner.querySelectorAll('.ruler-tick');
  let visIdx=0;
  ticks.forEach(t=>{
    const tickYear=+t.dataset.year;
    // Check if any event in this year matches the filter
    const eventsThisYear=EVS.filter(e=>e.year===tickYear);
    const hide=eraFilter!=='all'&&!eventsThisYear.some(e=>e.cat===eraFilter);
    t.classList.toggle('era-hidden',hide);
    t.classList.remove('in-view');
    if(!hide){
      const delay=visIdx*40;
      setTimeout(()=>t.classList.add('in-view'),delay+60);
      visIdx++;
    }
  });
}

// Initial observations on first load
requestAnimationFrame(()=>{
  observeHomeSections();
  observeHTLNodes();
  observeCards();
});
})();
