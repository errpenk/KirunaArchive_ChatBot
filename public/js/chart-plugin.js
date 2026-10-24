
/* ── Doughnut centre-text plugin ──────────────────────────────────────────
   Renders the dominant segment's percentage + label inside each donut.
   Register once globally so all charts pick it up.
──────────────────────────────────────────────────────────────────────── */
const _donutCentrePlugin = {
  id: 'donutCentre',
  afterDraw(chart){
    if(chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    const {ctx, chartArea:{left,top,width,height}} = chart;
    const cx = left + width / 2;
    const cy = top  + height / 2;

    const ds = chart.data.datasets[0];
    if(!ds) return;
    const vals  = ds.data;
    const total = vals.reduce((a,b)=>a+b, 0);
    if(!total) return;
    const maxIdx = vals.indexOf(Math.max(...vals));
    const pct    = Math.round(vals[maxIdx] / total * 100);
    const label  = (chart.data.labels || [])[maxIdx] || '';

    /* ── geometry: stack number + label, true vertical centre ── */
    const numSize   = Math.round(Math.min(width, height) * 0.185);
    const lblSize   = Math.max(9, Math.round(Math.min(width, height) * 0.075));
    const gap       = Math.round(lblSize * 0.55);   /* space between num and label */
    const blockH    = numSize + gap + lblSize;       /* total text-block height     */
    const numY      = cy - blockH / 2 + numSize * 0.72;
    const lblY      = numY + gap + lblSize * 0.9;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';

    /* ── large percentage number — Playfair Display / Georgia serif ── */
    ctx.font      = `700 ${numSize}px "Playfair Display","Georgia","Times New Roman",serif`;
    ctx.fillStyle = '#1c2028';
    ctx.fillText(pct + '%', cx, numY);

    /* ── label underneath — system sans, subdued ── */
    /* Truncate long labels to fit inside the ring */
    const maxW = Math.min(width, height) * 0.56;
    ctx.font      = `400 ${lblSize}px -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif`;
    ctx.fillStyle = '#96a0aa';
    /* Word-wrap if label is too wide */
    let displayLabel = label;
    if(ctx.measureText(label).width > maxW){
      const words = label.split(/[\s/]+/);
      let line = '';
      for(const w of words){
        const test = line ? line+' '+w : w;
        if(ctx.measureText(test).width <= maxW) line = test;
        else { displayLabel = line; break; }
      }
    }
    ctx.fillText(displayLabel, cx, lblY);
    ctx.restore();
  }
};
Chart.register(_donutCentrePlugin);
