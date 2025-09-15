(function(){
  var s=document.createElement('script');
  s.src='/js/vendor/solana-web3.iife.min.js';
  s.async=true;
  s.onload=function(){
    var m = window['@solana/web3.js'] || window.solanaWeb3;
    if (m && m.Transaction) {
      globalThis.solanaWeb3 = m;
      try { dispatchEvent(new Event('solanaWeb3#ready')); } catch(_) {}
      try { dispatchEvent(new Event('libs-ready')); } catch(_) {}
      console.log('[web3-loader] local Solana Web3 ready');
    } else {
      console.error('[web3-loader] IIFE loaded but module missing Transaction');
    }
  };
  s.onerror=function(e){ console.error('[web3-loader] failed to load local IIFE', e); };
  document.head.appendChild(s);
})();
export {};
