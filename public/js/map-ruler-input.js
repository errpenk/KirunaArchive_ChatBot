// ── Damping scroll wheel on ruler + mouse drag ──
(function setupRulerDamping(){
  function init(){
    const ruler=document.getElementById('map-ruler-inner');
    if(!ruler){setTimeout(init,500);return;}
    let velocity=0,raf=null,lastT=0;
    const FRICTION=0.90;
    const SCALE=2.2;

    function step(t){
      const dt=Math.min(t-lastT,50);lastT=t;
      if(Math.abs(velocity)<0.3){velocity=0;raf=null;ruler.style.cursor='grab';return;}
      ruler.scrollLeft+=velocity*(dt/16);
      velocity*=FRICTION;
      raf=requestAnimationFrame(step);
    }

    function startMomentum(v){
      velocity=v;
      if(raf)cancelAnimationFrame(raf);
      lastT=performance.now();
      raf=requestAnimationFrame(step);
    }

    ruler.addEventListener('wheel',(e)=>{
      e.preventDefault();
      if(raf)cancelAnimationFrame(raf);
      velocity=0;
      // Direct fast scroll for wheel — no momentum, instant response
      ruler.scrollLeft+=e.deltaX*SCALE+e.deltaY*SCALE;
    },{passive:false});

    // Mouse drag with momentum
    let isDragging=false,mouseLastX=0,mouseLastT=0,mouseDX=0;
    ruler.style.cursor='grab';
    ruler.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
      isDragging=true;
      mouseLastX=e.clientX;
      mouseLastT=Date.now();
      mouseDX=0;
      velocity=0;
      if(raf)cancelAnimationFrame(raf);
      ruler.style.cursor='grabbing';
      ruler.style.userSelect='none';
      e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{
      if(!isDragging)return;
      const now=Date.now();
      const dt=now-mouseLastT||1;
      const dx=mouseLastX-e.clientX;
      ruler.scrollLeft+=dx;
      // Rolling velocity
      mouseDX=dx/dt*16*0.7+mouseDX*0.3;
      mouseLastX=e.clientX;
      mouseLastT=now;
    });
    document.addEventListener('mouseup',()=>{
      if(!isDragging)return;
      isDragging=false;
      ruler.style.cursor='grab';
      ruler.style.userSelect='';
      // Kick off momentum with captured velocity
      if(Math.abs(mouseDX)>0.5)startMomentum(mouseDX);
    });
    ruler.addEventListener('mouseleave',()=>{
      if(!isDragging)ruler.style.cursor='grab';
    });

    // Touch with momentum
    let touchLastX=0,touchLastT=0,touchDX=0;
    ruler.addEventListener('touchstart',e=>{
      touchLastX=e.touches[0].clientX;
      touchLastT=Date.now();
      touchDX=0;
      velocity=0;if(raf)cancelAnimationFrame(raf);
    },{passive:true});
    ruler.addEventListener('touchmove',e=>{
      const now=Date.now();
      const dt=now-touchLastT||1;
      const dx=touchLastX-e.touches[0].clientX;
      ruler.scrollLeft+=dx;
      touchDX=dx/dt*16*0.7+touchDX*0.3;
      touchLastX=e.touches[0].clientX;
      touchLastT=now;
    },{passive:true});
    ruler.addEventListener('touchend',()=>{
      if(Math.abs(touchDX)>0.5)startMomentum(touchDX);
    },{passive:true});

    // Hover nearest tick highlight
    ruler.addEventListener('mousemove',e=>{
      if(isDragging)return;
      const rect=ruler.getBoundingClientRect();
      const x=e.clientX-rect.left+ruler.scrollLeft;
      let closest=null,minDist=Infinity;
      ruler.querySelectorAll('.ruler-tick:not(.era-hidden)').forEach(t=>{
        const cx=t.offsetLeft+t.offsetWidth/2;
        const dist=Math.abs(cx-x);
        if(dist<minDist){minDist=dist;closest=t;}
      });
      ruler.querySelectorAll('.ruler-tick').forEach(t=>t.classList.remove('hover-near'));
      if(closest&&minDist<60)closest.classList.add('hover-near');
    },{passive:true});
    ruler.addEventListener('mouseleave',()=>{
      ruler.querySelectorAll('.ruler-tick').forEach(t=>t.classList.remove('hover-near'));
    },{passive:true});
  }
  setTimeout(init,600);
})();

