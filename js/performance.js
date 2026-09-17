(function(){
  'use strict';
  const perf = {
    isMobile: window.matchMedia('(max-width: 768px)').matches,
    isTouch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    lowPower: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  // Heuristics for low power
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 2) perf.lowPower = true;
  if (perf.isMobile) perf.dpr = Math.min(perf.dpr, 2);
  if (perf.isMobile && (mem <= 3 || cores <= 4)) perf.lowPower = true;
  if (perf.reducedMotion) perf.lowPower = true;

  window.SIVEXO_PERF = perf;
})();
