// globals.js — base global wiring + polite, deferred SES lockdown.
//
// If SES (lockdown) is present on the page, we delay calling it until
// foundational libraries (Buffer, process, solanaWeb3) signal readiness via
// the "libs-ready" event. We also add a safety timeout so pages don't hang
// forever if libs-ready never fires (e.g., CDN outage).

(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis
        : (typeof window !== 'undefined') ? window
        : (typeof self !== 'undefined') ? self
        : this;

  // Basic global alias some libs expect
  g.global = g.global || g;

  // If there's no SES lockdown available, nothing else to do.
  if (typeof g.lockdown !== 'function') {
    return;
  }

  // Prevent double-locking
  if (g.__LOCKDOWN_DONE__) return;

  var SAFETY_TIMEOUT_MS = 5000; // lock anyway after 5s if libs-ready doesn't arrive
  var safetyTimer = null;
  var armed = false;

  function applyLockdown() {
    if (g.__LOCKDOWN_DONE__) return;
    try {
      g.lockdown({
        // Defaults are generally compatible; avoid aggressive taming that breaks web libs.
        // errorTaming: 'safe',
        // evalTaming: 'safe',
        // overrideTaming: 'moderate',
        // consoleTaming: 'safe',
      });
      g.__LOCKDOWN_DONE__ = true;
      try { g.dispatchEvent(new Event('lockdown#done')); } catch (_) {}
      console.log('[SES] lockdown applied');
    } catch (e) {
      console.error('[SES] lockdown failed:', e);
    } finally {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    }
  }

  function armSafetyTimer() {
    if (armed) return;
    armed = true;
    safetyTimer = setTimeout(function () {
      if (!g.__LOCKDOWN_DONE__) {
        console.warn('[SES] libs-ready not received in time; applying lockdown via safety timer');
        applyLockdown();
      }
    }, SAFETY_TIMEOUT_MS);
  }

  var onReady = function () {
    try { g.removeEventListener && g.removeEventListener('libs-ready', onReady); } catch (_) {}
    applyLockdown();
  };

  if (typeof g.addEventListener === 'function') {
    // Defer until index.html signals foundational libs loaded.
    g.addEventListener('libs-ready', onReady, { once: true });
    // Start safety timer in case libs-ready never arrives
    armSafetyTimer();
  } else {
    // Environments without addEventListener — fallback: best-effort time slice
    setTimeout(applyLockdown, 0);
  }
})();
