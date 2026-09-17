(function(){
  'use strict';
  const header = document.getElementById('header');
  if (!header) return;

  let lastY = -1;
  function onScroll(){
    const y = window.scrollY || window.pageYOffset;
    if (y > 20) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
    if (y !== lastY) lastY = y;

    // Active link
    const sections = ['home','services','about','process','why-us','faq','contact'];
    let active = 'home';
    const probe = y + 120;
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= probe) active = id;
    }
    document.querySelectorAll('.nav__link').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-active', href === '#' + active);
    });
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });

  onScroll();
})();
