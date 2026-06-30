import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateVideo from './pages/CreateVideo';
import Preview from './pages/Preview';
import TranslateVideo from './pages/TranslateVideo';
import PhotosToVideo from './pages/PhotosToVideo';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateVideo />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/translate" element={<TranslateVideo />} />
        <Route path="/photos-to-video" element={<PhotosToVideo />} />
      </Routes>
    </Router>
  );
}

export default App;