;(function () {
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis
          : (typeof window !== 'undefined') ? window
          : (typeof global !== 'undefined') ? global
          : this;
    if (!g) return;
    if (g.solanaWeb3 && g.solanaWeb3.Transaction) return;
    var maybe = (typeof window !== 'undefined') && (window['@solana/web3.js'] || window.solanaWeb3);
    if (maybe && maybe.Transaction) g.solanaWeb3 = maybe;
  } catch (_) {}
})();
