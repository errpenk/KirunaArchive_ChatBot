
/* ════════════════════════════════════════════════
   GALLERY — build + navigate
   ════════════════════════════════════════════════ */
(function(){
  let galleryVm=null;

  /* Palette: one shade per category for Inside Map tiles */
  const TILE_COLORS={
    mine:'#c9a8a8',urban:'#9bbbd4',infra:'#b8a8cc',social:'#9dbfb0',env:'#ccc5a0'
  };

  /* Generate subtle grey gradient — unified across all tiles */
  function tileGradient(seed){
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

    const outsideWithImages=window.KirunaOutsideData.RAW.map(row=>({
      id:'outside-'+row[7],
      docIdx:row[7],
      source:'outside',
      year:Number(row[0].match(/\d{4}/)?.[0])||0,
      title:row[1].replaceAll('"',''),
      meta:row[0]+' · '+row[3],
      imgUrl:galleryImageUrl('outside',row[7])
    }));
    return [...inside,...outsideWithImages].sort((a,b)=>a.year-b.year||0);
  }

  function buildGallery(){
    const content=document.getElementById('gallery-content');
    const countLabel=document.getElementById('gallery-count-label');
    if(!content) return;
    if(!galleryVm)galleryVm=Vue.createApp({
      data:()=>({groups:[],activeYear:null}),
      methods:{
        openTile(event){openLightbox(event.currentTarget)},
        jumpYear(year){
          const group=document.querySelector(`.gallery-year-group[data-year="${year}"]`);
          const scroll=document.getElementById('gallery-scroll');
          if(group&&scroll)scroll.scrollTo({top:Math.max(0,group.offsetTop-24),behavior:'smooth'});
          this.activeYear=year;
          document.querySelector(`.gallery-rail-node[data-year="${year}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});
        }
      },
      template:'#gallery-grid-template'
    }).mount(content);

    const items=collectItems();
    if(countLabel) countLabel.textContent=items.length+' items';

    const byYear={};
    items.forEach(item=>{
      const y=item.year||0;
      if(!byYear[y]) byYear[y]=[];
      byYear[y].push(item);
    });

    const years=Object.keys(byYear).sort((a,b)=>+a-+b);
    galleryVm.groups=years.map(year=>({
      year,label:year==='0'?'Undated':year,
      items:byYear[year].map((item,i)=>({...item,gradient:tileGradient(i+byYear[year].length)}))
    }));
    bindGalleryRail();
    return Vue.nextTick();
  }

  function bindGalleryRail(){
    const rail=document.getElementById('gallery-year-rail-nodes');
    const railEl=document.getElementById('gallery-year-rail');
    if(!rail) return;

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
        galleryVm.activeYear=activeYear;
      },{passive:true});
    }
  }
