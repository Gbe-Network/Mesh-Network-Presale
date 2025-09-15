// Local one-file ESM bundle loader (no external imports, no bare specifiers)
(async () => {
  try {
    const mod = await import('/js/vendor/solana-web3.bundle.mjs?v=' + Date.now());
    if (!mod || !mod.Transaction) throw new Error('web3 module missing Transaction');
    globalThis.solanaWeb3 = mod;
    dispatchEvent(new Event('solanaWeb3#ready'));
    dispatchEvent(new Event('libs-ready'));
    console.log('[web3-loader:local] solanaWeb3 ready (bundled)');
  } catch (e) {
    console.error('[web3-loader:local] failed to load local bundled web3', e);
  }
})();
export {};
