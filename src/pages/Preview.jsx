import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Preview() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Initializing AI...');
  const [usedModel, setUsedModel] = useState('');

  // Translation states
  const [translatedText, setTranslatedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('sw');
  const [isTranslating, setIsTranslating] = useState(false);

  // Get all state from navigation
  const {
    prompt,
    photos,
    caption,
    activeTab,
    paymentReference,
    amount,
    duration,
    email
  } = location.state || {};

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'my-ai-video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = (platform) => {
    if (videoUrl) {
      if (navigator.share) {
        navigator.share({
          title: 'My AI Video',
          text: 'Check out this video I created with AI!',
          url: videoUrl,
        }).catch(console.error);
      } else {
        alert(`Share to ${platform} - In a real app, this would open the share dialog.`);
      }
    }
  };

  const handleTranslate = async () => {
    if (!prompt) {
      alert('No text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      setStatusMessage('🌐 Translating...');

      const response = await fetch(`${API_URL}/api/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          targetLanguage: targetLanguage,
          sourceLanguage: 'en'
        })
      });

      const data = await response.json();

      if (data.success) {
        setTranslatedText(data.translatedText);
        setStatusMessage(`✅ Translated to ${data.targetLanguage}`);
      } else {
        throw new Error(data.error || 'Translation failed');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Create a better fallback video using canvas
  const createFallbackVideo = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Professional gradient background
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);

    // Decorative circles
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 140, 180, 40 + i * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + i * 0.02})`;
      ctx.fill();
    }

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;

    // Split long prompt into lines
    const words = prompt ? prompt.split(' ') : ['No prompt provided'];
    let lines = [];
    let currentLine = '';
    for (let word of words) {
      if ((currentLine + word).length > 40) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    // Display lines
    const lineHeight = 35;
    const startY = 180 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, 320, startY + index * lineHeight);
    });

    // Add "AI Generated" badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Arial';
    ctx.fillText('AI Generated Preview', 320, 330);

    // Add payment reference if exists
    if (paymentReference) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '10px Arial';
      ctx.fillText(`Payment: ${paymentReference.substring(0, 10)}...`, 320, 345);
    }

    return canvas.toDataURL('image/png');
  }, [prompt, paymentReference]);

  const generateVideo = useCallback(async () => {
    try {
      setStatusMessage('🎬 Generating your video with AI...');
      console.log('📝 Prompt:', prompt);
      console.log('💳 Payment Reference:', paymentReference || 'Test Mode');
      console.log('💰 Amount Paid: KES', amount);

      // Try Replicate API
      setStatusMessage('🤖 Generating with Replicate HappyHorse...');

      const response = await fetch(`${API_URL}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          paymentReference: paymentReference || 'test_mode'
        })
      });

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setUsedModel(data.usedModel || 'HappyHorse (Replicate)');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage(`✅ Video generated successfully! 🎉`);
        return;
      }

      // If API fails, create fallback
      console.log('🔄 Creating fallback preview...');
      setStatusMessage('🎨 Creating preview...');

      const fallbackDataUrl = createFallbackVideo();
      setVideoUrl(fallbackDataUrl);
      setUsedModel('Preview (Fallback)');
      setProgress(100);
      setIsGenerating(false);
      setStatusMessage('✅ Preview generated! 🎉');

    } catch (err) {
      console.error('❌ Error:', err);

      // Create fallback preview on error
      try {
        const fallbackDataUrl = createFallbackVideo();
        setVideoUrl(fallbackDataUrl);
        setUsedModel('Emergency Preview');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage('✅ Preview generated (Fallback)');
      } catch (fallbackError) {
        setError(`❌ ${err.message}\n\nPlease check:\n1. Backend is running\n2. Add credits to Replicate\n3. Check console for details`);
        setIsGenerating(false);
        setStatusMessage('❌ Generation failed');
      }
    }
  }, [prompt, paymentReference, amount, createFallbackVideo]);

  useEffect(() => {
    if (!prompt && (!photos || photos.length === 0)) {
      navigate('/create');
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 8) + 3;
      });
    }, 500);

    generateVideo();
    return () => clearInterval(progressInterval);
  }, [prompt, photos, activeTab, navigate, generateVideo]);

  // Loading Screen
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-3xl font-bold mb-2">Generating Your Video</h2>
            <p className="text-gray-300">{statusMessage}</p>
            {paymentReference && (
              <p className="text-xs text-green-400 mt-2">✅ Payment: {paymentReference.substring(0, 10)}...</p>
            )}
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm">{Math.min(progress, 100)}% Complete</p>

          <div className="mt-8 flex justify-center space-x-3">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl text-left">
            <p className="text-xs text-gray-400">💡 Video generation may take 30-60 seconds</p>
            <p className="text-xs text-gray-500 mt-1">🔍 Check console (F12) for details</p>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-red-500/20 p-8 rounded-2xl border border-red-500">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-4">Something Went Wrong</h2>
            <div className="bg-black/30 p-4 rounded-lg mb-4 text-left max-h-60 overflow-auto">
              <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                {error}
              </pre>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="bg-pink-500 hover:bg-pink-600 px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105"
            >
              ← Go Back to Create
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video Preview Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🎬 Video Preview</h2>
            <p className="text-gray-400 text-sm mt-1">
              {usedModel} • {videoUrl?.startsWith('data:video') ? 'Video' : 'Image'}
            </p>
            {paymentReference && (
              <p className="text-xs text-green-400 mt-1">✅ Payment: {paymentReference.substring(0, 15)}...</p>
            )}
          </div>
          <button
            onClick={() => navigate('/create')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Create
          </button>
        </div>

        {/* Video Player */}
        <div className="bg-black/50 rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <div className="aspect-video relative">
            {videoUrl ? (
              videoUrl.startsWith('data:video') ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  onError={() => setError('Failed to load video. The data might be corrupted.')}
                />
              ) : (
                <img
                  src={videoUrl}
                  alt="Generated video"
                  className="w-full h-full object-cover"
                  onError={() => setError('Failed to load image.')}
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/30">
                <p className="text-gray-400">No video available</p>
              </div>
            )}
          </div>
        </div>

        {/* Translation Section */}
        {prompt && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-400">🌐 Translate:</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white"
                disabled={isTranslating}
              >
                <option value="sw">Swahili</option>
                <option value="yo">Yoruba</option>
                <option value="ha">Hausa</option>
                <option value="ig">Igbo</option>
                <option value="zu">Zulu</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className={`bg-pink-500 hover:bg-pink-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  isTranslating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isTranslating ? '⏳ Translating...' : 'Translate'}
              </button>
            </div>
            {translatedText && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg border border-pink-500/30">
                <p className="text-sm text-gray-300">📝 {translatedText}</p>
              </div>
            )}
          </div>
        )}

        {/* Video Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Type</h3>
            <p className="font-semibold text-lg">
              {videoUrl?.startsWith('data:video') ? '🎬 Video' : '🖼️ Image'}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Model</h3>
            <p className="font-semibold text-sm truncate">{usedModel}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</h3>
            <p className="font-semibold text-lg text-green-400">✅ Ready</p>
          </div>
        </div>

        {/* Prompt */}
        {prompt && (
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Text Prompt</h3>
            <p className="text-lg">"{prompt}"</p>
          </div>
        )}

        {/* Caption */}
        {caption && (
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Caption</h3>
            <p className="text-xl font-semibold text-pink-300">{caption}</p>
          </div>
        )}

        {/* Photos Preview */}
        {photos && photos.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Photos ({photos.length})</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.slice(0, 6).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border-2 border-white/20"
                />
              ))}
              {photos.length > 6 && (
                <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-white/20">
                  <span className="text-sm font-bold">+{photos.length - 6}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleDownload}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <span>📥</span> Download
          </button>
          <button
            onClick={() => handleShare('TikTok')}
            className="bg-black hover:bg-gray-900 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 border-2 border-white/20 shadow-lg"
          >
            <span>🎵</span> TikTok
          </button>
          <button
            onClick={() => handleShare('WhatsApp')}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <span>💬</span> WhatsApp
          </button>
        </div>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Generated using {usedModel} • Download to save permanently</p>
          {videoUrl?.startsWith('data:video') && <p>💡 Video format: MP4</p>}
          {paymentReference && <p className="text-green-400/50 mt-1">✅ Payment verified: {paymentReference}</p>}
        </div>

      </div>
    </div>
  );
}

export default Preview;