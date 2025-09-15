// attach-buffer.js — attach Buffer safely to the global object.
// Works with browserify-style buffer shim, SES lockdown, and CSP.
(function () {
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis
          : (typeof window !== 'undefined') ? window
          : (typeof self !== 'undefined') ? self
          : this;

    // If Buffer already present, nothing to do.
    if (g.Buffer && typeof g.Buffer.from === 'function') return;

    var candidate = null;

    // 1) Global Buffer function already present?
    if (typeof Buffer === 'function') {
      candidate = Buffer;
    }

    // 2) browserify buffer shim often exposes window.buffer.Buffer
    if (!candidate && g.buffer && typeof g.buffer.Buffer === 'function') {
      candidate = g.buffer.Buffer;
    }

    // 3) window.Buffer (older shims)
    if (!candidate && g.Buffer && typeof g.Buffer === 'function') {
      candidate = g.Buffer;
    }

    if (candidate) {
      g.Buffer = candidate;
      // Non-fatal heads-up if minimal Buffer lacks common methods
      if (typeof g.Buffer.from !== 'function' || typeof g.Buffer.alloc !== 'function') {
        console.warn('[polyfill] Buffer attached but missing .from/.alloc methods');
      }
    } else {
      console.error('🚨 Buffer polyfill missing in attach-buffer.js');
    }
  } catch (e) {
    console.error('attach-buffer.js failed:', e);
  }
})();
