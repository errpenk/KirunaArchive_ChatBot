  /* ════════════════
     PANEL 1 — X POSTS
  ════════════════ */
  mkChart('xp-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[38,103,12],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(c=>` ${c.label}: ${c.raw} (${(c.raw/153*100).toFixed(1)}%)`)
  });
  mkChart('xp-eng-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[8.0,42.5,91.2],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  mkChart('xp-year-bar',{type:'bar',
    data:{labels:['2018','2019','2020','2021','2022','2023','2024','2025'],
      datasets:[
        {label:'Positive', data:[3,4,4,1,1,1,1,21],  backgroundColor:cPos, borderRadius:4, borderWidth:0, borderSkipped:false},
        {label:'Neutral',  data:[8,6,42,3,3,2,1,37],  backgroundColor:cNeu, borderRadius:0, borderWidth:0},
        {label:'Negative', data:[0,0,4,0,0,0,0,8],   backgroundColor:cNeg, borderRadius:0, borderWidth:0}
      ]},
    options: stackedBarOpts()
  });
  const xpKw={
    'All':[{w:'kiruna',c:171},{w:'relocation',c:125},{w:'sweden',c:74},{w:'town',c:71},{w:'church',c:58},{w:'city',c:52},{w:'mining',c:49},{w:'moving',c:41},{w:'swedish',c:34},{w:'moved',c:27},{w:'mine',c:27},{w:'world',c:20},{w:'arctic',c:20},{w:'iron',c:18},{w:'miles',c:17},{w:'entire',c:16},{w:'ore',c:16},{w:'project',c:16},{w:'wooden',c:12},{w:'historic',c:12}],
    'Positive':[{w:'kiruna',c:45},{w:'relocation',c:27},{w:'church',c:26},{w:'sweden',c:26},{w:'town',c:18},{w:'historic',c:12},{w:'moved',c:10},{w:'city',c:10},{w:'mining',c:9},{w:'arctic',c:8},{w:'landmark',c:7},{w:'iron',c:7},{w:'safely',c:6},{w:'feat',c:5},{w:'incredible',c:4}],
    'Negative':[{w:'city',c:15},{w:'kiruna',c:13},{w:'relocation',c:12},{w:'sweden',c:11},{w:'entire',c:9},{w:'rare',c:7},{w:'earths',c:7},{w:'mining',c:6},{w:'demolished',c:5},{w:'dependency',c:4},{w:'forced',c:4},{w:'displaced',c:4},{w:'crisis',c:3},{w:'threat',c:3},{w:'losing',c:3}],
    'Neutral':[{w:'kiruna',c:113},{w:'relocation',c:86},{w:'town',c:53},{w:'mining',c:40},{w:'sweden',c:37},{w:'moving',c:34},{w:'church',c:32},{w:'swedish',c:28},{w:'city',c:27},{w:'iron',c:14},{w:'ore',c:13},{w:'arctic',c:12},{w:'project',c:11},{w:'ongoing',c:10},{w:'urban',c:9}]
  };
  kwCloud('xp-kw-cloud','xp-kw-tabs',xpKw,'All',cBrand);
  radialSpoke('xp-pos-words',[{w:'kiruna',c:45},{w:'relocation',c:27},{w:'church',c:26},{w:'sweden',c:26},{w:'town',c:18},{w:'historic',c:12},{w:'moved',c:10},{w:'city',c:10},{w:'mining',c:9},{w:'arctic',c:8},{w:'landmark',c:7},{w:'iron',c:7},{w:'safely',c:6},{w:'feat',c:5},{w:'incredible',c:4}],cPos);
  radialSpoke('xp-neg-words',[{w:'city',c:15},{w:'kiruna',c:13},{w:'relocation',c:12},{w:'sweden',c:11},{w:'entire',c:9},{w:'rare',c:7},{w:'earths',c:7},{w:'mining',c:6},{w:'demolished',c:5},{w:'dependency',c:4},{w:'forced',c:4},{w:'displaced',c:4},{w:'crisis',c:3},{w:'threat',c:3},{w:'losing',c:3}],cNeg);
  stackedPills('xp-top-bars',[{w:'kiruna',c:171},{w:'relocation',c:125},{w:'sweden',c:74},{w:'town',c:71},{w:'church',c:58},{w:'city',c:52},{w:'mining',c:49},{w:'moving',c:41},{w:'swedish',c:34},{w:'urban',c:20},{w:'moved',c:27},{w:'mine',c:27},{w:'world',c:20},{w:'arctic',c:20},{w:'iron',c:18},{w:'miles',c:17},{w:'entire',c:16},{w:'ore',c:16},{w:'project',c:16},{w:'landmark',c:10},{w:'wooden',c:12},{w:'historic',c:12},{w:'rare',c:9},{w:'earths',c:9},{w:'ongoing',c:13}],cBrand);

  /* ════════════════
     PANEL 2 — X REPLIES
  ════════════════ */
  mkChart('xr-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[139,576,18],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(c=>` ${c.label}: ${c.raw} (${(c.raw/733*100).toFixed(1)}%)`)
  });
  mkChart('xr-likes-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[13.5,43.5,4.5],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  mkChart('xr-year-line',{type:'line',
    data:{labels:['2019','2020','2021','2022','2023','2024','2025'],
      datasets:[
        {label:'Positive', data:[19,3,2,0,33,28,46],  borderColor:cPos, backgroundColor:cPosA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cPos, borderWidth:2},
        {label:'Neutral',  data:[42,20,16,63,51,23,340],borderColor:cNeu, backgroundColor:cNeuA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cNeu, borderWidth:2},
        {label:'Negative', data:[5,1,1,0,1,0,9],      borderColor:cNeg, backgroundColor:cNegA, tension:0.38, fill:true, pointRadius:3, pointBackgroundColor:cNeg, borderWidth:2}
      ]},
    options: lineOpts()
  });
  const xrTagCounts=[{t:'Question_Curiosity',n:153},{t:'Religious_Discussion',n:101},{t:'Mining_Mineral',n:79},{t:'Comparison',n:67},{t:'Positive_Reaction',n:48},{t:'Engineering_Reaction',n:44},{t:'Cultural_Heritage',n:20},{t:'Kiruna_Relocation',n:20},{t:'Cost_Question',n:20},{t:'Engineering_Move',n:19},{t:'Sami_Indigenous',n:17},{t:'Distance_Location',n:15}];
  mkChart('xr-tag-bar',{type:'bar',
    data:{labels:xrTagCounts.map(d=>d.t),datasets:[{
      data:xrTagCounts.map(d=>d.n),
      backgroundColor: xrTagCounts.map((_,i)=>{
        const t = i/xrTagCounts.length;
        return `rgba(93,122,150,${(0.9-t*0.45).toFixed(2)})`;
      }),
      borderRadius:4, borderWidth:0
    }]},
    options: hBarOpts()
  });
  const xrTagSent=[
    {t:'Positive_Reaction',total:54,pos:52,neg:0,neu:2},
    {t:'Engineering_Reaction',total:44,pos:14,neg:2,neu:28},
    {t:'Engineering_Move',total:19,pos:6,neg:2,neu:11},
    {t:'Cultural_Heritage',total:20,pos:3,neg:0,neu:17},
    {t:'Mining_Mineral',total:79,pos:10,neg:2,neu:67},
    {t:'Religious_Discussion',total:101,pos:7,neg:3,neu:91},
    {t:'Comparison',total:67,pos:14,neg:1,neu:52},
    {t:'Question_Curiosity',total:153,pos:2,neg:1,neu:150},
    {t:'Sami_Indigenous',total:17,pos:1,neg:2,neu:14},
    {t:'Distance_Location',total:15,pos:6,neg:1,neu:8}
  ];
  const xrTbody=document.querySelector('#xr-tag-sent-table tbody');
  if(xrTbody) xrTagSent.forEach(d=>{
    const pr=(d.pos/d.total*100).toFixed(0);
    const pw=Math.round(d.pos/d.total*54),nw=Math.round(d.neg/d.total*54),nuw=Math.round(d.neu/d.total*54);
    const col=d.pos/d.total>0.3?cPos:d.pos/d.total>0.1?cNeu:'#909098';
    xrTbody.innerHTML+=`<tr><td style="font-weight:500">${d.t}</td><td>${d.total}</td><td style="color:${cPos}">${d.pos}</td><td style="color:${cNeg}">${d.neg}</td><td style="color:${col};font-weight:600">${pr}%</td><td><div style="display:flex;gap:1px;height:7px;width:54px"><div style="width:${pw}px;height:100%;background:${cPos}"></div><div style="width:${nuw}px;height:100%;background:${cNeu}"></div><div style="width:${nw}px;height:100%;background:${cNeg}"></div></div></td></tr>`;
  });
  const xrViewTag=[{t:'Kiruna_Tourism',v:708},{t:'Church_Building',v:486},{t:'Sweden_Dutch',v:478},{t:'Sweden_Context',v:433},{t:'Move_Reaction',v:341},{t:'Distance_Location',v:306},{t:'Cost_Question',v:265},{t:'Engineering_Technical',v:261},{t:'Cultural_Heritage',v:242},{t:'Engineering_Move',v:237},{t:'Heritage_Value',v:233},{t:'Kiruna_Relocation',v:217}];
  const xrVtEl=document.getElementById('xr-view-tag');
  if(xrVtEl){
    const maxV = xrViewTag[0].v;
    /* Lollipop chart — connector line + dot end + value label */
    xrVtEl.style.cssText='display:flex;flex-direction:column;gap:0;padding:2px 0';
    xrVtEl.innerHTML = xrViewTag.map((item,i)=>{
      const pct = (item.v / maxV * 100).toFixed(1);
      const alpha = (0.32 + (item.v/maxV)*0.68).toFixed(2);
      const delay = i * 38;
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:5px 0;cursor:default;opacity:0;transform:translateX(-10px);
        transition:opacity .32s ease ${delay}ms,transform .32s cubic-bezier(.22,1,.36,1) ${delay}ms"
        class="xr-vt-row">
        <span style="width:16px;font-size:9px;color:#b8c0c8;text-align:right;font-family:var(--sans);flex-shrink:0">${i+1}</span>
        <span style="width:138px;font-size:10.5px;color:#3a4250;font-weight:500;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${item.t}">${item.t.replace(/_/g,' ')}</span>
        <div style="flex:1;position:relative;height:2px;background:#f0f1f3;border-radius:1px">
          <div style="position:absolute;left:0;top:0;height:2px;border-radius:1px;
            background:rgba(93,122,150,${alpha});width:0;
            transition:width .7s cubic-bezier(.22,1,.36,1) ${delay+80}ms"
            data-w="${pct}" class="xr-vt-fill"></div>
          <div style="position:absolute;top:50%;transform:translateY(-50%);
            width:7px;height:7px;border-radius:50%;
            background:rgba(93,122,150,${alpha});border:1.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.12);
            left:0;transition:left .7s cubic-bezier(.22,1,.36,1) ${delay+80}ms"
            class="xr-vt-dot" data-w="${pct}"></div>
        </div>
        <span style="width:36px;font-size:9.5px;color:#96a0aa;text-align:right;font-family:var(--sans);flex-shrink:0">${item.v}</span>
      </div>`;
    }).join('');

    /* Animate on viewport entry — reset on exit so re-entry re-animates */
    const vtObs = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){
        xrVtEl.querySelectorAll('.xr-vt-row').forEach(r=>{
          r.style.opacity='1'; r.style.transform='translateX(0)';
        });
        xrVtEl.querySelectorAll('.xr-vt-fill').forEach(f=>{
          f.style.width = f.dataset.w + '%';
        });
        xrVtEl.querySelectorAll('.xr-vt-dot').forEach(d=>{
          d.style.left = 'calc('+d.dataset.w+'% - 3.5px)';
        });
      } else {
        xrVtEl.querySelectorAll('.xr-vt-row').forEach(r=>{
          r.style.opacity='0'; r.style.transform='translateX(-8px)';
        });
        xrVtEl.querySelectorAll('.xr-vt-fill').forEach(f=>{ f.style.width='0%'; });
        xrVtEl.querySelectorAll('.xr-vt-dot').forEach(d=>{ d.style.left='0%'; });
      }
    },{threshold:0.05});
    vtObs.observe(xrVtEl);
  }
  const xrKw={
    'All (English)':[{w:'kiruna',c:58},{w:'church',c:43},{w:'move',c:30},{w:'town',c:28},{w:'moving',c:28},{w:'mine',c:25},{w:'lkab',c:25},{w:'amazing',c:24},{w:'moved',c:23},{w:'sweden',c:20},{w:'old',c:19},{w:'love',c:18},{w:'beautiful',c:17},{w:'home',c:18},{w:'history',c:13},{w:'city',c:14},{w:'iron',c:12},{w:'cost',c:11},{w:'heritage',c:9},{w:'miles',c:9}],
    'Question_Curiosity':[{w:'cost',c:8},{w:'long',c:6},{w:'much',c:6},{w:'take',c:5},{w:'kiruna',c:5},{w:'church',c:5},{w:'move',c:5},{w:'mine',c:4},{w:'far',c:4},{w:'time',c:4}],
    'Religious_Discussion':[{w:'church',c:35},{w:'kiruna',c:10},{w:'moving',c:7},{w:'old',c:6},{w:'fire',c:5},{w:'god',c:5},{w:'man',c:5},{w:'moved',c:4},{w:'burn',c:4},{w:'history',c:4}],
    'Mining_Mineral':[{w:'mine',c:10},{w:'iron',c:7},{w:'lkab',c:6},{w:'ore',c:5},{w:'rare',c:5},{w:'kiruna',c:5},{w:'earth',c:5},{w:'mining',c:4},{w:'cost',c:4},{w:'town',c:3}],
    'Positive_Reaction':[{w:'amazing',c:16},{w:'beautiful',c:15},{w:'love',c:8},{w:'city',c:6},{w:'incredible',c:4},{w:'great',c:4},{w:'impressive',c:3},{w:'wow',c:3},{w:'awesome',c:3},{w:'stunning',c:2}],
    'Engineering_Reaction':[{w:'move',c:18},{w:'moving',c:11},{w:'moved',c:11},{w:'home',c:5},{w:'house',c:4},{w:'town',c:4},{w:'good',c:3},{w:'everything',c:3},{w:'away',c:4},{w:'hope',c:4}],
    'Cultural_Heritage':[{w:'history',c:11},{w:'heritage',c:8},{w:'church',c:4},{w:'historical',c:4},{w:'kiruna',c:3},{w:'social',c:3},{w:'matters',c:2},{w:'preserve',c:2},{w:'culture',c:2},{w:'main',c:2}]
  };
  kwCloud('xr-kw-cloud','xr-kw-tabs',xrKw,'All (English)',cBrand);
  radialSpoke('xr-pos-words',[{w:'amazing',c:24},{w:'love',c:18},{w:'beautiful',c:17},{w:'best',c:13},{w:'church',c:13},{w:'safe',c:13},{w:'moving',c:11},{w:'incredible',c:10},{w:'good',c:10},{w:'wow',c:9}],cPos);
  radialSpoke('xr-neg-words',[{w:'tragedy',c:3},{w:'fire',c:2},{w:'church',c:2},{w:'mine',c:2},{w:'cost',c:2},{w:'city',c:2},{w:'kiruna',c:2},{w:'move',c:2},{w:'memories',c:2},{w:'away',c:2}],cNeg);
  stackedPills('xr-top-bars',[{w:'kiruna',c:58},{w:'church',c:43},{w:'move',c:30},{w:'town',c:28},{w:'moving',c:28},{w:'mine',c:25},{w:'lkab',c:25},{w:'amazing',c:24},{w:'moved',c:23},{w:'sweden',c:20},{w:'old',c:19},{w:'love',c:18},{w:'beautiful',c:17},{w:'home',c:18},{w:'history',c:13},{w:'city',c:14},{w:'iron',c:12},{w:'cost',c:11},{w:'heritage',c:9},{w:'miles',c:9},{w:'ore',c:8},{w:'dutch',c:8},{w:'mammoet',c:7},{w:'safe',c:13},{w:'incredible',c:10}],cBrand);

  /* ════════════════
     PANEL 3 — REDDIT POSTS
  ════════════════ */
  mkChart('rp-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[14,108,9],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(c=>` ${c.label}: ${c.raw} (${(c.raw/131*100).toFixed(1)}%)`)
  });
  mkChart('rp-replies-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[12.0,54.6,54.9],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Replies')
  });
  mkChart('rp-cat-sent-bar',{type:'bar',
    data:{labels:[['City/Church','Relocation'],['Place, Photo','& Travel'],'Other/Mixed'],
      datasets:[
        {label:'Positive', data:[5,8,1],  backgroundColor:cPos, borderRadius:0, borderWidth:0},
        {label:'Neutral',  data:[58,42,8], backgroundColor:cNeu, borderRadius:0, borderWidth:0},
        {label:'Negative', data:[7,2,0],  backgroundColor:cNeg, borderRadius:0, borderWidth:0}
      ]},
    options: stackedBarOpts({xFont:{size:10}})
  });
  mkChart('rp-cat-donut',{type:'doughnut',
    data:{labels:['City/Church Relocation','Place, Photo & Travel','Other/Mixed'],datasets:[{
      data:[70,52,9],
      backgroundColor:[cBrand,'#8fa5b8','#b8a48a'],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{
        legend:{display:true,position:'bottom',labels:{boxWidth:8,boxHeight:8,borderRadius:2,font:{size:10},color:textC,padding:14,usePointStyle:true,pointStyle:'rectRounded'}},
        tooltip:{callbacks:{label:c=>` ${c.raw} posts`}}
      }}
  });
  const rpSubData=[{s:'r/europe',c:13},{s:'r/pics',c:9},{s:'r/interestingasfuck',c:9},{s:'r/sweden',c:7},{s:'r/urbanplanning',c:6},{s:'r/CityPorn',c:6},{s:'r/Damnthatsinteresting',c:6},{s:'r/environment',c:4},{s:'r/TillSverige',c:4},{s:'r/architecture',c:3}];
  const rpSubEl=document.getElementById('rp-sub-bars');
  if(rpSubEl){
    const maxS=rpSubData[0].c;
    rpSubEl.className='dc-rank-grid';
    rpSubEl.innerHTML=rpSubData.map((item,i)=>`
      <div class="dc-rank-row" style="opacity:0;transform:translateX(-8px);transition:opacity .32s ease ${i*28}ms,transform .32s cubic-bezier(.22,1,.36,1) ${i*28}ms">
        <span class="dc-rank-n">${i+1}</span>
        <span class="dc-rank-word" title="${item.s}" style="width:120px">${item.s}</span>
        <div class="dc-rank-track"><div class="dc-rank-fill" style="width:0%;background:${cReddit};opacity:${(0.35+item.c/maxS*0.65).toFixed(2)};transition:width .65s cubic-bezier(.22,1,.36,1) ${80+i*28}ms;" data-w="${Math.round(item.c/maxS*100)}"></div></div>
        <span class="dc-rank-val">${item.c}</span>
      </div>`).join('');
    _obsRevealBars(rpSubEl);
  }
  const rpKw={
    'All':[{w:'kiruna',c:99},{w:'sweden',c:86},{w:'church',c:44},{w:'town',c:41},{w:'city',c:31},{w:'mine',c:24},{w:'relocated',c:24},{w:'northern',c:23},{w:'entire',c:21},{w:'swedish',c:20},{w:'mining',c:19},{w:'building',c:16},{w:'moved',c:15},{w:'relocation',c:15},{w:'iron',c:14},{w:'miles',c:13},{w:'ore',c:13},{w:'expansion',c:12},{w:'moving',c:10},{w:'arctic',c:8}],
    'City/Church':[{w:'kiruna',c:52},{w:'church',c:38},{w:'city',c:27},{w:'moved',c:22},{w:'mine',c:20},{w:'relocated',c:18},{w:'moving',c:16},{w:'entire',c:15},{w:'mining',c:14},{w:'building',c:12}],
    'Place & Travel':[{w:'kiruna',c:39},{w:'sweden',c:36},{w:'northern',c:19},{w:'north',c:12},{w:'swedish',c:11},{w:'europe',c:10},{w:'arctic',c:8},{w:'city',c:8},{w:'town',c:7},{w:'beautiful',c:5}],
    'Positive Titles':[{w:'love',c:6},{w:'beautiful',c:5},{w:'amazing',c:4},{w:'incredible',c:3},{w:'fascinating',c:3},{w:'feat',c:3},{w:'impressive',c:2},{w:'stunning',c:2},{w:'remarkable',c:2},{w:'great',c:2}],
    'Negative Titles':[{w:'destructive',c:5},{w:'torn',c:4},{w:'hell',c:3},{w:'forced',c:3},{w:'environmentally',c:3},{w:'money',c:3},{w:'swallowed',c:2},{w:'suffer',c:2},{w:'destroyed',c:2},{w:'lose',c:2}]
  };
  kwCloud('rp-kw-cloud','rp-kw-tabs',rpKw,'All',cReddit);
  radialSpoke('rp-pos-words',[{w:'love',c:6},{w:'beautiful',c:5},{w:'amazing',c:4},{w:'incredible',c:3},{w:'fascinating',c:3},{w:'feat',c:3},{w:'impressive',c:2},{w:'stunning',c:2},{w:'remarkable',c:2}],cPos);
  radialSpoke('rp-neg-words',[{w:'destructive',c:5},{w:'torn',c:4},{w:'forced',c:3},{w:'environmentally',c:3},{w:'hell',c:3},{w:'swallowed',c:2},{w:'suffer',c:2},{w:'destroyed',c:2},{w:'lose',c:2}],cNeg);
  stackedPills('rp-top-bars',[{w:'kiruna',c:99},{w:'sweden',c:86},{w:'church',c:44},{w:'town',c:41},{w:'city',c:31},{w:'mine',c:24},{w:'relocated',c:24},{w:'northern',c:23},{w:'entire',c:21},{w:'swedish',c:20},{w:'mining',c:19},{w:'building',c:16},{w:'moved',c:15},{w:'relocation',c:15},{w:'iron',c:14},{w:'miles',c:13},{w:'ore',c:13},{w:'expansion',c:12},{w:'moving',c:10},{w:'old',c:9},{w:'relocating',c:9},{w:'arctic',c:8},{w:'ground',c:8},{w:'underneath',c:8},{w:'year',c:8}],cReddit);

  /* ════════════════
     PANEL 4 — REDDIT REPLIES
  ════════════════ */
  mkChart('rr-sent-donut',{type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{
      data:[222,469,216],
      backgroundColor:[cPos,cNeu,cNeg],
      borderWidth:3, borderColor:'#ffffff',
      hoverBorderWidth:3, hoverOffset:4
    }]},
    options: donutOpts(c=>` ${c.label}: ${c.raw} (${(c.raw/907*100).toFixed(1)}%)`)
  });
  mkChart('rr-likes-bar',{type:'bar',
    data:{labels:['Negative','Neutral','Positive'],datasets:[{
      data:[25.14,15.22,17.13],
      backgroundColor:[cNeg,cNeu,cPos],
      borderRadius:6, borderSkipped:false, borderWidth:0,
      barPercentage:0.55
    }]},
    options: vBarOpts('Avg Likes')
  });
  const rrTopicData={
    'Relocation':{total:252,pos:25,neg:145,neu:82,compound:-0.315},
    'Place name':{total:215,pos:59,neg:17,neu:139,compound:0.160},
    'Mining/Industry':{total:149,pos:22,neg:36,neu:91,compound:-0.082},
    'Climate/Nature':{total:142,pos:52,neg:25,neu:65,compound:0.111},
    'Tourism':{total:78,pos:31,neg:6,neu:41,compound:0.282},
    'Sami Culture':{total:36,pos:12,neg:3,neu:21,compound:0.250},
    'Aerospace':{total:29,pos:8,neg:6,neu:15,compound:0.073},
    'N. Sweden Life':{total:6,pos:5,neg:0,neu:1,compound:0.512}
  };
  const rrCompLabels=Object.keys(rrTopicData);
  const rrCompVals=rrCompLabels.map(k=>rrTopicData[k].compound);
  mkChart('rr-compound-bar',{type:'bar',
    data:{labels:rrCompLabels,datasets:[{
      data:rrCompVals,
      backgroundColor:rrCompVals.map(v=>v<-0.1?cNeg:v>0.15?cPos:cNeu),
      borderRadius:4, borderWidth:0
    }]},
    options:{
      ...hBarOpts(),
      scales:{
        x:{ grid:{color:gridC, drawBorder:false}, border:{display:false}, min:-0.4, max:0.6, ticks:{color:textC} },
        y:{ grid:{display:false}, ticks:{font:{size:10},color:textC} }
      }
    }
  });
  mkChart('rr-topic-bar',{type:'bar',
    data:{labels:Object.keys(rrTopicData),datasets:[{
      data:Object.values(rrTopicData).map(d=>d.total),
      backgroundColor: Object.values(rrTopicData).map((_,i,arr)=>{
        const t = i/arr.length;
        return `rgba(93,122,150,${(0.88-t*0.42).toFixed(2)})`;
      }),
      borderRadius:4, borderWidth:0
    }]},
    options: hBarOpts()
  });
  const rrTbody=document.querySelector('#rr-sent-table tbody');
  if(rrTbody) Object.entries(rrTopicData).forEach(([topic,d])=>{
    const pr=(d.pos/d.total*100).toFixed(0);
    const pw=Math.round(d.pos/d.total*54),nw=Math.round(d.neg/d.total*54),nuw=Math.round(d.neu/d.total*54);
    let tone;
    if(d.compound<-0.1)tone=`<span style="color:${cNeg};font-weight:600">−${(d.neg/d.total*100).toFixed(0)}% Neg</span>`;
    else if(d.compound>0.1)tone=`<span style="color:${cPos};font-weight:600">+${pr}% Pos</span>`;
    else tone=`<span style="color:#b0b8c0;font-weight:600">Neutral</span>`;
    rrTbody.innerHTML+=`<tr><td style="font-weight:500">${topic}</td><td>${d.total}</td><td style="color:${cPos}">${d.pos}</td><td style="color:${cNeg}">${d.neg}</td><td>${tone}</td><td><div style="display:flex;gap:1px;height:6px;width:54px;border-radius:3px;overflow:hidden"><div style="width:${pw}px;height:100%;background:${cPos}"></div><div style="width:${nuw}px;height:100%;background:${cNeu}"></div><div style="width:${nw}px;height:100%;background:${cNeg}"></div></div></td></tr>`;
  });
  const rrKw={
    'All Topics':[{w:'kiruna',c:164},{w:'mine',c:156},{w:'sweden',c:154},{w:'town',c:127},{w:'church',c:120},{w:'city',c:119},{w:'mining',c:100},{w:'move',c:93},{w:'people',c:82},{w:'moving',c:81},{w:'moved',c:77},{w:'north',c:68},{w:'northern',c:55},{w:'swedish',c:55},{w:'winter',c:50},{w:'ore',c:48},{w:'ice',c:48},{w:'lithium',c:48},{w:'iron',c:47},{w:'reindeer',c:35}],
    'Relocation':[{w:'church',c:101},{w:'move',c:70},{w:'moved',c:67},{w:'moving',c:63},{w:'city',c:63},{w:'town',c:49},{w:'mine',c:30},{w:'buildings',c:24},{w:'house',c:20},{w:'forced',c:18}],
    'Mining/Industry':[{w:'mine',c:111},{w:'mining',c:57},{w:'ore',c:45},{w:'iron',c:39},{w:'town',c:39},{w:'city',c:29},{w:'mines',c:21},{w:'rare',c:18},{w:'company',c:17},{w:'whole',c:14}],
    'Climate/Nature':[{w:'lithium',c:33},{w:'winter',c:27},{w:'brine',c:27},{w:'snow',c:22},{w:'summer',c:19},{w:'sweden',c:19},{w:'water',c:17},{w:'mining',c:17},{w:'ice',c:16},{w:'mosquitos',c:16}],
    'Tourism':[{w:'northern',c:22},{w:'lights',c:21},{w:'went',c:14},{w:'visited',c:13},{w:'ice',c:13},{w:'people',c:12},{w:'sun',c:11},{w:'trip',c:10},{w:'tourists',c:10},{w:'winter',c:9}],
    'Sami Culture':[{w:'reindeer',c:29},{w:'moose',c:16},{w:'meat',c:9},{w:'road',c:8},{w:'keep',c:8},{w:'finnish',c:7},{w:'good',c:6},{w:'car',c:6},{w:'sami',c:5},{w:'swedes',c:5}],
    'Aerospace':[{w:'launch',c:18},{w:'rocket',c:15},{w:'space',c:9},{w:'student',c:6},{w:'kiruna',c:6},{w:'time',c:6},{w:'sweden',c:6},{w:'little',c:6},{w:'western',c:6},{w:'expensive',c:6}],
    'Positive':[{w:'good',c:30},{w:'beautiful',c:30},{w:'nice',c:23},{w:'place',c:23},{w:'summer',c:21},{w:'winter',c:21},{w:'went',c:20},{w:'northern',c:20},{w:'lights',c:18},{w:'visit',c:15}],
    'Negative':[{w:'move',c:85},{w:'moving',c:72},{w:'moved',c:64},{w:'forced',c:38},{w:'lithium',c:32},{w:'brine',c:27},{w:'destroy',c:22},{w:'process',c:17},{w:'extraction',c:11},{w:'bad',c:10}],
    'Neutral':[{w:'swedish',c:48},{w:'years',c:48},{w:'north',c:44},{w:'ore',c:43},{w:'iron',c:38},{w:'buildings',c:35},{w:'new',c:33},{w:'plan',c:28},{w:'project',c:25},{w:'company',c:22}]
  };
  kwCloud('rr-kw-cloud','rr-kw-tabs',rrKw,'All Topics',cReddit);
  radialSpoke('rr-pos-words',rrKw['Positive'],cPos);
  radialSpoke('rr-neg-words',rrKw['Negative'],cNeg);
  radialSpoke('rr-neu-words',rrKw['Neutral'],cNeu);
  stackedPills('rr-top-bars',[{w:'kiruna',c:164},{w:'mine',c:156},{w:'sweden',c:154},{w:'town',c:127},{w:'church',c:120},{w:'city',c:119},{w:'mining',c:100},{w:'move',c:93},{w:'people',c:82},{w:'moving',c:81},{w:'moved',c:77},{w:'north',c:68},{w:'years',c:63},{w:'northern',c:55},{w:'swedish',c:55},{w:'live',c:41},{w:'winter',c:50},{w:'ore',c:48},{w:'ice',c:48},{w:'lithium',c:48},{w:'iron',c:47},{w:'buildings',c:36},{w:'train',c:40},{w:'lights',c:36},{w:'reindeer',c:35}],cReddit);

  /* Boot scroll-reveal for the first panel */
  setTimeout(initPageObserver,120);
  setTimeout(scheduleDataAside,120);
}
