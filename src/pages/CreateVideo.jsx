import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PaystackButton } from 'react-paystack';

// API URL - uses environment variable or falls back to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CreateVideo() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [photos, setPhotos] = useState([]);
  const [music, setMusic] = useState('upbeat');
  const [caption, setCaption] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  
  // Payment states
  const [email, setEmail] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState(200); // 200 KES default
  const [paymentReference, setPaymentReference] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      const previews = acceptedFiles.map(file =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setPhotos(prev => [...prev, ...previews]);
    }
  });

  // Calculate price based on video length and model
  const calculatePrice = () => {
    let basePrice = 200; // 200 KES base
    
    // Add cost for photos (if using photos tab)
    if (activeTab === 'photos' && photos.length > 0) {
      basePrice += photos.length * 20; // 20 KES per photo
    }
    
    // Add cost for longer videos (if prompt is long)
    if (prompt.length > 100) {
      basePrice += 50;
    }
    
    return basePrice;
  };

  const handlePaymentSuccess = (reference) => {
    console.log('✅ Payment successful!', reference);
    setPaymentReference(reference);
    setIsProcessing(true);
    
    // Proceed with video generation after payment
    handleCreateVideo(reference);
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
    
    // Calculate the price
    const calculatedAmount = calculatePrice();
    setAmount(calculatedAmount);
    setShowPayment(true);
  };

  const handleCreateVideo = async (reference) => {
    try {
      // Verify payment on backend
      const verifyResponse = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference.reference,
          email: email,
          amount: amount
        })
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      // Payment verified, proceed to preview
      navigate('/preview', {
        state: { 
          prompt, 
          photos: photos.map(p => p.preview), 
          music, 
          caption, 
          activeTab,
          paymentReference: reference.reference,
          amount: amount
        }
      });

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      alert('Payment verification failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Paystack configuration
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const paystackProps = {
    email: email,
    amount: amount * 100, // Convert to kobo (Paystack uses lowest currency unit)
    publicKey: publicKey,
    text: `Pay KES ${amount}`,
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
          display_name: "Prompt Preview",
          variable_name: "prompt_preview",
          value: prompt.substring(0, 50) + '...'
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <h2 className="text-3xl font-bold mb-2 text-center">🎬 Create Your Video</h2>
        <p className="text-gray-400 text-center mb-8">Choose how you want to create</p>

        {/* Email Input - Required for payment */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2 font-semibold">📧 Your Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for payment confirmation"
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            required
          />
        </div>

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

            {/* Photo Previews */}
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

        {/* Price Display */}
        <div className="bg-white/10 rounded-2xl p-4 mb-6 text-center">
          <p className="text-gray-300">
            Estimated Cost: <span className="text-pink-400 font-bold">KES {calculatePrice()}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'text' ? 'Per video generation' : `Per slideshow (${photos.length} photos)`}
          </p>
        </div>

        {/* Payment Button */}
        {!showPayment ? (
          <button
            onClick={initiatePayment}
            disabled={isProcessing}
            className={`w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105 ${
              isProcessing ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isProcessing ? '⏳ Processing...' : '💰 Pay & Generate 🚀'}
          </button>
        ) : (
          <div>
            <p className="text-center text-gray-300 mb-4">Complete your payment below</p>
            {publicKey && publicKey !== 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' ? (
              <PaystackButton 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-full text-xl transition-all transform hover:scale-105"
                {...paystackProps} 
              />
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-4 text-center">
                <p className="text-yellow-400">⚠️ Payment is currently in test mode</p>
                <p className="text-gray-400 text-sm mt-1">Set REACT_APP_PAYSTACK_PUBLIC_KEY in your environment</p>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    // For testing, bypass payment
                    handleCreateVideo({ reference: 'test_ref_123' });
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

      </div>
    </div>
  );
}

export default CreateVideo;