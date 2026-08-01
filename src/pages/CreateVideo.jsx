import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateVideo.css';

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
      if (response.status === 404 || response.status === 400) {
        return response;
      }
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

function CreateVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');

  // Calculate price whenever prompt or duration changes
  useEffect(() => {
    calculatePrice();
  }, [prompt, duration]);

  const calculatePrice = async () => {
    if (!prompt.trim()) {
      setPrice(null);
      return;
    }

    try {
      console.log('💰 Calculating price for text-to-video...');
      console.log(`📝 Prompt length: ${prompt.length}, Duration: ${duration}s`);

      const response = await fetchWithRetry(`${API_BASE_URL}/api/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'text_to_video',
          options: {
            duration: duration
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
      setPrice({
        finalPrice: 200,
        formatted: 'KES 200',
        currency: 'KES'
      });
    }
  };

  const handlePayment = async () => {
    if (!prompt.trim()) {
      setError('Please describe what you want to generate');
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceAmount = price?.finalPrice || 200;
      console.log('💰 Processing payment with Startbutton for:', priceAmount);

      // Use Startbutton instead of Paystack
      const paymentResponse = await fetchWithRetry(`${API_BASE_URL}/api/initialize-startbutton-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: priceAmount,
          serviceType: 'text-to-video',
          metadata: {
            duration: duration,
            prompt: prompt,
            aspectRatio: aspectRatio,
            custom_fields: [
              {
                display_name: "Video Type",
                variable_name: "video_type",
                value: "text-to-video"
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
      console.log('📦 Startbutton payment response:', paymentData);

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Payment initialization failed');
      }

      setPaymentReference(paymentData.reference);

      // Redirect to Startbutton payment page
      if (paymentData.authorization_url) {
        // Store reference for after redirect
        localStorage.setItem('pending_payment_reference', paymentData.reference);
        localStorage.setItem('pending_payment_email', email);
        localStorage.setItem('pending_payment_service', 'text-to-video');
        localStorage.setItem('pending_payment_amount', priceAmount);
        localStorage.setItem('pending_payment_duration', duration);
        
        // Redirect to Startbutton
        window.location.href = paymentData.authorization_url;
      } else {
        // If no redirect URL, try to process directly (test mode)
        await processVideoGeneration(paymentData.reference);
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      setError('Payment failed: ' + error.message);
      setLoading(false);
    }
  };

  const processVideoGeneration = async (reference) => {
    try {
      setSuccess('🔄 Processing your video... This may take a few moments.');

      const generateResponse = await fetchWithRetry(`${API_BASE_URL}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          duration: duration,
          aspectRatio: aspectRatio,
          paymentReference: reference,
          email: email
        })
      });

      if (!generateResponse.ok) {
        throw new Error(`Server error: ${generateResponse.status}`);
      }

      const data = await generateResponse.json();
      if (data.success) {
        setVideoUrl(data.videoUrl);
        setSuccess('✅ Video generated successfully! Check your email for the download link.');
        setLoading(false);
        // Clear pending data
        localStorage.removeItem('pending_payment_reference');
        localStorage.removeItem('pending_payment_email');
        localStorage.removeItem('pending_payment_service');
        localStorage.removeItem('pending_payment_amount');
        localStorage.removeItem('pending_payment_duration');
      } else {
        throw new Error(data.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('❌ Video generation error:', error);
      setError('Video generation failed: ' + error.message);
      setLoading(false);
    }
  };

  // Check for pending payment on load (return from Startbutton redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('payment_reference');
    
    if (reference) {
      console.log('🔍 Found payment reference in URL:', reference);
      const savedEmail = localStorage.getItem('pending_payment_email') || email;
      const savedService = localStorage.getItem('pending_payment_service') || 'text-to-video';
      const savedAmount = localStorage.getItem('pending_payment_amount') || '200';
      const savedDuration = localStorage.getItem('pending_payment_duration') || '5';
      
      // Verify the payment
      const verifyPayment = async () => {
        setLoading(true);
        try {
          const verifyResponse = await fetchWithRetry(`${API_BASE_URL}/api/verify-startbutton-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: reference,
              email: savedEmail,
              amount: parseFloat(savedAmount),
              serviceType: savedService,
              duration: parseInt(savedDuration)
            })
          });
          
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            // Payment verified, generate video
            await processVideoGeneration(reference);
          } else {
            setError('Payment verification failed. Please try again.');
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Verification error:', error);
          setError('Payment verification failed: ' + error.message);
          setLoading(false);
        }
      };
      
      verifyPayment();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const getPriceDisplay = () => {
    if (!price) return 'Calculating price...';
    return `KES ${Math.round(price.finalPrice)}`;
  };

  return (
    <div className="create-video-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>🎬 AI Text to Video</h1>
        <p>Describe your idea and AI will bring it to life</p>
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

          {/* Prompt Input */}
          <div className="prompt-section">
            <label>📝 Describe what you want to generate</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene, mood, and style you want"
              rows={6}
              disabled={loading}
            />
            <div className="prompt-hint">
              <small>Be as descriptive as possible for better results</small>
            </div>
          </div>

          {/* AI Settings */}
          <div className="settings-section">
            <h3>⚙️ Video Settings</h3>
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
              </div>
            </div>
            <div className="price-note">
              <small>Complete your payment below</small>
            </div>
          </div>

          {/* Payment Button - Now uses Startbutton */}
          <button 
            onClick={handlePayment}
            className="generate-btn"
            disabled={loading || !prompt.trim()}
          >
            {loading ? '⏳ Processing...' : `🤖 Generate Video (${getPriceDisplay()})`}
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
                <p>Describe your idea and generate a video</p>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📝 Describe what you want the AI to generate</li>
              <li>💰 Complete payment via Startbutton (Cards, M-PESA, Bank Transfer)</li>
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

export default CreateVideo;