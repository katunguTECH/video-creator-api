import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex flex-col items-center justify-center text-white px-4">
      
      {/* Logo / Title */}
      <h1 className="text-5xl font-bold mb-4 text-center">
        VidAI Creator
      </h1>
      <p className="text-xl text-gray-300 mb-12 text-center max-w-md">
        Turn your photos and ideas into stunning videos with AI. Share instantly to TikTok, WhatsApp and more.
      </p>

      {/* Feature Cards - Now includes Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 w-full max-w-5xl">
        <div className="bg-white/10 rounded-2xl p-6 text-center hover:bg-white/20 transition-all cursor-pointer" onClick={() => navigate('/create')}>
          <div className="text-4xl mb-3">✍️</div>
          <h3 className="font-bold text-lg mb-1">Text to Video</h3>
          <p className="text-gray-400 text-sm">Describe your idea and AI brings it to life</p>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-6 text-center hover:bg-white/20 transition-all cursor-pointer" onClick={() => navigate('/photos-to-video')}>
          <div className="text-4xl mb-3">🖼️</div>
          <h3 className="font-bold text-lg mb-1">Photos to Video</h3>
          <p className="text-gray-400 text-sm">Upload photos and create a slideshow</p>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-6 text-center hover:bg-white/20 transition-all cursor-pointer" onClick={() => navigate('/create')}>
          <div className="text-4xl mb-3">🎵</div>
          <h3 className="font-bold text-lg mb-1">Music & Captions</h3>
          <p className="text-gray-400 text-sm">Add music and captions to make it pop</p>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-6 text-center hover:bg-white/20 transition-all cursor-pointer" onClick={() => navigate('/translate')}>
          <div className="text-4xl mb-3">🌍</div>
          <h3 className="font-bold text-lg mb-1">Translate Video</h3>
          <p className="text-gray-400 text-sm">Translate videos to other languages</p>
        </div>

        {/* NEW: Admin Dashboard Tab */}
        <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl p-6 text-center hover:from-purple-500/50 hover:to-pink-500/50 transition-all cursor-pointer border border-white/20" onClick={() => navigate('/admin')}>
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-bold text-lg mb-1">Admin Dashboard</h3>
          <p className="text-gray-300 text-sm">Monitor revenue, credits, and activity</p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => navigate('/create')}
        className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-105"
      >
        Start Creating
      </button>

    </div>
  );
}

export default Home;