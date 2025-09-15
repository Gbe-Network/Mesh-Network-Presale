'use strict';

// Force .env to override any existing PM2 env (fixes the 10,000,000 target issue)
require('dotenv').config({ override: true, path: __dirname + '/.env' });

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const BitcoinCore = require('bitcoin-core');
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getMint
} = require('@solana/spl-token');
const { JsonRpcProvider } = require('ethers');

// -------- env helpers ----------
function ensure(name, val) {
  if (val === undefined || val === null || String(val).trim() === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return val;
}

// ——— Load env ——————————————————————————————
const {
  PORT,
  ORIGIN,
  SOLANA_RPC_URL,
  PRESALE_KEYPAIR_PATH,
  PRESALE_TOKEN_ACCOUNT,
  TOKEN_MINT_ADDRESS,
  PRICE_PER_GC,
  PRESALE_TARGET_GC,

  // Payments
  SOL_RECEIVER,

  // Optional (BTC/EVM)
  BTC_HOST, BTC_PORT, BTC_USER, BTC_PASS, BTC_RECEIVER,
  ETH_RPC_URL, ETH_RECEIVER,
  USDC_CONTRACT_ADDRESS, USDC_RECEIVER,
  MATIC_RPC_URL, MATIC_RECEIVER,
  AUSDT_CONTRACT_ADDRESS, AUSDT_RECEIVER,
} = process.env;

// Required envs
ensure('SOLANA_RPC_URL', SOLANA_RPC_URL);
ensure('PRESALE_KEYPAIR_PATH', PRESALE_KEYPAIR_PATH);
ensure('PRESALE_TOKEN_ACCOUNT', PRESALE_TOKEN_ACCOUNT);
ensure('TOKEN_MINT_ADDRESS', TOKEN_MINT_ADDRESS);
ensure('PRICE_PER_GC', PRICE_PER_GC);
ensure('SOL_RECEIVER', SOL_RECEIVER);

// ——— App setup —————————————————————————————
const app = express();
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: ORIGIN || '*' }));
app.use(bodyParser.json({ limit: '1mb' }));

// ——— Solana setup ——————————————————————————
const solConnection = new Connection(SOLANA_RPC_URL, 'confirmed');

let signerKeyRaw;
try {
  signerKeyRaw = fs.readFileSync(PRESALE_KEYPAIR_PATH, 'utf8');
} catch (e) {
  console.error('Unable to read PRESALE_KEYPAIR_PATH:', PRESALE_KEYPAIR_PATH, e);
  process.exit(1);
}
const presaleKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(signerKeyRaw))
);

const presaleTokenAccount = new PublicKey(PRESALE_TOKEN_ACCOUNT);
const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
const solReceiverPk = new PublicKey(SOL_RECEIVER);

// ——— Bitcoin setup (optional) ——————————————
let btcClient = null;
if (BTC_HOST && BTC_PORT && BTC_USER && BTC_PASS) {
  btcClient = new BitcoinCore({
    host: BTC_HOST,
    port: Number(BTC_PORT),
    username: BTC_USER,
    password: BTC_PASS
  });
}

// ——— EVM setup (optional) ——————————————
const ethProvider   = ETH_RPC_URL   ? new JsonRpcProvider(ETH_RPC_URL)   : null;
const maticProvider = MATIC_RPC_URL ? new JsonRpcProvider(MATIC_RPC_URL) : null;

// ——— Helpers ——————————————————————————————
async function fetchPrice(id) {
  const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: { ids: id, vs_currencies: 'usd' }
  });
  if (!res.data || !res.data[id]) throw new Error(`Price lookup failed for ${id}`);
  return res.data[id].usd;
}

function calculateGc(usd) {
  return Math.floor(usd / parseFloat(PRICE_PER_GC));
}

/**
 * Transfer GC tokens from presale ATA to buyer's ATA
 * @param {string} buyerSol base58 pubkey
 * @param {number} tokenCount whole-number of GC tokens
 */
async function mintGc(buyerSol, tokenCount) {
  const mintInfo = await getMint(solConnection, tokenMint);
  const decimals = mintInfo.decimals;

  const rawAmount = BigInt(tokenCount) * (BigInt(10) ** BigInt(decimals));

  const ata = await getOrCreateAssociatedTokenAccount(
    solConnection,
    presaleKeypair,
    tokenMint,
    new PublicKey(buyerSol)
  );

  const ix = createTransferInstruction(
    presaleTokenAccount,
    ata.address,
    presaleKeypair.publicKey,
    rawAmount,
    [],
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = presaleKeypair.publicKey;
  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;
  tx.sign(presaleKeypair);

  const sig = await solConnection.sendRawTransaction(tx.serialize());
  await solConnection.confirmTransaction(sig, 'confirmed');
  return sig;
}

// ——— Routes —————————————————————————————————————

// SOL payment verification + mint
app.post('/pay/sol', async (req, res) => {
  try {
    const { txSignature, buyerSol } = req.body;
    if (!txSignature || !buyerSol) throw new Error('Missing txSignature or buyerSol');

    const txn = await solConnection.getTransaction(txSignature, { commitment: 'confirmed' });
    if (!txn) throw new Error('Transaction not found');

    // ensure receiver is actually paid in this transaction
    const keys = txn.transaction.message.accountKeys.map(k => k.toBase58());
    const recvIdx = keys.indexOf(solReceiverPk.toBase58());
    if (recvIdx < 0) throw new Error('Receiver address not present in transaction');

    const lamportsPaid = txn.meta.postBalances[recvIdx] - txn.meta.preBalances[recvIdx];
    if (lamportsPaid <= 0) throw new Error('No SOL received by receiver');

    const solPaid = lamportsPaid / LAMPORTS_PER_SOL;
    const price = await fetchPrice('solana');
    const gc = calculateGc(solPaid * price);
    if (gc < 1) throw new Error('Payment too small');

    const sig = await mintGc(buyerSol, gc);
    res.json({ success: true, gc, sig });
  } catch (err) {
    console.error('POST /pay/sol error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Presale stats — derived from raw base units to avoid rounding drift
app.get('/stats', async (req, res) => {
  try {
    const [mintInfo, balInfo] = await Promise.all([
      getMint(solConnection, tokenMint),
      solConnection.getTokenAccountBalance(presaleTokenAccount)
    ]);

    const decimals = mintInfo.decimals;
    const raw = BigInt(balInfo.value.amount || '0');
    const denom = BigInt(10) ** BigInt(decimals);
    const remainingExact = Number(raw) / Number(denom);

    // Prefer explicit target from env; otherwise fallback to current remaining
    const envTarget = parseInt(process.env.PRESALE_TARGET_GC, 10);
    const target = Number.isFinite(envTarget) && envTarget > 0
      ? envTarget
      : Math.round(remainingExact);

    const sold = Math.max(0, Math.round(target - remainingExact));
    const pct = target > 0 ? Math.max(0, Math.min(100, (sold / target) * 100)) : 0;

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      target,
      sold,
      remaining: Math.max(0, Math.round(remainingExact)),
      pct: Number(pct.toFixed(2)),
      decimals
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check (echo key values incl. target env)
app.get('/health', async (req, res) => {
  try {
    const version = await solConnection.getVersion().catch(() => null);
    const slot = await solConnection.getSlot().catch(() => null);
    res.json({
      ok: true,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        ORIGIN: ORIGIN || '*',
        PRESALE_TARGET_GC: process.env.PRESALE_TARGET_GC || null
      },
      signer: presaleKeypair.publicKey.toBase58(),
      receiver: solReceiverPk.toBase58(),
      rpc: { version, slot }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Start server
const port = Number(PORT || 3000);
app.listen(port, () => {
  console.log(`Guaso backend listening on port ${port}`);
});
