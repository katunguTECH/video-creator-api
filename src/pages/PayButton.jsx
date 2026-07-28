import React, { useState } from 'react';
import './PayButton.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

function PayButton({ email, amount, serviceType, metadata, onSuccess, onClose, className, children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/initialize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount,
          serviceType,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      if (data.testMode) {
        // Test mode - simulate success
        if (onSuccess) {
          onSuccess({ reference: data.reference });
        }
        setLoading(false);
        return;
      }

      if (window.PaystackPop) {
        const popup = new window.PaystackPop();
        popup.open({
          key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
          email: email,
          amount: amount * 100,
          ref: data.reference,
          metadata: data.metadata,
          currency: 'KES',
          callback: (response) => {
            if (onSuccess) {
              onSuccess(response);
            }
            setLoading(false);
          },
          onClose: () => {
            if (onClose) {
              onClose();
            }
            setLoading(false);
          }
        });
      } else {
        throw new Error('Paystack script not loaded');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="pay-button-container">
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`pay-btn ${className || ''}`}
      >
        {loading ? '⏳ Processing...' : children || 'Pay Now'}
      </button>
      {error && <div className="pay-error">{error}</div>}
    </div>
  );
}

export default PayButton;