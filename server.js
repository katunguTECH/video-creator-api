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
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Payment enforcement - set to false for testing
const ENFORCE_PAYMENT = false; // Set to false to skip payment for now

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('💳 Payment Enforcement:', ENFORCE_PAYMENT ? '✅ Enabled' : '❌ Disabled (Testing)');
console.log('🔑 Replicate Token:', process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set');

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://video-creator-frontend.onrender.com'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a video file.'), false);
    }
  }
});

// ============================================
// PAYMENT VERIFICATION FUNCTION
// ============================================

async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    
    // In development, accept test references
    if (!secretKey || secretKey === 'sk_test_6c53bfef068f43daf82954302729b74fcf90ace0') {
      return reference === 'test_ref_123' || reference.startsWith('test_');
    }
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error('❌ Paystack verification failed:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('📦 Paystack verification:', data.status, data.data?.status);
    return data.status && data.data?.status === 'success';
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

// ============================================
// GENERATE VIDEO WITH REPLICATE - HAPPYHORSE
// ============================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference } = req.body;
    
    // Skip payment check if disabled or in test mode
    if (ENFORCE_PAYMENT && !paymentReference) {
      console.log('❌ Payment required - No payment reference provided');
      return res.status(402).json({
        success: false,
        error: 'Payment required. Please complete payment first.',
        requiresPayment: true
      });
    }
    
    console.log('🎬 Generating video with Replicate HappyHorse...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('💳 Payment Reference:', paymentReference || 'Test Mode');
    
    const token = process.env.REPLICATE_API_TOKEN;
    
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }

    console.log('🔑 Using Replicate token:', token.substring(0, 10) + '...');

    // Try HappyHorse model (cheaper and faster)
    console.log('🚀 Creating prediction with HappyHorse...');
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "alibaba/happy-horse:latest",
        input: {
          prompt: prompt,
          num_frames: 16,
          fps: 8,
          guidance_scale: 7.0,
          num_inference_steps: 30,
          width: 1024,
          height: 576
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Replicate API Error:', response.status);
      console.error('❌ Error details:', errorData);
      
      if (response.status === 402) {
        throw new Error('Insufficient Replicate credits. Please add credits at https://replicate.com/account/billing');
      }
      throw new Error(`Replicate API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Prediction created:', data.id);
    console.log('📊 Status:', data.status);

    // Poll for completion
    let prediction = data;
    let attempts = 0;
    const maxAttempts = 60;

    console.log('⏳ Polling for completion...');
    
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }
      
      prediction = await pollResponse.json();
      attempts++;
      console.log(`⏳ Polling attempt ${attempts}: Status = ${prediction.status}`);
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Prediction failed');
    }

    if (prediction.status !== 'succeeded') {
      throw new Error('Timeout waiting for video generation');
    }

    console.log('✅ Video generated successfully!');
    console.log('📹 Video URL:', prediction.output);

    res.json({
      success: true,
      videoUrl: prediction.output,
      usedModel: 'HappyHorse (Replicate)'
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-video:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// FEE CALCULATION
// ============================================
app.post('/api/calculate-price', (req, res) => {
  try {
    const { serviceType, options } = req.body;
    
    let baseCost = 0;
    let breakdown = [];
    
    // Simple pricing for HappyHorse
    const duration = options?.duration || 5;
    baseCost = 10 + (duration * 2); // 10 KES base + 2 KES per second
    const markupMultiplier = 10;
    const finalPrice = baseCost * markupMultiplier;
    
    breakdown = [
      { item: 'AI Video Generation', amount: baseCost },
      { item: `${duration}s video processing`, amount: duration * 2 },
      { item: 'HD Quality', amount: 0 }
    ];
    
    res.json({
      success: true,
      price: {
        serviceType: serviceType || 'replicate',
        serviceName: 'HappyHorse Video',
        baseCost: baseCost,
        markupMultiplier: markupMultiplier,
        markupAmount: baseCost * (markupMultiplier - 1),
        finalPrice: finalPrice,
        breakdown: breakdown,
        currency: 'KES'
      },
      formatted: `KES ${finalPrice}`
    });
    
  } catch (error) {
    console.error('❌ Price calculation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET SERVICE COSTS
// ============================================
app.get('/api/service-costs', (req, res) => {
  res.json({
    success: true,
    services: {
      replicate: {
        id: 'replicate',
        name: 'HappyHorse Video',
        baseCost: 10,
        markupMultiplier: 10,
        estimatedPrice: 100
      }
    },
    markupMultiplier: 10,
    currency: 'KES'
  });
});

// ============================================
// VIDEO TRANSLATION ENDPOINTS
// ============================================
const FREE_TRANSLATION_LANGUAGES = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ko': 'Korean', 'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu',
  'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Tagalog', 'vi': 'Vietnamese',
  'th': 'Thai', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba',
  'ig': 'Igbo', 'zu': 'Zulu', 'af': 'Afrikaans', 'am': 'Amharic',
  'ne': 'Nepali', 'si': 'Sinhala', 'ta': 'Tamil', 'te': 'Telugu',
  'ml': 'Malayalam', 'kn': 'Kannada', 'pa': 'Punjabi', 'gu': 'Gujarati',
  'mr': 'Marathi', 'or': 'Odia'
};

app.get('/api/free-languages', (req, res) => {
  res.json({
    success: true,
    languages: FREE_TRANSLATION_LANGUAGES
  });
});

app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No video file uploaded');
    }
    
    const videoPath = req.file.path;
    const videoUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ Video uploaded:', videoPath);
    
    res.json({
      success: true,
      videoPath: videoPath,
      videoUrl: videoUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    
    if (!text) {
      throw new Error('Text is required');
    }
    
    if (!targetLanguage || !FREE_TRANSLATION_LANGUAGES[targetLanguage]) {
      throw new Error(`Target language not supported.`);
    }
    
    console.log('🌐 Translating text...');
    console.log('🎯 Target:', targetLanguage);
    
    // Try LibreTranslate
    const servers = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com'
    ];
    
    for (const server of servers) {
      try {
        const response = await fetch(`${server}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLanguage || 'en',
            target: targetLanguage,
            format: 'text'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            res.json({
              success: true,
              originalText: text,
              translatedText: data.translatedText,
              targetLanguage: targetLanguage,
              usedModel: 'LibreTranslate (Free)'
            });
            return;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // Fallback: Simulated translation
    res.json({
      success: true,
      originalText: text,
      translatedText: `[${FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage}] ${text}`,
      targetLanguage: targetLanguage,
      usedModel: 'Simulated Translation (Fallback)'
    });
    
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST & HEALTH ENDPOINTS
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    paymentEnforced: ENFORCE_PAYMENT ? '✅ Yes' : '❌ No',
    endpoints: [
      '/api/test',
      '/api/health',
      '/api/generate-video (Replicate - HappyHorse)',
      '/api/calculate-price',
      '/api/service-costs'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime(),
    replicate_token: process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set',
    paystack_secret: process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set'
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`💳 Payment Enforcement: ${ENFORCE_PAYMENT ? '✅ Enabled' : '❌ Disabled (Testing)'}`);
  console.log(`🔑 Replicate Token: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});