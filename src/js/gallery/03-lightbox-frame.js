  function openLightbox(tile){
    const lb=ensureLightbox();
    _lightboxItems=Array.from(document.querySelectorAll('.gallery-tile'));
    _lightboxIdx=_lightboxItems.indexOf(tile);
    renderLightboxFrame();
    lb.classList.add('open');
    document.body.style.overflow='hidden';
    /* Keep nav arrows fixed to viewport edges and viewport vertical center */
    requestAnimationFrame(()=>{ requestAnimationFrame(_positionNavArrows); });
    if(!window._glbResizeBound){
      window._glbResizeBound=true;
      window.addEventListener('resize',()=>{
        _resizeLightboxToCurrentImage();
        _positionNavArrows();
      },{passive:true});
    }
  }

  function _resizeLightboxToCurrentImage(){
    const lb=_lightboxEl; if(!lb||!lb.classList.contains('open')) return;
    if(_lightboxNatW&&_lightboxNatH) _setLightboxImageSize(_lightboxNatW,_lightboxNatH);
  }

  function _setLightboxImageSize(natW,natH){
    const lb=_lightboxEl; if(!lb||!natW||!natH) return;
    const card=lb.querySelector('.glb-card');
    const imgArea=document.getElementById('glb-img');
    if(!card||!imgArea) return;
    _lightboxNatW=natW;
    _lightboxNatH=natH;
    const ratio=natW/natH;
    const root=document.documentElement;
    const isPhone=root.classList.contains('phone-app')||window.innerWidth<=640;
    const gap=isPhone?8:12;
    const viewportPad=isPhone?6:10;
    const arrowW=isPhone?44:52;
    const navReserve=(arrowW + gap + viewportPad) * 2;
    const maxW=Math.max(180, Math.min(880, window.innerWidth - navReserve));
    const maxH=Math.max(180, Math.min(window.innerHeight*0.64, 620));
    let displayW=maxW;
    let displayH=displayW/ratio;
    if(displayH>maxH){
      displayH=maxH;
      displayW=displayH*ratio;
    }
    displayW=Math.max(160, Math.min(maxW, displayW));
    displayH=Math.max(140, Math.min(maxH, displayH));
    card.style.width=Math.round(displayW)+'px';
    imgArea.style.height=Math.round(displayH)+'px';
    requestAnimationFrame(_positionNavArrows);
  }

  function _resetLightboxImageSize(){
    const lb=_lightboxEl; if(!lb) return;
    const card=lb.querySelector('.glb-card');
    const imgArea=document.getElementById('glb-img');
    _lightboxNatW=0;
    _lightboxNatH=0;
    if(card) card.style.width='';
    if(imgArea) imgArea.style.height='';
    requestAnimationFrame(_positionNavArrows);
  }

  function _positionNavArrows(){
    const lb=_lightboxEl; if(!lb||!lb.classList.contains('open')) return;
    const prev=lb.querySelector('.glb-prev');
    const next=lb.querySelector('.glb-next');
    if(!prev||!next) return;
    const isPhone=document.documentElement.classList.contains('phone-app')||window.innerWidth<=640;
    const arrowW=prev.getBoundingClientRect().width||52;
    const viewportPad=isPhone?6:8;
    const arrowTop=Math.max(viewportPad + arrowW/2, Math.min(window.innerHeight - viewportPad - arrowW/2, window.innerHeight/2));
    prev.style.left=viewportPad+'px';
    next.style.left=Math.max(viewportPad, window.innerWidth - arrowW - viewportPad)+'px';
    prev.style.top=arrowTop+'px';
    next.style.top=arrowTop+'px';
    /* Override CSS-based right/left so they don't conflict */
    prev.style.right='auto';
    next.style.right='auto';
  }

  function _applyTileToFrame(tile, animate, direction){
    const [routeSource,routeId]=tile.dataset.galleryId.split('-');
    window.KirunaRoutes.update('gallery',{source:routeSource,item:Number(routeId)});
    const lb=_lightboxEl; if(!lb) return;
    const imgEl=document.getElementById('glb-img');

    /* Crossfade: create new layer on top, fade out old */
    const newLayer=document.createElement('div');
    newLayer.className='glb-img-layer';
    const tileImg=tile.dataset.galleryImgUrl;
    const tileFallback=tile.dataset.galleryGradient||'#d0d0d0';
    const fullBtn=document.getElementById('glb-full-btn');
    if(fullBtn) fullBtn.hidden=!tileImg;
    if(tileImg){
      _lightboxImgSrc=tileImg;
      newLayer.style.background='#1c1c1e';
      const img=document.createElement('img');
      img.alt=tile.dataset.galleryTitle||'Gallery image';
      img.decoding='async';
      img.onload=()=>{
        _setLightboxImageSize(img.naturalWidth,img.naturalHeight);
        _refreshGalleryControlContrast();
      };
      img.onerror=_resetLightboxImageSize;
      img.src=tileImg;
      newLayer.appendChild(img);
    } else {
      _lightboxImgSrc='';
      newLayer.style.background=tileFallback;
      _resetLightboxImageSize();
    }

    if(animate){
      /* Start new layer transparent, slide it in from direction */
      const dx=direction>0?'30px':'-30px';
      newLayer.style.opacity='0';
      newLayer.style.transform=`translateX(${dx})`;
      newLayer.style.transition='opacity .32s cubic-bezier(.4,0,.2,1), transform .36s cubic-bezier(.22,1,.36,1)';
      imgEl.appendChild(newLayer);

      /* Fade out existing layers */
      const oldLayers=Array.from(imgEl.querySelectorAll('.glb-img-layer:not(:last-child)'));
      oldLayers.forEach(l=>{
        l.style.transition='opacity .28s ease, transform .32s cubic-bezier(.4,0,.2,1)';
        l.style.opacity='0';
        l.style.transform=`translateX(${direction>0?'-20px':'20px'})`;
      });

      /* Trigger animation */
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          newLayer.style.opacity='1';
          newLayer.style.transform='translateX(0)';
          /* Remove old layers after transition */
          setTimeout(()=>{ oldLayers.forEach(l=>l.remove()); }, 380);
        });
      });
    } else {
      /* No animation — clear and set directly */
      imgEl.querySelectorAll('.glb-img-layer').forEach(layer=>layer.remove());
      newLayer.style.opacity='1';
      imgEl.appendChild(newLayer);
    }

    /* Update text content */
    document.getElementById('glb-title').textContent=tile.dataset.galleryTitle||'';
    document.getElementById('glb-meta').textContent=tile.dataset.galleryMeta||'';

    /* Counter */
    const counter=document.getElementById('glb-counter');
    if(counter) counter.textContent=(_lightboxIdx+1)+' / '+_lightboxItems.length;

    /* Nav visibility */
    lb.querySelector('.glb-prev').hidden=_lightboxIdx<=0;
    lb.querySelector('.glb-next').hidden=_lightboxIdx>=_lightboxItems.length-1;
    _refreshGalleryControlContrast();
  }
