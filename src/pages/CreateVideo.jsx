import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PaystackButton } from 'react-paystack';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CreateVideo() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [photos, setPhotos] = useState([]);
  const [music, setMusic] = useState('upbeat');
  const [caption, setCaption] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [duration, setDuration] = useState(5);

  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState(null);
  
  // Retry states
  const [hasFailedPayment, setHasFailedPayment] = useState(false);
  const [failedPaymentRef, setFailedPaymentRef] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [priceData, setPriceData] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [amount, setAmount] = useState(0);
  const [priceError, setPriceError] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      const previews = acceptedFiles.map(file =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setPhotos(prev => [...prev, ...previews]);
    }
  });

  // Check for failed payments when email changes
  useEffect(() => {
    if (email) {
      checkFailedPayment();
    }
  }, [email]);

  const checkFailedPayment = async () => {
    if (!email) return;
    
    try {
      console.log('🔍 Checking for failed payments for:', email);
      const response = await fetch(`${API_URL}/api/check-failed-by-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      console.log('📦 Failed payment check response:', data);
      
      if (data.success && data.hasFailed) {
        setHasFailedPayment(true);
        setFailedPaymentRef(data.paymentReference);
        setStatusMessage('⚠️ You have a failed video generation. Click "Retry Failed Video" to try again for free.');
        console.log('📝 Found failed payment:', data.paymentReference);
      }
    } catch (error) {
      console.error('Error checking failed payment:', error);
    }
  };

  const handleRetry = async () => {
    if (!failedPaymentRef) return;
    
    setIsProcessing(true);
    setStatusMessage('🔄 Retrying failed video (free)...');
    setError(null);
    
    try {
      navigate('/preview', {
        state: {
          prompt,
          photos: photos.map(p => p.preview),
          music,
          caption,
          activeTab,
          paymentReference: failedPaymentRef,
          amount: amount,
          duration: duration,
          email: email,
          isRetry: true
        }
      });
    } catch (error) {
      console.error('Retry error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatePrice = async () => {
    try {
      setIsLoadingPrice(true);
      setPriceError(null);

      let serviceType = 'byteplus';
      let options = { duration: duration };

      if (activeTab === 'photos') {
        serviceType = 'photos_to_video';
        options = { photoCount: photos.length };
      }

      const response = await fetch(`${API_URL}/api/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType, options })
      });

      const data = await response.json();

      if (data.success) {
        setPriceData(data.price);
        setAmount(data.price.finalPrice);
      } else {
        throw new Error(data.error || 'Price calculation failed');
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      setPriceError(error.message);
      // Fallback pricing based on duration
      const fallbackPrice = duration === 10 ? 600 : 300;
      setAmount(fallbackPrice);
      setPriceData({
        finalPrice: fallbackPrice,
        baseCost: duration === 10 ? 60 : 30,
        markupMultiplier: 10,
        markupAmount: duration === 10 ? 540 : 270,
        breakdown: [
          { item: 'AI Video Generation (BytePlus)', amount: duration === 10 ? 40 : 20 },
          { item: `${duration}s video processing`, amount: duration === 10 ? 20 : 10 },
          { item: 'HD Quality', amount: 0 }
        ],
        currency: 'KES'
      });
    } finally {
      setIsLoadingPrice(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [prompt, photos.length, activeTab, duration]);

  const handlePaymentSuccess = (reference) => {
    console.log('✅ Payment successful!', reference);
    setPaymentReference(reference);
    setIsProcessing(true);

    navigate('/preview', {
      state: {
        prompt,
        photos: photos.map(p => p.preview),
        music,
        caption,
        activeTab,
        paymentReference: reference.reference || reference,
        amount: amount,
        duration: duration,
        email: email
      }
    });
  };

  const handlePaymentClose = () => {
    setShowPayment(false);
    console.log('Payment modal closed');
  };

  const initiatePayment = () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (activeTab === 'text' && !prompt.trim()) {
      alert('Please enter a text prompt!');
      return;
    }

    if (activeTab === 'photos' && photos.length === 0) {
      alert('Please upload at least one photo!');
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
        { display_name: "Video Type", variable_name: "video_type", value: activeTab },
        { display_name: "Duration", variable_name: "duration", value: `${duration}s` },
        { display_name: "Email", variable_name: "email", value: email }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">

        <h2 className="text-3xl font-bold mb-2 text-center">🎬 Create Your Video</h2>
        <p className="text-gray-400 text-center mb-8">
          {isLive ? '💳 Live Payments Enabled' : '🧪 Test Mode'}
        </p>

        {/* Status Message */}
        {statusMessage && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-4 mb-4">
            <p className="text-yellow-300">{statusMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-4">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Retry Button for Failed Payments */}
        {hasFailedPayment && (
          <div className="mb-4">
            <button
              onClick={handleRetry}
              disabled={isProcessing}
              className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                isProcessing ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              {isProcessing ? '⏳ Processing...' : '🔄 Retry Failed Video (Free)'}
            </button>
            <p className="text-xs text-yellow-400 text-center mt-2">
              You previously paid for a video that failed. This retry is free.
            </p>
          </div>
        )}

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
          <p className="text-xs text-gray-500 mt-1">Your video will be sent to this email after generation</p>
        </div>

        {/* Duration Selector - Now with 10-second option */}
        {activeTab === 'text' && (
          <div className="mb-4">
            <label className="block text-gray-300 mb-2 font-semibold">⏱️ Video Duration</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDuration(5)}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  duration === 5 
                    ? 'bg-pink-500 shadow-lg shadow-pink-500/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                5s
                <span className="block text-xs text-gray-400 font-normal">Standard</span>
              </button>
              <button
                onClick={() => setDuration(10)}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  duration === 10 
                    ? 'bg-purple-500 shadow-lg shadow-purple-500/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                10s
                <span className="block text-xs text-gray-400 font-normal">Premium</span>
              </button>
              <button
                onClick={() => setDuration(15)}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  duration === 15 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg shadow-purple-500/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                15s
                <span className="block text-xs text-gray-400 font-normal">Pro</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {duration === 5 && '🎯 Standard quality, perfect for social media'}
              {duration === 10 && '🌟 Premium quality with more detail and motion'}
              {duration === 15 && '👑 Pro quality, cinematic experience'}
            </p>
          </div>
        )}

        <div className="flex bg-white/10 rounded-full p-1 mb-8">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 rounded-full font-bold transition-all ${activeTab === 'text' ? 'bg-pink-500' : ''}`}
          >
            ✍️ Text Prompt
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 py-2 rounded-full font-bold transition-all ${activeTab === 'photos' ? 'bg-pink-500' : ''}`}
          >
            🖼️ My Photos
          </button>
        </div>

        {activeTab === 'text' && (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 font-semibold">Describe your video</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. A sunset over the ocean with waves crashing on the beach..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 h-36 resize-none focus:outline-none focus:border-pink-500"
            />
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="mb-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-pink-500 bg-pink-500/10' : 'border-white/30 hover:border-pink-400'}`}
            >
              <input {...getInputProps()} />
              <div className="text-5xl mb-3">📸</div>
              <p className="text-gray-300">Drag & drop photos here or <span className="text-pink-400 font-bold">browse</span></p>
              <p className="text-gray-500 text-sm mt-1">Supports JPG, PNG, WEBP</p>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img src={photo.preview} alt="" className="w-full h-24 object-cover rounded-xl" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 text-xs font-bold"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-semibold">🎵 Background Music</label>
          <div className="grid grid-cols-3 gap-3">
            {['upbeat', 'calm', 'dramatic', 'romantic', 'none'].map(type => (
              <button
                key={type}
                onClick={() => setMusic(type)}
                className={`py-2 px-4 rounded-full capitalize font-semibold transition-all ${music === type ? 'bg-pink-500' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-gray-300 mb-2 font-semibold">📝 Caption / Text Overlay</label>
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="e.g. Living my best life ✨"
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Price Display with Breakdown */}
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
                  {duration === 10 && (
                    <p className="text-xs text-purple-400 mt-1">⭐ Premium 10s video</p>
                  )}
                  {duration === 15 && (
                    <p className="text-xs text-yellow-400 mt-1">👑 Pro 15s video</p>
                  )}
                </div>
              ) : (
                <p className="text-yellow-400 text-sm">Select options to calculate price</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Includes:</span>
              <ul className="text-xs text-gray-400">
                <li>✅ AI video generation</li>
                <li>✅ Music & effects</li>
                <li>✅ HD quality</li>
                <li>✅ Email delivery</li>
              </ul>
            </div>
          </div>

          {priceData && priceData.breakdown && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-gray-400">📊 Price Breakdown</p>
              <div className="mt-1 space-y-1">
                {priceData.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-gray-400">
                    <span>{item.item}</span>
                    <span>KES {item.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-yellow-400 border-t border-white/10 pt-1 mt-1">
                  <span>➕ {priceData.markupMultiplier}x Markup</span>
                  <span>KES {priceData.markupAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!showPayment ? (
          <button
            onClick={initiatePayment}
            disabled={isProcessing || !priceData}
            className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105 ${
              (isProcessing || !priceData) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isProcessing ? '⏳ Processing...' : `💰 Pay KES ${amount?.toFixed(2) || '0.00'} & Generate 🚀`}
          </button>
        ) : (
          <div className="bg-white/10 rounded-2xl p-6">
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
                    navigate('/preview', {
                      state: {
                        prompt,
                        photos: photos.map(p => p.preview),
                        music,
                        caption,
                        activeTab,
                        paymentReference: 'test_ref_123',
                        amount: amount || 100,
                        duration: duration,
                        email: email
                      }
                    });
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

        <div className="mt-4 p-3 bg-white/5 rounded-xl text-center">
          <p className="text-xs text-gray-400">
            💳 Secure payment via Paystack • Card or M-Pesa accepted
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Powered by BytePlus Seedance AI • Your video will be sent to your email
          </p>
        </div>

      </div>
    </div>
  );
}

export default CreateVideo;