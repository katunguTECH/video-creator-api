// ============================================
// LOAD ENVIRONMENT VARIABLES
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mailgun = require('mailgun-js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const supabaseUrl = process.env.SUPABASE_URL || 'https://ocllfaqgqbpqiszkghcj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbGxmYXFncWJwcWlzemtnaGNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE0NjI5OSwiZXhwIjoyMTAxNzIyMjk5fQ.uBMUxzomxE18alp1zyqd8filjet1oth_bzwZrELXq8o';

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Service Key:', supabaseServiceKey ? '✅ Configured' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
        transport: WebSocket
    }
});

// ============================================
// IN-MEMORY FALLBACK STORAGE
// ============================================
const memoryStore = {
    coupons: {},
    payments: [],
    revenues: [],
    videoUsages: [],
    activityLogs: [],
    translations: [],
    siteVisits: []
};

// ============================================
// TEST SUPABASE CONNECTION ENDPOINT
// ============================================
app.get('/api/test-supabase', async (req, res) => {
    try {
        const { data, error, count } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: '✅ Supabase connected successfully!',
            paymentCount: count || 0
        });
    } catch (error) {
        console.error('❌ Supabase test error:', error.message);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ✅ PRE-CREATE TEST COUPONS
// ============================================
const TEST_COUPON = 'REDO-KATUNGU-001';
memoryStore.coupons[TEST_COUPON] = {
  code: TEST_COUPON,
  paymentReference: 'MANUAL-PAYMENT-001',
  email: 'katungu1@gmail.com',
  serviceType: 'photo-to-video',
  used: false,
  usedAt: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString()
};
console.log(`✅ Test coupon created: ${TEST_COUPON} for katungu1@gmail.com`);

const GENERIC_COUPON = 'REDO-TEST-001';
memoryStore.coupons[GENERIC_COUPON] = {
  code: GENERIC_COUPON,
  paymentReference: 'MANUAL-PAYMENT-002',
  email: 'test@example.com',
  serviceType: 'photo-to-video',
  used: false,
  usedAt: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString()
};
console.log(`✅ Generic test coupon created: ${GENERIC_COUPON}`);

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary env vars not fully set');
} else {
  console.log('☁️ Cloudinary configured successfully!');
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);
}

// ============================================
// TEST CLOUDINARY ENDPOINT
// ============================================
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      resource_type: 'video',
      max_results: 1
    });
    res.json({
      success: true,
      message: 'Cloudinary is working',
      resources: result.resources?.length || 0
    });
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GOOGLE CLOUD CONFIGURATION
// ============================================

const googleApiKey = process.env.GOOGLE_API_KEY;
console.log('🔑 Google API Key configured:', googleApiKey ? '✅' : '❌');

async function translateText(text, targetLanguage) {
  try {
    if (!googleApiKey) {
      console.warn('⚠️ No Google API key found, using fallback');
      const languageMap = { 'fr': 'French', 'es': 'Spanish', 'sw': 'Swahili', 'en': 'English' };
      return `[Translated to ${languageMap[targetLanguage] || targetLanguage}] ${text}`;
    }

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      null,
      {
        params: {
          q: text,
          target: targetLanguage,
          key: googleApiKey,
          format: 'text'
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.translations?.length > 0) {
      const translation = response.data.data.translations[0].translatedText;
      console.log('✅ Translation complete');
      return translation;
    }
    throw new Error('No translation returned');
  } catch (error) {
    console.error('❌ Translation API error:', error.message);
    const languageMap = { 'fr': 'French', 'es': 'Spanish', 'sw': 'Swahili', 'en': 'English' };
    return `[Translated to ${languageMap[targetLanguage] || targetLanguage}] ${text}`;
  }
}

// ============================================
// TEXT-TO-SPEECH
// ============================================
async function textToSpeech(text, targetLanguage, speakingRate = 1.0, voiceGender = 'MALE') {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not configured for text-to-speech');
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const voiceMap = {
      'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'it': 'it-IT',
      'pt': 'pt-PT', 'ru': 'ru-RU', 'ja': 'ja-JP', 'ko': 'ko-KR',
      'zh': 'cmn-CN', 'ar': 'ar-XA', 'hi': 'hi-IN', 'sw': 'sw-KE',
      'en': 'en-US'
    };
    const languageCode = voiceMap[targetLanguage] || 'en-US';

    const clampedRate = Math.min(Math.max(speakingRate, 0.25), 4.0);

    const requestBody = {
      input: { text: text },
      voice: {
        languageCode: languageCode,
        ssmlGender: voiceGender.toUpperCase()
      },
      audioConfig: { audioEncoding: 'MP3', speakingRate: clampedRate }
    };

    console.log(`🔊 Calling TTS API for language: ${targetLanguage} (${languageCode}), Gender: ${voiceGender}, rate: ${clampedRate}`);

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data && response.data.audioContent) {
      console.log(`✅ TTS API call successful (${response.data.audioContent.length} bytes)`);
      return Buffer.from(response.data.audioContent, 'base64');
    }
    throw new Error('No audio content returned');
  } catch (error) {
    console.error('❌ TTS error:', error.response?.data?.error?.message || error.message);
    throw new Error(`TTS failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// GROQ CONFIGURATION
// ============================================

let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key') {
  try {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log('✅ Groq client initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Groq:', error.message);
  }
} else {
  console.warn('⚠️ GROQ_API_KEY not set. Transcription will use fallback.');
}

// ============================================
// SCRIPT DERIVATION FOR AUDIO NARRATION
// ============================================
async function deriveScriptFromPrompt(visualPrompt, durationSeconds) {
  if (!groq) {
    throw new Error('Groq not configured, cannot auto-derive script');
  }

  const wordBudget = Math.floor(durationSeconds * 2.3);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You write short spoken narration scripts for AI-generated videos.
Given a visual description, write what the person in the video would plausibly be saying.
Rules:
- Output ONLY the spoken words, no stage directions, no quotes, no formatting.
- Maximum ${wordBudget} words. Shorter is fine.
- Match tone to the visual description (e.g. political rally = rousing, casual photo = natural speech).
- First person, as if the subject in the photo is speaking.`
      },
      { role: 'user', content: `Visual description: "${visualPrompt}"` }
    ],
    max_tokens: 200,
    temperature: 0.7
  });

  const script = completion.choices?.[0]?.message?.content?.trim();
  if (!script) throw new Error('Groq returned no script text');
  return script;
}

// ============================================
// FFMPEG CONFIGURATION
// ============================================

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('✅ FFmpeg configured');

// Font used for Brand Video text overlays (drawtext).
// Place a real .ttf file at fonts/OpenSans-Bold.ttf in the repo root.
const FONT_PATH = path.join(__dirname, 'fonts', 'OpenSans-Bold.ttf');
if (fs.existsSync(FONT_PATH)) {
  console.log('✅ Brand video font found:', FONT_PATH);
} else {
  console.warn('⚠️ Brand video font missing at', FONT_PATH, '- text overlays will fall back to the system default font');
}

// ============================================
// REPLICATE TOKEN VALIDATION (STARTUP)
// ============================================
async function validateReplicateTokenAtStartup() {
  const rawToken = process.env.REPLICATE_API_TOKEN || '';
  const token = rawToken.trim();

  if (!token) {
    console.warn('⚠️ REPLICATE_API_TOKEN not set');
    return;
  }

  try {
    const res = await fetch('https://api.replicate.com/v1/account', {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (res.status === 401) {
      console.error('❌ REPLICATE_API_TOKEN is INVALID or EXPIRED');
      return;
    }

    if (!res.ok) {
      console.warn(`⚠️ Replicate token check returned unexpected status ${res.status}`);
      return;
    }

    const account = await res.json();
    console.log(`✅ Replicate token verified at startup (account: ${account.username || account.name || 'unknown'})`);
  } catch (error) {
    console.warn('⚠️ Could not verify Replicate token at startup:', error.message);
  }
}

validateReplicateTokenAtStartup();

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = [
  'https://www.katareel.com',
  'https://katareel.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://video-creator-api-kjzy.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

// ============================================
// FALLBACK CORS MIDDLEWARE
// ============================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.katareel.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// RECORD SITE VISIT FUNCTION
// ============================================
async function recordSiteVisit(page, ip, userAgent) {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('site_visits')
                .insert({
                    page: page || '/',
                    ip: ip || 'unknown',
                    user_agent: userAgent || 'unknown'
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Site visit recorded:', page);
            return data;
        }
        
        if (!memoryStore.siteVisits) {
            memoryStore.siteVisits = [];
        }
        memoryStore.siteVisits.push({
            page: page || '/',
            ip: ip || 'unknown',
            userAgent: userAgent || 'unknown',
            createdAt: new Date().toISOString()
        });
        return 'memory-' + Date.now();
    } catch (error) {
        console.error('❌ Error recording site visit:', error.message);
        return null;
    }
}

app.use(async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);

  const isPageRequest =
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/static') &&
    !req.path.startsWith('/uploads') &&
    !req.path.includes('.') &&
    req.path !== '/manifest.json';

  if (isPageRequest) {
    const ip =
      req.headers['x-forwarded-for'] ||
      req.ip ||
      req.connection.remoteAddress;

    recordSiteVisit(
      req.path,
      ip,
      req.headers['user-agent']
    ).catch(error => {
      console.error('❌ Analytics error:', error.message);
    });
  }

  next();
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// ============================================
// CREATE TEMP DIRECTORY FOR VIDEO PROCESSING
// ============================================

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('📁 Temp directory created:', tempDir);
}

// ============================================
// EMAIL CONFIGURATION - Mailgun
// ============================================

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'katareel.com';

let mg = null;
let emailProvider = 'none';

if (MAILGUN_API_KEY && MAILGUN_API_KEY !== 'your_mailgun_api_key') {
  try {
    mg = mailgun({
      apiKey: MAILGUN_API_KEY,
      domain: MAILGUN_DOMAIN,
      host: 'api.mailgun.net'
    });
    emailProvider = 'mailgun';
    console.log('📧 Mailgun configured successfully!');
    console.log(`   Domain: ${MAILGUN_DOMAIN}`);
    console.log(`   From: VidAI Creator <noreply@${MAILGUN_DOMAIN}>`);
  } catch (error) {
    console.error('❌ Mailgun configuration error:', error.message);
  }
}

let transporter = null;
if (!mg) {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

  if (EMAIL_USER && EMAIL_PASSWORD && EMAIL_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    emailProvider = 'gmail';
    console.log('📧 Gmail configured as fallback!');
  } else {
    console.warn('⚠️ No email provider configured. Email sending will be disabled.');
  }
}

async function sendEmail(to, subject, html, text) {
  const fromEmail = process.env.EMAIL_FROM || `noreply@${MAILGUN_DOMAIN}`;
  const fromName = 'VidAI Creator';

  console.log(`📧 Sending email to ${to} via ${emailProvider.toUpperCase()}`);

  if (emailProvider === 'none') {
    const msg = 'No email provider configured on the server';
    console.error(`❌ ${msg}`);
    return { success: false, provider: 'none', error: msg };
  }

  let lastError = null;

  if (emailProvider === 'mailgun' && mg) {
    try {
      const data = {
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const result = await new Promise((resolve, reject) => {
        mg.messages().send(data, (error, body) => {
          if (error) reject(error);
          else resolve(body);
        });
      });

      console.log(`✅ Email sent via Mailgun to ${to}`);
      return { success: true, provider: 'mailgun', id: result.id };
    } catch (error) {
      console.error('❌ Mailgun error:', error.message);
      lastError = `Mailgun error: ${error.message}`;
    }
  }

  if (emailProvider === 'gmail' && transporter) {
    try {
      const mailOptions = {
        from: `${fromName} <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent via Gmail to ${to}`);
      return { success: true, provider: 'gmail', id: info.messageId };
    } catch (error) {
      console.error('❌ Gmail error:', error.message);
      lastError = `Gmail error: ${error.message}`;
    }
  }

  console.error(`❌ Failed to send email to ${to}: ${lastError || 'unknown error'}`);
  return { success: false, provider: emailProvider, error: lastError || 'No email provider available' };
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generatePaymentReceiptEmail(email, amount, reference, serviceType, duration) {
  const serviceLabels = {
    'textToVideo': 'Text to Video',
    'photoToVideo': 'Photos to Video',
    'translation': 'Video Translation',
    'music-captions': 'Music & Captions',
    'brand-video': 'Brand Video'
  };

  return {
    subject: '🧾 Payment Confirmation - VidAI Creator',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; }
          .total { font-weight: bold; font-size: 18px; color: #8B5CF6; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .status-badge { background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧾 Payment Receipt</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Thank you for your payment! Your transaction has been completed successfully. 🎉</p>

          <div class="receipt-box">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <div class="receipt-row">
              <span>Transaction ID</span>
              <span><strong>${reference}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Service</span>
              <span><strong>${serviceLabels[serviceType] || serviceType}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Duration</span>
              <span><strong>${duration || 5}s</strong></span>
            </div>
            <div class="receipt-row">
              <span>Status</span>
              <span><span class="status-badge">✅ Completed</span></span>
            </div>
            <div class="receipt-row">
              <span class="total">Total Paid</span>
              <span class="total">KES ${amount}</span>
            </div>
          </div>

          <p style="margin-top: 20px;">Your video is being generated and will be sent to you shortly.</p>
          <p>If you have any questions, please reply to this email.</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This is a system-generated receipt. Please keep it for your records.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration) {
  const downloadUrl = videoUrl.includes('/upload/')
    ? videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : videoUrl;

  return {
    subject: '🎬 Your AI Video is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .download-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎬 Your AI Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your AI-generated video has been created successfully! 🎉</p>

          <div class="details">
            <p><strong>📝 Prompt:</strong> ${prompt}</p>
            <p><strong>⏱️ Duration:</strong> ${duration || 5}s</p>
            <p><strong>💰 Amount Paid:</strong> KES ${amount}</p>
          </div>

          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>

          <div class="download-section">
            <h3>📥 Download Your Video</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              Click the button below to download your video
            </p>
            <a href="${downloadUrl}" class="button" style="font-size: 18px; padding: 15px 40px;">
              ⬇️ Download Video
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: <br>
              <a href="${downloadUrl}" style="word-break: break-all; font-size: 12px;">${downloadUrl}</a>
            </p>
          </div>

          <p style="margin-top: 20px;">Thank you for using VidAI Creator! 🚀</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}. If you have any questions, reply to this email.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateTranslationEmail(email, videoUrl, translatedText, language, amount) {
  const downloadUrl = videoUrl.includes('/upload/')
    ? videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : videoUrl;

  return {
    subject: `🌐 Your Translated Video is Ready! (${language})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .translation-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #8B5CF6; }
          .language-badge { display: inline-block; background: #EC4899; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .receipt-box { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .download-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌐 Your Translated Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your video has been successfully translated to <span class="language-badge">${language}</span> 🎉</p>

          <div class="translation-box">
            <h4 style="margin-top: 0;">📝 Translated Content:</h4>
            <p style="font-size: 14px; color: #666;">"${translatedText}"</p>
          </div>

          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>

          <div class="download-section">
            <h3>📥 Download Your Translated Video</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              Click the button below to download your video
            </p>
            <a href="${downloadUrl}" class="button" style="font-size: 18px; padding: 15px 40px;">
              ⬇️ Download Video
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: <br>
              <a href="${downloadUrl}" style="word-break: break-all; font-size: 12px;">${downloadUrl}</a>
            </p>
          </div>

          <div class="receipt-box">
            <h3>🧾 Payment Receipt</h3>
            <p><strong>Service:</strong> Video Translation</p>
            <p><strong>Language:</strong> ${language}</p>
            <p><strong>Amount Paid:</strong> KES ${amount}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> ✅ Completed</p>
          </div>

          <p style="margin-top: 20px;">Thank you for using VidAI Creator! 🚀</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}. If you have any questions, reply to this email.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateBrandVideoDeliveryEmail(email, videoUrl, companyName) {
  const downloadUrl = videoUrl.includes('/upload/')
    ? videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : videoUrl;

  return {
    subject: `🎬 Your Brand Video for ${companyName} is Ready!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10B981, #047857); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 26px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10B981, #047857); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header"><h1>🎬 Your Brand Video is Ready!</h1></div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your branded video for <strong>${companyName}</strong> has been created successfully.</p>
          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
            </video>
          </div>
          <p style="text-align:center;">
            <a href="${downloadUrl}" class="button">⬇️ Download Video</a>
          </p>
        </div>
        <div class="footer"><p>This email was sent to ${email}.</p></div>
      </body>
      </html>
    `
  };
}

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    const allowedExtensions = ['.mp4', '.avi', '.mov', '.webm'];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(fileExt);

    if (isValidType || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: MP4, AVI, MOV, WEBM. Got: ${file.mimetype || fileExt}`), false);
    }
  }
});

// Separate multer config for logo/image uploads (Brand Video feature)
const imageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(fileExt);

    if (isValidType || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type. Allowed: PNG, JPG, WEBP, SVG. Got: ${file.mimetype || fileExt}`), false);
    }
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Uploads directory created:', uploadsDir);
}

// ============================================
// SIMPLE TEST UPLOAD ENDPOINT (FOR DEBUGGING)
// ============================================
app.post('/api/test-upload', upload.single('video'), (req, res) => {
  console.log('🧪 Test upload received!');
  console.log('File:', req.file ? req.file.originalname : 'No file');
  console.log('Body:', req.body);
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file received'
    });
  }
  
  res.json({
    success: true,
    message: 'Test upload worked!',
    filename: req.file.originalname,
    size: req.file.size
  });
});

// ============================================
// UPLOAD VIDEO ENDPOINT - WITH DEBUG LOGGING
// ============================================
app.post('/api/upload-video', (req, res) => {
  console.log('📤 Upload request received');
  console.log('📤 Content-Type:', req.headers['content-type']);
  console.log('📤 Content-Length:', req.headers['content-length']);
  console.log('📤 Host:', req.headers['host']);

  // Set timeouts
  req.setTimeout(300000);
  res.setTimeout(300000);

  upload.single('video')(req, res, async function(err) {
    res.setTimeout(0);

    // Log any multer errors
    if (err) {
      console.error('❌ Multer error:', err.message);
      console.error('❌ Multer error stack:', err.stack);
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed'
      });
    }

    // Check if file was received
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded. Please select a video file.'
      });
    }

    console.log(`✅ File received: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    console.log(`✅ File mimetype: ${req.file.mimetype}`);

    try {
      const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
      console.log(`☁️ Uploading to Cloudinary... (${fileSizeMB} MB)`);

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: 'video',
          folder: 'video-creator-uploads',
          public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        }, (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error.message);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful');
            resolve(result);
          }
        });

        uploadStream.end(req.file.buffer);
      });

      console.log(`✅ Video uploaded to Cloudinary successfully`);
      console.log(`   URL: ${result.secure_url}`);
      console.log(`   Public ID: ${result.public_id}`);

      // Send response
      return res.status(200).json({
        success: true,
        videoUrl: result.secure_url,
        filename: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        sizeMB: parseFloat(fileSizeMB),
        mimetype: req.file.mimetype
      });

    } catch (error) {
      console.error('❌ Upload processing error:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Always send a JSON response
      return res.status(500).json({
        success: false,
        error: 'Server error processing upload: ' + error.message
      });
    }
  });
});

// ============================================
// UPLOAD IMAGE ENDPOINT (used by Brand Video for logo uploads)
// ============================================
app.post('/api/upload-image', (req, res) => {
  imageUpload.single('image')(req, res, async function (err) {
    if (err) {
      console.error('❌ Image upload (multer) error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'Image upload failed'
      });
    }

    if (!req.file) {
      console.error('❌ No image file in request');
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded. Please select an image.'
      });
    }

    try {
      console.log(`☁️ Uploading image to Cloudinary... (${req.file.originalname})`);

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: 'image',
          folder: 'video-creator-logos',
          public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        }, (error, result) => {
          if (error) {
            console.error('❌ Cloudinary image upload error:', error.message);
            reject(error);
          } else {
            resolve(result);
          }
        });

        uploadStream.end(req.file.buffer);
      });

      console.log('✅ Image uploaded to Cloudinary:', result.secure_url);

      return res.status(200).json({
        success: true,
        imageUrl: result.secure_url,
        filename: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

    } catch (error) {
      console.error('❌ Image upload processing error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Server error processing image upload: ' + error.message
      });
    }
  });
});

// ============================================
// VIDEO TRANSLATION PIPELINE FUNCTIONS
// ============================================

async function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function transcribeAudio(audioPath) {
  if (!groq) {
    console.log('⚠️ Groq not available, using fallback transcription');
    return "This is a sample transcription. The actual transcription service is not available.";
  }

  try {
    console.log('🎤 Transcribing with Groq...');
    const audioBuffer = fs.readFileSync(audioPath);
    const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'json'
    });

    console.log('✅ Transcription complete');
    return transcription.text;
  } catch (error) {
    console.error('❌ Transcription error:', error);
    return "This is a sample transcription for the video. The actual transcription failed, but we're continuing with the translation.";
  }
}

// ============================================
// SYNC FIX HELPERS
// ============================================

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function buildAtempoFilter(ratio) {
  const filters = [];
  let remaining = ratio;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters.join(',');
}

async function combineAudioWithVideo(videoPath, audioBuffer, outputPath) {
  if (!audioBuffer || audioBuffer.length < 100) {
    throw new Error(`Invalid audio buffer: ${audioBuffer ? audioBuffer.length : 'null'} bytes`);
  }

  console.log(`🔊 Audio buffer size: ${audioBuffer.length} bytes`);

  const tempAudioPath = path.join(tempDir, `${crypto.randomUUID()}.mp3`);
  fs.writeFileSync(tempAudioPath, audioBuffer);

  const videoDuration = await getDuration(videoPath);
  const audioDuration = await getDuration(tempAudioPath);
  console.log(`📏 Video: ${videoDuration.toFixed(2)}s | New audio: ${audioDuration.toFixed(2)}s`);

  let tempoRatio = audioDuration / videoDuration;
  tempoRatio = Math.min(Math.max(tempoRatio, 0.7), 1.4);
  const atempoFilter = buildAtempoFilter(tempoRatio);
  console.log(`🎚️ Applying tempo adjustment: ${tempoRatio.toFixed(3)}x`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(tempAudioPath)
      .audioFilters([atempoFilter, 'apad'])
      .audioCodec('aac')
      .videoCodec('libx264')
      .outputOptions([
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-t', videoDuration.toString()
      ])
      .output(outputPath)
      .on('end', () => {
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        resolve();
      })
      .on('error', (err) => {
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        reject(err);
      })
      .run();
  });
}

async function generateTranslatedVideo(originalVideoUrl, targetLanguage, duration) {
  console.log(`🎬 Starting translation pipeline for ${targetLanguage}`);

  const videoId = crypto.randomUUID();
  const videoPath = path.join(tempDir, `${videoId}.mp4`);
  const audioPath = path.join(tempDir, `${videoId}.wav`);
  const outputPath = path.join(tempDir, `${videoId}_translated.mp4`);

  try {
    console.log('📥 Downloading video...');
    const response = await fetch(originalVideoUrl);
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    const videoBuffer = await response.arrayBuffer();
    fs.writeFileSync(videoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded');

    console.log('🎵 Extracting audio...');
    await extractAudio(videoPath, audioPath);
    console.log('✅ Audio extracted');

    console.log('📝 Transcribing audio...');
    const transcribedText = await transcribeAudio(audioPath);
    console.log(`📝 Transcription (first 100 chars): ${transcribedText.substring(0, 100)}...`);

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const translatedTextResult = await translateText(transcribedText, targetLanguage);
    console.log(`🌐 Translation (first 100 chars): ${translatedTextResult.substring(0, 100)}...`);

    const originalVideoDuration = await getDuration(videoPath);
    const estimatedWordCount = translatedTextResult.split(/\s+/).filter(Boolean).length;
    const estimatedNaturalDuration = estimatedWordCount / 2.5;
    let requestedRate = estimatedNaturalDuration > 0
      ? estimatedNaturalDuration / originalVideoDuration
      : 1.0;
    requestedRate = Math.min(Math.max(requestedRate, 0.8), 1.3);

    console.log('🔊 Generating translated audio...');
    const audioContent = await textToSpeech(translatedTextResult, targetLanguage, requestedRate, 'MALE');
    console.log('✅ Audio generated');

    console.log('🎬 Combining audio with video...');
    await combineAudioWithVideo(videoPath, audioContent, outputPath);
    console.log('✅ Video combined');

    console.log('☁️ Uploading to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
      resource_type: 'video',
      folder: 'video-creator-uploads',
      public_id: `${videoId}_translated_${targetLanguage}`
    });
    console.log('✅ Uploaded to Cloudinary');

    [videoPath, audioPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    console.log('✅ Translation pipeline complete!');
    return uploadResult.secure_url;

  } catch (error) {
    console.error('❌ Translation pipeline error:', error);
    [videoPath, audioPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    throw new Error(`Translation failed: ${error.message}`);
  }
}

// ============================================
// ADD AUDIO NARRATION TO A SCENE-GENERATED VIDEO
// ============================================
async function addAudioToSceneVideo(remoteVideoUrl, script, voiceGender = 'MALE') {
  const videoId = crypto.randomUUID();
  const videoPath = path.join(tempDir, `${videoId}.mp4`);
  const outputPath = path.join(tempDir, `${videoId}_with_audio.mp4`);

  try {
    console.log('📥 Downloading scene video for audio muxing...');
    const response = await fetch(remoteVideoUrl);
    if (!response.ok) throw new Error(`Failed to download scene video: ${response.status}`);
    const videoBuffer = await response.arrayBuffer();
    fs.writeFileSync(videoPath, Buffer.from(videoBuffer));

    console.log(`🔊 Generating ${voiceGender} narration audio...`);
    const audioBuffer = await textToSpeech(script, 'en', 1.0, voiceGender);

    console.log('🎬 Muxing audio onto scene video...');
    await combineAudioWithVideo(videoPath, audioBuffer, outputPath);

    console.log('☁️ Uploading video-with-audio to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
      resource_type: 'video',
      folder: 'video-creator-uploads',
      public_id: `${videoId}_narrated`
    });

    [videoPath, outputPath].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });

    return uploadResult.secure_url;
  } catch (error) {
    [videoPath, outputPath].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    throw error;
  }
}

// ============================================
// SUPABASE DATA ACCESS FUNCTIONS
// ============================================

async function supabaseAddPayment(email, amount, paymentMethod, serviceType, reference) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                email,
                amount,
                payment_method: paymentMethod,
                service_type: serviceType,
                reference,
                status: 'completed'
            })
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Payment saved to Supabase:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Error adding payment to Supabase:', error.message);
        return null;
    }
}

async function supabaseAddRevenue(transactionId, email, amount, serviceType, paymentReference, paymentMethod) {
    try {
        const { data, error } = await supabase
            .from('revenues')
            .insert({
                transaction_id: transactionId,
                email,
                amount,
                service_type: serviceType,
                payment_reference: paymentReference,
                payment_method: paymentMethod || 'card'
            })
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Revenue saved to Supabase:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Error adding revenue to Supabase:', error.message);
        return null;
    }
}

async function supabaseAddVideoUsage(transactionId, userEmail, videoType, prompt, cost, modelUsed, provider, duration) {
    try {
        const { data, error } = await supabase
            .from('video_usage')
            .insert({
                transaction_id: transactionId,
                user_email: userEmail || 'anonymous',
                video_type: videoType,
                prompt: prompt ? prompt.substring(0, 200) : '',
                cost: cost || 0,
                model_used: modelUsed || 'unknown',
                provider: provider || 'unknown',
                duration: duration || 5
            })
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Video usage saved to Supabase:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Error adding video usage to Supabase:', error.message);
        return null;
    }
}

async function supabaseAddActivityLog(userEmail, action, details, amount) {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .insert({
                user_email: userEmail || 'anonymous',
                action,
                details: details || '',
                amount: amount || 0
            })
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Activity log saved to Supabase:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Error adding activity log to Supabase:', error.message);
        return null;
    }
}

async function supabaseFindPaymentByReference(reference) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('reference', reference)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    } catch (error) {
        console.error('❌ Error finding payment in Supabase:', error.message);
        return null;
    }
}

async function supabaseGenerateCoupon(paymentReference, email, serviceType) {
    const couponCode = `REDO-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
        const { data: existing } = await supabase
            .from('coupons')
            .select('code')
            .eq('payment_reference', paymentReference)
            .single();
        if (existing) return existing.code;
        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: couponCode,
                payment_reference: paymentReference,
                email,
                service_type: serviceType || 'photo-to-video',
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Coupon saved to Supabase:', data.code);
        return data.code;
    } catch (error) {
        console.error('❌ Error generating coupon in Supabase:', error.message);
        return couponCode;
    }
}

async function supabaseValidateCoupon(couponCode, email) {
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', couponCode)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return { valid: false, error: 'Coupon not found' };
            throw error;
        }
        if (data.used) {
            return { valid: false, error: 'This coupon has already been used' };
        }
        if (new Date(data.expires_at) < new Date()) {
            return { valid: false, error: 'Coupon has expired' };
        }
        if (email && data.email !== email) {
            return { valid: false, error: 'Coupon not valid for this email' };
        }
        return { valid: true, coupon: data };
    } catch (error) {
        console.error('❌ Error validating coupon in Supabase:', error.message);
        return { valid: false, error: 'Error validating coupon' };
    }
}

async function supabaseRedeemCoupon(couponCode, email) {
    try {
        const validation = await supabaseValidateCoupon(couponCode, email);
        if (!validation || !validation.valid) {
            return validation || { success: false, error: 'Invalid coupon' };
        }
        const { data, error } = await supabase
            .from('coupons')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('code', couponCode)
            .select()
            .single();
        if (error) throw error;
        console.log('✅ Coupon redeemed in Supabase:', data.code);
        return { success: true, coupon: data };
    } catch (error) {
        console.error('❌ Error redeeming coupon in Supabase:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// DATA ACCESS FUNCTIONS (Supabase first, fallback to memory)
// ============================================

async function addUserPayment(email, amount, paymentMethod, serviceType, reference) {
    const result = await supabaseAddPayment(email, amount, paymentMethod, serviceType, reference);
    if (result) return result.id;
    memoryStore.payments.push({
        email,
        amount: parseFloat(amount),
        paymentMethod,
        serviceType,
        reference,
        status: 'completed',
        createdAt: new Date().toISOString()
    });
    return 'memory-' + Date.now();
}

async function addRevenue(transactionId, email, amount, serviceType, paymentReference, paymentMethod) {
    const result = await supabaseAddRevenue(transactionId, email, amount, serviceType, paymentReference, paymentMethod);
    if (result) return result.id;
    memoryStore.revenues.push({
        transactionId,
        email,
        amount: parseFloat(amount),
        serviceType,
        paymentReference,
        paymentMethod: paymentMethod || 'card',
        duration: 5,
        createdAt: new Date().toISOString()
    });
    return 'memory-' + Date.now();
}

async function addVideoUsage(transactionId, userEmail, videoType, prompt, cost, modelUsed, provider, duration) {
    const result = await supabaseAddVideoUsage(transactionId, userEmail, videoType, prompt, cost, modelUsed, provider, duration);
    if (result) return result.id;
    memoryStore.videoUsages.push({
        transactionId,
        userEmail: userEmail || 'anonymous',
        videoType,
        prompt: prompt ? prompt.substring(0, 200) : '',
        cost: cost || 0,
        modelUsed: modelUsed || 'unknown',
        provider: provider || 'unknown',
        duration: duration || 5,
        createdAt: new Date().toISOString()
    });
    return 'memory-' + Date.now();
}

async function addActivityLog(userEmail, action, details, amount) {
    const result = await supabaseAddActivityLog(userEmail, action, details, amount);
    if (result) return result.id;
    memoryStore.activityLogs.push({
        userEmail: userEmail || 'anonymous',
        action,
        details: details || '',
        amount: amount || 0,
        createdAt: new Date().toISOString()
    });
    return 'memory-' + Date.now();
}

async function findPaymentByReference(reference) {
    const result = await supabaseFindPaymentByReference(reference);
    if (result) return result;
    return memoryStore.payments.find(p => p.reference === reference) || null;
}

async function generateCoupon(paymentReference, email, serviceType) {
    const result = await supabaseGenerateCoupon(paymentReference, email, serviceType);
    if (result) return result;
    const couponCode = `REDO-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    memoryStore.coupons[couponCode] = {
        code: couponCode,
        paymentReference,
        email,
        serviceType: serviceType || 'photo-to-video',
        used: false,
        usedAt: null,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
    };
    return couponCode;
}

async function validateCoupon(couponCode, email) {
    const result = await supabaseValidateCoupon(couponCode, email);
    if (result) return result;
    if (memoryStore.coupons[couponCode]) {
        const coupon = memoryStore.coupons[couponCode];
        if (coupon.used) return { valid: false, error: 'This coupon has already been used' };
        if (new Date(coupon.expiresAt) < new Date()) return { valid: false, error: 'Coupon has expired' };
        if (email && coupon.email !== email) return { valid: false, error: 'Coupon not valid for this email' };
        return { valid: true, coupon };
    }
    return { valid: false, error: 'Coupon not found' };
}

async function redeemCoupon(couponCode, email) {
    const result = await supabaseRedeemCoupon(couponCode, email);
    if (result) return result;
    if (memoryStore.coupons[couponCode]) {
        const coupon = memoryStore.coupons[couponCode];
        if (coupon.used) return { success: false, error: 'This coupon has already been used' };
        if (new Date(coupon.expiresAt) < new Date()) return { success: false, error: 'Coupon has expired' };
        coupon.used = true;
        coupon.usedAt = new Date().toISOString();
        return { success: true, coupon };
    }
    return { success: false, error: 'Coupon not found' };
}

// ============================================
// TRANSLATION ENDPOINTS
// ============================================

app.post('/api/translate-video', async (req, res) => {
  try {
    const {
      videoUrl,
      targetLanguage,
      sourceLanguage,
      paymentReference,
      email,
      duration
    } = req.body;

    const TRANSLATION_PRICE = 300;

    console.log('🌐 Translation request received');

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required for translation.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const translatedVideoUrl = await generateTranslatedVideo(
      videoUrl,
      targetLanguage || 'fr',
      duration || 5
    );

    const translationId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const translationRecord = {
      id: translationId,
      paymentReference,
      email,
      videoUrl,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'en',
      translatedText: `Video translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French'}`,
      translatedVideoUrl,
      duration: duration || 5,
      price: TRANSLATION_PRICE,
      createdAt: new Date().toISOString()
    };

    await saveTranslation(translationRecord);

    const translationCost = TRANSLATION_PRICE;
    await addRevenue(translationId, email, translationCost, 'translation', paymentReference, 'card');
    await addUserPayment(email, translationCost, 'card', 'translation', paymentReference);
    await addActivityLog(email, '🌐 Video Translation', `Translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}, Duration: ${duration || 5}s, Price: KES ${TRANSLATION_PRICE}`, translationCost);
    await addVideoUsage(paymentReference, email, 'translation', `Video translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}`, translationCost, 'Translation Pipeline', 'google-groq', duration || 5);

    res.json({
      success: true,
      videoUrl: translatedVideoUrl,
      targetLanguage: targetLanguage,
      languageName: FREE_TRANSLATION_LANGUAGES[targetLanguage],
      duration: duration || 5,
      paymentReference,
      translationId,
      price: TRANSLATION_PRICE
    });

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/translate-video-free', async (req, res) => {
  try {
    const { videoUrl, targetLanguage, sourceLanguage, paymentReference, email, duration } = req.body;

    console.log('🔄 Free retry translation for:', email);

    const payment = await findPaymentByReference(paymentReference);

    if (!payment) {
      console.log('❌ Payment not found for reference:', paymentReference);
      return res.status(404).json({
        success: false,
        error: 'Payment not found. Please verify your payment reference.'
      });
    }

    console.log('✅ Payment found, proceeding with translation');

    const translatedVideoUrl = await generateTranslatedVideo(
      videoUrl,
      targetLanguage || 'fr',
      duration || 5
    );

    let emailResult = { success: false };
    try {
      const languageName = FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French';
      const translationEmail = generateTranslationEmail(
        email,
        translatedVideoUrl,
        `Video translated to ${languageName}`,
        languageName,
        300
      );
      emailResult = await sendEmail(email, translationEmail.subject, translationEmail.html);
      console.log(`📧 Email sent to ${email}: ${emailResult.success}`);
    } catch (emailErr) {
      console.error('❌ Email error:', emailErr);
      emailResult = { success: false, error: emailErr.message };
    }

    try {
      await sendReceiptEmail(email, 300, paymentReference, 'translation');
    } catch (receiptErr) {
      console.error('❌ Receipt error:', receiptErr);
    }

    res.json({
      success: true,
      message: '✅ Translation complete! Check your email for the download link.',
      videoUrl: translatedVideoUrl,
      paymentReference: paymentReference,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Translation failed. Please try again.'
    });
  }
});

app.post('/api/test-tts', async (req, res) => {
  try {
    const { text, targetLanguage, voiceGender } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🔊 Testing TTS with text: "${text.substring(0, 50)}..."`);

    const audioBuffer = await textToSpeech(text, targetLanguage || 'en', 1.0, voiceGender || 'MALE');

    res.json({
      success: true,
      audioLength: audioBuffer.length,
      audioBase64: audioBuffer.toString('base64').substring(0, 100) + '...',
      textLength: text.length,
      targetLanguage: targetLanguage || 'en',
      voiceGender: voiceGender || 'MALE'
    });
  } catch (error) {
    console.error('❌ TTS test error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// TEST AUDIO MUX DEBUG ENDPOINT
// ============================================
app.post('/api/test-audio-mux', async (req, res) => {
  try {
    const { videoUrl, script, voiceGender } = req.body;

    if (!videoUrl || !script) {
      return res.status(400).json({
        success: false,
        error: 'Both videoUrl and script are required in request body'
      });
    }

    console.log('🧪 Testing audio mux pipeline...');

    const narratedUrl = await addAudioToSceneVideo(videoUrl, script, voiceGender || 'MALE');

    res.json({
      success: true,
      narratedUrl: narratedUrl,
      originalUrl: videoUrl,
      scriptUsed: script
    });
  } catch (error) {
    console.error('❌ Audio mux test error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// PAYMENT VERIFICATION
// ============================================

async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.log('⚠️ No secret key, accepting test payment');
      return true;
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status && data.data?.status === 'success';
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

// ============================================
// TRANSLATION LANGUAGES
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
  console.log('🌐 GET /api/free-languages - Returning languages');
  res.json({
    success: true,
    languages: FREE_TRANSLATION_LANGUAGES,
    count: Object.keys(FREE_TRANSLATION_LANGUAGES).length
  });
});

app.get('/api/translation-price', (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 5;
    const price = 300;
    const cost = 50;

    res.json({
      success: true,
      duration: duration,
      price: price,
      cost: cost,
      currency: 'KES',
      breakdown: {
        basePrice: 300,
        serviceFee: 300,
        total: 300
      },
      message: 'Fixed price of KES 300 for video translation'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/translations', async (req, res) => {
  try {
    const { email } = req.query;
    const translations = memoryStore.translations.filter(t => !email || t.email === email).slice(-20);
    res.json({
      success: true,
      translations: translations,
      total: translations.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function saveTranslation(translationData) {
  memoryStore.translations.push(translationData);
  return translationData;
}

async function sendReceiptEmail(email, amount, reference, serviceType) {
  const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceType, 5);
  await sendEmail(email, receiptEmail.subject, receiptEmail.html);
  console.log(`📧 Receipt sent to ${email}`);
}

// ============================================
// PAYMENT ENDPOINTS
// ============================================

app.post('/api/initialize-payment', async (req, res) => {
  try {
    const { email, amount, serviceType, metadata } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log('💰 Initializing payment...');

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!secretKey || secretKey === 'your_paystack_secret_key' || secretKey.length < 10) {
      console.error('❌ Invalid Paystack secret key.');
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error. Please contact support.'
      });
    }

    const requestBody = {
      email: email,
      amount: Math.round(amount * 100),
      metadata: {
        serviceType: serviceType || 'translation',
        ...metadata,
        custom_fields: [
          {
            display_name: "Service Type",
            variable_name: "service_type",
            value: serviceType || 'translation'
          },
          {
            display_name: "Amount",
            variable_name: "amount",
            value: `${amount} KES`
          },
          ...(metadata?.custom_fields || [])
        ]
      },
      callback_url: process.env.FRONTEND_URL || 'https://www.katareel.com/translation-success'
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.status) {
      console.log('✅ Payment initialized successfully!');
      return res.status(200).json({
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        metadata: metadata
      });
    } else {
      console.error('❌ Paystack error:', data.message);
      return res.status(400).json({
        success: false,
        error: data.message || 'Payment initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment initialization failed. Please try again.'
    });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount, serviceType, paymentMethod, duration } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log(`🔍 Verifying payment: ${reference}`);

    const serviceMap = { 'text-to-video': 'textToVideo', 'photo-to-video': 'photoToVideo', 'translation': 'translation', 'music-captions': 'music-captions', 'brand-video': 'brandVideo' };

    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Using test mode.');
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      const serviceKey = serviceMap[serviceType] || 'textToVideo';

      await addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      await addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      await addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);

      return res.json({
        success: true,
        data: { reference, status: 'success' },
        message: 'Payment verified successfully (test mode)',
        transactionId
      });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      const serviceKey = serviceMap[serviceType] || 'textToVideo';
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

      await addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      await addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      await addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);

      res.json({
        success: true,
        data: data.data,
        message: 'Payment verified successfully',
        transactionId
      });
    } else {
      res.json({
        success: false,
        error: data.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;
    if (!secret) return res.sendStatus(200);

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

    if (payload.event === 'charge.success') {
      const transaction = payload.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);

      const amount = transaction.amount / 100;
      const email = transaction.customer.email;
      const reference = transaction.reference;
      const serviceType = transaction.metadata?.custom_fields?.find(f => f.display_name === "Video Type")?.value || 'text-to-video';
      const duration = parseInt(transaction.metadata?.custom_fields?.find(f => f.display_name === "Duration")?.value) || 5;

      addUserPayment(email, amount, 'card', serviceType, reference);
      addActivityLog(email, `💰 Payment received via webhook`, `Amount: KES ${amount}, Ref: ${reference}, Duration: ${duration}s`, amount);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
});

// ============================================
// STARTBUTTON PAYMENT ENDPOINTS
// ============================================

const STARTBUTTON_PUBLIC_KEY = process.env.STARTBUTTON_PUBLIC_KEY;
const STARTBUTTON_BASE_URL = process.env.STARTBUTTON_BASE_URL || 'https://api.startbutton.tech';

async function initializeStartbuttonPayment(email, amount, serviceType, metadata = {}) {
    try {
        console.log('💰 Initializing Startbutton payment...');

        if (!STARTBUTTON_PUBLIC_KEY || STARTBUTTON_PUBLIC_KEY === 'your_startbutton_public_key') {
            console.warn('⚠️ STARTBUTTON_PUBLIC_KEY not set. Using test mode.');
            const reference = 'SB-TEST-' + Date.now();
            return {
                success: true,
                reference: reference,
                authorization_url: `${process.env.FRONTEND_URL || 'https://www.katareel.com'}/payment-success?reference=${reference}`,
                testMode: true
            };
        }

        const uniqueReference = `SB-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const amountInFractionalUnits = Math.round(amount * 100);

        const requestBody = {
            amount: amountInFractionalUnits,
            currency: 'KES',
            email: email,
            reference: uniqueReference,
            redirectUrl: `${process.env.FRONTEND_URL || 'https://www.katareel.com'}/payment-success`,
            metadata: {
                service_type: serviceType || 'text-to-video',
                ...metadata
            }
        };

        const response = await fetch(`${STARTBUTTON_BASE_URL}/transaction/initialize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STARTBUTTON_PUBLIC_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Startbutton API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Startbutton payment initialized:', data);

        return {
            success: true,
            reference: uniqueReference,
            authorization_url: data.data || data.authorization_url,
            testMode: false
        };

    } catch (error) {
        console.error('❌ Startbutton payment initialization error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function verifyStartbuttonPayment(reference) {
    try {
        console.log(`🔍 Verifying Startbutton payment: ${reference}`);

        if (!STARTBUTTON_PUBLIC_KEY || STARTBUTTON_PUBLIC_KEY === 'your_startbutton_public_key') {
            console.warn('⚠️ STARTBUTTON_PUBLIC_KEY not set. Using test mode.');
            return true;
        }

        const response = await fetch(`${STARTBUTTON_BASE_URL}/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STARTBUTTON_PUBLIC_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Startbutton verification error:', response.status);
            return false;
        }

        const data = await response.json();
        console.log('✅ Startbutton verification response:', data);

        const status = data.status || data.data?.status;
        return status === 'successful' || status === 'success' || status === 'completed';

    } catch (error) {
        console.error('❌ Startbutton verification error:', error.message);
        return false;
    }
}

app.post('/api/initialize-startbutton-payment', async (req, res) => {
    try {
        const { email, amount, serviceType, metadata } = req.body;

        console.log('💰 Initializing Startbutton payment...');

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }

        const result = await initializeStartbuttonPayment(email, amount, serviceType, metadata);

        if (result.success) {
            return res.status(200).json({
                success: true,
                reference: result.reference,
                authorization_url: result.authorization_url,
                testMode: result.testMode || false
            });
        } else {
            return res.status(400).json({
                success: false,
                error: result.error || 'Payment initialization failed'
            });
        }

    } catch (error) {
        console.error('❌ Startbutton payment initialization error:', error);
        return res.status(500).json({
            success: false,
            error: 'Payment initialization failed. Please try again.'
        });
    }
});

app.post('/api/verify-startbutton-payment', async (req, res) => {
    try {
        const { reference, email, amount, serviceType, paymentMethod, duration } = req.body;

        console.log(`🔍 Verifying Startbutton payment: ${reference}`);

        const isValid = await verifyStartbuttonPayment(reference);

        if (isValid) {
            const serviceMap = { 
                'text-to-video': 'textToVideo', 
                'photo-to-video': 'photoToVideo', 
                'translation': 'translation', 
                'music-captions': 'music-captions',
                'brand-video': 'brandVideo'
            };
            const serviceKey = serviceMap[serviceType] || 'textToVideo';
            const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
            const videoDuration = duration || 5;

            await addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'startbutton');
            await addUserPayment(email, amount, paymentMethod || 'startbutton', serviceType, reference);
            await addActivityLog(email, `💰 Paid for ${serviceType} via Startbutton`, `Amount: KES ${amount}, Duration: ${videoDuration}s`, amount);

            res.json({
                success: true,
                message: 'Payment verified successfully',
                transactionId,
                reference
            });
        } else {
            res.json({
                success: false,
                error: 'Payment verification failed or payment not completed'
            });
        }

    } catch (error) {
        console.error('❌ Startbutton verification error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/webhook/startbutton', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📨 Startbutton webhook received:', payload);

        const event = payload.event || payload.type;
        const data = payload.data || payload;

        if (event === 'payment.success' || event === 'charge.success' || data.status === 'success' || data.status === 'completed' || data.status === 'successful') {
            const reference = data.reference || data.id;
            const email = data.customer?.email || data.email;
            const amount = data.amount || data.amount_paid || 0;

            console.log(`✅ Startbutton payment successful!`);
            console.log(`   Reference: ${reference}`);
            console.log(`   Amount: ${amount} KES`);
            console.log(`   Customer: ${email}`);

            let serviceType = 'text-to-video';
            let duration = 5;
            
            if (data.metadata) {
                const meta = data.metadata;
                if (meta.service_type) serviceType = meta.service_type;
                if (meta.duration) duration = parseInt(meta.duration) || 5;
            }

            await addUserPayment(email, amount, 'startbutton', serviceType, reference);
            await addActivityLog(email, `💰 Payment received via Startbutton webhook`, `Amount: KES ${amount}, Ref: ${reference}, Duration: ${duration}s`, amount);

            res.sendStatus(200);
        } else {
            console.warn('⚠️ Unhandled Startbutton webhook event:', event);
            res.sendStatus(200);
        }

    } catch (error) {
        console.error('❌ Startbutton webhook error:', error.message);
        res.status(500).send('Webhook processing failed');
    }
});

// ============================================
// REDO COUPON SYSTEM
// ============================================

app.post('/api/generate-redo-coupon', async (req, res) => {
  try {
    const { paymentReference, email, serviceType } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    const isTestMode = paymentReference.startsWith('TEST-') ||
                        paymentReference.startsWith('REDO-') ||
                        paymentReference.startsWith('MANUAL-');

    const payment = await findPaymentByReference(paymentReference);

    if (!payment && !isTestMode) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (!payment && !email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required to generate a coupon for this payment reference'
      });
    }

    const couponCode = await generateCoupon(
      paymentReference,
      email || payment?.email,
      serviceType || payment?.serviceType || 'photo-to-video'
    );

    let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (memoryStore.coupons[couponCode]) {
      expiresAt = new Date(memoryStore.coupons[couponCode].expiresAt);
    }

    res.json({
      success: true,
      coupon: couponCode,
      message: 'Redo coupon generated successfully',
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('❌ Error generating redo coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/check-redo-coupon', async (req, res) => {
  try {
    const { couponCode, email } = req.body;

    if (!couponCode) {
      return res.json({
        success: false,
        valid: false,
        error: 'Coupon code is required'
      });
    }

    const result = await validateCoupon(couponCode, email);

    if (result.valid) {
      res.json({
        success: true,
        valid: true,
        expiresAt: result.coupon.expiresAt,
        message: 'Coupon is valid! You can regenerate your video for free.'
      });
    } else {
      res.json({
        success: false,
        valid: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error checking coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/redeem-redo-coupon', async (req, res) => {
  try {
    const { couponCode, email } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code is required'
      });
    }

    const result = await redeemCoupon(couponCode, email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Coupon redeemed successfully! You can now regenerate your video for free.',
        paymentReference: result.coupon.paymentReference
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error redeeming coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/coupon-status/:paymentReference', async (req, res) => {
  try {
    const { paymentReference } = req.params;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    let coupon = null;
    for (const key in memoryStore.coupons) {
      if (memoryStore.coupons[key].paymentReference === paymentReference) {
        coupon = memoryStore.coupons[key];
        break;
      }
    }

    if (coupon) {
      res.json({
        success: true,
        hasCoupon: true,
        coupon: {
          code: coupon.code,
          used: coupon.used,
          expiresAt: coupon.expiresAt,
          createdAt: coupon.createdAt
        }
      });
    } else {
      res.json({
        success: true,
        hasCoupon: false,
        message: 'No coupon found for this payment'
      });
    }

  } catch (error) {
    console.error('❌ Error getting coupon status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SEND VIDEO EMAIL ENDPOINT
// ============================================

app.post('/api/send-video-email', async (req, res) => {
  try {
    const { email, videoUrl, prompt, amount, duration } = req.body;

    if (!email || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Email and video URL are required'
      });
    }

    console.log(`📧 Sending video to ${email}`);

    const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration || 5);

    const result = await sendEmail(email, videoEmail.subject, videoEmail.html);

    if (result.success) {
      console.log(`✅ Video email sent successfully to ${email}`);
      return res.json({
        success: true,
        message: 'Video sent to your email',
        provider: result.provider
      });
    }

    console.error(`❌ Email send failed for ${email}: ${result.error}`);
    return res.status(502).json({
      success: false,
      error: result.error || 'Failed to send email',
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST EMAIL ENDPOINT
// ============================================

app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log(`📧 Testing email to ${email}`);

    const result = await sendEmail(
      email,
      '✅ Test Email from VidAI Creator',
      `
        <h1>Test Email Successful!</h1>
        <p>Your email configuration is working correctly.</p>
        <p>Provider: ${emailProvider.toUpperCase()}</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    );

    res.json({
      success: result.success,
      provider: result.provider,
      error: result.error || null,
      message: result.success ? 'Test email sent successfully' : `Failed to send test email: ${result.error}`
    });
  } catch (error) {
    console.error('❌ Test email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test-google-cloud', async (req, res) => {
  try {
    const results = {
      translate: false,
      tts: false,
      groq: !!groq,
      apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
      groqConfigured: !!process.env.GROQ_API_KEY
    };

    try {
      const testText = 'Hello world';
      const result = await translateText(testText, 'fr');
      results.translate = true;
      results.translateSample = result;
    } catch (e) {
      results.translateError = e.message;
    }

    try {
      const audio = await textToSpeech('Test', 'fr', 1.0, 'MALE');
      results.tts = true;
      results.ttsSample = `Audio buffer size: ${audio ? audio.length : 0} bytes`;
    } catch (e) {
      results.ttsError = e.message;
    }

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// VIDEO GENERATION
// ============================================

const failedGenerations = {};

function getModelArkModelIds() {
  const raw = process.env.MODELARK_MODEL_IDS;
  if (raw && raw.trim().length > 0) {
    return raw.split(',').map(id => id.trim()).filter(Boolean);
  }
  return ['dreamina-seedance-2-0-260128', 'ep-m-20260721145303-hf4fp'];
}

async function pollDreaminaTask(taskId, token, endpoint) {
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const pollResponse = await fetch(`${endpoint}/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!pollResponse.ok) {
        const bodyText = await pollResponse.text().catch(() => '');
        console.warn(`⚠️ Dreamina poll ${attempts + 1} failed: ${pollResponse.status} ${bodyText.substring(0, 300)}`);
        attempts++;
        continue;
      }
      const result = await pollResponse.json();
      if (result.status === 'succeeded') return result;
      if (result.status === 'failed') throw new Error(result.error || 'Dreamina generation failed');
      attempts++;
    } catch (error) {
      console.warn(`⚠️ Dreamina poll ${attempts + 1} error:`, error.message);
      attempts++;
    }
  }
  throw new Error('Timeout waiting for Dreamina video generation');
}

// ============================================
// SCENE GENERATION PROVIDERS
// ============================================

function getKlingCredentials() {
  let accessKey = process.env.KLING_ACCESS_KEY;
  let secretKey = process.env.KLING_SECRET_KEY;

  if ((!accessKey || !secretKey) && process.env.KLING_API_KEY) {
    const raw = process.env.KLING_API_KEY.trim();
    const parts = raw.includes(':') ? raw.split(':') : raw.split('.');
    if (parts.length === 2) {
      accessKey = accessKey || parts[0];
      secretKey = secretKey || parts[1];
    }
  }

  return { accessKey, secretKey };
}

function getKlingHosts() {
  if (process.env.KLING_API_HOST) {
    return [process.env.KLING_API_HOST.replace(/\/$/, '')];
  }
  return [
    'https://api-singapore.klingai.com',
    'https://api.klingai.com'
  ];
}

function generateKlingToken() {
  const { accessKey, secretKey } = getKlingCredentials();

  if (!accessKey || !secretKey) {
    throw new Error(
      'Kling: missing credentials. Set KLING_ACCESS_KEY and KLING_SECRET_KEY ' +
      '(or KLING_API_KEY as "accessKey:secretKey") in your environment.'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5
  };

  return jwt.sign(payload, secretKey, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' }
  });
}

async function tryKlingHost(host, apiKey, photoUrl, prompt, duration) {
  const identityPrompt = `Keep exact same facial features, person identity, hair, and clothing from the input image. ${prompt || 'Speaking naturally with realistic subtle facial motion'}`;

  const createRes = await fetch(`${host}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model_name: 'kling-v3-0',
      image: photoUrl,
      prompt: identityPrompt,
      duration: String(duration <= 5 ? 5 : 10),
      mode: 'std',
      cfg_scale: 0.7
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    const err = new Error(`Kling (${host}): HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
    err.status = createRes.status;
    throw err;
  }

  const { data } = await createRes.json();
  const taskId = data.task_id;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`${host}/v1/videos/image2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    if (poll.data?.task_status === 'succeed') {
      return poll.data.task_result.videos[0].url;
    }
    if (poll.data?.task_status === 'failed') {
      throw new Error(`Kling (${host}) generation failed: ${poll.data.task_status_msg}`);
    }
  }
  throw new Error(`Kling (${host}): timeout waiting for video`);
}

async function generateKlingVideo(photoUrl, prompt, duration) {
  const apiKey = generateKlingToken();
  const hosts = getKlingHosts();
  const errors = [];

  for (const host of hosts) {
    try {
      console.log(`🔄 Kling: trying host ${host}...`);
      const videoUrl = await tryKlingHost(host, apiKey, photoUrl, prompt, duration);
      console.log(`✅ Kling: succeeded via ${host}`);
      return videoUrl;
    } catch (error) {
      console.warn(`❌ Kling (${host}) failed:`, error.message);
      errors.push(error.message);
      continue;
    }
  }

  throw new Error(`Kling: all hosts failed - ${errors.join(' | ')}`);
}

async function generateHailuoVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('Hailuo: MINIMAX_API_KEY not configured');

  const host = process.env.MINIMAX_API_HOST || 'https://api.minimax.io';
  const identityPrompt = `Strictly preserve the facial structure, skin tone, identity, and clothing of the person in first_frame_image. ${prompt || 'Natural character motion'}`;

  const createRes = await fetch(`${host}/v1/video_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'MiniMax-Hailuo-02',
      prompt: identityPrompt,
      first_frame_image: photoUrl,
      duration: duration <= 6 ? 6 : 10,
      resolution: '1080P'
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Hailuo: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { task_id } = await createRes.json();
  if (!task_id) throw new Error('Hailuo: no task_id returned from video_generation');

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`${host}/v1/query/video_generation?task_id=${task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    if (poll.status === 'Success') {
      const fileRes = await fetch(`${host}/v1/files/retrieve?file_id=${poll.file_id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const file = await fileRes.json();
      return file.file.download_url;
    }
    if (poll.status === 'Fail') {
      throw new Error(`Hailuo generation failed: ${poll.fail_msg || 'Unknown error'}`);
    }
  }
  throw new Error('Hailuo: timeout waiting for video');
}

async function generateKieVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) throw new Error('Kie: KIE_API_KEY not configured');

  const model = process.env.KIE_MODEL || 'kling-2.6/image-to-video';
  const identityPrompt = `Preserve facial identity and clothing from the provided photo. ${prompt || ''}`;

  const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: {
        prompt: identityPrompt,
        image_urls: [photoUrl],
        duration: Math.min(duration, 10)
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kie: HTTP ${response.status} - ${errorText.substring(0, 300)}`);
  }

  const data = await response.json();
  const taskId = data.data?.taskId || data.taskId || data.data?.task_id;
  if (!taskId) {
    throw new Error(`Kie: no taskId in createTask response - ${JSON.stringify(data).substring(0, 300)}`);
  }

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    const state = poll.data?.state || poll.data?.status;
    if (state === 'success' || state === 'completed' || state === 'succeeded') {
      const resultJson = poll.data?.resultJson ? JSON.parse(poll.data.resultJson) : poll.data;
      const url = resultJson?.resultUrls?.[0] || resultJson?.video_url || poll.data?.video_url;
      if (!url) throw new Error('Kie: task succeeded but no video URL in response');
      return url;
    }
    if (state === 'fail' || state === 'failed') {
      throw new Error(`Kie generation failed: ${poll.data?.failMsg || poll.data?.error || 'Unknown error'}`);
    }
  }
  throw new Error('Kie: Timeout waiting for video');
}

async function generateMagicHourVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.MAGIC_HR_API;
  if (!apiKey) throw new Error('Magic Hour: MAGIC_HR_API not configured');

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const cleanExt = (photoUrl.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const validExtensions = ['png', 'jpg', 'jpeg', 'heic', 'heif', 'webp', 'avif', 'jp2', 'tiff', 'bmp'];
  const extension = validExtensions.includes(cleanExt) ? cleanExt : 'jpg';

  const uploadUrlRes = await fetch('https://api.magichour.ai/v1/files/upload-urls', {
    method: 'POST',
    headers,
    body: JSON.stringify({ items: [{ type: 'image', extension }] })
  });

  if (!uploadUrlRes.ok) {
    const errorText = await uploadUrlRes.text();
    throw new Error(`Magic Hour: HTTP ${uploadUrlRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { items } = await uploadUrlRes.json();
  const { upload_url: uploadUrl, file_path: filePath } = items[0];

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Magic Hour: failed to fetch source photo (HTTP ${imgRes.status})`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  const putRes = await fetch(uploadUrl, { method: 'PUT', body: imgBuffer });
  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`Magic Hour: HTTP ${putRes.status} - ${errorText.substring(0, 300)}`);
  }

  const endSeconds = Math.min(Math.max(duration, 5), 60);
  const magicHourResolution = process.env.MAGIC_HOUR_RESOLUTION || '480p';
  const identityPrompt = `Animate the exact person from the uploaded photo with natural subtle movement. Maintain facial identity, gender, and clothing. ${prompt || ''}`;

  const createRes = await fetch('https://api.magichour.ai/v1/image-to-video', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `photo-to-video-${Date.now()}`,
      end_seconds: endSeconds,
      resolution: magicHourResolution,
      assets: { image_file_path: filePath },
      style: { prompt: identityPrompt }
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Magic Hour: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const created = await createRes.json();
  const projectId = created.id;
  if (!projectId) throw new Error('Magic Hour: no project id returned');

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.magichour.ai/v1/video-projects/${projectId}`, { headers });
    if (!pollRes.ok) continue;
    const poll = await pollRes.json();

    if (poll.status === 'complete') {
      const url = poll.downloads?.[0]?.url;
      if (!url) throw new Error('Magic Hour: completed but no download URL');
      return url;
    }
    if (poll.status === 'error') {
      throw new Error(`Magic Hour: ${poll.error?.message || 'generation failed'}`);
    }
    if (poll.status === 'canceled') {
      throw new Error('Magic Hour: generation was canceled');
    }
  }
  throw new Error('Magic Hour: timeout waiting for video');
}

async function generateRunwayVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error('Runway: RUNWAY_API_KEY not configured');

  const identityPrompt = `Preserve character face and identity from input photo. ${prompt || 'A cinematic scene'}`;

  const createRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: 'gen4_turbo',
      promptImage: photoUrl,
      promptText: identityPrompt,
      ratio: '1280:720',
      duration: duration <= 5 ? 5 : 10
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Runway: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { id: taskId } = await createRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06'
      }
    });
    const poll = await pollRes.json();
    if (poll.status === 'SUCCEEDED') return poll.output[0];
    if (poll.status === 'FAILED') throw new Error(`Runway: ${poll.failure || 'generation failed'}`);
  }
  throw new Error('Runway: timeout waiting for video');
}

async function generateVeoVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.GOOGLE_VEO_API_KEY;
  if (!apiKey) throw new Error('Veo: GOOGLE_VEO_API_KEY not configured');

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Veo: failed to fetch image (HTTP ${imgRes.status})`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const imgBase64 = imgBuffer.toString('base64');

  const identityPrompt = `Animate person keeping facial features unchanged. ${prompt || 'A cinematic scene'}`;

  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: identityPrompt,
          image: { bytesBase64Encoded: imgBase64, mimeType: 'image/jpeg' }
        }],
        parameters: { durationSeconds: Math.min(duration, 8), aspectRatio: '16:9' }
      })
    }
  );

  if (!startRes.ok) {
    const errorText = await startRes.text();
    throw new Error(`Veo: HTTP ${startRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { name: opName } = await startRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const opRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`);
    const op = await opRes.json();
    if (op.done) {
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error('Veo: no video URI in completed operation');
      return `${uri}&key=${apiKey}`;
    }
  }
  throw new Error('Veo: timeout waiting for video');
}

// Order prioritizes providers that best lock photo facial subject
const SCENE_PROVIDERS = [
  { name: 'magic_hour', fn: generateMagicHourVideo, enabled: () => !!process.env.MAGIC_HR_API, cost: 0.04 },
  { name: 'kling', fn: generateKlingVideo, enabled: () => { const { accessKey, secretKey } = getKlingCredentials(); return !!accessKey && !!secretKey; }, cost: 0.084 },
  { name: 'hailuo', fn: generateHailuoVideo, enabled: () => !!process.env.MINIMAX_API_KEY, cost: 0.10 },
  { name: 'kie', fn: generateKieVideo, enabled: () => !!process.env.KIE_API_KEY, cost: 0.06 },
  { name: 'runway', fn: generateRunwayVideo, enabled: () => !!process.env.RUNWAY_API_KEY, cost: 0.50 },
  { name: 'veo', fn: generateVeoVideo, enabled: () => !!process.env.GOOGLE_VEO_API_KEY, cost: 0.30 }
];

async function generateSceneVideo(photoUrl, prompt, duration) {
  const errors = [];
  for (const providerDef of SCENE_PROVIDERS) {
    if (!providerDef.enabled()) {
      errors.push(`${providerDef.name}: not configured`);
      continue;
    }
    try {
      console.log(`🔄 Trying ${providerDef.name} for scene generation...`);
      const videoUrl = await providerDef.fn(photoUrl, prompt, duration);
      console.log(`✅ ${providerDef.name} succeeded!`);
      return {
        videoUrl,
        provider: providerDef.name,
        cost: providerDef.cost * (duration / 5)
      };
    } catch (error) {
      console.warn(`❌ ${providerDef.name} failed:`, error.message);
      errors.push(`${providerDef.name}: ${error.message}`);
    }
  }
  throw new Error(`All scene providers failed: ${errors.join(' | ')}`);
}

function createFallbackVideo(prompt, paymentReference) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// ============================================
// TEXT TO VIDEO GENERATION
// ============================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference, email, retry, duration } = req.body;
    const videoDuration = duration || 5;

    if (retry && paymentReference && failedGenerations[paymentReference]) {
      console.log(`✅ Free retry allowed for payment: ${paymentReference}`);
    } else if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    } else {
      const isValid = await verifyPayment(paymentReference);
      if (!isValid) {
        return res.status(402).json({
          success: false,
          error: 'Invalid or expired payment.',
          requiresPayment: true
        });
      }
    }

    const durationMultiplier = videoDuration === 5 ? 1 : videoDuration === 10 ? 2 : videoDuration === 15 ? 3 : 1;

    let videoUrl = null;
    let usedModel = null;
    let provider = null;
    let cost = 0.08 * durationMultiplier;
    const generationErrors = [];

    // Try Replicate first
    try {
      const replicateToken = (process.env.REPLICATE_API_TOKEN || '').trim();
      if (replicateToken) {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: "alibaba/happy-horse:latest",
            input: {
              prompt: prompt,
              num_frames: videoDuration === 5 ? 16 : videoDuration === 10 ? 32 : 48,
              fps: 8,
              guidance_scale: 7.0,
              num_inference_steps: 30,
              width: 1024,
              height: 576
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let prediction = data;
          let attempts = 0;
          while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
              headers: { 'Authorization': `Token ${replicateToken}` }
            });
            prediction = await pollResponse.json();
            attempts++;
          }

          if (prediction.status === 'succeeded') {
            videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            usedModel = 'HappyHorse';
            provider = 'replicate';
            cost = 0.08 * durationMultiplier;
          } else {
            generationErrors.push(`Replicate: status "${prediction.status}"`);
          }
        }
      }
    } catch (error) {
      generationErrors.push(`Replicate: ${error.message}`);
    }

    if (!videoUrl) {
      return res.json({
        success: true,
        videoUrl: createFallbackVideo(prompt, paymentReference),
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        canRetry: true
      });
    }

    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: usedModel,
      provider: provider,
      cost: cost,
      duration: videoDuration,
      paymentReference,
      userEmail: email,
      emailSent: true
    });
  } catch (error) {
    res.json({
      success: true,
      videoUrl: createFallbackVideo(req.body.prompt, req.body.paymentReference),
      isFallback: true
    });
  }
});

// ============================================
// PHOTO TO VIDEO GENERATION
// ============================================
app.post('/api/generate-photo-video', async (req, res) => {
  try {
    const { photoUrls, prompt, duration, aspectRatio, paymentReference, email, audioScript, voiceGender } = req.body;
    const videoDuration = duration || 5;

    console.log('🖼️ Generating photo-to-video...');
    console.log('📸 Photos:', photoUrls?.length || 0);
    console.log('📝 Prompt:', prompt ? prompt.substring(0, 100) : 'No prompt');
    console.log('🎙️ Voice Gender:', voiceGender || 'MALE');

    if (!photoUrls || photoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one photo URL is required'
      });
    }

    const isTestMode = paymentReference && (paymentReference.startsWith('TEST-') ||
      paymentReference.startsWith('REDO-') ||
      paymentReference.startsWith('MANUAL-'));

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    }

    if (!isTestMode) {
      const isValid = await verifyPayment(paymentReference);
      if (!isValid) {
        return res.status(402).json({
          success: false,
          error: 'Invalid or expired payment.',
          requiresPayment: true
        });
      }
    }

    const durationMultiplier = videoDuration === 5 ? 1 : videoDuration === 10 ? 2 : videoDuration === 15 ? 3 : 1;
    let videoUrl = null;
    let usedModel = null;
    let provider = null;
    let cost = 0.15 * durationMultiplier;
    const generationErrors = [];

    // Try scene providers
    try {
      const sceneResult = await generateSceneVideo(
        photoUrls[0],
        prompt || 'A realistic face animation maintaining character identity',
        videoDuration
      );
      videoUrl = sceneResult.videoUrl;
      usedModel = sceneResult.provider;
      provider = sceneResult.provider;
      cost = sceneResult.cost;
    } catch (error) {
      console.warn('❌ Scene-generation waterfall failed:', error.message);
      generationErrors.push(`Scene providers: ${error.message}`);
    }

    // Fallback to Replicate if all scene providers fail
    if (!videoUrl) {
      try {
        const replicateToken = (process.env.REPLICATE_API_TOKEN || '').trim();
        if (replicateToken) {
          const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${replicateToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: "lucataco/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
              input: {
                input_image: photoUrls[0],
                video_length: String(videoDuration === 5 ? 25 : videoDuration === 10 ? 50 : 75)
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            let prediction = data;
            let attempts = 0;
            while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 60) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                headers: { 'Authorization': `Token ${replicateToken}` }
              });
              prediction = await pollResponse.json();
              attempts++;
            }

            if (prediction.status === 'succeeded') {
              videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
              usedModel = 'Stable Video Diffusion';
              provider = 'replicate';
            }
          }
        }
      } catch (error) {
        generationErrors.push(`Replicate fallback: ${error.message}`);
      }
    }

    // Add audio narration
    if (videoUrl) {
      let finalScript = audioScript && audioScript.trim().length > 0
        ? audioScript.trim()
        : null;

      if (!finalScript) {
        try {
          finalScript = await deriveScriptFromPrompt(prompt, videoDuration);
          console.log(`📝 Auto-derived script: "${finalScript}"`);
        } catch (err) {
          console.warn('⚠️ Script derivation failed, sending silent video:', err.message);
        }
      }

      if (finalScript) {
        try {
          const selectedGender = voiceGender || 'MALE';
          const narratedUrl = await addAudioToSceneVideo(videoUrl, finalScript, selectedGender);
          videoUrl = narratedUrl;
          console.log(`🔊 ${selectedGender} audio narration added successfully`);
        } catch (err) {
          console.warn('⚠️ Audio muxing failed, sending silent video:', err.message);
        }
      }
    }

    if (!videoUrl) {
      return res.json({
        success: true,
        videoUrl: createFallbackVideo(prompt, paymentReference),
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        canRetry: true,
        paymentReference
      });
    }

    await addVideoUsage(paymentReference, email || 'anonymous', 'photo-to-video', prompt, cost, usedModel, provider, videoDuration);

    let emailResult = { success: false };
    try {
      const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, 0, videoDuration);
      emailResult = await sendEmail(email, videoEmail.subject, videoEmail.html);
    } catch (emailErr) {
      emailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      videoUrl,
      usedModel,
      provider,
      cost,
      duration: videoDuration,
      paymentReference,
      userEmail: email,
      emailSent: emailResult.success
    });

  } catch (error) {
    res.json({
      success: true,
      videoUrl: createFallbackVideo(req.body.prompt, req.body.paymentReference),
      isFallback: true
    });
  }
});

// ============================================
// MUSIC & CAPTIONS PAYMENT INITIALIZATION
// ============================================

app.post('/api/initialize-music-captions-payment', async (req, res) => {
  try {
    const { email } = req.body;
    const amount = 200;

    console.log('💰 Initializing Music & Captions payment...');

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      const reference = 'MUSIC-TEST-' + Date.now();
      console.log('⚠️ Using test mode, reference:', reference);
      return res.json({
        success: true,
        reference: reference,
        authorization_url: 'https://www.katareel.com/music-captions?payment=success&reference=' + reference,
        amount: amount,
        currency: 'KES',
        testMode: true
      });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        amount: amount * 100,
        metadata: {
          serviceType: 'music-captions',
          amount: amount,
          custom_fields: [
            { display_name: "Service", variable_name: "service", value: "Music & Captions" },
            { display_name: "Amount", variable_name: "amount", value: `${amount} KES` }
          ]
        },
        callback_url: process.env.FRONTEND_URL + '/music-captions?payment=success'
      })
    });

    const data = await response.json();
    
    if (data.status) {
      console.log('✅ Payment initialized successfully!');
      res.json({
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        amount: amount,
        currency: 'KES'
      });
    } else {
      console.error('❌ Paystack error:', data.message);
      res.status(400).json({
        success: false,
        error: data.message || 'Payment initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment init error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ADD MUSIC & CAPTIONS TO VIDEO
// ============================================

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

app.post('/api/add-music-captions', async (req, res) => {
  try {
    const {
      videoUrl,
      captions,
      musicUrl,
      musicVolume,
      captionStyle,
      captionPosition,
      captionFontSize,
      paymentReference,
      email
    } = req.body;

    console.log('🎬 Adding music and captions to video...');
    console.log(`📝 Captions: ${captions?.length || 0}`);
    console.log(`🎵 Music: ${musicUrl ? 'Yes' : 'No'}`);

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required. Please pay KES 200 for music & captions.',
        requiresPayment: true,
        price: 200
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true,
        price: 200
      });
    }

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required'
      });
    }

    const videoId = crypto.randomUUID();
    const videoPath = path.join(tempDir, `${videoId}.mp4`);
    const outputPath = path.join(tempDir, `${videoId}_with_music_captions.mp4`);
    const tempAudioPath = path.join(tempDir, `${videoId}_music.mp3`);
    const subtitlePath = path.join(tempDir, `${videoId}.srt`);

    try {
      console.log('📥 Downloading video...');
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
      const videoBuffer = await response.arrayBuffer();
      fs.writeFileSync(videoPath, Buffer.from(videoBuffer));

      let ffmpegCommand = ffmpeg(videoPath);

      if (musicUrl) {
        console.log('🎵 Adding background music...');
        const musicResponse = await fetch(musicUrl);
        if (musicResponse.ok) {
          const musicBuffer = await musicResponse.arrayBuffer();
          fs.writeFileSync(tempAudioPath, Buffer.from(musicBuffer));

          const volume = (musicVolume || 70) / 100;
          ffmpegCommand = ffmpegCommand
            .input(tempAudioPath)
            .audioFilters([
              `volume=${volume}`,
              'amix=inputs=2:duration=shortest'
            ]);
        }
      }

      if (captions && captions.length > 0) {
        console.log('📝 Adding captions...');
        
        let srtContent = '';
        captions.forEach((caption, index) => {
          const startTime = index * 1.5;
          const endTime = startTime + 1.5;
          const start = formatTimestamp(startTime);
          const end = formatTimestamp(endTime);
          srtContent += `${index + 1}\n${start} --> ${end}\n${caption.text}\n\n`;
        });

        fs.writeFileSync(subtitlePath, srtContent);

        let styleOptions = [
          'force_style=FontName=Arial',
          `FontSize=${captionFontSize || 24}`,
          'PrimaryColour=&HFFFFFF&',
          'BorderStyle=3',
          'Outline=2',
          'Shadow=1'
        ];

        if (captionPosition === 'top') {
          styleOptions.push('MarginV=20');
          styleOptions.push('Alignment=6');
        } else if (captionPosition === 'center') {
          styleOptions.push('Alignment=5');
        } else {
          styleOptions.push('MarginV=50');
          styleOptions.push('Alignment=2');
        }

        if (captionStyle === 'bold') {
          styleOptions.push('Bold=1');
        }
        if (captionStyle === 'neon') {
          styleOptions.push('PrimaryColour=&HFF69B4&');
          styleOptions.push('OutlineColour=&HFF1493&');
          styleOptions.push('Outline=3');
        }
        if (captionStyle === 'classic') {
          styleOptions.push('PrimaryColour=&H000000&');
          styleOptions.push('BackColour=&HFFFFFF&');
          styleOptions.push('BorderStyle=4');
        }
        if (captionStyle === 'karaoke') {
          styleOptions.push('PrimaryColour=&HFFFF00&');
          styleOptions.push('OutlineColour=&HFF0000&');
          styleOptions.push('Outline=2');
        }

        const styleString = styleOptions.join(',');
        
        ffmpegCommand = ffmpegCommand
          .input(subtitlePath)
          .outputOptions([
            `-c:v libx264`,
            `-preset medium`,
            `-crf 23`,
            `-c:a aac`,
            `-b:a 128k`,
            `-vf subtitles=${subtitlePath}:${styleString}`,
            `-map 0:v:0`,
            `-map 0:a:0`
          ]);
      }

      console.log('🎬 Processing video with music and captions...');
      await new Promise((resolve, reject) => {
        ffmpegCommand
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      console.log('✅ Video processing complete');

      console.log('☁️ Uploading to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(outputPath, {
        resource_type: 'video',
        folder: 'video-creator-uploads',
        public_id: `${videoId}_with_music_captions`
      });

      [videoPath, outputPath, tempAudioPath, subtitlePath].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });

      await addActivityLog(
        email || 'anonymous',
        '🎵 Added Music & Captions',
        `Captions: ${captions?.length || 0}, Music: ${musicUrl ? 'Yes' : 'No'}`,
        200
      );
      await addRevenue(videoId, email || 'anonymous', 200, 'music-captions', paymentReference, 'card');
      await addUserPayment(email || 'anonymous', 200, 'card', 'music-captions', paymentReference);
      await addVideoUsage(paymentReference, email || 'anonymous', 'music-captions', captions?.map(c => c.text).join(' ') || 'Music & Captions', 200, 'FFmpeg', 'custom', 5);

      res.json({
        success: true,
        resultVideoUrl: uploadResult.secure_url,
        message: 'Music and captions added successfully!',
        paymentReference,
        captionsCount: captions?.length || 0,
        hasMusic: !!musicUrl
      });

    } catch (error) {
      console.error('❌ Processing error:', error.message);
      [videoPath, outputPath, tempAudioPath, subtitlePath].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
      throw error;
    }

  } catch (error) {
    console.error('❌ Music & Captions error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add music and captions'
    });
  }
});

// ============================================
// BRAND VIDEO GENERATION
// ============================================

const BRAND_VIDEO_PRICE = 250;
const BRAND_INTRO_MIN_SECONDS = 3;
const BRAND_INTRO_MAX_SECONDS = 12;
const BRAND_OUTRO_SECONDS = 4;

function escapeDrawtext(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, '\u2019')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ');
}

function ffmpegSafePath(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function hasAudioStream(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const audioStream = (metadata.streams || []).find(s => s.codec_type === 'audio');
      resolve(!!audioStream);
    });
  });
}

async function deriveBrandScript(companyName, tagline, durationSeconds) {
  const wordBudget = Math.max(6, Math.floor(durationSeconds * 2.3));

  if (!groq) {
    return tagline
      ? `${companyName}. ${tagline}.`
      : `Welcome to ${companyName}. We're here to help you get things done.`;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You write short, upbeat spoken voiceover scripts for a business intro video.
Rules:
- Output ONLY the spoken words, no stage directions, no quotes, no formatting.
- Maximum ${wordBudget} words. Shorter is fine.
- Confident, friendly, professional tone suitable for a brand promo.
- Mention the company name naturally.`
        },
        {
          role: 'user',
          content: `Company name: "${companyName}"${tagline ? `\nTagline: "${tagline}"` : ''}`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const script = completion.choices?.[0]?.message?.content?.trim();
    if (!script) throw new Error('Groq returned no script text');
    return script;
  } catch (error) {
    console.warn('⚠️ Brand script derivation failed, using fallback:', error.message);
    return tagline
      ? `${companyName}. ${tagline}.`
      : `Welcome to ${companyName}.`;
  }
}

async function createTextCard({ outputPath, logoPath, lines, durationSeconds, withSilentAudio }) {
  return new Promise((resolve, reject) => {
    const fontArg = fs.existsSync(FONT_PATH) ? `fontfile=${ffmpegSafePath(FONT_PATH)}:` : '';

    const drawtextFilters = lines.map((line, index) => {
      const yPos = `h*0.60+${index * 55}`;
      return `drawtext=${fontArg}text='${escapeDrawtext(line.text)}':fontsize=${line.fontsize || 36}:fontcolor=${line.color || 'white'}:x=(w-text_w)/2:y=${yPos}`;
    }).join(',');

    const command = ffmpeg();
    command.input(`color=c=0x111827:s=1280x720:d=${durationSeconds}`).inputFormat('lavfi');
    command.input(logoPath);

    const filters = [
      `[1:v]scale=280:-1[logo]`,
      `[0:v][logo]overlay=(W-w)/2:H*0.15[withlogo]`,
      `[withlogo]${drawtextFilters}[vout]`
    ];

    const outputOptions = ['-t', String(durationSeconds), '-pix_fmt', 'yuv420p', '-map', '[vout]'];

    if (withSilentAudio) {
      command.input('anullsrc=r=44100:cl=stereo').inputFormat('lavfi');
      outputOptions.push('-map', '2:a', '-c:a', 'aac', '-shortest');
    }

    command
      .complexFilter(filters)
      .videoCodec('libx264')
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function normalizeClip(inputPath, outputPath) {
  const audioPresent = await hasAudioStream(inputPath);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);

    if (!audioPresent) {
      command.input('anullsrc=r=44100:cl=stereo').inputFormat('lavfi');
    }

    command
      .videoFilters('scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(audioPresent ? ['-map', '0:v:0', '-map', '0:a:0'] : ['-map', '0:v:0', '-map', '1:a:0', '-shortest'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function concatClips(clipPaths, outputPath) {
  const listPath = outputPath + '.txt';
  const listContent = clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', () => {
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        resolve();
      })
      .on('error', (err) => {
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        reject(err);
      })
      .run();
  });
}

app.post('/api/initialize-brand-video-payment', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    console.log('💰 Initializing Brand Video payment...');

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      const reference = 'BRAND-TEST-' + Date.now();
      console.log('⚠️ Using test mode, reference:', reference);
      return res.json({
        success: true,
        reference,
        authorization_url: `${process.env.FRONTEND_URL || 'https://www.katareel.com'}/brand-video?payment=success&reference=${reference}`,
        amount: BRAND_VIDEO_PRICE,
        currency: 'KES',
        testMode: true
      });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: BRAND_VIDEO_PRICE * 100,
        metadata: {
          serviceType: 'brand-video',
          amount: BRAND_VIDEO_PRICE,
          custom_fields: [
            { display_name: "Service", variable_name: "service", value: "Brand Video" },
            { display_name: "Amount", variable_name: "amount", value: `${BRAND_VIDEO_PRICE} KES` }
          ]
        },
        callback_url: (process.env.FRONTEND_URL || 'https://www.katareel.com') + '/brand-video?payment=success'
      })
    });

    const data = await response.json();

    if (data.status) {
      console.log('✅ Brand video payment initialized!');
      return res.json({
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        amount: BRAND_VIDEO_PRICE,
        currency: 'KES'
      });
    }

    console.error('❌ Paystack error:', data.message);
    return res.status(400).json({ success: false, error: data.message || 'Payment initialization failed' });
  } catch (error) {
    console.error('❌ Brand video payment init error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/brand-video', async (req, res) => {
  const {
    videoUrl,
    logoUrl,
    companyName,
    tagline,
    contactEmail,
    contactPhone,
    voiceoverScript,
    paymentReference,
    email
  } = req.body;

  console.log('🎬 Generating brand video for:', companyName);

  if (!videoUrl || !logoUrl || !companyName || !contactPhone) {
    return res.status(400).json({
      success: false,
      error: 'videoUrl, logoUrl, companyName and contactPhone are required'
    });
  }

  if (!paymentReference) {
    return res.status(402).json({
      success: false,
      error: 'Payment required.',
      requiresPayment: true,
      price: BRAND_VIDEO_PRICE
    });
  }

  const isFreeReference = paymentReference.startsWith('TEST-') ||
    paymentReference.startsWith('REDO-') ||
    paymentReference.startsWith('MANUAL-') ||
    paymentReference.startsWith('BRAND-FREE-');

  if (!isFreeReference) {
    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true,
        price: BRAND_VIDEO_PRICE
      });
    }
  } else {
    console.log('🎟️ Free/manual reference used, skipping payment verification:', paymentReference);
  }

  const jobId = crypto.randomUUID();
  const mainVideoPath = path.join(tempDir, `${jobId}_main.mp4`);
  const logoPath = path.join(tempDir, `${jobId}_logo.png`);
  const introRawPath = path.join(tempDir, `${jobId}_intro_raw.mp4`);
  const introFinalPath = path.join(tempDir, `${jobId}_intro_final.mp4`);
  const outroRawPath = path.join(tempDir, `${jobId}_outro_raw.mp4`);
  const mainNormPath = path.join(tempDir, `${jobId}_main_norm.mp4`);
  const introNormPath = path.join(tempDir, `${jobId}_intro_norm.mp4`);
  const outroNormPath = path.join(tempDir, `${jobId}_outro_norm.mp4`);
  const finalPath = path.join(tempDir, `${jobId}_brand_final.mp4`);

  const cleanup = () => {
    [mainVideoPath, logoPath, introRawPath, introFinalPath, outroRawPath, mainNormPath, introNormPath, outroNormPath, finalPath]
      .forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  };

  try {
    console.log('📥 Downloading main video...');
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    fs.writeFileSync(mainVideoPath, Buffer.from(await videoRes.arrayBuffer()));

    console.log('📥 Downloading logo...');
    const logoRes = await fetch(logoUrl);
    if (!logoRes.ok) throw new Error(`Failed to download logo: ${logoRes.status}`);
    fs.writeFileSync(logoPath, Buffer.from(await logoRes.arrayBuffer()));

    const script = (voiceoverScript && voiceoverScript.trim().length > 0)
      ? voiceoverScript.trim()
      : await deriveBrandScript(companyName, tagline, BRAND_INTRO_MAX_SECONDS);
    console.log('📝 Voiceover script:', script);

    console.log('🔊 Generating voiceover audio...');
    const ttsAudioBuffer = await textToSpeech(script, 'en', 1.0, 'MALE');

    const estimatedWordCount = script.split(/\s+/).filter(Boolean).length;
    const estimatedSpeechSeconds = estimatedWordCount / 2.3;
    const introDuration = Math.min(
      BRAND_INTRO_MAX_SECONDS,
      Math.max(BRAND_INTRO_MIN_SECONDS, Math.ceil(estimatedSpeechSeconds + 1))
    );

    console.log(`🎬 Building intro card (${introDuration}s)...`);
    await createTextCard({
      outputPath: introRawPath,
      logoPath,
      lines: [
        { text: companyName, fontsize: 44, color: 'white' },
        ...(tagline ? [{ text: tagline, fontsize: 28, color: '#D1D5DB' }] : [])
      ],
      durationSeconds: introDuration,
      withSilentAudio: false
    });

    console.log('🎙️ Muxing voiceover onto intro card...');
    await combineAudioWithVideo(introRawPath, ttsAudioBuffer, introFinalPath);

    console.log(`🎬 Building outro card (${BRAND_OUTRO_SECONDS}s)...`);
    const outroLines = [{ text: companyName, fontsize: 36, color: 'white' }];
    if (contactPhone) outroLines.push({ text: `Tel: ${contactPhone}`, fontsize: 26, color: '#D1D5DB' });
    if (contactEmail) outroLines.push({ text: contactEmail, fontsize: 26, color: '#D1D5DB' });

    await createTextCard({
      outputPath: outroRawPath,
      logoPath,
      lines: outroLines,
      durationSeconds: BRAND_OUTRO_SECONDS,
      withSilentAudio: true
    });

    console.log('🧹 Normalizing clips for concatenation...');
    await normalizeClip(introFinalPath, introNormPath);
    await normalizeClip(mainVideoPath, mainNormPath);
    await normalizeClip(outroRawPath, outroNormPath);

    console.log('🔗 Concatenating intro + video + outro...');
    await concatClips([introNormPath, mainNormPath, outroNormPath], finalPath);

    console.log('☁️ Uploading brand video to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(finalPath, {
      resource_type: 'video',
      folder: 'video-creator-uploads',
      public_id: `${jobId}_brand_video`
    });

    cleanup();

    const cost = isFreeReference ? 0 : BRAND_VIDEO_PRICE;
    const paymentMethodLabel = isFreeReference ? 'coupon' : 'card';
    await addRevenue(jobId, email, cost, 'brand-video', paymentReference, paymentMethodLabel);
    await addUserPayment(email, cost, paymentMethodLabel, 'brand-video', paymentReference);
    await addActivityLog(email, isFreeReference ? '🎬 Brand Video Created (Free Code)' : '🎬 Brand Video Created', `Company: ${companyName}, Intro: ${introDuration}s`, cost);
    await addVideoUsage(paymentReference, email || 'anonymous', 'brand-video', `Brand video for ${companyName}`, cost, 'FFmpeg + TTS', 'custom', introDuration + BRAND_OUTRO_SECONDS);

    let emailResult = { success: false };
    try {
      const brandEmail = generateBrandVideoDeliveryEmail(email, uploadResult.secure_url, companyName);
      emailResult = await sendEmail(email, brandEmail.subject, brandEmail.html);
    } catch (emailErr) {
      emailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      resultVideoUrl: uploadResult.secure_url,
      script,
      introDuration,
      paymentReference,
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('❌ Brand video generation error:', error.message);
    cleanup();
    res.status(500).json({
      success: false,
      error: error.message || 'Brand video generation failed'
    });
  }
});

// ============================================
// CALCULATE PRICE ENDPOINT
// ============================================

app.post('/api/calculate-price', (req, res) => {
  const { serviceType, options } = req.body;
  const duration = options?.duration || 5;
  const photoCount = options?.photoCount || 1;
  let finalPrice = 300;

  if (photoCount === 1) {
    if (duration === 5) finalPrice = 300;
    else if (duration === 10) finalPrice = 600;
    else if (duration === 15) finalPrice = 900;
  } else if (photoCount === 2) {
    if (duration === 5) finalPrice = 600;
    else if (duration === 10) finalPrice = 1200;
    else if (duration === 15) finalPrice = 1800;
  } else if (photoCount >= 3) {
    if (duration === 5) finalPrice = 500;
    else if (duration === 10) finalPrice = 1000;
    else if (duration === 15) finalPrice = 2000;
  }

  res.json({
    success: true,
    price: { finalPrice, formatted: `KES ${finalPrice}`, currency: 'KES' }
  });
});

// ============================================
// HEALTH & ROOT ENDPOINTS
// ============================================

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!', 
    environment: isProduction ? 'production' : 'development',
    endpoints: [
      '/api/test', '/api/health',
      '/api/generate-video',
      '/api/calculate-price',
      '/api/verify-payment',
      '/api/initialize-payment',
      '/api/send-video-email',
      '/api/test-email',
      '/api/free-languages',
      '/api/translation-price',
      '/api/translate-video',
      '/api/translations',
      '/api/upload-video',
      '/api/upload-image',
      '/api/initialize-brand-video-payment',
      '/api/brand-video',
      '/api/admin/dashboard',
      '/api/admin/add-credits',
      '/api/admin/balances',
      '/api/admin/payments',
      '/api/admin/add-missing-payment',
      '/api/test-google-cloud',
      '/api/translate-video-free',
      '/api/test-tts',
      '/api/debug-failed',
      '/api/debug-modelark-ids',
      '/api/debug-scene-providers'
    ]
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Video Creator API',
    version: '2.1.0',
    status: 'running',
    contact: {
      sales: 'sales@katareel.com',
      support: 'support@katareel.com',
      whatsapp: '+254710440648',
      whatsappLink: 'https://wa.me/254710440648'
    },
    features: [
      'Text-to-Video Generation',
      'Photo-to-Video Scene Generation',
      'Video Translation with Payment',
      'Music & Captions',
      'Brand Video (Logo Intro/Outro + AI Voiceover)',
      'Email Delivery',
      'Payment Integration',
      'Admin Dashboard',
      'Multi-language Support'
    ]
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
const buildPath = path.join(__dirname, 'build');
if (isProduction && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`📧 Email Provider: ${emailProvider.toUpperCase()}`);
  console.log(`☁️ Cloudinary storage configured`);
  console.log(`📁 Temp directory: ${tempDir}`);
});
