// pesapal.js
// Pesapal API 3.0 integration for Katareel.
// Usage in server.js:
//   const pesapal = require('./pesapal');
//   pesapal.init({ addRevenue, addUserPayment, addActivityLog });
//   app.use('/api/pesapal', pesapal.router);

const express = require('express');
const router = express.Router();

const BASE_URL = process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const CALLBACK_URL =
  process.env.PESAPAL_CALLBACK_URL || 'https://www.katareel.com/payment/callback';
const CALLBACK_FROM_ENV = !!process.env.PESAPAL_CALLBACK_URL;
const SITE_URL = (process.env.SITE_URL || 'https://www.katareel.com').replace(/\/$/, '');
const SERVICE_ROUTES = {
  'text-to-video': '/create',
  'translation': '/translate',
  'photo-to-video': '/photos-to-video',
  'brand-video': '/brand-video',
  'music-captions': '/music-captions',
};
function callbackFor(serviceType) {
  if (CALLBACK_FROM_ENV) return CALLBACK_URL;
  return SITE_URL + (SERVICE_ROUTES[serviceType] || '/create');
}
const IPN_URL =
  process.env.PESAPAL_IPN_URL ||
  'https://video-creator-api-kjzy.onrender.com/api/pesapal/ipn';
const NOTIFICATION_ID = process.env.PESAPAL_NOTIFICATION_ID;

// In-memory store of orders we've submitted but not yet confirmed.
const orders = new Map();

// Injected from server.js
let hooks = {
  addRevenue: async () => {},
  addUserPayment: async () => {},
  addActivityLog: async () => {},
  findPaymentByReference: async () => null,
};

function init(h) {
  hooks = { ...hooks, ...h };
}

let tokenCache = { token: null, expiry: 0 };

async function getToken() {
  if (tokenCache.token && tokenCache.expiry > Date.now() + 30000) {
    return tokenCache.token;
  }
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('Pesapal credentials not configured');
  }
  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Pesapal auth failed: ${JSON.stringify(data)}`);
  }
  tokenCache.token = data.token;
  tokenCache.expiry = new Date(data.expiryDate).getTime();
  return data.token;
}

/**
 * Register our IPN URL with Pesapal. Returns the notification_id which
 * must be saved to PESAPAL_NOTIFICATION_ID and used for every order.
 */
async function registerIPN(url = IPN_URL) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url, ipn_notification_type: 'POST' }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Pesapal IPN register failed: ${JSON.stringify(data)}`);
  }
  console.log('✅ Pesapal IPN registered. notification_id =', data.ipn_id);
  return data.ipn_id;
}

/**
 * POST /api/pesapal/initialize
 * Body: { email, amount, currency?, serviceType?, firstName?, lastName?, phone? }
 * Returns: { success, reference, orderTrackingId, redirectUrl }
 */
router.post('/initialize', async (req, res) => {
  try {
    const {
      email,
      amount,
      currency = 'KES',
      serviceType = 'unknown',
      firstName = '',
      lastName = '',
      phone = '',
      metadata = {},
    } = req.body;

    if (!email || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and a valid amount are required' });
    }
    if (!NOTIFICATION_ID) {
      return res.status(500).json({
        success: false,
        error:
          'Pesapal IPN not registered. Call GET /api/pesapal/register-ipn once and set PESAPAL_NOTIFICATION_ID.',
      });
    }

    const token = await getToken();
    const merchantReference = `KAT-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const payload = {
      id: merchantReference,
      currency,
      amount: Number(amount),
      description: `Katareel – ${serviceType}`,
      callback_url: callbackFor(serviceType),
      cancellation_url: `${callbackFor(serviceType)}?cancelled=1`,
      notification_id: NOTIFICATION_ID,
      billing_address: {
        email_address: email,
        phone_number: phone,
        first_name: firstName,
        last_name: lastName,
      },
    };

    const submitRes = await fetch(
      `${BASE_URL}/api/Transactions/SubmitOrderRequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await submitRes.json();
    if (!submitRes.ok || data.error) {
      return res.status(400).json({
        success: false,
        error: data.error?.message || data.message || 'Pesapal order failed',
      });
    }

    orders.set(data.order_tracking_id, {
      merchantReference,
      email,
      amount: Number(amount),
      currency,
      serviceType,
      metadata,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    console.log(
      '✅ Pesapal order created:',
      merchantReference,
      '→',
      data.order_tracking_id
    );

    res.json({
      success: true,
      reference: merchantReference,
      orderTrackingId: data.order_tracking_id,
      redirectUrl: data.redirect_url,
    });
  } catch (err) {
    console.error('❌ Pesapal initialize error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Ask Pesapal for the real status of an order. If it is Completed, record the
 * payment exactly once (payments table + revenue + activity log). This does not
 * depend on the in-memory orders Map, so it survives server restarts.
 */
const recording = new Map(); // merchant reference -> promise (single-flight)

function serviceFromDescription(desc) {
  const m = String(desc || '').match(/([a-z][a-z-]*)\s*$/i);
  return m ? m[1].toLowerCase() : 'unknown';
}

async function confirmAndRecord(orderTrackingId) {
  const token = await getToken();
  const statusRes = await fetch(
    BASE_URL + '/api/Transactions/GetTransactionStatus?orderTrackingId=' + encodeURIComponent(orderTrackingId),
    { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }
  );
  const data = await statusRes.json();
  if (!statusRes.ok) {
    throw new Error('Pesapal status check failed: ' + statusRes.status);
  }

  const completed =
    data.payment_status_description === 'Completed' || data.status_code === 1;
  if (!completed) return { completed: false, data };

  const order = orders.get(orderTrackingId);
  const reference = data.merchant_reference || (order && order.merchantReference);
  if (!reference) throw new Error('Pesapal did not return a merchant reference');

  const amount = Number(data.amount) || (order && order.amount) || 0;
  const currency = data.currency || (order && order.currency) || 'KES';
  if (currency !== 'KES') {
    console.warn('Pesapal payment in non-KES currency:', currency, amount, reference);
  }
  const email = (order && order.email) || 'unknown';
  const serviceType = (order && order.serviceType) || serviceFromDescription(data.description);

  if (!recording.has(reference)) {
    const job = (async () => {
      const existing = await hooks.findPaymentByReference(reference);
      if (existing) return false;
      const txId = Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      await hooks.addUserPayment(email, amount, 'pesapal_card', serviceType, reference);
      try {
        await hooks.addRevenue(txId, email, amount, serviceType, reference, 'pesapal_card');
        await hooks.addActivityLog(
          email,
          'Payment confirmed via Pesapal',
          'Amount: ' + amount + ' ' + currency + ', Ref: ' + reference,
          amount
        );
      } catch (e) {
        console.error('Pesapal revenue/activity recording error:', e.message);
      }
      console.log('Pesapal payment recorded:', reference, amount, currency, serviceType);
      return true;
    })();
    recording.set(reference, job);
    job.catch(() => recording.delete(reference));
  }
  await recording.get(reference);

  if (order) order.status = 'completed';
  return { completed: true, data, reference, serviceType, amount };
}

/**
 * POST /api/pesapal/verify
 * Body: { orderTrackingId }
 */
router.post('/verify', async (req, res) => {
  try {
    const { orderTrackingId } = req.body || {};
    if (!orderTrackingId) {
      return res.status(400).json({ success: false, error: 'orderTrackingId is required' });
    }
    const r = await confirmAndRecord(orderTrackingId);
    if (r.completed) {
      return res.json({
        success: true,
        status: 'completed',
        paymentMethod: r.data.payment_method,
        amount: r.data.amount,
        currency: r.data.currency,
        confirmationCode: r.data.confirmation_code,
        orderTrackingId,
        reference: r.reference,
        serviceType: r.serviceType,
      });
    }
    res.json({
      success: false,
      status: r.data.payment_status_description || 'pending',
      error: 'Payment not yet completed.',
    });
  } catch (err) {
    console.error('Pesapal verify error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/pesapal/ipn
 * Pesapal sends transaction notifications here.
 */
router.post('/ipn', async (req, res) => {
  try {
    const body = req.body || {};
    const orderTrackingId = body.OrderTrackingId || body.order_tracking_id;
    console.log('Pesapal IPN:', { orderTrackingId, merchantReference: body.OrderMerchantReference });
    if (orderTrackingId) {
      await confirmAndRecord(orderTrackingId);
    }
    res.status(200).json({ success: true, message: 'IPN received' });
  } catch (err) {
    console.error('Pesapal IPN error:', err.message);
    res.status(200).json({ success: true, message: 'Received' });
  }
});

/**
 * GET /api/pesapal/register-ipn
 * Run this ONCE after deployment. Copy the returned id into
 * PESAPAL_NOTIFICATION_ID in your environment.
 */
router.get('/register-ipn', async (req, res) => {
  try {
    const id = await registerIPN();
    res.json({
      success: true,
      notificationId: id,
      message: 'Save this as PESAPAL_NOTIFICATION_ID and redeploy.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, init, registerIPN, getToken };