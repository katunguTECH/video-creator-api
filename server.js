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
console.log('📡 Port:', PORT);
console.log('🔑 Paystack Secret:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set');

// ============================================
// MIDDLEWARE
// ============================================

// Special middleware for webhooks (raw body needed for signature verification)
app.use('/api/webhook/paystack', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: isProduction ? ['https://*.onrender.com', 'https://video-creator-frontend.onrender.com'] : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests for debugging
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
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
// PAYMENT ENDPOINTS
// ============================================

// Verify payment with Paystack
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Using test mode.');
      // In test mode, accept any reference
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

// Paystack Webhook endpoint
app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;
    
    // For test mode without secret, accept all webhooks
    if (!secret) {
      console.log('⚠️ Webhook received but PAYSTACK_SECRET_KEY not set. Accepting in test mode.');
      console.log('📦 Webhook payload:', payload);
      res.sendStatus(200);
      return;
    }

    // Verify signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = payload;

    // Handle successful transaction
    if (event.event === 'charge.success') {
      const transaction = event.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);
      
      // Store the transaction in your database
      // Example: await savePaymentToDatabase(transaction);
      
      // Unlock the video generation for this user
      // You can store the reference to validate future requests
      
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

// Get transaction status
app.get('/api/payment-status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      res.json({
        success: true,
        status: 'success',
        message: 'Test mode: Payment successful'
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
    res.json({
      success: data.status,
      status: data.data?.status || 'unknown',
      data: data.data
    });
  } catch (error) {
    console.error('❌ Error fetching payment status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// REPLICATE API ENDPOINTS
// ============================================

// Replicate API endpoint - Primary Model
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference } = req.body;
    
    // Verify payment (skip if in test mode)
    if (process.env.PAYSTACK_SECRET_KEY && !paymentReference) {
      throw new Error('Payment required. Please complete payment first.');
    }
    
    const token = process.env.REPLICATE_API_TOKEN;
    
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }
    
    console.log('📝 Generating video with prompt:', prompt.substring(0, 50) + '...');
    console.log('💳 Payment Reference:', paymentReference || 'Test Mode');
    console.log('🔑 Using token:', token.substring(0, 10) + '...');

    // Create prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "replicategithubwc/stable-video-diffusion:70343051073a378b2f2f6f7f3ae9c8102e9f24437ad8caa76ed47f697dd3420d",
        input: {
          fps: 24,
          width: 1024,
          height: 576,
          prompt: prompt,
          scheduler: "K_EULER_ANCESTRAL",
          num_frames: 24,
          guidance_scale: 12.5,
          negative_prompt: "very blue, dust, noisy, washed out, ugly, distorted, broken",
          num_inference_steps: 50
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ API Error:', errorData);
      
      if (response.status === 402) {
        throw new Error('Insufficient credits. Please add credits at https://replicate.com/account/billing');
      }
      throw new Error(`API returned ${response.status}: ${errorData}`);
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
      usedModel: 'Replicate Stable Video Diffusion'
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-video:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Replicate API endpoint - Alternative Model
app.post('/api/generate-video-alt', async (req, res) => {
  try {
    const { prompt, paymentReference } = req.body;
    
    // Verify payment (skip if in test mode)
    if (process.env.PAYSTACK_SECRET_KEY && !paymentReference) {
      throw new Error('Payment required. Please complete payment first.');
    }
    
    const token = process.env.REPLICATE_API_TOKEN;
    
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }
    
    console.log('📝 Generating with alternative model...');
    console.log('💳 Payment Reference:', paymentReference || 'Test Mode');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "lightweight-ai/vmodel8_0:latest",
        input: {
          prompt: prompt,
          width: 1024,
          height: 576,
          num_frames: 30,
          fps: 24,
          seed: Math.floor(Math.random() * 1000000)
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ API Error:', errorData);
      
      if (response.status === 402) {
        throw new Error('Insufficient credits. Please add credits at https://replicate.com/account/billing');
      }
      throw new Error(`API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Alternative prediction created:', data.id);

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

    console.log('✅ Alternative video generated successfully!');
    res.json({
      success: true,
      videoUrl: prediction.output,
      usedModel: 'Replicate Alternative Model'
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-video-alt:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// DREAMINA-SEEDANCE-2.0 ENDPOINT
// ============================================

app.post('/api/generate-dreamina', async (req, res) => {
  try {
    const { prompt, duration, resolution, ratio, paymentReference } = req.body;
    
    // Verify payment (skip if in test mode)
    if (process.env.PAYSTACK_SECRET_KEY && !paymentReference) {
      throw new Error('Payment required. Please complete payment first.');
    }
    
    const token = process.env.MODELARK_API_KEY;
    
    if (!token) {
      throw new Error('MODELARK_API_KEY not set in .env file. Please add your ModelArk API key.');
    }

    console.log('🎬 Generating video with Dreamina-Seedance-2.0...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('💳 Payment Reference:', paymentReference || 'Test Mode');

    const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
    const modelId = 'dreamina-seedance-2-0-260128';

    // Create the generation task
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

    // Poll for completion
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
      
      if (result.progress) {
        console.log(`⏳ Progress: ${result.progress}%`);
      }
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
    console.log('📹 Video URL:', videoUrl);

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

// Supported languages for free translation
const FREE_TRANSLATION_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'ur': 'Urdu',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Tagalog',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'sw': 'Swahili',
  'ha': 'Hausa',
  'yo': 'Yoruba',
  'ig': 'Igbo',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'am': 'Amharic',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'pa': 'Punjabi',
  'gu': 'Gujarati',
  'mr': 'Marathi',
  'or': 'Odia',
  'pl': 'Polish',
  'uk': 'Ukrainian',
  'ro': 'Romanian',
  'nl': 'Dutch',
  'el': 'Greek',
  'cs': 'Czech',
  'sv': 'Swedish',
  'hu': 'Hungarian',
  'fi': 'Finnish',
  'da': 'Danish',
  'no': 'Norwegian',
  'he': 'Hebrew',
  'fa': 'Persian',
  'tr': 'Turkish',
  'km': 'Khmer',
  'lo': 'Lao',
  'my': 'Burmese',
  'mn': 'Mongolian',
  'ka': 'Georgian',
  'hy': 'Armenian',
  'az': 'Azerbaijani',
  'uz': 'Uzbek',
  'kk': 'Kazakh',
  'ky': 'Kyrgyz',
  'tg': 'Tajik',
  'tk': 'Turkmen',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'bs': 'Bosnian',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'mk': 'Macedonian',
  'sq': 'Albanian',
  'mt': 'Maltese',
  'is': 'Icelandic',
  'ga': 'Irish',
  'cy': 'Welsh',
  'eo': 'Esperanto',
  'la': 'Latin'
};

// Get available languages
app.get('/api/free-languages', (req, res) => {
  res.json({
    success: true,
    languages: FREE_TRANSLATION_LANGUAGES,
    note: 'Free translation uses LibreTranslate. For voice cloning, consider a paid API.'
  });
});

// Upload video endpoint
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No video file uploaded');
    }
    
    const videoPath = req.file.path;
    const videoUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ Video uploaded:', videoPath);
    console.log('📹 Video URL:', videoUrl);
    
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

// ============================================
// TRANSLATION ENDPOINT - LIBRETRANSLATE FIRST
// ============================================

app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    
    if (!text) {
      throw new Error('Text is required');
    }
    
    if (!targetLanguage || !FREE_TRANSLATION_LANGUAGES[targetLanguage]) {
      throw new Error(`Target language not supported. Available: ${Object.keys(FREE_TRANSLATION_LANGUAGES).join(', ')}`);
    }
    
    console.log('🌐 Translating text...');
    console.log('📝 Text:', text.substring(0, 50) + '...');
    console.log('🎯 Target:', targetLanguage, '(', FREE_TRANSLATION_LANGUAGES[targetLanguage], ')');
    
    // METHOD 1: Try LibreTranslate FIRST
    console.log('🔄 Trying LibreTranslate (free, no API key)...');
    
    const servers = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com'
    ];
    
    for (const server of servers) {
      try {
        console.log(`   Trying ${server}...`);
        
        const response = await fetch(`${server}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
            console.log(`✅ LibreTranslate (${server}) successful!`);
            res.json({
              success: true,
              originalText: text,
              translatedText: data.translatedText,
              targetLanguage: targetLanguage,
              sourceLanguage: sourceLanguage || 'en',
              usedModel: 'LibreTranslate (Free)',
              server: server
            });
            return;
          }
        }
      } catch (error) {
        console.log(`   ❌ ${server} failed:`, error.message);
        continue;
      }
    }
    
    // METHOD 2: Try Hugging Face
    const hfToken = process.env.HF_TOKEN;
    
    if (hfToken && hfToken !== 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
      try {
        console.log('🔄 Trying Hugging Face...');
        
        const modelMap = {
          'en-es': 'Helsinki-NLP/opus-mt-en-es',
          'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
          'en-de': 'Helsinki-NLP/opus-mt-en-de',
          'en-zh': 'Helsinki-NLP/opus-mt-en-zh',
          'en-ja': 'Helsinki-NLP/opus-mt-en-ja',
          'en-ar': 'Helsinki-NLP/opus-mt-en-ar',
          'en-sw': 'Helsinki-NLP/opus-mt-en-sw',
        };
        
        const source = sourceLanguage || 'en';
        const modelKey = `${source}-${targetLanguage}`;
        let model = modelMap[modelKey];
        
        if (!model) {
          model = 'Helsinki-NLP/opus-mt-mul-en';
        }
        
        console.log('📦 Using model:', model);
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: text,
            parameters: {
              max_length: 512
            }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const translatedText = data[0]?.translation_text || data[0] || data;
          
          console.log('✅ Hugging Face translation successful!');
          res.json({
            success: true,
            originalText: text,
            translatedText: translatedText,
            targetLanguage: targetLanguage,
            sourceLanguage: source,
            usedModel: 'Hugging Face (Free)'
          });
          return;
        }
      } catch (hfError) {
        console.log('❌ Hugging Face error:', hfError.message);
      }
    }
    
    // METHOD 3: Manual Translation Map
    console.log('🔄 Trying manual translation map...');
    
    const manualTranslations = {
      'en': {
        'sw': {
          'Welcome to DukaApp!': 'Karibu DukaApp!',
          'Get loans based on your sales.': 'Pata mikopo kulingana na mauzo yako.',
          'Start today with a 14-day free trial.': 'Anza leo na jaribio la bure la siku 14.',
          'You qualify for loans based on your sales!': 'Unastahiki mikopo kulingana na mauzo yako!',
          'wanna get loans? visit us at DukaApp.online': 'Unataka mikopo? tembelea DukaApp.online',
          'Qualify only with your sales': 'Sifa tu kwa mauzo yako',
          'START TODAY': 'ANZA LEO',
          '14-DAY FREE TRIAL': 'JARIBIO LA BURE LA SIKU 14'
        },
        'yo': {
          'Welcome to DukaApp!': 'Kaabọ si DukaApp!',
          'Get loans based on your sales.': 'Gba awin ti o da lori awọn tita rẹ.',
          'Start today with a 14-day free trial.': 'Bẹrẹ loni pẹlu idanwo ọfẹ ọjọ 14.'
        },
        'ha': {
          'Welcome to DukaApp!': 'Barka da zuwa DukaApp!',
          'Get loans based on your sales.': 'Sami lamuni bisa ga tallace-tallacen ku.',
          'Start today with a 14-day free trial.': 'Fara yau da gwaji kyauta na kwanaki 14.'
        }
      }
    };
    
    const source = sourceLanguage || 'en';
    const sourceMap = manualTranslations[source];
    if (sourceMap && sourceMap[targetLanguage]) {
      let translation = sourceMap[targetLanguage][text];
      if (translation) {
        console.log('✅ Manual translation found!');
        res.json({
          success: true,
          originalText: text,
          translatedText: translation,
          targetLanguage: targetLanguage,
          sourceLanguage: source,
          usedModel: 'Manual Translation Map'
        });
        return;
      }
    }
    
    // METHOD 4: Simulated Translation
    console.log('⚠️ Using simulated translation...');
    
    const languageNames = {
      'sw': 'Swahili',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'yo': 'Yoruba',
      'ha': 'Hausa',
      'ig': 'Igbo',
      'zu': 'Zulu'
    };
    
    res.json({
      success: true,
      originalText: text,
      translatedText: `[${languageNames[targetLanguage] || targetLanguage}] ${text}`,
      targetLanguage: targetLanguage,
      sourceLanguage: sourceLanguage || 'en',
      usedModel: 'Simulated Translation (Fallback)',
      note: 'LibreTranslate unavailable. Using simulated translation.'
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
// FREE VIDEO TRANSLATION (SUBTITLES)
// ============================================

app.post('/api/translate-video-free', async (req, res) => {
  try {
    const { videoPath, targetLanguage, sourceLanguage, text } = req.body;
    
    if (!videoPath && !text) {
      throw new Error('Video path or text is required');
    }
    
    console.log('🎬 Translating video (FREE method)...');
    console.log('🔤 Target language:', targetLanguage);
    
    if (text) {
      const translateResponse = await fetch(`http://localhost:${PORT}/api/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage || 'en'
        })
      });
      
      const translateData = await translateResponse.json();
      
      if (translateData.success) {
        res.json({
          success: true,
          originalText: text,
          translatedText: translateData.translatedText,
          targetLanguage: targetLanguage,
          usedModel: translateData.usedModel,
          note: 'Text translated successfully. For video, upload a video file.'
        });
        return;
      }
    }
    
    if (videoPath) {
      console.log('📹 Processing video for subtitles...');
      
      const outputDir = path.join(__dirname, 'uploads', 'translated');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const subtitlePath = path.join(outputDir, `subtitles-${Date.now()}.srt`);
      const languageName = FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage;
      
      const subtitleContent = `1
00:00:00,000 --> 00:00:05,000
[Translated to ${languageName}]
This video has been translated using the free subtitle method.

2
00:00:05,000 --> 00:00:10,000
Original audio is preserved.
Subtitles are displayed in the target language.

3
00:00:10,000 --> 00:00:15,000
For full voice translation with lip-sync,
please consider a paid API.`;
      
      fs.writeFileSync(subtitlePath, subtitleContent);
      
      const videoUrl = videoPath.replace(/\\/g, '/');
      
      res.json({
        success: true,
        translatedVideoUrl: videoUrl,
        subtitleUrl: `/uploads/translated/${path.basename(subtitlePath)}`,
        targetLanguage: targetLanguage,
        usedModel: 'Free Subtitle Translation',
        note: 'Subtitles generated. Use FFmpeg to embed subtitles for a complete solution.'
      });
      return;
    }
    
    throw new Error('No valid input provided');
    
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================

if (isProduction) {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// ============================================
// TEST & UTILITY ENDPOINTS
// ============================================

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    endpoints: [
      '/api/test',
      '/api/health',
      '/api/generate-video (Replicate)',
      '/api/generate-video-alt (Replicate Alternative)',
      '/api/generate-dreamina (Dreamina-Seedance-2.0)',
      '/api/upload-video (Upload)',
      '/api/translate-text (Translation with Fallbacks)',
      '/api/translate-video-free (Free Video Translation)',
      '/api/free-languages (Languages)',
      '/api/verify-payment (Payment Verification)',
      '/api/webhook/paystack (Paystack Webhook)',
      '/api/payment-status/:reference (Payment Status)'
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
    modelark_token: process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set',
    hf_token: process.env.HF_TOKEN ? '✅ Set' : '❌ Not set',
    paystack_secret: process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set',
    upload_dir: fs.existsSync(path.join(__dirname, 'uploads')) ? '✅ Exists' : '❌ Missing'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available: [
      '/api/test',
      '/api/health',
      '/api/generate-video',
      '/api/generate-video-alt',
      '/api/generate-dreamina',
      '/api/upload-video',
      '/api/translate-text',
      '/api/translate-video-free',
      '/api/free-languages',
      '/api/verify-payment',
      '/api/webhook/paystack',
      '/api/payment-status/:reference'
    ]
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
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📡 Test: http://0.0.0.0:${PORT}/api/test`);
  console.log(`🔑 Paystack Secret: ${process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});