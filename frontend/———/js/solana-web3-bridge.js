;(function () {
  try {
    if (typeof window !== 'undefined' && window.solanaWeb3) return;
    if (typeof solanaWeb3 !== 'undefined') window.solanaWeb3 = solanaWeb3;
  } catch (_) {}
})();
