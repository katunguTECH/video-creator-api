import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUsdToKesRate, formatKes, formatUsd } from '../utils/currency';
import { usePayment } from '../hooks/usePayment';
import { Helmet } from 'react-helmet-async';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

const MUSIC_CAPTIONS_PRICE = 200;

function MusicCaptions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captions, setCaptions] = useState([]);
  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicVolume, setMusicVolume] = useState(70);
  const [captionStyle, setCaptionStyle] = useState('subtle');
  const [captionPosition, setCaptionPosition] = useState('bottom');
  const [captionFontSize, setCaptionFontSize] = useState(24);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [exchangeRate, setExchangeRate] = useState(129.55);
  const fileInputRef = useRef(null);

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
            await runProcessing(merchantRef || data.reference);
          } else {
            setError('Payment was not completed.');
            setIsProcessing(false);
          }
        } catch (e) {
          setError('Payment verification error: ' + e.message);
          setIsProcessing(false);
        }
        navigate('/music-captions', { replace: true });
      })();
    }
  }, [location, navigate]); // eslint-disable-line

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return setError('File exceeds 50MB');
    setIsUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('video', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-video`, { method: 'POST', body: fd });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data?.success) {
        setVideoUrl(data.videoUrl);
        setResultVideoUrl('');
      } else throw new Error(data?.error || 'Upload failed');
    } catch (err) {
      setError('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMusicUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setMusicFile(file);
    setMusicUrl(URL.createObjectURL(file));
  };

  const handleAddCaption = () => {
    if (!captionText.trim()) return;
    setCaptions([
      ...captions,
      {
        id: Date.now(),
        text: captionText.trim(),
        timestamp: captions.length === 0 ? 0 : captions[captions.length - 1].timestamp + 1,
        style: captionStyle,
        position: captionPosition,
        fontSize: captionFontSize,
      },
    ]);
    setCaptionText('');
  };

  const runProcessing = async (reference) => {
    setIsProcessing(true);
    setError('');
    try {
      const v = await fetch(`${API_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          email,
          amount: MUSIC_CAPTIONS_PRICE,
          serviceType: 'music-captions',
          paymentMethod: 'card',
          duration: 5,
        }),
      });
      const vd = await v.json();
      if (!vd.success) throw new Error('Payment verification failed');

      const res = await fetch(`${API_BASE_URL}/api/add-music-captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          captions,
          musicUrl: musicFile ? musicUrl : null,
          musicVolume: musicVolume / 100,
          captionStyle,
          captionPosition,
          captionFontSize,
          paymentReference: reference,
          email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultVideoUrl(data.resultVideoUrl);
        setSuccess('✅ Music & captions added!');
      } else throw new Error(data.error || 'Processing failed');
    } catch (err) {
      setError('Processing error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const payment = usePayment({
    email,
    amount: MUSIC_CAPTIONS_PRICE,
    serviceType: 'music-captions',
    metadata: { captionCount: captions.length, hasMusic: !!musicFile },
  });

  const canPay = email && videoUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white p-6">
      <Helmet>
        <title>Add Music & Captions to Any Video — AI Caption Tool | Katareel</title>
        <meta name="description" content="Add background music and on-screen captions to any video in minutes. Multiple caption styles, positioned exactly where you want. KES 200 flat rate." />
        <link rel="canonical" href="https://www.katareel.com/music-captions" />
      </Helmet>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-sm">← Back to Home</button>
          <h1 className="text-3xl font-bold">🎵 Music & Captions</h1>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📹 Your Video</h2>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" id="video-upload" ref={fileInputRef} />
                <label htmlFor="video-upload" className="cursor-pointer block">
                  {isUploading ? '⏳ Uploading...' : videoUrl ? '✅ Video uploaded' : '📤 Click to upload'}
                </label>
              </div>
              {videoUrl && <video src={videoUrl} controls className="w-full mt-3 rounded-lg max-h-48 bg-black" />}
            </div>

            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">💳 Payment</h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 mb-3"
              />

              <div style={{ textAlign: 'center', fontSize: 14, color: '#cbd5e1', marginBottom: 8 }}>
                You will be charged <strong style={{ color: '#fff' }}>{formatKes(MUSIC_CAPTIONS_PRICE)}</strong>{' '}
                <span style={{ color: '#94a3b8' }}>(≈ {formatUsd(MUSIC_CAPTIONS_PRICE, exchangeRate)} USD)</span>
              </div>
              <button
                type="button"
                onClick={payment.start}
                disabled={isProcessing || payment.loading || !canPay}
                className="w-full py-3 rounded-lg font-bold text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-white"
              >
                {isProcessing || payment.loading
                  ? '⏳ Processing...'
                  : `💳 Pay ${formatKes(MUSIC_CAPTIONS_PRICE)} (${formatUsd(MUSIC_CAPTIONS_PRICE, exchangeRate)})`}
              </button>
              {(payment.error || error) && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm text-center mt-3">❌ {payment.error || error}</div>
              )}
            </div>

            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">🎵 Background Music</h2>
              <input type="file" accept="audio/*" onChange={handleMusicUpload} />
              {musicFile && (
                <>
                  <audio controls className="w-full mt-3"><source src={musicUrl} type={musicFile.type} /></audio>
                  <label className="text-sm text-gray-400 mt-2 block">Volume: {musicVolume}%</label>
                  <input type="range" min="0" max="100" value={musicVolume} onChange={(e) => setMusicVolume(parseInt(e.target.value))} className="w-full accent-pink-500" />
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📝 Captions</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Caption text..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCaption()}
                />
                <button onClick={handleAddCaption} className="bg-pink-500 px-4 py-2 rounded-lg">Add</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {captions.map((c) => (
                  <div key={c.id} className="flex justify-between bg-white/5 rounded-lg p-3">
                    <span className="text-sm">{c.text}</span>
                    <button onClick={() => setCaptions(captions.filter((x) => x.id !== c.id))} className="text-red-400">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {resultVideoUrl && (
          <div className="mt-8 bg-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">✅ Video Ready!</h2>
            <video src={resultVideoUrl} controls className="w-full rounded-lg max-h-96 bg-black" />
            <a href={resultVideoUrl.replace('/upload/', '/upload/fl_attachment/')} download className="inline-block bg-green-500 mt-4 px-6 py-2 rounded-lg">⬇️ Download</a>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-300 text-sm text-center">{success}</div>
        )}
      </div>
    </div>
  );
}

export default MusicCaptions;