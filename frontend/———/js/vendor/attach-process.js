// attach-process.js — ensure globalThis.process exists (idempotent)
(function () {
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis
          : (typeof window !== 'undefined') ? window
          : (typeof self !== 'undefined') ? self
          : this;

    if (!g.process || typeof g.process !== 'object') {
      g.process = { env: {}, argv: [], browser: true, platform: 'browser' };
    } else if (!g.process.env) {
      g.process.env = {};
    }
  } catch (e) {
    console.error('attach-process.js failed:', e);
  }
})();
