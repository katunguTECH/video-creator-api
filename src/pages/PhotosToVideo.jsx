import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PaystackButton } from 'react-paystack';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function PhotosToVideo() {
  const navigate = useNavigate();
  
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('slideshow'); // 'slideshow' or 'ai'
  
  // Payment states
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState(0);
  
  // Video settings
  const [settings, setSettings] = useState({
    duration: 3,
    transition: 'fade',
    music: 'none',
    caption: '',
    resolution: '720p',
    aspectRatio: '16:9'
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState([]);
  const [priceData, setPriceData] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      const previews = acceptedFiles.map(file =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setPhotos(prev => [...prev, ...previews]);
      if (previews.length > 0) {
        setSelectedPhoto(previews[0].preview);
      }
      setVideoUrl(null);
      setFrames([]);
      setError(null);
    }
  });

  // Calculate price for AI generation
  const calculatePrice = async () => {
    try {
      setIsLoadingPrice(true);
      
      const response = await fetch(`${API_URL}/api/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: 'image_to_video',
          options: { duration: 5 }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPriceData(data.price);
        setAmount(data.price.finalPrice);
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      setAmount(500); // Fallback price
    } finally {
      setIsLoadingPrice(false);
    }
  };

  useEffect(() => {
    if (mode === 'ai') {
      calculatePrice();
    }
  }, [mode]);

  // Slideshow generation (existing code)
  const generateSlideshow = () => {
    if (photos.length < 2) {
      setError('Please upload at least 2 photos for a slideshow');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('🎬 Generating slideshow...');
    setFrames([]);
    setError(null);
    
    const newFrames = [];
    let loadedCount = 0;
    
    photos.forEach((photo, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const width = settings.aspectRatio === '16:9' ? 640 : 480;
      const height = settings.aspectRatio === '16:9' ? 360 : 640;
      canvas.width = width;
      canvas.height = height;
      
      const img = new Image();
      img.src = photo.preview;
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > canvasRatio) {
          drawHeight = height;
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = width;
          drawHeight = width / imgRatio;
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        }
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        if (settings.caption) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, height - 60, width, 60);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(settings.caption, width / 2, height - 30);
        }
        
        const dataUrl = canvas.toDataURL('image/png');
        newFrames[index] = dataUrl;
        loadedCount++;
        
        if (loadedCount === photos.length) {
          setFrames(newFrames);
          setVideoUrl(newFrames[0]);
          setProgress(100);
          setIsGenerating(false);
          setStatusMessage('✅ Slideshow generated! 🎉');
          setIsPlaying(true);
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === photos.length) {
          setFrames(newFrames);
          setVideoUrl(newFrames[0] || photos[0].preview);
          setProgress(100);
          setIsGenerating(false);
          setStatusMessage('✅ Slideshow generated! 🎉');
          setIsPlaying(true);
        }
      };
    });
  };

  // AI Video Generation
  const generateAIVideo = async () => {
    if (!selectedPhoto) {
      setError('Please select a photo first');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a text prompt');
      return;
    }

    if (!email) {
      setError('Please enter your email for payment');
      return;
    }

    // Show payment modal
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (reference) => {
    setShowPayment(false);
    setIsProcessing(true);
    setStatusMessage('🎬 Generating AI video...');
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-image-to-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          imageUrl: selectedPhoto,
          paymentReference: reference.reference || reference,
          duration: 5
        })
      });

      const data = await response.json();
      console.log('📦 AI Video Response:', data);

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setFrames([]); // Clear slideshow frames
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage('✅ AI video generated successfully! 🎉');
        setIsPlaying(true);
      } else {
        throw new Error(data.error || 'Failed to generate AI video');
      }
    } catch (error) {
      console.error('❌ AI Generation error:', error);
      setError(error.message);
      setStatusMessage('❌ AI Generation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentClose = () => {
    setShowPayment(false);
    console.log('Payment modal closed');
  };

  const handleGenerate = () => {
    if (mode === 'slideshow') {
      generateSlideshow();
    } else {
      generateAIVideo();
    }
  };

  // Auto-play frames
  useEffect(() => {
    if (frames.length > 1 && isPlaying) {
      const interval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frames.length);
      }, settings.duration * 1000);
      return () => clearInterval(interval);
    }
  }, [frames, isPlaying, settings.duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDownloadFrame = () => {
    if (frames.length > 0) {
      const link = document.createElement('a');
      link.download = `frame-${currentFrame + 1}.png`;
      link.href = frames[currentFrame];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (frames.length > 0) {
      // Export slideshow as video
      alert('Exporting slideshow as video...');
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setVideoUrl(null);
    setFrames([]);
    setSelectedPhoto(null);
  };

  const selectPhoto = (preview) => {
    setSelectedPhoto(preview);
  };

  // Paystack configuration
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
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
        {
          display_name: "Service",
          variable_name: "service",
          value: "AI Image-to-Video"
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🖼️ Photos to Video</h2>
            <p className="text-gray-400 text-sm mt-1">Create slideshows or AI-powered videos from your photos</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-white/10 rounded-full p-1 mb-6">
          <button
            onClick={() => setMode('slideshow')}
            className={`flex-1 py-2 rounded-full font-bold transition-all ${mode === 'slideshow' ? 'bg-pink-500' : ''}`}
          >
            🖼️ Slideshow (Free)
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 py-2 rounded-full font-bold transition-all ${mode === 'ai' ? 'bg-purple-500' : ''}`}
          >
            🤖 AI Video (Paid)
          </button>
        </div>

        {/* Email Input (for AI mode) */}
        {mode === 'ai' && (
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
        )}

        {/* Upload Area */}
        {photos.length === 0 && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-pink-500 bg-pink-500/10' : 'border-white/30 hover:border-pink-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-6xl mb-4">📸</div>
            <p className="text-gray-300 text-lg">
              {isDragActive ? 'Drop your photos here' : 'Drag & drop photos here or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mt-2">Supports JPG, PNG, WEBP</p>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">
                {photos.length} Photo{photos.length > 1 ? 's' : ''} Uploaded
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPhotos([]);
                    setFrames([]);
                    setVideoUrl(null);
                    setSelectedPhoto(null);
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg text-sm text-red-300 transition-all"
                >
                  Clear All
                </button>
                <button
                  {...getRootProps()}
                  className="bg-pink-500/20 hover:bg-pink-500/30 px-3 py-1 rounded-lg text-sm text-pink-300 transition-all"
                >
                  + Add More
                </button>
                <input {...getInputProps()} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {photos.map((photo, index) => (
                <div 
                  key={index} 
                  className={`relative group cursor-pointer ${selectedPhoto === photo.preview ? 'ring-2 ring-pink-500' : ''}`}
                  onClick={() => selectPhoto(photo.preview)}
                >
                  <img 
                    src={photo.preview} 
                    alt={`Photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border-2 border-white/10 group-hover:border-pink-500 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                      className="bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="absolute top-1 right-1 bg-black/70 rounded-full px-2 py-0.5 text-xs">
                    {index + 1}
                  </div>
                  {selectedPhoto === photo.preview && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-pink-500 text-xs px-2 py-0.5 rounded-full">
                      Selected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Mode Settings */}
        {mode === 'ai' && selectedPhoto && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">🤖 AI Video Settings</h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">
                Describe what you want to generate
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A cinematic shot of a person walking through a forest at sunset, dramatic lighting, 4K quality..."
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-500 h-32 resize-none focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Price Display */}
            <div className="bg-white/10 rounded-2xl p-4 mb-4">
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
                    <p className="text-yellow-400 text-sm">Calculating price...</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Includes:</span>
                  <ul className="text-xs text-gray-400">
                    <li>✅ AI video generation</li>
                    <li>✅ HD quality</li>
                    <li>✅ 5-second video</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slideshow Settings */}
        {mode === 'slideshow' && photos.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">🎛️ Slideshow Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Duration per Photo
                </label>
                <select
                  value={settings.duration}
                  onChange={(e) => setSettings({...settings, duration: parseInt(e.target.value)})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white"
                >
                  <option value="2">2 seconds</option>
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="8">8 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={settings.aspectRatio}
                  onChange={(e) => setSettings({...settings, aspectRatio: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white"
                >
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Vertical/Reels)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-gray-300 text-sm mb-2">
                Caption / Text Overlay
              </label>
              <input
                value={settings.caption}
                onChange={(e) => setSettings({...settings, caption: e.target.value})}
                placeholder="e.g. Living my best life ✨"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        )}

        {/* Progress & Status */}
        {(isGenerating || isProcessing) && (
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

        {/* Video Preview */}
        {(videoUrl || frames.length > 0) && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">🎬 Video Preview</h3>
            <div className="relative bg-black/50 rounded-xl overflow-hidden">
              {videoUrl && !videoUrl.startsWith('data:image') ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full aspect-video object-cover"
                />
              ) : frames.length > 0 ? (
                <>
                  <img
                    src={frames[currentFrame]}
                    alt={`Frame ${currentFrame + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-sm">
                    {currentFrame + 1} / {frames.length}
                  </div>
                  <button
                    onClick={togglePlay}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-pink-500 hover:bg-pink-600 rounded-full w-16 h-16 flex items-center justify-center transition-all shadow-2xl"
                  >
                    <span className="text-3xl">{isPlaying && frames.length > 1 ? '⏸' : '▶'}</span>
                  </button>
                </>
              ) : (
                <img
                  src={videoUrl}
                  alt="Video preview"
                  className="w-full aspect-video object-cover"
                />
              )}
            </div>
            <div className="mt-3 flex gap-3 flex-wrap">
              {(frames.length > 0 || videoUrl) && (
                <button
                  onClick={handleExportVideo}
                  className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
                >
                  📥 Export Video
                </button>
              )}
              {frames.length > 0 && (
                <button
                  onClick={handleDownloadFrame}
                  className="bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
                >
                  📥 Download Frame
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-6">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="bg-white/10 rounded-2xl p-6 mb-6">
            <p className="text-center text-gray-300 mb-4">Complete your payment below</p>
            <p className="text-center text-xs text-gray-400 mb-4">
              💳 You'll be redirected to Paystack to complete payment
            </p>
            {publicKey && publicKey !== 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' ? (
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

        {/* Generate Button */}
        {photos.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isProcessing}
            className={`w-full bg-gradient-to-r ${
              mode === 'ai' 
                ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                : 'from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
            } text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 ${
              (isGenerating || isProcessing) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isGenerating || isProcessing 
              ? '⏳ Processing...' 
              : mode === 'ai' 
                ? `🤖 Generate AI Video (KES ${amount?.toFixed(2) || '0.00'})` 
                : '🎬 Generate Slideshow'}
          </button>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-white/5 rounded-2xl">
          <h4 className="font-semibold mb-2">ℹ️ Features</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• <strong>Slideshow (Free):</strong> Create a slideshow from your photos</li>
            <li>• <strong>AI Video (Paid):</strong> Generate an AI video from a photo + prompt</li>
            <li>• Upload multiple photos (JPG, PNG, WEBP)</li>
            <li>• Preview and download your video</li>
            <li>• All AI generations are secure and private</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default PhotosToVideo;