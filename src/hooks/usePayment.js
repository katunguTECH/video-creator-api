// src/hooks/usePayment.js
import { useState, useCallback } from 'react';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

/**
 * Pesapal-only payment hook.
 * All payments (card + M-Pesa) go through Pesapal's hosted checkout page,
 * so we just initialize the order and redirect the user.
 */
export function usePayment({ email, amount, serviceType, metadata = {} }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const start = useCallback(async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/pesapal/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount,
          currency: 'KES',
          serviceType,
          metadata,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.redirectUrl) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      // Persist for post-redirect verification
      localStorage.setItem('pending_payment_provider', 'pesapal');
      localStorage.setItem('pending_payment_reference', data.reference);
      localStorage.setItem('pending_payment_order_tracking_id', data.orderTrackingId);
      localStorage.setItem('pending_payment_email', email);
      localStorage.setItem('pending_payment_service', serviceType);
      localStorage.setItem('pending_payment_amount', String(amount));
      localStorage.setItem('pending_payment_metadata', JSON.stringify(metadata));

      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err.message || 'Payment initialization failed');
      setLoading(false);
    }
  }, [email, amount, serviceType, metadata]);

  return { loading, error, setError, start };
}