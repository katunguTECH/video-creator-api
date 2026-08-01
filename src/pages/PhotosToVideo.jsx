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

const getDownloadUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('data:')) return null;
  if (url.includes('/upload/') && !url.includes('fl_attachment')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
};

const isPlaceholderVideo = (url) => {
  return !url || url.startsWith('data:');
};

function PhotosToVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [photos, setPhotos] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [audioScript, setAudioScript] = useState('');
  const [voiceGender, setVoiceGender] = useState('MALE');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const fileInputRef = useRef(null);

  // Redo / Coupon states
  const [showRedoSection, setShowRedoSection] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValid, setCouponValid] = useState(false);
  const [isRedoMode, setIsRedoMode] = useState(false);
  const [redoLoading, setRedoLoading] = useState(false);
  const [savedCoupon, setSavedCoupon] = useState('');

  // Calculate price whenever photos or duration changes
  useEffect(() => {
    calculatePrice();
  }, [photos.length, duration]);

  // Check for pending payment on load (return from Startbutton redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('payment_reference');
    
    if (reference) {
      console.log('🔍 Found payment reference in URL:', reference);
      const savedEmail = localStorage.getItem('pending_payment_email') || email;
      const savedService = localStorage.getItem('pending_payment_service') || 'photo-to-video';
      const savedAmount = localStorage.getItem('pending_payment_amount') || '300';
      const savedDuration = localStorage.getItem('pending_payment_duration') || '5';
      const savedPhotos = localStorage.getItem('pending_payment_photos') || '[]';
      
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
            // Restore photos if needed
            try {
              const photoData = JSON.parse(savedPhotos);
              // Process with photos
            } catch (e) {}
            await processPhotoVideo(reference);
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

    const savedCouponCode = localStorage.getItem('video_redo_coupon');
    if (savedCouponCode) {
      setSavedCoupon(savedCouponCode);
      setCouponCode(savedCouponCode);
      setShowRedoSection(true);
    }
  }, []);

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

  const displayVideo = (url) => {
    console.log('🎬 Displaying video URL:', url);
    setVideoUrl(url);

    if (isPlaceholderVideo(url)) {
      return;
    }

    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      const downloadHref = getDownloadUrl(url);
      if (!downloadHref) return;

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadHref;
      downloadLink.className = 'download-btn';
      downloadLink.innerHTML = '📥 Download Video';
      downloadLink.style.cssText = `
        display: inline-block;
        margin: 15px 0;
        padding: 12px 30px;
        background: linear-gradient(135deg, #4caf50, #388e3c);
        color: white;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        transition: all 0.3s ease;
        cursor: pointer;
      `;
      downloadLink.onmouseover = () => {
        downloadLink.style.transform = 'translateY(-2px)';
        downloadLink.style.boxShadow = '0 6px 25px rgba(76, 175, 80, 0.4)';
      };
      downloadLink.onmouseout = () => {
        downloadLink.style.transform = 'translateY(0)';
        downloadLink.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
      };

      const videoPlayer = videoContainer.querySelector('.video-player');
      if (videoPlayer) {
        videoPlayer.parentNode.insertBefore(downloadLink, videoPlayer.nextSibling);
      }
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

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceAmount = price?.finalPrice || 300;
      console.log('💰 Processing payment with Startbutton for:', priceAmount);

      // Use Startbutton instead of Paystack
      const paymentResponse = await fetchWithRetry(`${API_BASE_URL}/api/initialize-startbutton-payment`, {
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
      console.log('📦 Startbutton payment response:', paymentData);

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Payment initialization failed');
      }

      setPaymentReference(paymentData.reference);

      // Redirect to Startbutton payment page
      if (paymentData.authorization_url) {
        // Store data for after redirect
        localStorage.setItem('pending_payment_reference', paymentData.reference);
        localStorage.setItem('pending_payment_email', email);
        localStorage.setItem('pending_payment_service', 'photo-to-video');
        localStorage.setItem('pending_payment_amount', priceAmount);
        localStorage.setItem('pending_payment_duration', duration);
        localStorage.setItem('pending_payment_photos', JSON.stringify(photos.map(p => p.preview)));
        
        // Redirect to Startbutton
        window.location.href = paymentData.authorization_url;
      } else {
        // If no redirect URL, try to process directly (test mode)
        await processPhotoVideo(paymentData.reference);
      }

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
        formData.append('upload_preset', 'vidai_uploads');

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
          email: email,
          audioScript: audioScript.trim() || null,
          voiceGender: voiceGender
        })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        console.error('❌ Video generation error:', errorData);
        throw new Error(errorData.error || `Server error: ${generateResponse.status}`);
      }

      const data = await generateResponse.json();
      console.log('📦 Video generation response:', data);

      if (data.success && data.videoUrl) {

        if (data.isFallback || isPlaceholderVideo(data.videoUrl)) {
          console.warn('⚠️ Backend returned a fallback placeholder, not a real video.', data.debugErrors);
          setVideoUrl(null);
          setError(
            'Video generation failed on our AI provider\'s end, so no video was created. ' +
            'This was not charged as a normal attempt — please use the "Regenerate Video for Free" ' +
            'option below with your redo coupon, or try again in a few minutes.'
          );
          setSuccess('');

          if (reference && !reference.startsWith('TEST-') && !reference.startsWith('REDO-')) {
            try {
              const couponResponse = await fetchWithRetry(`${API_BASE_URL}/api/generate-redo-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentReference: reference, email: email })
              });
              const couponData = await couponResponse.json();
              if (couponData.success && couponData.coupon) {
                const coupon = couponData.coupon;
                setSavedCoupon(coupon);
                setCouponCode(coupon);
                localStorage.setItem('video_redo_coupon', coupon);
                setShowRedoSection(true);
              }
            } catch (couponError) {
              console.warn('⚠️ Could not generate redo coupon:', couponError.message);
            }
          }

          setLoading(false);
          setRedoLoading(false);
          setIsRedoMode(false);
          // Clear pending data
          localStorage.removeItem('pending_payment_reference');
          localStorage.removeItem('pending_payment_email');
          localStorage.removeItem('pending_payment_service');
          localStorage.removeItem('pending_payment_amount');
          localStorage.removeItem('pending_payment_duration');
          localStorage.removeItem('pending_payment_photos');
          return;
        }

        displayVideo(data.videoUrl);

        let emailOk = data.emailSent === true;
        let emailErrorDetail = data.emailError || null;

        if (!emailOk) {
          try {
            console.log('📧 Backend email failed, retrying from frontend for:', email);
            const emailResponse = await fetchWithRetry(`${API_BASE_URL}/api/send-video-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                videoUrl: data.videoUrl,
                prompt: prompt,
                amount: price?.finalPrice || 300,
                duration: duration
              })
            });
            emailOk = emailResponse.ok;
            if (!emailOk) {
              try {
                const emailErrData = await emailResponse.json();
                emailErrorDetail = emailErrData.error || emailErrorDetail;
              } catch (_) { /* ignore parse errors */ }
            }
          } catch (emailError) {
            console.warn('⚠️ Retry email send failed:', emailError.message);
            emailErrorDetail = emailError.message;
          }
        }

        if (emailOk) {
          setSuccess('✅ Video generated successfully! Check your email for the download link.');
        } else {
          console.warn('⚠️ Email delivery failed:', emailErrorDetail);
          setSuccess('✅ Video generated! Download it below. (Email could not be sent — please use the download button.)');
        }

        if (reference && !reference.startsWith('TEST-') && !reference.startsWith('REDO-')) {
          try {
            const couponResponse = await fetchWithRetry(`${API_BASE_URL}/api/generate-redo-coupon`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentReference: reference,
                email: email
              })
            });

            const couponData = await couponResponse.json();
            if (couponData.success && couponData.coupon) {
              const coupon = couponData.coupon;
              setSavedCoupon(coupon);
              setCouponCode(coupon);
              localStorage.setItem('video_redo_coupon', coupon);
              setShowRedoSection(true);
            }
          } catch (couponError) {
            console.warn('⚠️ Could not generate redo coupon:', couponError.message);
          }
        }

        setLoading(false);
        setRedoLoading(false);
        setIsRedoMode(false);
        // Clear pending data
        localStorage.removeItem('pending_payment_reference');
        localStorage.removeItem('pending_payment_email');
        localStorage.removeItem('pending_payment_service');
        localStorage.removeItem('pending_payment_amount');
        localStorage.removeItem('pending_payment_duration');
        localStorage.removeItem('pending_payment_photos');

      } else {
        throw new Error(data.error || 'Video generation failed - no video URL returned');
      }
    } catch (error) {
      console.error('❌ Video generation error:', error);
      setError('Video generation failed: ' + error.message);
      setLoading(false);
      setRedoLoading(false);
    }
  };

  const checkCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setError('');
      const response = await fetchWithRetry(`${API_BASE_URL}/api/check-redo-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim(), email })
      });
      const data = await response.json();
      if (data.success && data.valid) {
        setCouponValid(true);
        setIsRedoMode(true);
        setSuccess('✅ Coupon valid! You can regenerate your video for free.');
      } else {
        setCouponValid(false);
        setError(data.error || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('❌ Coupon check error:', error);
      setError('Could not verify coupon. Please try again.');
    }
  };

  const handleRedoGeneration = async () => {
    if (!couponCode.trim()) return;
    setRedoLoading(true);
    setError('');
    try {
      const redeemResponse = await fetchWithRetry(`${API_BASE_URL}/api/redeem-redo-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode.trim(), email })
      });
      const redeemData = await redeemResponse.json();
      if (!redeemData.success) {
        throw new Error(redeemData.error || 'Could not redeem coupon');
      }
      await processPhotoVideo(redeemData.paymentReference);
    } catch (error) {
      console.error('❌ Redo generation error:', error);
      setError('Redo failed: ' + error.message);
      setRedoLoading(false);
    }
  };

  const getPriceDisplay = () => {
    if (!price) return 'Calculating price...';
    return `KES ${Math.round(price.finalPrice)}`;
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
              disabled={loading || redoLoading}
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
                disabled={loading || redoLoading}
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
                disabled={loading || redoLoading}
              />
            </div>

            {/* Speech / Narration Text */}
            <div className="setting-group">
              <label>
                🎙️ Speech / narration text
                <span style={{ fontWeight: 400, color: '#888', fontSize: '12px', marginLeft: '6px' }}>
                  (optional — leave blank for auto-generated speech)
                </span>
              </label>
              <textarea
                value={audioScript}
                onChange={(e) => setAudioScript(e.target.value)}
                placeholder="Type the words you want spoken, e.g. 'God is good all the time...'"
                rows={3}
                disabled={loading || redoLoading}
              />
              <small style={{ color: '#888', fontSize: '12px' }}>
                Roughly {Math.floor(duration * 2.3)} words fits a {duration}s video — {audioScript.trim().split(/\s+/).filter(Boolean).length} words so far
              </small>
            </div>

            {/* Voice Gender Selection */}
            <div className="setting-group">
              <label>🎙️ Narration Voice Character</label>
              <select
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                disabled={loading || redoLoading}
              >
                <option value="MALE">Male Voice (Deep / Natural)</option>
                <option value="FEMALE">Female Voice</option>
                <option value="NEUTRAL">Neutral Voice</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Video Duration</label>
              <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} disabled={loading || redoLoading}>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={loading || redoLoading}>
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical)</option>
              </select>
            </div>
          </div>

          {/* Price Display */}
          {!isRedoMode && (
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
                <small>Complete your payment below via Startbutton (Cards, M-PESA, Bank Transfer)</small>
              </div>
            </div>
          )}

          {/* Redo Section */}
          {(savedCoupon || (paymentReference && !isRedoMode)) && (
            <div className="redo-section">
              <button
                className="redo-toggle-btn"
                onClick={() => setShowRedoSection(!showRedoSection)}
              >
                {showRedoSection ? '🔼 Hide' : '🔄 Need to redo your video? Click here'}
                {savedCoupon && !showRedoSection && (
                  <span className="coupon-badge">💳 Coupon available!</span>
                )}
              </button>

              {showRedoSection && (
                <div className="redo-container">
                  <p className="redo-info">
                    If your video didn't turn out as expected, you can regenerate it for free
                    using your redo coupon. Enter your coupon code below.
                  </p>
                  {savedCoupon && (
                    <p className="saved-coupon-info">
                      💡 Your saved coupon: <strong>{savedCoupon}</strong>
                    </p>
                  )}
                  <div className="coupon-input-group">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter your redo coupon code"
                      disabled={loading || redoLoading}
                    />
                    <button
                      onClick={checkCoupon}
                      disabled={loading || redoLoading || !couponCode.trim()}
                      className="check-coupon-btn"
                    >
                      Check Coupon
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Redo Mode Active */}
          {isRedoMode && (
            <div className="redo-mode-active">
              <div className="redo-badge">🔄 REDO MODE - Free Regeneration</div>
              <p className="redo-success">✅ Coupon valid! Generate your video for free.</p>
              <button
                className="generate-btn redo-generate-btn"
                onClick={handleRedoGeneration}
                disabled={redoLoading || photos.length === 0 || !prompt.trim()}
              >
                {redoLoading ? '⏳ Processing...' : '🔄 Regenerate Video for Free'}
              </button>
              <button
                className="cancel-redo-btn"
                onClick={() => {
                  setIsRedoMode(false);
                  setError('');
                }}
              >
                Cancel Redo
              </button>
            </div>
          )}

          {/* Payment Button - Now uses Startbutton */}
          {!isRedoMode && (
            <button
              className="generate-btn"
              onClick={handlePayment}
              disabled={loading || photos.length === 0 || !prompt.trim()}
            >
              {loading ? '⏳ Processing...' : `🤖 Generate AI Video (${getPriceDisplay()})`}
            </button>
          )}

          {/* Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          {/* Video Preview */}
          <div className="video-preview">
            <h3>📹 Video Preview</h3>
            <div className="video-container">
              {videoUrl && !isPlaceholderVideo(videoUrl) ? (
                <>
                  <video controls className="video-player">
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  {getDownloadUrl(videoUrl) && (
                    <a
                      href={getDownloadUrl(videoUrl)}
                      className="download-btn"
                      style={{
                        display: 'inline-block',
                        margin: '15px 0',
                        padding: '12px 30px',
                        background: 'linear-gradient(135deg, #4caf50, #388e3c)',
                        color: 'white',
                        borderRadius: '30px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '16px',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 25px rgba(76, 175, 80, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                      }}
                    >
                      📥 Download Video
                    </a>
                  )}
                </>
              ) : (
                <div className="placeholder">
                  <p>Upload photos and generate a video</p>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📤 Upload a photo (JPG, PNG, WEBP)</li>
              <li>📝 Describe what you want the AI to generate</li>
              <li>🎙️ Select voice character (Male, Female, Neutral)</li>
              <li>💰 Complete payment via Startbutton (Cards, M-PESA, Bank Transfer)</li>
              <li>📥 Download your AI-generated video with speech</li>
              <li>🔄 Use your redo coupon for free regeneration</li>
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