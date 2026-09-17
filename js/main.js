/* ============================================================
   SIVEXOSOFT — main.js
   Application entry point, error guards, and boot orchestration.
   ============================================================ */

(function (window, document) {
  'use strict';

  /* ----------------------------------------------------------
     0. Constants & config
     ---------------------------------------------------------- */
  const CONFIG = {
    LOADER_FALLBACK_KEY: '__sivexoLoaderDone',
    MAX_ERRORS_REPORTED: 20,
    ERROR_DEDUPE_WINDOW_MS: 2000,
    HIDE_BROKEN_IMAGES: true,
    LOCK_HORIZONTAL_OVERFLOW: true,
    DEBUG: false
  };

  const STATE = {
    booted: false,
    errorCount: 0,
    recentErrors: new Map(), // key -> timestamp
    bootTasks: [],
    listenersBound: false
  };

  /* ----------------------------------------------------------
     1. Tiny logger
     ---------------------------------------------------------- */
  const log = {
    info(...args) {
      if (CONFIG.DEBUG) console.info('[SivexoSoft]', ...args);
    },
    warn(...args) {
      console.warn('[SivexoSoft]', ...args);
    },
    error(...args) {
      console.error('[SivexoSoft]', ...args);
    }
  };

  /* ----------------------------------------------------------
     2. Safe utilities
     ---------------------------------------------------------- */
  const util = {
    isFunction(fn) {
      return typeof fn === 'function';
    },
    isString(v) {
      return typeof v === 'string';
    },
    now() {
      return (window.performance && performance.now)
        ? performance.now()
        : Date.now();
    },
    safeCall(fn, context, ...args) {
      if (!util.isFunction(fn)) return undefined;
      try {
        return fn.apply(context || null, args);
      } catch (err) {
        log.warn('safeCall failed:', err && err.message ? err.message : err);
        return undefined;
      }
    },
    qsa(selector, root) {
      try {
        return (root || document).querySelectorAll(selector);
      } catch (err) {
        log.warn('querySelectorAll failed for:', selector);
        return [];
      }
    },
    byId(id) {
      try {
        return document.getElementById(id);
      } catch (_) {
        return null;
      }
    }
  };

  /* ----------------------------------------------------------
     3. Error deduplication
     ---------------------------------------------------------- */
  function shouldReportError(key) {
    const t = util.now();
    const last = STATE.recentErrors.get(key);

    // Prune stale entries occasionally
    if (STATE.recentErrors.size > 50) {
      for (const [k, ts] of STATE.recentErrors) {
        if (t - ts > CONFIG.ERROR_DEDUPE_WINDOW_MS * 5) {
          STATE.recentErrors.delete(k);
        }
      }
    }

    if (last !== undefined && (t - last) < CONFIG.ERROR_DEDUPE_WINDOW_MS) {
      return false;
    }
    STATE.recentErrors.set(key, t);
    return true;
  }

  /* ----------------------------------------------------------
     4. Loader fail-safe
     ---------------------------------------------------------- */
  const LoaderGuard = {
    trigger() {
      const fn = window[CONFIG.LOADER_FALLBACK_KEY];
      if (util.isFunction(fn)) {
        util.safeCall(fn);
        return true;
      }
      return false;
    },
    arm() {
      // If the loader script never registered its callback (e.g. it
      // itself threw), forcibly hide the loader after a deadline.
      const deadline = 4000;
      window.setTimeout(() => {
        if (util.isFunction(window[CONFIG.LOADER_FALLBACK_KEY])) return;
        const loader = util.byId('loader');
        if (!loader) return;
        log.warn('Loader fallback deadline reached — forcing hide.');
        loader.classList.add('is-done');
        window.setTimeout(() => {
          if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
          }
        }, 900);
      }, deadline);
    }
  };

  /* ----------------------------------------------------------
     5. Global error handling
     ---------------------------------------------------------- */
  const ErrorGuard = {
    handle(kind, payload) {
      if (STATE.errorCount >= CONFIG.MAX_ERRORS_REPORTED) {
        // Stop spamming after too many errors — but always keep
        // the loader fail-safe active.
        LoaderGuard.trigger();
        return;
      }

      const key = kind + '::' + (payload && payload.message ? payload.message : String(payload));
      if (!shouldReportError(key)) {
        LoaderGuard.trigger();
        return;
      }

      STATE.errorCount++;
      log.warn('[' + kind + ']', payload);

      // Never let one error keep the user staring at the loader.
      LoaderGuard.trigger();
    },

    bind() {
      window.addEventListener('error', (event) => {
        // Ignore errors from cross-origin resources without details
        const msg = event && event.message ? event.message : 'Unknown error';
        const src = event && event.filename ? event.filename : '';
        ErrorGuard.handle('runtime-error', { message: msg, source: src });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event && event.reason;
        const msg = reason && reason.message ? reason.message : String(reason || 'Unhandled rejection');
        ErrorGuard.handle('unhandled-rejection', { message: msg });
      });
    }
  };

  /* ----------------------------------------------------------
     6. Image fallback
     ---------------------------------------------------------- */
  const ImageGuard = {
    apply() {
      if (!CONFIG.HIDE_BROKEN_IMAGES) return;
      const imgs = util.qsa('img');
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        if (img.dataset.sivexoGuard === '1') continue;
        img.dataset.sivexoGuard = '1';

        // Already-broken images that fired error before we attached
        if (img.complete && img.naturalWidth === 0) {
          img.style.visibility = 'hidden';
          continue;
        }
        img.addEventListener('error', () => {
          img.style.visibility = 'hidden';
        }, { once: true });
      }
    }
  };

  /* ----------------------------------------------------------
     7. Layout / overflow guard
     ---------------------------------------------------------- */
  const LayoutGuard = {
    apply() {
      if (!CONFIG.LOCK_HORIZONTAL_OVERFLOW) return;
      const root = document.documentElement;
      if (!root) return;
      root.style.overflowX = 'hidden';
    }
  };

  /* ----------------------------------------------------------
     8. Boot task registry
     ---------------------------------------------------------- */
  function registerBootTask(name, fn) {
    if (!util.isString(name) || !util.isFunction(fn)) return;
    STATE.bootTasks.push({ name, fn });
  }

  function runBootTasks() {
    for (let i = 0; i < STATE.bootTasks.length; i++) {
      const task = STATE.bootTasks[i];
      try {
        task.fn();
      } catch (err) {
        log.warn('Boot task failed:', task.name, err && err.message ? err.message : err);
      }
    }
    STATE.bootTasks.length = 0;
  }

  /* ----------------------------------------------------------
     9. Public namespace
     ---------------------------------------------------------- */
  const SIVEXO = window.SIVEXO || {};
  SIVEXO.util = util;
  SIVEXO.log = log;
  SIVEXO.config = CONFIG;
  SIVEXO.state = STATE;
  SIVEXO.registerBootTask = registerBootTask;
  SIVEXO.triggerLoaderDone = LoaderGuard.trigger;
  window.SIVEXO = SIVEXO;

  /* ----------------------------------------------------------
     10. Bootstrap
     ---------------------------------------------------------- */
  function bootstrap() {
    if (STATE.booted) {
      log.info('Already booted — skipping.');
      return;
    }
    STATE.booted = true;

    // Register built-in boot tasks (order matters)
    registerBootTask('layout-guard', LayoutGuard.apply);
    registerBootTask('image-guard', ImageGuard.apply);
    registerBootTask('loader-deadline', LoaderGuard.arm);

    // Bind global listeners once
    if (!STATE.listenersBound) {
      ErrorGuard.bind();
      STATE.listenersBound = true;
    }

    // Execute
    runBootTasks();

    log.info('Boot complete.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }

})(window, document);
