(function(){
  'use strict';
  // Global error guard: make sure loader never gets stuck
  window.addEventListener('error', (e) => {
    console.warn('Runtime error caught:', e.message);
    if (typeof window.__sivexoLoaderDone === 'function') {
      window.__sivexoLoaderDone();
    }
  });
  window.addEventListener('unhandledrejection', () => {
    if (typeof window.__sivexoLoaderDone === 'function') {
      window.__sivexoLoaderDone();
    }
  });

  // If images fail, keep layout clean
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.visibility = 'hidden';
    });
  });

  // Prevent horizontal overflow glitches
  document.documentElement.style.overflowX = 'hidden';
})();
