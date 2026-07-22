import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TranslateVideo.css';

// Hardcoded languages as fallback
const FALLBACK_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'ur': 'Urdu',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Tagalog',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'sw': 'Swahili',
  'ha': 'Hausa',
  'yo': 'Yoruba',
  'ig': 'Igbo',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'am': 'Amharic',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'pa': 'Punjabi',
  'gu': 'Gujarati',
  'mr': 'Marathi',
  'or': 'Odia'
};

function TranslateVideo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('katungu1@gmail.com');
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES); // Use fallback initially
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [translatedVideo, setTranslatedVideo] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Fixed price - KES 300
  const TRANSLATION_PRICE = 300;

  // Load available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        console.log('🌐 Fetching languages...');
        const response = await fetch('/api/free-languages');
        console.log('📦 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Languages data:', data);
          
          if (data.success && data.languages) {
            setLanguages(data.languages);
            // Set default target language to Swahili
            setTargetLanguage('sw');
            console.log('✅ Languages loaded successfully:', Object.keys(data.languages).length);
          } else {
            console.warn('⚠️ No languages in response, using fallback');
            setLanguages(FALLBACK_LANGUAGES);
            setTargetLanguage('sw');
          }
        } else {
          console.warn('⚠️ API returned error, using fallback languages');
          setLanguages(FALLBACK_LANGUAGES);
          setTargetLanguage('sw');
        }
      } catch (error) {
        console.error('❌ Error loading languages:', error);
        // Use fallback languages
        setLanguages(FALLBACK_LANGUAGES);
        setTargetLanguage('sw');
        setError('Could not load languages from server. Using default languages.');
      }
    };
    fetchLanguages();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds 100MB limit');
      return;
    }

    // Check file type
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid video file (MP4, AVI, MOV, WEBM)');
      return;
    }

    setSelectedFile(file);
    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setVideoUrl(data.videoUrl);
        // Preview the video
        if (videoRef.current) {
          videoRef.current.src = data.videoUrl;
          videoRef.current.load();
        }
        console.log('✅ Video uploaded:', data.videoUrl);
        setSuccess('✅ Video uploaded successfully!');
      } else {
        setError('Failed to upload video: ' + data.error);
      }
    } catch (error) {
      setError('Error uploading video: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoUrl(null);
    setTranslatedVideo(null);
    setTranslatedText('');
    setSuccess('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
  };

  const handlePayment = async () => {
    if (!selectedFile) {
      setError('Please upload a video first');
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!targetLanguage) {
      setError('Please select a target language');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Initialize Paystack payment with KES 300
      const paymentResponse = await fetch('/api/initialize-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: TRANSLATION_PRICE,
          serviceType: 'translation',
          metadata: {
            videoUrl: videoUrl,
            targetLanguage: targetLanguage,
            sourceLanguage: sourceLanguage,
            duration: 5,
            custom_fields: [
              {
                display_name: "Video Type",
                variable_name: "video_type",
                value: "translation"
              },
              {
                display_name: "Target Language",
                variable_name: "target_language",
                value: languages[targetLanguage] || targetLanguage
              },
              {
                display_name: "Amount",
                variable_name: "amount",
                value: `${TRANSLATION_PRICE} KES`
              }
            ]
          }
        })
      });

      const paymentData = await paymentResponse.json();
      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Payment initialization failed');
      }

      // Check if in test mode
      if (paymentData.testMode) {
        setPaymentReference(paymentData.reference);
        await processTranslation(paymentData.reference);
        return;
      }

      // Open Paystack popup
      if (window.PaystackPop) {
        const popup = new window.PaystackPop();
        popup.open({
          key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_xxx',
          email: email,
          amount: TRANSLATION_PRICE * 100,
          ref: paymentData.reference,
          metadata: paymentData.metadata,
          callback: async (response) => {
            console.log('✅ Payment successful:', response);
            setPaymentReference(response.reference);
            await processTranslation(response.reference);
          },
          onClose: () => {
            setLoading(false);
            setError('Payment was cancelled');
          }
        });
      } else {
        // Fallback for test mode
        setPaymentReference('test_ref_' + Date.now());
        await processTranslation('test_ref_' + Date.now());
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      setError('Payment failed: ' + error.message);
      setLoading(false);
    }
  };

  const processTranslation = async (reference) => {
    try {
      setSuccess('🔄 Processing translation... This may take a few moments.');

      const response = await fetch('/api/translate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoUrl,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage,
          paymentReference: reference,
          email: email,
          duration: 5,
          text: 'Sample video content for translation'
        })
      });

      const data = await response.json();
      if (data.success) {
        setTranslatedVideo(data.videoUrl);
        setTranslatedText(data.translatedText);
        setSuccess(`✅ Translation complete! Video sent to ${email}`);
        setLoading(false);
        
        // Show the translated video
        if (videoRef.current) {
          videoRef.current.src = data.videoUrl;
          videoRef.current.load();
        }
      } else {
        throw new Error(data.error || 'Translation failed');
      }
    } catch (error) {
      console.error('❌ Translation error:', error);
      setError('Translation failed: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="translate-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>🌍 Translate Video</h1>
        <p>Upload a video and translate it to another language</p>
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
            <small>Your translated video will be sent to this email</small>
          </div>

          {/* File Upload */}
          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              {!selectedFile ? (
                <>
                  <div className="upload-icon">📹</div>
                  <p>Click or drag to upload a video</p>
                  <small>Supported formats: MP4, AVI, MOV, WEBM (Max 100MB)</small>
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

          {/* Language Selection */}
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

          {/* Price Display - Fixed KES 300 */}
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

          {/* Action Button */}
          <button 
            className="translate-btn"
            onClick={handlePayment}
            disabled={loading || !selectedFile || !targetLanguage}
          >
            {loading ? '⏳ Processing...' : `💰 Pay KES ${TRANSLATION_PRICE} & Translate 🚀`}
          </button>

          {/* Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}
        </div>

        {/* Video Preview */}
        <div className="right-panel">
          <div className="video-preview">
            <h3>📹 Video Preview</h3>
            {videoUrl ? (
              <video ref={videoRef} controls className="video-player">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="placeholder">
                <p>Upload a video to preview</p>
              </div>
            )}
          </div>

          {/* Translated Text Display */}
          {translatedText && (
            <div className="translated-text">
              <h4>📝 Translated Text</h4>
              <div className="text-content">
                <p><strong>Original:</strong> {translatedText.replace(/\[.*?\]\s*/, '')}</p>
                <p><strong>Translated:</strong> {translatedText}</p>
              </div>
            </div>
          )}

          {/* Translated Video */}
          {translatedVideo && (
            <div className="translated-video">
              <h4>🎬 Translated Video</h4>
              <video controls className="video-player">
                <source src={translatedVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="video-actions">
                <a href={translatedVideo} download className="download-btn">
                  📥 Download Translated Video
                </a>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="how-it-works">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>📤 Upload a video with spoken audio</li>
              <li>🌍 Choose source and target languages</li>
              <li>💰 Complete payment (KES {TRANSLATION_PRICE})</li>
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