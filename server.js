// ============================================
// LOAD ENVIRONMENT VARIABLES
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('📡 Port:', PORT);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: isProduction ? ['https://*.onrender.com', 'https://video-creator-frontend.onrender.com'] : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// HEALTH CHECK - IMPORTANT FOR RENDER
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime()
  });
});

// Root endpoint for Render
app.get('/', (req, res) => {
  res.json({
    message: 'Video Creator API is running!',
    endpoints: ['/api/health', '/api/test', '/api/free-languages'],
    docs: 'https://github.com/katunguTECH/video-creator-api'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    time: new Date().toISOString()
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available: ['/api/health', '/api/test', '/api/free-languages']
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📡 Test: http://0.0.0.0:${PORT}/api/test`);
});