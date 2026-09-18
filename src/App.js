import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from './pages/Home';
import CreateVideo from './pages/CreateVideo';
import Preview from './pages/Preview';
import TranslateVideo from './pages/TranslateVideo';
import PhotosToVideo from './pages/PhotosToVideo';
import AdminDashboard from './pages/AdminDashboard';
import MusicCaptions from './pages/MusicCaptions';
import BrandVideo from './pages/BrandVideo';
import Services from './pages/Services';
import TranslateService from './pages/TranslateService';
import TextToVideoService from './pages/TextToVideoService';
import PhotosToVideoService from './pages/PhotosToVideoService';
import BrandVideoService from './pages/BrandVideoService';
import MusicCaptionsService from './pages/MusicCaptionsService';
import Updates from './pages/Updates';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/translate" element={<TranslateService />} />
          <Route path="/services/text-to-video" element={<TextToVideoService />} />
          <Route path="/services/photos-to-video" element={<PhotosToVideoService />} />
          <Route path="/services/brand-video" element={<BrandVideoService />} />
          <Route path="/services/music-captions" element={<MusicCaptionsService />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/create" element={<CreateVideo />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/translate" element={<TranslateVideo />} />
          <Route path="/photos-to-video" element={<PhotosToVideo />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/music-captions" element={<MusicCaptions />} />
          <Route path="/brand-video" element={<BrandVideo />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;