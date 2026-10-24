
(function(){
'use strict';

/* ═══════════════════════════
   Compare panel — Discourse only
   Modules: Sentiment | Keywords | Engagement
═══════════════════════════ */

const CMP_MODULES = {
  'Sentiment': {
    desc: 'Sentiment distribution and engagement across all four datasets',
    sections: [
      {
        label: 'Positive sentiment %',
        rows: [
          {name:'X Posts',       val:'24.8%', n:24.8, color:'#6b9e8f'},
          {name:'X Replies',     val:'33.7%', n:33.7, color:'#6b9e8f'},
          {name:'Reddit Posts',  val:'10.7%', n:10.7, color:'#7a8f6b'},
          {name:'Reddit Replies',val:'24.5%', n:24.5, color:'#7a8f6b'},
        ], max:100
      },
      {
        label: 'Negative sentiment',
        rows: [
          {name:'X Posts',       val:'7.8%',  n:7.8,  color:'#c07a6a'},
          {name:'X Replies',     val:'2.5%',  n:2.5,  color:'#c07a6a'},
          {name:'Reddit Posts',  val:'6.9%',  n:6.9,  color:'#c07a6a'},
          {name:'Reddit Replies',val:'23.8%', n:23.8, color:'#c07a6a'},
        ], max:30
      },
      {
        label: 'Avg. likes by pos. sentiment',
        rows: [
          {name:'X Posts',       val:'91.2',  n:91.2, color:'#6b9e8f'},
          {name:'X Replies',     val:'4.5',   n:4.5,  color:'#6b9e8f'},
          {name:'Reddit Posts',  val:'54.9',  n:54.9, color:'#7a8f6b'},
          {name:'Reddit Replies',val:'17.1',  n:17.1, color:'#7a8f6b'},
        ], max:100
      },
    ]
  },
  'Keywords': {
    desc: 'Top shared keywords across all four datasets',
    sections: [
      {
        label: 'Most frequent words — all platforms',
        type: 'pills',
        sets: [
          {name:'X Posts',       color:'#5d7a96', words:[{w:'kiruna',c:171},{w:'relocation',c:125},{w:'sweden',c:74},{w:'church',c:58},{w:'city',c:52},{w:'mining',c:49}]},
          {name:'X Replies',     color:'#5d7a96', words:[{w:'kiruna',c:58},{w:'church',c:43},{w:'move',c:30},{w:'town',c:28},{w:'moving',c:28},{w:'mine',c:25}]},
          {name:'Reddit Posts',  color:'#7a8f6b', words:[{w:'kiruna',c:99},{w:'sweden',c:86},{w:'church',c:44},{w:'town',c:41},{w:'city',c:31},{w:'mine',c:24}]},
          {name:'Reddit Replies',color:'#7a8f6b', words:[{w:'kiruna',c:164},{w:'mine',c:156},{w:'sweden',c:154},{w:'town',c:127},{w:'church',c:120},{w:'city',c:119}]},
        ]
      },
      {
        label: 'Positive keywords across platforms',
        type: 'pills',
        sets: [
          {name:'X Posts',       color:'#6b9e8f', words:[{w:'safely',c:6},{w:'feat',c:5},{w:'incredible',c:4},{w:'historic',c:12},{w:'landmark',c:7}]},
          {name:'X Replies',     color:'#6b9e8f', words:[{w:'amazing',c:24},{w:'love',c:18},{w:'beautiful',c:17},{w:'incredible',c:10},{w:'wow',c:9}]},
          {name:'Reddit Posts',  color:'#6b9e8f', words:[{w:'love',c:6},{w:'beautiful',c:5},{w:'amazing',c:4},{w:'incredible',c:3},{w:'feat',c:3}]},
          {name:'Reddit Replies',color:'#6b9e8f', words:[{w:'beautiful',c:30},{w:'good',c:30},{w:'nice',c:23},{w:'northern',c:20},{w:'lights',c:18}]},
        ]
      },
      {
        label: 'Negative keywords across platforms',
        type: 'pills',
        sets: [
          {name:'X Posts',       color:'#c07a6a', words:[{w:'demolished',c:5},{w:'forced',c:4},{w:'displaced',c:4},{w:'crisis',c:3},{w:'losing',c:3}]},
          {name:'X Replies',     color:'#c07a6a', words:[{w:'tragedy',c:3},{w:'fire',c:2},{w:'cost',c:2},{w:'memories',c:2}]},
          {name:'Reddit Posts',  color:'#c07a6a', words:[{w:'destructive',c:5},{w:'torn',c:4},{w:'forced',c:3},{w:'hell',c:3},{w:'suffer',c:2}]},
          {name:'Reddit Replies',color:'#c07a6a', words:[{w:'forced',c:38},{w:'destroy',c:22},{w:'extraction',c:11},{w:'bad',c:10},{w:'move',c:85}]},
        ]
      },
    ]
  },
};

window.CMP_MODULES = CMP_MODULES;
let _currentModule = null;
window._getCurrentModule = function(){ return _currentModule; };
let _compareOpen = false;
let _compareHideTimer = null;

function renderCmpTabs(){
  const tabsEl = document.getElementById('cmp-module-tabs');
  if(!tabsEl) return;
  const fsBtn = document.getElementById('cmp-fullscreen-btn');
  tabsEl.innerHTML = Object.keys(CMP_MODULES).map(key=>`
    <button class="cmp-mtab${_currentModule===key?' on':''}" onclick="selectCmpModule('${key}')">${key}</button>
  `).join('');
  if(fsBtn) tabsEl.appendChild(fsBtn);
}

window.selectCmpModule = function(key){
  const prevKey = _currentModule;
  _currentModule = key;
  renderCmpTabs();
  renderCmpBody(key, prevKey);
};

function renderCmpBody(key, prevKey){
  const body = document.getElementById('cmp-body');
  if(!body) return;
  const mod = CMP_MODULES[key];
  if(!mod){ body.innerHTML=''; return; }

  // Determine slide direction from tab order
  const keys = Object.keys(CMP_MODULES);
  const prevIdx = prevKey ? keys.indexOf(prevKey) : -1;
  const newIdx  = keys.indexOf(key);
  const dir = (prevIdx < 0 || newIdx > prevIdx) ? 1 : -1;

  const html = mod.sections.map(sec=>{
    if(sec.type === 'pills'){
      return `<div class="cmp-viz-card">
        <div class="cmp-viz-label">${sec.label}</div>
        ${sec.sets.map(set=>`
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#909098;margin-bottom:6px">${set.name}</div>
            <div class="cmp-bubble-row">
              ${set.words.map((w,wi)=>`
                <span class="cmp-pill" style="background:${set.color};color:#fff;opacity:${(0.35+w.c/set.words[0].c*0.65).toFixed(2)};
                  transform:translateY(6px) scale(.9);transition:opacity .28s ease ${wi*40}ms,transform .28s cubic-bezier(.4,0,.2,1) ${wi*40}ms"
                  data-cmp-pill-delay="${wi*40}" data-cmp-pill-op="${(0.35+w.c/set.words[0].c*0.65).toFixed(2)}">
                  ${w.w} <span style="opacity:.7;font-size:8px">${w.c}</span>
                </span>`).join('')}
            </div>
          </div>`).join('')}
      </div>`;
    }
    return `<div class="cmp-viz-card">
      <div class="cmp-viz-label">${sec.label}</div>
      ${sec.rows.map((row, ri)=>`
        <div class="cmp-viz-row">
          <span class="cmp-viz-name">${row.name}</span>
          ${!row.noBar ? `<div class="cmp-viz-bar-wrap"><div class="cmp-viz-bar" style="background:${row.color};transition:width .7s cubic-bezier(.22,1,.36,1) ${ri*80}ms" data-w="${Math.round(row.n/sec.max*100)}"></div></div>` : '<div style="flex:1"></div>'}
          <span class="cmp-viz-val">${row.val}</span>
        </div>`).join('')}
    </div>`;
  }).join('');

  const SLIDE_PX = 28;
  const panel = document.getElementById('rpt-compare-panel');

  // Capture current panel height before content swap
  const oldH = panel ? panel.offsetHeight : 0;
  if(panel && oldH){
    panel.style.height = oldH + 'px';
    panel.style.maxHeight = 'none'; // 🔴 解除 max-height 的干扰
    panel.style.transition = 'none';
  }

  body.style.transition = 'none';
  body.style.opacity = '0';
  body.style.transform = `translateX(${dir * SLIDE_PX}px)`;

  requestAnimationFrame(()=>{
    const tpl = document.createElement('div');
    tpl.innerHTML = `<div class="cmp-viz-grid">${html}</div>`;
    body.replaceChildren(...tpl.childNodes);
    body.querySelectorAll('.cmp-viz-bar[data-w]').forEach(b=>{ b.style.width = b.dataset.w + '%'; });
    body.querySelectorAll('.cmp-pill[data-cmp-pill-delay]').forEach(pill=>{
      pill.style.opacity = pill.dataset.cmpPillOp;
      pill.style.transform = 'none';
    });
    body.querySelectorAll('.cmp-viz-card').forEach(card=>{
      card.style.opacity = '1';
      card.style.transform = 'none';
    });

    // Measure new natural height and animate panel to it
    if(panel && oldH){
      // Temporarily let panel expand to measure new height
      panel.style.height = 'auto';
      panel.offsetHeight;
      const newH = Math.min(panel.scrollHeight, window.innerHeight * 0.72);

      // 2. 瞬间设回旧高度（作为动画起点）
      panel.style.height = oldH + 'px';

      void panel.offsetHeight;

      panel.style.transition = 'height .38s cubic-bezier(.4,0,.2,1), opacity .28s ease, box-shadow .38s ease';

      panel.style.height = newH + 'px';
        // Clean up after transition
      setTimeout(()=>{
        panel.style.height = '';
        panel.style.maxHeight = '72vh';
        panel.style.transition = 'transform .36s cubic-bezier(.4,0,.2,1), box-shadow .36s ease, opacity .28s ease';
      }, 420);
    }


    requestAnimationFrame(()=>{
      body.style.transition = 'opacity .45s ease';
      body.style.opacity = '1';
      body.style.transform = 'translateX(0)';
      /* Clear transform after fade so no residual spring */
      setTimeout(()=>{ body.style.transform = ''; body.style.transition = ''; }, 500);
    });
  });
}






function updateCompareBodyOffset(){
  const btn = document.getElementById('rpt-compare-btn');
  const panel = document.getElementById('rpt-compare-panel');
  if(!panel) return;

  if(_compareOpen && btn && getComputedStyle(btn).display !== 'none'){
    const rect = btn.getBoundingClientRect();
    const offset = rect.height + 10; // Tighter reserve keeps the panel shorter while avoiding overlap.
    panel.style.setProperty('--cmp-btn-offset', offset + 'px');
  } else {
    panel.style.setProperty('--cmp-btn-offset', '0px');
  }
}

function setCompareButtonState(isOpen){
  const btn = document.getElementById('rpt-compare-btn');
  if(btn) btn.innerHTML = isOpen ? '<span class="cmp-icon">✕</span>Close' : '<span class="cmp-icon">⇄</span>Compare';
}

window.closeComparePanel = function(opts = {}){
  const panel = document.getElementById('rpt-compare-panel');
  if(!panel) return;
  const immediate = !!opts.immediate;

  _compareOpen = false;
  if(_compareHideTimer){
    clearTimeout(_compareHideTimer);
    _compareHideTimer = null;
  }
  panel.classList.remove('open');
  panel.style.setProperty('--cmp-btn-offset', '0px');
  /* Restore back-to-top button */
  const btnTop = document.getElementById('dc-btn-top');
  if(btnTop){ btnTop.style.opacity=''; btnTop.style.pointerEvents=''; }
  setCompareButtonState(false);

  if(immediate){
    panel.style.display='none';
  } else {
    _compareHideTimer = setTimeout(()=>{
      if(!_compareOpen) panel.style.display='none';
      _compareHideTimer = null;
    }, 380);
  }
};

window.openComparePanel = function(){
  const panel = document.getElementById('rpt-compare-panel');
  if(!panel) return;

  const isPhoneCompare = document.documentElement.classList.contains('phone-app');

  _compareOpen = true;
  if(_compareHideTimer){
    clearTimeout(_compareHideTimer);
    _compareHideTimer = null;
  }
  panel.style.display = 'flex';
  if(isPhoneCompare){
    updateCompareBodyOffset();
    panel.classList.add('open');
  } else {
    requestAnimationFrame(()=>{
      if(!_compareOpen) return;
      panel.classList.add('open');
      updateCompareBodyOffset();
    });
  }
  /* Hide back-to-top button so it doesn't overlap compare panel */
  const btnTop = document.getElementById('dc-btn-top');
  if(btnTop){ btnTop.style.opacity='0'; btnTop.style.pointerEvents='none'; }

  if(!_currentModule) window.selectCmpModule('Sentiment');
  else renderCmpTabs();

  setCompareButtonState(true);
};

window.toggleCompare = function(){
  if(_compareOpen) window.closeComparePanel();
  else window.openComparePanel();
};

window.addEventListener('resize', updateCompareBodyOffset);

/* Auto-close when leaving discourse — use lazy reference to avoid timing issue */
(function(){
  const _origRef = { fn: null };
  const _patchShowPage = function(){
    if(_origRef.fn) return; /* already patched */
    const base = window.showPage;
    if(!base || base._cmpPatched) return;
    _origRef.fn = base;
    const patched = function(p, from){
      if(p !== 'discourse' && _compareOpen){
        if(window.closeComparePanel) window.closeComparePanel({immediate:true});
      }
      if(p !== 'discourse' && window.closeCmpFullscreen){ window.closeCmpFullscreen(); }
      _origRef.fn(p, from);
    };
    patched._cmpPatched = true;
    window.showPage = patched;
  };
  /* Try now and also after DOM ready */
  _patchShowPage();
  document.addEventListener('DOMContentLoaded', _patchShowPage);
  setTimeout(_patchShowPage, 200);
})();

/* ═══════════════════════════
   Pill-wrap mouse parallax spotlight
═══════════════════════════ */
document.querySelectorAll('.dc-pill-wrap').forEach(wrap=>{
  wrap.addEventListener('mousemove', e=>{
    const r = wrap.getBoundingClientRect();
    wrap.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    wrap.style.setProperty('--my', (e.clientY - r.top)  + 'px');
  });
  wrap.addEventListener('mouseleave', ()=>{
    wrap.style.setProperty('--mx', '50%');
    wrap.style.setProperty('--my', '50%');
  });
});

/* ═══════════════════════════
   Chart card entrance animation
   Cards animate in as they enter viewport
═══════════════════════════ */
(function initCardAnimations(){
  const discPage = document.getElementById('page-discourse');
  if(!discPage) return;
  const cardObs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('dc-card-in');
        cardObs.unobserve(e.target);
      }
    });
  },{root:discPage, threshold:0.08, rootMargin:'0px 0px -30px 0px'});

  // Observe standalone chart cards (not inside three-col or two-col)
  discPage.querySelectorAll('.dc-chart-card:not(.dc-three-col .dc-chart-card):not(.dc-two-col .dc-chart-card)').forEach(card=>{
    cardObs.observe(card);
  });
})();

/* Fix 4: when entering discourse via nav, also land at dc-nav.
   The tab-click handler already calls scrollToNav().
   For the initial page entry from showPage, we handle it in
   the origShowPage wrapper above — discourse page starts at nav. */

})();
