import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhotosToVideo.css';

// API Base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Helper function with retry logic for cold starts
const fetchWithRetry = async (url, options, maxRetries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetch attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);
      const response = await fetch(url, options);
      if (response.ok) return response;
      // If it's a 404 or 400, don't retry
      if (response.status === 404 || response.status === 400) {
        return response;
      }
      // For other errors, wait and retry
      if (attempt < maxRetries) {
        const delay = (attempt + 1) * 1000;
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries) {
        const delay = (attempt + 1) * 1000;
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error('Max retries exceeded');
};

// Fallback languages
const FALLBACK_LANGUAGES = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ko': 'Korean', 'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu',
  'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Tagalog', 'vi': 'Vietnamese',
  'th': 'Thai', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba',
  'ig': 'Igbo', 'zu': 'Zulu', 'af': 'Afrikaans', 'am': 'Amharic',
  'ne': 'Nepali', 'si': 'Sinhala', 'ta': 'Tamil', 'te': 'Telugu',
  'ml': 'Malayalam', 'kn': 'Kannada', 'pa': 'Punjabi', 'gu': 'Gujarati',
  'mr': 'Marathi', 'or': 'Odia'
};

function PhotosToVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [photos, setPhotos] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paystackReady, setPaystackReady] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ Load Paystack script on component mount
  useEffect(() => {
    // Function to load Paystack script
    const loadPaystack = () => {
      // Check if already loaded
      if (typeof window.PaystackPop !== 'undefined') {
        console.log('✅ Paystack already loaded');
        setPaystackReady(true);
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="paystack"]');
      if (existingScript) {
        console.log('📦 Paystack script already in DOM, waiting for it to load...');
        // Wait for it to load
        existingScript.onload = () => {
          console.log('✅ Paystack script loaded from existing tag!');
          setPaystackReady(true);
        };
        return;
      }

      // Create and load script
      console.log('📦 Loading Paystack script...');
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Paystack script loaded successfully!');
        setPaystackReady(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Paystack script');
        // Retry after 2 seconds
        setTimeout(loadPaystack, 2000);
      };
      document.head.appendChild(script);
    };

    loadPaystack();

    // Cleanup
    return () => {
      // Don't remove the script on unmount, it should stay
    };
  }, []);

  // Calculate price whenever photos or duration changes
  useEffect(() => {
    calculatePrice();
  }, [photos.length, duration]);

  const calculatePrice = async () => {
    if (photos.length === 0) {
      setPrice(null);
      return;
    }

    try {
      console.log('💰 Calculating price for photos-to-video...');
      console.log(`📸 Photos: ${photos.length}, Duration: ${duration}s`);

      const response = await fetchWithRetry(`${API_BASE_URL}/api/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'photos_to_video',
          options: {
            duration: duration,
            photoCount: photos.length
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Price response:', data);

      if (data.success) {
        setPrice(data.price);
      } else {
        throw new Error(data.error || 'Price calculation failed');
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      // Set a default price if calculation fails
      setPrice({
        finalPrice: 300,
        formatted: 'KES 300',
        currency: 'KES'
      });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random().toString(36).substr(2, 6),
      file: file,
      preview: URL.createObjectURL(file)
    }));

    setPhotos([...photos, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const openPaystackPopup = (paymentData) => {
    // Check if Paystack is available
    if (!paystackReady && typeof window.PaystackPop === 'undefined') {
      console.error('❌ Paystack not ready, retrying...');
      setError('Payment system is loading. Please try again in a moment.');
      setLoading(false);
      
      // Try reloading the script
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        setPaystackReady(true);
        console.log('✅ Paystack reloaded, please try payment again');
        setError('Paystack loaded. Please click "Generate AI Video" again.');
      };
      document.head.appendChild(script);
      return;
    }

    try {
      const popup = new window.PaystackPop();
      popup.open({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: paymentData.amount * 100,
        ref: paymentData.reference,
        metadata: paymentData.metadata,
        currency: 'KES',
        callback: async (response) => {
          console.log('✅ Payment successful:', response);
          await processPhotoVideo(response.reference);
        },
        onClose: () => {
          setLoading(false);
          setError('Payment was cancelled');
        }
      });
    } catch (error) {
      console.error('❌ Paystack error:', error);
      setError('Payment system error. Please try again.');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (photos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    if (!prompt.trim()) {
      setError('Please describe what you want to generate');
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Check if Paystack is ready
    if (!paystackReady && typeof window.PaystackPop === 'undefined') {
      setError('Payment system is loading. Please wait a moment and try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceAmount = price?.finalPrice || 300;
      console.log('💰 Processing payment for:', priceAmount);

      const paymentResponse = await fetchWithRetry(`${API_BASE_URL}/api/initialize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: priceAmount,
          serviceType: 'photo-to-video',
          metadata: {
            photoCount: photos.length,
            duration: duration,
            prompt: prompt,
            aspectRatio: aspectRatio,
            custom_fields: [
              {
                display_name: "Video Type",
                variable_name: "video_type",
                value: "photo-to-video"
              },
              {
                display_name: "Photos",
                variable_name: "photos",
                value: `${photos.length}`
              },
              {
                display_name: "Duration",
                variable_name: "duration",
                value: `${duration}s`
              },
              {
                display_name: "Amount",
                variable_name: "amount",
                value: `${priceAmount} KES`
              }
            ]
          }
        })
      });

      if (!paymentResponse.ok) {
        throw new Error(`Server error: ${paymentResponse.status}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('📦 Payment response:', paymentData);

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Payment initialization failed');
      }

      setPaymentReference(paymentData.reference);

      if (paymentData.testMode) {
        await processPhotoVideo(paymentData.reference);
        return;
      }

      // ✅ Open Paystack popup
      openPaystackPopup({
        amount: priceAmount,
        reference: paymentData.reference,
        metadata: paymentData.metadata
      });

    } catch (error) {
      console.error('❌ Payment error:', error);
      setError('Payment failed: ' + error.message);
      setLoading(false);
    }
  };

  const processPhotoVideo = async (reference) => {
    try {
      setSuccess('🔄 Processing your video... This may take a few moments.');

      // Upload photos to Cloudinary
      const photoUrls = [];
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('upload_preset', 'vidai_uploads'); // ✅ Updated preset name

        console.log('📤 Uploading photo to Cloudinary...');
        const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/y7d1nk2i/image/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('❌ Cloudinary upload failed:', errorData);
          throw new Error(`Cloudinary upload failed: ${errorData.error?.message || uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('✅ Photo uploaded:', uploadData.secure_url);
        if (uploadData.secure_url) {
          photoUrls.push(uploadData.secure_url);
        }
      }

      if (photoUrls.length === 0) {
        throw new Error('No photos were uploaded successfully');
      }

      console.log('✅ All photos uploaded:', photoUrls);

      // Generate video
      const generateResponse = await fetchWithRetry(`${API_BASE_URL}/api/generate-photo-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls: photoUrls,
          prompt: prompt,
          duration: duration,
          aspectRatio: aspectRatio,
          paymentReference: reference,
          email: email
        })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        console.error('❌ Video generation error:', errorData);
        throw new Error(errorData.error || `Server error: ${generateResponse.status}`);
      }

      const data = await generateResponse.json();
      if (data.success) {
        setVideoUrl(data.videoUrl);
        setSuccess('✅ Video generated successfully! Check your email for the download link.');
        setLoading(false);
      } else {
        throw new Error(data.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('❌ Video generation error:', error);
      setError('Video generation failed: ' + error.message);
      setLoading(false);
    }
  };

  const getPriceDisplay = () => {
    if (!price) return 'Calculating price...';
    return `KES ${Math.round(price.finalPrice)}`;
  };

  const getPriceAmount = () => {
    if (!price) return 300;
    return Math.round(price.finalPrice);
  };

  return (
    <div className="photos-to-video-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>🤖 AI Photo to Video</h1>
        <p>Upload photos and generate an AI-powered video</p>
      </div>

      <div className="main-content">
        <div className="left-panel">
          {/* Email Input */}
          <div className="email-section">
            <label>📧 Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
            <small>Your generated video will be sent to this email</small>
          </div>

          {/* Photo Upload */}
          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">🖼️</div>
              <p>Click to upload photos</p>
              <small>Supported formats: JPG, PNG, WEBP (Max 10MB each)</small>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                disabled={loading}
              />
            </div>
            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map(photo => (
                  <div key={photo.id} className="photo-item">
                    <img src={photo.preview} alt="Uploaded" />
                    <button className="remove-photo" onClick={() => removePhoto(photo.id)}>✕</button>
                  </div>
                ))}
                <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
                  + Add More
                </button>
              </div>
            )}
            <div className="photo-count">
              {photos.length} Photo{photos.length !== 1 ? 's' : ''} Selected
            </div>
          </div>

          {/* AI Settings */}
          <div className="settings-section">
            <h3>🤖 AI Video Settings</h3>
            <div className="setting-group">
              <label>Describe what you want to generate</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene, mood, and style you want"
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="setting-group">
              <label>Video Duration</label>
              <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} disabled={loading}>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={loading}>
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical)</option>
              </select>
            </div>
          </div>

          {/* Price Display */}
          <div className="price-section">
            <h3>💰 Total Cost</h3>
            <div className="price-card">
              <div className="price-amount">{getPriceDisplay()}</div>
              <div className="price-details">
                <p>✅ AI video generation</p>
                <p>✅ HD quality</p>
                <p>✅ {duration}-second video</p>
                <p>✅ {photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="price-note">
              <small>Complete your payment below</small>
            </div>
          </div>

          {/* Payment Button */}
          <button
            className="generate-btn"
            onClick={handlePayment}
            disabled={loading || photos.length === 0 || !prompt.trim()}
          >
            {loading ? '⏳ Processing...' : `🤖 Generate AI Video (${getPriceDisplay()})`}
          </button>

          {/* Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          {/* Video Preview */}
          <div className="video-preview">
            <h3>📹 Video Preview</h3>
            {videoUrl ? (
              <video controls className="video-player">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="placeholder">
                <p>Upload photos and generate a video</p>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📤 Upload a photo (JPG, PNG, WEBP)</li>
              <li>📝 Describe what you want the AI to generate</li>
              <li>💰 Complete payment via Paystack</li>
              <li>📥 Download your AI-generated video</li>
              <li>🔒 All AI generations are secure and private</li>
            </ul>
            <div className="support-info">
              <small>Need help? Contact us at support@katareel.com</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotosToVideo;