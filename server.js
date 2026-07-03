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

// Payment enforcement - ALWAYS require payment
const ENFORCE_PAYMENT = true;

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('📡 Port:', PORT);
console.log('💳 Payment Enforcement:', ENFORCE_PAYMENT ? '✅ Enabled' : '❌ Disabled');
console.log('🔑 Paystack Secret:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set');
console.log('🔑 Replicate Token:', process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set');

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
// FEE CALCULATION SYSTEM
// ============================================

const BASE_COSTS = {
  replicate_stable_video: {
    baseCost: 5,
    perSecond: 0.5,
    defaultDuration: 5,
    minCost: 5,
    maxCost: 50,
    name: 'Stable Video Diffusion'
  },
  replicate_alternative: {
    baseCost: 3,
    perSecond: 0.3,
    defaultDuration: 5,
    minCost: 3,
    maxCost: 30,
    name: 'Alternative Model'
  },
  dreamina_720p: {
    baseCost: 15,
    perSecond: 1.5,
    defaultDuration: 5,
    minCost: 15,
    maxCost: 100,
    name: 'Dreamina 720p'
  },
  dreamina_1080p: {
    baseCost: 25,
    perSecond: 2.5,
    defaultDuration: 5,
    minCost: 25,
    maxCost: 150,
    name: 'Dreamina 1080p'
  },
  translation: {
    baseCost: 10,
    perMinute: 5,
    defaultDuration: 1,
    minCost: 10,
    maxCost: 100,
    name: 'Video Translation'
  },
  photos_to_video: {
    baseCost: 2,
    perPhoto: 1,
    minPhotos: 2,
    maxPhotos: 20,
    minCost: 4,
    maxCost: 30,
    name: 'Photos to Video'
  }
};

const MARKUP_MULTIPLIER = 10;

class FeeCalculator {
  static calculatePrice(serviceType, options = {}) {
    const config = BASE_COSTS[serviceType];
    if (!config) {
      throw new Error(`Unknown service type: ${serviceType}`);
    }

    let baseCost = 0;
    let breakdown = [];

    switch (serviceType) {
      case 'replicate_stable_video':
      case 'replicate_alternative':
      case 'dreamina_720p':
      case 'dreamina_1080p': {
        const duration = options.duration || config.defaultDuration;
        baseCost = config.baseCost + (config.perSecond * duration);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base fee', amount: config.baseCost },
          { item: `${duration}s video`, amount: config.perSecond * duration }
        ];
        break;
      }
      
      case 'translation': {
        const duration = options.duration || config.defaultDuration;
        baseCost = config.baseCost + (config.perMinute * duration);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base translation fee', amount: config.baseCost },
          { item: `${duration} minute(s)`, amount: config.perMinute * duration }
        ];
        break;
      }
      
      case 'photos_to_video': {
        const photoCount = options.photoCount || 0;
        if (photoCount < config.minPhotos) {
          throw new Error(`Minimum ${config.minPhotos} photos required`);
        }
        if (photoCount > config.maxPhotos) {
          throw new Error(`Maximum ${config.maxPhotos} photos allowed`);
        }
        
        baseCost = config.baseCost + (config.perPhoto * photoCount);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base slideshow fee', amount: config.baseCost },
          { item: `${photoCount} photo(s)`, amount: config.perPhoto * photoCount }
        ];
        break;
      }
      
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }

    const finalPrice = parseFloat((baseCost * MARKUP_MULTIPLIER).toFixed(2));
    const markupAmount = parseFloat((finalPrice - baseCost).toFixed(2));

    return {
      serviceType,
      serviceName: config.name,
      baseCost: parseFloat(baseCost.toFixed(2)),
      markupMultiplier: MARKUP_MULTIPLIER,
      markupAmount: markupAmount,
      finalPrice: finalPrice,
      breakdown: breakdown,
      currency: 'KES'
    };
  }

  static getServices() {
    const services = {};
    Object.keys(BASE_COSTS).forEach(key => {
      services[key] = {
        id: key,
        name: BASE_COSTS[key].name,
        baseCost: BASE_COSTS[key].baseCost,
        markupMultiplier: MARKUP_MULTIPLIER,
        estimatedPrice: BASE_COSTS[key].baseCost * MARKUP_MULTIPLIER
      };
    });
    return services;
  }
}

// ============================================
// MIDDLEWARE
// ============================================

app.use('/api/webhook/paystack', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: isProduction ? ['https://*.onrender.com', 'https://video-creator-frontend.onrender.com'] : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      cb(new Error('Invalid file type. Please upload a video file (MP4, AVI, MOV, WEBM).'), false);
    }
  }
});

// ============================================
// FEE CALCULATION ENDPOINTS
// ============================================

app.post('/api/calculate-price', (req, res) => {
  try {
    const { serviceType, options } = req.body;
    
    if (!serviceType) {
      throw new Error('Service type is required');
    }
    
    const priceData = FeeCalculator.calculatePrice(serviceType, options);
    
    res.json({
      success: true,
      price: priceData,
      formatted: `KES ${priceData.finalPrice.toFixed(2)}`
    });
    
  } catch (error) {
    console.error('❌ Price calculation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/service-costs', (req, res) => {
  try {
    const services = FeeCalculator.getServices();
    res.json({
      success: true,
      services: services,
      markupMultiplier: MARKUP_MULTIPLIER,
      currency: 'KES'
    });
  } catch (error) {
    console.error('❌ Error fetching service costs:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PAYMENT ENDPOINTS
// ============================================

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey || secretKey === 'sk_test_6c53bfef068f43daf82954302729b74fcf90ace0') {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Using test mode.');
      res.json({
        success: true,
        message: 'Test mode: Payment verified',
        data: { reference }
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

app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;
    
    if (!secret || secret === 'sk_test_6c53bfef068f43daf82954302729b74fcf90ace0') {
      console.log('⚠️ Webhook received but PAYSTACK_SECRET_KEY not set. Accepting in test mode.');
      console.log('📦 Webhook payload:', payload);
      res.sendStatus(200);
      return;
    }

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
// REPLICATE API ENDPOINT - With Payment Enforcement
// ============================================

app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference } = req.body;
    
    // ENFORCE PAYMENT - Check for payment reference
    if (ENFORCE_PAYMENT && !paymentReference) {
      console.log('❌ Payment required - No payment reference provided');
      return res.status(402).json({
        success: false,
        error: 'Payment required. Please complete payment first.',
        requiresPayment: true
      });
    }
    
    // Verify payment reference is valid
    if (ENFORCE_PAYMENT && paymentReference) {
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
    }
    
    console.log('📝 Generating video with prompt:', prompt.substring(0, 50) + '...');
    console.log('💳 Payment Reference:', paymentReference || 'Test Mode');
    
    const token = process.env.REPLICATE_API_TOKEN;
    
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }

    console.log('🔑 Using Replicate token:', token.substring(0, 10) + '...');

    // Try HappyHorse model first (cheaper and faster)
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
      console.error('❌ Replicate API Error:', errorData);
      
      if (response.status === 402) {
        throw new Error('Insufficient Replicate credits. Please add credits at https://replicate.com/account/billing');
      }
      throw new Error(`Replicate API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Prediction created:', data.id);

    // Poll for completion
    let prediction = data;
    let attempts = 0;
    const maxAttempts = 60;

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
      console.log(`⏳ Polling attempt ${attempts + 1}: Status = ${prediction.status}`);
      attempts++;
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Prediction failed');
    }

    if (prediction.status !== 'succeeded') {
      throw new Error('Timeout waiting for video generation');
    }

    console.log('✅ Video generated successfully!');
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
// DREAMINA-SEEDANCE-2.0 ENDPOINT - With Payment Enforcement
// ============================================

app.post('/api/generate-dreamina', async (req, res) => {
  try {
    const { prompt, duration, resolution, ratio, paymentReference } = req.body;
    
    // ENFORCE PAYMENT
    if (ENFORCE_PAYMENT && !paymentReference) {
      console.log('❌ Payment required - No payment reference provided');
      return res.status(402).json({
        success: false,
        error: 'Payment required. Please complete payment first.',
        requiresPayment: true
      });
    }
    
    if (ENFORCE_PAYMENT && paymentReference) {
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
    }
    
    const token = process.env.MODELARK_API_KEY;
    
    if (!token) {
      throw new Error('MODELARK_API_KEY not set in .env file.');
    }

    console.log('🎬 Generating video with Dreamina-Seedance-2.0...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

    const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
    const modelId = 'dreamina-seedance-2-0-260128';

    const createResponse = await fetch(`${endpoint}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: modelId,
        content: [
          {
            type: "text",
            text: prompt
          }
        ],
        parameters: {
          duration: duration || 5,
          resolution: resolution || "720p",
          ratio: ratio || "16:9",
          fps: 24
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('❌ Dreamina API Error:', errorData);
      
      if (createResponse.status === 401) {
        throw new Error('Invalid API key. Please check your MODELARK_API_KEY in .env');
      }
      if (createResponse.status === 404) {
        throw new Error('Model not activated. Please activate Dreamina-Seedance-2.0 in ModelArk Console first.');
      }
      throw new Error(`Dreamina API returned ${createResponse.status}: ${errorData}`);
    }

    const taskData = await createResponse.json();
    const taskId = taskData.id;
    console.log('✅ Task created:', taskId);

    let result = taskData;
    let attempts = 0;
    const maxAttempts = 60;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`${endpoint}/contents/generations/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }
      
      result = await pollResponse.json();
      attempts++;
      console.log(`⏳ Polling attempt ${attempts}: Status = ${result.status}`);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Video generation failed');
    }

    if (result.status !== 'succeeded') {
      throw new Error('Timeout waiting for video generation');
    }

    const videoUrl = result.content?.video_url || result.output?.video_url || result.video_url;
    
    if (!videoUrl) {
      throw new Error('No video URL found in response');
    }

    console.log('✅ Video generated successfully!');
    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: 'Dreamina-Seedance-2.0',
      metadata: {
        duration: result.duration || duration || 5,
        resolution: result.resolution || resolution || '720p',
        taskId: taskId
      }
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-dreamina:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// VIDEO TRANSLATION ENDPOINTS (FREE)
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
  'mr': 'Marathi', 'or': 'Odia', 'pl': 'Polish', 'uk': 'Ukrainian',
  'ro': 'Romanian', 'nl': 'Dutch', 'el': 'Greek', 'cs': 'Czech',
  'sv': 'Swedish', 'hu': 'Hungarian', 'fi': 'Finnish', 'da': 'Danish',
  'no': 'Norwegian', 'he': 'Hebrew', 'fa': 'Persian', 'tr': 'Turkish'
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
// TEST & UTILITY ENDPOINTS
// ============================================

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    paymentEnforced: ENFORCE_PAYMENT ? '✅ Yes' : '❌ No',
    endpoints: [
      '/api/test', '/api/health',
      '/api/generate-video (Replicate - HappyHorse)',
      '/api/generate-dreamina (Dreamina-Seedance-2.0)',
      '/api/upload-video (Upload)',
      '/api/translate-text (Translation)',
      '/api/free-languages (Languages)',
      '/api/calculate-price (Price Calculator)',
      '/api/service-costs (Service Costs)',
      '/api/verify-payment (Payment Verification)',
      '/api/webhook/paystack (Paystack Webhook)'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime(),
    paymentEnforced: ENFORCE_PAYMENT ? '✅ Yes' : '❌ No',
    replicate_token: process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set',
    modelark_token: process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set',
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
  console.log(`💳 Payment Enforcement: ${ENFORCE_PAYMENT ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`🔑 Paystack Secret: ${process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`🔑 Replicate Token: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});