import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

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
  const [paymentReference, setPaymentReference] = useState('');
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);

  const BRAND_VIDEO_PRICE = 250;

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentSuccess = params.get('payment');
    const ref = params.get('reference');
    if (paymentSuccess === 'success' && ref) {
      setPaymentReference(ref);
      setPaymentStatus('success');
      navigate('/brand-video', { replace: true });
    }
  }, [location, navigate]);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Video too large. Maximum size is 50MB.');
      return;
    }

    setIsUploadingVideo(true);
    setError('');
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-video`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
      } else {
        throw new Error(data.error || 'Video upload failed');
      }
    } catch (err) {
      setError('Video upload error: ' + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Logo too large. Maximum size is 10MB.');
      return;
    }

    setIsUploadingLogo(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-image`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setLogoUrl(data.imageUrl);
      } else {
        throw new Error(data.error || 'Logo upload failed');
      }
    } catch (err) {
      setError('Logo upload error: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleInitializePayment = async () => {
    if (!email) return setError('Please enter your email address');
    if (!videoUrl) return setError('Please upload a video first');
    if (!logoUrl) return setError('Please upload your logo first');
    if (!companyName) return setError('Please enter your company name');
    if (!contactPhone) return setError('Please enter a contact phone number');

    setIsInitializingPayment(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/initialize-brand-video-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (data.success) {
        setPaymentReference(data.reference);
        setPaymentStatus('pending');
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          setPaymentStatus('success');
          await handleProcessVideo(data.reference);
        }
      } else {
        setError(data.error || 'Payment initialization failed');
      }
    } catch (err) {
      setError('Payment error: ' + err.message);
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const handleProcessVideo = async (reference) => {
    setIsProcessing(true);
    setError('');

    try {
      const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          email,
          amount: BRAND_VIDEO_PRICE,
          serviceType: 'brand-video',
          paymentMethod: 'card',
          duration: 5
        })
      });
      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        setError('Payment verification failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/brand-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          logoUrl,
          companyName,
          tagline,
          contactEmail,
          contactPhone,
          voiceoverScript,
          paymentReference: reference,
          email
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${text}`);
      }

      const data = await response.json();
      if (data.success) {
        setResultVideoUrl(data.resultVideoUrl);
        setPaymentStatus('success');
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      setError('Processing error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-emerald-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-sm">
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold">🎬 Brand Video</h1>
          <div className="w-20"></div>
        </div>

        {paymentStatus === 'success' && !resultVideoUrl && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-green-300">
            ✅ Payment successful! Your video is being processed.
          </div>
        )}
        {paymentStatus === 'pending' && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6 text-yellow-300">
            ⏳ Payment in progress. Complete it on the Paystack page.
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📹 Your Video</h2>
            <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} className="w-full text-sm" />
            {isUploadingVideo && <div className="text-gray-400 mt-2">⏳ Uploading video...</div>}
            {videoUrl && <div className="text-green-400 mt-2">✅ Video uploaded</div>}
          </div>

          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🖼️ Your Logo</h2>
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="w-full text-sm" />
            {isUploadingLogo && <div className="text-gray-400 mt-2">⏳ Uploading logo...</div>}
            {logoUrl && <img src={logoUrl} alt="Logo preview" className="mt-3 max-h-24 rounded" />}
          </div>

          <div className="bg-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">🏢 Company Details</h2>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="Company name" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="text" value={tagline} onChange={e => setTagline(e.target.value)}
              placeholder="Tagline (optional)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              placeholder="Contact phone (e.g. +254700000000)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              placeholder="Contact email (shown in video)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <textarea value={voiceoverScript} onChange={e => setVoiceoverScript(e.target.value)}
              placeholder="Custom voiceover script (optional — leave blank to auto-generate)"
              rows={3} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
          </div>

          <div className="bg-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">💳 Payment & Delivery</h2>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Your email (for payment & delivery)" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2" />
            <button
              onClick={handleInitializePayment}
              disabled={isInitializingPayment}
              className="w-full py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-600"
            >
              {isInitializingPayment ? '⏳ Initializing...' : `💰 Pay KES ${BRAND_VIDEO_PRICE} & Create Video`}
            </button>
          </div>

          {isProcessing && (
            <div className="bg-white/10 rounded-xl p-6 text-center text-gray-300">
              ⏳ Creating your branded video... this may take a minute or two.
            </div>
          )}

          {resultVideoUrl && (
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">✅ Video Ready!</h2>
              <video src={resultVideoUrl} controls autoPlay className="w-full rounded-lg max-h-96 bg-black" />
              <a href={resultVideoUrl} download className="block text-center bg-green-500 hover:bg-green-600 mt-4 py-2 rounded-lg">
                ⬇️ Download
              </a>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BrandVideo;
