  function wireLightboxActions(tile){
    const galleryId=tile.dataset.galleryId||'';
    const parts=galleryId.split('-');
    const source=parts[0];
    const id=Number(parts[1]);

    const btnTime=document.getElementById('glb-btn-time');
    const btnMap=document.getElementById('glb-btn-map');

    if(source==='inside'){
      const ev=(window.EVS||[]).find(e=>e.id===id);
      const year=ev?ev.year:null;
      btnTime.style.display='inline-flex';
      btnMap.style.display='inline-flex';
      btnTime.onclick=()=>{
        closeLightbox();
        if(typeof window.openTimeline2View==='function') window.openTimeline2View('overview',year,'gallery',id);
        else if(typeof window.showPage==='function') window.showPage('timeline2','gallery');
      };
      btnMap.onclick=()=>{
        closeLightbox();
        if(typeof window.openGalleryToMap==='function') window.openGalleryToMap(id);
        else { if(typeof window.showPage==='function') window.showPage('archive','gallery'); setTimeout(()=>{ if(typeof window.selectEvent==='function') window.selectEvent(id); },200); }
      };
    } else {
      const year=Number((tile.dataset.galleryMeta||'').match(/\d{4}/)?.[0])||null;
      btnTime.style.display='inline-flex';
      btnMap.style.display='none';
      btnTime.onclick=()=>{
        closeLightbox();
        if(typeof window.openOutsideFromGallery==='function') window.openOutsideFromGallery(id,year);
        else if(typeof window.openOutsideSearchResult==='function') window.openOutsideSearchResult(id,year);
        else if(typeof window.showPage==='function') window.showPage('timeline2','gallery');
      };
    }
  }

  function renderLightboxFrame(){
    if(!_lightboxEl) return;
    const tile=_lightboxItems[_lightboxIdx];
    if(!tile) return;
    _applyTileToFrame(tile, true, 1);
    wireLightboxActions(tile);
  }

  function stepLightbox(dir){
    const next=_lightboxIdx+dir;
    if(next<0||next>=_lightboxItems.length) return;
    _lightboxIdx=next;
    const tile=_lightboxItems[_lightboxIdx];
    if(!tile) return;

    /* Smooth crossfade with direction */
    _applyTileToFrame(tile, true, dir);

    wireLightboxActions(tile);
  }

  function closeLightbox(){
    if(!_lightboxEl) return;
    if(_lightboxEl.classList.contains('open'))window.KirunaRoutes.update('gallery',{item:null});
    closeGalleryImageFullscreen();
    _lightboxEl.classList.add('lb-closing');
    _lightboxEl.classList.remove('open');
    setTimeout(()=>{
      if(_lightboxEl) _lightboxEl.classList.remove('lb-closing');
      document.body.style.overflow='';
    }, 280);
  }

  function openGalleryItem(source, id){
    if(typeof window.showPage==='function') window.showPage('gallery', source==='inside'?'archive':'timeline2');

    let attempts=0;
    function tryFocus(){
      attempts++;
      const galleryId=source+'-'+id;
      const tile=document.querySelector(`.gallery-tile[data-gallery-id="${galleryId}"]`);
      if(tile){
        document.querySelectorAll('.gallery-tile.gallery-focused').forEach(t=>t.classList.remove('gallery-focused'));
        tile.classList.add('gallery-focused');
        tile.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>{
          tile.classList.remove('gallery-focused');
          openLightbox(tile);
        },500);
        return;
      }
      if(attempts<30) setTimeout(tryFocus,80);
    }
    setTimeout(tryFocus,80);
  }

  window.buildGallery=buildGallery;
  window.openGalleryItem=openGalleryItem;
  window.closeGalleryLightbox=closeLightbox;
  window.restoreGalleryItem=async function(source,id){
    await buildGallery();
    const tile=document.querySelector(`.gallery-tile[data-gallery-id="${source}-${id}"]`);
    if(tile)openLightbox(tile);
  };

})();
