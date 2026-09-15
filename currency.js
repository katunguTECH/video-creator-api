// currency.js
// Live USD→KES exchange rate, cached for 1 hour.
// Usage: const currency = require('./currency');
//        app.use('/api/currency', currency.router);

const express = require('express');
const router = express.Router();

const FALLBACK_RATE = Number(process.env.USD_TO_KES_RATE) || 129.55;
const CACHE_MS = 60 * 60 * 1000;

let cache = { rate: FALLBACK_RATE, at: 0 };

async function getRate() {
  if (Date.now() - cache.at < CACHE_MS && cache.rate) return cache.rate;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const kes = data?.rates?.KES;
    if (kes && typeof kes === 'number') {
      cache = { rate: kes, at: Date.now() };
      console.log('💱 USD→KES rate updated:', kes);
    }
  } catch (e) {
    console.warn('⚠️ Exchange rate fetch failed, using fallback:', e.message);
  }
  return cache.rate || FALLBACK_RATE;
}

router.get('/rate', async (req, res) => {
  try {
    const rate = await getRate();
    res.json({
      success: true,
      base: 'USD',
      target: 'KES',
      rate,
      updatedAt: new Date(cache.at || Date.now()).toISOString(),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = { router, getRate };