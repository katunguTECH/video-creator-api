// src/components/PaymentOptions.jsx
import React from 'react';

/**
 * Renders card vs M-Pesa selector, M-Pesa phone input, and a pay button.
 *
 * Props:
 *   method, setMethod
 *   phone, setPhone
 *   amountKes, exchangeRate
 *   loading, status, message, error
 *   onPay (function)
 *   disabled
 *   accent (string, tailwind gradient classes, default green)
 */
export default function PaymentOptions({
  method,
  setMethod,
  phone,
  setPhone,
  amountKes,
  exchangeRate,
  loading,
  status,
  message,
  error,
  onPay,
  disabled = false,
  accent = 'from-green-500 to-emerald-600',
}) {
  const kes = Math.round(Number(amountKes) || 0);
  const usd = (kes / (exchangeRate || 129.55)).toFixed(2);

  return (
    <div className="space-y-3">
      {/* Method selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod('card')}
          disabled={loading}
          className={`py-3 rounded-lg font-semibold text-sm border-2 transition-all ${
            method === 'card'
              ? 'border-pink-400 bg-pink-500/20 text-white'
              : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          💳 Card (Visa / Mastercard)
        </button>
        <button
          type="button"
          onClick={() => setMethod('mpesa')}
          disabled={loading}
          className={`py-3 rounded-lg font-semibold text-sm border-2 transition-all ${
            method === 'mpesa'
              ? 'border-green-400 bg-green-500/20 text-white'
              : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          📱 M-Pesa
        </button>
      </div>

      {/* Phone input for M-Pesa */}
      {method === 'mpesa' && (
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="M-Pesa number (e.g. 0712345678)"
          disabled={loading}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
        />
      )}

      {/* Price display */}
      <div className="text-center text-sm text-gray-300">
        You will be charged{' '}
        <span className="font-bold text-white">KES {kes.toLocaleString()}</span>{' '}
        <span className="text-gray-400">(≈ ${usd})</span>
      </div>

      {/* Pay button */}
      <button
        type="button"
        onClick={onPay}
        disabled={loading || disabled}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all bg-gradient-to-r ${accent} hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-white`}
      >
        {loading
          ? '⏳ Processing...'
          : method === 'card'
          ? `💳 Pay KES ${kes.toLocaleString()} ($${usd}) by Card`
          : `📱 Pay KES ${kes.toLocaleString()} ($${usd}) by M-Pesa`}
      </button>

      {message && (
        <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-3 text-blue-200 text-sm text-center">
          {message}
        </div>
      )}
      {status === 'polling' && (
        <div className="text-center text-xs text-gray-400">
          Waiting for M-Pesa confirmation…
        </div>
      )}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm text-center">
          ❌ {error}
        </div>
      )}
    </div>
  );
}