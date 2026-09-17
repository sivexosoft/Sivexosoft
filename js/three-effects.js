(function(){
  'use strict';
  // Reserved for future scene-wide post effects. Intentionally lightweight.
  // Applies a subtle CSS-driven depth effect to the hero container.
  const hero = document.querySelector('.hero__visual');
  if (!hero) return;
  const perf = window.SIVEXO_PERF || {};
  if (perf.reducedMotion || perf.isMobile) return;

  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function loop(){
    cx += (tx - cx) * 0.05;
    cy += (ty - cy) * 0.05;
    hero.style.transform = `translate3d(${cx * 10}px, ${cy * 10}px, 0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
