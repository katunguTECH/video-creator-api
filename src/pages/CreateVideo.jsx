import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Set to true to skip payment for testing
const TEST_MODE = true;

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
      const fallbackPrice = 100;
      setAmount(fallbackPrice);
      setPriceData({
        finalPrice: fallbackPrice,
        baseCost: 10,
        markupMultiplier: 10,
        markupAmount: 90,
        breakdown: [
          { item: 'AI Video Generation', amount: 10 },
          { item: 'Processing fee', amount: 0 }
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

  const handleCreate = () => {
    // Validate inputs
    if (activeTab === 'text' && !prompt.trim()) {
      alert('Please enter a text prompt!');
      return;
    }

    if (activeTab === 'photos' && photos.length === 0) {
      alert('Please upload at least one photo!');
      return;
    }

    if (!email) {
      alert('Please enter your email address');
      return;
    }

    console.log('🚀 Creating video with:', {
      prompt: prompt.substring(0, 50) + '...',
      photos: photos.length,
      duration,
      amount,
      email
    });

    // In test mode, skip payment
    if (TEST_MODE) {
      console.log('🧪 Test mode: Skipping payment');
      navigate('/preview', {
        state: {
          prompt,
          photos: photos.map(p => p.preview),
          music,
          caption,
          activeTab,
          paymentReference: 'test_ref_' + Date.now(),
          amount: amount || 100,
          duration: duration,
          email: email
        }
      });
      return;
    }

    // Normal payment flow would go here
    navigate('/preview', {
      state: {
        prompt,
        photos: photos.map(p => p.preview),
        music,
        caption,
        activeTab,
        paymentReference: 'test_ref_' + Date.now(),
        amount: amount || 100,
        duration: duration,
        email: email
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">

        <h2 className="text-3xl font-bold mb-2 text-center">🎬 Create Your Video</h2>
        <p className="text-gray-400 text-center mb-8">
          {TEST_MODE ? '🧪 Test Mode - No Payment Required' : 'Pay once, generate your video instantly'}
        </p>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2 font-semibold">📧 Your Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
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

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isProcessing}
          className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105 ${
            isProcessing ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
          }`}
        >
          {isProcessing ? '⏳ Processing...' : TEST_MODE ? '🧪 Generate Video (Test)' : `💰 Pay KES ${amount?.toFixed(2) || '0.00'} & Generate 🚀`}
        </button>

        {TEST_MODE && (
          <p className="text-center text-xs text-yellow-400 mt-3">
            ⚠️ Test Mode: Payment is disabled for testing
          </p>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-white/5 rounded-xl text-center">
          <p className="text-xs text-gray-400">
            💳 Powered by Replicate AI • HappyHorse Model
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Videos generated in HD quality
          </p>
        </div>

      </div>
    </div>
  );
}

export default CreateVideo;