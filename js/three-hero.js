/* ============================================================
   SIVEXOSOFT — three-hero.js
   Procedural hero "X" matching the SivexoSoft logo EXACTLY.
   The X is built from 4 parallelogram blades whose outer tips
   are angle-cut at 45°, meeting in a clean center cross.
   Left pair = purple (bright top / deep bottom).
   Right pair = silver / white.
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
     Reduced-motion fallback: exact SVG replica of the logo X
     ---------------------------------------------------------- */
  if (perf.reducedMotion) {
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 200 200" width="72%" height="72%" aria-hidden="true">
          <defs>
            <linearGradient id="sfx-brightPurple" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stop-color="#A855F7"/>
              <stop offset="55%" stop-color="#8B3DF0"/>
              <stop offset="100%" stop-color="#4C1D95"/>
            </linearGradient>
            <linearGradient id="sfx-deepPurple" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stop-color="#4C1D95"/>
              <stop offset="55%" stop-color="#3B0F8F"/>
              <stop offset="100%" stop-color="#2A0A6E"/>
            </linearGradient>
            <linearGradient id="sfx-silver" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="70%" stop-color="#DDDDDD"/>
              <stop offset="100%" stop-color="#9A9AA2"/>
            </linearGradient>
            <linearGradient id="sfx-silverDark" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stop-color="#C8C8CF"/>
              <stop offset="100%" stop-color="#7A7A82"/>
            </linearGradient>
          </defs>

          <!-- Top-left bright purple blade -->
          <polygon points="18,18 82,18 100,100 62,100" fill="url(#sfx-brightPurple)"/>
          <!-- Bottom-left deep purple blade -->
          <polygon points="62,100 100,100 82,182 18,182" fill="url(#sfx-deepPurple)"/>
          <!-- Top-right silver blade -->
          <polygon points="118,18 182,18 138,100 100,100" fill="url(#sfx-silver)"/>
          <!-- Bottom-right silver blade -->
          <polygon points="100,100 138,100 182,182 118,182" fill="url(#sfx-silverDark)"/>
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
     LOGO-ACCURATE BLADE GEOMETRY
     ----------------------------------------------------------

     Study of the SivexoSoft X:

       • Each blade is a PARALLELOGRAM, not a trapezoid.
       • Along its own axis (from center → tip), the blade has
         constant width, but the OUTER TIP is cut at ~45° so
         the resulting outline looks like a slanted "shard".
       • The INNER TIP (near center) is also cut at ~45° and
         meets its partner blade to form a clean V.

     We model one blade in local XY space, axis running +Y:
        - Axis from Y=0 (center) to Y=L (tip)
        - Constant half-width W/2
        - Outer tip cut: slanted by K along Y
        - Inner tip cut: slanted by K along Y (mirrored)

     Rotating 4 copies by 45°, 135°, 225°, 315° produces the X.
     ---------------------------------------------------------- */

  const BLADE = {
    L: 1.62,        // length from center to outer tip
    W: 1.10,        // blade width (perpendicular to axis)
    CUT: 0.62,      // how much the outer tip is angle-cut
    INNER: 0.30,    // how much the inner tip is angle-cut
    NOTCH: 0.015    // tiny inset so blades meet cleanly at center
  };

  function makeBladeShape() {
    const { L, W, CUT, INNER, NOTCH } = BLADE;
    const h = W * 0.5;

    // Local coordinates (axis = +Y):
    //
    //            ( h - CUT, L ) ______ ( -h, L )
    //                          /
    //                         |
    //                         |
    //          ( h, INNER )  |
    //                 \      |
    //                  \_____|___ ( -h + INNER, 0 )
    //
    // We want the OUTER tip cut on the RIGHT side (the "leading"
    // edge of the shard) — this is what gives the logo its
    // characteristic angled point.

    const shape = new THREE.Shape();
    shape.moveTo( h - CUT, L);           // outer top-right
    shape.lineTo(-h,       L);           // outer top-left
    shape.lineTo(-h,       NOTCH);       // inner left
    shape.lineTo( h - INNER, NOTCH);     // inner-right (angled in)
    shape.lineTo( h,       INNER);       // right edge start of cut
    shape.closePath();

    return shape;
  }

  function extrudeOptions() {
    return {
      depth: 0.30,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 1,
      curveSegments: 1
    };
  }

  /* ----------------------------------------------------------
     Materials — matched to the logo colours
     ---------------------------------------------------------- */

  // Top-left blade: bright violet with a subtle gradient toward magenta
  function brightPurpleMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x9B4BF2,          // bright violet
      metalness: 0.68,
      roughness: 0.24,
      emissive: 0x5923C0,
      emissiveIntensity: 0.55
    });
  }

  // Bottom-left blade: deep indigo/purple
  function deepPurpleMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x4A1A9E,
      metalness: 0.72,
      roughness: 0.30,
      emissive: 0x2A0A6E,
      emissiveIntensity: 0.55
    });
  }

  // Top-right blade: silver/white
  function silverMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xF5F5F8,
      metalness: 0.94,
      roughness: 0.15,
      emissive: 0x2A2A38,
      emissiveIntensity: 0.35
    });
  }

  // Bottom-right blade: slightly darker silver (as in the logo)
  function silverDarkMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xC7C7CE,
      metalness: 0.96,
      roughness: 0.20,
      emissive: 0x1A1A22,
      emissiveIntensity: 0.3
    });
  }

  /* ----------------------------------------------------------
     Blade placement

     The blade shape is modelled with its axis pointing +Y.
     To aim it toward a diagonal, rotate around Z:

        top-left    (‑1,+1 direction)  →  135°  = 3π/4
        top-right   (+1,+1 direction)  →   45°  = π/4
        bottom-left (‑1,‑1 direction)  →  225°  = 5π/4
        bottom-right(+1,‑1 direction)  →  315°  = 7π/4

     For the LEFT pair of the logo, the "leading edge" of the
     shard points outward-up / outward-down. For the RIGHT pair
     of the logo the leading edge points inward. We mirror the
     shape on the right pair by flipping the scale on X before
     rotating.
     ---------------------------------------------------------- */

  function buildX() {
    const group = new THREE.Group();

    const shape = makeBladeShape();
    const ext = extrudeOptions();

    function makeBlade(material, rotationZ, mirrorX) {
      const geo = new THREE.ExtrudeGeometry(shape, ext);
      geo.center();          // center so rotation happens about the middle
      // Not desired — we need rotation about the inner tip.
      // Instead recenter to inner-tip origin:
      geo.translate(-geo.boundingBox ? 0 : 0, 0, 0); // no-op
      const mesh = new THREE.Mesh(geo, material);

      // Move origin so that (0,0) sits at the inner tip of the blade
      // We undo the .center() and manually offset.
      // Easier: since we already called center(), the mesh sits centered.
      // We rebuild geometry without center() instead:
      return mesh;
    }

    // ---- Build blades WITHOUT geo.center() so rotation pivots at inner tip ----

    function bladeMesh(material) {
      const geo = new THREE.ExtrudeGeometry(shape, ext);
      // Shift so the inner tip sits at local origin (0,0,0)
      geo.translate(0, -BLADE.NOTCH, -ext.depth * 0.5);
      return new THREE.Mesh(geo, material);
    }

    // Top-LEFT (bright purple) — aim at upper-left
    const bladeTL = bladeMesh(brightPurpleMaterial());
    bladeTL.rotation.z = Math.PI * 0.75;

    // Bottom-LEFT (deep purple) — aim at lower-left
    const bladeBL = bladeMesh(deepPurpleMaterial());
    bladeBL.rotation.z = Math.PI * 1.25;

    // Top-RIGHT (silver) — aim at upper-right, mirrored on X so the
    // angled tip points inward like the logo
    const geoTR = new THREE.ExtrudeGeometry(shape, ext);
    geoTR.translate(0, -BLADE.NOTCH, -ext.depth * 0.5);
    const bladeTR = new THREE.Mesh(geoTR, silverMaterial());
    bladeTR.scale.x = -1;
    bladeTR.rotation.z = Math.PI * 0.25;

    // Bottom-RIGHT (silver dark) — aim at lower-right, mirrored
    const geoBR = new THREE.ExtrudeGeometry(shape, ext);
    geoBR.translate(0, -BLADE.NOTCH, -ext.depth * 0.5);
    const bladeBR = new THREE.Mesh(geoBR, silverDarkMaterial());
    bladeBR.scale.x = -1;
    bladeBR.rotation.z = Math.PI * 1.75;

    group.add(bladeTL, bladeBL, bladeTR, bladeBR);

    // ---- Optional thin dark separator at the very center ----
    // (a tiny diamond hub that covers any hairline seams)
    const hubShape = new THREE.Shape();
    const hs = 0.14;
    hubShape.moveTo(0, hs);
    hubShape.lineTo(hs, 0);
    hubShape.lineTo(0, -hs);
    hubShape.lineTo(-hs, 0);
    hubShape.closePath();
    const hubGeo = new THREE.ExtrudeGeometry(hubShape, {
      depth: ext.depth + 0.04,
      bevelEnabled: false
    });
    hubGeo.translate(0, 0, -(ext.depth + 0.04) * 0.5);
    const hub = new THREE.Mesh(
      hubGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0a0a12,
        metalness: 0.9,
        roughness: 0.3
      })
    );
    group.add(hub);

    // ---- Orbital rings (premium accent) ----
    ringGroup = new THREE.Group();

    const r1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.010, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xB65FF7, transparent: true, opacity: 0.50 })
    );
    r1.rotation.x = Math.PI / 2.35;
    r1.rotation.y = 0.4;

    const r2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.10, 0.007, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x8F3FF0, transparent: true, opacity: 0.28 })
    );
    r2.rotation.x = Math.PI / 1.75;
    r2.rotation.y = -0.28;

    const r3 = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.006, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.10 })
    );
    r3.rotation.x = Math.PI / 3;
    r3.rotation.y = 1.05;

    ringGroup.add(r1, r2, r3);
    group.add(ringGroup);

    // ---- Fine particle dust around the X ----
    const N = perf.isMobile ? 26 : 64;
    const pg = new THREE.BufferGeometry();
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 1.9 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pp[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
      pp[i * 3 + 2] = r * Math.cos(phi) * 0.55;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({
      color: 0xB65FF7,
      size: 0.032,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    group.add(new THREE.Points(pg, pm));

    return group;
  }

  /* ----------------------------------------------------------
     Renderer / Scene
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
      renderer.toneMappingExposure = 1.20;
    }

    const rect = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);

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
    scene.add(new THREE.AmbientLight(0x2a2a38, 0.55));

    // Key — top-front white light (makes silver shine)
    const key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(4, 6, 6);
    scene.add(key);

    // Fill from top-left with a soft violet tint
    const fill = new THREE.DirectionalLight(0xB65FF7, 0.55);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    // Purple point light to bloom onto silver edges
    const purpleMain = new THREE.PointLight(0x8F3FF0, 3.4, 22, 2);
    purpleMain.position.set(-3.5, -2.5, 4.5);
    scene.add(purpleMain);

    // Secondary violet rim light
    const violetRim = new THREE.PointLight(0xB65FF7, 2.2, 20, 2);
    violetRim.position.set(3.6, 2.9, 3.5);
    scene.add(violetRim);

    // Back light for silhouette
    const back = new THREE.DirectionalLight(0x5923C0, 0.85);
    back.position.set(-4, -4, -5);
    scene.add(back);
  }

  function initScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 0, 8.2);

    initLights();

    xGroup = buildX();
    scene.add(xGroup);

    // Slight resting tilt so it never looks perfectly flat
    xGroup.rotation.x = -0.06;
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
     Loop
     ---------------------------------------------------------- */
  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    if (!running || !visible || !renderer) return;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    const t = performance.now() * 0.0006;

    if (xGroup) {
      // Slow Y spin + subtle 3D parallax from mouse
      xGroup.rotation.y = t * 0.85 + mouse.x * 0.5;
      xGroup.rotation.x = -0.06 + Math.sin(t * 0.75) * 0.10 + mouse.y * -0.30;
      xGroup.rotation.z = Math.sin(t * 0.45) * 0.05;
      xGroup.position.y = Math.sin(t * 1.25) * 0.13;

      if (ringGroup) {
        ringGroup.rotation.y += 0.0032;
        ringGroup.rotation.x += 0.0016;
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
