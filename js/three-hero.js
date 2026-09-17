(function(){
  'use strict';
  if (typeof THREE === 'undefined') {
    console.warn('Three.js missing — hero 3D disabled.');
    return;
  }
  const container = document.getElementById('hero-3d');
  if (!container) return;

  const perf = window.SIVEXO_PERF || {};
  if (perf.reducedMotion) {
    // Static placeholder
    container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:clamp(120px,22vw,280px);font-weight:900;background:linear-gradient(135deg,#fff,#B65FF7 60%,#8F3FF0);-webkit-background-clip:text;background-clip:text;color:transparent;">X</div>';
    return;
  }

  let renderer, scene, camera, xGroup, rafId = null;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let running = true;
  let visible = true;

  function buildX(){
    const group = new THREE.Group();

    // Materials
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xE8E8EE,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0x1a0a3a,
      emissiveIntensity: 0.25
    });
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0x8F3FF0,
      metalness: 0.7,
      roughness: 0.25,
      emissive: 0x5923C0,
      emissiveIntensity: 0.7
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x14141c,
      metalness: 0.85,
      roughness: 0.3
    });

    // Build two crossed rounded boxes to form an X
    const barGeo = new THREE.BoxGeometry(3.4, 0.62, 0.62, 4, 1, 1);
    // bevel-ish: use segments

    const bar1 = new THREE.Mesh(barGeo, silverMat);
    const bar2 = new THREE.Mesh(barGeo, silverMat);
    bar2.rotation.z = Math.PI / 2;

    // Purple core slabs (thin, front-facing)
    const coreGeo = new THREE.BoxGeometry(3.3, 0.18, 0.72);
    const core1 = new THREE.Mesh(coreGeo, purpleMat);
    const core2 = new THREE.Mesh(coreGeo, purpleMat);
    core2.rotation.z = Math.PI / 2;
    core1.position.z = 0.02;
    core2.position.z = 0.02;

    // Dark endcaps for depth
    const capGeo = new THREE.BoxGeometry(0.66, 0.66, 0.66);
    const caps = [
      [1.6,0],[-1.6,0],[0,1.6],[0,-1.6]
    ].map(([x,y]) => {
      const m = new THREE.Mesh(capGeo, darkMat);
      m.position.set(x, y, 0);
      return m;
    });

    group.add(bar1, bar2, core1, core2, ...caps);

    // Wireframe outer shell for premium depth
    const shellGeo = new THREE.BoxGeometry(3.55, 3.55, 3.55);
    const edges = new THREE.EdgesGeometry(shellGeo);
    const shell = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x8F3FF0, transparent: true, opacity: 0.18 }));
    group.add(shell);

    // Orbital rings
    const ringGeo1 = new THREE.TorusGeometry(2.6, 0.012, 8, 128);
    const ring1 = new THREE.Mesh(ringGeo1, new THREE.MeshBasicMaterial({ color: 0xB65FF7, transparent: true, opacity: 0.55 }));
    ring1.rotation.x = Math.PI / 2.3;
    ring1.rotation.y = 0.5;

    const ringGeo2 = new THREE.TorusGeometry(3.1, 0.008, 8, 128);
    const ring2 = new THREE.Mesh(ringGeo2, new THREE.MeshBasicMaterial({ color: 0x8F3FF0, transparent: true, opacity: 0.35 }));
    ring2.rotation.x = Math.PI / 1.7;
    ring2.rotation.y = -0.3;

    const ringGroup = new THREE.Group();
    ringGroup.add(ring1, ring2);
    group.add(ringGroup);

    group.userData.ringGroup = ringGroup;
    return group;
  }

  function init(){
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch(e){ console.warn('Hero WebGL failed', e); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.isMobile ? 1.5 : 2));
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.7);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 5, 6);
    scene.add(key);

    const purple = new THREE.PointLight(0x8F3FF0, 2.4, 20, 2);
    purple.position.set(-4, -2, 4);
    scene.add(purple);

    const violet = new THREE.PointLight(0xB65FF7, 1.8, 20, 2);
    violet.position.set(3, 3, 3);
    scene.add(violet);

    const rim = new THREE.DirectionalLight(0x5923C0, 0.9);
    rim.position.set(-5, -3, -4);
    scene.add(rim);

    xGroup = buildX();
    scene.add(xGroup);

    // Extra subtle particles near hero — kept small
    const N = perf.isMobile ? 40 : 90;
    const pg = new THREE.BufferGeometry();
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++){
      pp[i*3] = (Math.random()-0.5)*8;
      pp[i*3+1] = (Math.random()-0.5)*8;
      pp[i*3+2] = (Math.random()-0.5)*4 - 1;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({ color: 0xB65FF7, size: 0.04, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const p = new THREE.Points(pg, pm);
    xGroup.add(p);

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    // Intersection observer to pause when hero off-screen
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      }, { threshold: 0.02 });
      io.observe(container);
    }

    loop();
  }

  function onResize(){
    if (!renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function onMouse(e){
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function onVisibility(){
    if (document.hidden) running = false;
    else { running = true; if (!rafId) loop(); }
  }

  function loop(){
    rafId = requestAnimationFrame(loop);
    if (!running || !visible) return;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    const t = performance.now() * 0.0006;

    if (xGroup) {
      xGroup.rotation.y = t * 1.1 + mouse.x * 0.5;
      xGroup.rotation.x = Math.sin(t * 0.7) * 0.15 + mouse.y * -0.35;
      xGroup.position.y = Math.sin(t * 1.4) * 0.15;
      const rg = xGroup.userData.ringGroup;
      if (rg) {
        rg.rotation.y += 0.004;
        rg.rotation.x += 0.002;
      }
    }

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
