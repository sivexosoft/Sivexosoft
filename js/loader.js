(function(){
  'use strict';
  const loader = document.getElementById('loader');
  const bar = loader ? loader.querySelector('.loader__bar-fill') : null;
  if (!loader) return;

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    loader.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
    setTimeout(() => {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    }, 900);
  };

  // Animate progress bar
  let p = 0;
  const start = performance.now();
  const minDur = 1200;
  const maxDur = 1800;

  function tick(now){
    const t = now - start;
    const target = Math.min(100, (t / maxDur) * 100);
    p = Math.max(p, target);
    if (bar) bar.style.width = p + '%';
    if (t < maxDur) {
      requestAnimationFrame(tick);
    } else {
      if (bar) bar.style.width = '100%';
      setTimeout(done, 150);
    }
  }
  requestAnimationFrame(tick);

  // Hard fail-safes
  setTimeout(done, minDur + 800); // absolute max fallback
  window.addEventListener('load', () => {
    // Wait for a small buffer after load to allow hero to appear
    setTimeout(() => {
      if (bar) bar.style.width = '100%';
      setTimeout(done, 300);
    }, 500);
  });

  // Expose manual
  window.__sivexoLoaderDone = done;
})();
