function buildHTL(){
  const cont=document.getElementById('htl-nodes');
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const nd=document.createElement('div');
    nd.className='htl-node'+(ev.featured?' featured':'')+(i===0?' htl-first':'');
    nd.innerHTML=
      (above?`<div class="htl-above"><div class="htl-name">${ev.title}</div><div class="htl-yr">${ev.year}</div></div>`:'')
      +`<div class="htl-dot" style="background:${CC[ev.cat]}"></div>`
      +(!above?`<div class="htl-below"><div class="htl-name">${ev.title}</div><div class="htl-yr">${ev.year}</div></div>`:'');
    nd.addEventListener('click',()=>openTimeline2View('overview', ev.year, 'home', ev.id));
    cont.appendChild(nd);
  });
}

function buildCards(){
  const g=document.getElementById('cards-grid');
  EVS.filter(e=>e.featured).forEach(ev=>{
    const d=document.createElement('div');d.className='card';
    d.innerHTML=`<div class="card-era"><span class="card-cat-dot" style="background:${CC[ev.cat]}"></span>${CL[ev.cat]}</div><div class="card-yr">${ev.year}</div><div class="card-title">${ev.title}</div><div class="card-desc">${ev.desc}</div><div class="card-arr">→</div>`;
    d.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});
    g.appendChild(d);
  });
}

let _photosOn=true;
function buildCombinedTimeline(){
  const body=document.getElementById('dtl-body');
  if(body.dataset.built)return;
  body.dataset.built='1';
  const stage=document.createElement('div');
  stage.className='dtl-stage';
  const cline=document.createElement('div');
  cline.className='dtl-center-line';
  stage.appendChild(cline);
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const col=document.createElement('div');
    col.className='dtl-col';
    const conn=document.createElement('div');
    conn.className='dtl-connector';
    conn.style.cssText=above?'bottom:50%;top:0;':'top:50%;bottom:0;';
    const dot=document.createElement('div');
    dot.className='dtl-dot'+(ev.featured?' featured':'');
    dot.style.background=CC[ev.cat];
    const card=document.createElement('div');
    card.className='dtl-card';
    card.style.cssText=above?'bottom:calc(50% + 20px)':'top:calc(50% + 20px)';
    card.innerHTML=`<div class="dtl-card-img"></div><div class="dtl-card-body"><div class="dtl-card-yr">${ev.year} · ${CL[ev.cat]}</div><div class="dtl-card-title">${ev.title}</div><div class="dtl-card-cat">${CL[ev.cat]}</div></div>`;

    col.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});

    col.appendChild(conn);col.appendChild(dot);col.appendChild(card);
    stage.appendChild(col);
  });
  body.appendChild(stage);
}

function buildTextTimeline(){
  const body=document.getElementById('dtl-text-body');
  if(body.dataset.built)return;
  body.dataset.built='1';
  const stage=document.createElement('div');
  stage.className='txt-stage';
  const cline=document.createElement('div');
  cline.className='txt-center-line';
  stage.appendChild(cline);
  EVS.forEach((ev,i)=>{
    const above=i%2===0;
    const col=document.createElement('div');
    col.className='txt-col';
    const conn=document.createElement('div');
    conn.className='txt-connector';
    conn.style.cssText=above?'bottom:50%;top:0;':'top:50%;bottom:0;';
    const dot=document.createElement('div');
    dot.className='txt-dot'+(ev.featured?' featured':'');
    dot.style.background=ev.featured?CC[ev.cat]:'var(--w)';
    dot.style.borderColor=CC[ev.cat];
    const label=document.createElement('div');
    label.className='txt-label';
    label.style.cssText=above
      ?'bottom:calc(50% + 22px);left:50%;transform:translateX(-50%);transform-origin:bottom center;'
      :'top:calc(50% + 22px);left:50%;transform:translateX(-50%);transform-origin:top center;';
    label.innerHTML=`<div class="txt-yr" style="color:${CC[ev.cat]}">${ev.year}</div><div class="txt-title">${ev.title}</div><div class="txt-cat">${CL[ev.cat]}</div>`;
    col.appendChild(conn);col.appendChild(dot);col.appendChild(label);
    col.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(ev.id),80);});
    stage.appendChild(col);
  });
  body.appendChild(stage);
}

function buildPhaseView(){
  const outer=document.getElementById('phase-outer');
  outer.innerHTML='';  // always rebuild fresh
  outer.dataset.built='1';
  const eras=[
    {key:'urban',label:'Urban Planning',range:'Design & Prescriptive Documents',color:'#2471a3'},
    {key:'mine',label:'Technical Documents',range:'Deformation Forecasts & Surveys',color:'#a93226'},
    {key:'infra',label:'Construction & Effects',range:'Material Effects & Building Works',color:'#6c3483'},
    {key:'social',label:'Informative Documents',range:'Reports, Surveys & Records',color:'#1d8348'},
  ];
  eras.forEach(era=>{
    const evs=EVS.filter(e=>e.cat===era.key);
    const block=document.createElement('div');
    block.className='phase-era-block';
    block.innerHTML=`<div class="peb-head"><div class="peb-info"><div class="peb-era-name">${era.label}</div><div class="peb-era-range">${era.range} · ${evs.length} events archived</div></div></div><div class="peb-events" style="gap:1px">${evs.map((ev,ei)=>`<div class="peb-event" data-id="${ev.id}" style="transition-delay:${.15+ei*.06}s"><div class="peb-evt-dot" style="background:${CC[ev.cat]}"></div><div><div class="peb-evt-yr">${ev.year}</div><div class="peb-evt-title">${ev.title}${ev.featured?'<span class="peb-evt-feat">★</span>':''}</div></div></div>`).join('')}</div>`;
    block.querySelectorAll('.peb-event').forEach(r=>r.addEventListener('click',()=>{showPage('archive',activePage);setTimeout(()=>selectEvent(+r.getAttribute('data-id')),80);}));
    // Store fill-width as CSS var for animation
    outer.appendChild(block);
  });
}

function animatePhaseBlocks(){
  const blocks=document.querySelectorAll('.phase-era-block');
  if(!blocks.length)return;
  // Reset then stagger in
  blocks.forEach(b=>b.classList.remove('peb-in'));
  // Small delay per block for stagger
  blocks.forEach((b,i)=>{
    setTimeout(()=>{
      b.classList.add('peb-in');
    }, 60 + i*90);
  });
}

function renderSidebarTL(){
  const pane=document.getElementById('pane-tl');
  const filtered=eraFilter==='all'?EVS:EVS.filter(e=>e.cat===eraFilter);
  let html='';
  ['urban','mine','infra','social'].forEach(era=>{
    const evs=filtered.filter(e=>e.cat===era);if(!evs.length)return;
    html+=`<div class="era-head">${EL[era]}</div>`;
    evs.forEach(ev=>{html+=`<div class="tl-row${activeId===ev.id?' on':''}" data-id="${ev.id}"><div class="tl-dot-s" style="background:${CC[ev.cat]}"></div><div><div class="tl-row-yr">${ev.year}</div><div class="tl-row-title">${ev.title}${ev.featured?`<span class="tl-feat">★</span>`:''}</div><div class="tl-row-cat">${CL[ev.cat]}</div></div></div>`;});
  });
  pane.innerHTML=html;
  // Suppress calRowSelectIn on initial render for already-selected rows
  pane.querySelectorAll('.tl-row.on').forEach(r=>r.classList.add('no-select-anim'));
  requestAnimationFrame(()=>{ pane.querySelectorAll('.tl-row.no-select-anim').forEach(r=>r.classList.remove('no-select-anim')); });
  pane.querySelectorAll('.tl-row').forEach(r=>r.addEventListener('click',e=>{e.currentTarget.blur();selectEvent(+r.getAttribute('data-id'));}));
  // Stable hover: use mouseenter/mouseleave on the pane to avoid flicker from child elements
  pane.onmouseover = e=>{
    const row=e.target.closest('.tl-row');
    if(!row) return;
    pane.querySelectorAll('.tl-row.hovered').forEach(r=>r!==row&&r.classList.remove('hovered'));
    row.classList.add('hovered');
  };
  pane.onmouseleave = ()=>{
    pane.querySelectorAll('.tl-row.hovered').forEach(r=>r.classList.remove('hovered'));
  };
  animateStaggerIn(pane.querySelectorAll('.era-head,.tl-row'),{axis:'x',distance:-12,step:6,duration:180});
  const on=pane.querySelector('.tl-row.on');if(on)on.scrollIntoView({block:'nearest',behavior:'smooth'});
  renderMapTimelinePreview();
  updateMapTimelinePreviewSelection(activeId,{immediate:true});
  scheduleResponsiveCollisionHides();
}

function syncSidebarTLSelection(opts={}){
  const pane=document.getElementById('pane-tl');
  if(!pane) return false;
  const rows=pane.querySelectorAll('.tl-row');
  if(!rows.length) return false;

  const activeRow = activeId===null ? null : pane.querySelector(`.tl-row[data-id="${activeId}"]`);
  if(activeId!==null && !activeRow) return false;

  rows.forEach(row=>row.classList.toggle('on', row===activeRow));
  if(activeRow && opts.scroll !== false){
    activeRow.scrollIntoView({block:'nearest',behavior:opts.behavior||'smooth'});
  }
  return true;
}
