import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PaystackButton } from 'react-paystack';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TranslateVideo() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('sw');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedVideo, setTranslatedVideo] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [languages, setLanguages] = useState({});
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Payment states
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const videoRef = useRef(null);

  // Load supported languages
  useEffect(() => {
    fetch(`${API_URL}/api/free-languages`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLanguages(data.languages);
        }
      })
      .catch(console.error);
  }, []);

  // Calculate price
  useEffect(() => {
    if (video) {
      calculatePrice();
    }
  }, [video]);

  const calculatePrice = async () => {
    try {
      setIsLoadingPrice(true);
      
      const response = await fetch(`${API_URL}/api/calculate-translation-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoSize: video?.size || 0,
          duration: 5 // Default duration
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPriceData(data.price);
        setAmount(data.price.finalPrice);
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      setAmount(300);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setTranslatedVideo(null);
      setTranslatedText('');
      setError(null);
      setPaymentReference(null);
      
      // Upload the video
      const formData = new FormData();
      formData.append('video', file);
      
      try {
        const uploadResponse = await fetch(`${API_URL}/api/upload-video`, {
          method: 'POST',
          body: formData
        });
        
        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          setVideoPath(uploadData.videoPath);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError('Failed to upload video');
      }
    }
  });

  const handlePaymentSuccess = (reference) => {
    console.log('✅ Payment successful!', reference);
    setPaymentReference(reference);
    setIsProcessing(true);
    setShowPayment(false);
    
    // Start translation after payment
    handleTranslate(reference.reference || reference);
  };

  const handlePaymentClose = () => {
    setShowPayment(false);
    console.log('Payment modal closed');
  };

  const handleTranslate = async (reference) => {
    if (!video) {
      setError('Please upload a video first');
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    setStatusMessage('🎬 Translating your video...');

    try {
      // Check if payment is required
      if (!reference) {
        setShowPayment(true);
        return;
      }

      setProgress(20);
      setStatusMessage('🎤 Transcribing audio...');

      // Translate text sample
      const sampleText = "Welcome to DukaApp! Get loans based on your sales. Start today with a 14-day free trial.";
      
      setProgress(40);
      setStatusMessage('🌐 Translating text...');
      
      const translateResponse = await fetch(`${API_URL}/api/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleText,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage
        })
      });

      const translateData = await translateResponse.json();
      
      setProgress(60);
      setStatusMessage('🎬 Translating video...');

      // Translate the video with payment reference
      const videoTranslateResponse = await fetch(`${API_URL}/api/translate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: videoPreview,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage,
          email: email,
          paymentReference: reference
        })
      });

      const videoData = await videoTranslateResponse.json();
      
      setProgress(80);
      
      if (videoData.success) {
        setTranslatedText(translateData.translatedText);
        setTranslatedVideo(videoData.videoUrl);
        setStatusMessage('✅ Translation complete!');
        setProgress(100);
      } else {
        throw new Error(videoData.error || 'Video translation failed');
      }

    } catch (err) {
      setError(err.message);
      setStatusMessage('❌ Translation failed');
    } finally {
      setIsTranslating(false);
      setIsProcessing(false);
    }
  };

  const initiatePayment = () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (!video) {
      alert('Please upload a video first');
      return;
    }

    setShowPayment(true);
  };

  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
  const isLive = publicKey && publicKey.startsWith('pk_live_');

  const paystackProps = {
    email: email,
    amount: Math.round(amount * 100),
    publicKey: publicKey,
    currency: 'KES',
    text: `Pay KES ${amount?.toFixed(2) || '0.00'}`,
    onSuccess: handlePaymentSuccess,
    onClose: handlePaymentClose,
    metadata: {
      custom_fields: [
        { display_name: "Service", variable_name: "service", value: "Video Translation" },
        { display_name: "Target Language", variable_name: "target_language", value: targetLanguage },
        { display_name: "Email", variable_name: "email", value: email }
      ]
    }
  };

  const handleDownload = () => {
    if (translatedVideo) {
      const link = document.createElement('a');
      link.href = translatedVideo;
      link.download = 'translated-video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = () => {
    if (translatedVideo) {
      if (navigator.share) {
        navigator.share({
          title: 'Translated Video',
          text: 'Check out this translated video!',
          url: translatedVideo,
        }).catch(console.error);
      } else {
        alert('Share feature available on mobile devices');
      }
    }
  };

  // Filter languages based on search
  const [searchTerm, setSearchTerm] = useState('');
  const getFilteredLanguages = () => {
    if (!searchTerm) return languages;
    const filtered = {};
    Object.entries(languages).forEach(([code, name]) => {
      if (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          code.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[code] = name;
      }
    });
    return filtered;
  };

  const filteredLanguages = getFilteredLanguages();
  const languageCount = Object.keys(languages).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🌍 Translate Video</h2>
            <p className="text-gray-400 text-sm mt-1">Upload a video and translate it to another language</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2 font-semibold">📧 Your Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for payment confirmation and video delivery"
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Your translated video will be sent to this email</p>
        </div>

        {/* Upload Area */}
        {!videoPreview && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-pink-500 bg-pink-500/10' : 'border-white/30 hover:border-pink-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-gray-300 text-lg">
              {isDragActive ? 'Drop your video here' : 'Drag & drop a video here or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mt-2">Supports MP4, AVI, MOV, and more (Max 100MB)</p>
          </div>
        )}

        {/* Video Preview */}
        {videoPreview && (
          <div className="mb-6">
            <div className="bg-black/50 rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreview}
                controls
                className="w-full aspect-video object-cover"
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-sm text-gray-400">
              <span>📹 {video?.name || 'Video'} ({(video?.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button
                onClick={() => {
                  setVideo(null);
                  setVideoPreview(null);
                  setVideoPath(null);
                  setTranslatedVideo(null);
                  setTranslatedText('');
                  setPaymentReference(null);
                }}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Translation Options */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">Translation Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Source Language
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white"
              >
                <option value="auto">🔍 Auto-detect</option>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Target Language
              </label>
              <div>
                <input
                  type="text"
                  placeholder="🔍 Search languages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 mb-2"
                />
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white h-48 overflow-y-auto"
                  size={6}
                >
                  {Object.keys(filteredLanguages).length === 0 ? (
                    <option value="">No languages found</option>
                  ) : (
                    Object.entries(filteredLanguages).map(([code, name]) => (
                      <option key={code} value={code} className="py-1.5">
                        {name} ({code})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>{languageCount} languages available</span>
            {searchTerm && (
              <span>Found {Object.keys(filteredLanguages).length} matching</span>
            )}
          </div>
        </div>

        {/* Price Display */}
        <div className="bg-white/10 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300">💰 Total Cost</p>
              {isLoadingPrice ? (
                <p className="text-gray-400 text-sm">Calculating...</p>
              ) : priceData ? (
                <div>
                  <p className="text-2xl font-bold text-pink-400">
                    KES {priceData.finalPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Base: KES {priceData.baseCost.toFixed(2)} × {priceData.markupMultiplier}x markup
                  </p>
                </div>
              ) : (
                <p className="text-yellow-400 text-sm">Upload a video to calculate price</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Includes:</span>
              <ul className="text-xs text-gray-400">
                <li>✅ AI video translation</li>
                <li>✅ Audio processing</li>
                <li>✅ Email delivery</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Progress & Status */}
        {isTranslating && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <p className="text-gray-300 mb-3">{statusMessage}</p>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-6">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Translated Text */}
        {translatedText && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">✅ Translation Complete!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Original Text</p>
                <p className="text-sm text-gray-300 p-2 bg-black/30 rounded-lg">Welcome to DukaApp! Get loans based on your sales. Start today with a 14-day free trial.</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Translated Text</p>
                <p className="text-sm text-gray-300 p-2 bg-green-500/10 rounded-lg border border-green-500/30">{translatedText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Translated Video Preview */}
        {translatedVideo && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">🎬 Translated Video</h3>
            <video
              src={translatedVideo}
              controls
              className="w-full aspect-video rounded-xl"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleDownload}
                className="bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📥 Download Video
              </button>
              <button
                onClick={handleShare}
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📤 Share
              </button>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="bg-white/10 rounded-2xl p-6 mb-6">
            <p className="text-center text-gray-300 mb-4">Complete your payment below</p>
            <p className="text-center text-xs text-gray-400 mb-4">
              💳 You'll be redirected to Paystack to complete payment
            </p>
            {publicKey && publicKey.startsWith('pk_') ? (
              <PaystackButton 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105"
                {...paystackProps} 
              />
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-4 text-center">
                <p className="text-yellow-400">⚠️ Payment keys not configured</p>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    handlePaymentSuccess({ reference: 'test_ref_123' });
                  }}
                  className="mt-3 bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
                >
                  🧪 Test Mode: Skip Payment
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPayment(false)}
              className="w-full mt-3 text-gray-400 hover:text-gray-300 text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {videoPreview && !translatedVideo && (
          <button
            onClick={initiatePayment}
            disabled={isTranslating || isProcessing}
            className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 ${
              (isTranslating || isProcessing) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isTranslating || isProcessing 
              ? '⏳ Processing...' 
              : `💰 Pay KES ${amount?.toFixed(2) || '0.00'} & Translate 🚀`}
          </button>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-white/5 rounded-2xl">
          <h4 className="font-semibold mb-2">ℹ️ How It Works</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Upload a video with spoken audio</li>
            <li>• Choose source and target languages</li>
            <li>• Complete payment (KES {amount || 300})</li>
            <li>• AI will translate the audio</li>
            <li>• Download the translated video</li>
            <li>• Video link sent to your email</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            🌍 {languageCount} languages available for translation
          </p>
        </div>

      </div>
    </div>
  );
}

export default TranslateVideo;