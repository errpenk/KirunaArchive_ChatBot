  /* ── Helpers ── */
  /* Shared IntersectionObserver-based bar-row reveal helper */
  function _obsRevealBars(container){
    const obs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        container.querySelectorAll('.dc-rank-row').forEach(r=>{ r.style.opacity='1'; r.style.transform='translateX(0)'; });
        container.querySelectorAll('.dc-rank-fill[data-w]').forEach(f=>{ f.style.width=f.dataset.w+'%'; });
      } else {
        container.querySelectorAll('.dc-rank-row').forEach(r=>{ r.style.opacity='0'; r.style.transform='translateX(-8px)'; });
        container.querySelectorAll('.dc-rank-fill[data-w]').forEach(f=>{ f.style.width='0%'; });
      }
    },{threshold:0.05});
    obs.observe(container);
  }

  /* Chart registry for scroll re-animation */
  const _chartRegistry = [];

  function mkChart(id, cfg){
    const el = document.getElementById(id);
    if(!el) return null;

    /* Capture chart type for override-based animation config */
    const chartType = cfg.type || 'bar';

    /* Start chart hidden — animate on scroll entry */
    if(!cfg.options) cfg.options = {};
    cfg.options.animation = false;

    const chart = new Chart(el, cfg);

    /* Build animation config based on type */
    function getAnimCfg(){
      if(chartType === 'doughnut' || chartType === 'pie'){
        return {animateRotate:true, animateScale:true, duration:850, easing:'easeOutExpo'};
      }
      if(chartType === 'line'){
        return {duration:700, easing:'easeOutCubic'};
      }
      return {duration:750, easing:'easeOutQuart'};
    }

    /* Observe for viewport entry — animate on enter, reset on exit */
    let _visible = false;
    const chartObs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting && !_visible){
          _visible = true;
          chart.options.animation = getAnimCfg();
          chart.reset();
          chart.update('active');
        } else if(!e.isIntersecting){
          _visible = false;
          /* Reset silently so re-entry re-animates */
          chart.options.animation = false;
          chart.reset();
          chart.update('none');
        }
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -24px 0px'});

    const wrap = el.closest('.dc-chart-canvas') || el.parentElement;
    if(wrap) chartObs.observe(wrap);
    else chartObs.observe(el);

    _chartRegistry.push({chart, obs: chartObs});
    if(!window._discourseChartsResizeBound){
      window._discourseChartsResizeBound = true;
      const resizeCharts = ()=>{
        _chartRegistry.forEach(({chart: chartInstance})=>{
          try{
            chartInstance.resize();
            chartInstance.update('none');
          }catch(e){}
        });
      };
      window._resizeDiscourseCharts = resizeCharts;
      window.addEventListener('resize', ()=>requestAnimationFrame(resizeCharts), {passive:true});
      window.addEventListener('orientationchange', ()=>setTimeout(resizeCharts, 120), {passive:true});
    }
    /* Register for lightbox re-render */
    if(el.id && window._registerChartForLightbox){
      window._registerChartForLightbox(el.id, chart);
    }
    return chart;
  }

  /* ── Radial Spoke — pos/neg keyword SVG with entrance animation ── */
  function normalizeInlineSpokeScale(svg){
    if(!svg) return;
    try{
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      svg.querySelectorAll('line,circle,text,path,rect,ellipse,polyline,polygon').forEach(node=>{
        if(typeof node.getBBox !== 'function') return;
        const box = node.getBBox();
        if(!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;
        if(box.width===0 && box.height===0) return;
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });
      if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      const contentSize = Math.max(maxX - minX, maxY - minY);
      if(!Number.isFinite(contentSize) || contentSize <= 0) return;
      const scale = Math.max(0.96, Math.min(1.16, 332 / contentSize));
      svg.style.transformOrigin = '50% 50%';
      svg.style.transform = Math.abs(scale - 1) > 0.02 ? `scale(${scale.toFixed(3)})` : 'none';
    }catch(e){}
  }

  function radialSpoke(containerId, items, color){
    const el = document.getElementById(containerId);
    if(!el) return;
    const data = items.slice(0, 12);
    if(!data.length) return;
    const max  = data[0].c;

    /* Fixed dimensions — identical for every spoke chart */
    const W = 420, H = 420, cx = 210, cy = 210;
    const innerR = 36, maxR = 158;
    const DOT_R   = 6.5;
    const BADGE_R = 11;

    const sorted = [...data].sort((a,b)=>b.c-a.c);
    const n = sorted.length;

    let spokes = '', labels = '';
    sorted.forEach((item, i)=>{
      const ang = (i/n)*Math.PI*2 - Math.PI/2;
      const t   = item.c / max;
      const r   = innerR + t*(maxR - innerR);
      const x2  = cx + Math.cos(ang)*r;
      const y2  = cy + Math.sin(ang)*r;
      const lR  = r + DOT_R + 16;
      const lx  = cx + Math.cos(ang)*lR;
      const ly  = cy + Math.sin(ang)*lR;
      const anchor = Math.cos(ang) > 0.15 ? 'start' : Math.cos(ang) < -0.15 ? 'end' : 'middle';
      const sw  = (0.8 + t*2.2).toFixed(1);
      const op  = (0.32 + t*0.68).toFixed(2);
      const bR  = innerR + t*(maxR-innerR)*0.52;
      const bx  = cx + Math.cos(ang)*bR;
      const by  = cy + Math.sin(ang)*bR;
      // Stagger delay per spoke (ms → s)
      const delay = (i * 55).toFixed(0);
      const dur = (320 + t * 180).toFixed(0);

      // Spoke line — animates from center outward using stroke-dashoffset
      const lineLen = Math.hypot(x2-cx, y2-cy).toFixed(1);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
        stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" stroke-linecap="round"
        stroke-dasharray="${lineLen}" stroke-dashoffset="${lineLen}"
        class="spoke-line" data-delay="${delay}" data-dur="${dur}"/>`;

      // End dot — fades in with spoke
      spokes += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${DOT_R}"
        fill="${color}" opacity="0"
        class="spoke-dot" data-delay="${delay}" data-op="${op}"/>`;

      // Count badge — scales in
      spokes += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${BADGE_R}"
        fill="white" stroke="${color}" stroke-width="1.2" stroke-opacity="${(+op*0.65).toFixed(2)}"
        opacity="0" class="spoke-badge" data-delay="${(+delay+100).toFixed(0)}" data-op="${op}"/>`;
      spokes += `<text x="${bx.toFixed(1)}" y="${(by+4).toFixed(1)}"
        font-size="9.5" font-family="-apple-system,monospace" text-anchor="middle"
        fill="${color}" opacity="0"
        class="spoke-badge" data-delay="${(+delay+100).toFixed(0)}" data-op="${Math.min(1,+op+0.2).toFixed(2)}">${item.c}</text>`;

      // Label text — fades in last
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}"
        font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        text-anchor="${anchor}" dominant-baseline="middle"
        fill="#5a6270" opacity="0"
        class="spoke-label" data-delay="${(+delay+180).toFixed(0)}" data-op="${Math.min(1,+op+0.15).toFixed(2)}">${item.w}</text>`;
    });

    const ring = `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="3 3"/>`;
    el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block">${ring}${spokes}${labels}</svg>`;
    const svg = el.querySelector('svg');
    if(!svg) return;

    requestAnimationFrame(()=>{
      normalizeInlineSpokeScale(svg);
    });

    // Animate on viewport entry using IntersectionObserver
    let _spokeAnimated = false;
    function animateSpoke(){
      if(_spokeAnimated) return;
      _spokeAnimated = true;
      // Spoke lines — draw from center
      svg.querySelectorAll('.spoke-line').forEach(line=>{
        const delay = +line.dataset.delay;
        const dur   = +line.dataset.dur;
        setTimeout(()=>{
          line.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.22,1,.36,1)`;
          line.style.strokeDashoffset = '0';
        }, delay);
      });
      // Dots / badges / labels — fade in
      svg.querySelectorAll('.spoke-dot, .spoke-badge, .spoke-label').forEach(el2=>{
        const delay = +el2.dataset.delay;
        const op = el2.dataset.op;
        setTimeout(()=>{
          el2.style.transition = 'opacity 280ms ease';
          el2.setAttribute('opacity', op);
        }, delay);
      });
    }
    const spokeObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        animateSpoke();
      }
    },{threshold:0.1});
    spokeObs.observe(el);
  }

  /* ── Stacked Pills — top global keywords with cascade animation ── */
  function stackedPills(containerId, items, color){
    const el = document.getElementById(containerId);
    if(!el) return;
    const list = items.slice(0, 25);
    const max  = list[0].c;
    el.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px 4px;align-items:center;padding:4px 0';
    el.innerHTML = list.map((item, idx)=>{
      const t   = item.c / max;
      const h   = Math.round(20 + t*18);
      const px  = Math.round(9  + t*9);
      const fs  = Math.round(10 + t*4);
      const op  = (0.22 + t*0.78).toFixed(2);
      const br  = Math.round(h/2);
      return `<span title="${item.w}: ${item.c}"
        style="display:inline-flex;align-items:center;gap:4px;height:${h}px;
               padding:0 ${px}px;border-radius:${br}px;
               background:${color};opacity:0;cursor:default;
               transform:translateY(8px) scale(.92);
               transition:opacity .22s ease,transform .22s cubic-bezier(.4,0,.2,1);"
        data-op="${op}" data-delay="${idx * 22}"
        onmouseover="this.style.opacity=1;this.style.transform='scale(1)'"
        onmouseout="this.style.opacity=this.dataset.op;this.style.transform='scale(1)'">
        <span style="font-size:${fs}px;color:#fff;font-weight:500;letter-spacing:-.01em;line-height:1;opacity:1">${item.w}</span>
        <span style="font-size:8px;color:#fff;font-family:var(--sans);line-height:1;opacity:.78">${item.c}</span>
      </span>`;
    }).join('');

    // Animate pills on viewport entry — reset on exit so re-entry re-animates
    function animatePills(){
      el.querySelectorAll('span[data-delay]').forEach(pill=>{
        const delay = +pill.dataset.delay;
        const op = pill.dataset.op;
        setTimeout(()=>{
          pill.style.opacity = op;
          pill.style.transform = 'translateY(0) scale(1)';
        }, delay);
      });
    }
    function resetPills(){
      el.querySelectorAll('span[data-delay]').forEach(pill=>{
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(8px) scale(.92)';
      });
    }
    const pillObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){ animatePills(); }
      else { resetPills(); }
    },{threshold:0.05});
    pillObs.observe(el);
  }

  function kwCloud(wrapId, tabsId, kwData, defaultKey, accentColor){
    const wrap = document.getElementById(wrapId);
    const tabsEl = document.getElementById(tabsId);
    if(!wrap || !tabsEl) return;
    const col = accentColor || '#1c1c1e';

    function render(key){
      const words = (kwData[key] || []).slice(0, 22);
      if(!words.length){ wrap.innerHTML=''; return; }
      const max = words[0].c;
      const top = words.slice(0, 6);
      const rest = words.slice(6);

      /* ── Top-6 bubbles — start invisible, pop in on scroll ── */
      let html = '<div class="dc-wf-bubbles">';
      top.forEach((item, bi)=>{
        const t = item.c / max;
        const sz = Math.round(56 + t * 62);   /* smaller range: 56–118px so 6 fit in one row */
        const fs = Math.max(11, Math.round(sz * 0.22));
        const alpha = (0.28 + t * 0.72).toFixed(2);
        const wordW = Math.max(sz + 4, 64);
        html += `<div class="dc-wf-bubble-item" title="${item.w}: ${item.c} mentions"
          style="opacity:0;transform:translateY(12px) scale(.85);transition:opacity .38s cubic-bezier(.4,0,.2,1) ${bi*60}ms,transform .38s cubic-bezier(.4,0,.2,1) ${bi*60}ms"
          data-bubble-delay="${bi*60}" data-bubble-alpha="${alpha}">
          <div class="dc-wf-bubble" style="width:${sz}px;height:${sz}px;background:${col};opacity:${alpha};">
            <span class="dc-wf-bubble-count" style="font-size:${fs}px;">${item.c}</span>
          </div>
          <span class="dc-wf-bubble-word" style="max-width:${wordW}px;font-size:11px;">${item.w}</span>
        </div>`;
      });
      html += '</div>';

      /* ── Divider + rest bars ── */
      if(rest.length){
        const multiCls = rest.length > 5 ? 'dc-wf-rows-wrap dc-wf-multi' : 'dc-wf-rows-wrap';
        html += '<div class="dc-wf-divider"></div>';
        html += '<div class="dc-wf-rest-label">Remaining keywords</div>';
        html += `<div class="${multiCls}">`;
        rest.forEach((item, ri)=>{
          const pct = Math.round(item.c / max * 100);
          const alpha = (0.3 + (item.c/max) * 0.7).toFixed(2);
          html += `<div class="dc-wf-row" title="${item.w}: ${item.c}"
            style="opacity:0;transform:translateX(-6px);transition:opacity .3s ease ${(top.length*60)+ri*20}ms,transform .3s cubic-bezier(.22,1,.36,1) ${(top.length*60)+ri*20}ms"
            data-row-delay="${(top.length*60)+ri*20}">
            <div class="dc-wf-label">${item.w}</div>
            <div class="dc-wf-track">
              <div class="dc-wf-fill" style="width:0%;background:${col};opacity:${alpha};transition:width .55s cubic-bezier(.22,1,.36,1) ${(top.length*60)+80+ri*20}ms;" data-w="${pct}"></div>
            </div>
            <span class="dc-wf-count">${item.c}</span>
          </div>`;
        });
        html += '</div>';
      }

      wrap.innerHTML = html;

      /* Animate on viewport entry — fire once, then unobserve */
      function _triggerKwAnim(){
        wrap.querySelectorAll('.dc-wf-bubble-item[data-bubble-delay]').forEach(el=>{
          el.style.opacity = el.dataset.bubbleAlpha;
          el.style.transform = 'translateY(0) scale(1)';
        });
        wrap.querySelectorAll('.dc-wf-row[data-row-delay]').forEach(el=>{
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        });
        wrap.querySelectorAll('.dc-wf-fill[data-w]').forEach(el2=>{
          el2.style.width = el2.dataset.w + '%';
        });
      }
      const kwObs = new IntersectionObserver(entries=>{
        if(entries[0].isIntersecting){
          _triggerKwAnim();
          kwObs.unobserve(wrap);
        }
      },{threshold:0.05});
      kwObs.observe(wrap);
    }

    /* Build tabs */
    Object.keys(kwData).forEach(key=>{
      const btn = document.createElement('button');
      btn.className = 'dc-kw-tab' + (key === defaultKey ? ' on' : '');
      btn.textContent = key;
      btn.dataset.key = key;
      btn.onclick = ()=>{
        tabsEl.querySelectorAll('.dc-kw-tab').forEach(t=> t.classList.remove('on'));
        btn.classList.add('on');
        // Smooth crossfade: fade out → render → fade in
        wrap.style.transition = 'opacity .18s ease';
        wrap.style.opacity = '0';
        setTimeout(()=>{
          render(key);
          wrap.style.opacity = '1';
          setTimeout(()=>{ wrap.style.transition = ''; }, 200);
        }, 180);
      };
      tabsEl.appendChild(btn);
    });
    render(defaultKey);
  }
