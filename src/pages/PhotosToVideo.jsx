import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhotosToVideo.css';
import { getUsdToKesRate, formatKes, formatUsd } from '../utils/currency';
import { usePayment } from '../hooks/usePayment';
import { Helmet } from 'react-helmet-async';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const fetchWithRetry = async (url, options, maxRetries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 400 || response.status === 404) return response;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  throw lastError || new Error('Max retries exceeded');
};

const getDownloadUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('data:')) return null;
  if (url.includes('/upload/') && !url.includes('fl_attachment')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
};

const isPlaceholderVideo = (url) => !url || url.startsWith('data:');

function PhotosToVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [photos, setPhotos] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [audioScript, setAudioScript] = useState('');
  const [voiceGender, setVoiceGender] = useState('MALE');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(129.55);
  const fileInputRef = useRef(null);

  const [showRedoSection, setShowRedoSection] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isRedoMode, setIsRedoMode] = useState(false);
  const [redoLoading, setRedoLoading] = useState(false);
  const [savedCoupon, setSavedCoupon] = useState('');

  useEffect(() => {
    getUsdToKesRate().then(setExchangeRate).catch(() => {});
  }, []);

  useEffect(() => {
    const n = photos.length;
    const d = duration;
    let p = 300;
    if (n === 1) p = d === 5 ? 300 : d === 10 ? 600 : 900;
    else if (n === 2) p = d === 5 ? 600 : d === 10 ? 1200 : 1800;
    else if (n >= 3) p = d === 5 ? 500 : d === 10 ? 1000 : 2000;
    setPrice(n ? { finalPrice: p, currency: 'KES' } : null);
  }, [photos.length, duration]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
            await processPhotoVideo(merchantRef || data.reference);
          } else {
            setError('Payment was not completed.');
            setLoading(false);
          }
        } catch (e) {
          setError('Payment verification error: ' + e.message);
          setLoading(false);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      })();
    }

    const saved = localStorage.getItem('video_redo_coupon');
    if (saved) {
      setSavedCoupon(saved);
      setCouponCode(saved);
      setShowRedoSection(true);
    }
  }, []); // eslint-disable-line

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newPhotos = files.map((file) => ({
      id: Date.now() + Math.random().toString(36).slice(2, 6),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (id) => setPhotos(photos.filter((p) => p.id !== id));

  const processPhotoVideo = async (reference) => {
    try {
      setSuccess('🔄 Processing your video...');
      const photoUrls = [];
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('upload_preset', 'vidai_uploads');
        const up = await fetch('https://api.cloudinary.com/v1_1/y7d1nk2i/image/upload', {
          method: 'POST',
          body: formData,
        });
        const upd = await up.json();
        if (upd.secure_url) photoUrls.push(upd.secure_url);
      }
      if (!photoUrls.length) throw new Error('No photos uploaded');

      const gen = await fetchWithRetry(`${API_BASE_URL}/api/generate-photo-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls,
          prompt,
          duration,
          aspectRatio,
          paymentReference: reference,
          email,
          audioScript: audioScript.trim() || null,
          voiceGender,
        }),
      });
      const data = await gen.json();

      if (data.success && data.videoUrl && !isPlaceholderVideo(data.videoUrl)) {
        setVideoUrl(data.videoUrl);
        setSuccess('✅ Video generated! Check your email.');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Video generation failed: ' + err.message);
    } finally {
      setLoading(false);
      setRedoLoading(false);
      setIsRedoMode(false);
      ['pending_payment_reference', 'pending_payment_email', 'pending_payment_service',
       'pending_payment_amount', 'pending_payment_duration', 'pending_payment_photos',
       'pending_payment_provider', 'pending_payment_order_tracking_id'].forEach((k) =>
        localStorage.removeItem(k)
      );
    }
  };

  const payment = usePayment({
    email,
    amount: price?.finalPrice || 300,
    serviceType: 'photo-to-video',
    metadata: { photoCount: photos.length, duration, aspectRatio, prompt },
  });

  const checkCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setError('');
      const res = await fetchWithRetry(`${API_BASE_URL}/api/check-redo-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim(), email }),
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setIsRedoMode(true);
        setSuccess('✅ Coupon valid! Regenerate for free.');
      } else {
        setError(data.error || 'Invalid coupon');
      }
    } catch (e) {
      setError('Could not verify coupon.');
    }
  };

  const handleRedoGeneration = async () => {
    setRedoLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/redeem-redo-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim(), email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await processPhotoVideo(data.paymentReference);
    } catch (e) {
      setError('Redo failed: ' + e.message);
      setRedoLoading(false);
    }
  };

  const canPay = photos.length > 0 && prompt.trim() && email;

  return (
    <div className="photos-to-video-page">
      <Helmet>
        <title>AI Photo to Video Maker — Turn Photos into Videos | Katareel</title>
        <meta name="description" content="Upload photos and let AI turn them into a moving video with narration. Perfect for real estate, products, weddings, and social media. From $2.32 (KES 300)." />
        <link rel="canonical" href="https://www.katareel.com/photos-to-video" />
      </Helmet>
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back to Home</button>
        <h1>🤖 AI Photo to Video</h1>
        <p>Upload photos and generate an AI-powered video</p>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="email-section">
            <label>📧 Your Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || redoLoading} />
          </div>

          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">🖼️</div>
              <p>Click to upload photos</p>
              <small>JPG, PNG, WEBP (Max 10MB each)</small>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple style={{ display: 'none' }} disabled={loading || redoLoading} />
            </div>
            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map((p) => (
                  <div key={p.id} className="photo-item">
                    <img src={p.preview} alt="uploaded" />
                    <button className="remove-photo" onClick={() => removePhoto(p.id)}>✕</button>
                  </div>
                ))}
                <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>+ Add More</button>
              </div>
            )}
            <div className="photo-count">{photos.length} Photo{photos.length !== 1 ? 's' : ''} Selected</div>
          </div>

          <div className="settings-section">
            <h3>🤖 AI Video Settings</h3>
            <div className="setting-group">
              <label>Describe what you want to generate</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} disabled={loading || redoLoading} />
            </div>
            <div className="setting-group">
              <label>🎙️ Speech / narration text (optional)</label>
              <textarea value={audioScript} onChange={(e) => setAudioScript(e.target.value)} rows={3} disabled={loading || redoLoading} />
            </div>
            <div className="setting-group">
              <label>🎙️ Narration Voice</label>
              <select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value)} disabled={loading || redoLoading}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Video Duration</label>
              <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} disabled={loading || redoLoading}>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={loading || redoLoading}>
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical)</option>
              </select>
            </div>
          </div>

          {!isRedoMode && price && (
            <div className="price-section">
              <h3>💰 Total Cost</h3>
              <div className="price-card">
                <div className="price-amount">{formatKes(price.finalPrice)}</div>
                <div className="price-details">
                  <p>✅ AI video generation</p>
                  <p>✅ {photos.length} photo(s)</p>
                  <p>✅ {duration}-second video</p>
                  <p>💵 ≈ {formatUsd(price.finalPrice, exchangeRate)} USD</p>
                </div>
              </div>
            </div>
          )}

          {(savedCoupon || isRedoMode) && (
            <div className="redo-section">
              <button className="redo-toggle-btn" onClick={() => setShowRedoSection(!showRedoSection)}>
                {showRedoSection ? '🔼 Hide' : '🔄 Need to redo? Click here'}
                {savedCoupon && !showRedoSection && <span className="coupon-badge">💳 Coupon available!</span>}
              </button>
              {showRedoSection && (
                <div className="redo-container">
                  {savedCoupon && <p className="saved-coupon-info">💡 Saved coupon: <strong>{savedCoupon}</strong></p>}
                  <div className="coupon-input-group">
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter redo coupon" disabled={loading || redoLoading} />
                    <button onClick={checkCoupon} disabled={!couponCode.trim()} className="check-coupon-btn">Check Coupon</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isRedoMode && (
            <div className="redo-mode-active">
              <div className="redo-badge">🔄 REDO MODE</div>
              <button className="generate-btn redo-generate-btn" onClick={handleRedoGeneration} disabled={redoLoading || !photos.length || !prompt.trim()}>
                {redoLoading ? '⏳ Processing...' : '🔄 Regenerate for Free'}
              </button>
              <button className="cancel-redo-btn" onClick={() => setIsRedoMode(false)}>Cancel Redo</button>
            </div>
          )}

          {!isRedoMode && (
            <div className="payment-section" style={{ marginTop: 16 }}>
              <div style={{ textAlign: 'center', fontSize: 14, color: '#334155', marginBottom: 8 }}>
                You will be charged{' '}
                <strong>{price ? formatKes(price.finalPrice) : '—'}</strong>{' '}
                <span style={{ color: '#64748b' }}>(≈ {price ? formatUsd(price.finalPrice, exchangeRate) : '—'} USD)</span>
              </div>
              <button
                type="button"
                onClick={payment.start}
                disabled={loading || payment.loading || !canPay}
                className="generate-btn"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
              >
                {loading || payment.loading
                  ? '⏳ Processing...'
                  : `💳 Pay ${price ? formatKes(price.finalPrice) : '—'} (${price ? formatUsd(price.finalPrice, exchangeRate) : '—'})`}
              </button>
              {(payment.error || error) && <div className="error-message" style={{ marginTop: 12 }}>❌ {payment.error || error}</div>}
            </div>
          )}

          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          <div className="video-preview">
            <h3>📹 Video Preview</h3>
            <div className="video-container">
              {videoUrl && !isPlaceholderVideo(videoUrl) ? (
                <>
                  <video controls className="video-player">
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                  {getDownloadUrl(videoUrl) && (
                    <a href={getDownloadUrl(videoUrl)} className="download-btn">📥 Download Video</a>
                  )}
                </>
              ) : (
                <div className="placeholder"><p>Upload photos and generate a video</p></div>
              )}
            </div>
          </div>
          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📤 Upload a photo</li>
              <li>📝 Describe what you want</li>
              <li>💳 Pay securely via Pesapal (Card, PayPal, or M-Pesa)</li>
              <li>📥 Download your video</li>
              <li>🔄 Use your redo coupon for free regeneration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotosToVideo;