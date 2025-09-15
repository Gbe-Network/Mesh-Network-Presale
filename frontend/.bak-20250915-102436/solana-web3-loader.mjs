// Load @solana/web3.js as a real ES module (SES-friendly), then publish on globalThis
(async () => {
  try {
    // Pin a known-good version; tweak if you upgrade
    const mod = await import('https://esm.sh/@solana/web3.js@1.95.3?target=es2022&bundle');
    // Some builds export as default + named; normalize
    const api = mod?.Connection ? mod : (mod?.default || mod);
    if (!api?.Transaction) throw new Error('web3 module missing Transaction');
    globalThis.solanaWeb3 = api;
    try { dispatchEvent(new Event('solanaWeb3#ready')); } catch {}
    try { dispatchEvent(new Event('libs-ready')); } catch {}
    console.log('[web3-loader] ESM ready', Object.keys(api).slice(0, 12));
  } catch (e) {
    console.error('[web3-loader] failed to init ESM', e);
  }
})();
export {};
