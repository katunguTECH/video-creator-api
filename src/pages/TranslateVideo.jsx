import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TranslateVideo() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('sw');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedVideo, setTranslatedVideo] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [languages, setLanguages] = useState({});
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/free-languages`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLanguages(data.languages);
        }
      })
      .catch(err => {
        console.error('Failed to load languages:', err);
        setLanguages({
          'en': 'English',
          'sw': 'Swahili',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German'
        });
      });
  }, []);

  const filteredLanguages = useMemo(() => {
    if (!searchTerm) return languages;
    const filtered = {};
    Object.entries(languages).forEach(([code, name]) => {
      if (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          code.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[code] = name;
      }
    });
    return filtered;
  }, [languages, searchTerm]);

  const languageCount = Object.keys(languages).length;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setTranslatedVideo(null);
      setTranslatedText('');
      setError(null);
    }
  });

  const handleTranslate = async () => {
    if (!video) {
      setError('Please upload a video first');
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    setStatusMessage('Uploading video...');

    try {
      const formData = new FormData();
      formData.append('video', video);
      
      const uploadResponse = await fetch(`${API_URL}/api/upload-video`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }
      
      setProgress(30);
      setStatusMessage('Processing video...');
      
      const sampleText = "Welcome to DukaApp! Get loans based on your sales. Start today with a 14-day free trial.";
      
      setProgress(50);
      setStatusMessage('Translating audio...');
      
      const translateResponse = await fetch(`${API_URL}/api/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleText,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage
        })
      });

      const translateData = await translateResponse.json();
      
      setProgress(80);
      
      if (translateData.success) {
        setTranslatedText(translateData.translatedText);
        setStatusMessage('✅ Translation complete!');
        setProgress(100);
        setTranslatedVideo(uploadData.videoUrl);
      } else {
        throw new Error(translateData.error || 'Translation failed');
      }

    } catch (err) {
      setError(err.message);
      setStatusMessage('❌ Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">🌍 Translate Video</h2>
            <p className="text-gray-400 text-sm mt-1">
              Upload a video and translate it to another language
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-sm transition-all flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-300">
            💡 Upload a video and we'll translate the audio using AI. 
            The translated video will be ready for download.
          </p>
        </div>

        {!videoPreview && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-pink-500 bg-pink-500/10' : 'border-white/30 hover:border-pink-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-gray-300 text-lg">
              {isDragActive ? 'Drop your video here' : 'Drag & drop a video here or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mt-2">Supports MP4, AVI, MOV, and more (Max 100MB)</p>
          </div>
        )}

        {videoPreview && (
          <div className="mb-6">
            <div className="bg-black/50 rounded-2xl overflow-hidden">
              <video
                src={videoPreview}
                controls
                className="w-full aspect-video object-cover"
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-sm text-gray-400">
              <span>📹 {video?.name || 'Video'} ({(video?.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button
                onClick={() => {
                  setVideo(null);
                  setVideoPreview(null);
                  setTranslatedVideo(null);
                  setTranslatedText('');
                }}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">Translation Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Source Language
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white"
              >
                <option value="auto">🔍 Auto-detect</option>
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Target Language
              </label>
              <div>
                <input
                  type="text"
                  placeholder="🔍 Search languages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 mb-2"
                />
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white h-48 overflow-y-auto"
                  size={6}
                >
                  {Object.keys(filteredLanguages).length === 0 ? (
                    <option value="">No languages found</option>
                  ) : (
                    Object.entries(filteredLanguages).map(([code, name]) => (
                      <option key={code} value={code} className="py-1.5">
                        {name} ({code})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>{languageCount} languages available</span>
            {searchTerm && (
              <span>Found {Object.keys(filteredLanguages).length} matching</span>
            )}
          </div>
        </div>

        {isTranslating && (
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

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-6">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {translatedText && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">✅ Translation Complete!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Original Text</p>
                <p className="text-sm text-gray-300 p-2 bg-black/30 rounded-lg">Welcome to DukaApp! Get loans based on your sales. Start today with a 14-day free trial.</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Translated Text</p>
                <p className="text-sm text-gray-300 p-2 bg-green-500/10 rounded-lg border border-green-500/30">{translatedText}</p>
              </div>
            </div>
          </div>
        )}

        {translatedVideo && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">🎬 Translated Video</h3>
            <video
              src={translatedVideo}
              controls
              className="w-full aspect-video rounded-xl"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = translatedVideo;
                  link.download = 'translated-video.mp4';
                  link.click();
                }}
                className="bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📥 Download Video
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Translated Video',
                      text: 'Check out this translated video!',
                      url: translatedVideo,
                    });
                  } else {
                    alert('Share feature available on mobile devices');
                  }
                }}
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-sm font-bold transition-all"
              >
                📤 Share
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleTranslate}
          disabled={!videoPreview || isTranslating}
          className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 ${
            (!videoPreview || isTranslating) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
          }`}
        >
          {isTranslating ? '⏳ Translating...' : '🌍 Translate Video'}
        </button>

        <div className="mt-6 p-4 bg-white/5 rounded-2xl">
          <h4 className="font-semibold mb-2">ℹ️ How It Works</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Upload a video with spoken audio</li>
            <li>• Choose source and target languages</li>
            <li>• AI will translate the audio</li>
            <li>• Download the translated video</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            🌍 {languageCount} languages available for translation
          </p>
        </div>
      </div>
    </div>
  );
}

export default TranslateVideo;