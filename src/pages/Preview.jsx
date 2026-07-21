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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const handleSendEmail = async () => {
    if (!videoUrl || !email) {
      alert('No video or email available');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`${API_URL}/api/send-video-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          videoUrl: videoUrl,
          prompt: prompt || 'Your AI-generated video',
          amount: amount || '0',
          duration: duration || 5
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEmailSent(true);
        setStatusMessage('✅ Video sent to your email! 📧');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      alert('Failed to send email. Please try downloading the video manually.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const checkFreeRetry = async () => {
    if (!paymentReference) return;
    
    try {
      const response = await fetch(`${API_URL}/api/check-free-retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentReference })
      });
      
      const data = await response.json();
      if (data.success && data.canRetry) {
        setCanRetry(true);
        setStatusMessage('⚠️ Previous generation failed. Click "Retry for Free" to try again.');
      }
    } catch (error) {
      console.error('Error checking free retry:', error);
    }
  };

  const handleRetry = async () => {
    if (!canRetry || !paymentReference) return;
    
    setIsRetrying(true);
    setStatusMessage('🔄 Retrying video generation (free)...');
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          paymentReference: paymentReference,
          email: email,
          serviceType: 'text-to-video',
          retry: true,
          duration: duration || 5
        })
      });
      
      const data = await response.json();
      console.log('📦 Retry Response:', data);
      
      if (data.success && data.videoUrl && !data.isFallback) {
        setVideoUrl(data.videoUrl);
        setUsedModel(data.usedModel || 'Dreamina Seedance');
        setCanRetry(false);
        setStatusMessage('✅ Video generated successfully on retry! 🎉');
        setEmailSent(false);
      } else if (data.success && data.isFallback) {
        setStatusMessage('⚠️ Retry failed again. Please try again later.');
        setCanRetry(true);
      } else {
        throw new Error(data.error || 'Retry failed');
      }
    } catch (error) {
      console.error('Retry error:', error);
      setStatusMessage('❌ Retry failed. Please contact support.');
      setError(error.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const createFallbackVideo = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 140, 180, 40 + i * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + i * 0.02})`;
      ctx.fill();
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;

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

    const lineHeight = 35;
    const startY = 180 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, 320, startY + index * lineHeight);
    });

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Arial';
    ctx.fillText('AI Generated Preview', 320, 330);

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
      console.log('⏱️ Duration:', duration || 5, 's');
      console.log('💳 Payment Reference:', paymentReference || 'Test Mode');

      if (!paymentReference) {
        console.warn('⚠️ No payment reference found, using test mode');
      }

      setStatusMessage('🤖 Generating with Dreamina Seedance...');

      const response = await fetch(`${API_URL}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          paymentReference: paymentReference || 'test_mode_' + Date.now(),
          email: email,
          serviceType: 'text-to-video',
          duration: duration || 5
        })
      });

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (data.success && data.videoUrl) {
        if (data.isFallback) {
          setVideoUrl(data.videoUrl);
          setUsedModel('Preview (Fallback)');
          setProgress(100);
          setIsGenerating(false);
          setStatusMessage('⚠️ ' + (data.note || 'Video generation failed.'));
          
          if (data.canRetry && paymentReference) {
            setCanRetry(true);
            setStatusMessage('⚠️ Video generation failed. Click "Retry for Free" to try again.');
          }
          return;
        }

        setVideoUrl(data.videoUrl);
        setUsedModel(data.usedModel || 'Dreamina Seedance');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage(`✅ ${duration || 5}s video generated successfully! 🎉`);

        if (email) {
          try {
            const emailResponse = await fetch(`${API_URL}/api/send-video-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                videoUrl: data.videoUrl,
                prompt: prompt,
                amount: amount || '0',
                duration: duration || 5
              })
            });
            const emailData = await emailResponse.json();
            if (emailData.success) {
              setEmailSent(true);
              setStatusMessage(`✅ ${duration || 5}s video generated and sent to your email! 📧`);
            }
          } catch (emailErr) {
            console.warn('Email auto-send failed:', emailErr);
          }
        }
        return;
      }

      console.log('🔄 API failed, creating fallback preview...');
      setStatusMessage('🎨 Creating preview...');

      const fallbackDataUrl = createFallbackVideo();
      setVideoUrl(fallbackDataUrl);
      setUsedModel('Preview (Fallback)');
      setProgress(100);
      setIsGenerating(false);
      setStatusMessage('⚠️ Preview generated (API failed)');

    } catch (err) {
      console.error('❌ Error:', err);

      try {
        const fallbackDataUrl = createFallbackVideo();
        setVideoUrl(fallbackDataUrl);
        setUsedModel('Emergency Preview');
        setProgress(100);
        setIsGenerating(false);
        setStatusMessage('⚠️ Preview generated (Fallback)');
      } catch (fallbackError) {
        setError(`❌ ${err.message}`);
        setIsGenerating(false);
        setStatusMessage('❌ Generation failed');
      }
    }
  }, [prompt, paymentReference, email, amount, duration, createFallbackVideo]);

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
            {email && (
              <p className="text-xs text-gray-400 mt-1">📧 Video will be sent to: {email}</p>
            )}
            {duration && (
              <p className="text-xs text-purple-400 mt-1">⏱️ Duration: {duration}s</p>
            )}
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">{Math.min(progress, 100)}% Complete</p>

          <div className="mt-8 flex justify-center space-x-3">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl text-left">
            <p className="text-xs text-gray-400">💡 Video generation may take 30-90 seconds</p>
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
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 mb-3"
              >
                {isRetrying ? '⏳ Retrying...' : '🔄 Retry for Free'}
              </button>
            )}
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

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🎬 Video Preview</h2>
            <p className="text-gray-400 text-sm mt-1">
              {usedModel} • {videoUrl?.startsWith('data:video') ? 'Video' : 'Image'}
              {duration && <span className="ml-2 text-purple-400">⏱️ {duration}s</span>}
            </p>
            {paymentReference && (
              <p className="text-xs text-green-400 mt-1">✅ Payment: {paymentReference.substring(0, 15)}...</p>
            )}
            {email && (
              <p className="text-xs text-gray-400 mt-1">📧 Delivering to: {email}</p>
            )}
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
                  onError={() => setError('Failed to load video')}
                />
              ) : videoUrl.startsWith('data:image') ? (
                <img
                  src={videoUrl}
                  alt="Generated video"
                  className="w-full h-full object-cover"
                  onError={() => setError('Failed to load image')}
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  onError={() => setError('Failed to load video')}
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/30">
                <p className="text-gray-400">No video available</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</h3>
            <p className="font-semibold text-lg">{duration || 5}s</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownload}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <span>📥</span> Download Video
          </button>
          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail || emailSent}
            className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg ${
              (isSendingEmail || emailSent) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isSendingEmail ? '⏳ Sending...' : emailSent ? '✅ Sent!' : '📧 Send to Email'}
          </button>
        </div>

        {canRetry && (
          <div className="mb-6">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg ${
                isRetrying ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              {isRetrying ? '⏳ Retrying...' : '🔄 Retry for Free'}
            </button>
            <p className="text-xs text-yellow-400 text-center mt-2">
              Your previous generation failed. This retry is free.
            </p>
          </div>
        )}

        {emailSent && (
          <div className="bg-green-500/20 border border-green-500 rounded-2xl p-4 mb-6 text-center">
            <p className="text-green-400">✅ Video sent successfully to {email}!</p>
            <p className="text-xs text-gray-400 mt-1">Check your inbox (and spam folder) for the video link</p>
          </div>
        )}

        <div className="mt-4 text-center text-gray-500 text-xs">
          <p>Generated using {usedModel} • Duration: {duration || 5}s • Download to save permanently</p>
          {email && <p>📧 Video link also sent to {email}</p>}
        </div>

      </div>
    </div>
  );
}

export default Preview;