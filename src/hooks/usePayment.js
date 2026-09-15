// src/hooks/usePayment.js
import { useState, useCallback, useRef } from 'react';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // ~2 minutes

/**
 * Shared payment hook supporting:
 *   - method = 'card'  → Pesapal hosted page (redirect flow)
 *   - method = 'mpesa' → Paystack M-Pesa STK push (poll flow)
 *
 * Usage:
 *   const pay = usePayment({
 *     email, amount, serviceType, metadata,
 *     onMpesaSuccess: (reference) => { ...verify + generate... },
 *   });
 *   <button onClick={pay.start}>Pay</button>
 */
export function usePayment({ email, amount, serviceType, metadata = {}, onMpesaSuccess }) {
  const [method, setMethod] = useState('card'); // 'card' | 'mpesa'
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'idle' | 'pending' | 'polling' | 'success'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startCardPayment = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/pesapal/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount, serviceType, metadata }),
      });
      const data = await res.json();
      if (!data.success || !data.redirectUrl) {
        throw new Error(data.error || 'Card payment initialization failed');
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
      setError(err.message);
      setLoading(false);
    }
  }, [email, amount, serviceType, metadata]);

  const startMpesaPayment = useCallback(async () => {
    if (!phone) {
      setError('Please enter your M-Pesa phone number');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('📱 Sending M-Pesa prompt...');
    setStatus('pending');

    try {
      const res = await fetch(`${API_BASE_URL}/api/paystack-mpesa/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount,
          phone,
          serviceType,
          metadata,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'M-Pesa charge failed');
      }

      setMessage(
        data.message ||
          'M-Pesa prompt sent. Enter your PIN on your phone to complete payment.'
      );
      setStatus('polling');

      let attempts = 0;
      stopPolling();
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const v = await fetch(`${API_BASE_URL}/api/paystack-mpesa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: data.reference }),
          });
          const vd = await v.json();
          if (vd.success && vd.status === 'success') {
            stopPolling();
            setStatus('success');
            setMessage('✅ M-Pesa payment confirmed!');
            setLoading(false);
            if (onMpesaSuccess) onMpesaSuccess(data.reference);
            return;
          }
          if (attempts >= POLL_MAX_ATTEMPTS) {
            stopPolling();
            setStatus(null);
            setLoading(false);
            setError('M-Pesa payment timed out. Please try again.');
          }
        } catch (e) {
          console.warn('M-Pesa poll error:', e.message);
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setStatus(null);
    }
  }, [
    phone,
    email,
    amount,
    serviceType,
    metadata,
    onMpesaSuccess,
    stopPolling,
  ]);

  const start = useCallback(() => {
    if (method === 'card') return startCardPayment();
    return startMpesaPayment();
  }, [method, startCardPayment, startMpesaPayment]);

  return {
    method,
    setMethod,
    phone,
    setPhone,
    loading,
    status,
    message,
    error,
    setError,
    setMessage,
    start,
    stopPolling,
  };
}