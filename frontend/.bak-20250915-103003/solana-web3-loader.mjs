// Local ESM loader for @solana/web3.js (bundled)
// Loads from same-origin to satisfy CSP ('self')
(async () => {
  try {
    const mod = await import('/js/vendor/solana-web3.esm.js');
    const api = mod?.Connection ? mod : (mod?.default || mod);
    if (!api?.Transaction) throw new Error('web3 module missing Transaction');
    globalThis.solanaWeb3 = api;
    try { dispatchEvent(new Event('solanaWeb3#ready')); } catch {}
    try { dispatchEvent(new Event('libs-ready')); } catch {}
    console.log('[web3-loader] Local ESM ready', Object.keys(api).slice(0, 12));
  } catch (e) {
    console.error('[web3-loader] failed to init local ESM', e);
  }
})();
export {};
