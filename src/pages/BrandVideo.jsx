import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUsdToKesRate, formatKes, formatUsd } from '../utils/currency';
import { usePayment } from '../hooks/usePayment';
import { Helmet } from 'react-helmet-async';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const BRAND_VIDEO_PRICE = 250;

function BrandVideo() {
  const navigate = useNavigate();
  const location = useLocation();

  const [videoUrl, setVideoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [voiceoverScript, setVoiceoverScript] = useState('');
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exchangeRate, setExchangeRate] = useState(129.55);

  useEffect(() => {
    getUsdToKesRate().then(setExchangeRate).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderTrackingId = params.get('OrderTrackingId');
    const merchantRef = params.get('OrderMerchantReference');
    const provider = localStorage.getItem('pending_payment_provider');

    if (orderTrackingId && provider === 'pesapal') {
      (async () => {
        setIsProcessing(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/pesapal/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderTrackingId, merchantReference: merchantRef }),
          });
          const data = await res.json();
          if (data.success && data.status === 'completed') {
            await processBrandVideo(merchantRef || data.reference);
          } else {
            setError('Payment was not completed.');
            setIsProcessing(false);
          }
        } catch (e) {
          setError('Payment verification error: ' + e.message);
          setIsProcessing(false);
        }
        navigate('/brand-video', { replace: true });
      })();
    }
  }, [location, navigate]); // eslint-disable-line

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return setError('Video exceeds 50MB');
    setIsUploadingVideo(true);
    const fd = new FormData();
    fd.append('video', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-video`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setVideoUrl(data.videoUrl);
      else throw new Error(data.error);
    } catch (err) {
      setError('Video upload error: ' + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError('Logo exceeds 10MB');
    setIsUploadingLogo(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-image`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setLogoUrl(data.imageUrl);
      else throw new Error(data.error);
    } catch (err) {
      setError('Logo upload error: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const processBrandVideo = async (reference) => {
    setIsProcessing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/brand-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl, logoUrl, companyName, tagline, contactEmail, contactPhone,
          voiceoverScript, paymentReference: reference, email,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setResultVideoUrl(data.resultVideoUrl);
        setSuccess('✅ Brand video ready!');
      } else throw new Error(data.error || 'Processing failed');
    } catch (err) {
      setError('Processing error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseCoupon = async () => {
    if (!email || !videoUrl || !logoUrl || !companyName || !contactPhone)
      return setError('Please fill in all required fields first');
    if (!couponCode.trim()) return setError('Please enter a code');
    await processBrandVideo(couponCode.trim());
  };

  const payment = usePayment({
    email,
    amount: BRAND_VIDEO_PRICE,
    serviceType: 'brand-video',
    metadata: { companyName, tagline },
  });

  const canPay = email && videoUrl && logoUrl && companyName && contactPhone;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-emerald-900 text-white p-6">
      <Helmet>
        <title>Brand Video Maker — Add Logo Intro, Voiceover & Outro | Katareel</title>
        <meta name="description" content="Upload your video and logo. We add a professional intro card, AI voiceover, and closing contact card automatically. Ideal for SMEs. $1.93 (KES 250) flat rate." />
        <link rel="canonical" href="https://www.katareel.com/brand-video" />
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-sm">← Back to Home</button>
          <h1 className="text-3xl font-bold">🎬 Brand Video</h1>
          <div className="w-20"></div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📹 Your Video</h2>
            <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} />
            {isUploadingVideo && <div className="text-gray-400 mt-2">⏳ Uploading...</div>}
            {videoUrl && <div className="text-green-400 mt-2">✅ Video uploaded</div>}
          </div>

          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🖼️ Your Logo</h2>
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
            {isUploadingLogo && <div className="text-gray-400 mt-2">⏳ Uploading...</div>}
            {logoUrl && <img src={logoUrl} alt="logo" className="mt-3 max-h-24 rounded" />}
          </div>

          <div className="bg-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">🏢 Company Details</h2>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline (optional)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email (shown in video)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <textarea value={voiceoverScript} onChange={(e) => setVoiceoverScript(e.target.value)} placeholder="Custom voiceover script (optional — leave blank to auto-generate)" rows={3} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
          </div>

          <div className="bg-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">💳 Payment & Delivery</h2>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />

            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Have a free code? Enter it here" className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
              <button onClick={handleUseCoupon} disabled={isProcessing} className="px-5 py-2 rounded-lg font-semibold bg-white/20 hover:bg-white/30">Use Code</button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="text-xs text-gray-400">OR</span>
              <div className="flex-1 h-px bg-white/20"></div>
            </div>

            <div className="text-center text-sm text-gray-300">
              Total: <strong>{formatKes(BRAND_VIDEO_PRICE)}</strong>{' '}
              <span className="text-gray-400">(≈ {formatUsd(BRAND_VIDEO_PRICE, exchangeRate)} USD)</span>
            </div>

            <button
              type="button"
              onClick={payment.start}
              disabled={isProcessing || payment.loading || !canPay}
              className="w-full py-3 rounded-lg font-bold text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-white"
            >
              {isProcessing || payment.loading
                ? '⏳ Processing...'
                : `💳 Pay ${formatKes(BRAND_VIDEO_PRICE)} (${formatUsd(BRAND_VIDEO_PRICE, exchangeRate)})`}
            </button>
            {(payment.error || error) && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm text-center">❌ {payment.error || error}</div>
            )}
          </div>

          {isProcessing && (
            <div className="bg-white/10 rounded-xl p-6 text-center text-gray-300">⏳ Creating your branded video...</div>
          )}

          {resultVideoUrl && (
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">✅ Video Ready!</h2>
              <video src={resultVideoUrl} controls className="w-full rounded-lg max-h-96 bg-black" />
              <a href={resultVideoUrl.replace('/upload/', '/upload/fl_attachment/')} download className="block text-center bg-green-500 mt-4 py-2 rounded-lg">⬇️ Download</a>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-300 text-sm">{success}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BrandVideo;