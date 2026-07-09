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

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('🔑 Replicate Token:', process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set');
console.log('🔑 Paystack Secret:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set');
console.log('💳 Payment Enforcement: Enabled (No Test Mode)');

// ============================================
// PAYMENT VERIFICATION FUNCTION
// ============================================

async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    
    // Check if we're using live keys
    const isLive = secretKey && secretKey.startsWith('sk_live_');
    
    console.log('🔍 Verifying payment:', {
      reference,
      isLive: isLive ? 'LIVE' : 'Test'
    });

    if (!secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set.');
      return false;
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
    
    const isSuccessful = data.status && data.data?.status === 'success';
    
    if (isSuccessful) {
      console.log('✅ Payment verified successfully for reference:', reference);
    } else {
      console.log('❌ Payment verification failed for reference:', reference);
    }
    
    return isSuccessful;
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

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
// PRICE CALCULATION ENDPOINT
// ============================================
app.post('/api/calculate-price', (req, res) => {
  try {
    console.log('💰 Price calculation request received');
    console.log('📦 Request body:', req.body);

    const { serviceType, options } = req.body;

    // Default values
    const duration = options?.duration || 5;
    const photoCount = options?.photoCount || 0;

    let baseCost = 0;
    let breakdown = [];
    let serviceName = 'HappyHorse Video';

    if (serviceType === 'photos_to_video') {
      const baseFee = 10;
      const perPhoto = 2;
      baseCost = baseFee + (photoCount * perPhoto);
      breakdown = [
        { item: 'Base slideshow fee', amount: baseFee },
        { item: `${photoCount} photo(s)`, amount: photoCount * perPhoto }
      ];
      serviceName = 'Photos to Video';
    } else {
      const baseFee = 10;
      const perSecond = 2;
      baseCost = baseFee + (duration * perSecond);
      breakdown = [
        { item: 'AI Video Generation', amount: baseFee },
        { item: `${duration}s video processing`, amount: duration * perSecond },
        { item: 'HD Quality', amount: 0 }
      ];
      serviceName = 'HappyHorse Video';
    }

    // Apply 10x markup
    const markupMultiplier = 10;
    const finalPrice = baseCost * markupMultiplier;
    const markupAmount = baseCost * (markupMultiplier - 1);

    const priceData = {
      serviceType: serviceType || 'replicate',
      serviceName: serviceName,
      baseCost: baseCost,
      markupMultiplier: markupMultiplier,
      markupAmount: markupAmount,
      finalPrice: finalPrice,
      breakdown: breakdown,
      currency: 'KES'
    };

    console.log('✅ Price calculated:', priceData);

    res.json({
      success: true,
      price: priceData,
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
// PAYMENT ENDPOINTS
// ============================================

// Verify payment with Paystack
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // Check if we're using live keys
    const isLive = secretKey && secretKey.startsWith('sk_live_');

    console.log('🔑 Payment verification:', {
      reference,
      email,
      amount,
      isLive: isLive ? 'LIVE' : 'Test'
    });

    if (!secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set.');
      res.json({
        success: false,
        error: 'Paystack secret key not configured'
      });
      return;
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    console.log('📦 Paystack verification response:', data);

    if (data.status && data.data.status === 'success') {
      console.log(`✅ Payment successful for ${email}: KES ${amount}`);

      res.json({
        success: true,
        data: data.data,
        message: 'Payment verified successfully'
      });
    } else {
      res.json({
        success: false,
        error: data.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Paystack Webhook endpoint
app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;

    console.log('📦 Webhook received');

    if (!secret) {
      console.log('⚠️ Webhook received but PAYSTACK_SECRET_KEY not set.');
      res.sendStatus(200);
      return;
    }

    // Verify signature for security
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = payload;

    if (event.event === 'charge.success') {
      const transaction = event.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);
      
      res.sendStatus(200);
    } else if (event.event === 'charge.failed') {
      console.log(`❌ Payment failed for reference: ${event.data.reference}`);
      res.sendStatus(200);
    } else {
      console.log(`⚡ Event received: ${event.event}`);
      res.sendStatus(200);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
});

// ============================================
// GENERATE VIDEO WITH REPLICATE - HAPPYHORSE
// ============================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference } = req.body;

    // ALWAYS ENFORCE PAYMENT - No test mode
    if (!paymentReference) {
      console.log('❌ Payment required - No payment reference provided');
      return res.status(402).json({
        success: false,
        error: 'Payment required. Please complete payment first.',
        requiresPayment: true
      });
    }

    // Always verify payment reference
    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      console.log('❌ Invalid or expired payment:', paymentReference);
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment. Please make a new payment.',
        requiresPayment: true
      });
    }
    console.log('✅ Payment verified:', paymentReference);

    console.log('🎬 Generating video with Replicate HappyHorse...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('💳 Payment Reference:', paymentReference);

    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }

    console.log('🔑 Using Replicate token:', token.substring(0, 10) + '...');

    // Create prediction with HappyHorse
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
    paymentEnforced: '✅ Yes (No Test Mode)',
    endpoints: [
      '/api/test',
      '/api/health',
      '/api/generate-video (Replicate - HappyHorse)',
      '/api/calculate-price',
      '/api/free-languages',
      '/api/verify-payment',
      '/api/webhook/paystack'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime(),
    paymentEnforced: 'Yes (No Test Mode)',
    replicate_token: process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set',
    paystack_secret: process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set'
  });
});

// ============================================
// ROOT ENDPOINT - API INFO
// ============================================
app.get('/', (req, res) => {
  res.json({
    name: 'Video Creator API',
    version: '1.0.0',
    status: 'running',
    environment: isProduction ? 'production' : 'development',
    paymentEnforced: 'Yes - All requests require payment',
    endpoints: [
      { path: '/api/test', method: 'GET', description: 'Test endpoint' },
      { path: '/api/health', method: 'GET', description: 'Health check' },
      { path: '/api/generate-video', method: 'POST', description: 'Generate video with Replicate (Payment Required)' },
      { path: '/api/calculate-price', method: 'POST', description: 'Calculate video price' },
      { path: '/api/free-languages', method: 'GET', description: 'Get supported languages' },
      { path: '/api/verify-payment', method: 'POST', description: 'Verify payment' },
      { path: '/api/webhook/paystack', method: 'POST', description: 'Paystack webhook' }
    ],
    docs: 'https://github.com/katunguTECH/video-creator-api'
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION (Conditional)
// ============================================
const buildPath = path.join(__dirname, 'build');
if (isProduction && fs.existsSync(buildPath)) {
  console.log('📁 Serving frontend from build folder');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('ℹ️ Build folder not found - API only mode');
}

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Check /api/test for available endpoints'
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
  console.log(`💳 Payment Enforcement: Enabled (No Test Mode)`);
  console.log(`🔑 Replicate Token: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`🔑 Paystack Secret: ${process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`📁 Build folder exists: ${fs.existsSync(path.join(__dirname, 'build')) ? '✅ Yes' : '❌ No'}`);
});