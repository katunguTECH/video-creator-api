// paystack-mpesa.js
// Paystack M-Pesa (mobile money) integration for Katareel.
// Usage in server.js:
//   const mpesa = require('./paystack-mpesa');
//   mpesa.init({ addRevenue, addUserPayment, addActivityLog });
//   app.use('/api/paystack-mpesa', mpesa.router);

const express = require('express');
const router = express.Router();

let hooks = {
  addRevenue: async () => {},
  addUserPayment: async () => {},
  addActivityLog: async () => {},
};

function init(h) {
  hooks = { ...hooks, ...h };
}

function normalizeKenyanPhone(input) {
  if (!input) return '';
  const cleaned = String(input).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+254')) return cleaned;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) return `+254${cleaned}`;
  return cleaned;
}

/**
 * POST /api/paystack-mpesa/charge
 * Body: { email, amount, phone, currency?, serviceType?, metadata? }
 * Triggers an STK push to the customer's phone.
 */
router.post('/charge', async (req, res) => {
  try {
    const {
      email,
      amount,
      phone,
      currency = 'KES',
      serviceType = 'unknown',
      metadata = {},
    } = req.body;

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || secret === 'your_paystack_secret_key') {
      return res
        .status(500)
        .json({ success: false, error: 'Paystack not configured' });
    }
    if (!email || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and a valid amount are required' });
    }
    const formattedPhone = normalizeKenyanPhone(phone);
    if (!formattedPhone) {
      return res
        .status(400)
        .json({ success: false, error: 'A valid phone number is required' });
    }
    if (amount > 150000) {
      return res.status(400).json({
        success: false,
        error: 'M-Pesa single transaction limit is 150,000 KES.',
      });
    }

    const reference = `MPESA-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const resp = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amount) * 100),
        currency,
        reference,
        mobile_money: { phone: formattedPhone, provider: 'mpesa' },
        metadata: {
          serviceType,
          ...metadata,
          custom_fields: [
            {
              display_name: 'Payment Method',
              variable_name: 'payment_method',
              value: 'M-Pesa',
            },
            {
              display_name: 'Service',
              variable_name: 'service',
              value: serviceType,
            },
          ],
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.status) {
      console.error('❌ Paystack M-Pesa failed:', data);
      return res.status(400).json({
        success: false,
        error: data.message || 'M-Pesa charge failed',
      });
    }

    console.log('📱 M-Pesa STK push sent:', reference, '→', formattedPhone);

    res.json({
      success: true,
      reference,
      status: data.data?.status || 'pending',
      message:
        data.data?.message ||
        'M-Pesa prompt sent. Enter your PIN on your phone to complete payment.',
      displayText:
        data.data?.display_text ||
        'Enter your M-Pesa PIN on your phone to complete payment.',
    });
  } catch (err) {
    console.error('❌ M-Pesa charge error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/paystack-mpesa/verify
 * Body: { reference }
 * Poll this from the frontend until status === 'success'.
 */
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Not configured' });
    }
    if (!reference) {
      return res
        .status(400)
        .json({ success: false, error: 'reference is required' });
    }

    const resp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await resp.json();
    const tx = data.data;

    if (data.status && tx?.status === 'success') {
      const txId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const serviceType = tx.metadata?.serviceType || 'unknown';
      const amount = tx.amount / 100;

      try {
        await hooks.addRevenue(
          txId,
          tx.customer?.email || '',
          amount,
          serviceType,
          reference,
          'paystack_mpesa'
        );
        await hooks.addUserPayment(
          tx.customer?.email || '',
          amount,
          'paystack_mpesa',
          serviceType,
          reference
        );
        await hooks.addActivityLog(
          tx.customer?.email || '',
          '📱 M-Pesa payment via Paystack',
          `Amount: ${amount} ${tx.currency}, Ref: ${reference}`,
          amount
        );
      } catch (e) {
        console.error('M-Pesa post-verify recording error:', e.message);
      }

      return res.json({
        success: true,
        status: 'success',
        amount,
        currency: tx.currency,
        channel: tx.channel,
        reference,
      });
    }

    res.json({
      success: false,
      status: tx?.status || 'pending',
      error: 'Payment not yet completed.',
    });
  } catch (err) {
    console.error('❌ M-Pesa verify error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, init };