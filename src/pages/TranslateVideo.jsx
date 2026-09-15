import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TranslateVideo.css';
import { getUsdToKesRate, formatKes, formatUsd } from '../utils/currency';
import { usePayment } from '../hooks/usePayment';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const fetchWithRetry = async (url, options, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 400 || response.status === 404) return response;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
};

const getDownloadUrl = (url) =>
  !url ? url : url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;

const FALLBACK_LANGUAGES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean',
  zh: 'Chinese (Simplified)', ar: 'Arabic', hi: 'Hindi', sw: 'Swahili', ha: 'Hausa',
  yo: 'Yoruba', ig: 'Igbo', zu: 'Zulu', af: 'Afrikaans', am: 'Amharic',
};

const TRANSLATION_PRICE = 300;

function TranslateVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [translatedVideo, setTranslatedVideo] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [isRetryLoading, setIsRetryLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(129.55);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getUsdToKesRate().then(setExchangeRate).catch(() => {});
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/free-languages`);
        if (res.ok) {
          const data = await res.json();
          if (data.languages) setLanguages(data.languages);
        }
      } catch (_) {}
    })();
  }, []);

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
            await processTranslation(
              merchantRef || data.reference,
              localStorage.getItem('pending_payment_video_url') || videoUrl,
              localStorage.getItem('pending_payment_source_language') || sourceLanguage,
              localStorage.getItem('pending_payment_target_language') || targetLanguage,
              localStorage.getItem('pending_payment_email') || email
            );
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
  }, []); // eslint-disable-line

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return setError('File exceeds 50MB');
    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const res = await fetch(`${API_BASE_URL}/api/upload-video`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setSuccess('Video uploaded');
      } else throw new Error(data.message || 'Upload failed');
    } catch (err) {
      setError('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const processTranslation = async (reference, overrideUrl, overrideSource, overrideTarget, overrideEmail) => {
    setLoading(true);
    setError('');
    setSuccess('🔄 Processing your translation...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/translate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: overrideUrl || videoUrl,
          targetLanguage: overrideTarget || targetLanguage,
          sourceLanguage: overrideSource || sourceLanguage,
          paymentReference: reference,
          email: overrideEmail || email,
          duration: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslatedVideo(data.videoUrl);
        setSuccess('✅ Translation complete!');
        setPaymentReference(reference);
        setShowRetry(false);
        ['pending_payment_email','pending_payment_reference','pending_payment_video_url',
         'pending_payment_source_language','pending_payment_target_language',
         'pending_payment_provider','pending_payment_order_tracking_id'].forEach((k) =>
          localStorage.removeItem(k)
        );
      } else {
        setPaymentReference(reference);
        setShowRetry(true);
        setError(data.error || 'Translation failed');
      }
    } catch (err) {
      setPaymentReference(reference);
      setShowRetry(true);
      setError('Translation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeRetry = async () => {
    setIsRetryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/translate-video-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, targetLanguage, sourceLanguage, paymentReference, email, duration: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslatedVideo(data.videoUrl);
        setSuccess('✅ Retry complete!');
        setShowRetry(false);
      } else setError(data.error || 'Retry failed');
    } catch (e) {
      setError('Retry failed: ' + e.message);
    } finally {
      setIsRetryLoading(false);
    }
  };

  const payment = usePayment({
    email,
    amount: TRANSLATION_PRICE,
    serviceType: 'translation',
    metadata: { sourceLanguage, targetLanguage },
  });

  const canPay = selectedFile && targetLanguage && email && videoUrl;

  return (
    <div className="translate-video-container">
      <div className="header">
        <h1>🌐 Translate Video</h1>
        <p>Upload a video and translate it to another language</p>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="email-section">
            <label>📧 Your Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          </div>

          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              {!selectedFile ? (
                <>
                  <div className="upload-icon">📹</div>
                  <p>Click to upload a video</p>
                  <small>MP4, AVI, MOV, WEBM (Max 50MB)</small>
                </>
              ) : (
                <div className="file-info">
                  <span>📹 {selectedFile.name}</span>
                  <button className="remove-file" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setVideoUrl(null); }}>Remove</button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" style={{ display: 'none' }} />
            </div>
            {uploading && <div className="spinner">Uploading...</div>}
          </div>

          <div className="language-section">
            <div className="language-group">
              <label>🔍 Source Language</label>
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                <option value="auto">Auto-detect</option>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div className="language-group">
              <label>🎯 Target Language</label>
              <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="price-section">
            <h3>💰 Total Cost</h3>
            <div className="price-card">
              <div className="price-amount">{formatKes(TRANSLATION_PRICE)}</div>
              <div className="price-details">
                <p>✅ AI video translation</p>
                <p>✅ Audio processing</p>
                <p>💵 ≈ {formatUsd(TRANSLATION_PRICE, exchangeRate)} USD</p>
              </div>
            </div>
          </div>

          <div className="payment-section" style={{ marginTop: 16 }}>
            <div style={{ textAlign: 'center', fontSize: 14, color: '#334155', marginBottom: 8 }}>
              You will be charged <strong>{formatKes(TRANSLATION_PRICE)}</strong>{' '}
              <span style={{ color: '#64748b' }}>(≈ {formatUsd(TRANSLATION_PRICE, exchangeRate)} USD)</span>
            </div>
            <button
              type="button"
              onClick={payment.start}
              disabled={loading || payment.loading || !canPay}
              className="translate-btn"
            >
              {loading || payment.loading
                ? '⏳ Processing...'
                : `💳 Pay ${formatKes(TRANSLATION_PRICE)} (${formatUsd(TRANSLATION_PRICE, exchangeRate)})`}
            </button>
            {(payment.error || error) && <div className="error-message" style={{ marginTop: 12 }}>❌ {payment.error || error}</div>}
          </div>

          {showRetry && paymentReference && (
            <div className="retry-section">
              <p>🔄 Pending payment (Ref: {paymentReference})</p>
              <button className="retry-btn" onClick={handleFreeRetry} disabled={isRetryLoading}>
                {isRetryLoading ? '⏳...' : '🔄 Retry Translation (Free)'}
              </button>
            </div>
          )}

          {translatedVideo && (
            <div className="translated-video-section">
              <h3>🎉 Your Translated Video</h3>
              <video controls src={translatedVideo} style={{ width: '100%', borderRadius: 8 }} />
              <a href={getDownloadUrl(translatedVideo)} download className="download-btn">⬇️ Download</a>
            </div>
          )}

          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          <h4>📖 How It Works</h4>
          <ul>
            <li>📤 Upload a video with audio</li>
            <li>🌍 Choose languages</li>
            <li>💳 Pay securely via Pesapal (Card or M-Pesa)</li>
            <li>📥 Download the translated video</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TranslateVideo;