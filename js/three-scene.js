(function(){
  'use strict';
  if (typeof THREE === 'undefined') {
    console.warn('Three.js missing — background disabled.');
    return;
  }
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  const perf = window.SIVEXO_PERF || {};
  const cfg = window.SIVEXO_PARTICLES || { count: 300, speed: 0.05, color: 0xB65FF7, lineColor: 0x5923C0, linkDistance: 110, mouseRadius: 140, size: 1.2 };

  let renderer, scene, camera, points, positions, velocities, geometry, material;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let rafId = null;
  let running = true;

  function init(){
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !perf.isMobile,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch(e) {
      console.warn('WebGL init failed', e);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 42;

    const N = cfg.count;
    geometry = new THREE.BufferGeometry();
    positions = new Float32Array(N * 3);
    velocities = new Float32Array(N * 3);

    const spread = 70;
    const spreadY = 50;
    for (let i = 0; i < N; i++){
      positions[i*3]   = (Math.random() - 0.5) * spread;
      positions[i*3+1] = (Math.random() - 0.5) * spreadY;
      positions[i*3+2] = (Math.random() - 0.5) * 40;
      velocities[i*3]   = (Math.random() - 0.5) * cfg.speed;
      velocities[i*3+1] = (Math.random() - 0.5) * cfg.speed;
      velocities[i*3+2] = (Math.random() - 0.5) * cfg.speed;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Circular sprite texture
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(32,32,0,32,32,32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(182,95,247,0.9)');
    grd.addColorStop(1, 'rgba(89,35,192,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,64,64);
    const sprite = new THREE.CanvasTexture(c);

    material = new THREE.PointsMaterial({
      size: cfg.size,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: cfg.color,
      opacity: 0.9
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    loop();
  }

  function onResize(){
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  function onMouse(e){
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function onVisibility(){
    if (document.hidden) { running = false; }
    else { running = true; if (!rafId) loop(); }
  }

  function loop(){
    rafId = requestAnimationFrame(loop);
    if (!running) return;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    const N = cfg.count;
    const pos = geometry.attributes.position.array;
    const mx = mouse.x * 40;
    const my = mouse.y * 28;

    for (let i = 0; i < N; i++){
      const ix = i*3, iy = ix+1, iz = ix+2;
      pos[ix]   += velocities[ix];
      pos[iy]   += velocities[iy];
      pos[iz]   += velocities[iz];

      // Wrap
      if (pos[ix] > 35) pos[ix] = -35;
      if (pos[ix] < -35) pos[ix] = 35;
      if (pos[iy] > 25) pos[iy] = -25;
      if (pos[iy] < -25) pos[iy] = 25;
      if (pos[iz] > 20) pos[iz] = -20;
      if (pos[iz] < -20) pos[iz] = 20;

      // Mouse repel
      const dx = pos[ix] - mx;
      const dy = pos[iy] - my;
      const d2 = dx*dx + dy*dy;
      if (d2 < cfg.mouseRadius * cfg.mouseRadius) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / cfg.mouseRadius) * 0.35;
        pos[ix] += (dx / d) * f;
        pos[iy] += (dy / d) * f;
      }
    }
    geometry.attributes.position.needsUpdate = true;

    if (points) points.rotation.y += 0.0004;
    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
