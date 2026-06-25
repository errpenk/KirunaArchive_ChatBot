

import { animate, svg, splitText, stagger } from 'animejs';

export function animateKirunaLogo() {
  const markPath = document.querySelector('#kiruna-mark-path');
  const title = document.querySelector('#kiruna-title');

  if (!markPath || !title) return;

  const [drawable] = svg.createDrawable(markPath);
  const { lines } = splitText(title, { lines: true });

  animate(drawable, {
    draw: ['0 0', '0 1'],
    duration: 1200,
    ease: 'inOutQuad'
  });

  animate(markPath, {
    fillOpacity: [0, 1],
    duration: 700,
    delay: 820,
    ease: 'inOutQuad'
  });

  animate(markPath, {
    strokeOpacity: [1, 0],
    strokeWidth: [8, 2],
    duration: 780,
    delay: 1050,
    ease: 'outQuad'
  });

  animate(lines, {
    opacity: [0, 1],
    clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
    duration: 760,
    delay: stagger(80, { start: 360 }),
    ease: 'outQuad'
  });
}