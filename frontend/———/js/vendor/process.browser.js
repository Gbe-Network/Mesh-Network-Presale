// process.browser.js — minimal, SES/CSP-safe process shim for browsers.
// No use of CommonJS (module/exports); attaches to globalThis only.
(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis
        : (typeof window !== 'undefined') ? window
        : (typeof self !== 'undefined') ? self
        : this;

  if (g.process && typeof g.process === 'object') return;

  function nextTick(fn) {
    if (typeof queueMicrotask === 'function') return queueMicrotask(fn);
    if (typeof Promise === 'function') return Promise.resolve().then(fn);
    setTimeout(fn, 0);
  }

  g.process = {
    env: {},
    argv: [],
    browser: true,
    platform: 'browser',
    version: '',
    versions: {},
    title: 'browser',
    nextTick: nextTick,
    cwd: function () { return '/'; },
    chdir: function () { throw new Error('process.chdir is not supported'); },
    umask: function () { return 0; },

    // no-op event API to satisfy UMD libs
    on: function () {},
    addListener: function () {},
    once: function () {},
    off: function () {},
    removeListener: function () {},
    removeAllListeners: function () {},
    emit: function () {},
    prependListener: function () {},
    prependOnceListener: function () {},
    listeners: function () { return []; },

    binding: function () { throw new Error('process.binding is not supported'); }
  };
})();
