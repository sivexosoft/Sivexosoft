(function(){
  'use strict';
  const perf = window.SIVEXO_PERF || {};

  function revealFallback(){
    // Ensure content is visible even if GSAP is missing
    const els = document.querySelectorAll('[data-reveal], .service-card, .why__feature, .process__step, .faq__item, .stat');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));

    // Also mark hero lines in immediately
    document.querySelectorAll('.hero__title .line').forEach(l => l.classList.add('is-in'));
  }

  function initGSAP(){
    if (!window.gsap) return revealFallback();
    const { gsap } = window;
    const hasST = !!window.ScrollTrigger;
    if (hasST) gsap.registerPlugin(window.ScrollTrigger);

    if (perf.reducedMotion) {
      gsap.set('[data-reveal], .service-card, .why__feature, .process__step, .faq__item, .stat', { opacity: 1, y: 0, clearProps: 'transform' });
      document.querySelectorAll('.hero__title .line').forEach(l => l.classList.add('is-in'));
      return;
    }

    // Hero entrance
    const heroLines = document.querySelectorAll('.hero__title .line');
    const heroReveals = document.querySelectorAll('.hero [data-reveal]');
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(heroLines, { y: 0, duration: 1.2, stagger: 0.12, onStart(){
        heroLines.forEach(l => l.classList.add('is-in'));
      }})
      .to(heroReveals, { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, '-=0.9')
      .from('.hero__visual', { opacity: 0, scale: 0.92, duration: 1.4, ease: 'power3.out' }, '-=1.2')
      .from('.hero__scroll', { opacity: 0, duration: 0.8 }, '-=0.5');

    // Generic reveals
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: hasST ? { trigger: el, start: 'top 85%' } : undefined
      });
    });

    // Grids
    const grids = [
      { sel: '.services__grid', children: '.service-card' },
      { sel: '.why__features', children: '.why__feature' },
      { sel: '.process__grid', children: '.process__step' },
      { sel: '.faq__list', children: '.faq__item' }
    ];
    grids.forEach(g => {
      const grid = document.querySelector(g.sel);
      if (!grid) return;
      const kids = grid.querySelectorAll(g.children);
      if (!kids.length) return;
      gsap.to(kids, {
        opacity: 1, y: 0, duration: 0.75, ease: '
