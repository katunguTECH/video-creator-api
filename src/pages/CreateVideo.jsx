import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateVideo.css';
import { getUsdToKesRate, formatKes, formatUsd } from '../utils/currency';
import { usePayment } from '../hooks/usePayment';
import PaymentOptions from '../components/PaymentOptions';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const fetchWithRetry = async (url, options, maxRetries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 400 || response.status === 404) {
        return response;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }
  throw lastError || new Error('Max retries exceeded');
};

function CreateVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(129.55);

  // Load exchange rate once
  useEffect(() => {
    getUsdToKesRate().then(setExchangeRate).catch(() => {});
  }, []);

  // Price recalculation
  useEffect(() => {
    if (!prompt.trim()) return setPrice(null);
    const amount = duration === 5 ? 200 : duration === 10 ? 400 : 600;
    setPrice({ finalPrice: amount, formatted: formatKes(amount), currency: 'KES' });
  }, [prompt, duration]);

  // Handle redirects back from Pesapal or Paystack
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Pesapal callback
    const orderTrackingId = params.get('OrderTrackingId');
    const merchantRef = params.get('OrderMerchantReference');
    const provider = localStorage.getItem('pending_payment_provider');

    if (orderTrackingId && provider === 'pesapal') {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/pesapal/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderTrackingId, merchantReference: merchantRef }),
          });
          const data = await res.json();
          if (data.success && data.status === 'completed') {
            await processVideoGeneration(merchantRef || data.reference);
          } else {
            setError('Card payment was not completed.');
            setLoading(false);
          }
        } catch (e) {
          setError('Payment verification error: ' + e.message);
          setLoading(false);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      })();
      return;
    }

    // Paystack (card or mpesa) callback
    const reference = params.get('reference') || params.get('trxref');
    if (reference && provider !== 'pesapal') {
      (async () => {
        setLoading(true);
        try {
          const v = await fetch(`${API_BASE_URL}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference,
              email: localStorage.getItem('pending_payment_email') || email,
              amount: Number(localStorage.getItem('pending_payment_amount') || 200),
              serviceType: 'text-to-video',
              paymentMethod: 'card',
              duration,
            }),
          });
          const vd = await v.json();
          if (vd.success) await processVideoGeneration(reference);
          else {
            setError('Payment verification failed.');
            setLoading(false);
          }
        } catch (e) {
          setError('Payment verification error: ' + e.message);
          setLoading(false);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      })();
    }
  }, []); // eslint-disable-line

  const processVideoGeneration = async (reference) => {
    try {
      setSuccess('🔄 Processing your video...');
      const gen = await fetchWithRetry(`${API_BASE_URL}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration,
          aspectRatio,
          paymentReference: reference,
          email,
        }),
      });
      const data = await gen.json();
      if (data.success) {
        setVideoUrl(data.videoUrl);
        setSuccess('✅ Video generated! Check your email.');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Video generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Payment hook
  const payment = usePayment({
    email,
    amount: price?.finalPrice || 200,
    serviceType: 'text-to-video',
    metadata: { duration, aspectRatio },
    onMpesaSuccess: (ref) => processVideoGeneration(ref),
  });

  const canPay = prompt.trim() && email && !loading;

  return (
    <div className="create-video-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>🎬 AI Text to Video</h1>
        <p>Describe your idea and AI will bring it to life</p>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="email-section">
            <label>📧 Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
            <small>Your generated video will be sent to this email</small>
          </div>

          <div className="prompt-section">
            <label>📝 Describe what you want to generate</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene, mood, and style you want"
              rows={6}
              disabled={loading}
            />
          </div>

          <div className="settings-section">
            <h3>⚙️ Video Settings</h3>
            <div className="setting-group">
              <label>Video Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                disabled={loading}
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={loading}
              >
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical)</option>
              </select>
            </div>
          </div>

          <div className="price-section">
            <h3>💰 Total Cost</h3>
            <div className="price-card">
              <div className="price-amount">
                {price ? formatKes(price.finalPrice) : '—'}
              </div>
              <div className="price-details">
                <p>✅ AI video generation</p>
                <p>✅ HD quality</p>
                <p>✅ {duration}-second video</p>
                <p>
                  💵 ≈ {price ? formatUsd(price.finalPrice, exchangeRate) : '—'} USD
                </p>
              </div>
            </div>
          </div>

          <PaymentOptions
            method={payment.method}
            setMethod={payment.setMethod}
            phone={payment.phone}
            setPhone={payment.setPhone}
            amountKes={price?.finalPrice || 200}
            exchangeRate={exchangeRate}
            loading={loading || payment.loading}
            status={payment.status}
            message={payment.message}
            error={payment.error || error}
            onPay={payment.start}
            disabled={!canPay}
          />

          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          <div className="video-preview">
            <h3>📹 Video Preview</h3>
            {videoUrl ? (
              <video controls className="video-player">
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <div className="placeholder">
                <p>Describe your idea and generate a video</p>
              </div>
            )}
          </div>

          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📝 Describe what you want the AI to generate</li>
              <li>💳 Pay by card via Pesapal, or by M-Pesa via Paystack</li>
              <li>📥 Download your AI-generated video</li>
              <li>🔒 All payments are secure and PCI-DSS compliant</li>
            </ul>
            <div className="support-info">
              <small>Need help? Contact us at support@katareel.com</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateVideo;