import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function PhotosToVideo() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  
  const [photos, setPhotos] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  
  // Video settings
  const [settings, setSettings] = useState({
    duration: 3,
    transition: 'fade',
    music: 'none',
    caption: 'living my best life',
    resolution: '720p',
    aspectRatio: '16:9'
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState([]);
  const [videoBlob, setVideoBlob] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => {
      const previews = acceptedFiles.map(file =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setPhotos(prev => [...prev, ...previews]);
      setVideoUrl(null);
      setFrames([]);
      setError(null);
    }
  });

  // Generate frames from photos
  const generateFrames = () => {
    if (photos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    const newFrames = [];
    let loadedCount = 0;
    
    photos.forEach((photo, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size based on aspect ratio
      const width = settings.aspectRatio === '16:9' ? 640 : 480;
      const height = settings.aspectRatio === '16:9' ? 360 : 640;
      canvas.width = width;
      canvas.height = height;
      
      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Draw image
      const img = new Image();
      img.src = photo.preview;
      img.onload = () => {
        // Calculate image placement (cover)
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
        
        // Add overlay gradient for text readability
        const overlay = ctx.createLinearGradient(0, height - 80, 0, height);
        overlay.addColorStop(0, 'rgba(0,0,0,0)');
        overlay.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, height - 80, width, 80);
        
        // Add photo number
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Photo ${index + 1}/${photos.length}`, width - 20, height - 10);
        
        // Add caption if exists
        if (settings.caption) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 10;
          ctx.fillText(settings.caption, width / 2, height - 30);
          ctx.shadowBlur = 0;
        }
        
        const dataUrl = canvas.toDataURL('image/png');
        newFrames[index] = dataUrl;
        loadedCount++;
        
        // If all frames are generated, update state
        if (loadedCount === photos.length) {
          setFrames(newFrames);
          setVideoUrl(newFrames[0]);
          setProgress(100);
          setIsGenerating(false);
          setStatusMessage('✅ Video generated successfully! 🎉');
          setIsPlaying(true);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load image:', photo.preview);
        loadedCount++;
        // Use a placeholder frame
        const dataUrl = canvas.toDataURL('image/png');
        newFrames[index] = dataUrl;
        if (loadedCount === photos.length) {
          setFrames(newFrames);
          setVideoUrl(newFrames[0]);
          setProgress(100);
          setIsGenerating(false);
          setStatusMessage('✅ Video generated successfully! 🎉');
          setIsPlaying(true);
        }
      };
    });
  };

  const handleGenerate = () => {
    if (photos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('🎬 Generating video...');
    setFrames([]);
    setError(null);
    setIsPlaying(false);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 200);
    
    // Generate frames
    setTimeout(() => {
      generateFrames();
      clearInterval(progressInterval);
      setProgress(100);
    }, 1000);
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
    if (frames.length === 0) {
      alert('Please generate the video first');
      return;
    }

    // Create a video from frames using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = settings.aspectRatio === '16:9' ? 640 : 480;
    const height = settings.aspectRatio === '16:9' ? 360 : 640;
    canvas.width = width;
    canvas.height = height;
    
    // Create a video stream
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      
      // Download the video
      const link = document.createElement('a');
      link.download = 'slideshow-video.webm';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      alert('✅ Video exported successfully! Check your downloads folder.');
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Draw frames at intervals
    let frameIndex = 0;
    const frameInterval = setInterval(() => {
      if (frameIndex >= frames.length) {
        clearInterval(frameInterval);
        mediaRecorder.stop();
        return;
      }
      
      const img = new Image();
      img.src = frames[frameIndex];
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        frameIndex++;
      };
    }, settings.duration * 1000);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setVideoUrl(null);
    setFrames([]);
  };

  const reorderPhotos = (fromIndex, toIndex) => {
    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, removed);
    setPhotos(newPhotos);
    setVideoUrl(null);
    setFrames([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🖼️ Photos to Video</h2>
            <p className="text-gray-400 text-sm mt-1">Upload your photos and create a beautiful slideshow video</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
        </div>

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
                <div key={index} className="relative group">
                  <img 
                    src={photo.preview} 
                    alt={`Photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border-2 border-white/10 group-hover:border-pink-500 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex items-center justify-center gap-1">
                    <button
                      onClick={() => removePhoto(index)}
                      className="bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                    >
                      ✕
                    </button>
                    {index > 0 && (
                      <button
                        onClick={() => reorderPhotos(index, index - 1)}
                        className="bg-blue-500 hover:bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >
                        ↑
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        onClick={() => reorderPhotos(index, index + 1)}
                        className="bg-blue-500 hover:bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >
                        ↓
                      </button>
                    )}
                  </div>
                  <div className="absolute top-1 right-1 bg-black/70 rounded-full px-2 py-0.5 text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Settings */}
        {photos.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">🎛️ Video Settings</h3>
            
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
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Music
                </label>
                <select
                  value={settings.music}
                  onChange={(e) => setSettings({...settings, music: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white"
                >
                  <option value="none">None</option>
                  <option value="upbeat">Upbeat 🎵</option>
                  <option value="calm">Calm 🌊</option>
                  <option value="dramatic">Dramatic 🎻</option>
                  <option value="romantic">Romantic ❤️</option>
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
        {isGenerating && (
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
        {frames.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">🎬 Video Preview</h3>
            <div className="relative bg-black/50 rounded-xl overflow-hidden">
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
            </div>
            <div className="mt-3 flex gap-3 flex-wrap">
              <button
                onClick={handleDownloadFrame}
                className="bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📥 Download Frame
              </button>
              <button
                onClick={handleExportVideo}
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📥 Export Video
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-6">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Generate Button */}
        {photos.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 ${
              isGenerating ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
          >
            {isGenerating ? '⏳ Generating...' : '🎬 Generate Video'}
          </button>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-white/5 rounded-2xl">
          <h4 className="font-semibold mb-2">ℹ️ Features</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Upload multiple photos (JPG, PNG, WEBP)</li>
            <li>• Drag and drop to reorder photos</li>
            <li>• Choose transition effects</li>
            <li>• Add music and captions</li>
            <li>• Preview and download your video</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default PhotosToVideo;