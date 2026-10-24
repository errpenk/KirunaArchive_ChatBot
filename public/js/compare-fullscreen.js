
(function(){
  'use strict';

  const overlay   = document.getElementById('cmp-fullscreen-overlay');
  const fsInner   = document.getElementById('cmp-fullscreen-inner');
  const fsBody    = document.getElementById('cmp-fs-body');
  const fsTabs    = document.getElementById('cmp-fs-tabs');
  if(!overlay) return;

  let _fsOpen = false;
  let _fsModule = null;

  /* Build the tab bar inside fullscreen header */
  function _buildFsTabs(activeKey){
    const mods = window.CMP_MODULES || {};
    if(!fsTabs || !Object.keys(mods).length) return;
    /* Preserve the close button (last child) before wiping innerHTML */
    const closeBtn = document.getElementById('cmp-fs-close');
    fsTabs.innerHTML = Object.keys(mods).map(key=>`
      <button class="cmp-mtab${activeKey===key?' on':''}"
        style="font-size:12px;padding:6px 14px"
        onclick="event.stopPropagation();window._cmpFsSelectModule('${key}')">${key}</button>
    `).join('');
    if(closeBtn) fsTabs.appendChild(closeBtn);
  }

  /* Render content into fullscreen body — reuses renderCmpBody logic */
  function _renderFsContent(key, prevKey){
    const mods = window.CMP_MODULES || {};
    if(!mods[key]) return;
    const mod = mods[key];
    _fsModule = key;
    _buildFsTabs(key);

    const keys = Object.keys(mods);
    const prevIdx = prevKey ? keys.indexOf(prevKey) : -1;
    const newIdx  = keys.indexOf(key);
    const dir = (prevIdx < 0 || newIdx > prevIdx) ? 1 : -1;

    const html = mod.sections.map(sec=>{
      if(sec.type === 'pills'){
        return `<div class="cmp-viz-card">
          <div class="cmp-viz-label">${sec.label}</div>
          ${sec.sets.map(set=>`
            <div style="margin-bottom:14px">
              <div style="font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#909098;margin-bottom:8px">${set.name}</div>
              <div class="cmp-bubble-row">
                ${set.words.map((w,wi)=>`
                  <span class="cmp-pill" style="background:${set.color};color:#fff;opacity:${(0.35+w.c/set.words[0].c*0.65).toFixed(2)}">
                    ${w.w} <span style="opacity:.7;font-size:9px">${w.c}</span>
                  </span>`).join('')}
              </div>
            </div>`).join('')}
        </div>`;
      }
      return `<div class="cmp-viz-card">
        <div class="cmp-viz-label">${sec.label}</div>
        ${sec.rows.map((row,ri)=>`
          <div class="cmp-viz-row">
            <span class="cmp-viz-name">${row.name}</span>
            ${!row.noBar ? `<div class="cmp-viz-bar-wrap"><div class="cmp-viz-bar"
              style="background:${row.color};width:${Math.round(row.n/sec.max*100)}%;transition:width .7s cubic-bezier(.22,1,.36,1) ${ri*60}ms"></div></div>` : '<div style="flex:1"></div>'}
            <span class="cmp-viz-val">${row.val}</span>
          </div>`).join('')}
      </div>`;
    }).join('');

    const SLIDE_PX = 28;
    /* Capture current fsInner height */
    const oldH = fsInner ? fsInner.offsetHeight : 0;
    if(fsInner && oldH && prevKey){
      fsInner.style.height = oldH + 'px';
      fsInner.style.transition = 'none';
    }

    fsBody.style.transition = 'none';
    fsBody.style.opacity = '0';
    fsBody.style.transform = `translateX(${dir * SLIDE_PX}px)`;
    requestAnimationFrame(()=>{
      fsBody.innerHTML = `<div class="cmp-viz-grid">${html}</div>`;

      /* Animate height of inner container */
      if(fsInner && oldH && prevKey){
        fsInner.style.height = 'auto';
        const newH = Math.min(fsInner.scrollHeight, window.innerHeight * 0.9);
        fsInner.style.height = oldH + 'px';
        requestAnimationFrame(()=>{
          fsInner.style.transition = 'height .38s cubic-bezier(.4,0,.2,1)';
          fsInner.style.height = newH + 'px';
          setTimeout(()=>{
            fsInner.style.height = '';
            fsInner.style.transition = '';
          }, 420);
        });
      }

      requestAnimationFrame(()=>{
        fsBody.style.transition = 'opacity .45s ease';
        fsBody.style.opacity = '1';
        fsBody.style.transform = 'translateX(0)';
        setTimeout(()=>{ fsBody.style.transform = ''; fsBody.style.transition = ''; }, 500);
      });
    });
  }

  window._cmpFsSelectModule = function(key){
    const prev = _fsModule;
    _renderFsContent(key, prev);
  };

  window.openCmpFullscreen = function(){
    if(_fsOpen) return;
    _fsOpen = true;
    document.body.classList.add('overlay-open');
    /* Start with the currently active compare module, or first */
    const mods = window.CMP_MODULES || {};
    const cur  = window._getCurrentModule ? window._getCurrentModule() : null;
    const activeKey = cur || (Object.keys(mods)[0] || 'Sentiment');
    overlay.style.display = 'flex';
    requestAnimationFrame(()=>{
      overlay.classList.add('cmp-fs-open');
      _renderFsContent(activeKey, null);
    });
    document.body.style.overflow = 'hidden';
  };

  window.closeCmpFullscreen = function(){
    if(!_fsOpen) return;
    overlay.classList.add('cmp-fs-closing');
    setTimeout(()=>{
      overlay.classList.remove('cmp-fs-open','cmp-fs-closing');
      overlay.style.display = 'none';
      fsBody.innerHTML = '';
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
      _fsOpen = false;
    }, 280);
  };

  /* Close on backdrop click — only when clicking the dark backdrop itself */
  overlay.addEventListener('click', e=>{
    if(e.target === overlay) window.closeCmpFullscreen();
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && _fsOpen) window.closeCmpFullscreen();
  });
})();
