
(function(){
/* Kiruna — A City in Motion | minimal b/w diagram */
const canvas = document.getElementById('kiruna-viz');
if(!canvas) return;
const ctx = canvas.getContext('2d');
const LW = 480, LH = 360;

function resize(){
  const dpr = window.devicePixelRatio||1;
  const cssW = canvas.offsetWidth||LW;
  const cssH = Math.round(cssW*LH/LW);
  canvas.style.height = cssH+'px';
  canvas.width  = Math.round(cssW*dpr);
  canvas.height = Math.round(cssH*dpr);
  ctx.setTransform(canvas.width/LW, 0, 0, canvas.height/LH, 0, 0);
}

// ── Layout ──────────────────────────────
// Mine fixed left. City travels right.
// Positions are horizontal centres; everything sits on one baseline.
const BASE_Y   = 190;          // shared ground line Y
const MINE_X   = 90;           // mine centre X
const CITY_X0  = 200;          // city start X (1900)
const CITY_X1  = 358;          // city end X   (2025) — 158 px ≈ 3 km
const CITY_R   = 26;           // city square half-side

// ── State ──────────────────────────────
let progress   = 0;            // 0 → 1
let targetP    = 0;
let tick       = 0;
let dragging   = false;
let dragStartX = 0, dragStartP = 0;
let nudgePulse = 0;            // drives hint arrow animation
let hintDone   = false;

function cityX(p){ return CITY_X0 + (CITY_X1-CITY_X0)*p; }
function getYear(p){ return Math.round(1900+p*125); } // 2025 = new centre inauguration milestone

// ── Easing ─────────────────────────────
function lerp(a,b,t){ return a+(b-a)*t; }

// ── Draw helpers ────────────────────────
function setFont(size, weight='400'){
  ctx.font = `${weight} ${size}px -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif`;
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ── DRAW SECTIONS ───────────────────────

function drawBackground(){
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,LW,LH);
}

function drawGroundLine(p){
  // Full baseline
  ctx.strokeStyle = '#1d1d1f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, BASE_Y);
  ctx.lineTo(LW-40, BASE_Y);
  ctx.stroke();

  // Deformation zone: dotted underline expanding from mine
  if(p > 0.04){
    const a = Math.min(1,(p-0.04)/0.25);
    const zoneR = 38 + p*52;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#1d1d1f';
    ctx.lineWidth = 1;
    ctx.setLineDash([3,4]);
    ctx.beginPath();
    ctx.arc(MINE_X+22+p*18, BASE_Y, zoneR, Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawMine(p){
  // Outer faint ring (pulsing)
  const pulse = 0.5+0.5*Math.sin(tick*3.2);
  ctx.save();
  ctx.globalAlpha = 0.06+pulse*0.06;
  ctx.beginPath();
  ctx.arc(MINE_X, BASE_Y, 28+pulse*6, 0, Math.PI*2);
  ctx.fillStyle = '#1d1d1f';
  ctx.fill();
  ctx.restore();

  // Solid circle — the mine
  ctx.beginPath();
  ctx.arc(MINE_X, BASE_Y, 14, 0, Math.PI*2);
  ctx.fillStyle = '#1d1d1f';
  ctx.fill();

  // White cross inside
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MINE_X, BASE_Y-7); ctx.lineTo(MINE_X, BASE_Y+7);
  ctx.moveTo(MINE_X-7, BASE_Y); ctx.lineTo(MINE_X+7, BASE_Y);
  ctx.stroke();

  // Mine label (below)
  setFont(9,'600');
  ctx.fillStyle = '#1d1d1f';
  ctx.textAlign = 'center';
  ctx.fillText('MINE', MINE_X, BASE_Y+28);
  setFont(8);
  ctx.fillStyle = '#86868b';
  ctx.fillText('Kiirunavaara', MINE_X, BASE_Y+39);
  ctx.textAlign = 'left';
}

function drawConnectingLine(p, cx){
  if(p < 0.02) return;
  // Dashed line from mine to city showing connection / distance
  const a = Math.min(1, p/0.15);
  ctx.save();
  ctx.globalAlpha = a * 0.18;
  ctx.strokeStyle = '#1d1d1f';
  ctx.lineWidth = 1;
  ctx.setLineDash([4,5]);
  ctx.beginPath();
  ctx.moveTo(MINE_X+14, BASE_Y);
  ctx.lineTo(cx-CITY_R, BASE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawDistanceLabel(p, cx){
  if(p < 0.08) return;
  const a = Math.min(1,(p-0.08)/0.2);
  const totalKm = (p * 3).toFixed(1);
  const labelY = BASE_Y - 52;
  const midX = lerp(MINE_X, cx, 0.5);

  ctx.save();
  ctx.globalAlpha = a;

  // Bracket lines
  ctx.strokeStyle = '#86868b';
  ctx.lineWidth = 1;
  // left tick
  ctx.beginPath();
  ctx.moveTo(MINE_X, labelY-6);
  ctx.lineTo(MINE_X, labelY+6);
  ctx.stroke();
  // right tick
  ctx.beginPath();
  ctx.moveTo(cx, labelY-6);
  ctx.lineTo(cx, labelY+6);
  ctx.stroke();
  // span line
  ctx.beginPath();
  ctx.moveTo(MINE_X, labelY);
  ctx.lineTo(cx, labelY);
  ctx.stroke();

  // Distance text pill
  setFont(9,'600');
  const label = totalKm+' km east';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = '#ffffff';
  roundRect(midX-tw/2-6, labelY-10, tw+12, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#1d1d1f';
  ctx.textAlign = 'center';
  ctx.fillText(label, midX, labelY+3);
  ctx.textAlign = 'left';

  ctx.restore();
}

function drawCity(p, cx){
  const arrived = p > 0.9;
  // Ghost origin (fades as city moves)
  if(p > 0.06){
    const ghostA = Math.max(0, 0.12 - p*0.13);
    if(ghostA > 0.001){
      ctx.save();
      ctx.globalAlpha = ghostA;
      ctx.strokeStyle = '#1d1d1f';
      ctx.lineWidth = 1;
      ctx.setLineDash([3,3]);
      roundRect(CITY_X0-CITY_R, BASE_Y-CITY_R*2, CITY_R*2, CITY_R*2, 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Trail dots (ghost positions at earlier years)
  if(p > 0.12){
    const trailCount = 4;
    for(let i=0;i<trailCount;i++){
      const tp = (i+1)/(trailCount+1)*p;
      const tx = cityX(tp);
      const ta = 0.035 + i*0.02;
      ctx.save();
      ctx.globalAlpha = Math.min(ta, p-tp > 0.05 ? ta : 0);
      ctx.fillStyle = '#1d1d1f';
      roundRect(tx-CITY_R, BASE_Y-CITY_R*2, CITY_R*2, CITY_R*2, 3);
      ctx.fill();
      ctx.restore();
    }
  }

  // Main city square
  const fill = arrived ? '#1d1d1f' : '#ffffff';
  const stroke = '#1d1d1f';
  const sw = arrived ? 0 : 1.8;

  ctx.save();
  roundRect(cx-CITY_R, BASE_Y-CITY_R*2, CITY_R*2, CITY_R*2, 3);
  ctx.fillStyle = fill;
  ctx.fill();
  if(sw > 0){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.stroke();
  }

  // Interior grid marks (city blocks texture, simple dots)
  const dotCol = arrived ? 'rgba(255,255,255,0.4)' : 'rgba(29,29,31,0.18)';
  ctx.fillStyle = dotCol;
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){
    ctx.beginPath();
    ctx.arc(cx - CITY_R+10+c*13, BASE_Y - CITY_R*2+10+r*13, 2, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // City label
  setFont(9,'600');
  ctx.fillStyle = '#1d1d1f';
  ctx.textAlign = 'center';
  const label = arrived ? 'New Centre' : 'Kiruna';
  ctx.fillText(label, cx, BASE_Y+28);
  if(arrived){
    setFont(8);
    ctx.fillStyle = '#86868b';
    ctx.fillText('since 2025', cx, BASE_Y+39);
  }
  ctx.textAlign = 'left';
}

function drawYearCounter(p){
  const yr = getYear(p);
  setFont(44,'300');
  ctx.fillStyle = '#1d1d1f';
  ctx.textAlign = 'center';
  ctx.fillText(yr, LW/2, BASE_Y+88);

  // Sub-label
  setFont(9);
  ctx.fillStyle = '#86868b';
  const phase = p < 0.33 ? 'Industrial Era' : p < 0.72 ? 'Growth Era' : 'Relocation Era';
  ctx.fillText(phase.toUpperCase(), LW/2, BASE_Y+104);
  ctx.textAlign = 'left';
}

function drawTopLabel(){
  setFont(9,'600');
  ctx.fillStyle = '#1d1d1f';
  ctx.letterSpacing = '0.1em';
  ctx.fillText('A CITY IN MOTION — KIRUNA, SWEDEN', 40, 32);
  ctx.letterSpacing = '';
  setFont(8);
  ctx.fillStyle = '#86868b';
  ctx.fillText('1900 → 2025 inauguration  ·  2035 full programme', 40, 46);
}

function drawHintArrow(p){
  if(hintDone || p > 0.04) return;
  // Blinking hand/arrow pointing at city
  const cx = cityX(p);
  nudgePulse += 0.045;
  const bounce = Math.sin(nudgePulse)*5;
  const a = 0.4+0.4*Math.abs(Math.sin(nudgePulse*0.7));

  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#1d1d1f';
  ctx.fillStyle = '#1d1d1f';
  ctx.lineWidth = 1.5;

  // Arrow pointing right toward city
  const ax = cx + CITY_R + 12 + bounce;
  const ay = BASE_Y - CITY_R;
  ctx.beginPath();
  ctx.moveTo(ax+18, ay);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax+7, ay-5);
  ctx.lineTo(ax+7, ay+5);
  ctx.fill();

  setFont(8,'600');
  ctx.fillStyle = '#1d1d1f';
  ctx.textAlign = 'left';
  ctx.fillText('DRAG  OR  CLICK', ax+22, ay+3);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawProgressBar(p){
  const bx=40, by=LH-20, bw=LW-80, bh=2;
  ctx.fillStyle = '#e8e8ed';
  ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle = '#1d1d1f';
  ctx.fillRect(bx,by,bw*p,bh);
  // Thumb
  ctx.beginPath();
  ctx.arc(bx+bw*p, by+1, 5, 0, Math.PI*2);
  ctx.fillStyle = '#1d1d1f';
  ctx.fill();
}

// ── Main loop ───────────────────────────
function draw(){
  if(!dragging) progress += (targetP-progress)*0.055;
  const p = Math.max(0,Math.min(1,progress));
  const cx = cityX(p);
  if(p>0.04) hintDone=true;

  drawBackground();
  drawTopLabel();
  drawGroundLine(p);
  drawConnectingLine(p, cx);
  drawDistanceLabel(p, cx);
  drawMine(p);
  drawCity(p, cx);
  drawYearCounter(p);
  drawHintArrow(p);
  drawProgressBar(p);

  tick+=0.016;
  requestAnimationFrame(draw);
}

// ── Events ──────────────────────────────
function toLX(e){
  const r=canvas.getBoundingClientRect();
  return (( e.touches?e.touches[0].clientX:e.clientX )-r.left)*LW/r.width;
}
function onLY(e){
  const r=canvas.getBoundingClientRect();
  return (( e.touches?e.touches[0].clientY:e.clientY )-r.top)*LH/r.height;
}

function isOnProgressBar(lx,ly){
  const bx=40,by=LH-26,bw=LW-80,bh=12;
  return lx>=bx&&lx<=bx+bw&&ly>=by&&ly<=by+bh;
}
function progressFromX(lx){
  return Math.max(0,Math.min(1,(lx-40)/(LW-80)));
}
function isOnCity(lx, p){
  const cx=cityX(p);
  return lx>=cx-CITY_R-10&&lx<=cx+CITY_R+10;
}

canvas.addEventListener('mousedown',e=>{
  const lx=toLX(e), ly=onLY(e);
  if(isOnProgressBar(lx,ly)){
    dragging=true; dragStartX=lx; dragStartP=progressFromX(lx);
    progress=targetP=dragStartP;
  } else if(isOnCity(lx,progress)){
    dragging=true; dragStartX=lx; dragStartP=progress;
  }
});
window.addEventListener('mousemove',e=>{
  if(!dragging) return;
  const lx=toLX(e);
  const dx=lx-dragStartX;
  const range=CITY_X1-CITY_X0;
  if(isOnProgressBar(dragStartX,onLY(e))||true){
    progress=targetP=Math.max(0,Math.min(1,dragStartP+dx/range));
  }
});
window.addEventListener('mouseup',()=>{ dragging=false; });

canvas.addEventListener('click',e=>{
  if(dragging) return;
  const lx=toLX(e), ly=onLY(e);
  if(isOnProgressBar(lx,ly)){
    targetP=progressFromX(lx);
  } else {
    /* Advance 12% forward — stop at end, never loop back */
    targetP=Math.min(1,progress+0.12);
  }
});

canvas.addEventListener('touchstart',e=>{ e.preventDefault();
  const lx=toLX(e),ly=onLY(e);
  dragging=true; dragStartX=lx; dragStartP=progress;
},{passive:false});
canvas.addEventListener('touchmove',e=>{ e.preventDefault();
  if(!dragging)return;
  const lx=toLX(e);
  progress=targetP=Math.max(0,Math.min(1,dragStartP+(lx-dragStartX)/(CITY_X1-CITY_X0)));
},{passive:false});
canvas.addEventListener('touchend',()=>{ dragging=false; });

// Cursor
canvas.addEventListener('mousemove',e=>{
  const lx=toLX(e),ly=onLY(e);
  if(isOnCity(lx,progress)||isOnProgressBar(lx,ly))
    canvas.style.cursor='grab';
  else canvas.style.cursor='pointer';
});

// Boot
resize();
window.addEventListener('resize',resize,{passive:true});
const ph=document.getElementById('page-home');
if(ph){ new MutationObserver(()=>{if(!ph.classList.contains('off'))resize();}).observe(ph,{attributes:true,attributeFilter:['class']}); }
requestAnimationFrame(draw);
})();
