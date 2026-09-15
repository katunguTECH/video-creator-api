// src/utils/currency.js
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const FALLBACK_USD_TO_KES = 129.55;
let cachedRate = { value: FALLBACK_USD_TO_KES, at: 0 };

export async function getUsdToKesRate() {
  const oneHour = 60 * 60 * 1000;
  if (Date.now() - cachedRate.at < oneHour && cachedRate.value) {
    return cachedRate.value;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/currency/rate`);
    const data = await res.json();
    if (data.success && data.rate) {
      cachedRate = { value: data.rate, at: Date.now() };
      return data.rate;
    }
  } catch (e) {
    console.warn('Exchange rate fetch failed, using fallback');
  }
  return cachedRate.value || FALLBACK_USD_TO_KES;
}

export function formatKes(amount) {
  return `KES ${Math.round(Number(amount) || 0).toLocaleString('en-KE')}`;
}

export function formatUsd(amountKes, rate) {
  const usd = (Number(amountKes) || 0) / (rate || FALLBACK_USD_TO_KES);
  return `$${usd.toFixed(2)}`;
}

export function formatBoth(amountKes, rate) {
  return `${formatKes(amountKes)} (${formatUsd(amountKes, rate)})`;
}