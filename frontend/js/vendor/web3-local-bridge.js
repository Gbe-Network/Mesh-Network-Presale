(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  var start = Date.now();
  function tryReady() {
    var m = g['@solana/web3.js'] || g.solanaWeb3;
    if (m && m.Transaction) {
      if (!g.solanaWeb3) g.solanaWeb3 = m;
      try { dispatchEvent(new Event('solanaWeb3#ready')); } catch (_) {}
      try { dispatchEvent(new Event('libs-ready')); } catch (_) {}
      console.log('[web3-bridge] solanaWeb3 ready', Object.keys(g.solanaWeb3).slice(0, 12));
      return true;
    }
    return false;
  }
  if (tryReady()) return;
  var iv = setInterval(function () {
    if (tryReady()) { clearInterval(iv); return; }
    if (Date.now() - start > 5000) { clearInterval(iv); console.warn('[web3-bridge] timeout waiting for solanaWeb3'); }
  }, 100);
})();
