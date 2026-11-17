(function(){
const navEl=document.getElementById('nav');
const navPrimaryCtaEl=document.getElementById('btn-explore');
var _responsiveCollisionRAF=0;
function getVisibleRect(el){
  if(!el) return null;
  const styles=getComputedStyle(el);
  if(styles.display==='none'||styles.visibility==='hidden'||Number(styles.opacity)===0) return null;
  const rect=el.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0) return null;
  if(rect.right<=0||rect.bottom<=0||rect.left>=window.innerWidth||rect.top>=window.innerHeight) return null;
  return rect;
}
function rectsOverlap(a,b,pad=0){
  if(!a||!b) return false;
  return a.left < b.right + pad &&
    a.right + pad > b.left &&
    a.top < b.bottom + pad &&
    a.bottom + pad > b.top;
}
function isArchivePageActive(pageArchive){
  return !!pageArchive &&
    document.body.classList.contains('on-archive') &&
    !pageArchive.classList.contains('off');
}
function isArchiveSidebarTopLayout(sidebarRect){
  if(!sidebarRect) return false;
  return sidebarRect.width >= Math.min(window.innerWidth - 24, window.innerWidth * .72);
}
function updateResponsiveCollisionHides(){
  const pageArchive=document.getElementById('page-archive');
  const collisionClasses=[
    'archive-hide-filter-ui',
    'archive-hide-sidebar-tabs',
    'archive-hide-events-period'
  ];

  if(navEl) navEl.classList.remove('nav-hide-primary-cta');
  if(pageArchive) collisionClasses.forEach(cls=>pageArchive.classList.remove(cls));

  const chatTab=document.getElementById('ntab-chat');
  const ctaRect=getVisibleRect(navPrimaryCtaEl);
  const chatRect=getVisibleRect(chatTab);
  const hideExploreCta=!!(navEl&&ctaRect&&chatRect&&rectsOverlap(ctaRect,chatRect,4));
  if(navEl) navEl.classList.toggle('nav-hide-primary-cta',hideExploreCta);

  if(!isArchivePageActive(pageArchive)) return;

  const backBtn=document.getElementById('map-back-btn');
  const eraPanel=document.getElementById('era-panel');
  const eraFilter=document.getElementById('era-filter-btns');
  const backRect=getVisibleRect(backBtn);
  const eraRect=getVisibleRect(eraPanel);
  const isTouchAppMode=document.documentElement.classList.contains('phone-app')||
    document.documentElement.classList.contains('tablet-app');
  const eraPanelStyles=eraPanel?getComputedStyle(eraPanel):null;
  const eraFilterStyles=eraFilter?getComputedStyle(eraFilter):null;
  const hideDeformedDesktopFilter=!!(
    !isTouchAppMode &&
      eraPanel &&
      eraRect &&
      (
        eraPanel.scrollWidth>eraPanel.clientWidth+2 ||
        eraRect.left<0 ||
        eraRect.right>window.innerWidth ||
        eraPanelStyles?.display==='flex' ||
      eraFilterStyles?.flexDirection==='row'
    )
  );
  const hideFilterUi=!!((backRect&&eraRect&&rectsOverlap(backRect,eraRect,5))||hideDeformedDesktopFilter);

  const sidebar=document.getElementById('sidebar');
  const sidebarTabs=sidebar?.querySelector('.sb-tabs');
  const sidebarRect=getVisibleRect(sidebar);
  const sidebarTabsRect=getVisibleRect(sidebarTabs);
  const topSidebarLayout=isArchiveSidebarTopLayout(sidebarRect);
  const hideSidebarTabs=!!(topSidebarLayout&&sidebarTabsRect);

  const calHead=document.querySelector('#pane-cal .cal-ev-head[data-default-period="1"]');
  const calList=document.getElementById('cal-evs');
  const paneCal=document.getElementById('pane-cal');
  const calHeadStyles=calHead?getComputedStyle(calHead):null;
  const paneCalStyles=paneCal?getComputedStyle(paneCal):null;
  const calHeadRect=calHead?.getBoundingClientRect();
  const calListRect=calList?.getBoundingClientRect();
  const paneCalRect=paneCal?.getBoundingClientRect();
  const calHeadRenderable=!!(
    calHead &&
    paneCal &&
    calHeadStyles?.display!=='none' &&
    paneCalStyles?.display!=='none'
  );
  const hideEventsPeriod=!!(
    topSidebarLayout &&
    calHeadRenderable &&
    calHeadRect &&
    paneCalRect &&
    (
      (sidebarRect&&sidebarRect.height<320) ||
      (calListRect&&calListRect.height<86) ||
      calHeadRect.bottom>paneCalRect.bottom-2 ||
      calHeadRect.top<paneCalRect.top+1 ||
      calHeadRect.top<0 ||
      calHeadRect.bottom>window.innerHeight-1
    )
  );

  pageArchive.classList.toggle('archive-hide-filter-ui',hideFilterUi);
  pageArchive.classList.toggle('archive-hide-sidebar-tabs',hideSidebarTabs);
  pageArchive.classList.toggle('archive-hide-events-period',hideEventsPeriod);
}
function scheduleResponsiveCollisionHides(){
  if(_responsiveCollisionRAF) cancelAnimationFrame(_responsiveCollisionRAF);
  _responsiveCollisionRAF=requestAnimationFrame(()=>{
    _responsiveCollisionRAF=0;
    updateResponsiveCollisionHides();
  });
}
window.updateResponsiveCollisionHides=updateResponsiveCollisionHides;
window.scheduleResponsiveCollisionHides=scheduleResponsiveCollisionHides;
})();
