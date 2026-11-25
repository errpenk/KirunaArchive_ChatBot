/* Search */
const searchInput=document.getElementById('nav-search');
const searchDrop=document.getElementById('search-dropdown');
const searchVm=Vue.createApp({
  data:()=>({items:[],query:''}),
  methods:{
    openResult(item){
      setSearchDropdownOpen(false);
      searchInput.value='';
      if(item.source==='outside')openOutsideSearchResult(item.docIdx,item.year);
      else selectEvent(item.id);
    }
  },
  template:'#search-results-template'
}).mount(searchDrop);
const navEl=document.getElementById('nav');
const navLogoEl=document.getElementById('logo-btn');
const navTabsEl=document.querySelector('#nav .nav-tabs');
const navToolsEl=document.querySelector('#nav .nav-r');
const navSearchWrapEl=document.querySelector('#nav .nav-search-wrap');
const navSecondaryBadgeEl=document.querySelector('#nav .nav-r .nbadge:not(.filled)');
const navPrimaryCtaEl=document.getElementById('btn-explore');
function setSearchDropdownOpen(open){
  searchDrop.classList.toggle('open',!!open);
}
let _outsideSearchCache=[];
let _outsideSearchCacheReady=false;
function _buildOutsideSearchIndex(){
  const {RAW,FIELD_META}=window.KirunaOutsideData||{};
  if(!Array.isArray(RAW)) return [];
  const MONTHS={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
  return RAW.map(row=>{
    const rawDate=String(row?.[0]||'').trim();
    const field=String(row?.[3]||'').trim();
    const parts=rawDate.replace(/[~]/g,'').trim().split(/\s+/);
    return {
      idx:row[7],
      title:String(row?.[1]||'').trim(),
      actor:String(row?.[2]||'').trim(),
      field,
      label:String(row?.[4]||'').trim(),
      desc:String(row?.[5]||'').trim(),
      year:Number(parts.length===2?parts[1]:parts[0])||null,
      rawDate,
      month:MONTHS[rawDate.toLowerCase().split(/\s+/)[0]]||0,
      color:FIELD_META?.[field]?.color||'#86868b'
    };
  }).filter(doc=>doc.title&&doc.rawDate);
}
function refreshOutsideSearchIndex(){
  try{
    const outsideWin=getOutsideSearchWindow();
    if(outsideWin&&typeof outsideWin.getOutsideSearchIndex==='function'){
      const nextIndex=outsideWin.getOutsideSearchIndex();
      if(Array.isArray(nextIndex)&&nextIndex.length){
        _outsideSearchCache=nextIndex;
        _outsideSearchCacheReady=true;
      }
    }
  }catch(e){}
  if(!_outsideSearchCacheReady||!_outsideSearchCache.length){
    const fallbackIndex=_buildOutsideSearchIndex();
    if(fallbackIndex.length){
      _outsideSearchCache=fallbackIndex;
      _outsideSearchCacheReady=true;
    }
  }
  return _outsideSearchCache;
}
function getOutsideSearchWindow(){
  try{
    const tlFrame=document.getElementById('timeline2-frame');
    const tlDoc=tlFrame?.contentDocument||tlFrame?.contentWindow?.document;
    const outsideFrame=tlDoc?.getElementById('outside-frame');
    return outsideFrame?.contentWindow||null;
  }catch(e){
    return null;
  }
}
function getOutsideSearchIndex(){
  return refreshOutsideSearchIndex();
}
function openOutsideDoc(docIdx, year, fromGallery){
  if(typeof window.openTimeline2View==='function') window.openTimeline2View('overview', Number.isFinite(year)?year:null);
  else if(typeof window.showPage==='function') window.showPage('timeline2');
  let attempts=0;
  const tryOpen=()=>{
    attempts+=1;
    try{
      const tlFrame=document.getElementById('timeline2-frame');
      const tlDoc=tlFrame?.contentDocument||tlFrame?.contentWindow?.document;
      const outsideBtn=tlDoc?.getElementById('map-tab-outside');
      if(outsideBtn&&!outsideBtn.classList.contains('on')) outsideBtn.click();
      const outsideWin=tlDoc?.getElementById('outside-frame')?.contentWindow;
      if(fromGallery&&outsideWin&&typeof outsideWin.openOutsideDocFromGallery==='function'){
        if(outsideWin.openOutsideDocFromGallery(docIdx)) return;
      }
      if(outsideWin&&typeof outsideWin.openOutsideDocSearch==='function'){
        if(outsideWin.openOutsideDocSearch(docIdx)) return;
      }
    }catch(e){}
    if(attempts<40) setTimeout(tryOpen,120);
  };
  setTimeout(tryOpen,80);
}
function openOutsideSearchResult(docIdx, year){
  openOutsideDoc(docIdx, year, false);
}
function openOutsideFromGallery(docIdx, year){
  openOutsideDoc(docIdx, year, true);
}
window.openOutsideFromGallery=openOutsideFromGallery;
(function warmOutsideSearchIndex(attempt=0){
  if(refreshOutsideSearchIndex().length||attempt>=30) return;
  setTimeout(()=>warmOutsideSearchIndex(attempt+1),200);
})();
function doSearch(q){
  if(!q.trim()){searchVm.items=[];setSearchDropdownOpen(false);return;}
  const lq=q.toLowerCase();
  const insideRes=EVS
    .filter(ev=>ev.emoji!=='📄')
    .filter(ev=>ev.title.toLowerCase().includes(lq)||ev.desc.toLowerCase().includes(lq)||ev.tags.some(t=>t.toLowerCase().includes(lq))||String(ev.year).includes(lq)||CL[ev.cat].toLowerCase().includes(lq))
    .slice(0,4)
    .map(ev=>({
      key:`inside-${ev.id}`,
      source:'inside',
      id:ev.id,
      year:ev.year,
      title:ev.title,
      meta:`${ev.year} · ${CL[ev.cat]}`,
      sourceLabel:'Inside Map',
      color:CC[ev.cat]
    }));
  const outsideRes=getOutsideSearchIndex()
    .filter(doc=>{
      const haystack=[doc.title,doc.desc,doc.actor,doc.field,doc.label,doc.rawDate,String(doc.year)].join(' ').toLowerCase();
      return haystack.includes(lq);
    })
    .slice(0,4)
    .map(doc=>({
      key:`outside-${doc.idx}`,
      source:'outside',
      docIdx:doc.idx,
      year:Number(doc.year)||null,
      title:doc.title,
      meta:`${doc.rawDate} · ${doc.field}`,
      sourceLabel:'Outside Web',
      color:doc.color||'#86868b'
    }));
  const res=[...insideRes,...outsideRes].slice(0,8);
  searchVm.query=q;
  searchVm.items=res;
  if(!res.length){
    if(!_outsideSearchCacheReady){
      setTimeout(()=>{
        if(searchInput.value.trim()===q.trim()) doSearch(q);
      },220);
    }
  }
  else Vue.nextTick(()=>{if(searchInput.value===q)animateStaggerIn(searchDrop.querySelectorAll('.srd-item'),{axis:'y',distance:6,step:18,duration:180});});
  setSearchDropdownOpen(true);
}
searchInput.addEventListener('input',e=>doSearch(e.target.value));
searchInput.addEventListener('focus',e=>{if(e.target.value)doSearch(e.target.value);});
searchInput.addEventListener('keydown',e=>{if(e.key==='Escape'){setSearchDropdownOpen(false);searchInput.blur();}});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-search-wrap'))setSearchDropdownOpen(false);});

function getElementOuterWidth(el){
  if(!el) return 0;
  const rect=el.getBoundingClientRect();
  return rect.width||0;
}
function getCssGapPx(value){
  const parsed=parseFloat(value);
  return Number.isFinite(parsed)?parsed:0;
}
function isSearchEventsVisible(){
  if(!navSearchWrapEl||!searchInput) return false;
  const wrapStyles=getComputedStyle(navSearchWrapEl);
  const inputStyles=getComputedStyle(searchInput);
  if(
    wrapStyles.display==='none'||
    inputStyles.display==='none'||
    wrapStyles.visibility==='hidden'||
    inputStyles.visibility==='hidden'||
    Number(wrapStyles.opacity)===0
  ) return false;
  const rect=navSearchWrapEl.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&rect.right>0&&rect.left<window.innerWidth;
}
function updateNavTabsCentering(){
  if(!navEl||!navTabsEl) return;
  const html=document.documentElement;
  if(html.classList.contains('phone-app')||html.classList.contains('tablet-app')){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  if(!isSearchEventsVisible()||!navLogoEl){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  const navRect=navEl.getBoundingClientRect();
  const logoRect=navLogoEl.getBoundingClientRect();
  const searchRect=navSearchWrapEl.getBoundingClientRect();
  const gapWidth=searchRect.left-logoRect.right;
  if(gapWidth<=180){
    navTabsEl.style.removeProperty('--nav-tabs-left');
    navTabsEl.style.removeProperty('--nav-tabs-max-width');
    syncMainNavCenterVar();
    requestAnimationFrame(()=>_alignMapTabsCenter());
    return;
  }
  const center=((logoRect.right+searchRect.left)/2)-navRect.left;
  navTabsEl.style.setProperty('--nav-tabs-left',center.toFixed(2)+'px');
  navTabsEl.style.setProperty('--nav-tabs-max-width',Math.max(220,gapWidth-18).toFixed(2)+'px');
  syncMainNavCenterVar();
  requestAnimationFrame(()=>_alignMapTabsCenter());
}
function getMainNavTabsCenterX(){
  if(!navTabsEl) return window.innerWidth/2;
  const rect=navTabsEl.getBoundingClientRect();
  if(!rect.width) return window.innerWidth/2;
  return rect.left+(rect.width/2);
}
function syncMainNavCenterVar(){
  document.documentElement.style.setProperty('--main-nav-center-x',getMainNavTabsCenterX().toFixed(2)+'px');
}
window.getKirunaMainNavTabsCenterX=getMainNavTabsCenterX;
const NAV_SECONDARY_HIDE_EPSILON=6;
const NAV_SECONDARY_SHOW_BUFFER=18;
function getNavSecondaryToolsFootprint(){
  if(!navToolsEl) return 0;
  const toolsStyles=getComputedStyle(navToolsEl);
  const toolGap=getCssGapPx(toolsStyles.gap||toolsStyles.columnGap);
  let footprint=0;
  let visibleCount=0;
  if(navSearchWrapEl&&getComputedStyle(navSearchWrapEl).display!=='none'){
    footprint+=getElementOuterWidth(navSearchWrapEl);
    visibleCount+=1;
  }
  if(navSecondaryBadgeEl&&getComputedStyle(navSecondaryBadgeEl).display!=='none'){
    footprint+=getElementOuterWidth(navSecondaryBadgeEl);
    visibleCount+=1;
  }
  return footprint + (visibleCount ? toolGap * visibleCount : 0);
}
function getNavTabsOverflowPx(){
  if(!navTabsEl) return 0;
  const scrollOverflow=Math.max(0,(navTabsEl.scrollWidth||0)-navTabsEl.clientWidth);
  const lastTabEl=navTabsEl.querySelector('.ntab:last-child');
  if(!lastTabEl) return scrollOverflow;
  const tabsRect=navTabsEl.getBoundingClientRect();
  const lastTabRect=lastTabEl.getBoundingClientRect();
  return Math.max(scrollOverflow,lastTabRect.right-tabsRect.right);
}
function shouldHideNavSecondaryTools(){
  if(!navEl||!navTabsEl||!navToolsEl||!navPrimaryCtaEl) return false;
  if(document.documentElement.classList.contains('phone-app')||document.documentElement.classList.contains('tablet-app')) return false;
  const currentlyHidden=navEl.classList.contains('nav-auto-hide-secondary');
  const tabsOverflow=getNavTabsOverflowPx();
  if(!currentlyHidden){
    return tabsOverflow > NAV_SECONDARY_HIDE_EPSILON;
  }
  const secondaryFootprint=getNavSecondaryToolsFootprint();
  if(!secondaryFootprint) return false;
  const projectedTabsWidth=navTabsEl.clientWidth-secondaryFootprint;
  const requiredTabsWidth=Math.ceil(navTabsEl.scrollWidth||0)+NAV_SECONDARY_SHOW_BUFFER;
  return projectedTabsWidth < requiredTabsWidth;
}
function updateNavSecondaryToolsVisibility(){
  if(!navEl) return;
  const shouldHide=shouldHideNavSecondaryTools();
  const wasHidden=navEl.classList.contains('nav-auto-hide-secondary');
  navEl.classList.toggle('nav-auto-hide-secondary', shouldHide);
  if(shouldHide){
    if(document.activeElement===searchInput) searchInput.blur();
    setSearchDropdownOpen(false);
  }
  if(wasHidden!==shouldHide){
    if(typeof alignTlpControls==='function') requestAnimationFrame(()=>alignTlpControls());
    if(typeof window.refreshDiscourseNavLayout==='function'){
      requestAnimationFrame(()=>window.refreshDiscourseNavLayout(false));
    }
  }
  if(typeof window.refreshTimeline2HeaderAlignment==='function'){
    requestAnimationFrame(()=>window.refreshTimeline2HeaderAlignment());
  }
  updateNavTabsCentering();
}
function scheduleNavSecondaryToolsVisibility(){
  if(scheduleNavSecondaryToolsVisibility._raf) cancelAnimationFrame(scheduleNavSecondaryToolsVisibility._raf);
  scheduleNavSecondaryToolsVisibility._raf=requestAnimationFrame(()=>{
    updateNavSecondaryToolsVisibility();
    updateNavTabsCentering();
    scheduleResponsiveCollisionHides();
    scheduleNavSecondaryToolsVisibility._raf=0;
  });
}
scheduleNavSecondaryToolsVisibility();
window.addEventListener('resize',scheduleNavSecondaryToolsVisibility,{passive:true});
window.addEventListener('resize',scheduleResponsiveCollisionHides,{passive:true});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',scheduleResponsiveCollisionHides,{passive:true});
  window.visualViewport.addEventListener('scroll',scheduleResponsiveCollisionHides,{passive:true});
}
navSearchWrapEl?.addEventListener('transitionend',scheduleNavSecondaryToolsVisibility);
searchInput.addEventListener('focus',()=>{
  scheduleNavSecondaryToolsVisibility();
  setTimeout(scheduleNavSecondaryToolsVisibility,170);
});
searchInput.addEventListener('blur',()=>{
  scheduleNavSecondaryToolsVisibility();
  setTimeout(scheduleNavSecondaryToolsVisibility,170);
});
if(window.ResizeObserver){
  const navAdaptiveObserver=new ResizeObserver(()=>scheduleNavSecondaryToolsVisibility());
  [navEl,navLogoEl,navTabsEl,navToolsEl,navSearchWrapEl,navSecondaryBadgeEl,navPrimaryCtaEl].forEach(el=>{
    if(el) navAdaptiveObserver.observe(el);
  });
}
if(document.fonts?.ready){
  document.fonts.ready.then(()=>{
    scheduleNavSecondaryToolsVisibility();
    scheduleResponsiveCollisionHides();
  }).catch(()=>{});
}
