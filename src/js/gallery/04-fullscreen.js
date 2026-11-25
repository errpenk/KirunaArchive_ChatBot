  function ensureGalleryImageFullscreen(){
    let overlay=document.getElementById('gallery-img-fullscreen');
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id='gallery-img-fullscreen';
    overlay.innerHTML=`
      <img class="gif-img" alt="Fullscreen gallery image" draggable="false">
      <div class="gif-hud">
        <div class="gif-minimap" aria-hidden="true">
          <img class="gif-minimap-img" alt="">
          <div class="gif-minimap-view"></div>
        </div>
        <div class="gif-zoom" aria-label="Image zoom controls">
          <button class="gif-zoom-btn gif-zoom-in" aria-label="Zoom in" type="button">+</button>
          <div class="gif-zoom-label">100%</div>
          <button class="gif-zoom-btn gif-zoom-out" aria-label="Zoom out" type="button">−</button>
        </div>
      </div>
      <button class="gif-close" aria-label="Exit fullscreen" title="Exit fullscreen">✕</button>`;
    document.body.appendChild(overlay);
    const img=overlay.querySelector('.gif-img');
    const close=overlay.querySelector('.gif-close');
    close.addEventListener('click',closeGalleryImageFullscreen);
    overlay.querySelector('.gif-zoom-in').addEventListener('click',e=>{
      e.stopPropagation();
      if(_galleryFsState) _setGalleryFsTransform({scale:Math.min(5,_galleryFsState.scale*1.18)});
    });
    overlay.querySelector('.gif-zoom-out').addEventListener('click',e=>{
      e.stopPropagation();
      if(_galleryFsState) _setGalleryFsTransform({scale:Math.max(1,_galleryFsState.scale/1.18)});
    });
    const minimap=overlay.querySelector('.gif-minimap');
    const dragMinimap=e=>{
      if(!_galleryFsState?.open) return;
      e.preventDefault();
      _setGalleryFsFromMinimap(e.clientX,e.clientY);
    };
    minimap.addEventListener('pointerdown',e=>{
      e.stopPropagation();
      minimap.setPointerCapture?.(e.pointerId);
      _galleryFsState.minimapDrag=true;
      dragMinimap(e);
    });
    minimap.addEventListener('pointermove',e=>{
      if(_galleryFsState?.minimapDrag) dragMinimap(e);
    });
    const endMinimap=()=>{
      if(_galleryFsState) _galleryFsState.minimapDrag=false;
    };
    minimap.addEventListener('pointerup',endMinimap);
    minimap.addEventListener('pointercancel',endMinimap);
    overlay.addEventListener('dblclick',e=>{
      if(e.target.closest('.gif-close,.gif-zoom')) return;
      if(!_galleryFsState) return;
      const nextScale=_galleryFsState.scale>1.05?1:2;
      _setGalleryFsTransform({scale:nextScale,x:0,y:0});
    });
    overlay.addEventListener('wheel',e=>{
      if(!_galleryFsState?.open) return;
      e.preventDefault();
      const delta=e.deltaY<0?0.12:-0.12;
      const nextScale=Math.max(1,Math.min(5,_galleryFsState.scale + delta*_galleryFsState.scale));
      _setGalleryFsTransform({scale:nextScale});
    },{passive:false});
    overlay.addEventListener('pointerdown',e=>{
      if(e.target.closest('.gif-close,.gif-zoom,.gif-minimap')) return;
      if(!_galleryFsState?.open) return;
      overlay.setPointerCapture?.(e.pointerId);
      _galleryFsState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(_galleryFsState.pointers.size===1){
        _galleryFsState.dragStart={x:e.clientX,y:e.clientY,baseX:_galleryFsState.x,baseY:_galleryFsState.y};
      } else if(_galleryFsState.pointers.size===2){
        const pts=[..._galleryFsState.pointers.values()];
        _galleryFsState.pinchStart={
          dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),
          scale:_galleryFsState.scale,
          x:_galleryFsState.x,
          y:_galleryFsState.y
        };
      }
    });
    overlay.addEventListener('pointermove',e=>{
      if(!_galleryFsState?.open||!_galleryFsState.pointers.has(e.pointerId)) return;
      _galleryFsState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(_galleryFsState.pointers.size===2&&_galleryFsState.pinchStart){
        const pts=[..._galleryFsState.pointers.values()];
        const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        const nextScale=Math.max(1,Math.min(5,_galleryFsState.pinchStart.scale*(dist/_galleryFsState.pinchStart.dist)));
        _setGalleryFsTransform({scale:nextScale});
        return;
      }
      if(_galleryFsState.pointers.size===1&&_galleryFsState.dragStart){
        const start=_galleryFsState.dragStart;
        _setGalleryFsTransform({
          x:start.baseX + e.clientX - start.x,
          y:start.baseY + e.clientY - start.y
        });
      }
    });
    const endPointer=e=>{
      if(!_galleryFsState) return;
      _galleryFsState.pointers.delete(e.pointerId);
      _galleryFsState.dragStart=null;
      _galleryFsState.pinchStart=null;
    };
    overlay.addEventListener('pointerup',endPointer);
    overlay.addEventListener('pointercancel',endPointer);
    img.addEventListener('load',()=>{
      _syncGalleryMinimapRatio();
      _setGalleryFsTransform({scale:1,x:0,y:0});
      _refreshGalleryControlContrast();
    });
    return overlay;
  }

  function _syncGalleryMinimapRatio(){
    const overlay=document.getElementById('gallery-img-fullscreen');
    if(!overlay) return;
    const img=overlay.querySelector('.gif-img');
    const minimap=overlay.querySelector('.gif-minimap');
    if(!img||!minimap) return;
    const w=img.naturalWidth||_lightboxNatW||0;
    const h=img.naturalHeight||_lightboxNatH||0;
    if(w>0&&h>0){
      minimap.style.setProperty('--gif-minimap-ratio', `${w} / ${h}`);
    }else{
      minimap.style.removeProperty('--gif-minimap-ratio');
    }
  }

  function _setGalleryFsTransform(next){
    if(!_galleryFsState) return;
    const renderedScale=Math.max(1,_galleryFsState.scale||1);
    if(Number.isFinite(next.scale)) _galleryFsState.scale=next.scale;
    if(Number.isFinite(next.x)) _galleryFsState.x=next.x;
    if(Number.isFinite(next.y)) _galleryFsState.y=next.y;
    if(_galleryFsState.scale<=1.0001){
      _galleryFsState.scale=1;
      _galleryFsState.x=0;
      _galleryFsState.y=0;
    }
    const bounds=_galleryFsMetrics(_galleryFsState.scale,renderedScale);
    if(bounds){
      _galleryFsState.x=Math.max(-bounds.maxX,Math.min(bounds.maxX,_galleryFsState.x));
      _galleryFsState.y=Math.max(-bounds.maxY,Math.min(bounds.maxY,_galleryFsState.y));
    }
    const img=document.querySelector('#gallery-img-fullscreen .gif-img');
    if(img){
      img.style.transform=`translate3d(${_galleryFsState.x}px,${_galleryFsState.y}px,0) scale(${_galleryFsState.scale})`;
    }
    _syncGalleryFsHud();
    _refreshGalleryControlContrast();
  }

  function _galleryFsMetrics(scaleOverride,renderedScaleOverride){
    if(!_galleryFsState) return null;
    const img=document.querySelector('#gallery-img-fullscreen .gif-img');
    if(!img) return null;
    const rect=img.getBoundingClientRect();
    const scale=Math.max(1,scaleOverride||_galleryFsState.scale||1);
    const renderedScale=Math.max(1,renderedScaleOverride||_galleryFsState.scale||1);
    if(!rect.width||!rect.height) return null;
    const baseW=rect.width/renderedScale;
    const baseH=rect.height/renderedScale;
    const scaledW=baseW*scale;
    const scaledH=baseH*scale;
    const maxX=Math.max(0,(scaledW-window.innerWidth)/2);
    const maxY=Math.max(0,(scaledH-window.innerHeight)/2);
    const viewW=maxX?Math.max(8,Math.min(100,(window.innerWidth/scaledW)*100)):100;
    const viewH=maxY?Math.max(8,Math.min(100,(window.innerHeight/scaledH)*100)):100;
    return {maxX,maxY,viewW,viewH};
  }

  function _syncGalleryFsHud(){
    if(!_galleryFsState) return;
    const overlay=document.getElementById('gallery-img-fullscreen');
    if(!overlay) return;
    const label=overlay.querySelector('.gif-zoom-label');
    if(label) label.textContent=Math.round(_galleryFsState.scale*100)+'%';
    const view=overlay.querySelector('.gif-minimap-view');
    if(view){
      const metrics=_galleryFsMetrics();
      if(!metrics) return;
      const rangeX=100-metrics.viewW;
      const rangeY=100-metrics.viewH;
      const xNorm=metrics.maxX?Math.max(-1,Math.min(1,_galleryFsState.x/metrics.maxX)):0;
      const yNorm=metrics.maxY?Math.max(-1,Math.min(1,_galleryFsState.y/metrics.maxY)):0;
      view.style.width=metrics.viewW+'%';
      view.style.height=metrics.viewH+'%';
      view.style.left=(rangeX/2 - xNorm*rangeX/2)+'%';
      view.style.top=(rangeY/2 - yNorm*rangeY/2)+'%';
    }
  }

  function _setGalleryFsFromMinimap(clientX,clientY){
    if(!_galleryFsState) return;
    const minimap=document.querySelector('#gallery-img-fullscreen .gif-minimap');
    const metrics=_galleryFsMetrics();
    if(!minimap||!metrics) return;
    const rect=minimap.getBoundingClientRect();
    const rangeX=100-metrics.viewW;
    const rangeY=100-metrics.viewH;
    const rawLeft=(clientX-rect.left)/rect.width*100 - metrics.viewW/2;
    const rawTop=(clientY-rect.top)/rect.height*100 - metrics.viewH/2;
    const left=Math.max(0,Math.min(rangeX,rawLeft));
    const top=Math.max(0,Math.min(rangeY,rawTop));
    const xNorm=rangeX?((rangeX/2-left)/(rangeX/2)):0;
    const yNorm=rangeY?((rangeY/2-top)/(rangeY/2)):0;
    _setGalleryFsTransform({
      x:xNorm*metrics.maxX,
      y:yNorm*metrics.maxY
    });
  }

  function openGalleryImageFullscreen(){
    if(!_lightboxImgSrc) return;
    const overlay=ensureGalleryImageFullscreen();
    const img=overlay.querySelector('.gif-img');
    const mini=overlay.querySelector('.gif-minimap-img');
    _galleryFsState={open:true,scale:1,x:0,y:0,pointers:new Map(),dragStart:null,pinchStart:null};
    img.src=_lightboxImgSrc;
    if(mini) mini.src=_lightboxImgSrc;
    img.alt=document.getElementById('glb-title')?.textContent||'Fullscreen gallery image';
    _syncGalleryMinimapRatio();
    _setGalleryFsTransform({scale:1,x:0,y:0});
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
    _refreshGalleryControlContrast();
  }

  function closeGalleryImageFullscreen(){
    const overlay=document.getElementById('gallery-img-fullscreen');
    if(!overlay) return;
    overlay.classList.remove('open');
    _galleryFsState=null;
    if(!_lightboxEl?.classList.contains('open')) document.body.style.overflow='';
  }
