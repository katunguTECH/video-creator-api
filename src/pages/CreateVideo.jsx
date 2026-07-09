import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PaystackButton } from 'react-paystack';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Debug: Log environment variables
console.log('🔑 Environment Variables Check:');
console.log('REACT_APP_PAYSTACK_PUBLIC_KEY:', process.env.REACT_APP_PAYSTACK_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL ? '✅ Set' : '❌ Missing');

function CreateVideo() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [photos, setPhotos] = useState([]);
  const [music, setMusic] = useState('upbeat');
  const [caption, setCaption] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [duration, setDuration] = useState(5);

  // Payment states
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Price states
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

  // Paystack configuration
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
  
  // Check if we're using live keys
  const isLive = publicKey && publicKey.startsWith('pk_live_');
  const hasValidKey = publicKey && publicKey !== 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && publicKey.startsWith('pk_');

  console.log('🔑 Paystack Key Status:', {
    exists: !!publicKey,
    isLive: isLive,
    isValid: hasValidKey,
    keyPreview: publicKey ? publicKey.substring(0, 15) + '...' : 'None'
  });

  // Calculate price with 10x markup
  const calculatePrice = async () => {
    try {
      setIsLoadingPrice(true);
      setPriceError(null);

      let serviceType = 'replicate';
      let options = { duration: duration };

      if (activeTab === 'photos') {
        serviceType = 'photos_to_video';
        options = { photoCount: photos.length };
      }

      console.log('💰 Calculating price with:', { serviceType, options });

      const response = await fetch(`${API_URL}/api/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: serviceType,
          options: options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Price response:', data);

      if (data.success) {
        setPriceData(data.price);
        setAmount(data.price.finalPrice);
      } else {
        throw new Error(data.error || 'Price calculation failed');
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      setPriceError(error.message);
      // Fallback pricing
      const fallbackPrice = 200;
      setAmount(fallbackPrice);
      setPriceData({
        finalPrice: fallbackPrice,
        baseCost: 20,
        markupMultiplier: 10,
        markupAmount: 180,
        breakdown: [
          { item: 'AI Video Generation', amount: 10 },
          { item: 'Processing fee', amount: 10 }
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
    setIsProcessing(true);

    // Navigate to preview with payment reference
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
    // Validate inputs
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

    // Show payment modal
    console.log('💳 Opening payment modal for:', {
      email,
      amount,
      publicKey: publicKey ? '✅ Set' : '❌ Missing',
      isLive: isLive
    });
    
    setShowPayment(true);
  };

  const paystackProps = {
    email: email,
    amount: Math.round(amount * 100), // Convert to kobo
    publicKey: publicKey,
    currency: 'KES', // Explicitly set currency to KES
    text: `Pay KES ${amount?.toFixed(2) || '0.00'}`,
    onSuccess: handlePaymentSuccess,
    onClose: handlePaymentClose,
    metadata: {
      custom_fields: [
        {
          display_name: "Video Type",
          variable_name: "video_type",
          value: activeTab === 'text' ? 'Text to Video' : 'Photos to Video'
        },
        {
          display_name: "Duration",
          variable_name: "duration",
          value: `${duration}s`
        },
        {
          display_name: "Email",
          variable_name: "email",
          value: email
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">

        <h2 className="text-3xl font-bold mb-2 text-center">🎬 Create Your Video</h2>
        <p className="text-gray-400 text-center mb-8">
          {isLive ? '💳 Live Payments Enabled' : '🧪 Test Mode (Paystack Sandbox)'}
        </p>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2 font-semibold">📧 Your Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for payment receipt"
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            required
          />
        </div>

        {/* Duration Selector */}
        {activeTab === 'text' && (
          <div className="mb-4">
            <label className="block text-gray-300 mb-2 font-semibold">⏱️ Video Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white focus:outline-none focus:border-pink-500"
            >
              <option value="3">3 seconds</option>
              <option value="5">5 seconds</option>
              <option value="8">8 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>
        )}

        {/* Tabs */}
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

        {/* Text Prompt Tab */}
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

        {/* Photos Tab */}
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

        {/* Music Selector */}
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

        {/* Caption Input */}
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

          {priceError && (
            <div className="mt-2 text-xs text-red-400">
              ⚠️ Price calculation error: {priceError}
            </div>
          )}
        </div>

        {/* Payment Button */}
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
            {hasValidKey ? (
              <PaystackButton 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105"
                {...paystackProps} 
              />
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-4 text-center">
                <p className="text-yellow-400">⚠️ Payment keys not configured</p>
                <p className="text-gray-400 text-sm mt-1">
                  {!publicKey ? 'Please set REACT_APP_PAYSTACK_PUBLIC_KEY in environment' : 'Invalid key format. Please use a valid Paystack key.'}
                </p>
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

        {/* Payment Info */}
        <div className="mt-4 p-3 bg-white/5 rounded-xl text-center">
          <p className="text-xs text-gray-400">
            💳 Secure payment via Paystack • Card or M-Pesa accepted
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isLive ? '🔒 Live Mode - Real Payments' : '🧪 Test Mode - Sandbox Environment'}
          </p>
          {!isLive && publicKey && (
            <p className="text-xs text-yellow-400 mt-1">
              ⚠️ Using test mode. Set LIVE key for real payments.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default CreateVideo;