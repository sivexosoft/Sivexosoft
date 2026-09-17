(function(){
  'use strict';
  const perf = window.SIVEXO_PERF || {};
  let lenis = null;

  function init(){
    if (perf.reducedMotion) {
      // Fallback smooth scroll for anchors only
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
          const id = a.getAttribute('href');
          if (!id || id === '#') return;
          const el = document.querySelector(id);
          if (!el) return;
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', id);
        });
      });
      return;
    }

    if (typeof Lenis === 'undefined') {
      // graceful fallback
      document.documentElement.style.scrollBehavior = 'smooth';
      return;
    }

    try {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 1.5,
        wheelMultiplier: 1
      });
      window.__sivexoLenis = lenis;

      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }

      // Anchor links
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (!id || id === '#') return;
          const el = document.querySelector(id);
          if (!el) return;
          e.preventDefault();
          const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76;
          lenis.scrollTo(el, { offset: -headerH + 4 });
          history.pushState(null, '', id);
          // Close mobile nav
          const nav = document.querySelector('.nav');
          const tog = document.getElementById('menu-toggle');
          if (nav && nav.classList.contains('is-open')) {
            nav.classList.remove('is-open');
            if (tog) { tog.classList.remove('is-open'); tog.setAttribute('aria-expanded','false'); }
          }
        });
      });
    } catch (err) {
      console.warn('Lenis failed, falling back to native smooth scroll', err);
      document.documentElement.style.scrollBehavior = 'smooth';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Pause Lenis when hidden
  document.addEventListener('visibilitychange', () => {
    if (!lenis) return;
    if (document.hidden) lenis.stop && lenis.stop();
    else lenis.start && lenis.start();
  });
})();
