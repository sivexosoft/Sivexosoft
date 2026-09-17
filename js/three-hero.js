/* ============================================================
   SIVEXOSOFT — three-hero.js
   Procedural hero "X" matching the SivexoSoft logo:
   4 chamfered trapezoid blades (2 purple, 2 silver/white)
   extruded into 3D with metallic materials + purple rim light.
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
     Reduced motion: static CSS/SVG fallback matching the logo
     ---------------------------------------------------------- */
  if (perf.reducedMotion) {
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 200 200" width="70%" height="70%" aria-hidden="true">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#B65FF7"/>
              <stop offset="100%" stop-color="#4B1FA8"/>
            </linearGradient>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#B9B9C2"/>
            </linearGradient>
          </defs>
          <polygon points="20,20 70,20 120,100 70,100" fill="url(#pg)"/>
          <polygon points="70,100 120,100 70,180 20,180" fill="#3A1B7E"/>
          <polygon points="130,20 180,20 130,100 80,100" fill="url(#sg)"/>
          <polygon points="80,100 130,100 180,180 130,180" fill="url(#sg)"/>
        </svg>
      </div>`;
    return;
  }

  /* ----------------------------------------------------------
     Module state
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
     Blade geometry — matches the SivexoSoft logo silhouette.

     The logo X is built from 4 "blades". Each blade is a
     quadrilateral (trapezoid) that widens outward from the
     center. We build each blade as a flat shape, then extrude
     it into a solid slab with thickness.

     Coordinate space: center of the X is at (0,0).
     Blade half-length along its axis ≈ 1.55
     Blade width at center ≈ 0.62 (half=0.31)
     Blade width at tip   ≈ 1.05 (half=0.525)
     ---------------------------------------------------------- */

  // Build one blade as a THREE.Shape (in local XY, then we rotate it)
  // p1..p4 are the 4 corners in order (counter-clockwise).
  function makeBladeShape() {
    // Blade goes from inner edge (near center) to outer tip.
    // Local coordinates: blade runs along +Y, centered on X=0.
    //
    //   (w1/2, L)  ________  (-w1/2, L)   <- outer tip (wider)
    //             |        |
    //             |        |
    //   (w2/2, 0)  -------- (-w2/2, 0)    <- inner (narrower)

    const L = 1.60;     // length from center to outer tip
    const wInner = 0.62; // width at inner end (near center of X)
    const wOuter = 1.10; // width at outer tip
    const notch = 0.02;  // tiny inset so blades meet cleanly at center

    const hIn = wInner * 0.5;
    const hOut = wOuter * 0.5;

    const shape = new THREE.Shape();
    shape.moveTo(-hIn, notch);
    shape.lineTo( hIn, notch);
    shape.lineTo( hOut, L);
    shape.lineTo(-hOut, L);
    shape.closePath();
    return shape;
  }

  // Extrude settings produce a slab with slight bevel for metallic edges
  function extrudeOptions() {
    return {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.045,
      bevelSegments: 2,
      curveSegments: 1
    };
  }

  /* ----------------------------------------------------------
     Materials — matched to the logo
     ---------------------------------------------------------- */

  // Silver/white blade: bright at outer tip, slightly darker toward center
  function silverMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xF2F2F6,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0x1a1a24,
      emissiveIntensity: 0.35
    });
  }

  // Bright purple blade (top-left of logo — light violet)
  function brightPurpleMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x8F3FF0,
      metalness: 0.72,
      roughness: 0.22,
      emissive: 0x5923C0,
      emissiveIntensity: 0.55
    });
  }

  // Deep purple blade (bottom-left — darker indigo)
  function deepPurpleMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x5923C0,
      metalness: 0.78,
      roughness: 0.28,
      emissive: 0x2A0A6E,
      emissiveIntensity: 0.5
    });
  }

  /* ----------------------------------------------------------
     Build the X
     ---------------------------------------------------------- */
  function buildX() {
    const group = new THREE.Group();

    const shape = makeBladeShape();
    const ext = extrudeOptions();

    // We create 4 blades by cloning geometry and rotating each one.
    // Blade local axis points along +Y. We rotate around Z to aim
    // it toward the correct corner.

    const geoTL = new THREE.ExtrudeGeometry(shape, ext);
    const geoTR = new THREE.ExtrudeGeometry(shape, ext);
    const geoBL = new THREE.ExtrudeGeometry(shape, ext);
    const geoBR = new THREE.ExtrudeGeometry(shape, ext);

    // Top-Left: aim toward upper-left  → 135°
    const bladeTL = new THREE.Mesh(geoTL, brightPurpleMaterial());
    bladeTL.rotation.z = Math.PI * 0.75;

    // Top-Right: aim toward upper-right → 45°
    const bladeTR = new THREE.Mesh(geoTR, silverMaterial());
    bladeTR.rotation.z = Math.PI * 0.25;

    // Bottom-Left: aim toward lower-left → 225°
    const bladeBL = new THREE.Mesh(geoBL, deepPurpleMaterial());
    bladeBL.rotation.z = Math.PI * 1.25;

    // Bottom-Right: aim toward lower-right → 315°
    const bladeBR = new THREE.Mesh(geoBR, silverMaterial());
    bladeBR.rotation.z = Math.PI * 1.75;

    // Center everything on Z so it's a slab centered at origin
    const zOffset = -ext.depth * 0.5;
    [bladeTL, bladeTR, bladeBL, bladeBR].forEach((b) => {
      b.position.z = zOffset;
    });

    group.add(bladeTL, bladeTR, bladeBL, bladeBR);

    // ---- Center hub: a small dark diamond that covers the seams ----
    const hubShape = new THREE.Shape();
    const h = 0.42;
    hubShape.moveTo(0, h);
    hubShape.lineTo(h, 0);
    hubShape.lineTo(0, -h);
    hubShape.lineTo(-h, 0);
    hubShape.closePath();

    const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
      depth: ext.depth + 0.06,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x14141c,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x2A0A6E,
      emissiveIntensity: 0.35
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.z = -(ext.depth + 0.06) * 0.5 - 0.015;
    group.add(hub);

    // ---- Subtle wireframe outline shell for premium depth ----
    const shellGeo = new THREE.BoxGeometry(3.8, 3.8, 1.1);
    const edges = new THREE.EdgesGeometry(shellGeo);
    const shell = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0x8F3FF0,
        transparent: true,
        opacity: 0.14
      })
    );
    group.add(shell);

    // ---- Orbital rings (matches logo's premium tech feel) ----
    const rg = new THREE.Group();

    const ringGeo1 = new THREE.TorusGeometry(2.75, 0.012, 8, 140);
    const ring1 = new THREE.Mesh(
      ringGeo1,
      new THREE.MeshBasicMaterial({
        color: 0xB65FF7,
        transparent: true,
        opacity: 0.55
      })
    );
    ring1.rotation.x = Math.PI / 2.35;
    ring1.rotation.y = 0.45;

    const ringGeo2 = new THREE.TorusGeometry(3.25, 0.008, 8, 140);
    const ring2 = new THREE.Mesh(
      ringGeo2,
      new THREE.MeshBasicMaterial({
        color: 0x8F3FF0,
        transparent: true,
        opacity: 0.32
      })
    );
    ring2.rotation.x = Math.PI / 1.75;
    ring2.rotation.y = -0.32;

    const ringGeo3 = new THREE.TorusGeometry(2.35, 0.006, 8, 140);
    const ring3 = new THREE.Mesh(
      ringGeo3,
      new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.12
      })
    );
    ring3.rotation.x = Math.PI / 3;
    ring3.rotation.y = 1.1;

    rg.add(ring1, ring2, ring3);
    group.add(rg);
    group.userData.ringGroup = rg;

    // ---- Very light inner particle dust around the X ----
    const N = perf.isMobile ? 30 : 70;
    const pg = new THREE.BufferGeometry();
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Distribute in a shell around the X
      const r = 1.8 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pp[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      pp[i * 3 + 2] = r * Math.cos(phi) * 0.6;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({
      color: 0xB65FF7,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    group.add(new THREE.Points(pg, pm));

    return group;
  }

  /* ----------------------------------------------------------
     Scene setup
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
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);

    // Make the canvas fill the container
    const canvasEl = renderer.domElement;
    canvasEl.style.position = 'absolute';
    canvasEl.style.inset = '0';
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.display = 'block';
    container.appendChild(canvasEl);
    return true;
  }

  function initLights() {
    // Soft base
    scene.add(new THREE.AmbientLight(0x2a2a3a, 0.65));

    // Key light from top-front (gives the silver blades their shine)
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(4, 6, 6);
    scene.add(key);

    // Fill light from top-left (soft)
    const fill = new THREE.DirectionalLight(0xB65FF7, 0.55);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    // Strong purple point light — creates the purple glow on silver edges
    const purpleMain = new THREE.PointLight(0x8F3FF0, 3.2, 22, 2);
    purpleMain.position.set(-3.5, -2.5, 4.5);
    scene.add(purpleMain);

    // Secondary violet rim
    const violetRim = new THREE.PointLight(0xB65FF7, 2.0, 20, 2);
    violetRim.position.set(3.5, 2.8, 3.5);
    scene.add(violetRim);

    // Deep back light for silhouette definition
    const back = new THREE.DirectionalLight(0x5923C0, 0.9);
    back.position.set(-4, -4, -5);
    scene.add(back);
  }

  function initScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 0, 8.4);

    initLights();

    xGroup = buildX();
    scene.add(xGroup);

    // Slight initial tilt so it never looks perfectly flat
    xGroup.rotation.x = -0.08;
  }

  /* ----------------------------------------------------------
     Events
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
    if (document.hidden) {
      running = false;
    } else if (!disposed) {
      running = true;
      if (!rafId) loop();
    }
  }

  /* ----------------------------------------------------------
     Render loop
     ---------------------------------------------------------- */
  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    if (!running || !visible || !renderer) return;

    // Smooth mouse lerp
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    const t = performance.now() * 0.0006;

    if (xGroup) {
      // Slowly rotate + subtle float
      xGroup.rotation.y = t * 0.9 + mouse.x * 0.55;
      xGroup.rotation.x = -0.08 + Math.sin(t * 0.8) * 0.12 + mouse.y * -0.35;
      xGroup.rotation.z = Math.sin(t * 0.5) * 0.06;
      xGroup.position.y = Math.sin(t * 1.3) * 0.14;

      if (ringGroup) {
        ringGroup.rotation.y += 0.0035;
        ringGroup.rotation.x += 0.0018;
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

    // Pause rendering when hero is off-screen
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      }, { threshold: 0.02 });
      io.observe(container);
    }

    // Trigger initial size sync (layout may not be final at DOMContentLoaded)
    requestAnimationFrame(() => {
      onResize();
      loop();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
