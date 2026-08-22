import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TranslateVideo.css';

// ============================================
// API Base URL from environment
// ============================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://video-creator-api-kjzy.onrender.com';

// ============================================
// SIMPLIFIED helper function with retry logic
// ============================================
const fetchWithRetry = async (url, options, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetch attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 404 || response.status === 400) {
        return response;
      }
      if (attempt < maxRetries) {
        const waitTime = (attempt + 1) * 1000;
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      const waitTime = (attempt + 1) * 1000;
      console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
};

// Hardcoded languages as fallback
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

function TranslateVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [translatedVideo, setTranslatedVideo] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [isRetryLoading, setIsRetryLoading] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const TRANSLATION_PRICE = 300;

  // Load available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        console.log('🌍 Fetching languages...');
        const response = await fetch(`${API_BASE_URL}/api/languages`);
        if (response.ok) {
          const data = await response.json();
          if (data.languages) {
            setLanguages(data.languages);
          }
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        // Keep using fallback languages
      }
    };
    fetchLanguages();
  }, []);

  // Check for payment reference in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (reference) {
      console.log('🌐 Found payment reference in URL:', reference);
      const savedEmail = localStorage.getItem('pending_payment_email') || email;
      const savedService = localStorage.getItem('pending_payment_service') || 'translation';
      const savedAmount = localStorage.getItem('pending_payment_amount') || TRANSLATION_PRICE;

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
              duration: 5
            })
          });

          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            await processTranslation(reference);
          } else {
            setError('Payment verification failed. Please try again.');
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Payment verification error:', error);
          setError('Error verifying payment. Please try again.');
          setLoading(false);
        }
      };

      verifyPayment();
    }
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }

    const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/webm', 'video/mov'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please upload MP4, AVI, MOV, or WEBM');
      return;
    }

    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setError('');
    setSuccess('');
    await uploadVideo(file);
  };

  const uploadVideo = async (file) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', file);

      console.log('📤 Uploading video to:', `${API_BASE_URL}/api/upload-video`);

      const response = await fetch(`${API_BASE_URL}/api/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Upload successful:', data);

      if (data.success && data.url) {
        setVideoUrl(data.url);
        setSuccess('Video uploaded successfully!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoUrl(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePayment = async () => {
    if (!selectedFile) {
      setError('Please select a video first');
      return;
    }

    if (!targetLanguage) {
      setError('Please select a target language');
      return;
    }

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/initialize-translation-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: TRANSLATION_PRICE,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          videoUrl: videoUrl
        })
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        localStorage.setItem('pending_payment_email', email);
        localStorage.setItem('pending_payment_service', 'translation');
        localStorage.setItem('pending_payment_amount', TRANSLATION_PRICE);
        localStorage.setItem('pending_payment_reference', data.reference);
        window.location.href = data.paymentUrl;
      } else {
        setError(data.message || 'Failed to initialize payment');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      setError('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const processTranslation = async (reference) => {
    try {
      console.log('🔄 Processing translation with reference:', reference);

      const response = await fetch(`${API_BASE_URL}/api/process-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference,
          email: email,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          videoUrl: videoUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Translation completed successfully! Check your email.');
        setTranslatedVideo(data.translatedVideoUrl);
        setTranslatedText(data.translatedText);

        localStorage.removeItem('pending_payment_email');
        localStorage.removeItem('pending_payment_service');
        localStorage.removeItem('pending_payment_amount');
        localStorage.removeItem('pending_payment_reference');

        setLoading(false);
      } else {
        setError(data.message || 'Translation failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Translation error:', error);
      setError('Translation failed. Please try again.');
      setLoading(false);
    }
  };

  const handleFreeRetry = async () => {
    if (!paymentReference) {
      setError('No payment reference found');
      return;
    }

    setIsRetryLoading(true);
    await processTranslation(paymentReference);
    setIsRetryLoading(false);
  };

  return (
    <div className="translate-video-container">
      <div className="header">
        <h1>🌐 Translate Video</h1>
        <p>Upload a video and translate it to another language</p>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="email-section">
            <label>📧 Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
            <small>Your translated video will be sent to this email</small>
          </div>

          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              {!selectedFile ? (
                <>
                  <div className="upload-icon">📹</div>
                  <p>Click or drag to upload a video</p>
                  <small>Supported formats: MP4, AVI, MOV, WEBM (Max 50MB)</small>
                </>
              ) : (
                <div className="file-info">
                  <span>📹 {selectedFile.name}</span>
                  <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button
                    className="remove-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="video/*"
                style={{ display: 'none' }}
                disabled={loading}
              />
            </div>
            {uploading && <div className="spinner">Uploading...</div>}
          </div>

          <div className="language-section">
            <div className="language-group">
              <label>🔍 Source Language</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                disabled={loading}
              >
                <option value="auto">Auto-detect</option>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
            </div>

            <div className="language-group">
              <label>🎯 Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={loading}
              >
                <option value="">Select target language...</option>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
            </div>
            <div className="language-count">
              🌍 {Object.keys(languages).length} languages available
            </div>
          </div>

          <div className="price-section">
            <h3>💰 Total Cost</h3>
            <div className="price-card">
              <div className="price-amount">KES {TRANSLATION_PRICE}</div>
              <div className="price-details">
                <p>✅ AI video translation</p>
                <p>✅ Audio processing</p>
                <p>✅ Email delivery</p>
                <p>✅ {Object.keys(languages).length} languages supported</p>
              </div>
            </div>
            <div className="price-note">
              <small>💰 Fixed price of KES 300 for all video translations</small>
            </div>
          </div>

          <button
            className="translate-btn"
            onClick={handlePayment}
            disabled={loading || !selectedFile || !targetLanguage}
          >
            {loading ? '⏳ Processing...' : `💰 Pay KES ${TRANSLATION_PRICE} & Translate 🚀`}
          </button>

          {showRetry && paymentReference && (
            <div className="retry-section">
              <div className="retry-info">
                <p>🔄 You have a pending payment (Ref: {paymentReference})</p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Click below to retry translation for free
                </p>
              </div>
              <button
                className="retry-btn"
                onClick={handleFreeRetry}
                disabled={isRetryLoading || !videoUrl || !targetLanguage}
              >
                {isRetryLoading ? '⏳ Processing...' : '🔄 Retry Translation (Free)'}
              </button>
            </div>
          )}

          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}
        </div>

        <div className="right-panel">
          <div className="info-section">
            <h4>📖 How It Works</h4>
            <ul>
              <li>📤 Upload a video with spoken audio</li>
              <li>🌍 Choose source and target languages</li>
              <li>💰 Complete payment via Startbutton (Cards, M-PESA, Bank Transfer)</li>
              <li>🤖 AI will translate the audio</li>
              <li>📥 Download the translated video</li>
              <li>📧 Video link sent to your email</li>
            </ul>
            <div className="languages-info">
              🌍 {Object.keys(languages).length} languages available for translation
            </div>
            <div className="support-info">
              <small>Need help? Contact us at support@katareel.com</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslateVideo;