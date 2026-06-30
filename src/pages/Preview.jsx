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

  const { prompt, photos, caption, activeTab } = location.state || {};

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

  const generateVideo = useCallback(async () => {
    try {
      setStatusMessage('🎬 Generating your video with AI...');
      console.log('📝 Prompt:', prompt);

      // Try Replicate API
      setStatusMessage('🤖 Generating with Replicate AI...');
      
      const response = await fetch(`${API_URL}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt })
      });

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setUsedModel(data.usedModel || 'Replicate');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage(`✅ Video generated successfully! 🎉`);
        return;
      }

      // If Replicate fails, try Dreamina
      setStatusMessage('🔄 Trying Dreamina-Seedance...');
      const dreaminaResponse = await fetch(`${API_URL}/api/generate-dreamina`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt,
          duration: 5,
          resolution: '720p'
        })
      });

      const dreaminaData = await dreaminaResponse.json();
      console.log('📦 Dreamina Response:', dreaminaData);

      if (dreaminaData.success && dreaminaData.videoUrl) {
        setVideoUrl(dreaminaData.videoUrl);
        setUsedModel('Dreamina-Seedance-2.0');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage('✅ Video generated with Dreamina! 🎉');
        return;
      }

      // If all APIs fail, create a fallback preview
      console.log('🔄 Creating fallback preview...');
      setStatusMessage('🎨 Creating preview...');
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createLinearGradient(0, 0, 640, 360);
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(1, '#EC4899');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 360);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      
      const lines = prompt.length > 40 ? prompt.match(/.{1,40}/g) : [prompt];
      const lineHeight = 40;
      const startY = 160 - ((lines.length - 1) * lineHeight) / 2;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, 320, startY + index * lineHeight);
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      setVideoUrl(dataUrl);
      setUsedModel('Preview (Fallback)');
      setProgress(100);
      setIsGenerating(false);
      setStatusMessage('✅ Preview generated! 🎉');

    } catch (err) {
      console.error('❌ Error:', err);
      
      try {
        setStatusMessage('🔄 Generating emergency preview...');
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 640, 360);
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#EC4899');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 360);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('AI Video Preview', 320, 160);
        ctx.font = '18px Arial';
        ctx.fillText(prompt.substring(0, 50) + '...', 320, 210);
        
        const dataUrl = canvas.toDataURL('image/png');
        setVideoUrl(dataUrl);
        setUsedModel('Emergency Preview');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage('✅ Preview generated!');
      } catch (fallbackError) {
        setError(`❌ ${err.message}\n\nPlease check:\n1. Backend is running (node server.js)\n2. Add credits to Replicate\n3. Check console for details`);
        setIsGenerating(false);
        setStatusMessage('❌ Generation failed');
      }
    }
  }, [prompt]);

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

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-3xl font-bold mb-2">Generating Your Video</h2>
            <p className="text-gray-300">{statusMessage}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🎬 Video Preview</h2>
            <p className="text-gray-400 text-sm mt-1">
              {usedModel} • {videoUrl?.startsWith('data:video') ? 'Video' : 'Image'}
            </p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Create
          </button>
        </div>

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

        {prompt && (
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Text Prompt</h3>
            <p className="text-lg">"{prompt}"</p>
          </div>
        )}

        {caption && (
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm mb-6">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Caption</h3>
            <p className="text-xl font-semibold text-pink-300">{caption}</p>
          </div>
        )}

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
        </div>

      </div>
    </div>
  );
}

export default Preview;