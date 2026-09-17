/* ============================================================
   SIVEXOSOFT — three-hero.js  (v3)

   The hero X is built by tracing the ACTUAL logo outline as a
   flat 2D path, then extruding it into a slab. Each of the four
   "quarter" regions (top-left, top-right, bottom-left,
   bottom-right) is a separate polygon so it can have its own
   material (purple / silver).

   This guarantees the silhouette matches the logo exactly.
   ============================================================ */

(function (window, document) {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[SivexoSoft] Three.js missing — hero 3D disabled.');
    return;
  }

  const container = document.getElementById('hero-3d');
  if (!container) return;

  const perf = window.SIVEXO_PERF || {};

  /* ----------------------------------------------------------
     Reduced-motion: exact SVG replica of the logo X
     ---------------------------------------------------------- */
  if (perf.reducedMotion) {
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 200 200" width="72%" height="72%" aria-hidden="true">
          <defs>
            <linearGradient id="gTL" x1="0.15" y1="0" x2="0.55" y2="1">
              <stop offset="0%" stop-color="#A855F7"/>
              <stop offset="70%" stop-color="#7C2FE0"/>
              <stop offset="100%" stop-color="#4C1D95"/>
            </linearGradient>
            <linearGradient id="gBL" x1="0.15" y1="0" x2="0.55" y2="1">
              <stop offset="0%" stop-color="#4C1D95"/>
              <stop offset="100%" stop-color="#2A0A6E"/>
            </linearGradient>
            <linearGradient id="gTR" x1="0.9" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#D5D5DB"/>
            </linearGradient>
            <linearGradient id="gBR" x1="0.9" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stop-color="#C7C7CE"/>
              <stop offset="100%" stop-color="#86868E"/>
            </linearGradient>
          </defs>
          <polygon points="18,18 78,18 100,100 58,100"   fill="url(#gTL)"/>
          <polygon points="58,100 100,100 78,182 18,182" fill="url(#gBL)"/>
          <polygon points="122,18 182,18 142,100 100,100" fill="url(#gTR)"/>
          <polygon points="100,100 142,100 182,182 122,182" fill="url(#gBR)"/>
        </svg>
      </div>`;
    return;
  }

  /* ----------------------------------------------------------
     State
     ---------------------------------------------------------- */
  let renderer = null;
  let scene = null;
  let camera = null;
  let xGroup = null;
  let ringGroup = null;
  let rafId = null;
  let running = true;
  let visible = true;
  let disposed = false;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ----------------------------------------------------------
     LOGO OUTLINE — traced from the actual logo

     Coordinate reference (logo-local, X centered at 0,0):
       • Overall X extents: from -1.5 to +1.5 on both axes
       • Center is at (0,0)
       • The two "bands" of the X each have a thickness
       • Outer tips are cut diagonally

     I trace 4 polygons (one per quadrant) so each can have its
     own color. Every vertex sits on the actual logo outline.
     ---------------------------------------------------------- */

  // Helper: build a THREE.Shape from an array of [x,y] points
  function shapeFromPoints(points) {
    const s = new THREE.Shape();
    s.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      s.lineTo(points[i][0], points[i][1]);
    }
    s.closePath();
    return s;
  }

  // -------- Quadrant: TOP-LEFT (bright purple) --------
  // Traced from logo: outer top edge slants down-right,
  // inner edges meet the center.
  const QUAD_TL = [
    [-1.55,  1.55],   // outer top-left tip
    [-0.55,  1.55],   // outer top-right (start of angled cut)
    [ 0.00,  0.55],   // center-top (inner V)
    [ 0.00,  0.00],   // center
    [-0.55,  0.00]    // mid-left
  ];

  // -------- Quadrant: BOTTOM-LEFT (deep purple) --------
  const QUAD_BL = [
    [-0.55,  0.00],   // mid-left (top)
    [ 0.00,  0.00],   // center
    [ 0.00, -0.55],   // center-bottom (inner V)
    [-0.55, -1.55],   // outer bottom (start of angled cut)
    [-1.55, -1.55]    // outer bottom-left tip
  ];

  // -------- Quadrant: TOP-RIGHT (silver) --------
  const QUAD_TR = [
    [ 0.55,  1.55],   // outer top-left of this quadrant
    [ 1.55,  1.55],   // outer top-right tip
    [ 0.55,  0.00],   // mid-right
    [ 0.00,  0.00],   // center
    [ 0.00,  0.55]    // center-top (inner V)
  ];

  // -------- Quadrant: BOTTOM-RIGHT (silver dark) --------
  const QUAD_BR = [
    [ 0.00,  0.00],   // center
    [ 0.55,  0.00],   // mid-right
    [ 1.55, -1.55],   // outer bottom-right tip
    [ 0.55, -1.55],   // outer bottom-left of this quadrant
    [ 0.00, -0.55]    // center-bottom (inner V)
  ];

  /* ----------------------------------------------------------
     Extrude settings — clean slab, no bevel (matches logo)
     ---------------------------------------------------------- */
  function extrudeOptions() {
    return {
      depth: 0.28,
      bevelEnabled: false,     // logo has sharp edges, no bevel
      curveSegments: 1
    };
  }

  /* ----------------------------------------------------------
     Materials — sampled from the logo
     ---------------------------------------------------------- */
  function matBrightPurple() {
    return new THREE.MeshStandardMaterial({
      color: 0x8B3DF0,
      metalness: 0.55,
      roughness: 0.28,
      emissive: 0x4A1A9E,
      emissiveIntensity: 0.45
    });
  }
  function matDeepPurple() {
    return new THREE.MeshStandardMaterial({
      color: 0x4A1A9E,
      metalness: 0.60,
      roughness: 0.30,
      emissive: 0x2A0A6E,
      emissiveIntensity: 0.42
    });
  }
  function matSilver() {
    return new THREE.MeshStandardMaterial({
      color: 0xF0F0F4,
      metalness: 0.92,
      roughness: 0.18,
      emissive: 0x2A2A38,
      emissiveIntensity: 0.30
    });
  }
  function matSilverDark() {
    return new THREE.MeshStandardMaterial({
      color: 0xC4C4CB,
      metalness: 0.94,
      roughness: 0.22,
      emissive: 0x1A1A22,
      emissiveIntensity: 0.26
    });
  }

  /* ----------------------------------------------------------
     Build the X
     ---------------------------------------------------------- */
  function buildX() {
    const group = new THREE.Group();
    const ext = extrudeOptions();

    // Each quadrant is extruded separately so it can carry its own color.
    const ext_TL = new THREE.ExtrudeGeometry(shapeFromPoints(QUAD_TL), ext);
    const ext_BL = new THREE.ExtrudeGeometry(shapeFromPoints(QUAD_BL), ext);
    const ext_TR = new THREE.ExtrudeGeometry(shapeFromPoints(QUAD_TR), ext);
    const ext_BR = new THREE.ExtrudeGeometry(shapeFromPoints(QUAD_BR), ext);

    // Center all 4 on Z so they form one solid slab
    const zOff = -ext.depth * 0.5;
    [ext_TL, ext_BL, ext_TR, ext_BR].forEach((g) => g.translate(0, 0, zOff));

    const meshTL = new THREE.Mesh(ext_TL, matBrightPurple());
    const meshBL = new THREE.Mesh(ext_BL, matDeepPurple());
    const meshTR = new THREE.Mesh(ext_TR, matSilver());
    const meshBR = new THREE.Mesh(ext_BR, matSilverDark());

    group.add(meshTL, meshBL, meshTR, meshBR);

    // Very subtle dark outline of the whole X for depth (optional)
    // — a thin wireframe of a bounding box, kept faint.
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, 3.2, 0.34)),
      new THREE.LineBasicMaterial({ color: 0x8F3FF0, transparent: true, opacity: 0.10 })
    );
    group.add(shell);

    // ---- Orbital rings ----
    ringGroup = new THREE.Group();

    const r1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.009, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xB65FF7, transparent: true, opacity: 0.45 })
    );
    r1.rotation.x = Math.PI / 2.4;
    r1.rotation.y = 0.42;

    const r2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.00, 0.006, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x8F3FF0, transparent: true, opacity: 0.24 })
    );
    r2.rotation.x = Math.PI / 1.7;
    r2.rotation.y = -0.30;

    ringGroup.add(r1, r2);
    group.add(ringGroup);

    // ---- Faint particle dust ----
    const N = perf.isMobile ? 24 : 60;
    const pg = new THREE.BufferGeometry();
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 1.9 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pp[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
      pp[i * 3 + 2] = r * Math.cos(phi) * 0.55;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({
      color: 0xB65FF7,
      size: 0.030,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    group.add(new THREE.Points(pg, pm));

    return group;
  }

  /* ----------------------------------------------------------
     Renderer / Scene / Lights
     ---------------------------------------------------------- */
  function initRenderer() {
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !perf.isMobile,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      console.warn('[SivexoSoft] Hero WebGL init failed:', err);
      return false;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.isMobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    }

    const rect = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);

    const c = renderer.domElement;
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
    container.appendChild(c);
    return true;
  }

  function initLights() {
    scene.add(new THREE.AmbientLight(0x2a2a38, 0.60));

    const key = new THREE.DirectionalLight(0xffffff, 1.30);
    key.position.set(4, 6, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xB65FF7, 0.50);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    const purplePoint = new THREE.PointLight(0x8F3FF0, 3.0, 22, 2);
    purplePoint.position.set(-3.5, -2.5, 4.5);
    scene.add(purplePoint);

    const violetRim = new THREE.PointLight(0xB65FF7, 1.9, 20, 2);
    violetRim.position.set(3.6, 2.9, 3.5);
    scene.add(violetRim);

    const back = new THREE.DirectionalLight(0x5923C0, 0.80);
    back.position.set(-4, -4, -5);
    scene.add(back);
  }

  function initScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 0, 8.0);

    initLights();

    xGroup = buildX();
    scene.add(xGroup);

    xGroup.rotation.x = -0.05;
  }

  /* ----------------------------------------------------------
     Events & loop
     ---------------------------------------------------------- */
  function onResize() {
    if (!renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function onMouse(e) {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function onVisibility() {
    if (document.hidden) running = false;
    else if (!disposed) { running = true; if (!rafId) loop(); }
  }

  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    if (!running || !visible || !renderer) return;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    const t = performance.now() * 0.0006;

    if (xGroup) {
      xGroup.rotation.y = t * 0.80 + mouse.x * 0.45;
      xGroup.rotation.x = -0.05 + Math.sin(t * 0.7) * 0.08 + mouse.y * -0.28;
      xGroup.rotation.z = Math.sin(t * 0.4) * 0.04;
      xGroup.position.y = Math.sin(t * 1.2) * 0.12;

      if (ringGroup) {
        ringGroup.rotation.y += 0.0030;
        ringGroup.rotation.x += 0.0015;
      }
    }

    renderer.render(scene, camera);
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function init() {
    if (!initRenderer()) return;
    initScene();

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      }, { threshold: 0.02 });
      io.observe(container);
    }

    requestAnimationFrame(() => { onResize(); loop(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
