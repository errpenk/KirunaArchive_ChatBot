  /* ── Lightbox ── */
  let _lightboxEl=null;
  let _lightboxItems=[];
  let _lightboxIdx=0;
  let _lightboxNatW=0;
  let _lightboxNatH=0;
  let _lightboxDrag=null;
  let _lightboxImgSrc='';
  let _galleryFsState=null;
  let _galleryContrastRaf=0;

  function ensureLightbox(){
    if(_lightboxEl) return _lightboxEl;
    const lb=document.createElement('div');
    lb.id='gallery-lightbox';
    lb.innerHTML=`
      <div class="glb-backdrop"></div>
      <div class="glb-card">
        <button class="glb-close" aria-label="Close">✕</button>
        <div class="glb-img" id="glb-img">
          <button class="glb-full-btn" id="glb-full-btn" aria-label="Open image fullscreen" title="Open fullscreen">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M4 8V4h4M14 4h4v4M18 14v4h-4M8 18H4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="glb-info">
          <div class="glb-title" id="glb-title"></div>
          <div class="glb-meta" id="glb-meta"></div>
          <div class="glb-actions">
            <button class="glb-action-btn" id="glb-btn-time">View on Time ↗</button>
            <button class="glb-action-btn glb-action-btn-sec" id="glb-btn-map">View on Map ↗</button>
          </div>
        </div>
      </div>
      <button class="glb-nav glb-prev" aria-label="Previous">‹</button>
      <button class="glb-nav glb-next" aria-label="Next">›</button>
      <div class="glb-counter" id="glb-counter">1 / 1</div>`;
    document.body.appendChild(lb);
    lb.querySelector('.glb-backdrop').addEventListener('click',closeLightbox);
    lb.querySelector('.glb-close').addEventListener('click',closeLightbox);
    lb.querySelector('.glb-prev').addEventListener('click',()=>stepLightbox(-1));
    lb.querySelector('.glb-next').addEventListener('click',()=>stepLightbox(1));
    lb.querySelector('#glb-full-btn').addEventListener('click',e=>{
      e.stopPropagation();
      openGalleryImageFullscreen();
    });
    _bindLightboxSwipe(lb);
    document.addEventListener('keydown',lbKeyHandler);
    _lightboxEl=lb;
    return lb;
  }

  function _controlContrastLuminance(img,control){
    if(!img||!control||!img.complete||!img.naturalWidth||!img.naturalHeight) return 24;
    const imgRect=img.getBoundingClientRect();
    const controlRect=control.getBoundingClientRect();
    const points=[
      [0.32,0.32],[0.50,0.32],[0.68,0.32],
      [0.32,0.50],[0.50,0.50],[0.68,0.50],
      [0.32,0.68],[0.50,0.68],[0.68,0.68]
    ];
    try{
      const canvas=_controlContrastLuminance.canvas||(_controlContrastLuminance.canvas=document.createElement('canvas'));
      canvas.width=1;canvas.height=1;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      let total=0;
      let count=0;
      for(const [px,py] of points){
        const cx=controlRect.left+controlRect.width*px;
        const cy=controlRect.top+controlRect.height*py;
        if(cx<imgRect.left||cx>imgRect.right||cy<imgRect.top||cy>imgRect.bottom) continue;
        const sx=Math.max(0,Math.min(img.naturalWidth-1,((cx-imgRect.left)/imgRect.width)*img.naturalWidth));
        const sy=Math.max(0,Math.min(img.naturalHeight-1,((cy-imgRect.top)/imgRect.height)*img.naturalHeight));
        ctx.clearRect(0,0,1,1);
        ctx.drawImage(img,sx,sy,1,1,0,0,1,1);
        const [r,g,b]=ctx.getImageData(0,0,1,1).data;
        total+=0.2126*r+0.7152*g+0.0722*b;
        count++;
      }
      return count?total/count:24;
    }catch(err){
      return 24;
    }
  }

  function _applyControlContrast(control,luminance){
    if(!control) return;
    const onDark=luminance<132;
    control.classList.toggle('contrast-on-dark',onDark);
    control.classList.toggle('contrast-on-light',!onDark);
  }

  function _refreshGalleryControlContrast(){
    if(_galleryContrastRaf) cancelAnimationFrame(_galleryContrastRaf);
    _galleryContrastRaf=requestAnimationFrame(()=>{
      _galleryContrastRaf=0;
      const lightboxImg=document.querySelector('#glb-img .glb-img-layer:last-child img');
      const fullBtn=document.getElementById('glb-full-btn');
      const lightboxClose=document.querySelector('.glb-close');
      _applyControlContrast(fullBtn,_controlContrastLuminance(lightboxImg,fullBtn));
      _applyControlContrast(lightboxClose,_controlContrastLuminance(lightboxImg,lightboxClose));
      const fsOverlay=document.getElementById('gallery-img-fullscreen');
      if(fsOverlay?.classList.contains('open')){
        const fsImg=fsOverlay.querySelector('.gif-img');
        const fsClose=fsOverlay.querySelector('.gif-close');
        _applyControlContrast(fsClose,_controlContrastLuminance(fsImg,fsClose));
      }
    });
  }

  function _bindLightboxSwipe(lb){
    const start=(x,y,pointerId)=>{
      if(!lb.classList.contains('open')) return;
      _lightboxDrag={x,y,dx:0,dy:0,pointerId,moved:false};
    };
    const move=(x,y)=>{
      if(!_lightboxDrag) return;
      _lightboxDrag.dx=x-_lightboxDrag.x;
      _lightboxDrag.dy=y-_lightboxDrag.y;
      if(Math.abs(_lightboxDrag.dx)>8||Math.abs(_lightboxDrag.dy)>8) _lightboxDrag.moved=true;
    };
    const end=()=>{
      if(!_lightboxDrag) return;
      const {dx,dy,moved}= _lightboxDrag;
      _lightboxDrag=null;
      if(!moved) return;
      const threshold=Math.max(42, Math.min(92, window.innerWidth*0.12));
      if(Math.abs(dx)>threshold && Math.abs(dx)>Math.abs(dy)*1.25){
        stepLightbox(dx<0?1:-1);
      }
    };
    lb.addEventListener('pointerdown',e=>{
      if(e.target.closest('.glb-nav,.glb-close,.glb-action-btn,.glb-full-btn')) return;
      start(e.clientX,e.clientY,e.pointerId);
      try{ lb.setPointerCapture(e.pointerId); }catch(err){}
    });
    lb.addEventListener('pointermove',e=>{
      if(!_lightboxDrag||_lightboxDrag.pointerId!==e.pointerId) return;
      move(e.clientX,e.clientY);
    });
    lb.addEventListener('pointerup',e=>{
      if(_lightboxDrag&&_lightboxDrag.pointerId===e.pointerId) end();
    });
    lb.addEventListener('pointercancel',()=>{ _lightboxDrag=null; });
    if(!window.PointerEvent){
      lb.addEventListener('touchstart',e=>{
        if(e.target.closest('.glb-nav,.glb-close,.glb-action-btn,.glb-full-btn')) return;
        const t=e.touches&&e.touches[0]; if(t) start(t.clientX,t.clientY,null);
      },{passive:true});
      lb.addEventListener('touchmove',e=>{
        if(!_lightboxDrag) return;
        const t=e.touches&&e.touches[0]; if(t) move(t.clientX,t.clientY);
      },{passive:true});
      lb.addEventListener('touchend',end,{passive:true});
      lb.addEventListener('touchcancel',()=>{ _lightboxDrag=null; },{passive:true});
    }
  }

  function lbKeyHandler(e){
    if(!_lightboxEl||!_lightboxEl.classList.contains('open')) return;
    if(_galleryFsState?.open){
      if(e.key==='Escape') closeGalleryImageFullscreen();
      return;
    }
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') stepLightbox(-1);
    if(e.key==='ArrowRight') stepLightbox(1);
  }
