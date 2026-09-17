(function(){
  'use strict';
  const perf = window.SIVEXO_PERF || {};
  if (perf.reducedMotion) return;

  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  // We reuse the same canvas as three-scene. So particles are drawn by three-scene as a Points cloud.
  // This file exposes a config the three-scene will consume to avoid two renderers fighting.
  const count = perf.isMobile ? 220 : (perf.lowPower ? 320 : 520);
  const speed = perf.isMobile ? 0.04 : 0.06;

  window.SIVEXO_PARTICLES = {
    count,
    speed,
    color: 0xB65FF7,
    lineColor: 0x5923C0,
    linkDistance: perf.isMobile ? 90 : 120,
    mouseRadius: perf.isMobile ? 110 : 150,
    size: perf.isMobile ? 1.1 : 1.35
  };
})();
