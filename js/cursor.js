(function(){
  'use strict';
  const perf = window.SIVEXO_PERF || {};
  if (perf.isTouch) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.querySelector('.cursor');
  const dot = cursor && cursor.querySelector('.cursor__dot');
  const ring = cursor && cursor.querySelector('.cursor__ring');
  if (!cursor || !dot || !ring) return;

  document.body.classList.add('has-cursor');
  cursor.style.display = 'block';

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  window.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
  });

  function loop(){
    dx += (mx - dx) * 0.35;
    dy += (my - dy) * 0.35;
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const hoverSel = 'a, button, .service-card, .faq__q, input, select, textarea, .contact__list li, .footer__social a, .btn';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSel)) cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSel)) cursor.classList.remove('is-hover');
  });

  // Hide when reduced motion + still show dot only
  if (perf.reducedMotion) {
    cursor.querySelector('.cursor__ring').style.display = 'none';
  }
})();
