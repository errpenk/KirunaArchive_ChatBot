
/* ════════════════════════════════════════════════
   GALLERY — build + navigate
   ════════════════════════════════════════════════ */
(function(){
  let _built=false;

  /* Palette: one shade per category for Inside Map tiles */
  const TILE_COLORS={
    mine:'#c9a8a8',urban:'#9bbbd4',infra:'#b8a8cc',social:'#9dbfb0',env:'#ccc5a0'
  };

  /* Generate subtle grey gradient — unified across all tiles */
  function tileGradient(color, seed){
    const base=210; // grey lightness base
    const d=((seed*17)%24)-12;
    const v=Math.min(235,Math.max(185,base+d));
    const v2=Math.min(235,Math.max(185,base+d-14));
    const angle=110+(seed%60);
    return `linear-gradient(${angle}deg,rgb(${v},${v},${v}) 0%,rgb(${v2},${v2},${v2}) 100%)`;
  }

  function galleryImageUrl(source, id){
    return `images/${source}/${source}-${String(id).padStart(3,'0')}.jpg`;
  }

  function collectItems(){
    /* Inside Map events */
    const inside=(window.EVS||[]).map(ev=>({
      id:'inside-'+ev.id,
      evId:ev.id,
      source:'inside',
      year:ev.year,
      title:ev.title,
      meta:ev.year+' · '+(window.CL&&window.CL[ev.cat]?window.CL[ev.cat]:ev.cat),
      color:(window.CC&&window.CC[ev.cat]?TILE_COLORS[ev.cat]:TILE_COLORS.urban)||'#c8c8cc',
      imgUrl:ev.imgUrl||galleryImageUrl('inside',ev.id),
    }));

    /* Outside Map — 104 documents, hardcoded to guarantee availability */
    const outside=[
  {id:"outside-1",docIdx:1,source:"outside",year:2004,title:"Deformation Forecast",meta:"2004 · Mining"},
  {id:"outside-2",docIdx:2,source:"outside",year:2004,title:"Mail to Kiruna Kommun",meta:"March 2004 · Governance"},
  {id:"outside-3",docIdx:3,source:"outside",year:2004,title:"Agreement on City Relocation",meta:"December 2004 · Governance"},
  {id:"outside-4",docIdx:4,source:"outside",year:2004,title:"Vision 2099",meta:"2004 · Urban Planning"},
  {id:"outside-5",docIdx:5,source:"outside",year:2005,title:"Sketch Proposal Alternatives for Expansion",meta:"June 2005 · Urban Planning"},
  {id:"outside-6",docIdx:6,source:"outside",year:2005,title:"Cultural Heritage in Motion",meta:"2005 · Heritage"},
  {id:"outside-7",docIdx:7,source:"outside",year:2005,title:"Report New Kiruna — The Northwestern Alternative",meta:"2005 · Urban Planning"},
  {id:"outside-8",docIdx:8,source:"outside",year:2006,title:"The New Kiruna Northwest Alternative",meta:"March 2006 · Urban Planning"},
  {id:"outside-9",docIdx:9,source:"outside",year:2006,title:"Railway Investigation, Kiruna New Railway",meta:"April 2006 · Infrastructure"},
  {id:"outside-10",docIdx:10,source:"outside",year:2006,title:"Comprehensive Development Plan for the Central Area of Kiruna",meta:"August 2006 · Urban Planning"},
  {id:"outside-11",docIdx:11,source:"outside",year:2006,title:"Environmental Impact Assessment for the Detailed Master Plan for Kiruna Town Centre",meta:"December 2006 · Environmental"},
  {id:"outside-12",docIdx:12,source:"outside",year:2007,title:"Survey: What is your impression of Kiruna?",meta:"2007 · Governance"},
  {id:"outside-13",docIdx:13,source:"outside",year:2007,title:"Comprehensive Plan for Kiruna C",meta:"January 2007 · Urban Planning"},
  {id:"outside-14",docIdx:14,source:"outside",year:2007,title:"Final Report: Kiruna New Railway Investigation",meta:"March 2007 · Infrastructure"},
  {id:"outside-15",docIdx:15,source:"outside",year:2008,title:"Compilation of Responses to the Survey",meta:"2008 · Governance"},
  {id:"outside-16",docIdx:16,source:"outside",year:2008,title:"What is Kiruna Worth? Kiruna Cultural Valuation Analysis",meta:"February 2008 · Heritage"},
  {id:"outside-17",docIdx:17,source:"outside",year:2009,title:"Renewal of National Interest",meta:"2009 · Heritage"},
  {id:"outside-18",docIdx:18,source:"outside",year:2010,title:"Detail Plan for Bolagsområdet Gruvstadspark",meta:"October 2010 · Urban Planning"},
  {id:"outside-19",docIdx:19,source:"outside",year:2011,title:"Expression of Interest",meta:"2011 · Governance"},
  {id:"outside-20",docIdx:20,source:"outside",year:2011,title:"Agreement: GP1-Atvalet",meta:"February 2011 · Governance"},
  {id:"outside-21",docIdx:21,source:"outside",year:2011,title:"Agreement of the Municipal Board on City Relocation",meta:"September 2011 · Relocation"},
  {id:"outside-22",docIdx:22,source:"outside",year:2012,title:"Agreement on Temporary Railway Relocation",meta:"January 2012 · Infrastructure"},
  {id:"outside-23",docIdx:23,source:"outside",year:2012,title:"Temporary Railway Relocation",meta:"2012 · Infrastructure"},
  {id:"outside-24",docIdx:24,source:"outside",year:2012,title:"A New City Centre for Kiruna — Invite to an Architecture Competition",meta:"April 2012 · Urban Planning"},
  {id:"outside-25",docIdx:25,source:"outside",year:2012,title:"First Delivery",meta:"May 2012 · Urban Planning"},
  {id:"outside-26",docIdx:26,source:"outside",year:2012,title:"Architecture Competition Brief",meta:"July 2012 · Urban Planning"},
  {id:"outside-27",docIdx:27,source:"outside",year:2012,title:"Preliminary Study on Railway Relocation",meta:"2012 · Infrastructure"},
  {id:"outside-28",docIdx:28,source:"outside",year:2012,title:"Railway Decommissioning",meta:"2012 · Infrastructure"},
  {id:"outside-29",docIdx:29,source:"outside",year:2012,title:"Kiruna Forever",meta:"2012 · Urban Planning"},
  {id:"outside-30",docIdx:30,source:"outside",year:2012,title:"Rejection of Declassification of Kiruna Town Hall",meta:"2012 · Heritage"},
  {id:"outside-31",docIdx:31,source:"outside",year:2013,title:"Preliminary Study Kiruna Railway Station",meta:"February 2013 · Infrastructure"},
  {id:"outside-32",docIdx:32,source:"outside",year:2013,title:"Supplementary Agreement on Building Relocation",meta:"February 2013 · Relocation"},
  {id:"outside-33",docIdx:33,source:"outside",year:2013,title:"A New City Centre for Kiruna — Jury Pronouncement",meta:"March 2013 · Urban Planning"},
  {id:"outside-34",docIdx:34,source:"outside",year:2013,title:"Winning the Case",meta:"2013 · Governance"},
  {id:"outside-35",docIdx:35,source:"outside",year:2013,title:"Invitation to Architecture Competition, New City Hall",meta:"2013 · Urban Planning"},
  {id:"outside-36",docIdx:36,source:"outside",year:2013,title:"First Delivery",meta:"2013 · Urban Planning"},
  {id:"outside-37",docIdx:37,source:"outside",year:2013,title:"Kristallen",meta:"2013 · Urban Planning"},
  {id:"outside-38",docIdx:38,source:"outside",year:2013,title:"Architectural Competition New City Hall — Jury Pronouncement",meta:"2013 · Urban Planning"},
  {id:"outside-39",docIdx:39,source:"outside",year:2013,title:"Supplementary Agreement on Building Relocation",meta:"November 2013 · Relocation"},
  {id:"outside-40",docIdx:40,source:"outside",year:2013,title:"Kiruna 2.0 Vision Report",meta:"2013 · Urban Planning"},
  {id:"outside-41",docIdx:41,source:"outside",year:2014,title:"Development Plan",meta:"March 2014 · Urban Planning"},
  {id:"outside-42",docIdx:42,source:"outside",year:2014,title:"Detail Plan for Linbanan",meta:"March 2014 · Infrastructure"},
  {id:"outside-43",docIdx:43,source:"outside",year:2014,title:"Decommissioning of Ulspiran 2 and 4",meta:"March 2014 · Mining"},
  {id:"outside-44",docIdx:44,source:"outside",year:2014,title:"Analysis of Kiruna's Cultural Heritage Phase 2",meta:"September 2014 · Heritage"},
  {id:"outside-45",docIdx:45,source:"outside",year:2014,title:"Overview Plan for the Central Area of Kiruna 2014",meta:"October 2014 · Urban Planning"},
  {id:"outside-46",docIdx:46,source:"outside",year:2014,title:"Deformation Forecast",meta:"December 2014 · Mining"},
  {id:"outside-47",docIdx:47,source:"outside",year:2015,title:"Adjusted Development Plan",meta:"2015 · Urban Planning"},
  {id:"outside-48",docIdx:48,source:"outside",year:2015,title:"Construction of New City Hall Kristallen Begins",meta:"2015 · Construction"},
  {id:"outside-49",docIdx:49,source:"outside",year:2016,title:"Detail Plan for Square and Commercial Street",meta:"July 2016 · Urban Planning"},
  {id:"outside-50",docIdx:50,source:"outside",year:2016,title:"Detail Plan: Gruvstadspark 2, Etapp 1",meta:"August 2016 · Urban Planning"},
  {id:"outside-51",docIdx:51,source:"outside",year:2016,title:"Level 1365 Reaches Full Exploitation",meta:"2016 · Mining"},
  {id:"outside-52",docIdx:52,source:"outside",year:2017,title:"Building Relocation Plan for Structures Affected by Level 1365",meta:"February 2017 · Relocation"},
  {id:"outside-53",docIdx:53,source:"outside",year:2017,title:"Moving of B5 Hjalmar Lundbohmsgården",meta:"May 2017 · Relocation"},
  {id:"outside-54",docIdx:54,source:"outside",year:2017,title:"First Relocation Stage Completed",meta:"October 2017 · Relocation"},
  {id:"outside-55",docIdx:55,source:"outside",year:2017,title:"Decommissioning of Ulspiran 6 and 8",meta:"October 2017 · Mining"},
  {id:"outside-56",docIdx:56,source:"outside",year:2017,title:"Preliminary Study Mining Town Park, Phase 2",meta:"December 2017 · Urban Planning"},
  {id:"outside-57",docIdx:57,source:"outside",year:2018,title:"Town Hall Closes",meta:"2018 · Relocation"},
  {id:"outside-58",docIdx:58,source:"outside",year:2018,title:"Detailed Plan for Gruvstadspark 2, Stage 2",meta:"October 2018 · Urban Planning"},
  {id:"outside-59",docIdx:59,source:"outside",year:2018,title:"New City Hall Completed",meta:"2018 · Construction"},
  {id:"outside-60",docIdx:60,source:"outside",year:2018,title:"Management of Cultural Buildings for Relocation due to Level 1365, Version 3",meta:"2018 · Heritage"},
  {id:"outside-61",docIdx:61,source:"outside",year:2019,title:"Detail Plan for Retail Park and Centre",meta:"March 2019 · Urban Planning"},
  {id:"outside-62",docIdx:62,source:"outside",year:2019,title:"Deformation Forecast",meta:"April 2019 · Mining"},
  {id:"outside-63",docIdx:63,source:"outside",year:2019,title:"Construction of Scandic Hotel Begins",meta:"April 2019 · Construction"},
  {id:"outside-64",docIdx:64,source:"outside",year:2019,title:"Construction of Aurora Center Begins",meta:"May 2019 · Construction"},
  {id:"outside-65",docIdx:65,source:"outside",year:2019,title:"Detail Plan for Gruvstadspark 2, Etapp 2, Del av Centrum",meta:"June 2019 · Urban Planning"},
  {id:"outside-66",docIdx:66,source:"outside",year:2019,title:"Study on the Relocation of the Church of Kiruna",meta:"2019 · Heritage"},
  {id:"outside-67",docIdx:67,source:"outside",year:2019,title:"Construction of Block 1 Begins",meta:"June 2019 · Construction"},
  {id:"outside-68",docIdx:68,source:"outside",year:2019,title:"Agreement on Heritage Buildings to Move",meta:"June 2019 · Heritage"},
  {id:"outside-69",docIdx:69,source:"outside",year:2019,title:"Town Hall Demolition",meta:"2019 · Relocation"},
  {id:"outside-70",docIdx:70,source:"outside",year:2019,title:"Construction of Blocks 7, 8 & 9 Begins",meta:"September 2019 · Construction"},
  {id:"outside-71",docIdx:71,source:"outside",year:2019,title:"Proposal for Detailed Plan for Part of Tuolluvaara 1",meta:"November 2019 · Urban Planning"},
  {id:"outside-72",docIdx:72,source:"outside",year:2019,title:"Detailed Plan for the Knowledge Hub",meta:"November 2019 · Urban Planning"},
  {id:"outside-73",docIdx:73,source:"outside",year:2019,title:"Heritage Buildings Second Moving Phase Begins",meta:"November 2019 · Heritage"},
  {id:"outside-74",docIdx:74,source:"outside",year:2020,title:"First Set of Housing Buildings Completed",meta:"2020 · Construction"},
  {id:"outside-75",docIdx:75,source:"outside",year:2020,title:"Railway Plan",meta:"2020 · Infrastructure"},
  {id:"outside-76",docIdx:76,source:"outside",year:2020,title:"Demolition Documentation, Kiruna City Hall",meta:"November 2020 · Heritage"},
  {id:"outside-77",docIdx:77,source:"outside",year:2020,title:"Detail Plan for Gruvstadspark 2, Etapp 4",meta:"December 2020 · Urban Planning"},
  {id:"outside-78",docIdx:78,source:"outside",year:2021,title:"Construction of Swimming Pool Starts",meta:"2021 · Construction"},
  {id:"outside-79",docIdx:79,source:"outside",year:2021,title:"Construction of Hjalmar Lundbohm School Starts",meta:"2021 · Construction"},
  {id:"outside-80",docIdx:80,source:"outside",year:2021,title:"Construction of Police Station Starts",meta:"2021 · Construction"},
  {id:"outside-81",docIdx:81,source:"outside",year:2021,title:"Detail Plan for Gruvstadspark 2, Etapp 5, Kyrkan 11 m fl",meta:"August 2021 · Urban Planning"},
  {id:"outside-82",docIdx:82,source:"outside",year:2021,title:"Landscape Analysis — Old Kiruna Church Site",meta:"August 2021 · Heritage"},
  {id:"outside-83",docIdx:83,source:"outside",year:2021,title:"Detail Plan for Gruvstadspark 3, Etapp 1, Hovmästaren 1 f",meta:"August 2021 · Urban Planning"},
  {id:"outside-84",docIdx:84,source:"outside",year:2021,title:"Comprehensive Assessment of Line Studies",meta:"October 2021 · Infrastructure"},
  {id:"outside-85",docIdx:85,source:"outside",year:2022,title:"Inauguration of Scandic Hotel",meta:"February 2022 · Construction"},
  {id:"outside-86",docIdx:86,source:"outside",year:2022,title:"Inauguration of Aurora Center",meta:"May 2022 · Construction"},
  {id:"outside-87",docIdx:87,source:"outside",year:2022,title:"Block 1 Inauguration",meta:"June 2022 · Construction"},
  {id:"outside-88",docIdx:88,source:"outside",year:2022,title:"Construction of Blocks 7, 8 & 9 Completed",meta:"September 2022 · Construction"},
  {id:"outside-89",docIdx:89,source:"outside",year:2022,title:"Agreement of the Municipal Board on Hospital Relocation",meta:"September 2022 · Relocation"},
  {id:"outside-90",docIdx:90,source:"outside",year:2022,title:"Inauguration of New City Centre",meta:"September 2022 · Construction"},
  {id:"outside-91",docIdx:91,source:"outside",year:2022,title:"Detail Plan Tuolluvaara 1:1 — Western Green Finger",meta:"November 2022 · Urban Planning"},
  {id:"outside-92",docIdx:92,source:"outside",year:2022,title:"New Railway Line Studies",meta:"December 2022 · Infrastructure"},
  {id:"outside-93",docIdx:93,source:"outside",year:2022,title:"Detail Plan Tuolluvaara 1:1 — Northeast of Vinterleden",meta:"December 2022 · Urban Planning"},
  {id:"outside-94",docIdx:94,source:"outside",year:2022,title:"Detail Plan for Gruvstadspark 3, Etapp 2",meta:"December 2022 · Urban Planning"},
  {id:"outside-95",docIdx:95,source:"outside",year:2023,title:"Second Set of Housing Buildings Completed",meta:"2023 · Construction"},
  {id:"outside-96",docIdx:96,source:"outside",year:2023,title:"Third Set of Housing Buildings Completed",meta:"2023 · Construction"},
  {id:"outside-97",docIdx:97,source:"outside",year:2023,title:"Police Station Completed",meta:"2023 · Construction"},
  {id:"outside-98",docIdx:98,source:"outside",year:2023,title:"Detailed Planning Proposal for City Park",meta:"October 2023 · Urban Planning"},
  {id:"outside-99",docIdx:99,source:"outside",year:2023,title:"Inauguration of Hjalmar Lundbohm School",meta:"December 2023 · Construction"},
  {id:"outside-100",docIdx:100,source:"outside",year:2024,title:"Agreement on Hospital Relocation",meta:"February 2024 · Relocation"},
  {id:"outside-101",docIdx:101,source:"outside",year:2024,title:"Detailed Plan for Volume Trade and the Centre, Change",meta:"May 2024 · Urban Planning"},
  {id:"outside-102",docIdx:102,source:"outside",year:2024,title:"Kiruna Church Closes",meta:"June 2024 · Heritage"},
  {id:"outside-103",docIdx:103,source:"outside",year:2025,title:"Relocation of Kiruna Church and its Bell Tower",meta:"August 2025 · Heritage"},
  {id:"outside-104",docIdx:104,source:"outside",year:2025,title:"Deformation Forecast",meta:"August 2025 · Mining"}
];

    /* Sort all by year, then source order */
    const outsideWithImages=outside.map(doc=>({
      ...doc,
      imgUrl:doc.imgUrl||galleryImageUrl('outside',doc.docIdx)
    }));
    return [...inside,...outsideWithImages].sort((a,b)=>a.year-b.year||0);
  }

  function buildGallery(){
    const content=document.getElementById('gallery-content');
    const countLabel=document.getElementById('gallery-count-label');
    if(!content) return;

    content.innerHTML='';

    const items=collectItems();
    if(countLabel) countLabel.textContent=items.length+' items';

    const byYear={};
    items.forEach(item=>{
      const y=item.year||0;
      if(!byYear[y]) byYear[y]=[];
      byYear[y].push(item);
    });

    const years=Object.keys(byYear).sort((a,b)=>+a-+b);
    years.forEach((year, groupIdx)=>{
      const group=document.createElement('div');
      group.className='gallery-year-group';
      group.dataset.year=year;

      const label=document.createElement('div');
      label.className='gallery-year-label';
      label.textContent=year==='0'?'Undated':year;
      group.appendChild(label);

      const grid=document.createElement('div');
      grid.className='gallery-grid';

      byYear[year].forEach((item,i)=>{
        const tile=document.createElement('div');
        tile.className='gallery-tile';
        tile.dataset.galleryId=item.id;
        tile.dataset.galleryTitle=item.title;
        tile.dataset.galleryMeta=item.meta;
        tile.dataset.galleryColor=item.color;
        tile.dataset.galleryGradient=tileGradient(item.color, i+byYear[year].length);
        tile.dataset.galleryImgUrl=item.imgUrl||'';
        tile.setAttribute('tabindex','0');
        tile.setAttribute('aria-label',item.title);

        const bg=document.createElement('div');
        bg.className='gallery-tile-bg';
        bg.style.background=tile.dataset.galleryGradient;
        if(item.imgUrl){
          bg.style.backgroundImage=`url(${item.imgUrl}), ${tile.dataset.galleryGradient}`;
          bg.style.backgroundSize='cover, cover';
          bg.style.backgroundPosition='center, center';
        }
        bg.style.position='absolute';bg.style.inset='0';

        const dot=document.createElement('div');
        dot.className='gallery-tile-source-dot';
        dot.style.background=item.color;

        const lbl=document.createElement('div');
        lbl.className='gallery-tile-label';
        lbl.innerHTML=`<div class="gallery-tile-title">${item.title}</div><div class="gallery-tile-meta">${item.meta}</div>`;

        tile.appendChild(bg);tile.appendChild(dot);tile.appendChild(lbl);

        tile.addEventListener('click',()=>openLightbox(tile));
        tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLightbox(tile);}});

        grid.appendChild(tile);
      });

      group.appendChild(grid);
      content.appendChild(group);
    });

    _built=true;
    buildGalleryRail(years);
  }

  function buildGalleryRail(years){
    const rail=document.getElementById('gallery-year-rail-nodes');
    const railEl=document.getElementById('gallery-year-rail');
    if(!rail) return;
    rail.innerHTML='';

    years.forEach(year=>{
      const node=document.createElement('div');
      node.className='gallery-rail-node';
      node.dataset.year=year;
      node.setAttribute('tabindex','0');
      node.setAttribute('role','button');
      node.setAttribute('aria-label','Jump to '+year);

      const dot=document.createElement('div');
      dot.className='gallery-rail-dot';

      const lbl=document.createElement('div');
      lbl.className='gallery-rail-year';
      lbl.textContent=year==='0'?'Undated':year;

      node.appendChild(dot);
      node.appendChild(lbl);

      const activate=(yr)=>{
        const group=document.querySelector(`.gallery-year-group[data-year="${yr}"]`);
        if(group){
          const scroll=document.getElementById('gallery-scroll');
          if(scroll){
            /* Scroll so the year group label sits near top with some breathing room */
            const groupTop=group.offsetTop;
            const scrollTarget=Math.max(0, groupTop - 24);
            scroll.scrollTo({top:scrollTarget, behavior:'smooth'});
          } else {
            group.scrollIntoView({behavior:'smooth',block:'start'});
          }
        }
        document.querySelectorAll('.gallery-rail-node').forEach(n=>n.classList.remove('active'));
        node.classList.add('active');
        node.scrollIntoView({behavior:'smooth',block:'nearest'});
      };

      node.addEventListener('click',()=>activate(year));
      node.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(year);}
        if(e.key==='ArrowDown'){e.preventDefault();const next=node.nextElementSibling;if(next){next.focus();next.click();}}
        if(e.key==='ArrowUp'){e.preventDefault();const prev=node.previousElementSibling;if(prev){prev.focus();prev.click();}}
      });

      rail.appendChild(node);
    });

    /* Keyboard scroll on the rail container itself */
    if(railEl && !railEl._keysBound){
      railEl._keysBound=true;
      railEl.setAttribute('tabindex','0');
      railEl.addEventListener('keydown',e=>{
        const active=rail.querySelector('.gallery-rail-node.active')||rail.firstElementChild;
        if(e.key==='ArrowDown'){
          e.preventDefault();
          const next=active?.nextElementSibling;
          if(next){next.focus();next.click();}
        }
        if(e.key==='ArrowUp'){
          e.preventDefault();
          const prev=active?.previousElementSibling;
          if(prev){prev.focus();prev.click();}
        }
      });
    }

    /* Track scroll to highlight active year */
    const scroll=document.getElementById('gallery-scroll');
    if(scroll && !scroll._railScrollBound){
      scroll._railScrollBound=true;
      scroll.addEventListener('scroll',()=>{
        const groups=document.querySelectorAll('.gallery-year-group');
        let activeYear=null;
        const scrollTop=scroll.getBoundingClientRect().top;
        groups.forEach(g=>{
          const rect=g.getBoundingClientRect();
          if(rect.top<=scrollTop+100) activeYear=g.dataset.year;
        });
        document.querySelectorAll('.gallery-rail-node').forEach(n=>{
          n.classList.toggle('active',n.dataset.year===activeYear);
        });
      },{passive:true});
    }
  }

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

  function renderLightboxFrame(){
    const lb=_lightboxEl; if(!lb) return;
    const tile=_lightboxItems[_lightboxIdx];
    if(!tile) return;

    _applyTileToFrame(tile, true, 1);

    /* Wire action buttons */
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

  function stepLightbox(dir){
    const next=_lightboxIdx+dir;
    if(next<0||next>=_lightboxItems.length) return;
    _lightboxIdx=next;
    const tile=_lightboxItems[_lightboxIdx];
    if(!tile) return;

    /* Smooth crossfade with direction */
    _applyTileToFrame(tile, true, dir);

    /* Re-wire action buttons without touching the image */
    const galleryId=tile.dataset.galleryId||'';
    const parts=galleryId.split('-');
    const source=parts[0];
    const id=Number(parts[1]);
    const btnTime=document.getElementById('glb-btn-time');
    const btnMap=document.getElementById('glb-btn-map');

    document.getElementById('glb-title').textContent=tile.dataset.galleryTitle||'';
    document.getElementById('glb-meta').textContent=tile.dataset.galleryMeta||'';

    if(source==='inside'){
      const ev=(window.EVS||[]).find(e=>e.id===id);
      const year=ev?ev.year:null;
      btnTime.style.display='inline-flex'; btnMap.style.display='inline-flex';
      btnTime.onclick=()=>{ closeLightbox(); if(typeof window.openTimeline2View==='function') window.openTimeline2View('overview',year,'gallery',id); };
      btnMap.onclick=()=>{ closeLightbox(); if(typeof window.openGalleryToMap==='function') window.openGalleryToMap(id); };
    } else {
      const year=Number((tile.dataset.galleryMeta||'').match(/\d{4}/)?.[0])||null;
      btnTime.style.display='inline-flex'; btnMap.style.display='none';
      btnTime.onclick=()=>{ closeLightbox(); if(typeof window.openOutsideFromGallery==='function') window.openOutsideFromGallery(id,year); else if(typeof window.openOutsideSearchResult==='function') window.openOutsideSearchResult(id,year); };
    }
  }

  function closeLightbox(){
    if(!_lightboxEl) return;
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

})();
