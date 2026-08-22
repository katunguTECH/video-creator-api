// MusicCaptions.js - Updated with Paystack Integration and Fixed Upload Handling

import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================
// FIX: point every API call at the real backend origin,
// not a relative path (which resolves to the frontend's
// own domain and silently fails / returns an empty 200).
// ============================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

function MusicCaptions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captions, setCaptions] = useState([]);
  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicVolume, setMusicVolume] = useState(70);
  const [captionStyle, setCaptionStyle] = useState('subtle');
  const [captionPosition, setCaptionPosition] = useState('bottom');
  const [captionFontSize, setCaptionFontSize] = useState(24);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [error, setError] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [email, setEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const fileInputRef = useRef(null);

  const MUSIC_CAPTIONS_PRICE = 200;

  const captionStyles = {
    subtle: 'bg-black/40 text-white text-center px-4 py-2 rounded-lg',
    bold: 'bg-black/70 text-white text-center px-6 py-3 rounded-xl font-bold',
    neon: 'bg-transparent text-pink-400 text-center px-4 py-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)] font-bold',
    classic: 'bg-white/90 text-black text-center px-4 py-2 rounded',
    karaoke: 'bg-black/50 text-yellow-300 text-center px-4 py-2 rounded-lg font-bold'
  };

  // Check for payment success from URL params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentSuccess = params.get('payment');
    const ref = params.get('reference');

    if (paymentSuccess === 'success' && ref) {
      setPaymentReference(ref);
      setPaymentStatus('success');
      setError('');
      navigate('/music-captions', { replace: true });
    }
  }, [location, navigate]);

  // ============================================
  // FIXED: handleVideoUpload now hits the real backend
  // and handles empty/non-JSON bodies safely.
  // ============================================
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);

    try {
      console.log('📤 Uploading file:', file.name, file.size, 'bytes');

      const response = await fetch(`${API_BASE_URL}/api/upload-video`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response status:', response.status);

      // Read the body as text first so we never crash on an
      // empty or non-JSON response - then try to parse it.
      const rawText = await response.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseErr) {
        console.error('Non-JSON response body:', rawText);
        throw new Error(`Server returned an unexpected response (status ${response.status})`);
      }

      if (!response.ok) {
        throw new Error((data && data.error) || `Server error: ${response.status}`);
      }

      if (!data) {
        throw new Error('Empty response from server');
      }

      console.log('📥 Parsed JSON response:', data);

      if (data.success) {
        setVideoUrl(data.videoUrl);
        setResultVideoUrl('');
        setIsProcessingComplete(false);
        setError('');
        console.log('✅ Upload successful! Video URL:', data.videoUrl);
      } else {
        setError(data.error || 'Upload failed');
        console.error('❌ Upload failed:', data.error);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
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

    const newCaption = {
      id: Date.now(),
      text: captionText.trim(),
      timestamp: captions.length === 0 ? 0 : captions[captions.length - 1].timestamp + 1,
      style: captionStyle,
      position: captionPosition,
      fontSize: captionFontSize
    };

    setCaptions([...captions, newCaption]);
    setCaptionText('');
  };

  const handleRemoveCaption = (id) => {
    setCaptions(captions.filter(c => c.id !== id));
  };

  const handleClearCaptions = () => {
    setCaptions([]);
  };

  // Initialize Paystack Payment
  const handleInitializePayment = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!videoUrl) {
      setError('Please upload or provide a video URL first');
      return;
    }

    setIsInitializingPayment(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/initialize-music-captions-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          amount: MUSIC_CAPTIONS_PRICE,
        }),
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
        setError(data.error || 'Payment initialization failed. Please try again.');
      }
    } catch (err) {
      setError('Payment error: ' + err.message);
    } finally {
      setIsInitializingPayment(false);
    }
  };

  // Process video after successful payment
  const handleProcessVideo = async (reference) => {
    setIsProcessing(true);
    setError('');

    try {
      // Verify payment first
      const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference,
          email: email,
          amount: MUSIC_CAPTIONS_PRICE,
          serviceType: 'music-captions',
          paymentMethod: 'card',
          duration: 5
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        setError('Payment verification failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Prepare music URL
      let musicUrlToSend = null;
      if (musicFile) {
        musicUrlToSend = musicUrl;
      }

      const requestBody = {
        videoUrl: videoUrl,
        captions: captions,
        musicUrl: musicUrlToSend,
        musicVolume: musicVolume / 100,
        captionStyle: captionStyle,
        captionPosition: captionPosition,
        captionFontSize: captionFontSize,
        paymentReference: reference,
        email: email
      };

      console.log('📤 Processing video with:', {
        ...requestBody,
        captionsCount: captions.length,
        hasMusic: !!musicUrlToSend
      });

      const processResponse = await fetch(`${API_BASE_URL}/api/add-music-captions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Check if response is OK before parsing
      if (!processResponse.ok) {
        const text = await processResponse.text();
        console.error('Server error response:', text);
        throw new Error(`Server error: ${processResponse.status}`);
      }

      const processData = await processResponse.json();

      if (processData.success) {
        setResultVideoUrl(processData.resultVideoUrl);
        setIsProcessingComplete(true);
        setPaymentStatus('success');
        setError('');
        console.log('✅ Video processing complete!');
      } else {
        setError(processData.error || 'Processing failed');
        console.error('❌ Processing failed:', processData.error);
      }
    } catch (err) {
      console.error('❌ Processing error:', err);
      setError('Processing error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualProcess = async () => {
    if (!paymentReference) {
      setError('Please enter a payment reference');
      return;
    }
    await handleProcessVideo(paymentReference);
  };

  const handleDownload = () => {
    if (resultVideoUrl) {
      window.open(resultVideoUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold">🎵 Music & Captions</h1>
          <div className="w-20"></div>
        </div>

        {/* Payment Status Banner */}
        {paymentStatus === 'success' && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-green-300">
            ✅ Payment successful! Your video is being processed.
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6 text-yellow-300">
            ⏳ Payment in progress. Please complete the payment on the Paystack page.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Video Input */}
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📹 Your Video</h2>

              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-all">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  id="video-upload"
                  ref={fileInputRef}
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer block"
                >
                  {isUploading ? (
                    <div className="text-gray-400">⏳ Uploading...</div>
                  ) : videoUrl ? (
                    <div className="text-green-400">✅ Video uploaded</div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">📤</div>
                      <div className="text-gray-300">Click to upload video</div>
                      <div className="text-gray-500 text-sm">MP4, MOV, AVI, WEBM (Max 50MB)</div>
                    </div>
                  )}
                </label>
              </div>

              {videoUrl && (
                <div className="mt-3">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg max-h-48 bg-black"
                  />
                </div>
              )}

              <div className="mt-3">
                <label className="text-sm text-gray-400">Or enter video URL</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 mt-1"
                />
              </div>
            </div>

            {/* Payment & Email */}
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">💳 Payment & Delivery</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Email (for delivery & payment)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Payment Button */}
                <button
                  onClick={handleInitializePayment}
                  disabled={isInitializingPayment || !email || !videoUrl}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                    isInitializingPayment || !email || !videoUrl
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  }`}
                >
                  {isInitializingPayment ? '⏳ Initializing...' : `💰 Pay KES ${MUSIC_CAPTIONS_PRICE} with Paystack`}
                </button>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-white/20"></div>
                  <span className="text-gray-400 text-sm">OR</span>
                  <div className="flex-1 border-t border-white/20"></div>
                </div>

                {/* Manual Payment Reference (for testing) */}
                <div>
                  <label className="text-sm text-gray-400">Payment Reference (if already paid)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter payment reference"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    onClick={handleManualProcess}
                    disabled={isProcessing || !paymentReference || !videoUrl}
                    className={`w-full mt-2 py-2 rounded-lg font-semibold text-sm transition-all ${
                      isProcessing || !paymentReference || !videoUrl
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isProcessing ? '⏳ Processing...' : 'Verify & Process with Reference'}
                  </button>
                </div>

                <div className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg">
                  💰 Price: KES {MUSIC_CAPTIONS_PRICE} (Music + Captions)
                  <br />
                  <span className="text-xs text-gray-500">✓ Secure payment via Paystack</span>
                </div>
              </div>
            </div>

            {/* Music Upload */}
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">🎵 Background Music</h2>

              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-all">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleMusicUpload}
                  className="hidden"
                  id="music-upload"
                />
                <label htmlFor="music-upload" className="cursor-pointer block">
                  {musicFile ? (
                    <div className="text-green-400">✅ {musicFile.name}</div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">🎶</div>
                      <div className="text-gray-300">Click to upload background music</div>
                      <div className="text-gray-500 text-sm">MP3, WAV, M4A</div>
                    </div>
                  )}
                </label>
              </div>

              {musicFile && (
                <div className="mt-3">
                  <audio controls className="w-full">
                    <source src={musicUrl} type={musicFile.type} />
                  </audio>

                  <div className="mt-2">
                    <label className="text-sm text-gray-400">Music Volume: {musicVolume}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Captions */}
          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📝 Captions</h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Enter caption text..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCaption()}
                />
                <button
                  onClick={handleAddCaption}
                  className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Caption Settings */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-sm text-gray-400">Style</label>
                  <select
                    value={captionStyle}
                    onChange={(e) => setCaptionStyle(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="subtle">Subtle</option>
                    <option value="bold">Bold</option>
                    <option value="neon">Neon</option>
                    <option value="classic">Classic</option>
                    <option value="karaoke">Karaoke</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Position</label>
                  <select
                    value={captionPosition}
                    onChange={(e) => setCaptionPosition(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-400">Font Size: {captionFontSize}px</label>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    value={captionFontSize}
                    onChange={(e) => setCaptionFontSize(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>
              </div>

              {/* Captions List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {captions.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No captions added yet
                  </div>
                ) : (
                  captions.map((caption) => (
                    <div
                      key={caption.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <div className="text-sm">{caption.text}</div>
                        <div className="text-xs text-gray-400">
                          {caption.style} • {caption.position} • {caption.fontSize}px
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCaption(caption.id)}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {captions.length > 0 && (
                <button
                  onClick={handleClearCaptions}
                  className="text-red-400 hover:text-red-300 text-sm mt-2"
                >
                  Clear all captions
                </button>
              )}

              {/* Preview */}
              {videoUrl && captions.length > 0 && (
                <div className="mt-4 relative rounded-lg overflow-hidden bg-black/50">
                  <video
                    src={videoUrl}
                    className="w-full max-h-48 object-cover"
                    muted
                  />
                  <div className={`absolute inset-0 flex items-center ${captionPosition === 'bottom' ? 'justify-end pb-4' : captionPosition === 'top' ? 'items-start pt-4' : 'items-center'} px-4 pointer-events-none`}>
                    <div className={captionStyles[captionStyle] || captionStyles.subtle} style={{ fontSize: `${captionFontSize}px` }}>
                      {captions[captions.length - 1]?.text || 'Preview'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result */}
        {resultVideoUrl && (
          <div className="mt-8 bg-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">✅ Video Ready!</h2>
            <video
              src={resultVideoUrl}
              controls
              className="w-full rounded-lg max-h-96 bg-black"
              autoPlay
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleDownload}
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg transition-colors"
              >
                ⬇️ Download
              </button>
              <button
                onClick={() => {
                  setVideoUrl(resultVideoUrl);
                  setResultVideoUrl('');
                  setCaptions([]);
                  setMusicFile(null);
                  setMusicUrl('');
                  setPaymentStatus(null);
                }}
                className="bg-purple-500 hover:bg-purple-600 px-6 py-2 rounded-lg transition-colors"
              >
                🔄 Start Over
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicCaptions;
